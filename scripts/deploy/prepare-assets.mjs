import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, extname } from 'node:path'
const { files, manifest } = createRequire(import.meta.url)('./asset-manifest.cjs')
const base = process.env.SHANHE_ASSET_BASE_URL
if (!base) throw Error('SHANHE_ASSET_BASE_URL is required for production packaging')
const root = resolve('dist/h5')
const assets = manifest(resolve(root, 'static'), base)
const urls = new Map(assets.map(asset => [asset.path, asset.url]))
const { origin } = JSON.parse(readFileSync(new URL('../../config/site.json', import.meta.url), 'utf8'))
const escapedOrigin = origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
for (const path of files(root)) {
  if (!['.html', '.js', '.css'].includes(extname(path)) || path.startsWith('static/')) continue
  const file = resolve(root, path)
  const before = readFileSync(file, 'utf8')
  const replaceAsset = (match, key) => urls.get(key) || match
  // SEO image metadata contains absolute site URLs. Replace the entire URL,
  // then handle local references without matching another host's /static/ path.
  const after = before.replace(new RegExp(`${escapedOrigin}/static/([A-Za-z0-9_.\\/-]+)`, 'g'), replaceAsset)
    .replace(/(?<![A-Za-z0-9:/.-])(?:\.\.\/|\.\/|\/)static\/([A-Za-z0-9_.\/-]+)/g, replaceAsset)
  writeFileSync(file, after)
}
writeFileSync('release-assets.json', JSON.stringify(assets, null, 2) + '\n')
console.log(`Prepared ${assets.length} immutable COS assets (${(assets.reduce((sum, item) => sum + item.size, 0) / 1024**2).toFixed(1)} MiB).`)
