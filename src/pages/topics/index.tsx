import { useEffect, useRef, useState } from 'react'
import Taro, { useDidShow, useRouter, useShareAppMessage } from '@tarojs/taro'
import { Text, View } from '@tarojs/components'
import { Main, Box, Inline, Heading, Heading2, Heading3, Paragraph, Nav, Link, Disclosure, Summary } from '../../components/Html'
import Shell, { openPage, openSource } from '../../components/Shell'
import Button from '../../components/Button'
import Icon from '../../components/Icon'
import { FeaturedTopic, TopicLinks } from '../../components/TopicLinks'
import Portrait from '../../components/Portrait'
import { people, lifeYears } from '../../data/people'
import { featuredTopic, getTopic, relatedTopics, sourceTitle, topics, topicPath, type Topic } from '../../data/topics'
import { getTopicReading, resetTopicReading, setTopicRead } from '../../services/topicReading'
import { pageHref, PUBLIC_SITE_URL } from '../../services/personLinks'
import { siteCompliance } from '../../services/compliance'
import { usePageMetadata } from '../../seo/usePageMetadata'

function useTopicId() {
  const { params } = useRouter()
  const read = () => {
    if (process.env.TARO_ENV !== 'h5') return params.id
    const match = /^\/topics\/([^/]+)\/?$/.exec(window.location.pathname)
    if (!match) return undefined
    try { return decodeURIComponent(match[1]) } catch { return 'invalid' }
  }
  const [id, setId] = useState<string | undefined>(read)
  useDidShow(() => setId(read()))
  useEffect(() => { setId(read()) }, [params.id])
  return id
}

export default function TopicsPage() {
  const id = useTopicId()
  const topic = getTopic(id)
  usePageMetadata(id && !topic ? 'missing' : 'topics', undefined, topic)
  useShareAppMessage(() => ({ title: `${topic?.title || '人物专题'}｜名在山河`, path: `/pages/topics/index${topic ? `?id=${topic.id}` : ''}` }))
  return <TopicView key={id || 'index'} id={id} topic={topic} />
}

