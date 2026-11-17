import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { basename, resolve } from 'node:path'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const require = createRequire(import.meta.url)
export const root = fileURLToPath(new URL('..', import.meta.url))
const { manifest } = require('./deploy/asset-manifest.cjs')

/** Render the actual React pages at build time, using native HTML for Taro
 * primitives. No browser, network, storage state, or source-page cache needed. */
export async function loadSeoRenderer() {
  const assetUrls = Object.fromEntries(manifest(resolve(root,'public'),process.env.SHANHE_ASSET_BASE_URL || '').map(asset=>[asset.path,asset.url]))
  const outfile = resolve(root,'.cache/seo/renderer.cjs')
  await build({
    entryPoints:[resolve(root,'src/seo/render.tsx')], outfile, bundle:true, platform:'node', format:'cjs', jsx:'automatic',
    packages:'external', define:{'process.env.TARO_ENV':'"h5"',__SHANHE_ASSET_URLS__:JSON.stringify(assetUrls)},
    plugins:[{ name:'static-html-adapters',setup(builder){
      builder.onResolve({filter:/^@tarojs\/taro$/},()=>({path:'taro',namespace:'ssg'}))
      builder.onResolve({filter:/^@tarojs\/components$/},()=>({path:'components',namespace:'ssg'}))
      builder.onLoad({filter:/.*/,namespace:'ssg'},args=>({loader:'js',resolveDir:root,contents:args.path==='taro'
        ? `export const useDidShow=()=>{},useShareAppMessage=()=>{},useRouter=()=>({params:Object.fromEntries(new URLSearchParams(window.location.search))}); export default {getStorageSync(){},setStorageSync(){}};`
        : `import React from 'react'; export const View=({children,...props})=>React.createElement('div',props,children),Text=({children,...props})=>React.createElement('span',props,children),Button=()=>null,Input=()=>null,Canvas=()=>null,Image=()=>null;`}))
      builder.onResolve({filter:/\.(jpg|svg)$/},args=>({path:resolve(args.resolveDir,args.path),namespace:'ssg-image'}))
      builder.onLoad({filter:/.*/,namespace:'ssg-image'},async args=>{
        const url=args.path.endsWith('.svg') ? `data:image/svg+xml;base64,${(await readFile(args.path)).toString('base64')}` : `/static/images/${basename(args.path)}`
        return {contents:`export default ${JSON.stringify(url)}`,loader:'js'}
      })
    }}]
  })
  return require(outfile)
}
