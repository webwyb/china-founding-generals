import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
const root=fileURLToPath(new URL('..',import.meta.url))
const files=['src/data/catalog.generated.json',...['image-jobs.json','missing-fields.json','source-conflicts.json','rejected-identities.json','field-provenance.json','pending-review.json','quality-report.json','people.csv','biography-coverage.json'].map(file=>'data/catalog/'+file)]
const before=await Promise.all(files.map(file=>readFile(resolve(root,file))))
const result=spawnSync(process.execPath,[resolve(root,'scripts/python.mjs'),'scripts/build_catalog.py'],{cwd:root,stdio:'inherit'})
assert.equal(result.status,0,'资料生成失败')
for(let index=0;index<files.length;index++)assert.deepEqual(await readFile(resolve(root,files[index])),before[index],`${files[index]}未能从已提交快照复现；请检查并提交生成结果`)
console.log(`资料快照复现通过：${files.length}项生成输出与工作文件逐字节一致。`)
