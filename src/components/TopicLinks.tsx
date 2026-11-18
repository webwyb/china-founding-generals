import { Text, View } from '@tarojs/components'
import Button from './Button'
import Icon from './Icon'
import Portrait from './Portrait'
import { Heading2 } from './Html'
import { openPage } from './Shell'
import { people } from '../data/people'
import { featuredTopic, topicPath, type Topic } from '../data/topics'

export function TopicLinks({ items }: { items: Topic[] }) {
  return <View className='topic-links'>{items.map(topic => <Button key={topic.id} className='topic-link' href={topicPath(topic.id)} onClick={() => openPage('topics', `id=${topic.id}`)}>
    <View className='topic-link-copy'><Text className='topic-link-title serif'>{topic.title}</Text><Text className='topic-link-description'>{topic.subtitle}</Text><Text className='topic-link-meta'>{topic.entries.length}位人物 · 约{topic.readMinutes}分钟</Text></View><Icon name='arrow' />
  </Button>)}</View>
}

export function FeaturedTopic() {
  const topic = featuredTopic
  return <Button className='topic-feature' href={topicPath(topic.id)} onClick={() => openPage('topics', `id=${topic.id}`)} aria-label={`阅读专题：${topic.title}`}>
    <View className='topic-feature-copy'>
      <Text className='topic-feature-kicker'>本期选读</Text>
      <Heading2 className='topic-feature-title serif'>{topic.title}</Heading2>
      <Text className='topic-feature-description'>{topic.subtitle}</Text>
      <Text className='topic-feature-action'>开始阅读<Icon name='arrow' /></Text>
    </View>
    <View className='topic-feature-portraits'>{topic.entries.map(entry => {
      const person = people.find(item => item.id === entry.archiveId)
      return person && <View key={entry.id} className='topic-feature-figure'><Portrait className='topic-feature-photo' src={person.portrait} name={person.name} eager /><Text className='topic-feature-caption serif'>{person.name}</Text></View>
    })}</View>
  </Button>
}
