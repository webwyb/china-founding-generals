import { useEffect, useState, type PropsWithChildren } from 'react'
import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import Button from './Button'
import { catalogueStats } from '../data/people'
import Dialog from './Dialog'
import Icon from './Icon'
import { pageHref } from '../services/personLinks'

const logicalRoute = (route = '') => route.startsWith('/people/') ? 'pages/person/index' : route.replace(/^\//, '').replace(/^generals\/?$/, 'pages/explore/index').replace(/^card\/?$/, 'pages/card/index')

export function openPage(page: 'index' | 'explore' | 'person' | 'card', query = '') {
  const url = process.env.TARO_ENV === 'h5' ? pageHref(page, query) : `/pages/${page}/index${query ? `?${query}` : ''}`
  const pages = Taro.getCurrentPages()
  if (page === 'index' || page === 'explore') return Taro.reLaunch({ url })
  // Replacing a sibling profile, or navigating near the native stack limit,
  // keeps repeated browsing working within WeChat's page-stack constraints.
  const route = logicalRoute(pages[pages.length - 1]?.route)
  if (route === `pages/${page}/index` || pages.length >= 8) return Taro.redirectTo({ url })
  return Taro.navigateTo({ url })
}

/** Preserve the catalogue's filters when returning from a profile or card.
 * Direct links have no previous page, so replace with a safe destination. */
export function returnTo(page: 'explore' | 'person', query = '') {
  const route = `pages/${page}/index`
  // Embedded H5 browsers may not traverse history for a background page.
  // A card has an exact parent profile URL, so replace it directly.
  if (process.env.TARO_ENV === 'h5' && page === 'person') {
    return Taro.redirectTo({ url: pageHref(page, query) })
  }
  const pages = Taro.getCurrentPages()
  const normalize = logicalRoute
  if (!query && normalize(pages[pages.length - 1]?.route) === route) return Promise.resolve()
  for (let index = pages.length - 2; index >= 0; index--) {
    if (normalize(pages[index].route) === route) return Taro.navigateBack({ delta: pages.length - 1 - index })
  }
  return Taro.redirectTo({ url: process.env.TARO_ENV === 'h5' ? pageHref(page, query) : `/${route}${query ? `?${query}` : ''}` })
}

export function openSource(url: string) {
  if (process.env.TARO_ENV === 'h5') {
    window.open(url, '_blank', 'noopener,noreferrer')
  } else {
    Taro.setClipboardData({ data: url }).then(() => Taro.showToast({ title: '来源链接已复制，可在浏览器查阅', icon: 'none' }))
  }
}

function About({ close }: { close: () => void }) {
  return <Dialog className='about-dialog' onClose={close} titleId='about-title'>
      <Button className='close-button' aria-label='关闭说明' onClick={close}><Icon name='close' /></Button>
      <Text className='eyebrow'>关于这份纪念</Text>
      <Text id='about-title' className='dialog-title serif'>让记忆，有来处。</Text>
      <Text className='about-paragraph'>山河有名是一份面向公众的数字纪念作品。我们希望从一张面孔、一个名字、一件真实的往事，走近开国将帅的人生。</Text>
      <Text className='about-paragraph'>完整姓名名录已收录 {catalogueStats.total.toLocaleString()} 位开国将帅。人物页保留资料来源，缺项标注“待补”；来源冲突且尚未核定的年份显示“待核实”，时间轴和纪念卡同步处理；肖像缺失使用统一占位图。</Text>
      <Text className='about-paragraph'>当前已有 {catalogueStats.portraits.toLocaleString()} 位人物的肖像、{catalogueStats.biographies.toLocaleString()} 位人物的生平资料。重名人物以独立档案收录；籍贯保留来源记载，不混同历史与现行政区划。</Text>
      {catalogueStats.pendingPeople > 0 && <Text className='about-paragraph'>尚有 {catalogueStats.pendingPeople} 位人物的部分资料存在记载差异，已标明“待核实”并保留出处。未确定的地域暂不配省份景观。</Text>}
      <Text className='about-paragraph'>各省份景观为中国风山河意象绘制，人物肖像来自历史影像。你可以选择“家乡山河”或“素笺肖像”两种纪念卡，把这个名字继续传递。</Text>
      <Text className='about-paragraph'>“1614位开国将帅”采用《学习时报》在中国共产党新闻网刊载文章的统计口径，包括元帅及不同军衔的将领。元帅为10位。</Text>
      <Button className='text-link source-button' onClick={() => openSource('https://cpc.people.com.cn/n1/2023/0424/c443712-32671924.html')}>查阅统计口径<Icon name='external' /></Button>
      <Text className='about-note'>历史影像用于原型研究与纪念展示。正式发布前需完成全量资料复核及影像使用核验。本项目不代表资料来源机构。</Text>
  </Dialog>
}

export default function Shell({ children, active = 'index', fixedActions = false }: PropsWithChildren<{ active?: string; fixedActions?: boolean }>) {
  const [about, setAbout] = useState(false)
  const home = () => openPage('index')
  useEffect(() => { if (process.env.TARO_ENV === 'h5') document.getElementById('prerender')?.remove() }, [])
  let statusBarHeight = 24
  if (process.env.TARO_ENV === 'weapp') {
    try { statusBarHeight = Taro.getWindowInfo().statusBarHeight || 24 } catch { /* Keep a safe default on older clients. */ }
  }
  return <View className={`app-shell platform-${process.env.TARO_ENV}${fixedActions ? ' has-fixed-actions' : ''}`}>
    <View className='site-header' style={process.env.TARO_ENV === 'weapp' ? { paddingTop: `${statusBarHeight}px` } : undefined}>
      <View className='header-inner'>
        <Button href='/' className='brand' onClick={home} aria-label='山河有名首页'>
          <View className='brand-seal'><Text>山河</Text><Text>有名</Text></View>
          <View className='brand-wordmark'><Text className='brand-title serif'>山河有名</Text><Text className='brand-subtitle'>开国将帅纪念馆</Text></View>
        </Button>
        <View className='header-nav'>
          <Button href='/' className={`nav-item ${active === 'index' ? 'active' : ''}`} aria-current={active === 'index' ? 'page' : undefined} onClick={home}>纪念馆</Button>
          <Button href='/generals/' className={`nav-item ${active === 'explore' ? 'active' : ''}`} aria-current={active === 'explore' ? 'page' : undefined} onClick={() => returnTo('explore')}>将帅名录</Button>
          <Button href='/about/' className='nav-item nav-about' onClick={() => setAbout(true)}>关于纪念馆</Button>
        </View>
        <Text className='header-date'>铭记来路 · 致敬先辈</Text>
      </View>
    </View>
    {children}
    <View className='site-footer'>
      <View className='footer-inner'>
        <Text className='footer-brand serif'>山河有名</Text>
        <Text className='footer-note'>以史料为依据，让记忆有来处。</Text>
        <a className='text-link footer-index' href='/people/'>全部人物档案</a>
        <Button href='/about/' className='footer-about text-link' onClick={() => setAbout(true)}>名录说明与资料来源<Icon name='external' /></Button>
      </View>
    </View>
    {about && <About close={() => setAbout(false)} />}
  </View>
}
