import { BRAND_ICON } from './brand'
import Taro from '@tarojs/taro'
import { loadMiniFont } from './miniFont'
import { drawMemorialCard, type CardTheme } from './cardRenderer'
import { getProvinceLandscape } from '../data/landscapes'
import type { Person } from '../data/people'
// Canvas 2D uses the same painter as H5; the exported file is both preview and save source.
export async function renderMiniCard(person: Person, theme: CardTheme, canvas: Taro.Canvas): Promise<string> {
  canvas.width = 1200
  canvas.height = 1800
  const context = canvas.getContext('2d') as unknown as CanvasRenderingContext2D
  async function image(src: string): Promise<CanvasImageSource> {
    let local = src
    if (/^https:\/\//.test(src)) {
      // Download bytes first: getImageInfo rejects WebP landscapes in the
      // developer tool even when the Canvas image decoder can display them.
      const result = await Taro.downloadFile({ url: src })
      if (result.statusCode !== 200) throw Error('图片下载未完成，请检查网络后重试。')
      local = result.tempFilePath
    }
    return new Promise((resolve, reject) => {
      const bitmap = canvas.createImage()
      const timer = setTimeout(() => reject(Error('图片加载较慢，请检查网络后重试。')), 15000)
      bitmap.onload = () => { clearTimeout(timer); resolve(bitmap as unknown as CanvasImageSource) }
      bitmap.onerror = () => { clearTimeout(timer); reject(Error('图片未能加载，请重试。')) }
      bitmap.src = local
    })
  }
  const region = getProvinceLandscape(person.province)
  const [portrait, scenery, brandImage] = await Promise.all([image(person.portrait), theme === 'landscape' && region ? image(region.image) : Promise.resolve(null), image(BRAND_ICON)])
  await loadMiniFont()
  context.scale(2,2)
  drawMemorialCard(context, person, portrait, scenery, theme, brandImage)
  const file = await Taro.canvasToTempFilePath({ canvas, canvasId: 'mini-card', width: 1200, height: 1800, destWidth: 1200, destHeight: 1800, fileType: 'png' })
  return file.tempFilePath
}
export async function saveMiniCard(filePath: string): Promise<void> {
  try { await Taro.saveImageToPhotosAlbum({ filePath }) }
  catch (reason) {
    const message = String((reason as { errMsg?: string })?.errMsg || reason)
    if (/auth|denied|permission/i.test(message)) throw Error('相册权限未开启，请在小程序右上角设置中允许保存后重试。')
    if (/cancel/i.test(message)) throw Error('已取消保存，可以稍后再试。')
    throw Error('保存未完成，请检查相册空间后重试。')
  }
}
