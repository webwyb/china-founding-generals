import { useState, type PropsWithChildren } from 'react'
import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import Button from './Button'

export function openPage(page: 'index' | 'explore' | 'person' | 'card', query = '') {
  const url = `/pages/${page}/index${query ? `?${query}` : ''}`
  const pages = Taro.getCurrentPages()
  if (page === 'index' || page === 'explore') return Taro.reLaunch({ url })
  // Replacing a sibling profile, or navigating near the native stack limit,
  // keeps repeated browsing working within WeChat's page-stack constraints.
  const route = pages[pages.length - 1]?.route || ''
  if (route === `pages/${page}/index` || pages.length >= 8) return Taro.redirectTo({ url })
  return Taro.navigateTo({ url })
}

/** Preserve the catalogue's filters when returning from a profile or card.
 * Direct links have no previous page, so replace with a safe destination. */
export function returnTo(page: 'explore' | 'person', query = '') {
  const route = `pages/${page}/index`
  const pages = Taro.getCurrentPages()
  const normalize = (value?: string) => (value || '').replace(/^\//, '')
  if (!query && normalize(pages[pages.length - 1]?.route) === route) return Promise.resolve()
  for (let index = pages.length - 2; index >= 0; index--) {
    if (normalize(pages[index].route) === route) return Taro.navigateBack({ delta: pages.length - 1 - index })
  }
  return Taro.redirectTo({ url: `/${route}${query ? `?${query}` : ''}` })
}

export function openSource(url: string) {
  if (process.env.TARO_ENV === 'h5') {
    window.open(url, '_blank', 'noopener,noreferrer')
  } else {
    Taro.setClipboardData({ data: url }).then(() => Taro.showToast({ title: '来源链接已复制，可在浏览器查阅', icon: 'none' }))
  }
}

function About({ close }: { close: () => void }) {
  return <View className='modal-scrim' onClick={close}>
    <View className='about-dialog' onClick={event => event.stopPropagation()}>
      <Button className='close-button' aria-label='关闭说明' onClick={close}>×</Button>
      <Text className='eyebrow'>ABOUT THE MEMORIAL</Text>
      <Text className='dialog-title serif'>让记忆，有来处。</Text>
      <Text className='about-paragraph'>山河有名是一份面向公众的数字纪念作品。我们希望从一张面孔、一个名字、一件真实的往事，走近开国将帅的人生。</Text>
      <Text className='about-paragraph'>目前为交互原型，展示精选人物样本，并非完整1614人名录。人物页附有文字与肖像出处；页面筛选数量只代表当前已收录样本。</Text>
      <Text className='about-paragraph'>“1614位开国将帅”采用《学习时报》在中国共产党新闻网刊载文章的统计口径，包括元帅及不同军衔的将领。元帅为10位。</Text>
      <Button className='text-link source-button' onClick={() => openSource('https://cpc.people.com.cn/n1/2023/0424/c443712-32671924.html')}>查阅统计口径 ↗</Button>
      <Text className='about-note'>历史影像用于原型研究与纪念展示。正式发布前需完成全量资料复核及影像使用核验。本项目不代表资料来源机构。</Text>
    </View>
  </View>
}

export default function Shell({ children, active = 'index' }: PropsWithChildren<{ active?: string }>) {
  const [about, setAbout] = useState(false)
  const home = () => Taro.reLaunch({ url: '/pages/index/index' })
  let statusBarHeight = 24
  if (process.env.TARO_ENV === 'weapp') {
    try { statusBarHeight = Taro.getWindowInfo().statusBarHeight || 24 } catch { /* Keep a safe default on older clients. */ }
  }
  return <View className={`app-shell platform-${process.env.TARO_ENV}`}>
    <View className='site-header' style={process.env.TARO_ENV === 'weapp' ? { paddingTop: `${statusBarHeight}px` } : undefined}>
      <View className='header-inner'>
        <Button className='brand' onClick={home} aria-label='山河有名首页'>
          <View className='brand-seal'><Text>山河</Text><Text>有名</Text></View>
          <View className='brand-wordmark'><Text className='brand-title serif'>山河有名</Text><Text className='brand-subtitle'>开国将帅纪念馆</Text></View>
        </Button>
        <View className='header-nav'>
          <Button className={`nav-item ${active === 'index' ? 'active' : ''}`} onClick={home}>纪念馆</Button>
          <Button className={`nav-item ${active === 'explore' ? 'active' : ''}`} onClick={() => returnTo('explore')}>将帅名录</Button>
          <Button className='nav-item nav-about' onClick={() => setAbout(true)}>关于纪念馆 <Text className='small-arrow'>↗</Text></Button>
        </View>
        <Text className='header-date'>铭记来路 · 致敬先辈</Text>
      </View>
    </View>
    {children}
    <View className='site-footer'>
      <View className='footer-inner'>
        <Text className='footer-brand serif'>山河有名</Text>
        <Text className='footer-note'>以史料为依据，让记忆有来处。</Text>
        <Button className='footer-about text-link' onClick={() => setAbout(true)}>原型说明与资料来源 ↗</Button>
      </View>
    </View>
    {about && <About close={() => setAbout(false)} />}
  </View>
}
