import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const people = JSON.parse(await readFile(resolve(root, 'src/data/catalog.generated.json'), 'utf8'))
const portraitManifest = JSON.parse(await readFile(resolve(root, 'data/catalog/portraits.json'), 'utf8'))
const portraitReview = JSON.parse(await readFile(resolve(root, 'data/catalog/portrait-supplements.json'), 'utf8'))
const portraitCandidates = JSON.parse(await readFile(resolve(root, 'data/catalog/portrait-candidates.json'), 'utf8')).candidates
const approvedPortraits = portraitReview.records.filter(record => record.decision === 'approved')
assert.equal(new Set(approvedPortraits.map(record => record.id)).size, approvedPortraits.length, '肖像审核不可重复录入同一人物')
assert.equal(portraitReview.addedPortraits, approvedPortraits.length, '补充肖像数量与审核记录不符')
for (const record of approvedPortraits) {
  const original = portraitManifest[record.id]
  assert.ok(original, `${record.id}的审核肖像未录入`)
  assert.ok(record.identityEvidence && record.review && record.license, `${record.id}缺少肖像身份核对或许可说明`)
  assert.ok(portraitCandidates.some(candidate => candidate.id === record.id && candidate.source === record.source && candidate.downloadUrl === record.downloadUrl), `${record.id}的审核来源未保存在候选清单`)
  for (const field of ['source', 'downloadUrl', 'sha256', 'width', 'height', 'license']) assert.equal(original[field], record[field], `${record.id}的肖像与审核记录不一致：${field}`)
  assert.equal(people.find(person => person.id === record.id)?.name, record.name, `${record.id}的审核姓名不匹配`)
}
const disputes = JSON.parse(await readFile(resolve(root, 'data/catalog/source-conflicts.json'), 'utf8'))
const provenance = JSON.parse(await readFile(resolve(root, 'data/catalog/field-provenance.json'), 'utf8'))
assert.equal(provenance.length, 1614, '每个人物应保留字段级出处')
const expected = { 元帅: 10, 大将: 10, 上将: 57, 中将: 177, 少将: 1360 }
const biographyCoverage = JSON.parse(await readFile(resolve(root, 'data/catalog/biography-coverage.json'), 'utf8'))
const biographyEvidence = JSON.parse(await readFile(resolve(root, 'data/catalog/biography-evidence.json'), 'utf8')).people
const editorial = JSON.parse(await readFile(resolve(root, 'data/catalog/biography-editorial.json'), 'utf8')).people
const contextById = new Map(JSON.parse(await readFile(resolve(root,'data/catalog/historical-contexts.json'),'utf8')).map(context=>[context.id,context]))
assert.equal(people.length, 1614, '名录必须包含1614个独立档案')
assert.equal(new Set(people.map(p => p.id)).size, 1614, '人物路由ID不可重复')
for (const [rank, count] of Object.entries(expected)) assert.equal(people.filter(p => p.rank === rank).length, count, `${rank}人数不符`)

