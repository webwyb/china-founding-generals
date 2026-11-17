import { startAnalytics } from './rum'

if (process.env.TARO_ENV === 'h5') void startAnalytics()
