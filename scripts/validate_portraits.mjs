import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url)), require = createRequire(import.meta.url)
// Static Skia rendering only. This check does not open a browser or local URL.
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas')
const { build } = require('esbuild')
await mkdir(resolve(root, '.cache/design-render'), { recursive: true })
await build({ entryPoints: [resolve(root, 'src/services/cardRenderer.ts')], bundle: true, platform: 'node', format: 'cjs', outfile: resolve(root, '.cache/design-render/portrait-check.cjs') })
const { drawMemorialCard } = require(resolve(root, '.cache/design-render/portrait-check.cjs'))
assert.ok(GlobalFonts.registerFromPath(resolve(root, 'src/assets/fonts/shanhe-serif.woff2'), 'Shanhe Serif'), '仓库内中文字体应成功加载')
const manifest = JSON.parse(await readFile(resolve(root, 'data/catalog/portraits.json'), 'utf8'))
const people = JSON.parse(await readFile(resolve(root, 'src/data/catalog.generated.json'), 'utf8'))
const regions = new Set(JSON.parse(await readFile(resolve(root, 'data/design/landscape-prompts.json'), 'utf8')).regions.map(region => region.province))
const portraits = Object.entries(manifest).map(([id, record]) => ({ id, ...record, file: resolve(root, 'public/portraits', record.file) }))
for (const file of await readdir(resolve(root, 'src/assets/portraits'))) if (file.endsWith('.jpg')) portraits.push({ id: file.slice(0, -4), file: resolve(root, 'src/assets/portraits', file) })
assert.equal(portraits.length, 1172)
const canvas = createCanvas(600, 900), context = canvas.getContext('2d')
const scenery = createCanvas(120, 80)
const originalDraw = context.drawImage.bind(context)
let currentPortrait, calls, compositions = 0
context.drawImage = (image, ...args) => { if (image === currentPortrait) calls.push(args); originalDraw(image, ...args) }

function check(person, image, theme) {
  currentPortrait = image; calls = []
  drawMemorialCard(context, person, image, scenery, theme)
  assert.equal(calls.length, 1, `${person.id}: 肖像应完整绘制一次`)
  const args = calls[0]
  assert.equal(args.length, 4, `${person.id}: 不应使用源图裁切`)
  const [x, y, width, height] = args
  const frame = theme === 'landscape' && regions.has(person.province) ? { x: 197, y: 201, width: 206, height: 256 } : { x: 174, y: 144, width: 252, height: 312 }
  assert.ok(x >= frame.x - 1e-7 && y >= frame.y - 1e-7 && x + width <= frame.x + frame.width + 1e-7 && y + height <= frame.y + frame.height + 1e-7, `${person.id}: 肖像超出画框`)
  assert.ok(Math.abs(width / height - image.width / image.height) < 1e-7, `${person.id}: 肖像比例被拉伸`)
  compositions++
  return { x, y, width, height }
}

let smallestSide = Infinity
const lowResolution = []
for (const portrait of portraits) {
  const image = await loadImage(portrait.file)
  if (portrait.width) { assert.equal(image.width, portrait.width); assert.equal(image.height, portrait.height) }
  smallestSide = Math.min(smallestSide, image.width, image.height)
  const person = people.find(item => item.id === portrait.id)
  assert.ok(person, `${portrait.id}缺少人物档案`)
  if (Math.min(image.width, image.height) < 200) lowResolution.push({ id: person.id, name: person.name, width: image.width, height: image.height, source: person.imageSource })
  for (const theme of ['landscape', 'portrait']) check(person, image, theme)
}

// Colored source corners must survive the entire production composition.
// Extreme ratios detect both cropping and any later overlay covering the source.
for (const [width, height] of [[80, 320], [320, 80], [200, 200]]) {
  const source = createCanvas(width, height), sourceContext = source.getContext('2d')
  sourceContext.fillStyle = '#ddd'; sourceContext.fillRect(0, 0, width, height)
  const corners = [[0, 0, '#ff0000', [255, 0, 0]], [width - 24, 0, '#00ff00', [0, 255, 0]], [0, height - 24, '#0000ff', [0, 0, 255]], [width - 24, height - 24, '#ff00ff', [255, 0, 255]]]
  for (const [x, y, color] of corners) { sourceContext.fillStyle = color; sourceContext.fillRect(x, y, 24, 24) }
  for (const theme of ['landscape', 'portrait']) {
    const target = check(people.find(person => person.id === 'suyu'), source, theme)
    for (const [x, y, , expected] of corners) {
      const sampleX = Math.round(target.x + (x + 12) * target.width / width)
      const sampleY = Math.round(target.y + (y + 12) * target.height / height)
      const pixel = Array.from(context.getImageData(sampleX, sampleY, 1, 1).data).slice(0, 3)
      assert.deepEqual(pixel, expected, `${theme} ${width}×${height} 源图边角被截断或遮挡`)
    }
  }
}
const report = { portraits: portraits.length, themes: 2, portraitCompositions: portraits.length * 2, extremeRatioCompositions: 6, compositions, clippingErrors: 0, distortionErrors: 0, originalsWithShortSideBelow200: lowResolution.length, lowResolutionOriginals: lowResolution, smallestOriginalSide: smallestSide, method: 'Decode local originals and run the production Canvas renderer; verify full-source draw bounds and rasterized source corners. No browser access.' }
await writeFile(resolve(root, 'data/design/portrait-layout-report.json'), JSON.stringify(report, null, 2) + '\n')
console.log(`肖像校验通过：${portraits.length}张原图×2样式，另加6个极端比例成图；无裁切、拉伸或边角遮挡。${lowResolution.length}张原图短边不足200像素，保留原始清晰度说明。`)
