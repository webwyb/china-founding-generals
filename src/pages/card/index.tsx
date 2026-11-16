import { useState } from 'react'
import { Canvas, Image, Text, View } from '@tarojs/components'
import Button from '../../components/Button'
import Taro, { useRouter, useShareAppMessage } from '@tarojs/taro'
import Shell, { openPage, returnTo } from '../../components/Shell'
import { people } from '../../data/people'
import { copyPersonLink, saveMemorialCard } from '../../services/share'

export default function CardPage() {
  const { params } = useRouter()
  const person = people.find(item => item.id === params.id)
  const [busy, setBusy] = useState(false)
  function inform(message: string, title: string) {
    if (message.length > 18) return Taro.showModal({ title, content: message, showCancel: false })
    return Taro.showToast({ title: message, icon: 'none' })
  }
  useShareAppMessage(() => ({ title: person ? `我想让你记住这个名字：${person.name}` : '山河有名', path: person ? `/pages/person/index?id=${person.id}` : '/pages/index/index' }))
  if (!person) return <Shell><View className='container empty-state'><Text>暂未找到这份人物纪念卡</Text><Button className='primary-button' onClick={() => openPage('explore')}>浏览人物</Button></View></Shell>
  async function save() {
    setBusy(true)
    try { const result = await saveMemorialCard(person!); void inform(result.message, '保存纪念卡') }
    catch (error) { void inform(error instanceof Error ? error.message : '保存未完成，请稍后重试', '保存纪念卡') }
    finally { setBusy(false) }
  }
  async function copy() {
    try { const result = await copyPersonLink(person!.id); void inform(result.message, '分享人物故事') }
    catch (error) { void inform(error instanceof Error ? error.message : '复制未完成，请稍后重试', '分享人物故事') }
  }
  return <Shell active='explore'>
    <View className='container card-main'>
      <Button className='back-link text-link' onClick={() => returnTo('person', `id=${person.id}`)}>← 返回人物故事</Button>
      <View className='card-layout'>
        <View className='memorial-card' id='memorial-card'><View className='card-top'><Text className='card-kicker'>一份纪念 · 一个名字</Text><Text className='card-no'>山河有名</Text></View><View className='card-image-wrap'><Image className='card-portrait' src={person.portrait} mode='aspectFill' /></View><View className='card-person-heading'><Text className='card-person-name serif'>{person.name}</Text><Text className='card-rank'>{person.rank}</Text></View><Text className='card-person-years'>{person.birth} — {person.death}　/　{person.hometown}</Text><Text className='card-person-story serif'>{person.tagline}</Text><View className='card-bottom'><View><Text className='card-message'>我想让你记住这个名字。</Text><Text className='card-bottom-brand'>山河有名 · 开国将帅纪念馆</Text></View><View className='card-seal'><Text>铭记</Text><Text>来路</Text></View></View></View>
        <View className='card-instructions'><Text className='eyebrow'>KEEP A NAME, PASS ON A STORY</Text><Text className='page-title serif'>把这个名字，<Text className='block'>传递给更多人。</Text></Text><Text className='page-description'>一张纪念卡，一段值得被记住的人生。<Text className='block'>保存下来，或把人物故事分享给亲友。</Text></Text><Button className='primary-button card-save-button' loading={busy} disabled={busy} onClick={save}>{busy ? '正在制作纪念卡' : '保存人物纪念卡'} <Text>↓</Text></Button>{process.env.TARO_ENV === 'weapp' ? <Button className='outline-button' openType='share'>分享人物故事 ↗</Button> : <Button className='outline-button' onClick={copy}>复制人物故事链接 ↗</Button>}<Text className='card-tip'>分享一件真实的往事，让记忆继续生长。</Text><Text className='scope-note'>历史影像与人物简述出处见人物页。<Text className='block'>本页为人物纪念卡预览，可导出 PNG 图片。</Text></Text></View>
      </View>
      <Canvas className='export-canvas' canvasId='memorial-canvas' id='memorial-canvas' style={{ width: '600px', height: '900px' }} />
    </View>
  </Shell>
}
