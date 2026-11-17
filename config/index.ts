import { defineConfig } from '@tarojs/cli'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { posix, resolve } from 'node:path'
const { manifest } = require('../scripts/deploy/asset-manifest.cjs')
const { dataVersion } = require('../scripts/data-version.cjs')
const isMini = process.env.TARO_ENV === 'weapp'
const miniSettings = require('./weapp.json')
const assetBase = process.env.SHANHE_ASSET_BASE_URL || (isMini ? miniSettings.assetBase : '')
const assetUrls = Object.fromEntries(manifest(resolve(__dirname, '../public'), assetBase).filter((asset: { path: string }) => !isMini || /^(portraits|landscapes)\//.test(asset.path)).map((asset: { path: string; url: string }) => [asset.path, asset.url]))
if (isMini) {
  for (const name of ['zhude', 'xuxiangqian', 'suyu', 'xuhaidong', 'hongxuezhi', 'chenqihan', 'zhangzhen', 'lizhen']) {
    const hash = createHash('sha256').update(readFileSync(resolve(__dirname, `../src/assets/portraits/${name}.jpg`))).digest('hex')
    assetUrls[`featured/${name}.jpg`] = `${assetBase}/${hash}/${name}.jpg`
  }
}
const catalogue = require('../src/data/catalog.generated.json') as { id: string }[]

// These are browser URLs, not filesystem paths. Taro's default path.join
// emits backslashes on Windows, which can become JS string escapes.
const assetName = (directory: string) => (filename: string) =>
  posix.join('static', directory, posix.basename(filename.replace(/\\/g, '/')))

export default defineConfig<'vite'>({
  projectName: 'shanhe-youming',
  date: '2026-11-16',
  designWidth: 375,
  deviceRatio: {
    375: 2,
    640: 1.17,
    750: 1,
    828: 0.905
  },
  sourceRoot: 'src',
  outputRoot: `dist/${process.env.TARO_ENV || 'h5'}`,
  framework: 'react',
  compiler: {
    type: 'vite',
    vitePlugins: isMini ? [{ name: 'mini-external-assets', config: () => ({ publicDir: false }) }] : []
  },
  cache: { enable: false },
  plugins: [],
  copy: {
    patterns: isMini ? [{ from: resolve(__dirname, '../public/brand/icon.png'), to: 'static/brand/icon.png' }, { from: resolve(__dirname, '../src/assets/portrait-placeholder.png'), to: 'static/portrait-placeholder.png' }, { from: resolve(__dirname, '../public/licenses/qrcode-generator-MIT.txt'), to: 'licenses/qrcode-generator-MIT.txt' }, { from: resolve(__dirname, '../public/fonts/OFL-NotoSerifSC.txt'), to: 'licenses/OFL-NotoSerifSC.txt' }] : [{ from: resolve(__dirname, '../public'), to: 'static' }],
    options: {}
  },
  // The watch server does not run the static-data generator. Keep complete
  // records in development; release builds emit versioned JSON below /js/.
  defineConstants: { __SHANHE_MINI_FONT__: JSON.stringify(`${assetBase}/${createHash('sha256').update(readFileSync(resolve(__dirname, '../src/assets/fonts/shanhe-serif.woff2'))).digest('hex')}/shanhe-serif.woff2`), __SHANHE_MINI_DATA_ROOT__: JSON.stringify(`${miniSettings.siteOrigin}/js/person-data/${dataVersion(resolve(__dirname, '..'), assetBase)}`), __SHANHE_ASSET_URLS__: JSON.stringify(assetUrls), __SHANHE_CLIENT__: JSON.stringify(process.env.TARO_ENV === 'h5' && process.env.NODE_ENV === 'production'), __SHANHE_DATA_VERSION__: JSON.stringify(dataVersion(resolve(__dirname, '..'))) },
  mini: {
    postcss: {
      pxtransform: { enable: true },
      cssModules: { enable: false }
    }
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    imageUrlLoaderOption: { name: assetName('images') },
    fontUrlLoaderOption: { name: assetName('fonts') },
    mediaUrlLoaderOption: { name: assetName('media') },
    router: {
      mode: 'browser',
      customRoutes: {
        '/pages/index/index': '/',
        '/pages/explore/index': '/generals/',
        '/pages/person/index': catalogue.map(person => `/people/${encodeURIComponent(person.id)}/`),
        '/pages/card/index': '/card/',
        '/pages/directory/index': '/people/',
        '/pages/about/index': '/about/'
      }
    },
    devServer: {
      host: '0.0.0.0',
      port: 5173
    },
    postcss: {
      pxtransform: { enable: false },
      cssModules: { enable: false }
    }
  }
})
