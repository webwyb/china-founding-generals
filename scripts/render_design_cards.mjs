import { createRequire } from 'node:module'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('..', import.meta.url))
const { build } = require('esbuild')
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas')
await build({ entryPoints: [resolve(root,'src/services/cardRenderer.ts')], bundle: true, platform: 'node', format: 'cjs', outfile: resolve(root,'.cache/design-render/renderer.cjs') })
const { drawMemorialCard } = require(resolve(root,'.cache/design-render/renderer.cjs'))
assert.ok(GlobalFonts.registerFromPath(resolve(root,'src/assets/fonts/shanhe-serif.woff2'), 'Shanhe Serif'), '仓库内中文字体应成功加载')
const people = JSON.parse(await readFile(resolve(root,'src/data/catalog.generated.json'),'utf8'))
const regions = JSON.parse(await readFile(resolve(root,'data/design/landscape-prompts.json'),'utf8')).regions
const output = resolve(root,'.cache/design-review')
await mkdir(output,{recursive:true})
// Test text placement for every record without encoding thousands of review PNGs.
const textCanvas=createCanvas(600,900),textContext=textCanvas.getContext('2d')
const sampleImage=await loadImage(resolve(root,'src/assets/portrait-placeholder.svg'))
const textFill=textContext.fillText.bind(textContext)
let testedLabels=0
textContext.fillText=(text,x,y,...rest)=>{
 const width=textContext.measureText(text).width
 const left=textContext.textAlign==='center'?x-width/2:textContext.textAlign==='right'?x-width:x
 assert.ok(left>=20&&left+width<=580,`文字超出纪念卡边界：${text}`)
 assert.ok(y>=20&&y<=875,`文字超出纵向边界：${text}`)
 testedLabels++;return textFill(text,x,y,...rest)
}
for(const person of people)for(const theme of ['landscape','portrait'])drawMemorialCard(textContext,person,sampleImage,sampleImage,theme)
await writeFile(resolve(root,'data/design/card-layout-report.json'),JSON.stringify({people:people.length,themes:2,compositions:people.length*2,textLabels:testedLabels,clippingErrors:0,method:'Shared production Canvas drawing function with native Skia text measurement; no browser access'},null,2)+'\n')
console.log('Text layout passed for',people.length*2,'card compositions')
const selected = [people.find(p=>p.name==='粟裕'),people.find(p=>p.name==='李贞'),people.find(p=>p.province==='山东'&&p.portraitFile),people.find(p=>p.province==='北京'),people.find(p=>p.name==='马尔果夫·伊斯哈科夫'),people.find(p=>!p.portraitFile&&p.id.startsWith('p')),people.find(p=>p.pendingFields?.includes('province')),people.find(p=>p.pendingFields?.includes('birth')&&p.pendingFields?.includes('death'))]
const results=[]
for (const person of selected) {
 const province = regions.find(r=>r.province===person.province)
 const sceneryFile=province ? [resolve(root,`public/landscapes/${province.id}.webp`),resolve(root,`public/landscapes/${province.id}.png`),resolve(root,`.cache/design/landscapes/${province.id}.png`)].find(existsSync) : undefined
 if(province&&!sceneryFile){console.log('Awaiting scenery',province.id);continue}
 const portraitFile=person.portraitFile?resolve(root,'public/portraits',person.portraitFile):!person.id.startsWith('p')?resolve(root,'src/assets/portraits',person.id+'.jpg'):resolve(root,'src/assets/portrait-placeholder.svg')
 const [portrait,scenery] = await Promise.all([loadImage(portraitFile),sceneryFile ? loadImage(sceneryFile) : null])
 for(const theme of ['landscape','portrait']) {
  const canvas=createCanvas(1200,1800),context=canvas.getContext('2d');context.scale(2,2)
  const fill=context.fillText.bind(context);let labels=0
  context.fillText=(text,x,y,...rest)=>{const width=context.measureText(text).width;const left=context.textAlign==='center'?x-width/2:context.textAlign==='right'?x-width:x;assert.ok(left>=20&&left+width<=580,`${person.name}的文字溢出：${text}`);assert.ok(y>=20&&y<=875);labels++;return fill(text,x,y,...rest)}
  drawMemorialCard(context,person,portrait,scenery,theme)
  const file=resolve(output,`${person.id}-${theme}.png`);await writeFile(file,canvas.toBuffer('image/png'))
  results.push({id:person.id,name:person.name,province:person.province,theme,labels,file:relative(root,file).replaceAll('\\','/')})
 }
}
await writeFile(resolve(root,'data/design/card-render-check.json'),JSON.stringify(results,null,2)+'\n')
console.log(JSON.stringify(results.map(({name,province,theme})=>({name,province,theme}))))

const sheet=createCanvas(1500,1380),sheetContext=sheet.getContext('2d')
sheetContext.fillStyle='#f4f7f3';sheetContext.fillRect(0,0,1500,1380)
sheetContext.font='500 18px "Shanhe Serif"';sheetContext.fillStyle='#203d43'
for(let index=0;index<regions.length;index++){
 const region=regions[index],x=(index%5)*300,y=Math.floor(index/5)*230
 const image=await loadImage(resolve(root,`public/landscapes/${region.id}.webp`))
 sheetContext.drawImage(image,x+8,y+8,284,189)
 sheetContext.fillText(region.province+' · '+region.landmark,x+10,y+221)
}
await writeFile(resolve(output,'landscape-review.png'),sheet.toBuffer('image/png'))
