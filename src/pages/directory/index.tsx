import { Inline, Heading, Heading2, Paragraph, Nav, Main, Section, Link } from '../../components/Html'
import Shell from '../../components/Shell'
import { usePageMetadata } from '../../seo/usePageMetadata'
import { people, lifeYears } from '../../data/people'
import { personPath } from '../../services/personLinks'

export default function Directory() {
  usePageMetadata('directory')
  return <Shell active='explore'><Main className='container explore-main archive-main'>
    <Paragraph className='eyebrow'>开国将帅名录</Paragraph><Heading className='page-title serif'>全部人物档案</Heading>
    <Paragraph className='page-description'>按军衔查阅 {people.length.toLocaleString()} 位将帅。重名人物以生卒与家乡区分，资料记载差异保留待核实说明。</Paragraph>
    <Link className='text-link' href='/generals/'>按姓名与家乡搜索</Link>
    <Nav aria-label='按军衔浏览档案' className='archive-ranks'>{['元帅','大将','上将','中将','少将'].map((rank,index) => <Link key={rank} className='text-link' href={`#rank-${index}`}>{rank}</Link>)}</Nav>
    {['元帅','大将','上将','中将','少将'].map((rank,index) => <Section key={rank} className='archive-section'>
      <Heading2 id={`rank-${index}`} className='section-title serif'>{rank}<Inline className='archive-count'>{people.filter(person=>person.rank===rank).length} 位</Inline></Heading2>
      <ul className='archive-grid'>{people.filter(person=>person.rank===rank).map(person => <li key={person.id}><Link href={personPath(person.id)}><Inline className='archive-name serif'>{person.name}</Inline><Inline>{person.hometown} · {lifeYears(person)}</Inline></Link></li>)}</ul>
    </Section>)}
  </Main></Shell>
}
