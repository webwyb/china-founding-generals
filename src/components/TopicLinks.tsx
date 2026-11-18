import { Text, View } from '@tarojs/components'
import Button from './Button'
import Icon from './Icon'
import { openPage } from './Shell'
import { topics, topicPath } from '../data/topics'

export function TopicLinks({ except }: { except?: string }) {
  return <View className='topic-links'>{topics.filter(topic => topic.id !== except).map(topic => <Button key={topic.id} className='topic-link' href={topicPath(topic.id)} onClick={() => openPage('topics', `id=${topic.id}`)}>
    <View><Text className='scope-note'>{topic.kind} · {topic.entries.length}位人物 · 约{topic.readMinutes}分钟</Text><Text className='topic-link-title serif'>{topic.title}</Text><Text className='topic-link-description'>{topic.subtitle}</Text></View><Icon name='arrow' />
  </Button>)}</View>
}
