/** Semantic HTML at the web boundary; native Taro components on WeChat.
 * Pages keep one tree, while browser-only semantics stay in Html.tsx. */
import { createContext, forwardRef, useContext, useState, type PropsWithChildren } from 'react'
import { View, Text } from '@tarojs/components'
import Button from './Button'
import Taro from '@tarojs/taro'
import type { HTMLAttributes, AnchorHTMLAttributes } from 'react'
import { siteCompliance } from '../services/compliance'
type Props = PropsWithChildren<HTMLAttributes<HTMLElement>>
function block(tag: string) {
  return forwardRef<HTMLElement, Props>(function NativeBlock({ children, className = '', id, style, onClick }, _ref) {
    return <View id={id} style={style} className={`html-${tag} h5-${tag} ${className}`} onClick={onClick as never}>{children}</View>
  })
}
export const Box = block('div'), Heading = block('h1'), Heading2 = block('h2'), Heading3 = block('h3'), Paragraph = block('p'), Nav = block('nav'), Main = block('main'), Section = block('section'), Fieldset = block('fieldset'), Legend = block('legend')
export function Inline({ children, className, style }: Props) { return <Text className={className} style={style}>{children}</Text> }
export function Link({ children, href = '', className = '', onClick }: PropsWithChildren<AnchorHTMLAttributes<HTMLAnchorElement>>) {
  return <Button className={`html-a ${className}`} onClick={event => {
    if (onClick) { onClick(event as never); return }
    if (href.startsWith('/about/')) { void Taro.navigateTo({ url: '/pages/about/index' }); return }
    if (href === '/people/' || href === '/generals/') { void Taro.reLaunch({ url: '/pages/explore/index' }); return }
    const data = href.startsWith('mailto:') ? siteCompliance.feedbackEmail || href.slice(7).split('?')[0] : href
    void Taro.setClipboardData({ data }).then(() => Taro.showToast({ title: href.startsWith('mailto:') ? '反馈邮箱已复制' : '链接已复制，可在浏览器查阅', icon: 'none' })).catch(() => Taro.showToast({ title: '复制未完成，请重试', icon: 'none' }))
  }}>{children}</Button>
}
const DisclosureContext = createContext({ open: false, toggle: () => {} })
export function Disclosure({ children, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  return <DisclosureContext.Provider value={{ open, toggle: () => setOpen(value => !value) }}><View className={`${className} ${open ? 'is-open' : 'is-closed'}`}>{children}</View></DisclosureContext.Provider>
}
export function Summary({ children, className, id }: Props) {
  const disclosure = useContext(DisclosureContext)
  return <View id={id} className='native-summary'><Button className={className} aria-expanded={disclosure.open} onClick={disclosure.toggle}>{children}</Button></View>
}
