import Shell from '../../components/Shell'
import { usePageMetadata } from '../../seo/usePageMetadata'
import { people, catalogueStats } from '../../data/people'

export default function AboutPage() {
  usePageMetadata('about')
  return <Shell><main className='container explore-main archive-main'>
    <p className='eyebrow'>关于这份纪念</p><h1 className='page-title serif'>让记忆，有来处。</h1>
    <section className='biography-section'><h2 className='biography-heading serif'>纪念馆与名录口径</h2>
      <p className='person-story serif'>山河有名是一份面向公众的数字纪念作品，从历史肖像、姓名与具体经历走近开国将帅的人生。现收录{people.length}份独立档案，包括10位元帅、10位大将、57位上将、177位中将和1360位少将。</p>
      <a className='text-link' href='https://cpc.people.com.cn/n1/2023/0424/c443712-32671924.html'>查阅《学习时报》统计口径</a>
    </section>
    <section className='biography-section'><h2 className='biography-heading serif'>来源与待核实资料</h2>
      <p className='person-story serif'>各人物档案保留生平与影像来源，可查阅原文。{catalogueStats.pendingPeople}位人物的部分资料存在记载差异，相关字段显示“待核实”，相应人生节点和纪念卡同步处理。籍贯保留来源记载，不等同于今日行政区划；地域未确定时不推测配景。资料快照与自动检查不代表已完成全量人工史学审校。</p>
    </section>
    <section className='biography-section'><h2 className='biography-heading serif'>历史影像与使用说明</h2>
      <p className='person-story serif'>目前{catalogueStats.portraits}位人物有本地历史肖像，其余明确占位。保留源图全部画面，不用AI生成肖像。各省份景观为当代地域文化意象，不作为人物曾到访的史料。素材许可分别保留，使用前应核对出处及使用范围；本项目不代表资料来源机构。</p>
    </section>
    <a className='primary-button' href='/people/'>查阅全部人物档案</a>
  </main></Shell>
}