function TopicView({ id, topic }: { id?: string; topic?: Topic }) {
  const [reading, setReading] = useState(() => getTopicReading(id || ''))
  const [message, setMessage] = useState<{ area: string; text: string } | null>(null)
  const [preference, setPreference] = useState('')
  const [directoryExpanded, setDirectoryExpanded] = useState(false)
  const [activeId, setActiveId] = useState(topic?.entries[0]?.id)
  const root = useRef<HTMLElement>(null)
  const activeEntry = topic?.entries.find(entry => entry.id === activeId)
  const nextUnread = topic?.entries.find(entry => !reading.includes(entry.id))

  function jump(entryId: string) {
    setDirectoryExpanded(false)
    setActiveId(entryId)
    if (process.env.TARO_ENV !== 'h5') { void Taro.pageScrollTo({ selector: `#topic-entry-${entryId}`, duration: 0 }); return }
    const target = root.current?.querySelector<HTMLElement>(`#topic-entry-${entryId}`)
    requestAnimationFrame(() => {
      target?.scrollIntoView({ block: 'start' })
      target?.focus({ preventScroll: true })
    })
  }

  useEffect(() => {
    if (!topic || process.env.TARO_ENV !== 'h5' || !root.current) return
    const element = root.current
    const page = element.closest('.taro_page')
    const headings = Array.from(element.querySelectorAll<HTMLElement>('.topic-person-name'))
    let frame = 0
    function update() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (!element.getClientRects().length) return
        const edge = window.matchMedia('(max-width: 760px)').matches ? 80 : 44
        const reached = headings.filter(heading => heading.getBoundingClientRect().top <= edge)
        const current = reached[reached.length - 1] || headings[0]
        if (current) setActiveId(current.id.slice('topic-entry-'.length))
      })
    }
    function followFragment() {
      const entry = topic?.entries.find(item => window.location.hash === `#topic-entry-${item.id}`)
      if (entry) jump(entry.id)
    }
    followFragment()
    update()
    page?.addEventListener('scroll', update, { passive: true })
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    window.addEventListener('hashchange', followFragment)
    return () => {
      cancelAnimationFrame(frame)
      page?.removeEventListener('scroll', update)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      window.removeEventListener('hashchange', followFragment)
    }
  }, [topic])

  function toggleRead(entryId: string) {
    if (!topic) return
    try { setReading(setTopicRead(topic.id, entryId, !reading.includes(entryId))); setMessage(null) }
    catch { setMessage({ area: entryId, text: '已读标记未能保存。请检查当前浏览器或设备是否允许本地存储，内容仍可继续阅读。' }) }
  }
  const mail = topic && siteCompliance.feedbackEmail ? `mailto:${siteCompliance.feedbackEmail}?subject=${encodeURIComponent(`专题阅读反馈：${topic.title}`)}&body=${encodeURIComponent(`专题：${topic.title}\n链接：${PUBLIC_SITE_URL.replace(/\/$/, '') + topicPath(topic.id)}\n我想继续阅读：${preference || '尚未选择'}\n\n我记住的一件事：\n阅读中遇到的困难：\n我会在什么场景再次使用：\n\n无需提供姓名、联系方式或其他个人信息。`)}` : ''

  if (id && !topic) return <Shell active='topics'><Main className='container explore-main'><Heading className='page-title serif'>暂未找到这篇专题</Heading><Button className='text-link' href='/topics/' onClick={() => openPage('topics')}>浏览全部人物专题</Button></Main></Shell>
  return <Shell active='topics'><Main className='container topics-main' ref={root}>
    {!topic ? <>
      <Heading className='page-title serif'>人物专题</Heading>
      <FeaturedTopic />
      <Heading2 className='topic-shelf-title serif'>将帅主题导览</Heading2>
      <View className='topic-shelf'><TopicLinks items={topics.filter(item => item !== featuredTopic && item.kind === '开国将帅专题')} /></View>
      <Heading2 className='topic-shelf-title serif'>地方人物</Heading2>
      <TopicLinks items={topics.filter(item => item.kind !== '开国将帅专题')} />
      <Button className='text-link' href='/generals/' onClick={() => openPage('explore')}>按姓名、军衔与家乡查找将帅<Icon name='arrow' /></Button>
    </> : <>
      <Button className='text-link' href='/topics/' onClick={() => openPage('topics')}><Icon name='back' />全部人物专题</Button>
      <View className='topic-heading'>
        <Text className='scope-note'>{topic.kind} · {topic.entries.length}位人物 · 约{topic.readMinutes}分钟</Text>
        <Heading className='page-title serif'>{topic.title.match(/[^：]+：?/g)?.map(part => <Inline className='topic-title-part' key={part}>{part}</Inline>)}</Heading>
        <Paragraph className='topic-intro'>{topic.intro}</Paragraph>
        {topic.scopeNote && <Paragraph className='scope-note'>{topic.scopeNote}</Paragraph>}
        {reading.length > 0 && <Button className='text-link topic-resume' href={`${topicPath(topic.id)}#topic-entry-${(nextUnread || topic.entries[0]).id}`} onClick={() => jump((nextUnread || topic.entries[0]).id)}>{nextUnread ? `接着读：${nextUnread.name}` : '从头重读'}<Icon name='arrow' /></Button>}
      </View>
      <View className='topic-reading-layout'>
        <Nav className={`topic-directory ${directoryExpanded ? 'is-expanded' : 'is-collapsed'}`} aria-label='专题人物目录' onKeyDown={event => {
          if (event.key === 'Escape' && directoryExpanded) {
            setDirectoryExpanded(false)
            root.current?.querySelector<HTMLElement>('.topic-directory-toggle')?.focus()
          }
        }}>
          <Heading2 className='topic-directory-title serif'>人物目录</Heading2>
          <Button className='topic-directory-toggle' aria-controls='topic-directory-panel' aria-expanded={directoryExpanded} onClick={() => setDirectoryExpanded(value => !value)}>
            <Text>人物目录</Text><Text className='topic-current-name'>{activeEntry?.name}</Text><Icon name='down' />
          </Button>
          <View className='topic-directory-panel' id='topic-directory-panel'>
            <Paragraph className='scope-note' aria-live='polite'>已标记读过 {reading.length} / {topic.entries.length} 节</Paragraph>
            <View className='topic-directory-names'>{topic.entries.map((entry, index) => <Button key={entry.id} className={`topic-directory-link ${activeId === entry.id ? 'is-current' : ''}`} href={`${topicPath(topic.id)}#topic-entry-${entry.id}`} onClick={() => jump(entry.id)} aria-current={activeId === entry.id ? 'location' : undefined} aria-label={`第${index + 1}节 ${entry.name}${reading.includes(entry.id) ? '，已标记读过' : ''}`}><Text className='topic-index'>{index + 1}</Text><Text>{entry.name}</Text>{reading.includes(entry.id) && <Icon name='check' />}</Button>)}</View>
            <Text className='scope-note'>已读标记仅保存在当前设备。</Text>
            {reading.length > 0 && <Button className='text-link topic-reset' onClick={() => { try { resetTopicReading(topic.id); setReading([]); setMessage(null) } catch { setMessage({ area: 'directory', text: '暂时无法清除已读标记，请稍后重试。' }) } }}>清除本专题已读标记</Button>}
            {message?.area === 'directory' && <Paragraph role='alert' className='topic-message'>{message.text}</Paragraph>}
          </View>
        </Nav>
        <View className='topic-article'>
          {topic.entries.map((entry, index) => {
            const archive = people.find(person => person.id === entry.archiveId)
            return <Box className='topic-entry' key={`${topic.id}-${entry.id}`}>
              <Text className='scope-note'>第{index + 1}节 / {topic.entries.length} · {entry.field}</Text>
              <View className='topic-entry-heading'>
                {archive && <Portrait className='topic-portrait' src={archive.portrait} name={archive.name} />}
                <View><Heading2 id={`topic-entry-${entry.id}`} tabIndex={-1} className='topic-person-name serif'>{entry.name}</Heading2><Heading3 className='topic-focus serif'>{entry.focus}</Heading3>{archive && <Text className='scope-note'>{lifeYears(archive)}</Text>}</View>
              </View>
              {archive?.pendingFields?.length ? <Paragraph className='historical-note'>档案部分资料待核实，请查阅完整档案中的差异说明。</Paragraph> : null}
              {entry.connection && <Paragraph className='topic-place'><Text className='detail-label'>{entry.connection.kind}</Text>{entry.connection.place}</Paragraph>}
              {entry.paragraphs.map((paragraph, paragraphIndex) => <Paragraph className='topic-paragraph topic-prose serif' key={paragraphIndex}>{paragraph.text}</Paragraph>)}
              <Disclosure className='topic-references'>
                <Summary className='topic-sources-toggle'>资料出处{entry.milestones.length ? '与年表' : ''}<Icon name='down' /></Summary>
                <Box className='topic-reference-list'>
                  {entry.paragraphs.map((paragraph, i) => <Box key={i} className='topic-reference-row'><Text>第{i + 1}段</Text><View className='topic-citations'>{paragraph.sourceUrls.map(url => <Button key={url} className='text-link' href={url} onClick={() => openSource(url)} aria-label={`${entry.name}第${i + 1}段资料出处：${sourceTitle(url)}`}>{sourceTitle(url)}<Icon name='external' /></Button>)}</View></Box>)}
                  {!!entry.milestones.length && <Box className='topic-milestones' aria-label={`${entry.name}的关键节点`}>{entry.milestones.map((milestone, i) => <View className='topic-milestone' key={i}><Text className='topic-milestone-label'>{milestone.label}</Text><Paragraph>{milestone.text}<Button className='text-link' href={milestone.sourceUrl} onClick={() => openSource(milestone.sourceUrl)} aria-label={`${entry.name}${milestone.label}节点的出处`}>出处</Button></Paragraph></View>)}</Box>}
                </Box>
              </Disclosure>
              {!!entry.pendingFields.length && <Box className='historical-note'><Text className='historical-note-title'>资料待核实</Text><Paragraph>{entry.fieldNote}</Paragraph><View className='topic-citations'>{entry.fieldSourceUrls?.map(url => <Button key={url} className='text-link' href={url} onClick={() => openSource(url)}>{sourceTitle(url)}<Icon name='external' /></Button>)}</View></Box>}
              <Paragraph className='topic-question'><Text className='scope-note'>带着一个问题继续读</Text>{entry.question}</Paragraph>
              {entry.relatedEntries?.map(relation => {
                const target = topic.entries.find(item => item.id === relation.id)
                return target && <Box className='topic-related' key={relation.id}><Text className='scope-note'>{relation.label}</Text><Paragraph>{relation.reason}</Paragraph><Button className='text-link' href={`${topicPath(topic.id)}#topic-entry-${target.id}`} onClick={() => jump(target.id)}>联读：{target.name}<Icon name='arrow' /></Button><View className='topic-citations'>{relation.sourceUrls.map((url, sourceIndex) => <Button key={url} className='text-link' href={url} onClick={() => openSource(url)} aria-label={`${entry.name}与${target.name}联读依据${sourceIndex + 1}`}>联读依据{sourceIndex + 1}<Icon name='external' /></Button>)}</View></Box>
              })}
              <View className='topic-entry-actions'><Button className='outline-button' aria-pressed={reading.includes(entry.id)} onClick={() => toggleRead(entry.id)}>{reading.includes(entry.id) ? '已读这一节' : '标记读过'}{reading.includes(entry.id) && <Icon name='check' />}</Button>{archive && <Button className='text-link' href={pageHref('person', `id=${archive.id}`)} onClick={() => openPage('person', `id=${archive.id}`)}>完整人物档案<Icon name='external' /></Button>}{index < topic.entries.length - 1 && <Button className='text-link' href={`${topicPath(topic.id)}#topic-entry-${topic.entries[index + 1].id}`} onClick={() => jump(topic.entries[index + 1].id)}>下一位：{topic.entries[index + 1].name}<Icon name='arrow' /></Button>}</View>
              {message?.area === entry.id && <Paragraph role='alert' className='topic-message'>{message.text}</Paragraph>}
            </Box>
          })}
          <View className='topic-finish'><Heading2 className='section-title serif'>延伸阅读</Heading2>{reading.length === topic.entries.length && <Paragraph className='scope-note'>已读完本专题全部{reading.length}节。</Paragraph>}<TopicLinks items={relatedTopics(topic)} /><Button className='text-link' href='/topics/' onClick={() => openPage('topics')}>查看全部人物专题<Icon name='arrow' /></Button></View>
          <View className='topic-feedback'><Heading2 className='topic-directory-title serif'>下一次，你想读什么？</Heading2><Paragraph>你的阅读建议，会帮助我们选择后续内容。</Paragraph><View className='topic-preferences'>{['地方人物', '主题故事', '学习导览'].map(option => <Button key={option} className={`filter-button ${preference === option ? 'selected' : ''}`} aria-pressed={preference === option} onClick={() => setPreference(option)}>{option}</Button>)}</View>{mail && <Link className='text-link' href={mail}>通过邮件反馈阅读感受<Icon name='external' /></Link>}<Paragraph className='scope-note'>选择不会自动发送。邮件内容由你确认后发送，无需提供个人信息。专题内容更新于{topic.updatedAt}。</Paragraph></View>
        </View>
      </View>
    </>}
  </Main></Shell>
}
