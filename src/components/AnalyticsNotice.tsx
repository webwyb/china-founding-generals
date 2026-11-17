export default function AnalyticsNotice() {
  return <section id='analytics' className='biography-section' aria-labelledby='analytics-title'>
    <h2 id='analytics-title' className='biography-heading serif'>访问统计与隐私</h2>
    <p className='person-story'>正式站点使用腾讯云前端性能监控，了解页面访问量、来源站点、浏览器与设备类型，以及抽样的页面性能。服务会接收网络连接的IP信息，用于粗略地域分析；浏览器保存随机设备标识，用于统计独立访客。不同浏览器、设备或清除浏览器数据后可能重复计数，独立访客数不等于实际人数。</p>
    <p className='person-story'>统计不上传搜索词、铭记清单或邮件内容，不采集点击内容，不启用录屏或会话回放。网页地址中的查询参数和段落锚点会在发送前移除。浏览器开启“不跟踪”或全局隐私控制时，本站不启用访问统计。</p>
    <a className='text-link' href='https://cloud.tencent.com/product/rum' target='_blank' rel='noopener noreferrer'>了解腾讯云前端性能监控</a>
  </section>
}
