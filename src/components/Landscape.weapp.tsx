import { Image } from '@tarojs/components'
import type { ProvinceLandscape } from '../data/landscapes'
export default function Landscape({ landscape, className = '', eager = false }: { landscape: ProvinceLandscape; className?: string; eager?: boolean }) {
  return <Image className={`landscape-image ${className}`} src={landscape.image} mode='aspectFill' lazyLoad={!eager}/>
}
