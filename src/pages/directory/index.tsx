import Shell from '../../components/Shell'
import { usePageMetadata } from '../../seo/usePageMetadata'
import { people, lifeYears } from '../../data/people'
import { personPath } from '../../services/personLinks'

export default function Directory() {
  usePageMetadata('directory')
  return <Shell active='explore'><main className='container explore-main archive-main'>
    <p className='eyebrow'>开国将帅名录</p><h1 className='page-title serif'>全部人物档案</h1>
    <p className='page-description'>按军衔查阅 {people.length.toLocaleString()} 位将帅。重名人物以生卒与家乡区分，资料记载差异保留待核实说明。</p>
    <a className='text-link' href='/generals/'>按姓名与家乡搜索</a>
    <nav aria-label='按军衔浏览档案' className='archive-ranks'>{['元帅','大将','上将','中将','少将'].map((rank,index) => <a key={rank} className='text-link' href={`#rank-${index}`}>{rank}</a>)}</nav>
    {['元帅','大将','上将','中将','少将'].map((rank,index) => <section key={rank} className='archive-section'>
      <h2 id={`rank-${index}`} className='section-title serif'>{rank}<span className='archive-count'>{people.filter(person=>person.rank===rank).length} 位</span></h2>
      <ul className='archive-grid'>{people.filter(person=>person.rank===rank).map(person => <li key={person.id}><a href={personPath(person.id)}><span className='archive-name serif'>{person.name}</span><span>{person.hometown} · {lifeYears(person)}</span></a></li>)}</ul>
    </section>)}
  </main></Shell>
}
