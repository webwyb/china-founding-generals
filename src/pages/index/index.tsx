import { Text, View } from '@tarojs/components'
import Button from '../../components/Button'
import { useShareAppMessage } from '@tarojs/taro'
import Shell, { openPage } from '../../components/Shell'
import PersonTile from '../../components/PersonTile'
import { people } from '../../data/people'

export default function Index() {
  useShareAppMessage(() => ({ title: '山河有名｜记住一个名字，走近一段历史', path: '/pages/index/index' }))
  const provinces = Array.from(new Set(people.map(person => person.province)))
  return <Shell>
    <View className='home-hero container'>
      <View className='hero-copy'>
        <View className='hero-eyebrow'><View className='red-rule' /><Text>共和国开国将帅 · 数字纪念馆</Text></View>
        <Text className='hero-heading serif'>他们的名字，<Text className='hero-heading-line'>我们记得。</Text></Text>
        <Text className='hero-description'>从一张面孔，走近一段历史。<Text className='block'>致敬开国将帅，铭记一代人的理想与担当。</Text></Text>
        <View className='hero-actions'>
          <Button className='primary-button' onClick={() => openPage('explore')}>走进纪念馆 <Text>↗</Text></Button>
          <Button className='secondary-link' onClick={() => openPage('explore', 'focus=hometown')}>寻找家乡的名字 <Text>→</Text></Button>
        </View>
        <View className='hero-facts'>
          <View className='hero-fact'><Text className='fact-number'>1,614<Text className='fact-unit'>位</Text></Text><Text className='fact-label'>开国将帅 · 统计口径见说明</Text></View>
          <View className='hero-fact'><Text className='fact-number fact-years'>1955—1965</Text><Text className='fact-label'>首次授衔与后续补授、晋升时期</Text></View>
        </View>
      </View>
      <View className='hero-gallery'>
        <View className='gallery-topline'><Text>一张张面孔，一段段来路</Text><Text>人物选辑 / 01</Text></View>
        <View className='portrait-mosaic'>{people.slice(0, 12).map((person, index) => <PersonTile key={person.id} person={person} compact index={index} />)}</View>
        <View className='gallery-bottomline'><Text>点击肖像，走近他们的人生</Text><View className='sample-label'><View className='sample-dot' /><Text>{Math.min(people.length, 12)} 位人物样本</Text></View></View>
      </View>
    </View>

    <View className='memory-band'>
      <View className='container memory-band-inner'><Text className='band-index'>壹 / 记忆</Text><Text className='memory-quote serif'>山河留住足迹，<Text className='quote-break'>我们记住名字。</Text></Text><Text className='memory-subtitle'>在时代的群像里，看见每一个具体的人。</Text></View>
    </View>

    <View className='hometown-section container'>
      <View className='section-heading'><View><Text className='eyebrow'>NAMES FROM YOUR HOMETOWN</Text><Text className='section-title serif'>从你的家乡出发</Text></View><Text className='section-aside'>他们也曾从熟悉的山川与街巷，走向远方。</Text></View>
      <View className='hometown-content'>
        <View className='hometown-illustration'>
          <View className='mountain mountain-back' /><View className='mountain mountain-front' /><View className='mountain mountain-near' />
          <View className='hometown-sun' /><Text className='landscape-caption serif'>一方水土，<Text className='block'>一代将星。</Text></Text><Text className='landscape-footnote'>山河之间，总有值得记住的名字。</Text>
        </View>
        <View className='hometown-options'>
          <Text className='hometown-intro'>选择一个地方，认识一位从这里走出的将帅。</Text>
          <View className='province-grid'>{provinces.map(province => <Button key={province} className='province-button' onClick={() => openPage('explore', `province=${encodeURIComponent(province)}`)}><Text className='province-name serif'>{province}</Text><Text className='province-arrow'>↗</Text></Button>)}</View>
          <Button className='text-link all-provinces' onClick={() => openPage('explore')}>浏览全部已收录人物 →</Button>
          <Text className='scope-note'>当前展示 {people.length} 位人物样本，地域选项随收录内容扩充。</Text>
        </View>
      </View>
    </View>

    <View className='featured-section container'>
      <View className='section-heading'><View><Text className='eyebrow'>ONE NAME, ONE STORY</Text><Text className='section-title serif'>一人一页，一生一事</Text></View><Button className='text-link section-more' onClick={() => openPage('explore')}>认识更多名字 ↗</Button></View>
      <View className='featured-grid'>{[people.find(p => p.name === '李贞'), people.find(p => p.name === '朱德'), people.find(p => p.name === '粟裕')].filter(Boolean).map((person, index) => <PersonTile key={person!.id} person={person!} index={index} />)}</View>
    </View>
    <View className='closing-section container'><Text className='closing-title serif'>记住，是致敬的开始。</Text><Text className='closing-copy'>让一个名字被看见，让一段真实的往事被传递。</Text><Button className='primary-button' onClick={() => openPage('explore')}>认识一位将帅 ↗</Button></View>
  </Shell>
}
