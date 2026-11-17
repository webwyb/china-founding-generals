// Read-only deployment preflight; intentionally separate from the offline check command.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const require = createRequire(import.meta.url), root = resolve(import.meta.dirname,'..')
const settings = require('../config/weapp.json')
const {dataVersion} = require('./data-version.cjs')
const {manifest} = require('./deploy/asset-manifest.cjs')
const version = dataVersion(root,settings.assetBase), dataRoot = `${settings.siteOrigin}/js/person-data/${version}`
const catalogue = require('../src/data/catalogue-lite.generated.json')
const ids = ['suyu','zhude',...catalogue.filter(p=>p.pendingFields?.includes('province')).map(p=>p.id)]
const results = await Promise.all(ids.map(async id=>{
  const r=await fetch(`${dataRoot}/${id}.json`,{signal:AbortSignal.timeout(15000)})
  assert.equal(r.status,200)
  const person=await r.json(), brief=catalogue.find(p=>p.id===id)
  assert.equal(person.id,id); assert.equal(person.name,brief.name)
  assert.deepEqual(person.pendingFields,brief.pendingFields)
  assert.ok(Array.isArray(person.biographySections)); assert.ok(Array.isArray(person.sources))
  return {id,status:r.status,biographySections:person.biographySections.length}
}))
const searchResponse=await fetch(`${dataRoot}/search.json`,{signal:AbortSignal.timeout(15000)})
assert.equal(searchResponse.status,200)
const search=await searchResponse.json()
assert.ok(catalogue.every(p=>typeof search[p.id]==='string'))
const files=['suyu.jpg','zhude.jpg','../fonts/shanhe-serif.woff2']
const urls=files.map(name=>{const path=resolve(root,'src/assets/portraits',name), filename=name.split('/').pop();return `${settings.assetBase}/${createHash('sha256').update(readFileSync(path)).digest('hex')}/${filename}`})
const assets=manifest(resolve(root,'public'),settings.assetBase)
urls.push(assets.find(a=>a.path==='landscapes/hunan.webp').url)
const assetResults=await Promise.all(urls.map(async url=>{
 const r=await fetch(url,{method:'HEAD',signal:AbortSignal.timeout(15000),headers:{Origin:'https://servicewechat.com'}})
 assert.equal(r.status,200)
 return {url,status:r.status,type:r.headers.get('content-type'),cors:r.headers.get('access-control-allow-origin')}
}))
console.log(JSON.stringify({dataVersion:version,records:results,searchRecords:Object.keys(search).length,assets:assetResults,scope:'HTTPS preflight only; no WeChat runtime or device testing'},null,2))
