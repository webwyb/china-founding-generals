import Taro from '@tarojs/taro'
import { renderMemorialCard } from './cardRenderer'
import { containImage } from './imageGeometry'
import { lifeYears } from '../data/historyLabels'

/** Keep the exporter independent from the catalogue so it works with future data sources. */
export interface ShareCardData {
  id: string
  name: string
  rank: string
  hometown: string
  birth: number | string | null
  death: number | string | null
  portrait: string
  tagline: string
  province?: string
  fieldNote?: string
  pendingFields?: string[]
}

export interface ShareResult {
  message: string
  imageUrl?: string
}

export const MEMORIAL_CANVAS_ID = 'memorial-canvas'
export const CANVAS_WIDTH = 600
export const CANVAS_HEIGHT = 900

const COLORS = {
  paper: '#f3eee3',
  ink: '#302d28',
  muted: '#71695e',
  line: '#d3c8b7',
  red: '#8c342c',
}

/** A small common drawing surface implemented by both browser and mini-program canvases. */
interface CardPainter {
  fill(color: string): void
  stroke(color: string): void
  lineWidth(width: number): void
  rect(x: number, y: number, width: number, height: number): void
  frame(x: number, y: number, width: number, height: number): void
  line(x1: number, y1: number, x2: number, y2: number): void
  font(size: number, family?: 'serif' | 'sans'): void
  align(value: 'left' | 'center' | 'right'): void
  text(value: string, x: number, y: number): void
  measure(value: string): number
  portrait(x: number, y: number, width: number, height: number): void
}

function wrapText(painter: CardPainter, value: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const character of Array.from(value.replace(/\s+/g, ' ').trim())) {
    if (line && painter.measure(line + character) > maxWidth) {
      lines.push(line)
      line = character
    } else {
      line += character
    }
  }
  if (line) lines.push(line)
  if (lines.length <= maxLines) return lines
  const result = lines.slice(0, maxLines)
  let last = result[maxLines - 1]
  while (last && painter.measure(last + '…') > maxWidth) last = last.slice(0, -1)
  result[maxLines - 1] = last.replace(/[，。；、：\s]+$/, '') + '…'
  return result
}

/** All positions use the same physical 600 × 900 coordinate system on both platforms. */
function paintCard(painter: CardPainter, person: ShareCardData): void {
  painter.fill(COLORS.paper)
  painter.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  painter.stroke(COLORS.line)
  painter.lineWidth(1)
  painter.frame(24, 24, 552, 852)

  painter.align('left')
  painter.fill(COLORS.ink)
  painter.font(25, 'serif')
  painter.text('山河有名', 48, 69)
  painter.fill(COLORS.muted)
  painter.font(12)
  painter.text('开国将帅纪念馆', 49, 93)

  painter.stroke(COLORS.red)
  painter.frame(500, 48, 48, 48)
  painter.fill(COLORS.red)
  painter.font(17, 'serif')
  painter.align('center')
  painter.text('铭记', 524, 79)

  painter.stroke(COLORS.line)
  painter.line(48, 115, 552, 115)
  painter.fill('#ded6c9')
  painter.rect(174, 142, 252, 310)
  painter.portrait(174, 142, 252, 310)
  painter.stroke(COLORS.line)
  painter.frame(168, 136, 264, 322)

  painter.align('center')
  painter.fill(COLORS.muted)
  painter.font(16)
  painter.text(person.rank, 300, 487)
  painter.fill(COLORS.ink)
  let nameSize = person.name.length > 4 ? 40 : 49
  painter.font(nameSize, 'serif')
  while (painter.measure(person.name) > 488 && nameSize > 22) painter.font(--nameSize, 'serif')
  painter.text(person.name, 300, 546)
  painter.font(18)
  painter.fill(COLORS.muted)
  painter.text(lifeYears(person), 300, 582)

  painter.font(16)
  const places = wrapText(painter, person.hometown, 440, 2)
  places.forEach((place, index) => painter.text(place, 300, 614 + index * 23))
  painter.stroke(COLORS.red)
  painter.lineWidth(2)
  painter.line(278, 657, 322, 657)

  painter.font(21, 'serif')
  painter.fill(COLORS.ink)
  wrapText(painter, person.tagline, 438, 3).forEach((line, index) => {
    painter.text(line, 300, 700 + index * 32)
  })

  painter.stroke(COLORS.line)
  painter.lineWidth(1)
  painter.line(48, 802, 552, 802)
  painter.font(16, 'serif')
  painter.fill(COLORS.ink)
  painter.text('记住一个名字，走近一段历史。', 300, 833)
  painter.font(11)
  painter.fill(COLORS.muted)
  painter.text('人物纪念卡 · 生平与史料出处请见人物页', 300, 856)
}

