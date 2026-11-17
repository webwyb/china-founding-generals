import { useEffect, useState } from 'react'
import { Image } from '@tarojs/components'
export default function Portrait({ src, className = '', eager = false, onLoad }: { src: string; name: string; className?: string; eager?: boolean; onLoad?: (size: { width: number; height: number }) => void }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  return <Image className={className} src={failed ? '/static/portrait-placeholder.png' : src} mode='aspectFit' lazyLoad={!eager} onError={() => setFailed(true)} onLoad={event => { if (!failed) onLoad?.({ width: Number(event.detail.width), height: Number(event.detail.height) }) }}/>
}
