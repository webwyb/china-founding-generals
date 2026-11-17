import settings from '../../config/compliance.json'
import { publicPersonUrl } from './personLinks'

export const siteCompliance = settings
export const AI_LANDSCAPE_LABEL = '背景景观由AI生成'
export const AI_LANDSCAPE_NOTE = '背景景观由AI生成，仅为地域文化意象，不是历史实景照片；人物肖像为历史影像。'

/** Opens an editable email draft; no feedback or attachments are sent by the site. */
export function feedbackUrl(kind: 'copyright' | 'correction', person?: { id: string; name: string }): string | undefined {
  if (!settings.feedbackEmail) return undefined
  const title = kind === 'copyright' ? '图片权利反馈' : '资料勘误'
  const body = [
    `反馈类型：${title}`,
    `人物姓名：${person?.name || ''}`,
    `页面链接：${person ? publicPersonUrl(person.id) : ''}`,
    ...(kind === 'copyright'
      ? ['涉及图片或内容：', '权利归属／授权说明及可核验材料：', '希望如何处理：']
      : ['发现的问题：', '建议更正内容：', '依据来源（网址或书刊名称、版本、页码）：']),
    '便于回复的联系方式：',
  ].join('\n')
  return `mailto:${settings.feedbackEmail}?subject=${encodeURIComponent(`山河有名｜${title}${person ? `｜${person.name}` : ''}`)}&body=${encodeURIComponent(body)}`
}
