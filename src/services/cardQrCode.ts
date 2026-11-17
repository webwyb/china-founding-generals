import qrcode from 'qrcode-generator'
import { publicPersonUrl } from './personLinks'

// Keep four full white modules around the code. Coordinates are logical pixels;
// the shared card renderer exports at 2×, giving each module four PNG pixels.
const QUIET_MODULES = 4
const MODULE_SIZE = 2
const codes = new Map<string, ReturnType<typeof qrcode>>()

export function cardQrCode(personId: string) {
  const url = publicPersonUrl(personId)
  let code = codes.get(url)
  if (!code) {
    code = qrcode(0, 'Q')
    code.addData(url, 'Byte')
    code.make()
    codes.set(url, code)
    if (codes.size > 16) codes.delete(codes.keys().next().value!)
  }
  const modules = code.getModuleCount()
  const size = (modules + QUIET_MODULES * 2) * MODULE_SIZE
  if (size > 100) throw new Error('人物链接过长，暂不能生成清晰的纪念卡二维码。')
  return { code, url, modules, size, x: 554 - size, y: 874 - size }
}

export function drawCardQrCode(context: CanvasRenderingContext2D, personId: string) {
  const qr = cardQrCode(personId)
  context.save()
  context.fillStyle = '#ffffff'
  context.fillRect(qr.x, qr.y, qr.size, qr.size)
  context.fillStyle = '#203d43'
  for (let row = 0; row < qr.modules; row++) for (let col = 0; col < qr.modules; col++) {
    if (qr.code.isDark(row, col)) context.fillRect(qr.x + (col + QUIET_MODULES) * MODULE_SIZE, qr.y + (row + QUIET_MODULES) * MODULE_SIZE, MODULE_SIZE, MODULE_SIZE)
  }
  context.restore()
}