const fingerprints = new Map()
let photos = 0
for (const person of people) {
  const label = `${person.id} ${person.name}`
  assert.ok(person.name && person.story && person.tagline && person.hometown, `${label}缺少展示字段`)
  assert.ok(!/^从.+走出的开国/.test(person.tagline), `${label}仍在使用籍贯占位简介`)
  assert.ok(['partial','expanded','editorial'].includes(person.biographyStatus), `${label}缺少生平补充状态`)
  assert.ok(person.biographySections?.length, `${label}缺少分段生平`)
  assert.equal(biographyEvidence[person.id]?.name,person.name,`${label}生平事实身份不匹配`)
  const sourceUrls = new Set(person.sources.map(source=>source.url))
  for (const section of person.biographySections) {
    assert.ok(section.title && section.text && section.sourceUrls.length, `${label}分段生平缺少内容或出处`)
    assert.ok(!/<(?:script|div|p)[\s>]/i.test(section.text), `${label}生平混入网页标记`)
    for (const url of section.sourceUrls) assert.ok(sourceUrls.has(url), `${label}生平段落出处未汇总`)
    const periodBounds={'红军时期':[1927,1936],'抗日战争时期':[1937,1945],'解放战争时期':[1945,1949],'军队与国防建设':[1949,2026]}
    if (periodBounds[section.title]) {
      const [start,end]=periodBounds[section.title]
      for (const [,value] of section.text.matchAll(/(\d{4})年，任/g)) assert.ok(+value>=start && +value<=end,`${label}任职年份与阶段标题矛盾：${section.title} ${value}`)
    }
  }
  for (const id of person.historicalContextIds || []) {
    const context=contextById.get(id)
    assert.ok(context?.title && context?.text && /^https:\/\//.test(context.source.url),`${label}事件背景缺少出处`)
  }
  assert.ok(person.province !== '待补' && person.hometown !== '籍贯待补', `${label}的地域档案尚未录完`)
  for (const field of ['birth','death','grantYear']) {
    if (person[field] === null) assert.ok(person.pendingFields?.includes(field) || person.missingFields.includes(field), `${label}的${field}缺少状态说明`)
    if (person.pendingFields?.includes(field)) {
      assert.equal(person[field], null, `${label}有争议的${field}不可作为定值发布`)
      assert.ok(disputes.some(d => d.id === person.id && d.field === field && d.status === 'pending'), `${label}缺少待核实出处`)
    }
  }
  const evidence = provenance.find(item => item.id === person.id)
  for (const field of ['birth','death','grantYear','hometown']) if (person[field]) assert.ok(evidence.sources[field], `${label}的${field}缺少字段级出处`)
  assert.ok(Object.hasOwn(expected, person.rank), `${label}军衔无效`)
  assert.ok(Array.isArray(person.sources) && person.sources.length > 0, `${label}缺少出处`)
  for (const source of person.sources) assert.ok(/^https?:\/\//.test(source.url) && source.title, `${label}来源链接无效`)
  for (const field of ['birth', 'death']) assert.ok(person[field] === null || (Number.isInteger(person[field]) && person[field] >= 1850 && person[field] <= 2026), `${label}的${field}应为真实年份或null`)
  if (person.birth && person.death) assert.ok(person.birth < person.death, `${label}生卒顺序有误`)
  if (person.grantYear) assert.ok(person.grantYear >= 1955 && person.grantYear <= 1965, `${label}混入了恢复军衔制后的授衔记录`)
  let previous = 0
  for (const event of person.timeline) {
    assert.ok(Number.isInteger(event.year) && event.text, `${label}人生节点无效`)
    assert.ok(event.year >= previous, `${label}人生节点未排序`)
    if (person.birth) assert.ok(event.year >= person.birth, `${label}出现出生前的人生节点`)
    if (person.death) assert.ok(event.year <= person.death, `${label}出现逝世后的人生节点`)
    if (event.sourceUrl) assert.ok(sourceUrls.has(event.sourceUrl), `${label}人生节点的出处未汇总`)
    previous = event.year
  }
  if (person.portraitFile) {
    const path = resolve(root, 'public/portraits', person.portraitFile)
    assert.ok((await stat(path)).size > 100, `${label}肖像文件不存在或为空`)
    const fingerprint = createHash('sha256').update(await readFile(path)).digest('hex')
    assert.equal(fingerprint, portraitManifest[person.id]?.sha256, `${label}肖像文件与来源清单不一致`)
    assert.equal(person.portraitVersion, fingerprint.slice(0, 12), `${label}肖像缓存版本未更新`)
    assert.ok(!fingerprints.has(fingerprint), `${label}与${fingerprints.get(fingerprint)}错误复用了同一肖像`)
    fingerprints.set(fingerprint, label)
    assert.ok(person.imageSource, `${label}肖像缺少出处`)
    photos++
  }
  for (const field of ['birth', 'death', 'hometown']) {
    if ((field === 'hometown' ? person.hometown === '籍贯待补' : person[field] === null)) assert.ok(person.missingFields.includes(field) || person.pendingFields?.includes(field), `${label}未明确标记${field}缺项或争议`)
  }
}
assert.equal(biographyCoverage.total, people.length)
assert.equal(biographyCoverage.withSections, people.filter(p=>p.biographySections?.length).length)
assert.equal(biographyCoverage.templateHometownSummaries,0)
for (const [id,content] of Object.entries(editorial)) {
  const person=people.find(p=>p.id===id)
  assert.equal(person?.name,content.name,`${id}原创编辑与人物身份不符`)
  assert.equal(person.biographyStatus,'editorial')
}
for (const name of ['李元', '李道之', '罗斌', '张英']) {
  const pair = people.filter(p => p.name === name)
  assert.equal(pair.length, 2, `${name}的两位同名将军应分别收录`)
  assert.notEqual(pair[0].id, pair[1].id)
  assert.notEqual(pair[0].grantYear, pair[1].grantYear)
  if (pair.every(p => p.birth !== null)) assert.notEqual(pair[0].birth, pair[1].birth, `${name}的生平可能被错误合并`)
}
for (const name of ['陈士榘', '周桓', '陈仁麒', '黄新廷']) assert.ok(people.some(p => p.name === name), `应保留已核对的姓名${name}`)
for (const [name, province] of [['白天','湖南'], ['王文介','山东'], ['王云霖','湖南'], ['杨森','河南'], ['铁瑛','河南'], ['贾乾瑞','陕西']]) assert.equal(people.find(p => p.name === name)?.province, province, `${name}的省份不应受源页面标题格式影响`)
assert.ok(people.find(p => p.name === '王凤梧')?.pendingFields.includes('grantYear'), '王凤梧1955/1957授衔记载分歧在未核实前不可写死')
assert.equal(people.find(p => p.id === 'p0181')?.death, 2001, '周仁杰任职区间不可误读为逝世年份')
assert.equal(people.find(p => p.id === 'p0377')?.hometown, '山东聊城', '朱光不可混入同名空军将领的籍贯')
assert.equal(people.find(p => p.id === 'p0468')?.hometown, '福建上杭', '李平不可混入同名中将的籍贯')
assert.equal(people.find(p => p.id === 'p1092')?.grantYear, 1961, '史进前于1961年晋升少将')
for (const dispute of disputes.filter(d => d.status === 'pending')) {
  const placeholder = dispute.field === 'hometown' ? '籍贯待核实' : dispute.field === 'province' ? '地域待核实' : null
  assert.equal(people.find(p => p.id === dispute.id)?.[dispute.field], placeholder)
}
const report = JSON.parse(await readFile(resolve(root, 'data/catalog/quality-report.json'), 'utf8'))
assert.equal(report.portraits, photos + 8, '报告应包含保留的8张精选人物肖像')
assert.equal(report.missing.portrait, 1614 - report.portraits)
assert.equal(report.pendingPeople, people.filter(p => p.pendingFields?.length).length)
console.log(`目录校验通过：1614个独立档案，五类军衔人数正确，${report.portraits}张本地肖像；${report.pendingPeople}人的争议字段已停止作为定值发布，缺项、争议与字段出处记录完整。`)
