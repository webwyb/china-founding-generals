import { useEffect, useState } from 'react'
import { Image } from '@tarojs/components'
import placeholder from '../assets/portrait-placeholder.svg'

/** Historical portraits always retain their whole source frame. */
export default function Portrait({ src, name, className = '', eager = false, onLoad }: { src: string; name: string; className?: string; eager?: boolean; onLoad?: (size: { width: number; height: number }) => void }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  const image = failed ? placeholder : src
  if (process.env.TARO_ENV !== 'h5') return <Image className={className} src={image} mode='aspectFit' lazyLoad={!eager} onError={() => setFailed(true)} />
  return <img className={className} src={image} alt={failed ? `${name}的历史肖像暂未加载` : `${name}历史肖像`} loading={eager ? 'eager' : 'lazy'} decoding='async' onLoad={event => { if (!failed) onLoad?.({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }) }} onError={() => setFailed(true)} />
}
