import { useEffect, useState } from 'react'
import { Image, Text, View } from '@tarojs/components'
import Button from '../../components/Button'
import Taro, { useRouter, useShareAppMessage } from '@tarojs/taro'
import Shell, { openPage, openSource, returnTo } from '../../components/Shell'
import PersonTile from '../../components/PersonTile'
import { people } from '../../data/people'
import { getRemembered, toggleRemembered } from '../../services/collection'

export default function PersonPage() {
  const { params } = useRouter()
  const person = people.find(item => item.id === params.id)
  const [remembered, setRemembered] = useState(() => person ? getRemembered().includes(person.id) : false)
  useEffect(() => { setRemembered(person ? getRemembered().includes(person.id) : false) }, [person?.id])
  useShareAppMessage(() => ({ title: person ? `我想让你记住这个名字：${person.name}｜山河有名` : '山河有名', path: person ? `/pages/person/index?id=${person.id}` : '/pages/index/index' }))
  if (!person) return <Shell><View className='container empty-state'><Text className='empty-title serif'>这份人物档案暂未收录</Text><Button className='primary-button' onClick={() => openPage('explore')}>返回将帅名录</Button></View></Shell>
  const related = people.filter(item => item.id !== person.id).sort((a, b) => Number(b.province === person.province) - Number(a.province === person.province)).slice(0, 3)
  function remember() {
    try {
      const next = toggleRemembered(person!.id)
      setRemembered(next)
      Taro.showToast({ title: next ? '这个名字，记住了' : '已移出本机铭记记录', icon: 'none' })
    } catch { Taro.showToast({ title: '本机存储暂不可用，请稍后再试', icon: 'none' }) }
  }
  return <Shell active='explore'>
    <View className='container person-main'>
      <Button className='back-link text-link' onClick={() => returnTo('explore')}>← 返回将帅名录</Button>
      <View className='person-feature'>
        <View className='person-photo-frame'><Image className='person-main-photo' src={person.portrait} mode='aspectFill' /><View className='photo-frame-caption'><Text>历史影像</Text><Text>山河有名 · 人物档案</Text></View></View>
        <View className='person-feature-copy'><Text className='eyebrow'>A NAME TO REMEMBER</Text><View className='person-name-row'><Text className='person-name serif'>{person.name}</Text><Text className='rank-stamp'>{person.rank}</Text></View><Text className='person-years'>{person.birth} — {person.death}</Text><View className='person-hometown'><Text className='detail-label'>家乡</Text><Text>{person.hometown}</Text></View><Text className='person-tagline serif'>{person.tagline}</Text><View className='person-actions'><Button className='primary-button' onClick={() => openPage('card', `id=${person.id}`)}>制作人物纪念卡 <Text>↗</Text></Button><Button className={`remember-button ${remembered ? 'remembered' : ''}`} onClick={remember}>{remembered ? '✓ 已记住这个名字' : '＋ 记住这个名字'}</Button></View><Text className='scope-note'>铭记记录仅保存在当前设备。</Text></View>
      </View>
      <View className='person-reading-layout'>
        <View className='story-column'><Text className='eyebrow'>ONE LIFE, ONE STORY</Text><Text className='story-heading serif'>一生中的一页</Text><Text className='person-story'>{person.story}</Text><View className='story-end-mark'>山河有名 / 铭记来路</View>
          <View className='source-section'><Text className='source-heading'>史料与影像出处</Text>{person.sources.map((source, index) => <Button className='source-row' key={source.url} onClick={() => openSource(source.url)}><Text>{String(index + 1).padStart(2, '0')} · {source.title}</Text><Text>↗</Text></Button>)}<Button className='source-row' onClick={() => openSource(person.imageSource)}><Text>肖像 · 历史照片来源</Text><Text>↗</Text></Button><Text className='source-note'>人物介绍为据来源整理的简述。点击以上条目可查阅原文与历史影像出处。</Text></View>
        </View>
        <View className='timeline-column'><Text className='timeline-title serif'>人生足迹</Text><View className='timeline'>{person.timeline.map((item, index) => <View className='timeline-item' key={`${item.year}-${index}`}><View className='timeline-dot' /><Text className='timeline-year'>{item.year}</Text><Text className='timeline-text'>{item.text}</Text></View>)}</View></View>
      </View>
      <View className='related-section'><View className='section-heading'><View><Text className='eyebrow'>THE NEXT NAME</Text><Text className='section-title serif'>再走近一个名字</Text></View></View><View className='featured-grid'>{related.map((item, index) => <PersonTile key={item.id} person={item} index={index} />)}</View></View>
    </View>
  </Shell>
}
