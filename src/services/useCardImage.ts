import { useEffect, useState } from 'react'
import { renderMemorialCard, type CardTheme } from './cardRenderer'
import type { Person } from '../data/people'
export function useCardImage(person: Person | undefined, theme: CardTheme, retry: number) {
  const [image, setImage] = useState({ busy: true, preview: '', error: '' })
  useEffect(() => {
    if (!person) return
    let active = true
    setImage({ busy: true, preview: '', error: '' })
    renderMemorialCard(person, theme).then(preview => { if (active) setImage({ busy: false, preview, error: '' }) }).catch(reason => { if (active) setImage({ busy: false, preview: '', error: reason instanceof Error ? reason.message : '纪念卡未能生成，请重试。' }) })
    return () => { active = false }
  }, [person?.id, theme, retry])
  return image
}
