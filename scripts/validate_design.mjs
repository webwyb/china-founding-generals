import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { readFile, stat, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const root=fileURLToPath(new URL('..',import.meta.url)),require=createRequire(import.meta.url)
const json=async path=>JSON.parse(await readFile(resolve(root,path),'utf8'))
const people=await json('src/data/catalog.generated.json')
const regions=(await json('data/design/landscape-prompts.json')).regions
const assets=await json('data/design/landscape-assets.json')
assert.equal(regions.length,29)
assert.equal(new Set(regions.map(r=>r.province)).size,29)
assert.equal(new Set(Object.values(assets).map(a=>a.sha256)).size,29,'每个地区应有独立配图')
for(const person of people){
 if(person.pendingFields?.includes('province'))assert.equal(person.province,'地域待核实','地域未核定时不得配上推测的省份景观')
 else assert.ok(regions.some(r=>r.province===person.province),`${person.name}缺少省份景观`)
}
for(const region of regions){
 const asset=assets[region.id];assert.ok(asset,`${region.province}缺少生成记录`)
 const file=await readFile(resolve(root,'public/landscapes',asset.file))
 assert.equal(createHash('sha256').update(file).digest('hex'),asset.sha256)
 const original=await readFile(resolve(root,'design/landscapes',region.id+'.png'))
 assert.equal(createHash('sha256').update(original).digest('hex'),asset.originalSha256,`${region.province}设计原稿与清单不符`)
 assert.equal(file.subarray(0,4).toString(),'RIFF')
 assert.ok(file.length<1_000_000,`${region.province}的配图应适合移动端加载`)
}
assert.ok((await stat(resolve(root,'src/assets/fonts/shanhe-serif.woff2'))).size<1_000_000)
assert.ok((await readFile(resolve(root,'public/fonts/OFL-NotoSerifSC.txt'),'utf8')).includes('OPEN FONT LICENSE'))
const {build}=require('esbuild')
await mkdir(resolve(root,'.cache/design-render'),{recursive:true})
await build({entryPoints:[resolve(root,'src/services/catalogueState.ts')],bundle:true,platform:'node',format:'cjs',outfile:resolve(root,'.cache/design-render/state.cjs'),plugins:[{name:'memory-storage',setup(builder){builder.onResolve({filter:/^@tarojs\/taro$/},()=>({path:'storage',namespace:'stub'}));builder.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:'export default {getStorageSync(){if(globalThis.storageFails)throw Error();return globalThis.storedView},setStorageSync(key,value){if(globalThis.storageFails)throw Error();globalThis.storedView=value}}',loader:'js'}))}}]})
const state=require(resolve(root,'.cache/design-render/state.cjs'))
const saved={search:'湖北 少将',rank:'少将',province:'湖北',visibleCount:72,rememberedOnly:true,scrollTop:1294}
state.saveCatalogueState(saved);assert.deepEqual(state.readCatalogueState(),saved,'筛选、铭记视图和阅读位置应完整保留')
globalThis.storedView={search:42,rank:'错误',visibleCount:NaN,scrollTop:Infinity}
assert.deepEqual(state.readCatalogueState(),state.defaultCatalogueState,'无效缓存应回到可浏览状态')
globalThis.storageFails=true;assert.doesNotThrow(()=>state.saveCatalogueState(saved));assert.deepEqual(state.readCatalogueState(),state.defaultCatalogueState)
console.log('设计校验通过：29张独立景观覆盖已确定地域的档案；地域待核实档案不推测配景；图片与字体体积、状态保存和异常恢复通过。')
