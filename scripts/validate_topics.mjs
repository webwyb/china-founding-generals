import assert from 'node:assert/strict'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = fileURLToPath(new URL('..', import.meta.url)), require = createRequire(import.meta.url)
const json = async file => JSON.parse(await readFile(resolve(root, file), 'utf8'))
const people = await json('src/data/catalog.generated.json')
const topics = await Promise.all(['marshals', 'shanghai'].map(id => json(`data/topics/${id}.json`)))
assert.deepEqual(topics[0].entries.map(entry => entry.archiveId).sort(), people.filter(person => person.rank === '元帅').map(person => person.id).sort(), '十位元帅必须完整且无其他军衔混入')
for (const topic of topics) {
  assert.equal(new Set(topic.entries.map(entry => entry.id)).size, topic.entries.length)
  assert.equal(topic.entries.length, 10)
  for (const entry of topic.entries) {
    assert.ok(entry.name && entry.focus && entry.question)
    assert.ok(entry.paragraphs.length >= 2)
    if (entry.archiveId) assert.equal(people.find(person => person.id === entry.archiveId)?.name, entry.name)
    for (const paragraph of entry.paragraphs) {
      assert.ok(paragraph.text && paragraph.sourceUrls.length)
      for (const url of paragraph.sourceUrls) assert.equal(new URL(url).protocol, 'https:')
    }
    for (const milestone of entry.milestones) {
      assert.ok(milestone.label && milestone.text)
      assert.ok(entry.paragraphs.some(paragraph => paragraph.sourceUrls.includes(milestone.sourceUrl)), '节点有同条目可追溯来源')
    }
    if (entry.pendingFields.length) assert.ok(entry.fieldNote)
    for (const relation of entry.relatedEntries || []) {
      assert.ok(topic.entries.some(target => target.id === relation.id && target.id !== entry.id))
      assert.ok(relation.label && relation.reason && relation.sourceUrls.length)
      for (const url of relation.sourceUrls) assert.ok(topic.entries.some(target => target.paragraphs.some(paragraph => paragraph.sourceUrls.includes(url))))
    }
  }
}
assert.ok(topics[0].entries.find(entry => entry.name === '林彪').paragraphs.some(paragraph => paragraph.text.includes('反革命集团')), '导览不可丢掉后期历史结论')
assert.ok(topics[0].entries.every(entry => entry.relatedEntries?.length), '十位元帅均有带依据的联读入口')
assert.ok(new Set(topics[1].entries.map(entry => entry.field)).size >= 5)
assert.ok(topics[1].entries.every(entry => entry.connection?.kind && entry.connection?.place), '地方专题逐人说明实际地点关系')
const song = topics[1].entries.find(entry => entry.name === '宋庆龄')
assert.ok(song.pendingFields.includes('residenceStart'))
assert.ok(!song.milestones.length && !song.paragraphs.some(paragraph => /194[89]/.test(paragraph.text)), '冲突入住年份不能变为定值')

const output = resolve(root, '.cache/topics-check')
await mkdir(output, { recursive: true })
const storage = new Map()
globalThis.__topicTestStorage = storage
await build({
  entryPoints: [resolve(root, 'src/services/topicReading.ts')], outfile: resolve(output, 'reading.cjs'), bundle: true, platform: 'node', format: 'cjs',
  plugins: [{ name: 'storage-adapter', setup(builder) {
    builder.onResolve({ filter: /^@tarojs\/taro$/ }, () => ({ path: 'taro', namespace: 'test' }))
    builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: `export default {getStorageSync:key=>globalThis.__topicTestStorage.get(key),setStorageSync:(key,value)=>{if(globalThis.__topicFail)throw Error('storage denied');globalThis.__topicTestStorage.set(key,value)},removeStorageSync:key=>{if(globalThis.__topicFail)throw Error('storage denied');globalThis.__topicTestStorage.delete(key)}}` }))
  } }],
})
const reading = require(resolve(output, 'reading.cjs'))
assert.deepEqual(reading.cleanReading('marshals', ['zhude','zhude','unknown',5,'qian']), ['zhude'])
assert.deepEqual(reading.cleanReading('missing', ['zhude']), [])
assert.deepEqual(reading.cleanReading('shanghai', { bad: true }), [])
assert.deepEqual(reading.setTopicRead('marshals','zhude',true), ['zhude'])
assert.deepEqual(reading.setTopicRead('marshals','zhude',true), ['zhude'])
assert.deepEqual(reading.getTopicReading('shanghai'), [], '两个专题的阅读标记隔离')
assert.deepEqual(reading.setTopicRead('shanghai','qian',true), ['qian'])
assert.throws(() => reading.setTopicRead('shanghai','zhude',true))
globalThis.__topicFail = true
assert.throws(() => reading.setTopicRead('marshals','p0002',true))
assert.deepEqual(reading.getTopicReading('marshals'), ['zhude'], '写入失败不冒充已保存')
assert.throws(() => reading.resetTopicReading('marshals'))
globalThis.__topicFail = false
reading.resetTopicReading('marshals')
assert.deepEqual(reading.getTopicReading('marshals'), [])
assert.deepEqual(reading.getTopicReading('shanghai'), ['qian'])
await writeFile(resolve(root, 'data/testing/topics.json'), JSON.stringify({ status: 'passed', topics: 2, entries: 20, cataloguePeople: people.length, checks: ['十位元帅集合与现有档案一致', '逐段及关键节点保留出处', '十位跨领域地方人物地点关系独立', '林彪后期历史结论保留', '宋庆龄入住时间冲突保留', '阅读标记去重及非法输入清理', '专题存储隔离与恢复', '存储拒绝不写入及可恢复重置'], method: 'Offline source validation and Taro storage adapter tests; not browser, device, historical certification or real reader evidence.' }, null, 2) + '\n')
console.log('专题内容与本地阅读状态校验通过：2条路线、20个人物条目；不代表浏览器、真机或史料全量审校。')
