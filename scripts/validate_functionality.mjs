import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url)), require = createRequire(import.meta.url)
const output = resolve(root, '.cache/function-check')
await mkdir(output, { recursive: true })
const { build } = require('esbuild')
const storage = new Map(), calls = []
let failStorage = false, pages = []
globalThis.testTaro = {
  getStorageSync: key => { if (failStorage) throw Error('storage disabled'); return storage.get(key) },
  setStorageSync: (key, value) => { if (failStorage) throw Error('storage disabled'); storage.set(key, value) },
  getCurrentPages: () => pages,
  reLaunch: args => { calls.push(['reLaunch', args]); return Promise.resolve() },
  redirectTo: args => { calls.push(['redirectTo', args]); return Promise.resolve() },
  navigateTo: args => { calls.push(['navigateTo', args]); return Promise.resolve() },
  navigateBack: args => { calls.push(['navigateBack', args]); return Promise.resolve() },
}
await build({
  entryPoints: ['services/collection.ts','services/catalogue.ts','services/catalogueState.ts','services/share.ts','components/Shell.tsx','data/people.ts'].map(file => resolve(root, 'src', file)),
  bundle: true, platform: 'node', format: 'cjs', outdir: output, outExtension: { '.js': '.cjs' },
  define: { 'process.env.TARO_ENV': '"h5"' }, loader: { '.jpg': 'file', '.svg': 'file' },
  plugins: [{ name: 'taro-test-adapter', setup(builder) {
    builder.onResolve({ filter: /^@tarojs\/taro$/ }, () => ({ path: 'taro', namespace: 'test' }))
    builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export default globalThis.testTaro', loader: 'js' }))
    builder.onResolve({ filter: /^@tarojs\/components$/ }, () => ({ path: 'components', namespace: 'test-components' }))
    builder.onLoad({ filter: /.*/, namespace: 'test-components' }, () => ({ contents: 'export const Button=()=>null,Text=()=>null,View=()=>null', loader: 'js' }))
  } }],
})
const { people, lifeYears } = require(resolve(output, 'data/people.cjs'))
const { filterPeople, regionFromQuery } = require(resolve(output, 'services/catalogue.cjs'))
const state = require(resolve(output, 'services/catalogueState.cjs'))
const collection = require(resolve(output, 'services/collection.cjs'))
const navigation = require(resolve(output, 'components/Shell.cjs'))
const share = require(resolve(output, 'services/share.cjs'))
const checks = []
function check(name, fn) { fn(); checks.push(name) }
const base = state.defaultCatalogueState
const provinces = [...new Set(people.map(person => person.province))]

