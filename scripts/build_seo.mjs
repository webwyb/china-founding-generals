import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { root, loadSeoRenderer } from './seo_bundle.mjs'
const { people, pageMetadata, serializeStructuredData, renderPage, PUBLIC_SITE_URL } = await loadSeoRenderer()
const output = resolve(root,'dist/h5')
const template = await readFile(resolve(output,'index.html'),'utf8')
if(!template.includes('<div id="app"></div>')) throw Error('H5 HTML mount point changed; update the prerenderer before publishing.')
if(template.includes('id="prerender"')) throw Error('Run npm run build to create a fresh application shell before prerendering.')
const escape = text => String(text).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]))

function head(data) {
  const meta=(name,content,property=false)=>content ? `<meta ${property?'property':'name'}="${name}" content="${escape(content)}">` : ''
  return `<title>${escape(data.title)}</title>${meta('description',data.description)}${meta('robots',data.robots)}${data.canonical?`<link rel="canonical" href="${escape(data.canonical)}">`:''}`+
    Object.entries({title:data.title,description:data.description,url:data.canonical,type:'website',site_name:'山河有名',locale:'zh_CN',image:data.image}).map(([key,value])=>meta('og:'+key,value,true)).join('')+
    Object.entries({card:'summary',title:data.title,description:data.description,image:data.image}).map(([key,value])=>meta('twitter:'+key,value)).join('')+
    `<script id="page-structured-data" type="application/ld+json">${serializeStructuredData(data.structuredData)}</script>`
}
for(const directory of ['people','generals','about','card']) await rm(resolve(output,directory),{recursive:true,force:true})
const pages=[['index','/'],['explore','/generals/'],['directory','/people/'],['about','/about/'],['card','/card/'],...people.map(person=>['person',`/people/${person.id}/`,person])]
const sitemap=[]
let totalBytes=0
for(const [page,path,person] of pages){
  globalThis.window={location:new URL(path,PUBLIC_SITE_URL)}
  const metadata=pageMetadata(page,person)
  let html=template.replace(/<title>[\s\S]*?<\/title>/,'').replace(/<meta\s+name="description"[^>]*>/,'')
  html=html.replace('</head>',head(metadata)+'</head>').replace('<div id="app"></div>',`<div id="prerender">${renderPage(page)}</div><div id="app"></div>`)
  // Reference pages retain only the privacy-gated analytics entry, without the app runtime.
  if(page==='directory'||page==='about') html=html.replace(/<script(?![^>]*(?:application\/ld\+json|data-shanhe-analytics))[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link[^>]*rel="modulepreload"[^>]*>/g,'')
  const directory=resolve(output,'.'+path)
  await mkdir(directory,{recursive:true})
  await writeFile(resolve(directory,'index.html'),html)
  totalBytes+=Buffer.byteLength(html)
  if(page!=='card')sitemap.push(metadata.canonical)
}
await writeFile(resolve(output,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.map(url=>`  <url><loc>${escape(url)}</loc></url>`).join('\n')}\n</urlset>\n`)
await writeFile(resolve(output,'robots.txt'),`User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap.xml',PUBLIC_SITE_URL).href}\n`)
console.log(`SEO静态生成：${pages.length}个HTML（含1614份完整人物档案）、${sitemap.length}条规范网址，共${(totalBytes/1024/1024).toFixed(1)}MiB。`)
