import { spawnSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { root, loadSeoRenderer } from './seo_bundle.mjs'
const { people, pageMetadata, legacyDestination } = await loadSeoRenderer()
const assert = (await import('node:assert/strict')).default
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
