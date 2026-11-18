import BrandMark from './BrandMark'
import { BRAND_NAME, BRAND_TAGLINE } from '../services/brand'
import { Box, Nav, Link } from './Html'
import { useEffect, useState, useSyncExternalStore, type PropsWithChildren } from 'react'
import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import Button from './Button'
import { catalogueStats } from '../data/people'
import Dialog from './Dialog'
import Icon from './Icon'
import { pageHref } from '../services/personLinks'
import { siteCompliance } from '../services/compliance'
import { navigate, navigationPending, subscribeNavigation } from '../services/navigation'

const logicalRoute = (route = '') => route.startsWith('/people/') ? 'pages/person/index' : route.replace(/^\//, '').replace(/^generals\/?$/, 'pages/explore/index').replace(/^card\/?$/, 'pages/card/index').replace(/^topics(?:\/.*)?$/, 'pages/topics/index')

export function openPage(page: 'index' | 'explore' | 'person' | 'card' | 'topics', query = '') {
  if (process.env.TARO_ENV === 'h5' && typeof document !== 'undefined') return navigate(page, query)
  const url = process.env.TARO_ENV === 'h5' ? pageHref(page, query) : `/pages/${page}/index${query ? `?${query}` : ''}`
  const pages = Taro.getCurrentPages()
  if (page === 'index' || page === 'explore') {
    const previous = pages.findIndex(item => logicalRoute(item.route) === `pages/${page}/index`)
    if (!query && previous === pages.length - 1 && previous >= 0) return Promise.resolve()
    if (!query && previous >= 0) return Taro.navigateBack({ delta: pages.length - 1 - previous })
    return Taro.reLaunch({ url })
  }
  // Replacing a sibling profile, or navigating near the native stack limit,
  // keeps repeated browsing working within WeChat's page-stack constraints.
  const route = logicalRoute(pages[pages.length - 1]?.route)
  if (route === `pages/${page}/index` || pages.length >= 8) return Taro.redirectTo({ url })
  return Taro.navigateTo({ url })
}

/** Preserve the catalogue's filters when returning from a profile or card.
 * Direct links have no previous page, so replace with a safe destination. */
export function returnTo(page: 'explore' | 'person', query = '') {
  if (process.env.TARO_ENV === 'h5' && typeof document !== 'undefined') return navigate(page, query, true)
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
      <Text className='about-paragraph'>名在山河是一份面向公众的数字纪念作品。我们希望从一张面孔、一个名字、一件真实的往事，走近开国将帅的人生。</Text>
      <Text className='about-paragraph'>完整姓名名录已收录 {catalogueStats.total.toLocaleString()} 位开国将帅。人物页保留资料来源，缺项标注“待补”；来源冲突且尚未核定的年份显示“待核实”，时间轴和纪念卡同步处理；肖像缺失使用统一占位图。</Text>
      <Text className='about-paragraph'>当前已有 {catalogueStats.portraits.toLocaleString()} 位人物的肖像、{catalogueStats.biographies.toLocaleString()} 位人物的生平资料。重名人物以独立档案收录；籍贯保留来源记载，不混同历史与现行政区划。</Text>
      {catalogueStats.pendingPeople > 0 && <Text className='about-paragraph'>尚有 {catalogueStats.pendingPeople} 位人物的部分资料存在记载差异，已标明“待核实”并保留出处。未确定的地域暂不配省份景观。</Text>}
      <Text className='about-paragraph'>各省份背景景观由AI生成，仅为地域文化意象，不是历史实景照片；人物肖像来自历史影像。纪念卡保留相应标识，影像的具体使用范围仍需核验。</Text>
      <Text className='about-paragraph'>“1614位开国将帅”采用《学习时报》在中国共产党新闻网刊载文章的统计口径，包括元帅及不同军衔的将领。元帅为10位。</Text>
      <Button className='text-link source-button' onClick={() => openSource('https://cpc.people.com.cn/n1/2023/0424/c443712-32671924.html')}>查阅统计口径<Icon name='external' /></Button>
      <Text className='about-note'>本项目不代表资料来源机构。来源标注不等于开放使用许可。</Text>
      <Box className='compliance-links'><Link href='/about/#copyright'>图片版权</Link><Link href='/about/#correction'>资料勘误</Link><Link href='/about/#site-info'>主办与备案</Link></Box>
  </Dialog>
}

export default function Shell({ children, active = 'index', fixedActions = false }: PropsWithChildren<{ active?: string; fixedActions?: boolean }>) {
  const pending = useSyncExternalStore(subscribeNavigation, navigationPending, () => false)
  const [about, setAbout] = useState(false)
  const home = () => openPage('index')
  useEffect(() => { if (process.env.TARO_ENV === 'h5') document.getElementById('prerender')?.remove() }, [])
  return <View className={`app-shell platform-${process.env.TARO_ENV}${fixedActions ? ' has-fixed-actions' : ''}`}>
    {pending && <Box className='route-status' role='status'>正在打开页面…</Box>}
    <View className='site-header'>
      <View className='header-inner'>
        <Button href='/' className='brand' onClick={home} aria-label='名在山河首页'>
          <BrandMark />
          <View className='brand-wordmark'><Text className='brand-title serif'>{BRAND_NAME}</Text><Text className='brand-subtitle'>人物 · 地方 · 历史</Text></View>
        </Button>
        <View className='header-nav'>
          <Button href='/' className={`nav-item ${active === 'index' ? 'active' : ''}`} aria-current={active === 'index' ? 'page' : undefined} onClick={home}>纪念馆</Button>
          <Button href='/generals/' className={`nav-item ${active === 'explore' ? 'active' : ''}`} aria-current={active === 'explore' ? 'page' : undefined} onClick={() => returnTo('explore')}>将帅名录</Button>
          <Button href='/topics/' className={`nav-item ${active === 'topics' ? 'active' : ''}`} aria-current={active === 'topics' ? 'page' : undefined} onClick={() => openPage('topics')}>人物专题</Button>
          <Button href='/about/' className='nav-item nav-about' onClick={() => setAbout(true)}>关于纪念馆</Button>
        </View>
        <Text className='header-date'>{BRAND_TAGLINE}</Text>
      </View>
    </View>
    {children}
    <View className='site-footer'>
      <View className='footer-inner'>
        <Text className='footer-brand serif'>名在山河</Text>
        <Text className='footer-note'>{BRAND_TAGLINE}</Text>
        <Link className='text-link footer-index' href='/people/'>全部人物档案</Link>
        <Link href='/about/' className='footer-about text-link'>名录说明与资料来源<Icon name='external' /></Link>
      </View>
      <Box className='footer-compliance'>
        <Nav className='compliance-links' aria-label='版权与资料反馈'><Link href='/about/#copyright'>图片版权</Link><Link href='/about/#correction'>资料勘误</Link><Link href='/about/#ai-landscapes'>AI景观说明</Link></Nav>
        <Box className='compliance-links filing-links'><Link href={siteCompliance.icpUrl} target='_blank' rel='noopener noreferrer'>{siteCompliance.icpNumber}</Link>{siteCompliance.policeNumber && siteCompliance.policeUrl && <Link href={siteCompliance.policeUrl} target='_blank' rel='noopener noreferrer'>{siteCompliance.policeNumber}</Link>}</Box>
      </Box>
    </View>
    {about && <About close={() => setAbout(false)} />}
  </View>
}
