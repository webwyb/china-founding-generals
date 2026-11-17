import { getProvinceLandscape } from '../data/landscapes'
import type { ShareCardData } from './share'
import { containImage } from './imageGeometry'
import { lifeYears } from '../data/historyLabels'
import { drawCardQrCode } from './cardQrCode'
import { PUBLIC_SITE_HOST } from './personLinks'
import { AI_LANDSCAPE_LABEL } from './compliance'

export type CardTheme = 'landscape' | 'portrait'
export const CARD_WIDTH = 600
export const CARD_HEIGHT = 900
const palette = { paper: '#f5f7f2', ink: '#203d43', muted: '#657770', red: '#a23f32', line: '#d6dfd7' }

function font(context: CanvasRenderingContext2D, size: number, serif = false, weight = 400) {
  context.font = `${weight} ${size}px ${serif ? '"Shanhe Serif", "Songti SC", "SimSun", serif' : '"PingFang SC", "Microsoft YaHei", sans-serif'}`
}
function lines(context: CanvasRenderingContext2D, value: string, width: number, maxLines: number) {
  const result: string[] = []
  let current = ''
  for (const character of Array.from(value.replace(/\s+/g, ' ').trim())) {
    if (current && context.measureText(current + character).width > width) { result.push(current); current = character }
    else current += character
  }
  if (current) result.push(current)
  if (result.length <= maxLines) return result
  const visible = result.slice(0, maxLines)
  let last = visible[maxLines - 1]
  while (last && context.measureText(last + '…').width > width) last = Array.from(last).slice(0, -1).join('')
  visible[maxLines - 1] = last.replace(/[，。；、\s]+$/, '') + '…'
  return visible
}
function imageSize(image: CanvasImageSource): { width: number; height: number } {
  const source = image as HTMLImageElement
  return { width: source.naturalWidth || Number(source.width), height: source.naturalHeight || Number(source.height) }
}
function cover(context: CanvasRenderingContext2D, image: CanvasImageSource, x: number, y: number, width: number, height: number, vertical = .5) {
  const source = imageSize(image)
  const scale = Math.max(width / source.width, height / source.height)
  const cropWidth = width / scale, cropHeight = height / scale
  context.drawImage(image, (source.width - cropWidth) / 2, (source.height - cropHeight) * vertical, cropWidth, cropHeight, x, y, width, height)
}

function fullPortrait(context: CanvasRenderingContext2D, image: CanvasImageSource, x: number, y: number, width: number, height: number) {
  const target = containImage(imageSize(image), { x, y, width, height })
  context.save()
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, target.x, target.y, target.width, target.height)
  context.restore()
}

