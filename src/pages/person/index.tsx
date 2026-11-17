import { Box, Inline, Heading, Heading2, Heading3, Nav, Link, Disclosure, Summary } from '../../components/Html'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useShareAppMessage } from '@tarojs/taro'
import Button from '../../components/Button'
import Icon from '../../components/Icon'
import Landscape from '../../components/Landscape'
import Portrait from '../../components/Portrait'
import Dialog from '../../components/Dialog'
import Shell, { openPage, openSource, returnTo } from '../../components/Shell'
import PersonTile from '../../components/PersonTile'
import { people, lifeYears } from '../../data/people'
import { getProvinceLandscape } from '../../data/landscapes'
import { getRemembered, toggleRemembered } from '../../services/collection'
import { usePersonRouteId } from '../../services/usePersonRouteId'
import { pageHref } from '../../services/personLinks'
import { usePageMetadata } from '../../seo/usePageMetadata'
import { feedbackUrl } from '../../services/compliance'
import { usePersonDetails } from '../../services/usePersonDetails'

const missingLabels: Record<string, string> = { birth: '出生年份', death: '逝世年份', grantYear: '授衔年份', hometown: '籍贯或出生地', province: '地域归属', biography: '详细生平', portrait: '历史肖像' }

export default function PersonPage() {
  const personId = usePersonRouteId('person')
  const { person, error, retry } = usePersonDetails(personId)
  const [remembered, setRemembered] = useState(() => person ? getRemembered().includes(person.id) : false)
  const [showPortrait, setShowPortrait] = useState(false)
  const [portraitSize, setPortraitSize] = useState<{ width: number; height: number } | null>(null)
  const profileRoot = useRef<HTMLDivElement>(null)
  const [readingSection, setReadingSection] = useState('profile-biography')
  useEffect(() => {
    setReadingSection('profile-biography')
    if (process.env.TARO_ENV !== 'h5') return
    const root = profileRoot.current
    const page = root?.closest('.taro_page')
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (!root?.getClientRects().length) return
        const top = (root.querySelector('.profile-reading-nav')?.getBoundingClientRect().bottom || 0) + 32
        const ids = window.matchMedia('(max-width: 900px)').matches
          ? ['profile-biography', 'profile-sources', 'profile-timeline'] : ['profile-biography', 'profile-sources']
        const reached = ids.filter(id => (root.querySelector(`#${id}`)?.getBoundingClientRect().top ?? Infinity) <= top)
        setReadingSection(previous => {
          if (previous === 'profile-timeline' && !window.matchMedia('(max-width: 900px)').matches &&
              (root.querySelector('.timeline-column')?.getBoundingClientRect().bottom || 0) > top) return previous
          return reached[reached.length - 1] || 'profile-biography'
        })
      })
    }
    page?.addEventListener('scroll', update, { passive: true })
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => { cancelAnimationFrame(frame); page?.removeEventListener('scroll', update); window.removeEventListener('scroll', update); window.removeEventListener('resize', update) }
  }, [person?.id])
  useEffect(() => { setShowPortrait(false); setPortraitSize(null) }, [person?.id])
  useEffect(() => { setRemembered(person ? getRemembered().includes(person.id) : false) }, [person?.id])
  const related = useMemo(() => person ? people.filter(item => item.id !== person.id).sort((a, b) => Number(b.province === person.province) - Number(a.province === person.province)).slice(0, 3) : [], [person?.id])
  usePageMetadata('person', person)
  useShareAppMessage(() => ({ title: person ? `记住这个名字：${person.name}｜名在山河` : '名在山河', path: person ? `/pages/person/index?id=${person.id}` : '/pages/index/index' }))
  if (!person) return <Shell><View className='container empty-state'><Text className='empty-title serif'>{error || (personId && people.some(item => item.id === personId) ? '正在打开人物档案…' : '暂未找到这份人物档案')}</Text>{error && <Button className='text-link' onClick={retry}>重新加载</Button>}<Button className='primary-button' href='/generals/' onClick={() => returnTo('explore')}>返回将帅名录<Icon name='back' /></Button></View></Shell>
  const landscape = getProvinceLandscape(person.province)
  const makeCard = () => openPage('card', `id=${person.id}`)
  function remember() {
    try {
      const next = toggleRemembered(person!.id)
      setRemembered(next)
      Taro.showToast({ title: next ? '已记住这个名字' : '已移出我的铭记', icon: 'none' })
    } catch { Taro.showToast({ title: '未能保存，请稍后重试', icon: 'none' }) }
  }
  function jumpTo(id: string) {
    if (process.env.TARO_ENV !== 'h5') {
      setReadingSection(id)
      void Taro.pageScrollTo({ selector: `#${id}`, offsetTop: -64, duration: 250 })
      return
    }
    const target = profileRoot.current?.querySelector<HTMLElement>(`#${id}`)
    const details = target?.closest('details')
    if (details) details.open = true
    setReadingSection(id)
    target?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    target?.focus({ preventScroll: true })
  }
  return <Shell active='explore' fixedActions>
    <Box className='container person-main' ref={profileRoot}>
      <View className='profile-navigation'><Button className='back-link text-link' href='/generals/' onClick={() => returnTo('explore')}><Icon name='back' />将帅名录</Button><Text>{person.rank}人物档案</Text></View>
      {landscape && <View className='profile-landscape'>
        <Landscape landscape={landscape} eager />
        <View className='landscape-heading'><Text className='landscape-overline'>家乡山河</Text><Text className='landscape-province serif'>{person.province}</Text><Text className='landscape-place'>{landscape.landmark}</Text></View>
        <Text className='landscape-signature'>{landscape.landmark} · AI生成景观</Text>
      </View>}
      <View className={`person-feature ${landscape ? 'with-landscape' : ''}`}>
        <View className='person-photo-frame'>
          <Button className='portrait-open' disabled={person.portraitMissing} onClick={() => { if (process.env.TARO_ENV === 'weapp') void Taro.previewImage({ urls: [person.portrait] }); else setShowPortrait(true) }} aria-label={`查看${person.name}的完整历史肖像`} aria-expanded={showPortrait} aria-controls='portrait-dialog'>
            <Portrait className='person-main-photo' src={person.portrait} name={person.name} eager onLoad={setPortraitSize} />
            <View className='photo-frame-caption'><Text>{person.portraitMissing ? '历史肖像待补' : '历史肖像'}</Text>{!person.portraitMissing && <Text className='portrait-view-link'>查看原图<Icon name='search' /></Text>}</View>
          </Button>
        </View>
        <View className='person-feature-copy'>
          <View className='person-identity'>
            <Text className='profile-introduction'>记住一个名字，走近一段历史</Text>
            <View className={`person-name-row ${person.name.length > 4 ? 'long-name' : ''}`}><Heading className='person-name serif'>{person.name.split('·').map((part, index, parts) => <Inline key={index}>{part}{index < parts.length - 1 ? '·' : ''}</Inline>)}</Heading><Text className='rank-stamp'>{person.rank}</Text></View>
            <Text className='person-years'>{lifeYears(person)}</Text>
          </View>
          <View className='person-hometown'><Text className='detail-label'>{person.hometownType || '家乡'}</Text><Text>{person.hometown}</Text>{!person.pendingFields?.includes('province') && <Button className='hometown-jump text-link' href={pageHref('explore', `province=${encodeURIComponent(person.province)}`)} onClick={() => openPage('explore', `province=${encodeURIComponent(person.province)}`)} aria-label={`浏览${person.province}籍将帅`}><Icon name='external' /></Button>}</View>
          <Text className='person-tagline serif'>{person.tagline}</Text>
          <View className='person-actions'><Button className='primary-button' href={pageHref('card', `id=${person.id}`)} onClick={makeCard}>制作纪念卡<Icon name='arrow' /></Button><Button className={`remember-button ${remembered ? 'remembered' : ''}`} onClick={remember} aria-pressed={remembered}><Icon name={remembered ? 'check' : 'bookmark'} />{remembered ? '已记住这个名字' : '记住这个名字'}</Button></View>
          <Text className='scope-note'>铭记记录保存在当前设备，可在名录中再次找到。</Text>
          {!!person.pendingFields?.length && <Text className='missing-data-note'>资料待核实：{person.pendingFields.map(key => missingLabels[key] || key).join('、')}。记载差异与出处见下方说明。</Text>}
          {!!person.missingFields?.filter(key => !person.pendingFields?.includes(key)).length && <Text className='missing-data-note'>资料待补：{person.missingFields.filter(key => !person.pendingFields?.includes(key)).map(key => missingLabels[key] || key).join('、')}。</Text>}
        </View>
      </View>
      <Nav className='profile-reading-nav' aria-label='人物档案阅读导航'>{[['profile-biography','生平经历'],['profile-timeline','人生足迹'],['profile-sources','资料出处']].map(([id, label]) => <Button key={id} className={`text-link ${readingSection === id ? 'native-reading-active' : ''}`} aria-current={readingSection === id ? 'location' : undefined} onClick={() => jumpTo(id)}>{label}</Button>)}</Nav>
      <View className='person-reading-layout'>
        <View className='story-column'>
          <Heading2 id='profile-biography' tabIndex={-1} className='story-heading serif'>生平与经历</Heading2>
          {person.biographyStatus === 'partial' && <Text className='biography-note'>现有资料以任职记录为主，具体事迹仍在补充。以下内容保留已找到的出处。</Text>}
          {person.biographySections?.length ? <View className='biography-sections'>{person.biographySections.map((section, index) => <View className='biography-section' key={`${section.title}-${index}`}>
            <Heading3 className='biography-heading serif'>{section.title}</Heading3>
            <Text className='person-story serif'>{section.text}</Text>
            <View className='biography-sources'>{section.sourceUrls.map((url, sourceIndex) => <Button key={url} className='text-link biography-source' aria-label={`查阅${section.title}的第${sourceIndex + 1}项资料出处`} href={url} onClick={() => openSource(url)}>资料出处{section.sourceUrls.length > 1 ? ` ${sourceIndex + 1}` : ''}<Icon name='external' /></Button>)}</View>
          </View>)}</View> : <Text className='person-story serif'>{person.story}</Text>}
          {!!person.historicalContexts?.length && <View className='biography-contexts'><Heading3 className='biography-heading serif'>读懂这些经历</Heading3>{person.historicalContexts.map(context => <View key={context.id} className='historical-note biography-context'>
            <Text className='context-title serif'>{context.title}</Text><Text>{context.text}</Text><Button className='text-link biography-source' href={context.source.url} onClick={() => openSource(context.source.url)} aria-label={`查阅${context.title}的背景资料`}>背景资料<Icon name='external' /></Button>
          </View>)}</View>}
          {person.fieldNote && <View className='historical-note'><Text className='historical-note-title'>资料说明</Text><Text>{person.fieldNote}</Text></View>}
          <Nav className='profile-feedback compliance-links' aria-label={`${person.name}的资料反馈`}><Link href={feedbackUrl('correction', person)}>反馈{person.name}的资料勘误</Link><Link href={feedbackUrl('copyright', person)}>反馈图片权利问题</Link></Nav>
          <Disclosure className='source-section'><Summary id='profile-sources' className='source-heading'>查阅史料与影像出处<Inline className='source-count'>{person.sources.length + (person.imageSource ? 1 : 0)} 项<Icon name='down' /></Inline></Summary>
            {person.sources.map(source => <Button className='source-row' key={source.url} href={source.url} onClick={() => openSource(source.url)}><Text>{source.title}</Text><Icon name='external' /></Button>)}
            {person.imageSource && <Button className='source-row' href={person.imageSource} onClick={() => openSource(person.imageSource)}><Text>历史肖像来源</Text><Icon name='external' /></Button>}
            <Text className='source-note'>生平简述据以上资料整理，点击可查阅原文。页面景观为家乡地域文化意象。</Text>
          </Disclosure>
        </View>
        <View className='timeline-column'><Heading2 id='profile-timeline' tabIndex={-1} className='timeline-title serif'>人生足迹</Heading2><View className='timeline'>{person.timeline.map((item, index) => <View className='timeline-item' key={`${item.year}-${index}`}><View className='timeline-dot' /><Text className='timeline-year'>{item.year}</Text><Text className='timeline-text'>{item.text}</Text>{item.sourceUrl && <Button className='text-link timeline-source' aria-label={`查阅${item.year}年这段经历的资料`} href={item.sourceUrl!} onClick={() => openSource(item.sourceUrl!)}>出处<Icon name='external' /></Button>}</View>)}</View></View>
      </View>
      <View className='related-section'><View className='section-heading'><View><Text className='eyebrow'>继续认识</Text><Text className='section-title serif'><Text className='title-phrase'>山河之间，</Text><Text className='title-phrase'>还有这些名字</Text></Text></View></View><View className='featured-grid'>{related.map((item, index) => <PersonTile key={item.id} person={item} index={index} />)}</View></View>
    </Box>
    <View className='profile-action-bar'><Button className={`remember-button ${remembered ? 'remembered' : ''}`} onClick={remember} aria-pressed={remembered}><Icon name={remembered ? 'check' : 'bookmark'} />{remembered ? '已铭记' : '铭记'}</Button><Button className='primary-button' href={pageHref('card', `id=${person.id}`)} onClick={makeCard}>制作纪念卡<Icon name='arrow' /></Button></View>
    {showPortrait && <Dialog className='portrait-dialog' titleId='portrait-dialog-title' onClose={() => setShowPortrait(false)}>
      <View className='portrait-dialog-heading'><View id='portrait-dialog-title' className='portrait-dialog-identity'><Text className='portrait-dialog-name'>{person.name}</Text><Text className='portrait-dialog-label'>历史肖像</Text></View><Button className='export-close' onClick={() => setShowPortrait(false)} aria-label='关闭历史肖像'><Icon name='close' /></Button></View>
      <View id='portrait-dialog' className='portrait-original-stage'><Portrait className='portrait-original' src={person.portrait} name={person.name} eager /></View>
      <View className='portrait-original-caption'><Text>完整原图{portraitSize ? ` · ${portraitSize.width} × ${portraitSize.height} 像素` : ''}</Text><Text>保留历史影像原貌，清晰度取决于原始资料。</Text></View>
      <Link className='portrait-original-link text-link' href={person.portrait} target='_blank' rel='noreferrer'>打开原图查看细节<Icon name='external' /></Link>
    </Dialog>}
  </Shell>
}