async function saveMiniProgramCard(person: ShareCardData): Promise<ShareResult> {
  // getImageInfo resolves bundled assets to a canvas-readable local path.
  const image = await Taro.getImageInfo({ src: person.portrait })
  const context = Taro.createCanvasContext(MEMORIAL_CANVAS_ID)
  const painter: CardPainter = {
    fill: (color) => context.setFillStyle(color),
    stroke: (color) => context.setStrokeStyle(color),
    lineWidth: (width) => context.setLineWidth(width),
    rect: (x, y, width, height) => context.fillRect(x, y, width, height),
    frame: (x, y, width, height) => context.strokeRect(x, y, width, height),
    line: (x1, y1, x2, y2) => {
      context.beginPath()
      context.moveTo(x1, y1)
      context.lineTo(x2, y2)
      context.stroke()
    },
    font: (size) => context.setFontSize(size),
    align: (value) => context.setTextAlign(value),
    text: (value, x, y) => context.fillText(value, x, y),
    measure: (value) => context.measureText(value).width,
    portrait: (x, y, width, height) => {
      const target = containImage(image, { x, y, width, height })
      context.drawImage(image.path, 0, 0, image.width, image.height, target.x, target.y, target.width, target.height)
    },
  }
  paintCard(painter, person)
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('纪念卡画布尚未准备好，请稍后重试。')), 10000)
    context.draw(false, () => { clearTimeout(timeout); resolve() })
  })
  const file = await Taro.canvasToTempFilePath({
    canvasId: MEMORIAL_CANVAS_ID,
    x: 0,
    y: 0,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    destWidth: CANVAS_WIDTH * 2,
    destHeight: CANVAS_HEIGHT * 2,
    fileType: 'png',
  })
  try {
    // Calling this after the user's save click lets WeChat request permission when needed.
    await Taro.saveImageToPhotosAlbum({ filePath: file.tempFilePath })
    return { message: '纪念卡已保存到相册。' }
  } catch (error) {
    const message = errorMessage(error)
    if (/auth|denied|authorize|permission/i.test(message)) {
      throw new Error('相册权限未开启。可在小程序右上角“设置”中允许保存，再点一次保存。')
    }
    if (/cancel/i.test(message)) throw new Error('已取消保存，可以稍后再试。')
    throw new Error('暂时无法保存到相册，请稍后再试。')
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'errMsg' in error) {
    return String((error as { errMsg: unknown }).errMsg)
  }
  return String(error)
}

/** Call only from an explicit save button. The function does not request permission on load. */
export async function saveMemorialCard(person: ShareCardData): Promise<ShareResult> {
  try {
    if (process.env.TARO_ENV === 'h5') return { imageUrl: await renderMemorialCard(person), message: '纪念卡已生成，可长按图片保存或下载PNG。' }
    if (process.env.TARO_ENV === 'weapp') return await saveMiniProgramCard(person)
    throw new Error('当前平台暂不支持保存纪念卡。')
  } catch (error) {
    const message = errorMessage(error)
    if (/肖像|浏览器|相册|取消|平台|暂时无法|画布/.test(message)) throw new Error(message)
    throw new Error('纪念卡暂未生成成功，请检查肖像是否加载完成后重试。')
  }
}

export function personMiniProgramPath(id: string): string {
  return `/pages/person/index?id=${encodeURIComponent(id)}`
}

async function browserCopy(value: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value)
      return
    } catch {
      // Some embedded browsers disable Clipboard API even in a secure context.
    }
  }
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  const previous = document.activeElement as HTMLElement | null
  document.body.appendChild(textarea)
  let copied = false
  try {
    textarea.select()
    textarea.setSelectionRange(0, value.length)
    copied = document.execCommand('copy')
  } finally {
    textarea.remove()
    previous?.focus({ preventScroll: true })
  }
  if (!copied) throw new Error('浏览器未允许复制，请从地址栏复制人物页链接。')
}

/** H5 uses the configured hash router; mini-program paths stay inside WeChat. */
export async function copyPersonLink(id: string): Promise<ShareResult> {
  if (process.env.TARO_ENV === 'h5') {
    const url = new URL(window.location.href)
    url.hash = personMiniProgramPath(id)
    await browserCopy(url.href)
    const localHost = /^(localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|\[?::1\]?|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})$/.test(url.hostname)
    return {
      message: localHost
        ? '已复制本地预览链接，仅供当前电脑或可访问该地址的设备使用。'
        : '人物页链接已复制，可以粘贴分享。',
    }
  }
  if (process.env.TARO_ENV === 'weapp') {
    await Taro.setClipboardData({ data: personMiniProgramPath(id) })
    return { message: '已复制小程序页面路径。分享给朋友请使用“转发人物”按钮。' }
  }
  throw new Error('当前平台暂不支持复制人物页。')
}
