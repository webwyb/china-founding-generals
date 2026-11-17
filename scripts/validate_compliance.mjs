import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { readFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { build } from 'esbuild'

const root = fileURLToPath(new URL('..', import.meta.url)), require = createRequire(import.meta.url)
const read = async file => JSON.parse(await readFile(resolve(root, file), 'utf8'))
const output = resolve(root, '.cache/compliance-check')
await mkdir(output, { recursive: true })
await build({ entryPoints: [resolve(root, 'src/services/compliance.ts')], outfile: resolve(output, 'links.cjs'), bundle: true, platform: 'node', format: 'cjs' })
const { feedbackUrl, siteCompliance } = require(resolve(output, 'links.cjs'))
assert.match(siteCompliance.icpNumber, /^[\u4e00-\u9fff]ICP备\d+号-\d+$/)
assert.equal(new URL(siteCompliance.icpUrl).hostname, 'beian.miit.gov.cn')
assert.match(siteCompliance.feedbackEmail, /^[^\s@]+@[^\s@]+\.[^\s@]+$/)
assert.equal(Boolean(siteCompliance.policeNumber), Boolean(siteCompliance.policeUrl), '公安编号与核验链接应同时提供，未核实则同时留空')
if (siteCompliance.policeUrl) assert.ok(['beian.mps.gov.cn', 'www.beian.gov.cn'].includes(new URL(siteCompliance.policeUrl).hostname))
const people = await read('src/data/catalog.generated.json')
for (const person of people) for (const kind of ['copyright', 'correction']) {
  const link = new URL(feedbackUrl(kind, person))
  assert.equal(link.protocol, 'mailto:')
  assert.equal(link.pathname, siteCompliance.feedbackEmail)
  const body = link.searchParams.get('body')
  assert.ok(body.includes(`人物姓名：${person.name}`))
  assert.ok(body.includes(`https://shanhe.binnwu.top/people/${person.id}/`))
  assert.ok(link.searchParams.get('subject').includes(person.name))
}
const report = await read('data/compliance/image-rights-review.json')
const portraits = await read('data/catalog/portraits.json')
const regions = (await read('data/design/landscape-prompts.json')).regions
for (const [file, hash] of Object.entries(report.inputHashes)) assert.equal(createHash('sha256').update(await readFile(resolve(root, file))).digest('hex'), hash, '图片清单输入已更新，请运行npm run audit:images')
const expected = people.filter(person => portraits[person.id] || !person.id.startsWith('p')).map(person => person.id)
assert.deepEqual(report.records.filter(row => row.category === '历史肖像').map(row => row.id).sort(), expected.sort(), '清单需包含精选8张，排除5张占位')
assert.deepEqual(report.records.filter(row => row.category === 'AI景观').map(row => row.id).sort(), regions.map(row => `landscape-${row.id}`).sort())
assert.equal(new Set(report.records.map(row => row.id)).size, report.records.length)
assert.ok(report.records.every(row => row.reviewStatus === 'pending' && row.permissionEvidence === null && row.verifiedUseScope.length === 0), '来源标记不能自动转换为已取得授权')
assert.equal(report.summary.total, report.records.length)
assert.equal(report.summary.missingPortraits, report.missingPortraits.length)
console.log(`合规入口校验通过：${people.length * 2}份具名邮件草稿、${report.summary.total}张图片清单；公安公示${siteCompliance.policeNumber ? '已配置' : '待核实真实编号，未展示占位号'}。`)
