import { Image, Text, View } from '@tarojs/components'
import Button from './Button'
import type { Person } from '../data/people'
import { openPage } from './Shell'

export default function PersonTile({ person, compact = false, index = 0 }: { person: Person; compact?: boolean; index?: number }) {
  return <Button className={`person-tile ${compact ? 'compact-tile' : ''}`} onClick={() => openPage('person', `id=${person.id}`)} aria-label={`了解${person.name}，${person.rank}，${person.hometown}`}>
    <View className='tile-photo'>
      <Image className='portrait-image' src={person.portrait} mode='aspectFill' lazyLoad />
      {!compact && <Text className='tile-number'>{String(index + 1).padStart(2, '0')}</Text>}
      <Text className='tile-arrow'>↗</Text>
    </View>
    <View className='tile-caption'>
      <Text className='tile-name serif'>{person.name}</Text>
      <Text className='tile-rank'>{person.rank}</Text>
    </View>
    {!compact && <><Text className='tile-hometown'>{person.hometown} · {person.birth}—{person.death}</Text><Text className='tile-story'>{person.tagline}</Text></>}
  </Button>
}
