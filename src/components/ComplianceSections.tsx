import { AI_LANDSCAPE_NOTE, feedbackUrl, siteCompliance } from '../services/compliance'

export default function ComplianceSections() {
  const copyright = feedbackUrl('copyright')
  const correction = feedbackUrl('correction')
  return <>
    <section id='copyright' className='biography-section compliance-section' aria-labelledby='copyright-title'>
      <h2 id='copyright-title' className='biography-heading serif'>图片版权与使用范围</h2>
      <p className='person-story'>历史影像及引用资料的权利归相应权利人。人物页的来源链接用于查阅和核验，来源标注不等于取得转载、下载或再传播授权。图片权属、保护期限及具体使用范围仍在逐项核验，请勿将网站展示或纪念卡下载理解为开放使用许可。</p>
      <p className='person-story'>如果你认为某张图片或资料涉及你的合法权益，请说明人物姓名、页面链接、涉及内容、权利依据及处理诉求。我们将据此核验，并对需要更正或停止使用的内容作相应处理。</p>
      {copyright && <a className='text-link compliance-action' href={copyright}>反馈图片权利问题</a>}
    </section>
    <section id='correction' className='biography-section compliance-section' aria-labelledby='correction-title'>
      <h2 id='correction-title' className='biography-heading serif'>资料勘误</h2>
      <p className='person-story'>欢迎提供有出处的更正。请附人物姓名、页面链接、问题位置、建议更正内容，以及可查阅的网址或书刊名称、版本、页码。存在来源差异的资料会继续保留待核实提示，核验后再更新。</p>
      {correction && <a className='text-link compliance-action' href={correction}>提交资料勘误</a>}
      {siteCompliance.feedbackEmail && <p className='compliance-note'>版权与勘误联系邮箱：<a href={`mailto:${siteCompliance.feedbackEmail}`}>{siteCompliance.feedbackEmail}</a>。点击反馈入口会打开邮件草稿，由你确认后发送；本网站不代为发送邮件。来信材料用于核验、回复和处理反馈。</p>}
    </section>
    <section id='ai-landscapes' className='biography-section compliance-section' aria-labelledby='ai-landscapes-title'>
      <h2 id='ai-landscapes-title' className='biography-heading serif'>AI景观与历史影像</h2>
      <p className='person-story'>{AI_LANDSCAPE_NOTE}山河意象不用于证明人物曾到访、居住或作战。我们不使用AI生成、补脸或重绘人物肖像；缺少可靠原照时继续保留占位。</p>
    </section>
    <section id='site-info' className='biography-section compliance-section' aria-labelledby='site-info-title'>
      <h2 id='site-info-title' className='biography-heading serif'>网站主办与备案公示</h2>
      <p className='person-story'>主办者：{siteCompliance.operator}。本网站为个人整理的历史资料与数字纪念作品，不代表政府、军队、纪念场馆或资料来源机构。</p>
      <div className='compliance-links'>
        <a href={siteCompliance.icpUrl} target='_blank' rel='noopener noreferrer'>{siteCompliance.icpNumber}</a>
        {siteCompliance.policeNumber && siteCompliance.policeUrl && <a href={siteCompliance.policeUrl} target='_blank' rel='noopener noreferrer'>{siteCompliance.policeNumber}</a>}
      </div>
    </section>
  </>
}
