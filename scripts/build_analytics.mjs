import { build } from 'esbuild'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const output = resolve(root, 'dist/h5')
// A separate entry covers static reference pages and keeps the SDK out of
// Taro's eager vendors chunk. The import occurs only after the privacy gate.
const result = await build({
  absWorkingDir: root,
  entryPoints: ['src/analytics/bootstrap.ts'],
  outdir: resolve(output, 'js'),
  entryNames: 'analytics.[hash]',
  chunkNames: 'analytics-dependency.[hash]',
  bundle: true, splitting: true, format: 'esm', platform: 'browser', target: 'es2017',
  minify: true, metafile: true, legalComments: 'eof',
  define: { 'process.env.TARO_ENV': '"h5"' },
})
const files = result.metafile.outputs
const entry = Object.keys(files).find(path => files[path].entryPoint === 'src/analytics/bootstrap.ts')
if (!entry) throw Error('Missing analytics bootstrap output')
const sdkFiles = new Set(Object.keys(files).filter(path => Object.keys(files[path].inputs)
  .some(input => /node_modules\/(aegis-web-sdk|web-vitals)\//.test(input.replace(/\\/g, '/')))))
if (!sdkFiles.size) throw Error('Missing pinned Aegis SDK output')
const visited = new Set()
function visit(path) {
  if (visited.has(path)) return
  visited.add(path)
  if (sdkFiles.has(path)) throw Error('Analytics SDK entered the initial static dependency graph')
  for (const item of files[path]?.imports || []) if (!item.external && item.kind !== 'dynamic-import') visit(item.path)
}
visit(entry)
const url = '/' + relative(output, resolve(root, entry)).replace(/\\/g, '/')
const htmlPath = resolve(output, 'index.html')
const html = await readFile(htmlPath, 'utf8')
if (html.includes('data-shanhe-analytics')) throw Error('Analytics entry already injected; build a fresh H5 shell')
await writeFile(htmlPath, html.replace('</head>', `<script type="module" data-shanhe-analytics src="${url}"></script></head>`))
await mkdir(resolve(root, '.cache/analytics-check'), { recursive: true })
await writeFile(resolve(root, '.cache/analytics-check/bundle.json'), JSON.stringify({ entry: url,
  entryBytes: files[entry].bytes, sdkFiles: [...sdkFiles], sdkStaticallyReachable: false }, null, 2) + '\n')
console.log(`Analytics bootstrap ${files[entry].bytes} bytes; SDK verified behind dynamic import.`)
