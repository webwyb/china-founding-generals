import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const require = createRequire(import.meta.url)
const { build } = require('esbuild')
const root = fileURLToPath(new URL('..', import.meta.url))
const output = resolve(root, '.cache/analytics-check/rum.cjs')
await mkdir(resolve(root, '.cache/analytics-check'), { recursive: true })
await build({
  entryPoints: [resolve(root, 'src/analytics/rum.ts')], bundle: true, platform: 'node', format: 'cjs', outfile: output,
  plugins: [{ name: 'sdk-constructor-adapter', setup(builder) {
    builder.onResolve({ filter: /^aegis-web-sdk$/ }, () => ({ path: 'sdk', namespace: 'analytics-test' }))
    builder.onLoad({ filter: /.*/, namespace: 'analytics-test' }, () => ({ contents: `
      export default class Aegis {
        constructor(options) { globalThis.analyticsCalls.push(options) }
        setConfig(options) { globalThis.analyticsUin = options.uin }
      }`, loader: 'js' }))
  } }],
})
const { shouldTrack, pageAddress, cleanRequest, analyticsOptions } = require(output)
const site = 'https://shanhe.binnwu.top'
let count = 0
function check(name, fn) { fn(); count++; console.log('通过：' + name) }

check('仅生产HTTPS域名启用，尊重隐私偏好与旧链接迁移', () => {
  assert.ok(shouldTrack({ href: site + '/people/suyu/' }))
  for (const href of ['http://shanhe.binnwu.top/', 'http://49.233.60.125/', 'http://localhost:5173/',
    'https://shanhe.binnwu.top.evil.example/', site + '/#/pages/person/index?id=suyu', 'not a URL']) {
    assert.equal(shouldTrack({ href }), false)
  }
  assert.equal(shouldTrack({ href: site, doNotTrack: '1' }), false)
  assert.equal(shouldTrack({ href: site, globalPrivacyControl: true }), false)
  assert.equal(pageAddress(site + '/people/suyu/?q=private#life'), site + '/people/suyu/')
})
check('页面访问去重，人物切换与返回保留PV，查询和锚点不增加PV', () => {
  let href = site + '/people/suyu/'
  const options = analyticsOptions(() => ({ href }))
  const visit = () => options.beforeRequest({ logType: 'pv', logs: null })
  assert.notEqual(visit(), false)
  href += '?search=private#life'
  assert.equal(visit(), false)
  href = site + '/people/zhude/'
  assert.notEqual(visit(), false)
  href = site + '/people/suyu/'
  assert.notEqual(visit(), false)
  assert.equal(visit(), false)
  assert.equal(options.beforeRequest({ logType: 'log', logs: { msg: 'private' } }), false)
  assert.equal(options.beforeRequest({ logType: 'speed', logs: {} }), false)
  assert.equal(options.beforeRequest({ logType: 'event', logs: {} }), false)
})
check('SDK真实请求结构中的页面/来源查询、锚点与UIN均被移除', () => {
  const url = new URL('https://rumt-zh.com/collect/pv')
  url.searchParams.set('id', 'application')
  url.searchParams.set('from', site + '/people/suyu/?q=secret#life')
  url.searchParams.set('originFrom', site + '/?token=secret')
  url.searchParams.set('referer', 'https://search.example/private?search=secret#part')
  url.searchParams.set('uin', 'secret-account')
  const result = cleanRequest({ url: url.href })
  const cleaned = new URL(result.url)
  assert.equal(cleaned.searchParams.get('from'), site + '/people/suyu/')
  assert.equal(cleaned.searchParams.get('originFrom'), site + '/')
  assert.equal(cleaned.searchParams.get('referer'), 'https://search.example')
  assert.equal(cleaned.searchParams.has('uin'), false)
  assert.equal(cleaned.searchParams.get('id'), 'application')
  assert.equal(JSON.stringify(result).includes('secret'), false)
  const body = cleanRequest({ url: 'https://rumt-zh.com/speed/performance', data: JSON.stringify({
    uin: 'secret-account', from: encodeURIComponent(site + '/?q=secret'),
    nested: [{ referer: 'https://search.example/secret?q=secret', ttfb: 12 }],
  }) })
  assert.equal(JSON.stringify(body).includes('secret'), false)
  assert.equal(JSON.parse(body.data).nested[0].ttfb, 12)
})
check('非许可采集地址和无法安全处理的正文被拒绝', () => {
  for (const url of ['https://other.example/collect/pv', 'http://rumt-zh.com/collect/pv',
    'https://user:password@rumt-zh.com/collect/pv', 'https://rumt-zh.com/collect/events']) {
    assert.equal(cleanRequest({ url }), undefined)
  }
  assert.equal(cleanRequest({ url: 'https://rumt-zh.com/speed/performance', data: 'unparseable=secret' }), undefined)
})
check('上报途中启用隐私偏好时停止后续请求', () => {
  const options = analyticsOptions(() => ({ href: site, doNotTrack: '1' }))
  assert.equal(options.beforeRequest({ logType: 'pv', logs: null }), false)
  assert.equal(options.onBeforeRequest({ url: 'https://rumt-zh.com/collect/pv' }), undefined)
})

// Test only the lazy-loader boundary with a constructor adapter, not SDK internals.
const oldWindow = globalThis.window, navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
try {
  globalThis.analyticsCalls = []
  globalThis.window = { location: { href: 'http://localhost:5173/' } }
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { doNotTrack: '0' } })
  await require(output).startAnalytics()
  assert.equal(globalThis.analyticsCalls.length, 0)
  globalThis.window.location.href = site + '/'
  await Promise.all([require(output).startAnalytics(), require(output).startAnalytics()])
  assert.equal(globalThis.analyticsCalls.length, 1)
  assert.equal(globalThis.analyticsUin, '')
  console.log('通过：本地不加载SDK，生产初始化去重并清空UIN')
  count++
  delete require.cache[output]
  globalThis.analyticsCalls = []
  const pending = require(output).startAnalytics()
  navigator.doNotTrack = '1'
  await pending
  assert.equal(globalThis.analyticsCalls.length, 0)
  console.log('通过：异步加载期间隐私偏好改变时不创建SDK实例')
  count++
} finally {
  if (oldWindow === undefined) delete globalThis.window
  else globalThis.window = oldWindow
  if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor)
  else delete globalThis.navigator
  delete globalThis.analyticsCalls
  delete globalThis.analyticsUin
}
console.log(`${count}项访问统计边界回归通过；未连接真实采集服务。`)
