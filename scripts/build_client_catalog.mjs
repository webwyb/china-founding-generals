import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const source=new URL('../src/data/catalog.generated.json',import.meta.url)
const target=new URL('../src/data/catalogue-lite.generated.json',import.meta.url)
const fields=['id','name','aliases','rank','province','hometown','hometownType','birth','death','grantYear','portraitFile','portraitVersion','tagline','missingFields','pendingFields','dataStatus','biographyStatus']
export async function buildClientCatalog(check=false){
 const people=JSON.parse(await readFile(source,'utf8'))
 const content=JSON.stringify(people.map(person=>Object.fromEntries(fields.filter(key=>key in person).map(key=>[key,person[key]]))))+'\n'
 if(check){if((await readFile(target,'utf8')).replace(/\r\n/g,'\n')!==content)throw Error('轻量名录未更新，请运行 npm run data:build。')}
 else await writeFile(target,content)
 return Buffer.byteLength(content)
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(`轻量名录：${await buildClientCatalog(process.argv.includes('--check'))}字节。`)
