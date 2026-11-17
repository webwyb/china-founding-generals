import type { PropsWithChildren } from 'react'
import './weapp.scss'
import { useLaunch } from '@tarojs/taro'
import { loadMiniFont } from './services/miniFont'
export default function App({ children }: PropsWithChildren) { useLaunch(() => { void loadMiniFont() }); return children }
