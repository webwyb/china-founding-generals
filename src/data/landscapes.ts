import { assetUrl } from '../services/assets'

export interface ProvinceLandscape { province: string; id: string; landmark: string; image: string }

export const provinceLandscapes: ProvinceLandscape[] = [
  {
    "province": "江西",
    "id": "jiangxi",
    "landmark": "庐山",
    "image": "./static/landscapes/jiangxi.webp"
  },
  {
    "province": "湖北",
    "id": "hubei",
    "landmark": "长江三峡",
    "image": "./static/landscapes/hubei.webp"
  },
  {
    "province": "湖南",
    "id": "hunan",
    "landmark": "张家界",
    "image": "./static/landscapes/hunan.webp"
  },
  {
    "province": "安徽",
    "id": "anhui",
    "landmark": "黄山",
    "image": "./static/landscapes/anhui.webp"
  },
  {
    "province": "河南",
    "id": "henan",
    "landmark": "嵩山",
    "image": "./static/landscapes/henan.webp"
  },
  {
    "province": "四川",
    "id": "sichuan",
    "landmark": "峨眉山",
    "image": "./static/landscapes/sichuan.webp"
  },
  {
    "province": "山东",
    "id": "shandong",
    "landmark": "泰山",
    "image": "./static/landscapes/shandong.webp"
  },
  {
    "province": "福建",
    "id": "fujian",
    "landmark": "武夷山",
    "image": "./static/landscapes/fujian.webp"
  },
  {
    "province": "河北",
    "id": "hebei",
    "landmark": "山海关",
    "image": "./static/landscapes/hebei.webp"
  },
  {
    "province": "陕西",
    "id": "shaanxi",
    "landmark": "华山",
    "image": "./static/landscapes/shaanxi.webp"
  },
  {
    "province": "山西",
    "id": "shanxi",
    "landmark": "五台山",
    "image": "./static/landscapes/shanxi.webp"
  },
  {
    "province": "辽宁",
    "id": "liaoning",
    "landmark": "千山",
    "image": "./static/landscapes/liaoning.webp"
  },
  {
    "province": "广东",
    "id": "guangdong",
    "landmark": "丹霞山",
    "image": "./static/landscapes/guangdong.webp"
  },
  {
    "province": "江苏",
    "id": "jiangsu",
    "landmark": "苏州园林",
    "image": "./static/landscapes/jiangsu.webp"
  },
  {
    "province": "广西",
    "id": "guangxi",
    "landmark": "桂林漓江",
    "image": "./static/landscapes/guangxi.webp"
  },
  {
    "province": "浙江",
    "id": "zhejiang",
    "landmark": "杭州西湖",
    "image": "./static/landscapes/zhejiang.webp"
  },
  {
    "province": "甘肃",
    "id": "gansu",
    "landmark": "敦煌莫高窟",
    "image": "./static/landscapes/gansu.webp"
  },
  {
    "province": "西藏",
    "id": "xizang",
    "landmark": "布达拉宫",
    "image": "./static/landscapes/xizang.webp"
  },
  {
    "province": "云南",
    "id": "yunnan",
    "landmark": "玉龙雪山",
    "image": "./static/landscapes/yunnan.webp"
  },
  {
    "province": "北京",
    "id": "beijing",
    "landmark": "长城",
    "image": "./static/landscapes/beijing.webp"
  },
  {
    "province": "新疆",
    "id": "xinjiang",
    "landmark": "天山天池",
    "image": "./static/landscapes/xinjiang.webp"
  },
  {
    "province": "吉林",
    "id": "jilin",
    "landmark": "长白山天池",
    "image": "./static/landscapes/jilin.webp"
  },
  {
    "province": "黑龙江",
    "id": "heilongjiang",
    "landmark": "五大连池",
    "image": "./static/landscapes/heilongjiang.webp"
  },
  {
    "province": "内蒙古",
    "id": "neimenggu",
    "landmark": "呼伦贝尔草原",
    "image": "./static/landscapes/neimenggu.webp"
  },
  {
    "province": "天津",
    "id": "tianjin",
    "landmark": "蓟州独乐寺",
    "image": "./static/landscapes/tianjin.webp"
  },
  {
    "province": "贵州",
    "id": "guizhou",
    "landmark": "黄果树瀑布",
    "image": "./static/landscapes/guizhou.webp"
  },
  {
    "province": "海南",
    "id": "hainan",
    "landmark": "天涯海角",
    "image": "./static/landscapes/hainan.webp"
  },
  {
    "province": "宁夏",
    "id": "ningxia",
    "landmark": "沙坡头",
    "image": "./static/landscapes/ningxia.webp"
  },
  {
    "province": "上海",
    "id": "shanghai",
    "landmark": "豫园",
    "image": "./static/landscapes/shanghai.webp"
  }
].map(landscape => ({ ...landscape, image: assetUrl(landscape.image) }))

export function getProvinceLandscape(province?: string): ProvinceLandscape | undefined {
  return provinceLandscapes.find(item => item.province === province)
}