/** A single composition powers the on-page preview and the downloaded PNG. */
export function drawMemorialCard(context: CanvasRenderingContext2D, person: ShareCardData, portrait: CanvasImageSource, scenery: CanvasImageSource | null, theme: CardTheme = 'landscape') {
  const region = getProvinceLandscape(person.province)
  const scenic = theme === 'landscape' && scenery && region
  context.fillStyle = palette.paper
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)
  context.strokeStyle = palette.line
  context.lineWidth = 1
  context.strokeRect(22.5, 22.5, 555, 855)
  context.textBaseline = 'alphabetic'
  context.fillStyle = palette.ink
  context.textAlign = 'left'
  font(context, 25, true, 600)
  context.fillText('山河有名', 46, 69)
  context.fillStyle = palette.muted
  font(context, 11)
  context.fillText('开国将帅纪念馆', 47, 91)
  context.strokeStyle = palette.red
  context.strokeRect(509.5, 45.5, 42, 48)
  context.textAlign = 'center'
  context.fillStyle = palette.red
  font(context, 15, true, 500)
  context.fillText('铭记', 531, 65)
  context.fillText('来路', 531, 84)

  if (scenic) {
    cover(context, scenery, 24, 116, 552, 278, .45)
    const veil = context.createLinearGradient(24, 116, 24, 210)
    veil.addColorStop(0, 'rgba(245,247,242,.76)')
    veil.addColorStop(1, 'rgba(245,247,242,0)')
    context.fillStyle = veil
    context.fillRect(24, 116, 552, 100)
    context.textAlign = 'left'
    context.fillStyle = palette.ink
    font(context, 16, true, 500)
    context.fillText(`${region.province} · ${region.landmark}`, 46, 149)
    // Included in the shared bitmap, so downloaded and re-shared cards keep it.
    font(context, 12)
    const aiWidth = context.measureText(AI_LANDSCAPE_LABEL).width + 20
    context.fillStyle = palette.paper
    context.fillRect(560 - aiWidth, 362, aiWidth, 23)
    context.fillStyle = palette.ink
    context.fillText(AI_LANDSCAPE_LABEL, 570 - aiWidth, 378)
    context.fillStyle = palette.paper
    context.fillRect(188, 192, 224, 274)
    context.save()
    fullPortrait(context, portrait, 197, 201, 206, 256)
    context.restore()
  } else {
    context.strokeStyle = palette.line
    context.beginPath(); context.moveTo(46, 115); context.lineTo(554, 115); context.stroke()
    context.fillStyle = '#e3e8df'
    context.fillRect(166, 136, 268, 328)
    context.save()
    fullPortrait(context, portrait, 174, 144, 252, 312)
    context.restore()
  }
  context.textAlign = 'center'
  context.fillStyle = palette.ink
  let nameSize = Array.from(person.name).length > 4 ? 38 : 48
  font(context, nameSize, true, 600)
  while (context.measureText(person.name).width > 492 && nameSize > 20) font(context, --nameSize, true, 600)
  context.fillText(person.name, 300, 527)
  context.fillStyle = palette.red
  font(context, 14, true, 500)
  context.fillText(person.rank, 300, 559)
  context.fillStyle = palette.muted
  font(context, 17)
  context.fillText(lifeYears(person), 300, 594)
  font(context, 14)
  lines(context, person.hometown, 470, 2).forEach((line, index) => context.fillText(line, 300, 626 + index * 22))
  context.strokeStyle = palette.red
  context.lineWidth = 1.5
  context.beginPath(); context.moveTo(283, 671); context.lineTo(317, 671); context.stroke()
  context.fillStyle = palette.ink
  font(context, 21, true, 500)
  lines(context, person.tagline, 460, 2).forEach((line, index) => context.fillText(line, 300, 711 + index * 32))
  context.strokeStyle = palette.line
  context.lineWidth = 1
  context.beginPath(); context.moveTo(46, 770); context.lineTo(554, 770); context.stroke()
  context.textAlign = 'left'
  context.fillStyle = palette.ink
  font(context, 16, true, 500)
  context.fillText('我想让你记住这个名字。', 46, 805)
  context.fillStyle = palette.muted
  font(context, 12)
  context.fillText('扫码阅读完整生平', 46, 829)
  font(context, 10)
  context.fillText(PUBLIC_SITE_HOST, 46, 848)
  context.fillText(person.pendingFields?.length ? '部分资料尚待核实，详见人物页说明' : '生平与历史肖像出处，详见人物档案', 46, 866)
  drawCardQrCode(context, person.id)
}

const imageCache = new Map<string, Promise<HTMLImageElement>>()
function loadImage(src: string, label: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src)
  if (cached) return cached
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    const timer = window.setTimeout(() => { imageCache.delete(src); reject(new Error(`${label}加载较慢，请重试。`)) }, 15000)
    image.onload = () => { clearTimeout(timer); resolve(image) }
    image.onerror = () => { clearTimeout(timer); imageCache.delete(src); reject(new Error(`${label}未能加载，请重试。`)) }
    image.crossOrigin = 'anonymous'
    image.src = src
  })
  imageCache.set(src, promise)
  if (imageCache.size > 16) imageCache.delete(imageCache.keys().next().value!)
  return promise
}

export async function renderMemorialCard(person: ShareCardData, theme: CardTheme = 'landscape'): Promise<string> {
  const region = getProvinceLandscape(person.province)
  const [portrait, scenery] = await Promise.all([loadImage(person.portrait, '历史肖像'), theme === 'landscape' && region ? loadImage(region.image, '家乡景观') : Promise.resolve(null)])
  if (document.fonts) await Promise.race([Promise.all([document.fonts.load('600 48px "Shanhe Serif"', person.name), document.fonts.load('500 21px "Shanhe Serif"', person.tagline)]).catch(() => undefined), new Promise(resolve => setTimeout(resolve, 5000))])
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH * 2
  canvas.height = CARD_HEIGHT * 2
  const context = canvas.getContext('2d')
  if (!context) throw new Error('当前浏览器暂不支持生成纪念卡。')
  context.scale(2, 2)
  drawMemorialCard(context, person, portrait, scenery, theme)
  return canvas.toDataURL('image/png')
}
