const {createHash}=require('node:crypto')
const {readFileSync,readdirSync}=require('node:fs')
const {resolve}=require('node:path')
exports.dataVersion=(root,base=process.env.SHANHE_ASSET_BASE_URL||'')=>{
 const hash=createHash('sha256').update('person-data-v1:'+base)
 for(const path of ['src/data/catalog.generated.json','src/data/featured.ts','src/data/people.ts','data/catalog/historical-contexts.json','data/catalog/portraits.json'])hash.update(readFileSync(resolve(root,path),'utf8').replace(/\r\n/g,'\n'))
 for(const file of readdirSync(resolve(root,'src/assets/portraits')).sort())hash.update(readFileSync(resolve(root,'src/assets/portraits',file)))
 return hash.digest('hex').slice(0,20)
}
