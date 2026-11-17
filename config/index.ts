import { defineConfig } from '@tarojs/cli'
import { posix, resolve } from 'node:path'
const { manifest } = require('../scripts/deploy/asset-manifest.cjs')
const assetUrls = Object.fromEntries(manifest(resolve(__dirname, '../public'), process.env.SHANHE_ASSET_BASE_URL || '').map((asset: { path: string; url: string }) => [asset.path, asset.url]))
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
    type: 'vite'
  },
  cache: { enable: false },
  plugins: [],
  copy: {
    patterns: [{ from: resolve(__dirname, '../public'), to: 'static' }],
    options: {}
  },
  defineConstants: { __SHANHE_ASSET_URLS__: JSON.stringify(assetUrls) },
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
