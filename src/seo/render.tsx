import { renderToStaticMarkup } from 'react-dom/server'
import Home from '../pages/index/index'
import Explore from '../pages/explore/index'
import Profile from '../pages/person/index'
import Shell from '../components/Shell'
import Directory from '../pages/directory/index'
import AboutPage from '../pages/about/index'
export { people } from '../data/people'
export { pageMetadata, serializeStructuredData } from './metadata'
export { legacyDestination, PUBLIC_SITE_URL } from '../services/personLinks'

function CardLanding() {
  return <Shell><main className='container explore-main'><h1 className='page-title serif'>制作人物纪念卡</h1><p className='page-description'>正在准备人物档案与纪念卡样式。</p><noscript><p>制作纪念卡需要启用JavaScript。人物生平可以直接阅读。</p></noscript><a className='text-link' href='/people/'>查阅人物档案</a></main></Shell>
}

export function renderPage(page: 'index' | 'explore' | 'person' | 'directory' | 'about' | 'card') {
  return renderToStaticMarkup(page === 'index' ? <Home /> : page === 'explore' ? <Explore /> : page === 'person' ? <Profile /> : page === 'directory' ? <Directory /> : page === 'about' ? <AboutPage /> : <CardLanding />)
}
