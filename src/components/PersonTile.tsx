import { Text, View } from '@tarojs/components'
import Button from './Button'
import { lifeYears, type Person } from '../data/people'
import { openPage } from './Shell'
import Icon from './Icon'
import Portrait from './Portrait'

export default function PersonTile({ person, compact = false, index = 0, onNavigate }: { person: Person; compact?: boolean; index?: number; onNavigate?: () => void }) {
  return <Button className={`person-tile ${compact ? 'compact-tile' : ''}`} onClick={() => { onNavigate?.(); return openPage('person', `id=${person.id}`) }} aria-label={`了解${person.name}，${person.rank}，${person.hometown}`}>
    <View className='tile-photo'>
      <Portrait className='portrait-image' src={person.portrait} name={person.name} eager={index < 4} />
      {person.portraitMissing && <Text className='portrait-status'>肖像待补</Text>}
    </View>
    <View className='tile-caption'>
      <Text className='tile-name serif'>{person.name}</Text>
      <Text className='tile-rank'>{person.rank}</Text>
      {!compact && <View className='tile-arrow'><Icon name='external' /></View>}
    </View>
    {!compact && <><Text className='tile-hometown'>{person.hometown} · {lifeYears(person)}</Text><Text className='tile-story'>{person.tagline}</Text></>}
  </Button>
}