check('全部军衔与省份的组合筛选', () => {
  for (const rank of ['全部','元帅','大将','上将','中将','少将']) for (const province of ['全部', ...provinces]) {
    const result = filterPeople(people, { ...base, rank, province }, [])
    const expected = people.filter(person => (rank === '全部' || person.rank === rank) && (province === '全部' || person.province === province))
    assert.deepEqual(result.map(person => person.id), expected.map(person => person.id))
  }
})
check('姓名、异体写法、多词组合及无结果', () => {
  assert.equal(filterPeople(people, { ...base, search: '粟裕' }, [])[0].id, 'suyu')
  assert.ok(filterPeople(people, { ...base, search: '粟裕' }, []).some(person => person.id === 'p0006'), '长传记中的战友也应可检索，但本人应优先')
  assert.ok(filterPeople(people, { ...base, search: '陈士渠' }, []).some(person => person.name === '陈士榘'))
  assert.deepEqual(filterPeople(people, { ...base, search: '  粟裕   会同  ' }, []).map(person => person.id), ['suyu'])
  assert.equal(filterPeople(people, { ...base, search: '不存在的人物abc123' }, []).length, 0)
  assert.equal(filterPeople(people, { ...base, rememberedOnly: true }, []).length, 0)
})
check('全1614人分批浏览无遗漏或重复', () => {
  const ids = []
  for (let offset = 0; offset < people.length; offset += 24) ids.push(...filterPeople(people, base, []).slice(offset, offset + 24).map(person => person.id))
  assert.equal(ids.length, 1614); assert.equal(new Set(ids).size, 1614)
})
check('地区直达与畸形编码容错', () => {
  assert.equal(regionFromQuery(encodeURIComponent('山东'), provinces), '山东')
  assert.equal(regionFromQuery('山东', provinces), '山东')
  for (const query of ['%','%E0%A4%A','未知','']) assert.equal(regionFromQuery(query, provinces), '全部')
})
check('铭记增删、持久保存与损坏数据恢复', () => {
  assert.deepEqual(collection.getRemembered(), [])
  assert.equal(collection.toggleRemembered('suyu'), true)
  assert.deepEqual(collection.getRemembered(), ['suyu'])
  assert.deepEqual(filterPeople(people, { ...base, rememberedOnly: true }, collection.getRemembered()).map(person => person.id), ['suyu'])
  assert.equal(collection.toggleRemembered('suyu'), false)
  storage.set('shanhe-remembered-v1', ['suyu','suyu',null,42,'p9999','<script>'])
  assert.deepEqual(collection.getRemembered(), ['suyu'])
  assert.throws(() => collection.toggleRemembered('missing'))
  failStorage = true; assert.deepEqual(collection.getRemembered(), []); assert.throws(() => collection.toggleRemembered('suyu')); failStorage = false
})
check('名录状态、阅读位置与禁用存储', () => {
  const view = { ...base, rank: '少将', province: '湖北', search: '湖南', visibleCount: 96, scrollTop: 1750, rememberedOnly: true }
  state.saveCatalogueState(view); assert.deepEqual(state.readCatalogueState(), view)
  storage.set('shanhe-catalogue-view-v1', { visibleCount: 1e9, search: 'x'.repeat(500), rank: '错误', scrollTop: -5 })
  const normalized = state.readCatalogueState(); assert.equal(normalized.visibleCount, 1614); assert.equal(normalized.search.length, 100); assert.equal(normalized.rank, '全部'); assert.equal(normalized.scrollTop, 0)
  failStorage = true; assert.doesNotThrow(() => state.saveCatalogueState(view)); assert.deepEqual(state.readCatalogueState(), base); failStorage = false
})
check('来源冲突在列表和导出资料中统一待核实', () => {
  for (const person of people) for (const field of person.pendingFields || []) {
    assert.equal(person[field], field === 'hometown' ? '籍贯待核实' : field === 'province' ? '地域待核实' : null)
    if (field === 'birth' || field === 'death') assert.ok(lifeYears(person).includes(field === 'birth' ? '出生年待核实' : '逝世年待核实'))
  }
})
await navigation.openPage('explore', 'province=山东'); assert.deepEqual(calls.pop(), ['reLaunch', { url: '/pages/explore/index?province=山东' }])
pages = [{ route: 'pages/explore/index' }]; await navigation.openPage('person', 'id=suyu'); assert.equal(calls.pop()[0], 'navigateTo')
pages.push({ route: 'pages/person/index' }); await navigation.openPage('person', 'id=zhude'); assert.equal(calls.pop()[0], 'redirectTo')
pages.push({ route: 'pages/card/index' }); await navigation.returnTo('explore'); assert.deepEqual(calls.pop(), ['navigateBack', { delta: 2 }])
pages = []; await navigation.returnTo('explore'); assert.equal(calls.pop()[0], 'redirectTo')
await navigation.returnTo('person', 'id=suyu'); assert.deepEqual(calls.pop(), ['redirectTo', { url: '/pages/person/index?id=suyu' }])
checks.push('导航、连续浏览与直达页返回逻辑')

let copied = '', removed = false, focused = false, copyResult = true, throwCopy = false
globalThis.window = { location: { href: 'https://example.org/memorial/#/pages/card/index?id=suyu' }, isSecureContext: true }
Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { writeText: async value => { copied = value } } }, configurable: true })
globalThis.document = {
  activeElement: { focus: () => { focused = true } }, body: { appendChild() {} },
  createElement: () => ({ value: '', style: {}, setAttribute() {}, select() {}, setSelectionRange() {}, remove() { removed = true } }),
  execCommand: () => { if (throwCopy) throw Error('clipboard disabled'); return copyResult },
}
await share.copyPersonLink('suyu'); assert.equal(copied, 'https://example.org/memorial/#/pages/person/index?id=suyu')
navigator.clipboard.writeText = async () => { throw Error('denied') }
await share.copyPersonLink('suyu'); assert.ok(removed && focused)
copyResult = false; await assert.rejects(share.copyPersonLink('suyu'), /地址栏/)
copyResult = true; throwCopy = true; removed = focused = false
await assert.rejects(share.copyPersonLink('suyu')); assert.ok(removed && focused)
throwCopy = false; window.location.href = 'http://127.0.0.1:5173/#/pages/card/index?id=suyu'
assert.match((await share.copyPersonLink('suyu')).message, /本地预览/)
checks.push('HTTPS复制、拒绝后的兼容降级、异常清理与本地链接提示')

await mkdir(resolve(root, 'data/testing'), { recursive: true })
await writeFile(resolve(root, 'data/testing/functionality.json'), JSON.stringify({ status: 'passed', people: people.length, filterCombinations: 6 * (provinces.length + 1), checks, method: 'Production modules bundled for Node with explicit storage/navigation/clipboard adapters; no browser interaction or device simulation.' }, null, 2) + '\n')
console.log(`功能逻辑检查通过：${checks.length}组场景、${6 * (provinces.length + 1)}种地区军衔组合、1614人遍历；包含异常恢复和待核实字段保护。`)
