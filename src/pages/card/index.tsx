import CardPreview from '../../components/CardPreview'
import { Inline, Heading, Paragraph, Link, Fieldset, Legend } from '../../components/Html'
import { useEffect, useState } from 'react'
import { Canvas, Image, Text, View } from '@tarojs/components'
import Taro, { useShareAppMessage } from '@tarojs/taro'
import Button from '../../components/Button'
import Dialog from '../../components/Dialog'
import Icon from '../../components/Icon'
import Shell, { openPage, returnTo } from '../../components/Shell'
import { people } from '../../data/people'
import { getProvinceLandscape } from '../../data/landscapes'
import { type CardTheme } from '../../services/cardRenderer'
import { copyPersonLink } from '../../services/share'
import { usePersonRouteId } from '../../services/usePersonRouteId'
import { usePageMetadata } from '../../seo/usePageMetadata'
import { AI_LANDSCAPE_NOTE } from '../../services/compliance'
import { useCardImage } from '../../services/useCardImage'
import { saveMiniCard } from '../../services/miniCard'
import { usePersonDetails } from '../../services/usePersonDetails'

export default function CardPage() {
  const personId = usePersonRouteId('card')
  const { person: detailedPerson } = usePersonDetails(personId)
  const person = detailedPerson || people.find(item => item.id === personId)
  const [theme, setTheme] = useState<CardTheme>(() => getProvinceLandscape(person?.province) ? 'landscape' : 'portrait')
  const [retry, setRetry] = useState(0)
  const [showImage, setShowImage] = useState(false)
  const [copied, setCopied] = useState(false)
  usePageMetadata('card', person)
  const { busy, preview, error } = useCardImage(person, theme, retry)
  const [saving, setSaving] = useState(false)
  useEffect(() => { setCopied(false); if (!getProvinceLandscape(person?.province)) setTheme('portrait') }, [person?.id])
  useShareAppMessage(() => ({ title: person ? `记住这个名字：${person.name}｜名在山河` : '名在山河', path: person ? `/pages/person/index?id=${person.id}` : '/pages/index/index' }))
  if (!person) return <Shell><View className='container empty-state'><Text className='empty-title serif'>暂未找到这份纪念卡</Text><Button className='primary-button' onClick={() => openPage('explore')}>浏览将帅名录<Icon name='arrow' /></Button></View></Shell>
  const region = getProvinceLandscape(person.province)
  async function save() {
    if (process.env.TARO_ENV === 'h5') { if (preview) setShowImage(true); return }
    if (!preview || saving) return
    setSaving(true)
    try { await saveMiniCard(preview); void Taro.showToast({ title: '已保存到相册', icon: 'success' }) }
    catch (reason) { void Taro.showModal({ title: '保存纪念卡', content: reason instanceof Error ? reason.message : '保存未完成，请重试。', showCancel: false }) }
    finally { setSaving(false) }
  }
  async function copy() {
    try {
      const result = await copyPersonLink(person!.id)
      setCopied(true)
      if (result.message.includes('本地')) void Taro.showModal({ title: '人物链接已复制', content: result.message, showCancel: false })
      else void Taro.showToast({ title: '人物链接已复制', icon: 'none' })
    } catch (reason) { void Taro.showModal({ title: '复制人物链接', content: reason instanceof Error ? reason.message : '复制未完成，请重试。', showCancel: false }) }
  }
  return <Shell active='explore' fixedActions>
    <View className='container card-main'>
      <View className='profile-navigation'><Button className='back-link text-link' onClick={() => returnTo('person', `id=${person.id}`)}><Icon name='back' />返回{person.name}的故事</Button><Text>一张纪念卡，一份铭记</Text></View>
      <View className='card-layout'>
        <View className='card-preview-stage'>
          <View className='card-preview-frame' aria-busy={busy}>
            {preview ? <CardPreview src={preview} name={person.name}/> : <View className='card-preview-placeholder'><View className={busy ? 'ink-spinner' : 'preview-error-mark'}>{!busy && <Icon name='close' />}</View><Inline role='status'>{busy ? '正在生成纪念卡…' : error}</Inline>{error && <Button className='text-link' onClick={() => setRetry(value => value + 1)}>重新生成</Button>}</View>}
          </View>
          <Text className='card-preview-caption'>{theme === 'landscape' && region ? `${region.province} · ${region.landmark} · AI生成景观` : '素笺留影，记住这个名字'}<Text>1200 × 1800 PNG</Text></Text>
        </View>
        <View className='card-instructions'>
          <View className='card-controls'>
          <Text className='eyebrow'>把铭记，传递下去</Text>
          <Heading className='page-title serif'>把这个名字，<Inline className='block'>留在山河之间。</Inline></Heading>
          <Text className='page-description'>为{person.name}留下一张纪念卡。<Text className='block'>让熟悉的山川，陪伴一个值得记住的名字。</Text></Text>
          {<Fieldset className='card-theme-picker'><Legend>纪念卡样式</Legend><View className='card-theme-options'><Button className={theme === 'landscape' ? 'selected' : ''} aria-pressed={theme === 'landscape'} disabled={!region || busy || saving} onClick={() => setTheme('landscape')}><Inline className='theme-swatch scenic' />家乡山河{theme === 'landscape' && <Icon name='check' />}</Button><Button className={theme === 'portrait' ? 'selected' : ''} aria-pressed={theme === 'portrait'} disabled={busy || saving} onClick={() => setTheme('portrait')}><Inline className='theme-swatch plain' />素笺肖像{theme === 'portrait' && <Icon name='check' />}</Button></View></Fieldset>}
          </View>
          <Button className='primary-button card-save-button' loading={busy} disabled={!preview || saving} onClick={save}>{busy ? '正在生成纪念卡' : '保存这张纪念卡'}<Icon name='download' /></Button>
          {process.env.TARO_ENV === 'weapp' ? <Button className='outline-button' openType='share'>分享人物故事<Icon name='share' /></Button> : <Button className='outline-button' onClick={copy}>{copied ? '人物链接已复制' : '复制人物故事链接'}<Icon name={copied ? 'check' : 'share'} /></Button>}
          <View className='card-saving-guide'><Text>一份可以带走的纪念</Text><Paragraph>卡片附有人物档案二维码，分享后可扫码阅读{person.name}的完整生平与史料出处。{process.env.TARO_ENV === 'weapp' ? '点击保存，将图片存入相册。' : '手机长按图片保存，电脑下载 PNG。'}</Paragraph><Text className='scope-note'>{!region ? '家乡地域待核实，当前使用素笺肖像。' : theme === 'landscape' ? AI_LANDSCAPE_NOTE : '素笺肖像样式不包含AI景观。'}{person.portraitMissing ? '本人物历史肖像暂缺，卡片使用已标注的占位图。' : ''}</Text><Paragraph className='compliance-note'>保存与分享前请核对影像使用范围。<Link className='text-link' href='/about/#copyright'>查看图片版权说明</Link></Paragraph></View>
        </View>
      </View>
      {process.env.TARO_ENV === 'weapp' && <Canvas type='2d' className='export-canvas' canvasId='mini-card' id='mini-card' style={{ width: '600px', height: '900px' }} />}
      {showImage && preview && <Dialog onClose={() => setShowImage(false)} titleId='export-title' className='export-dialog'>
        <View className='export-dialog-heading'><Text id='export-title' className='serif'>保存纪念卡</Text><Button className='export-close' aria-label='关闭纪念卡图片' onClick={() => setShowImage(false)}><Icon name='close' /></Button></View>
        <img className='generated-card-image' src={preview} alt={`${person.name}的纪念卡，可长按保存`} />
        <Text className='export-image-hint'>手机长按图片保存，电脑点击下方下载。<Text className='block'>1200 × 1800 · PNG 图片</Text></Text>
        <Link className='primary-button image-download-link' href={preview} download={`名在山河-${person.name}-${theme === 'landscape' ? '家乡山河' : '素笺肖像'}.png`}>下载 PNG 图片<Icon name='download' /></Link>
      </Dialog>}
    </View>
    <View className='card-mobile-actions'><Button className='remember-button' onClick={copy} aria-label='复制人物故事链接'><Icon name={copied ? 'check' : 'share'} />{copied ? '已复制' : '复制链接'}</Button><Button className='primary-button' loading={busy} disabled={saving || (!preview && !error)} onClick={error ? () => setRetry(value => value + 1) : save}>{error ? '重新生成预览' : busy ? '正在生成' : '保存纪念卡'}<Icon name='download' /></Button></View>
  </Shell>
}
