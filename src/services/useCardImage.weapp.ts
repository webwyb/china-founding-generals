import { useEffect, useState } from 'react'
import Taro, { useReady } from '@tarojs/taro'
import { renderMiniCard } from './miniCard'
import type { CardTheme } from './cardRenderer'
import type { Person } from '../data/people'
export function useCardImage(person: Person | undefined, theme: CardTheme, retry: number) {
  const [canvas, setCanvas] = useState<Taro.Canvas>()
  const [image, setImage] = useState({ busy: true, preview: '', error: '' })
  useReady(() => { Taro.createSelectorQuery().select('#mini-card').fields({ node: true, size: true }).exec(result => {
    if (result[0]?.node) setCanvas(result[0].node as Taro.Canvas)
    else setImage({ busy: false, preview: '', error: '画布未就绪，请返回后重新打开。' })
  }) })
  useEffect(() => {
    if (!person || !canvas) return
    let active = true
    setImage({ busy: true, preview: '', error: '' })
    renderMiniCard(person, theme, canvas).then(preview => { if (active) setImage({ busy: false, preview, error: '' }) }).catch(reason => { if (active) setImage({ busy: false, preview: '', error: reason instanceof Error ? reason.message : String(reason?.errMsg || '生成未完成，请重试。') }) })
    return () => { active = false }
  }, [person?.id, canvas, theme, retry])
  return image
}
