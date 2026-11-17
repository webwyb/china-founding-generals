import Taro from '@tarojs/taro'
import { publicPersonUrl } from './personLinks'
export { personMiniProgramPath } from './personLinks'
export async function copyPersonLink(id: string) {
  await Taro.setClipboardData({ data: publicPersonUrl(id) })
  return { message: '人物链接已复制' }
}
