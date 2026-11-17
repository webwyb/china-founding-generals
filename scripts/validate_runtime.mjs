import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url)), require = createRequire(import.meta.url)
const output = resolve(root, '.cache/runtime-check')
await mkdir(output, { recursive: true })
await require('esbuild').build({
  entryPoints: ['navigationQueue','personData'].map(name => resolve(root, 'src/services', name + '.ts')),
  bundle: true, platform: 'node', format: 'cjs', outdir: output, outExtension: { '.js': '.cjs' },
  define: { __SHANHE_CLIENT__: 'true', __SHANHE_DATA_VERSION__: '"fixture-v1"' },
  loader: { '.jpg': 'file', '.svg': 'file' }, logLevel: 'silent',
})
const { createNavigationQueue } = require(resolve(output, 'navigationQueue.cjs'))
const checks = []
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const tick = async () => { for (let i = 0; i < 8; i++) await Promise.resolve() }
{
  const loading = deferred(), commits = [], pending = []
  const queue = createNavigationQueue({ key: value => value, prepare: value => value === 'person' ? loading.promise : Promise.resolve(), commit: async value => commits.push(value), busy: value => pending.push(value) })
  const enter = queue.request('person')
  const back = queue.request('catalogue')
  await Promise.all([enter, back])
  assert.deepEqual(commits, ['catalogue'], '返回应立即取消尚未提交的进入意图，不等待原资料请求')
  loading.resolve(); await tick()
  assert.deepEqual(commits, ['catalogue'], '过期加载完成后不能再把用户带入详情')
  assert.deepEqual(pending, [true, false])
  checks.push('加载期间立即返回取消过期跳转')
}
{
  const mount = deferred(), commits = []
  const queue = createNavigationQueue({ key: value => value, prepare: async () => {}, commit: async value => { commits.push(value); if (value === 'person') await mount.promise } })
  const enter = queue.request('person'); await tick()
  const duplicate = queue.request('person')
  assert.equal(enter, duplicate)
  const intents = Array.from({ length: 50 }, (_, index) => queue.request('route-' + index))
  const back = queue.request('catalogue'), backAgain = queue.request('catalogue')
  assert.equal(back, backAgain)
  assert.deepEqual(commits, ['person'], '未挂载完成时不能并行提交其他路由')
  mount.resolve(); await Promise.all([enter, duplicate, ...intents, back, backAgain])
  assert.deepEqual(commits, ['person', 'catalogue'])
  checks.push('转场期间50次连续操作合并为最后意图，重复返回共用提交')
}
{
  const failure = deferred(), commits = []
  const queue = createNavigationQueue({ key: value => value, prepare: value => value === 'bad' ? failure.promise : Promise.resolve(), commit: async value => commits.push(value) })
  const bad = queue.request('bad'), rejected = assert.rejects(bad, /failed/)
  failure.reject(Error('failed')); await rejected
  await queue.request('retry')
  assert.deepEqual(commits, ['retry'])
  checks.push('加载失败后队列可恢复')
}
const profiles = require(resolve(root, 'src/data/catalogue-lite.generated.json'))
const record = id => ({ ...profiles.find(person => person.id === id), portrait: '/fixture.jpg', story: 'fixture', biographySections: [], timeline: [], sources: [], imageSource: '' })
let calls = [], respond
globalThis.fetch = (url, options) => { calls.push([url, options]); return respond(url) }
globalThis.document = { getElementById: () => ({ textContent: JSON.stringify(record('suyu')) }) }
const data = require(resolve(output, 'personData.cjs'))
assert.equal(data.cachedPerson('suyu').name, '粟裕')
assert.equal(calls.length, 0)
checks.push('直达页同步读取内联人物资料，无重复下载')
const response = deferred()
respond = () => response.promise
const first = data.loadPerson('zhude'), again = data.loadPerson('zhude')
assert.equal(first, again); assert.equal(calls.length, 1)
assert.equal(calls[0][0], '/js/person-data/fixture-v1/zhude.json')
response.resolve({ ok: true, json: async () => record('zhude') })
await first; await data.loadPerson('zhude'); assert.equal(calls.length, 1)
assert.equal(data.cachedPerson('zhude').id, 'zhude')
checks.push('人物请求去重、版本路径和成功缓存')
respond = async () => ({ ok: true, json: async () => record('zhude') })
await assert.rejects(data.loadPerson('p0002'), /核对/)
assert.equal(data.cachedPerson('p0002'), undefined)
respond = async () => ({ ok: false })
await assert.rejects(data.loadPerson('p0002'), /加载/)
respond = async () => ({ ok: true, json: async () => record('p0002') })
assert.equal((await data.loadPerson('p0002')).id, 'p0002')
await assert.rejects(data.loadPerson('missing'), /未找到/)
checks.push('错误人物和失败请求不污染缓存，重试恢复')
assert.equal(data.cachedSearchIndex(), undefined)
const searchResponse = deferred(); respond = () => searchResponse.promise
const searchA = data.loadSearchIndex(), searchB = data.loadSearchIndex()
assert.equal(searchA, searchB)
searchResponse.resolve({ ok: true, json: async () => ({ suyu: 'incomplete' }) })
await assert.rejects(searchA, /核对/)
const index = Object.fromEntries(profiles.map(person => [person.id, person.name]))
respond = async () => ({ ok: true, json: async () => index })
assert.deepEqual(await data.loadSearchIndex(), index)
const count = calls.length; await data.loadSearchIndex(); assert.equal(calls.length, count)
checks.push('检索索引按需加载、去重、完整性校验和错误重试')
await writeFile(resolve(root, 'data/testing/runtime.json'), JSON.stringify({ status: 'passed', checks, method: 'Production queue and resource modules bundled with explicit deferred navigation, document and fetch adapters. No browser timing or device simulation.' }, null, 2) + '\n')
console.log(`路由与按需加载逻辑检查通过：${checks.length}组场景。`)
