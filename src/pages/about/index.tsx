import { Heading, Heading2, Paragraph, Main, Section, Link } from '../../components/Html'
import Shell from '../../components/Shell'
import AnalyticsNotice from '../../components/AnalyticsNotice'
import { usePageMetadata } from '../../seo/usePageMetadata'
import { people, catalogueStats } from '../../data/people'
import ComplianceSections from '../../components/ComplianceSections'

export default function AboutPage() {
  usePageMetadata('about')
  return <Shell><Main className='container explore-main archive-main'>
    <Paragraph className='eyebrow'>关于这份纪念</Paragraph><Heading className='page-title serif'>让记忆，有来处。</Heading>
    <Section className='biography-section'><Heading2 className='biography-heading serif'>纪念馆与名录口径</Heading2>
      <Paragraph className='person-story serif'>名在山河是一份面向公众的数字纪念作品，从历史肖像、姓名与具体经历走近开国将帅的人生。现收录{people.length}份独立档案，包括10位元帅、10位大将、57位上将、177位中将和1360位少将。</Paragraph>
      <Link className='text-link' href='https://cpc.people.com.cn/n1/2023/0424/c443712-32671924.html'>查阅《学习时报》统计口径</Link>
    </Section>
    <Section className='biography-section'><Heading2 className='biography-heading serif'>来源与待核实资料</Heading2>
      <Paragraph className='person-story serif'>各人物档案保留生平与影像来源，可查阅原文。{catalogueStats.pendingPeople}位人物的部分资料存在记载差异，相关字段显示“待核实”，相应人生节点和纪念卡同步处理。籍贯保留来源记载，不等同于今日行政区划；地域未确定时不推测配景。资料快照与自动检查不代表已完成全量人工史学审校。</Paragraph>
    </Section>
    <Section className='biography-section'><Heading2 className='biography-heading serif'>历史影像与使用说明</Heading2>
      <Paragraph className='person-story serif'>目前{catalogueStats.portraits}位人物有本地历史肖像，其余明确占位。保留源图全部画面，不用AI生成肖像。影像出处可供核查，具体授权及使用范围仍在逐项核验。</Paragraph>
    </Section>
    <ComplianceSections />
    <AnalyticsNotice />
    <Link className='primary-button compliance-directory' href='/people/'>查阅全部人物档案</Link>
  </Main></Shell>
}
