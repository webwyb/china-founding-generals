import { useEffect, useMemo, useRef, useState } from 'react'
import { Input, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter, useShareAppMessage } from '@tarojs/taro'
import Button from '../../components/Button'
import Icon from '../../components/Icon'
import Landscape from '../../components/Landscape'
import Shell from '../../components/Shell'
import PersonTile from '../../components/PersonTile'
import { people } from '../../data/people'
import { getProvinceLandscape } from '../../data/landscapes'
import { getRemembered } from '../../services/collection'
import { defaultCatalogueState, readCatalogueState, saveCatalogueState, type CatalogueState } from '../../services/catalogueState'
import { filterPeople, regionFromQuery } from '../../services/catalogue'
import { usePageMetadata } from '../../seo/usePageMetadata'

const ranks = ['全部', '元帅', '大将', '上将', '中将', '少将']
const provinces = Array.from(new Set(people.map(person => person.province)))
const counts = new Map(provinces.map(province => [province, people.filter(person => person.province === province).length]))
provinces.sort((a, b) => counts.get(b)! - counts.get(a)!)

export default function Explore() {
  const { params } = useRouter()
  const [state, setState] = useState<CatalogueState>(() => {
    if (params.province) {
      return { ...defaultCatalogueState, province: regionFromQuery(params.province, provinces) }
    }
    const saved = readCatalogueState()
    return { ...saved, province: provinces.includes(saved.province) ? saved.province : '全部' }
  })
  const [provinceExpanded, setProvinceExpanded] = useState(false)
  const [remembered, setRemembered] = useState(getRemembered)
  const firstShow = useRef(true)
  const catalogueRoot = useRef<HTMLDivElement>(null)
  const loadTrigger = useRef<HTMLDivElement>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const scrollPosition = useRef(state.scrollTop)
  const restoring = useRef(true)
  const focusNewBatch = useRef<number | null>(null)
  const [searchDraft, setSearchDraft] = useState(state.search)
  const composing = useRef(false)
  const current = useRef(state)
  current.current = state
  // Avoid synchronous storage writes on each keystroke and retain the last
  // actual scroll position, including refreshes and browser back navigation.
  useEffect(() => {
    const timer = setTimeout(() => saveCatalogueState({ ...current.current, scrollTop: scrollPosition.current }), 220)
    return () => clearTimeout(timer)
  }, [state])
  useEffect(() => {
    if (process.env.TARO_ENV !== 'h5') return
    const page = catalogueRoot.current?.closest<HTMLElement>('.taro_page')
    let timer: ReturnType<typeof setTimeout>
    const save = () => saveCatalogueState({ ...current.current, scrollTop: scrollPosition.current })
    const onScroll = () => {
      if (restoring.current || !catalogueRoot.current?.getClientRects().length) return
      scrollPosition.current = Math.max(window.scrollY, page?.scrollTop || 0)
      clearTimeout(timer)
      timer = setTimeout(save, 180)
    }
    const onPageHide = () => { clearTimeout(timer); save() }
    page?.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pagehide', onPageHide)
    return () => {
      clearTimeout(timer); save()
      page?.removeEventListener('scroll', onScroll)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [])
  usePageMetadata('explore')
  useDidShow(() => {
    const focusHometown = firstShow.current && params.focus === 'hometown'
    restoring.current = true
    setRemembered(getRemembered())
    if (process.env.TARO_ENV === 'h5' && (!firstShow.current || !params.province)) {
      const saved = readCatalogueState()
      const active = current.current
      if (saved.search === active.search && saved.province === active.province && saved.rank === active.rank && saved.rememberedOnly === active.rememberedOnly) {
        scrollPosition.current = saved.scrollTop
      }
    }
    if (process.env.TARO_ENV === 'h5') requestAnimationFrame(() => requestAnimationFrame(() => {
      if (focusHometown) document.getElementById('province-filter')?.scrollIntoView({ block: 'center' })
      else void Taro.pageScrollTo({ scrollTop: scrollPosition.current, duration: 0 })
      restoring.current = false
    }))
    firstShow.current = false
  })
  const filtered = useMemo(() => filterPeople(people, state, remembered), [state.rank, state.province, state.search, state.rememberedOnly, remembered])
  const visiblePeople = filtered.slice(0, state.visibleCount)
  const hasMore = visiblePeople.length < filtered.length
  useEffect(() => {
    if (process.env.TARO_ENV !== 'h5' || !hasMore || !loadTrigger.current || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting) || restoring.current || document.activeElement?.closest('.load-more-section')) return
      observer.disconnect()
      setState(previous => ({ ...previous, visibleCount: Math.min(previous.visibleCount + 24, filtered.length) }))
    }, { root: catalogueRoot.current?.closest('.taro_page'), rootMargin: '0px 0px 480px 0px' })
    observer.observe(loadTrigger.current)
    return () => observer.disconnect()
  }, [state.visibleCount, filtered])
  useEffect(() => {
    if (focusNewBatch.current === null) return
    const firstNew = catalogueRoot.current?.querySelectorAll<HTMLElement>('.directory-grid .person-tile')[focusNewBatch.current]
    focusNewBatch.current = null
    firstNew?.focus({ preventScroll: true })
  }, [state.visibleCount])
  const visibleProvinces = provinceExpanded ? provinces : [...new Set([...provinces.slice(0, 6), ...(state.province !== '全部' ? [state.province] : [])])]
  const landscape = getProvinceLandscape(state.province)
  function change(value: Partial<CatalogueState>) {
    scrollPosition.current = 0
    if (value.search !== undefined) setSearchDraft(value.search)
    setState(previous => ({ ...previous, ...value, visibleCount: 24, scrollTop: 0 }))
  }
  function reset() { scrollPosition.current = 0; setSearchDraft(''); setState({ ...defaultCatalogueState }) }
  function capturePosition() {
    const page = process.env.TARO_ENV === 'h5' ? catalogueRoot.current?.closest<HTMLElement>('.taro_page') : null
    scrollPosition.current = process.env.TARO_ENV === 'h5' ? Math.max(window.scrollY, page?.scrollTop || 0) : 0
    saveCatalogueState({ ...current.current, scrollTop: scrollPosition.current })
  }
  const hasFilters = state.rank !== '全部' || state.province !== '全部' || !!state.search
  useShareAppMessage(() => ({ title: '山河有名｜寻找家乡的开国将帅', path: '/pages/explore/index' }))
  return <Shell active='explore'>
    <div className='container explore-main' ref={catalogueRoot}>
      <View className='explore-intro'><View><Text className='eyebrow'>开国将帅名录</Text><h1 className='page-title serif'>每一个名字，<span className='mobile-block'>都值得被记住。</span></h1><Text className='page-description'>从姓名与家乡出发，走近 {people.length.toLocaleString()} 位将帅的人生。</Text></View><Text className='catalogue-inscription serif'>铭记来路</Text></View>
      <View className='catalogue-tabs'><Button className={state.rememberedOnly ? '' : 'selected'} aria-pressed={!state.rememberedOnly} onClick={() => change({ rememberedOnly: false })}>全部名录<Text>{people.length.toLocaleString()}</Text></Button><Button className={state.rememberedOnly ? 'selected' : ''} aria-pressed={state.rememberedOnly} onClick={() => change({ rememberedOnly: true })}><Icon name='bookmark' />我的铭记<Text>{remembered.length}</Text></Button></View>
      <View className='search-bar' id='catalogue-search'><Icon name='search' />{process.env.TARO_ENV === 'h5' ? <input ref={searchInput} type='search' className='search-input' value={searchDraft} onChange={event => { setSearchDraft(event.target.value); if (!composing.current) change({ search: event.target.value }) }} onCompositionStart={() => { composing.current = true }} onCompositionEnd={event => { composing.current = false; change({ search: event.currentTarget.value }) }} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) event.currentTarget.blur() }} placeholder='搜索姓名、家乡或关键词' maxLength={100} enterKeyHint='search' autoComplete='off' aria-label='搜索姓名、家乡或生平' /> : <Input className='search-input' value={state.search} onInput={event => change({ search: event.detail.value })} placeholder='搜索姓名、家乡或关键词' maxlength={100} confirmType='search' aria-label='搜索姓名、家乡或生平' />}{searchDraft && <Button className='search-clear' aria-label='清空搜索' onClick={() => { change({ search: '' }); searchInput.current?.focus({ preventScroll: true }) }}><Icon name='close' /></Button>}</View>
      <View className='directory-filters'>
        <View className='filter-row'><Text className='filter-label'>军衔</Text><View className='filter-options'>{ranks.map(item => <Button className={`filter-button ${state.rank === item ? 'selected' : ''}`} key={item} onClick={() => change({ rank: item })} aria-pressed={state.rank === item}>{item}</Button>)}</View></View>
        <View className='filter-row province-filter' id='province-filter'><Text className='filter-label'>家乡</Text><View className='filter-options' id='region-options'><Button className={`filter-button ${state.province === '全部' ? 'selected' : ''}`} onClick={() => change({ province: '全部' })} aria-pressed={state.province === '全部'}>全部</Button>{visibleProvinces.map(item => <Button className={`filter-button ${state.province === item ? 'selected' : ''}`} key={item} onClick={() => change({ province: item })} aria-pressed={state.province === item}>{item}<Text className='region-filter-count'>{counts.get(item)}</Text></Button>)}<Button className='region-expand-button' aria-expanded={provinceExpanded} aria-controls='region-options' onClick={() => setProvinceExpanded(value => !value)} aria-label={provinceExpanded ? '收起地区列表' : `展开全部${provinces.length}个地区`}>{provinceExpanded ? '收起' : '全部地区'}<Icon name='down' className={provinceExpanded ? 'rotated' : ''} /></Button></View></View>
      </View>
      {landscape && <View className='directory-landscape'><Landscape landscape={landscape} /><View><Text className='directory-landscape-province serif'>{landscape.province}</Text><Text>{landscape.landmark} · 家乡山河意象</Text></View></View>}
      <View className='results-heading'><p aria-live='polite'>{state.rememberedOnly ? '我的铭记' : state.province === '全部' ? '将帅名录' : `${state.province}的名字`}<span className='results-count'>共 {filtered.length.toLocaleString()} 位</span></p>{hasFilters && <Button className='clear-filters text-link' onClick={() => change({ rank: '全部', province: '全部', search: '' })}>清除筛选<Icon name='close' /></Button>}</View>
      {filtered.length ? <>
        <View className='directory-grid'>{visiblePeople.map((person, index) => <PersonTile key={person.id} person={person} index={index} onNavigate={capturePosition} />)}</View>
        <div className='load-more-section' ref={loadTrigger}><p className='scope-note' role='status' aria-live='polite'>已呈现 {visiblePeople.length.toLocaleString()} / {filtered.length.toLocaleString()} 位{!hasMore && '，已浏览全部结果'}</p>{hasMore && <Button className='outline-button load-more-button' onClick={() => { focusNewBatch.current = visiblePeople.length; setState(previous => ({ ...previous, visibleCount: Math.min(previous.visibleCount + 24, filtered.length) })) }}>再认识 {Math.min(24, filtered.length - state.visibleCount)} 位<Icon name='down' /></Button>}<Button className='text-link return-filters' onClick={() => { if (process.env.TARO_ENV !== 'h5') { void Taro.pageScrollTo({ scrollTop: 0 }); return }; document.getElementById('catalogue-search')?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); searchInput.current?.focus({ preventScroll: true }) }}>返回搜索与筛选<Icon name='back' /></Button></div>
      </> : <View className='empty-state'><Icon name={state.rememberedOnly ? 'bookmark' : 'search'} /><Text className='empty-title serif'>{state.rememberedOnly && !remembered.length ? '让一个名字，留在心里。' : '暂未找到匹配的人物'}</Text><Text className='empty-copy'>{state.rememberedOnly && !remembered.length ? '走近一位将帅，在人物页点击“记住这个名字”，就能在这里再次找到。' : '可缩短关键词，或清除军衔和家乡筛选后再试。'}</Text><Button className='primary-button' onClick={reset}>浏览全部名录<Icon name='arrow' /></Button></View>}
      <View className='directory-end'><View className='end-rule' /><Text>每一次认识，都是一次铭记。</Text><View className='end-rule' /></View>
    </div>
  </Shell>
}
