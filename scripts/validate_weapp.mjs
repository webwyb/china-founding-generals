import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'
import { createCanvas, Image } from '@napi-rs/canvas'
const root = resolve(import.meta.dirname, '..'), output = resolve(root, '.cache/weapp-check')
mkdirSync(output, { recursive: true })
const require = createRequire(import.meta.url)
const settings = require('../config/weapp.json')
const { manifest } = require('./deploy/asset-manifest.cjs')
const { dataVersion } = require('./data-version.cjs')
const assets = Object.fromEntries(manifest(resolve(root,'public'), settings.assetBase).map(a => [a.path, a.url]))
const localImages = new Map(manifest(resolve(root,'public'), settings.assetBase).map(a => [a.url, resolve(root,'public',a.path)]))
for (const name of ['zhude','xuxiangqian','suyu','xuhaidong','hongxuezhi','chenqihan','zhangzhen','lizhen']) {
  const path = resolve(root,`src/assets/portraits/${name}.jpg`)
  const url = `${settings.assetBase}/${createHash('sha256').update(readFileSync(path)).digest('hex')}/${name}.jpg`
  assets[`featured/${name}.jpg`] = url
  localImages.set(url, path)
}
let response, requestCount = 0, failSave = '', saved, calls = [], pages = []
globalThis.miniAdapter = {
  request: async () => { requestCount++; return { statusCode: 200, data: response } },
  getCurrentPages: () => pages,
  reLaunch: o => calls.push(['reLaunch',o]), navigateTo: o => calls.push(['navigateTo',o]),
  redirectTo: o => calls.push(['redirectTo',o]), navigateBack: o => calls.push(['navigateBack',o]),
  downloadFile: async ({url}) => ({ statusCode: 200, tempFilePath: localImages.get(url) || resolve(root,url.replace(/^\//,'')) }),
  loadFontFace: async () => {},
  canvasToTempFilePath: async ({canvas, destWidth, destHeight}) => {
    assert.equal(destWidth,1200); assert.equal(destHeight,1800)
    const file = resolve(output, 'preview.png'); writeFileSync(file,canvas.toBuffer('image/png')); return { tempFilePath: file }
  },
  saveImageToPhotosAlbum: async ({filePath}) => { if (failSave) throw {errMsg: failSave}; saved = filePath }
}
await build({ entryPoints: ['data/people.weapp.ts','services/personData.weapp.ts','services/miniCard.ts','components/Shell.tsx'].map(p => resolve(root,'src',p)),
  bundle: true, platform:'node', format:'cjs', outdir:output, outExtension:{'.js':'.cjs'}, resolveExtensions:['.weapp.ts','.weapp.tsx','.ts','.tsx','.js','.json'],
  define:{ 'process.env.TARO_ENV':'"weapp"', __SHANHE_ASSET_URLS__:JSON.stringify(assets), __SHANHE_MINI_DATA_ROOT__:JSON.stringify('https://example.invalid'), __SHANHE_MINI_FONT__:'"https://example.invalid/font.woff2"' },
  plugins:[{name:'mini-test-adapter',setup(b){
    b.onResolve({filter:/^@tarojs\/taro$/},()=>({path:'taro',namespace:'mock'}))
    b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export default globalThis.miniAdapter'}))
    b.onResolve({filter:/^@tarojs\/components$/},()=>({path:'components',namespace:'components'}))
    b.onLoad({filter:/.*/,namespace:'components'},()=>({contents:'export const Button=()=>null,Image=()=>null,Text=()=>null,View=()=>null'}))
  }}] })
const {people} = require(join(output,'data/people.weapp.cjs'))
assert.equal(people.length,1614)
assert.equal(people.filter(p=>!p.portraitMissing).length,1609)
assert.ok(people.filter(p=>!p.portraitMissing).every(p=>p.portrait.startsWith('https://')))
const data = require(join(output,'services/personData.weapp.cjs'))
const suyu = people.find(p=>p.id==='suyu')
response = {...suyu,biographySections:[], portrait:'/static/h5-only.jpg'}
const [a,b] = await Promise.all([data.loadPerson('suyu'),data.loadPerson('suyu')])
assert.equal(requestCount,1); assert.equal(a,b); assert.equal(a.portrait,suyu.portrait)
assert.equal((await data.loadPerson('suyu')),a)
await assert.rejects(data.loadPerson('unknown'))
response = {...suyu, id:'zhude'}
await assert.rejects(data.loadPerson('zhude'),/核对/)
response = {...people.find(p=>p.id==='zhude'),biographySections:[]}
assert.equal((await data.loadPerson('zhude')).id,'zhude')
response = {}
await assert.rejects(data.loadSearchIndex(),/核对/)
response = Object.fromEntries(people.map(p=>[p.id,p.name]))
assert.equal(Object.keys(await data.loadSearchIndex()).length,1614)
const ui = require(join(output,'components/Shell.cjs'))
pages = [{route:'pages/explore/index'},{route:'pages/person/index'}]
ui.openPage('explore'); assert.deepEqual(calls.pop(),['navigateBack',{delta:1}])
pages = [{route:'pages/person/index'}];ui.openPage('person','id=zhude');assert.equal(calls.pop()[0],'redirectTo')
pages = [{route:'pages/explore/index'},{route:'pages/person/index'}];ui.openPage('explore','province=%E6%B9%96%E5%8D%97');assert.equal(calls.pop()[0],'reLaunch')
pages = [];ui.returnTo('explore');assert.equal(calls.pop()[0],'redirectTo')
const card = require(join(output,'services/miniCard.cjs'))
for (const theme of ['portrait','landscape']) {
  const canvas=createCanvas(1200,1800);canvas.createImage=()=>new Image()
  const file=await card.renderMiniCard(suyu,theme,canvas)
  assert.ok(statSync(file).size>10000)
  await card.saveMiniCard(file);assert.equal(saved,file)
}
for (const [err,expected] of [['auth deny',/权限/],['cancel',/取消/],['disk full',/保存未完成/]]) {
  failSave=err;await assert.rejects(card.saveMiniCard('preview.png'),expected)
}
const dist = resolve(root,'dist/weapp')
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)])}
for (const page of ['index','explore','person','card','about']) assert.ok(!readdirSync(resolve(root,`src/pages/${page}`)).includes('index.weapp.tsx'), '页面应保持单一跨端实现')
const built = files(dist)
const bytes = built.reduce((n,p)=>n+statSync(p).size,0)
assert.ok(bytes < 2*1024*1024,`小程序主包超限：${bytes}`)
assert.ok(!built.some(p=>/\/portraits\/|\/landscapes\/|\.woff2$/.test(p)), '大素材不得进入主包')
const app=JSON.parse(readFileSync(join(dist,'app.json'),'utf8'))
assert.equal(app.pages.length,5)
assert.equal(app.window.navigationBarTitleText, '名在山河')
assert.deepEqual(readFileSync(join(dist,'static/brand/icon.png')), readFileSync(resolve(root,'public/brand/icon.png')), '微信品牌图标须随包保留并与H5同源')
assert.notEqual(app.window.navigationStyle,'custom')
const js=built.filter(p=>p.endsWith('.js')).map(p=>readFileSync(p,'utf8')).join('\n')
assert.ok(js.includes(dataVersion(root,settings.assetBase)), '编译数据版本必须与发布数据契约一致')
assert.ok(!js.includes('document.createElement'), '小程序不应打入浏览器成图代码')
const readableJs = js.replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
assert.ok(!readableJs.includes('山河有名'), '微信包不能出现旧品牌名')
assert.ok(readableJs.includes('名字留在山河，记忆有其来处。'), '微信包应包含统一品牌短句')
assert.ok(!js.includes('aegis-web-sdk'), '小程序不应打入网页监控')
console.log(`微信适配器回归与主包检查通过：${bytes} bytes（${(bytes/1024**2).toFixed(2)} MiB）。未执行开发者工具或真机验收。`)
