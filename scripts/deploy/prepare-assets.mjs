import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, extname } from 'node:path'
const { files, manifest } = createRequire(import.meta.url)('./asset-manifest.cjs')
const base = process.env.SHANHE_ASSET_BASE_URL
if (!base) throw Error('SHANHE_ASSET_BASE_URL is required for production packaging')
const root = resolve('dist/h5')
const assets = manifest(resolve(root, 'static'), base)
const urls = new Map(assets.map(asset => [asset.path, asset.url]))
for (const path of files(root)) {
  if (!['.html', '.js', '.css'].includes(extname(path)) || path.startsWith('static/')) continue
  const file = resolve(root, path)
  const before = readFileSync(file, 'utf8')
  const after = before.replace(/(?:\.\.\/|\.\/|\/)static\/([A-Za-z0-9_.\/-]+)/g,
    (match, key) => urls.get(key) || match)
  writeFileSync(file, after)
}
writeFileSync('release-assets.json', JSON.stringify(assets, null, 2) + '\n')
console.log(`Prepared ${assets.length} immutable COS assets (${(assets.reduce((sum, item) => sum + item.size, 0) / 1024**2).toFixed(1)} MiB).`)
