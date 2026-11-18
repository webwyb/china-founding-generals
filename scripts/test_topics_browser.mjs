/** Isolated headless desktop Chrome QA. Never operates on the user's tabs. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdtemp, readFile, readdir, writeFile, mkdir, stat, rm } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const output = resolve(root, 'dist/h5'), evidence = resolve(root, 'docs/reviews/generals-topics-2026-11-18')
let origin
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const directory = await mkdtemp(resolve(tmpdir(), 'shanhe-topic-chrome-'))
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' }
let server, chrome, socket
const notes = [], exceptions = []
try {
  server = createServer(async (request, response) => {
    try {
      let path = resolve(output, '.' + decodeURIComponent(new URL(request.url, origin).pathname))
      assert.ok(path === output || path.startsWith(output + sep))
      if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html')
      response.setHeader('Content-Type', mime[extname(path)] || 'application/octet-stream')
      response.end(await readFile(path))
    } catch { response.writeHead(404); response.end('Not found') }
  })
  await new Promise((yes, no) => { server.once('error', no); server.listen(0, '127.0.0.1', yes) })
  origin = 'http://127.0.0.1:' + server.address().port
  const binary = process.env.SHANHE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  chrome = spawn(binary, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${directory}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' })
  chrome.once('error', error => exceptions.push(error.message))
  let port
  for (let attempt = 0; attempt < 120; attempt++) {
    const active = await readFile(resolve(directory, 'DevToolsActivePort'), 'utf8').catch(() => '')
    if (active) { port = active.split('\n')[0]; break }
    if (chrome.exitCode !== null) throw Error(`Chrome已退出：${chrome.exitCode}`)
    await pause(250)
  }
  assert.ok(port, 'Chrome调试入口未就绪')
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' })).json()
  socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((yes, no) => { socket.addEventListener('open', yes, { once: true }); socket.addEventListener('error', no, { once: true }) })
  let sequence = 0
  const requests = new Map()
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    if (message.id) { const pending = requests.get(message.id); if (!pending) return; requests.delete(message.id); clearTimeout(pending.timer); message.error ? pending.no(Error(JSON.stringify(message.error))) : pending.yes(message.result) }
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text)
  })
  const send = (method, params = {}) => new Promise((yes, no) => {
    const id = ++sequence
    const timer = setTimeout(() => { requests.delete(id); no(Error(`CDP timeout: ${method}`)) }, 20000)
    requests.set(id, { yes, no, timer }); socket.send(JSON.stringify({ id, method, params }))
  })
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text)
    return result.result.value
  }
  const until = async expression => {
    for (let attempt = 0; attempt < 120; attempt++) { if (await evaluate(expression)) return; await pause(100) }
    throw Error(`页面条件未满足：${expression}`)
  }
  const ready = path => until(`location.pathname === ${JSON.stringify(path)} && document.documentElement.dataset.routeReady === ${JSON.stringify(path)} && !document.getElementById('prerender')`)
  const navigate = async path => { await send('Page.navigate', { url: origin + path }); await ready(path); await evaluate('document.fonts.ready.then(()=>true)') }
  const click = text => evaluate(`(()=>{const target=[...document.querySelectorAll('a,button')].find(element=>element.getClientRects().length&&element.textContent.trim()===${JSON.stringify(text)});if(!target)throw Error('找不到控件：'+${JSON.stringify(text)});target.click();return true})()`)
  const pointerClick = async selector => {
    const point = await evaluate(`(()=>{const target=document.querySelector(${JSON.stringify(selector)}),rect=target.getBoundingClientRect();const x=rect.left+rect.width/2,y=rect.top+rect.height/2;return {x,y,reachable:target.contains(document.elementFromPoint(x,y))}})()`)
    assert.ok(point.reachable, `控件必须能从屏幕上直接点中：${selector}`)
    for (const type of ['mousePressed', 'mouseReleased']) {
      await send('Input.dispatchMouseEvent', { type, x: point.x, y: point.y, button: 'left', clickCount: 1 })
    }
  }
  await send('Page.enable'); await send('Runtime.enable')
  await mkdir(evidence, { recursive: true })
  const topicFiles = await readdir(resolve(root, 'data/topics'))
  const paths = ['/', '/topics/', ...topicFiles.filter(file => file.endsWith('.json') && file !== 'sources.json').map(file => '/topics/' + file.slice(0, -5) + '/')]
  for (const width of [320, 390, 768, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false })
    for (const path of paths) {
      await navigate(path)
      if (width === 390 && path === '/topics/marshals/') {
        assert.equal(await evaluate(`getComputedStyle(document.querySelector('.topic-directory-names')).display`), 'none')
        await evaluate(`document.querySelector('.topic-directory-toggle').click()`)
        assert.equal(await evaluate(`getComputedStyle(document.querySelector('.topic-directory-names')).display`), 'grid')
        await evaluate(`document.querySelector('.topic-directory-toggle').click()`)
        notes.push({ check: '390px人物目录展开和收起' })
      }
      const dimensions = await evaluate(`({width:innerWidth,body:document.body.scrollWidth,scroll:document.scrollingElement.scrollWidth,main:[...document.querySelectorAll('main')].filter(e=>e.getClientRects().length).map(e=>({scroll:e.scrollWidth,client:e.clientWidth})),h1:[...document.querySelectorAll('h1')].filter(e=>e.getClientRects().length).map(e=>e.textContent)})`)
      assert.equal(dimensions.width, width)
      assert.ok(dimensions.body <= width + 1 && dimensions.scroll <= width + 1 && dimensions.main.every(main => main.scroll <= main.client + 1), JSON.stringify({ path, dimensions }))
      assert.equal(dimensions.h1.length, 1)
      notes.push({ check: '实际CSS视口与无横向溢出', path, width, dimensions })
      if ((width === 390 || width === 1440) && ['/topics/', '/topics/military-schools/'].includes(path)) {
        const screenshot = await send('Page.captureScreenshot', { format: 'png' })
        await writeFile(resolve(evidence, `${path === '/topics/' ? 'index' : path.split('/')[2]}-${width}.png`), Buffer.from(screenshot.data, 'base64'))
      }
    }
  }
  await navigate('/')
  await click('全部人物专题'); await ready('/topics/')
  await evaluate(`document.querySelector('a[href="/topics/marshals/"]').click()`); await ready('/topics/marshals/')
  assert.equal(await evaluate(`document.querySelectorAll('.topic-entry').length`), 10)
  await click('标记读过')
  assert.ok((await evaluate(`document.querySelector('.topic-directory').textContent`)).includes('已标记读过 1 / 10'))
  const priorDocument = await evaluate('performance.timeOrigin')
  await send('Page.reload'); await until(`performance.timeOrigin !== ${priorDocument}`); await ready('/topics/marshals/')
  assert.ok((await evaluate(`document.querySelector('.topic-directory').textContent`)).includes('已标记读过 1 / 10'))
  await click('下一位：彭德怀')
  await until(`document.activeElement.id === 'topic-entry-p0002'`)
  await click('联读：徐向前')
  await until(`document.activeElement.id === 'topic-entry-xuxiangqian'`)
  const portraits = await evaluate(`[...document.querySelectorAll('img.topic-portrait')].map(image=>({fit:getComputedStyle(image).objectFit,width:image.width,height:image.height}))`)
  assert.equal(portraits.length, 10); assert.ok(portraits.every(image => image.fit === 'contain'))
  notes.push({ check: '首页进入专题、十节完整、标记后刷新恢复、下一节标题焦点与完整人像', portraits })
  await evaluate(`document.querySelector('.topic-entry a[href="/people/zhude/"]').click()`); await ready('/people/zhude/')
  assert.equal(await evaluate(`[...document.querySelectorAll('h1')].find(element=>element.getClientRects().length).textContent`), '朱德')
  await click('十位元帅：从战争到建设'); await ready('/topics/marshals/')
  await click('清除本专题已读标记')
  assert.ok((await evaluate(`document.querySelector('.topic-directory').textContent`)).includes('已标记读过 0 / 10'))
  await evaluate(`document.querySelector('a[href="/topics/shanghai/"]').click()`); await ready('/topics/shanghai/')
  assert.equal(await evaluate(`document.querySelectorAll('.topic-entry').length`), 10)
  assert.ok((await evaluate(`document.body.textContent`)).includes('故居入住年份存在来源差异'))
  assert.equal(await evaluate(`document.querySelectorAll('img.topic-portrait').length`), 1)
  await click('地方人物')
  const mail = await evaluate(`document.querySelector('.topic-feedback a[href^="mailto:"]').href`)
  assert.ok(new URL(mail).searchParams.get('body').includes('我想继续阅读：地方人物'))
  assert.ok(new URL(mail).searchParams.get('body').includes('/topics/shanghai/'))
  notes.push({ check: '完整档案往返、两专题切换、重置、上海10人及资料冲突提示、反馈邮件草稿内容' })
  // CDP dispatches actual keyboard input; native tab handling is exercised here.
  await evaluate(`document.querySelector('.topic-directory-link').focus()`)
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
  await until(`document.activeElement.id === 'topic-entry-huang'`)
  notes.push({ check: '目录链接键盘Enter与目标标题焦点' })
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: false })
  await navigate('/topics/marshals/')
  await evaluate(`window.__topicStorageWrite=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Test storage full','QuotaExceededError')};document.querySelector('.topic-entry-actions button').scrollIntoView({block:'center'})`)
  await click('标记读过')
  await until(`document.querySelectorAll('.topic-entry .topic-message[role="alert"]').length === 1`)
  const failure = await evaluate(`(()=>{const entry=document.querySelector('.topic-entry'),message=entry.querySelector('.topic-message'),button=entry.querySelector('.topic-entry-actions button');return {message:message.textContent,marked:button.getAttribute('aria-pressed'),top:message.getBoundingClientRect().top,bottom:message.getBoundingClientRect().bottom,viewport:innerHeight,total:document.querySelectorAll('.topic-message').length}})()`)
  assert.ok(failure.message.includes('已读标记未能保存'))
  assert.equal(failure.marked, 'false'); assert.equal(failure.total, 1)
  assert.ok(failure.top >= 0 && failure.bottom <= failure.viewport, '存储失败提示必须在当前操作旁可见')
  await evaluate(`Storage.prototype.setItem=window.__topicStorageWrite`)
  await click('标记读过')
  await until(`document.querySelectorAll('.topic-message').length === 0`)
  assert.ok((await evaluate(`document.querySelector('.topic-directory').textContent`)).includes('已标记读过 1 / 10'))
  notes.push({ check: '390px实际存储写入失败时原位提示、标记不误报、恢复存储后可重试', failure })
  await evaluate(`document.querySelector('.topic-directory-toggle').click()`)
  await evaluate(`window.__topicStorageRemove=Storage.prototype.removeItem;Storage.prototype.removeItem=function(){throw new DOMException('Test storage denied','SecurityError')};document.querySelector('.topic-reset').scrollIntoView({block:'center'})`)
  await click('清除本专题已读标记')
  await until(`document.querySelector('.topic-directory .topic-message[role="alert"]') !== null`)
  assert.ok((await evaluate(`document.querySelector('.topic-directory').textContent`)).includes('已标记读过 1 / 10'))
  assert.equal(await evaluate(`document.querySelectorAll('.topic-message').length`), 1)
  await evaluate(`Storage.prototype.removeItem=window.__topicStorageRemove`)
  await click('清除本专题已读标记')
  await until(`document.querySelectorAll('.topic-message').length === 0`)
  assert.ok((await evaluate(`document.querySelector('.topic-directory').textContent`)).includes('已标记读过 0 / 10'))
  notes.push({ check: '实际清除存储失败时目录原位提示、保留已读计数、恢复后可清除' })
  await navigate('/topics/')
  const feature = await evaluate(`[...document.querySelectorAll('.topic-feature-photo')].map(img => ({ loaded: img.complete && img.naturalWidth > 0, fit: getComputedStyle(img).objectFit, name: img.alt }))`)
  assert.ok(feature.length === 3 && feature.every(img => img.loaded && img.fit === 'contain'))
  await evaluate(`document.querySelector('.topic-feature').click()`); await ready('/topics/military-schools/')
  await click('标记读过')
  await navigate('/topics/military-schools/')
  await click('接着读：陈赓')
  await until(`document.activeElement.id === 'topic-entry-p0016' && document.querySelector('.topic-current-name').textContent === '陈赓'`)
  await until(`document.activeElement.getBoundingClientRect().top < 150 && document.querySelector('.topic-directory').getBoundingClientRect().top < 2`)
  const section = await evaluate(`(()=>{const heading=document.activeElement.getBoundingClientRect(),nav=document.querySelector('.topic-directory').getBoundingClientRect();return {top:heading.top,barBottom:nav.bottom,barTop:nav.top}})()`)
  assert.ok(section.barTop >= -1 && section.top >= section.barBottom - 1 && section.top < 150, JSON.stringify(section))
  const readingShot = await send('Page.captureScreenshot', { format: 'png' })
  await writeFile(resolve(evidence, 'reading-390.png'), Buffer.from(readingShot.data, 'base64'))
  await pointerClick('.topic-directory-toggle')
  await evaluate(`document.querySelector('.topic-directory-link').focus()`)
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await until(`document.activeElement.matches('.topic-directory-toggle') && document.activeElement.getAttribute('aria-expanded') === 'false'`)
  await pointerClick('.topic-directory-toggle')
  await pointerClick('.topic-directory-link:nth-child(3)')
  await until(`document.activeElement.id === 'topic-entry-zhangzhen' && document.querySelector('.topic-directory-toggle').getAttribute('aria-expanded') === 'false' && document.querySelector('.topic-directory-link[aria-current="location"]').textContent.includes('张震')`)
  await evaluate(`document.querySelectorAll('.topic-references summary')[2].focus()`)
  assert.equal(await evaluate('document.activeElement.tagName'), 'SUMMARY')
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', unmodifiedText: '\r', windowsVirtualKeyCode: 13 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
  const disclosure = await evaluate(`(()=>{const details=document.querySelectorAll('.topic-references')[2];return {tag:details.tagName, open:details.open, first:details.firstElementChild?.tagName, focused:document.activeElement.outerHTML.slice(0,180), link:details.querySelector('a')?.getBoundingClientRect().width}})()`)
  assert.ok(disclosure.open && disclosure.link > 0, JSON.stringify(disclosure))
  await send('Page.navigate', { url: origin + '/topics/supply/#topic-entry-p0020' }); await ready('/topics/supply/')
  await until(`document.activeElement.id === 'topic-entry-p0020'`)
  await evaluate(`document.querySelectorAll('.topic-person-name')[2].scrollIntoView({block:'start'})`)
  await until(`document.querySelector('.topic-current-name').textContent === '洪学智'`)
  notes.push({ check: '主打肖像、刷新续读、吸顶目录鼠标命中与键盘退出、滚动章节跟随、折叠出处与直接章节链接', feature, section })
  assert.deepEqual(exceptions, [], '运行时未捕获异常')
  const browser = await send('Browser.getVersion')
  const report = { status: 'passed', checkedAt: '2026-11-18', browser, method: 'Isolated headless desktop Chrome through CDP with actual DOM/layout, DOM and pointer clicks, application navigation, local storage and keyboard input. No touch hardware, mobile device, WeChat, screen reader, production visit or reader study.', notes, exceptions }
  await writeFile(resolve(root, 'data/testing/topics-browser.json'), JSON.stringify(report, null, 2) + '\n')
  console.log(`无头Chrome专题验收通过：${notes.length}项观察，5张截图。未执行手机、微信真机或真实读者验证。`)
} finally {
  socket?.close()
  if (chrome && chrome.exitCode === null) {
    chrome.kill('SIGTERM')
    await Promise.race([new Promise(resolve => chrome.once('exit', resolve)), pause(3000)])
    if (chrome.exitCode === null) chrome.kill('SIGKILL')
  }
  if (server) await new Promise(resolve => server.close(resolve))
  await rm(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 })
}
