import type { PropsWithChildren } from 'react'
import { Button as TaroButton } from '@tarojs/components'

type ButtonProps = PropsWithChildren<{
  className?: string
  href?: string
  onClick?: (event: { stopPropagation(): void }) => unknown
  disabled?: boolean
  loading?: boolean
  openType?: 'share'
  'aria-label'?: string
  'aria-pressed'?: boolean
  'aria-expanded'?: boolean
  'aria-controls'?: string
  'aria-current'?: 'page'
}>

/** Browser buttons retain native keyboard, focus, and accessibility behavior. */
export default function Button(props: ButtonProps) {
  if (process.env.TARO_ENV === 'h5') {
    if (props.href && !props.disabled && !props.loading) return <a
      href={props.href}
      className={`ui-button ${props.className || ''} h5-button`}
      aria-label={props['aria-label']}
      aria-current={props['aria-current']}
      onClick={event => {
        if (!props.onClick || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        void props.onClick(event)
      }}
    >{props.children}</a>
    return <button
      type='button'
      className={`ui-button ${props.className || ''} h5-button`}
      disabled={props.disabled || props.loading}
      aria-label={props['aria-label']}
      aria-pressed={props['aria-pressed']}
      aria-expanded={props['aria-expanded']}
      aria-controls={props['aria-controls']}
      aria-current={props['aria-current']}
      aria-busy={props.loading || undefined}
      onClick={event => { void props.onClick?.(event) }}
    >{props.children}</button>
  }
  return <TaroButton {...props} className={`ui-button ${props.className || ''}`} onClick={event => { void props.onClick?.(event) }} />
}
