import { spawnSync } from 'node:child_process'
import { writeFile, readFile, readdir } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { resolve } from 'node:path'
import { root, loadSeoRenderer } from './seo_bundle.mjs'
const { people, pageMetadata, legacyDestination } = await loadSeoRenderer()
const assert = (await import('node:assert/strict')).default
for (const path of ['index.html', 'generals/index.html', 'about/index.html', 'people/index.html', 'card/index.html',
  ...people.map(person => `people/${person.id}/index.html`)]) {
  const html = await readFile(resolve(root, 'dist/h5', path), 'utf8')
  assert.equal((html.match(/data-shanhe-analytics/g) || []).length, 1, `${path}: exactly one analytics entry`)
  assert.ok(html.includes('name="referrer" content="strict-origin-when-cross-origin"'), `${path}: cross-origin referrer policy`)
  if (path === 'about/index.html' || path === 'people/index.html') {
    assert.equal((html.match(/<script[^>]+src=/g) || []).length, 1, `${path}: no app runtime added`)
  }
}
assert.equal(legacyDestination('#/pages/person/index?id=suyu'),'/people/suyu/')
assert.equal(legacyDestination('#/pages/card/index?id=xuxiangqian'),'/card/?id=xuxiangqian')
assert.equal(legacyDestination('#/pages/explore/index?province=%E5%B1%B1%E4%B8%9C'),'/generals/?province=%E5%B1%B1%E4%B8%9C')
for(const hash of ['#profile-sources','#https://outside.example','#/pages/other/index'])assert.equal(legacyDestination(hash),undefined)
assert.ok(pageMetadata('person').robots.includes('noindex'))
assert.equal(pageMetadata('person').canonical,undefined)
assert.ok(pageMetadata('card',people[0]).robots.includes('noindex'))
const expected=resolve(root,'.cache/seo/expected.json')
await writeFile(expected,JSON.stringify(people))
const result=spawnSync(process.execPath,[resolve(root,'scripts/python.mjs'),resolve(root,'scripts/test_seo.py'),expected],{cwd:root,stdio:'inherit'})
if(result.status!==0)process.exit(result.status??1)
const bundles=[]
for(const name of (await readdir(resolve(root,'dist/h5/js'))).filter(name=>name.endsWith('.js'))){
  const bytes=await readFile(resolve(root,'dist/h5/js',name))
  bundles.push({name,bytes:bytes.length,gzipBytes:gzipSync(bytes).length})
}
assert.ok(bundles.find(file=>file.name.startsWith('common.'))?.bytes<1200000,'公共脚本超出1.2MB预算，检查是否重新打入完整生平。')
assert.ok(bundles.reduce((sum,file)=>sum+file.bytes,0)<2000000,'应用脚本超出2MB预算，检查数据和代码分包。')
await writeFile(resolve(root,'data/testing/client-bundle.json'),JSON.stringify({status:'passed',bundles,totalBytes:bundles.reduce((sum,file)=>sum+file.bytes,0),totalGzipBytes:bundles.reduce((sum,file)=>sum+file.gzipBytes,0),method:'Production JavaScript bytes and gzip sizes, excluding separately loaded profile/search JSON; size budgets only, not browser timing.'},null,2)+'\n')
