import Taro from '@tarojs/taro'
let pending: Promise<void> | undefined
export function loadMiniFont(): Promise<void> {
  if (!pending) pending = Taro.loadFontFace({ family: 'Shanhe Serif', source: `url("${__SHANHE_MINI_FONT__}")`, global: true })
    .then(() => undefined).catch(() => { pending = undefined })
  // A font download must never block reading or card generation indefinitely.
  return Promise.race([pending, new Promise<void>(resolve => setTimeout(resolve, 4000))])
}
