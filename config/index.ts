import { defineConfig } from '@tarojs/cli'
import { resolve } from 'node:path'

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
  defineConstants: {},
  mini: {
    postcss: {
      pxtransform: { enable: true },
      cssModules: { enable: false }
    }
  },
  h5: {
    publicPath: './',
    staticDirectory: 'static',
    router: { mode: 'hash' },
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
