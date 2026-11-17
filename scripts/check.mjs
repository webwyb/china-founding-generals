import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
const npm=process.env.npm_execpath
if(!npm)throw new Error('请通过npm run check启动完整校验。')
const root=fileURLToPath(new URL('..',import.meta.url))
// Keep the public project reproducible outside the developer's network.
const lock=JSON.parse(readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'))
for(const [name,item] of Object.entries(lock.packages)) {
  if(item.resolved && new URL(item.resolved).origin!=='https://registry.npmjs.org') throw Error(`依赖安装源必须是公共npm官方地址：${name}`)
}
for(const task of ['typecheck','data:verify','validate:data','validate:functions','validate:design','test:catalog','test:biographies','test:analytics','validate:portraits','validate:cards','build']){
  console.log(`\n检查 ${task}`)
  const result=spawnSync(process.execPath,[npm,'run',task],{cwd:root,stdio:'inherit'})
  if(result.status!==0)process.exit(result.status ?? 1)
}
console.log('\n完整校验与H5构建通过。浏览器、真机与史料审校状态仍以QA.md为准。')
