import { Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
export default function CardPreview({ src }: { src: string; name: string }) {
  return <Image className='live-card-preview' src={src} mode='widthFix' onClick={() => Taro.previewImage({ urls: [src] })}/>
}
