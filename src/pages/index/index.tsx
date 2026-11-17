import { Text, View } from '@tarojs/components'
import Button from '../../components/Button'
import { useDidShow, useShareAppMessage } from '@tarojs/taro'
import Shell, { openPage } from '../../components/Shell'
import PersonTile from '../../components/PersonTile'
import { people, featuredPeople } from '../../data/people'
import Icon from '../../components/Icon'
import Landscape from '../../components/Landscape'
import { getProvinceLandscape } from '../../data/landscapes'

export default function Index() {
  useDidShow(() => { if (process.env.TARO_ENV === 'h5') document.title = '山河有名 · 开国将帅纪念馆' })
  useShareAppMessage(() => ({ title: '山河有名｜记住一个名字，走近一段历史', path: '/pages/index/index' }))
  const provinces = Array.from(new Set(people.map(person => person.province))).filter(province => getProvinceLandscape(province)).sort((a, b) => people.filter(person => person.province === b).length - people.filter(person => person.province === a).length).slice(0, 6)
  const heroPeople = [...featuredPeople, ...people.filter(person => !person.portraitMissing && !featuredPeople.some(featured => featured.id === person.id))].slice(0, 12)
  return <Shell>
    <View className='home-hero container'>
      <View className='hero-copy'>
        <View className='hero-eyebrow'><View className='red-rule' /><Text>共和国开国将帅 · 数字纪念馆</Text></View>
        <h1 className='hero-heading serif'>他们的名字，<span className='hero-heading-line'>我们记得。</span></h1>
        <Text className='hero-description'>从一张面孔，走近一段历史。<Text className='block'>致敬开国将帅，铭记一代人的理想与担当。</Text></Text>
        <View className='hero-actions'>
          <Button className='primary-button' onClick={() => openPage('explore')}>走进纪念馆<Icon name='arrow' /></Button>
          <Button className='secondary-link' onClick={() => openPage('explore', 'focus=hometown')}>寻找家乡的名字<Icon name='pin' /></Button>
        </View>
        <View className='hero-facts'>
          <View className='hero-fact'><Text className='fact-number'>1,614<Text className='fact-unit'>位</Text></Text><Text className='fact-label'>开国将帅 · 统计口径见说明</Text></View>
          <View className='hero-fact'><Text className='fact-number fact-years'>1955—1965</Text><Text className='fact-label'>首次授衔与后续补授、晋升时期</Text></View>
        </View>
      </View>
      <View className='hero-gallery'>
        <View className='gallery-topline'><Text>一张张面孔，一段段来路</Text><Text>人物选辑</Text></View>
        <View className='portrait-mosaic'>{heroPeople.map((person, index) => <PersonTile key={person.id} person={person} compact index={index} />)}</View>
        <View className='gallery-bottomline'><Text>点击肖像，走近他们的人生</Text><View className='sample-label'><View className='sample-dot' /><Text>{people.length.toLocaleString()} 位将帅 · 群像选辑</Text></View></View>
      </View>
    </View>

    <View className='memory-band'>
      <View className='container memory-band-inner'><Text className='band-index'>铭记来路</Text><Text className='memory-quote serif'>山河留住足迹，<Text className='quote-break'>我们记住名字。</Text></Text><Text className='memory-subtitle'>在时代的群像里，看见每一个具体的人。</Text></View>
    </View>

    <View className='hometown-section container'>
      <View className='section-heading'><View><Text className='eyebrow'>家乡与来路</Text><Text className='section-title serif'>从你的家乡出发</Text></View><Text className='section-aside'>他们也曾从熟悉的山川与街巷，走向远方。</Text></View>
      <View className='hometown-content'>
        <View className='hometown-illustration'>
          <Landscape landscape={getProvinceLandscape('江西')!} />
          <Text className='landscape-caption serif'>一方水土，<Text className='block'>一代将星。</Text></Text><Text className='landscape-footnote'>江西 · 庐山山河意象</Text>
        </View>
        <View className='hometown-options'>
          <Text className='hometown-intro'>选择一个地方，认识一位从这里走出的将帅。</Text>
          <View className='province-grid'>{provinces.map(province => <Button key={province} className='province-button' onClick={() => openPage('explore', `province=${encodeURIComponent(province)}`)}><Text className='province-name serif'>{province}</Text><Icon name='external' /></Button>)}</View>
          <Button className='text-link all-provinces' onClick={() => openPage('explore')}>浏览全部已收录人物<Icon name='arrow' /></Button>
          <Text className='scope-note'>完整姓名名录已收录 {people.length.toLocaleString()} 位，籍贯按已获取资料记载。</Text>
        </View>
      </View>
    </View>

    <View className='featured-section container'>
      <View className='section-heading'><View><Text className='eyebrow'>人物故事</Text><Text className='section-title serif'><Text className='title-phrase'>一人一页，</Text><Text className='title-phrase'>一生一事</Text></Text></View><Button className='text-link section-more' onClick={() => openPage('explore')}>认识更多名字<Icon name='external' /></Button></View>
      <View className='featured-grid'>{[people.find(p => p.name === '李贞'), people.find(p => p.name === '朱德'), people.find(p => p.name === '粟裕')].filter(Boolean).map((person, index) => <PersonTile key={person!.id} person={person!} index={index} />)}</View>
    </View>
    <View className='closing-section container'><Text className='closing-title serif'>记住，是致敬的开始。</Text><Text className='closing-copy'>让一个名字被看见，让一段真实的往事被传递。</Text><Button className='primary-button' onClick={() => openPage('explore')}>认识一位将帅<Icon name='external' /></Button></View>
  </Shell>
}
