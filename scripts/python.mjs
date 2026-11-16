import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root=fileURLToPath(new URL('..',import.meta.url))
const local=resolve(root,process.platform==='win32'?'.venv/Scripts/python.exe':'.venv/bin/python')
const env={...process.env,PYTHONUTF8:'1'}
const candidates=process.env.SHANHE_PYTHON ? [[process.env.SHANHE_PYTHON]] : [
  ...(existsSync(local)?[[local]]:[]),
  ...['python3','python3.13','python3.12','python3.11','python3.10','python'].map(command=>[command]),
  ...(process.platform==='win32'?[['py','-3']]:[]),
]
let selected
for(const [command,...prefix] of candidates){
  const probe=spawnSync(command,[...prefix,'-c','import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)'],{cwd:root,env,stdio:'ignore'})
  if(probe.status===0){selected={command,prefix};break}
}
if(!selected){console.error('未找到Python 3.10+。请安装推荐的Python 3.11；可用SHANHE_PYTHON指定解释器路径。');process.exit(1)}
const result=spawnSync(selected.command,[...selected.prefix,...process.argv.slice(2)],{cwd:root,stdio:'inherit',env})
if(result.error){console.error('无法启动所选Python解释器。');process.exit(1)}
process.exit(result.status ?? 1)
