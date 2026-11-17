import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const npm=process.env.npm_execpath
if(!npm)throw new Error('请通过npm run check启动完整校验。')
const root=fileURLToPath(new URL('..',import.meta.url))
for(const task of ['typecheck','data:verify','validate:data','validate:functions','validate:design','test:catalog','test:biographies','validate:portraits','validate:cards','build']){
  console.log(`\n检查 ${task}`)
  const result=spawnSync(process.execPath,[npm,'run',task],{cwd:root,stdio:'inherit'})
  if(result.status!==0)process.exit(result.status ?? 1)
}
console.log('\n完整校验与H5构建通过。浏览器、真机与史料审校状态仍以QA.md为准。')
