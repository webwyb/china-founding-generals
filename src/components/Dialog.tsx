import { useEffect, useRef, type PropsWithChildren } from 'react'
import { View } from '@tarojs/components'

export default function Dialog({ children, onClose, titleId, className = '' }: PropsWithChildren<{ onClose: () => void; titleId: string; className?: string }>) {
  const panel = useRef<HTMLElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    if (process.env.TARO_ENV !== 'h5') return
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    const page = panel.current?.closest<HTMLElement>('.taro_page')
    const pageOverflow = page?.style.overflow || ''
    document.body.style.overflow = 'hidden'
    if (page) page.style.overflow = 'hidden'
    panel.current?.focus({ preventScroll: true })
    const background = Array.from(document.querySelectorAll<HTMLElement>('.taro_page')).filter(item => item !== page)
    const siblings: HTMLElement[] = []
    let branch: HTMLElement | null = panel.current?.parentElement || null
    while (branch && !branch.classList.contains('taro_page')) {
      siblings.push(...Array.from(branch.parentElement?.children || []).filter((item): item is HTMLElement => item instanceof HTMLElement && item !== branch))
      branch = branch.parentElement
      if (branch?.classList.contains('app-shell')) break
    }
    const inertElements = [...background, ...siblings].map(item => ({ item, inert: item.inert }))
    inertElements.forEach(({ item }) => { item.inert = true })
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); return }
      if (event.key !== 'Tab' || !panel.current) return
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,select,textarea,[tabindex="0"]')).filter(item => item.getClientRects().length > 0)
      const first = items[0], last = items[items.length - 1]
      if (!first) { event.preventDefault(); panel.current.focus(); return }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => {
      document.removeEventListener('keydown', keydown)
      inertElements.forEach(({ item, inert }) => { item.inert = inert })
      document.body.style.overflow = overflow
      if (page) page.style.overflow = pageOverflow
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [])
  if (process.env.TARO_ENV !== 'h5') return <View className='modal-scrim' onClick={onClose}><View className={className} onClick={event => event.stopPropagation()}>{children}</View></View>
  return <div className='modal-scrim' onClick={onClose}><section ref={panel} className={className} role='dialog' aria-modal='true' aria-labelledby={titleId} tabIndex={-1} onClick={event => event.stopPropagation()}>{children}</section></div>
}
