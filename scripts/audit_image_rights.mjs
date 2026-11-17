import { createHash } from 'node:crypto'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const json = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'))
const hash = data => createHash('sha256').update(data).digest('hex')
const people = await json('src/data/catalog.generated.json')
const portraits = await json('data/catalog/portraits.json')
const assets = await json('data/design/landscape-assets.json')
const regions = (await json('data/design/landscape-prompts.json')).regions
const labels = {
  permission_required: '来源明确要求授权，未见凭证',
  license_unknown: '来源未明确开放许可／使用范围待核实',
  license_unspecified: '许可信息不足，需追溯原始文件',
  public_domain_claim: '已有公版标记，适用依据待复核',
  cc0_claim: '已有CC0标记，原文件许可待复核',
  ai_terms: 'AI景观：生成条款与标识待复核',
}
function classify(license) {
  if (license.includes('书面授权')) return 'permission_required'
  if (/未标明|待核实|未提供|未确认/.test(license)) return 'license_unknown'
  if (license === 'Public domain') return 'public_domain_claim'
  if (license === 'CC0') return 'cc0_claim'
  return 'license_unspecified'
}
const records = [], missingPortraits = []
for (const person of people) {
  const entry = portraits[person.id]
  if (!entry && person.id.startsWith('p')) { missingPortraits.push({ id: person.id, name: person.name }); continue }
  const file = entry ? `public/portraits/${entry.file}` : `src/assets/portraits/${person.id}.jpg`
  const bytes = await readFile(resolve(root, file)), sha256 = hash(bytes)
  if (entry && entry.sha256 !== sha256) throw Error(`${person.name}原件与来源清单哈希不同`)
  const license = entry?.license || '精选肖像仅记录来源，未附逐图版权许可证明'
  const status = classify(license)
  records.push({
    id: person.id, name: person.name, category: '历史肖像', province: person.province, file,
    sha256, bytes: bytes.length, sourceUrl: entry?.source || person.imageSource,
    downloadUrl: entry?.downloadUrl || null, sourceHost: new URL(entry?.source || person.imageSource).host,
    recordedLicense: license, reviewStatus: 'pending', evidenceCategory: status, status: labels[status],
    priority: status === 'permission_required' ? 1 : ['license_unknown', 'license_unspecified'].includes(status) ? 2 : 3,
    rightsHolder: null, permissionEvidence: null, verifiedUseScope: [],
    checks: status === 'public_domain_claim'
      ? ['核实原照片作者、首次发表及保护期限', '复核公版依据在中国大陆及其他拟传播地区的适用性', '核对原照片与来源文件是否一致']
      : status === 'cc0_claim'
        ? ['确认CC0声明指向同一原文件', '核验声明者的处分权限及其他权利限制']
        : ['追溯摄影者或其他权利人及原始发表出处', '取得授权凭证或记录其他合法使用依据', '分别确认网站展示、COS分发、纪念卡合成、下载与分享的使用范围'],
  })
}
for (const region of regions) {
  const entry = assets[region.id], file = `public/landscapes/${entry.file}`, bytes = await readFile(resolve(root, file))
  if (hash(bytes) !== entry.sha256) throw Error(`${region.province}景观与素材清单哈希不同`)
  records.push({
    id: `landscape-${region.id}`, name: `${region.province}·${region.landmark}`, category: 'AI景观', province: region.province,
    file, sha256: entry.sha256, bytes: bytes.length, originalFile: `design/landscapes/${region.id}.png`,
    sourceUrl: null, downloadUrl: null, sourceHost: '项目内生成记录',
    sourceRecord: 'data/design/landscape-assets.json', recordedLicense: `生成记录：${entry.generator}；未将历史照片授权套用于AI景观`,
    reviewStatus: 'pending', evidenceCategory: 'ai_terms', status: labels.ai_terms, priority: 3,
    rightsHolder: null, permissionEvidence: null, verifiedUseScope: [],
    checks: ['保留生成记录和适用的生成服务条款', '核对网站展示、输出文件的AI标识', '核查是否涉及第三方作品或受保护标识'],
  })
}
const counts = Object.fromEntries(Object.keys(labels).map(status => [status, records.filter(row => row.evidenceCategory === status).length]))
records.sort((a, b) => a.priority - b.priority)
const report = {
  date: '2026-11-17', title: '山河有名 · 图片授权待核实清单',
  scope: '覆盖1609张实际历史肖像（含8张精选肖像）和29张AI景观；5位占位人物单列。未纳入字体、代码图标等非人物／景观素材。',
  note: '清单只整理现有来源与许可标记，不是逐图法律结论；身份审核通过不等于版权授权通过。未向权利人发信，未将任何条目标为已取得授权。',
  summary: { total: records.length, portraits: records.filter(row => row.category === '历史肖像').length, landscapes: regions.length, missingPortraits: missingPortraits.length, counts },
  records, missingPortraits,
  inputHashes: Object.fromEntries(await Promise.all(['src/data/catalog.generated.json', 'data/catalog/portraits.json', 'data/design/landscape-assets.json', 'data/design/landscape-prompts.json'].map(async file => [file, hash(await readFile(resolve(root, file)))]))),
}
const output = resolve(root, 'data/compliance')
await mkdir(output, { recursive: true })
await writeFile(resolve(output, 'image-rights-review.json'), JSON.stringify(report, null, 2) + '\n')
const data = JSON.stringify(report).replaceAll('<', '\\u003c')
await writeFile(resolve(output, 'image-rights-review.html'), `<!doctype html>
<html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${report.title}</title>
<style>body{margin:0;background:#f4f7f3;color:#203d43;font:15px/1.8 system-ui,sans-serif}main{max-width:1500px;margin:auto;padding:28px}h1{font:600 28px/1.5 Georgia,serif}p{max-width:78em}label{display:inline-flex;gap:8px;align-items:center;margin:8px 18px 8px 0}input,select,button{font:inherit;color:inherit;padding:9px;border:1px solid #b9c9c0;background:white;border-radius:3px;min-height:44px;box-sizing:border-box}input{width:min(400px,75vw)}button{cursor:pointer}button:disabled{opacity:.4;cursor:default}a{color:#285d60;overflow-wrap:anywhere}table{border-collapse:collapse;width:100%;font-size:13px}th,td{text-align:left;vertical-align:top;padding:12px;border-bottom:1px solid #d5dfd7}th{white-space:nowrap;background:#e6ede5}td:nth-child(4){min-width:190px}td:nth-child(5){min-width:240px}td:nth-child(6){min-width:260px}.table-wrap{overflow:auto;border:1px solid #d5dfd7}small{display:block;color:#60736c}code{display:block;font-size:11px;word-break:break-all}#paging{display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin:18px 0}summary{cursor:pointer}#counts{padding:12px 0}.tag{display:inline-block;margin:3px 14px 3px 0}input:focus-visible,select:focus-visible,button:focus-visible,a:focus-visible{outline:2px solid #a23f32;outline-offset:3px}@media(max-width:600px){main{padding:18px}h1{font-size:23px}}</style>
<main><h1>${report.title}</h1><p>整理日期：${report.date}。${report.scope}</p><p>${report.note}</p><p>每张图片都需要单独核实权利人、授权证明或其他合法使用依据，以及网站展示、COS分发、纪念卡合成、下载和分享的适用范围。公版／CC0仅表示现有清单的来源标记，不能直接视为本轮已复核通过。</p><div id="counts"></div>
<label for="search">检索<input id="search" type="search" placeholder="姓名、ID、来源域名或文件名"></label><label for="status">核验类别<select id="status"><option value="">全部类别</option></select></label><label for="category">图片类型<select id="category"><option value="">全部图片</option><option>历史肖像</option><option>AI景观</option></select></label><p id="result" role="status" aria-live="polite"></p>
<div class="table-wrap"><table><thead><tr><th>优先级</th><th>人物／景观</th><th>核验类别</th><th>原许可记录</th><th>可追溯出处</th><th>待核验事项</th><th>文件与哈希</th></tr></thead><tbody id="rows"></tbody></table></div><div id="paging"><button id="prev">上一页</button><span id="page"></span><button id="next">下一页</button></div><details><summary>5位肖像占位人物（未纳入真实图片授权数量）</summary><p id="missing"></p></details></main>
<script id="data" type="application/json">${data}</script>
<script>
const report=JSON.parse(document.getElementById('data').textContent),all=report.records;let page=0,filtered=all;
const el=id=>document.getElementById(id),text=(tag,value)=>{const n=document.createElement(tag);n.textContent=value;return n};
el('counts').textContent='共 '+all.length+' 张：历史肖像 '+report.summary.portraits+' 张，AI景观 '+report.summary.landscapes+' 张；全部为待核验记录。';
for(const [key,count] of Object.entries(report.summary.counts)){const row=all.find(r=>r.evidenceCategory===key);if(row){const option=text('option',row.status+'（'+count+'）');option.value=key;el('status').append(option)}}
el('missing').textContent=report.missingPortraits.map(p=>p.name+'（'+p.id+'）').join('、');
function link(cell,label,url){if(!url)return;const a=text('a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';cell.append(a,document.createElement('br'))}
function render(){el('rows').replaceChildren();for(const r of filtered.slice(page*50,(page+1)*50)){const tr=document.createElement('tr');tr.append(text('td','P'+r.priority));const who=text('td',r.name);who.append(text('small',r.id+' · '+r.category));tr.append(who,text('td',r.status),text('td',r.recordedLicense));const source=document.createElement('td');link(source,'来源页面',r.sourceUrl);link(source,'原始文件链接',r.downloadUrl);source.append(text('small',r.sourceHost));tr.append(source,text('td',r.checks.join('；')));const file=text('td',r.file);file.append(text('code',r.sha256));tr.append(file);el('rows').append(tr)}const pages=Math.max(1,Math.ceil(filtered.length/50));el('page').textContent='第 '+(page+1)+' / '+pages+' 页，每页50条';el('result').textContent='匹配 '+filtered.length+' 条';el('prev').disabled=page===0;el('next').disabled=page+1>=pages}
function filter(){const q=el('search').value.trim().toLocaleLowerCase();filtered=all.filter(r=>(!el('status').value||r.evidenceCategory===el('status').value)&&(!el('category').value||r.category===el('category').value)&&(!q||[r.id,r.name,r.file,r.sourceHost,r.recordedLicense].join(' ').toLocaleLowerCase().includes(q)));page=0;render()}
for(const id of ['search','status','category'])el(id).addEventListener(id==='search'?'input':'change',filter);el('prev').onclick=()=>{page--;render()};el('next').onclick=()=>{page++;render()};render();
</script></html>`)
console.log(JSON.stringify(report.summary, null, 2))
