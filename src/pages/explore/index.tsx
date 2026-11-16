import { useMemo, useState } from 'react'
import { Input, Text, View } from '@tarojs/components'
import Button from '../../components/Button'
import { useRouter, useShareAppMessage } from '@tarojs/taro'
import Shell from '../../components/Shell'
import PersonTile from '../../components/PersonTile'
import { people } from '../../data/people'

const ranks = ['全部', '元帅', '大将', '上将', '中将', '少将']

export default function Explore() {
  const { params } = useRouter()
  const [search, setSearch] = useState('')
  const [rank, setRank] = useState('全部')
  const [province, setProvince] = useState(params.province ? decodeURIComponent(params.province) : '全部')
  const provinces = ['全部', ...Array.from(new Set(people.map(person => person.province)))]
  const filtered = useMemo(() => people.filter(person => (rank === '全部' || person.rank === rank) && (province === '全部' || person.province === province) && `${person.name}${person.hometown}${person.tagline}${person.story}`.includes(search.trim())), [rank, province, search])
  useShareAppMessage(() => ({ title: '山河有名｜寻找家乡的开国将帅', path: '/pages/explore/index' }))
  function reset() { setSearch(''); setRank('全部'); setProvince('全部') }
  return <Shell active='explore'>
    <View className='container explore-main'>
      <View className='breadcrumb'><Text>纪念馆</Text><Text>/</Text><Text>将帅名录</Text></View>
      <View className='explore-intro'><View><Text className='eyebrow'>THE PEOPLE WE REMEMBER</Text><Text className='page-title serif'>每一个名字，<Text className='mobile-block'>都值得被记住。</Text></Text><Text className='page-description'>循着家乡、姓名与人生片段，走近他们的来路。</Text></View><View className='directory-count'><Text className='directory-number'>{people.length.toString().padStart(2, '0')}</Text><Text>位已收录人物 · 原型选辑</Text></View></View>
      <View className='search-bar'><View className='search-icon' /><Input className='search-input' value={search} onInput={event => setSearch(event.detail.value)} placeholder='搜索姓名、家乡或故事关键词' confirmType='search' aria-label='搜索人物' />{search && <Button className='search-clear' aria-label='清空搜索' onClick={() => setSearch('')}>×</Button>}</View>
      <View className='directory-filters'>
        <View className='filter-row'><Text className='filter-label'>军衔</Text><View className='filter-options'>{ranks.map(item => <Button className={`filter-button ${rank === item ? 'selected' : ''}`} key={item} onClick={() => setRank(item)} aria-pressed={rank === item}>{item}</Button>)}</View></View>
        <View className='filter-row'><Text className='filter-label'>家乡</Text><View className='filter-options'>{provinces.map(item => <Button className={`filter-button ${province === item ? 'selected' : ''}`} key={item} onClick={() => setProvince(item)} aria-pressed={province === item}>{item}</Button>)}</View></View>
      </View>
      <View className='results-heading'><Text>人物选辑 <Text className='results-count'>/ {filtered.length} 位</Text></Text><Text className='scope-note'>样本名录，持续整理中</Text></View>
      {filtered.length ? <View className='directory-grid'>{filtered.map((person, index) => <PersonTile key={person.id} person={person} index={index} />)}</View> : <View className='empty-state'><Text className='empty-symbol serif'>寻</Text><Text className='empty-title serif'>暂未找到这个名字</Text><Text className='empty-copy'>当前仅收录 {people.length} 位人物样本。你可以换一个关键词，或浏览全部选辑。</Text><Button className='primary-button' onClick={reset}>重置筛选，浏览全部</Button></View>}
      <View className='directory-end'><View className='end-rule' /><Text>每一次认识，都是一次铭记。</Text><View className='end-rule' /></View>
    </View>
  </Shell>
}
