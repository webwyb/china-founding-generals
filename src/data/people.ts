import zhude from '../assets/portraits/zhude.jpg'
import xuxiangqian from '../assets/portraits/xuxiangqian.jpg'
import suyu from '../assets/portraits/suyu.jpg'
import xuhaidong from '../assets/portraits/xuhaidong.jpg'
import hongxuezhi from '../assets/portraits/hongxuezhi.jpg'
import chenqihan from '../assets/portraits/chenqihan.jpg'
import zhangzhen from '../assets/portraits/zhangzhen.jpg'
import lizhen from '../assets/portraits/lizhen.jpg'

export type Rank = '元帅' | '大将' | '上将' | '中将' | '少将'

export interface Person {
  id: string
  name: string
  rank: Rank
  province: string
  hometown: string
  birth: number
  death: number
  portrait: string
  tagline: string
  story: string
  timeline: { year: number; text: string }[]
  sources: { title: string; url: string }[]
  imageSource: string
}

/** 已整理的体验样本，不代表完整的 1614 人名录。军衔按开国授衔时期记录。 */
export const people: Person[] = [
  {
    id: 'zhude',
    name: '朱德',
    rank: '元帅',
    province: '四川',
    hometown: '四川 · 仪陇',
    birth: 1886,
    death: 1976,
    portrait: zhude,
    tagline: '从井冈山上的一根扁担，读懂与战士同行',
    story: '1928年冬，为打破敌人的封锁，井冈山红军组织下山挑粮。朱德也走进挑粮队伍，和战士们一起翻山越岭，往返百余里。那时他已经是红四军军长，仍亲自承担运粮的劳动。同年春，他与陈毅率部到达井冈山，同毛泽东领导的部队会师。一根扁担，让后来的人们得以从日常生活的细节，理解这支队伍与它的指挥员。',
    timeline: [
      { year: 1886, text: '出生于四川仪陇。' },
      { year: 1928, text: '率部到达井冈山会师，任红四军军长。' },
      { year: 1955, text: '被授予中华人民共和国元帅军衔。' },
    ],
    sources: [{ title: '中国共产党新闻网 · 朱德人物资料', url: 'https://cpc.people.com.cn/GB/64162/126778/126780/7489937.html' }],
    imageSource: 'https://commons.wikimedia.org/wiki/File:Zhu_De.jpg',
  },
  {
    id: 'xuxiangqian',
    name: '徐向前',
    rank: '元帅',
    province: '山西',
    hometown: '山西 · 五台',
    birth: 1901,
    death: 1990,
    portrait: xuxiangqian,
    tagline: '从乡村教员到红四方面军总指挥的人生',
    story: '走上军事道路之前，徐向前曾在山西的乡村学校教书。1924年，他考入黄埔军校第一期。此后辗转各地，参加革命武装斗争。到鄂豫皖后，他与战友总结游击作战经验，重视集中兵力、了解敌情，也重视发动群众。1931年，他担任红四方面军总指挥。从一间乡村教室出发，这位五台青年的人生，最终与人民军队的成长紧紧相连。',
    timeline: [
      { year: 1924, text: '考入黄埔军校第一期。' },
      { year: 1931, text: '任红四方面军总指挥。' },
      { year: 1955, text: '被授予中华人民共和国元帅军衔。' },
    ],
    sources: [{ title: '中国共产党新闻网 · 徐向前人物资料', url: 'https://cpc.people.com.cn/GB/64162/126778/126780/7490461.html' }],
    imageSource: 'https://commons.wikimedia.org/wiki/File:Xu_Xiangqian.jpg',
  },
  {
    id: 'suyu',
    name: '粟裕',
    rank: '大将',
    province: '湖南',
    hometown: '湖南 · 会同',
    birth: 1907,
    death: 1984,
    portrait: suyu,
    tagline: '在苏中七战七捷，留下灵活用兵的战例',
    story: '1946年夏，面对兵力占优的国民党军进攻，粟裕指挥华中野战军在苏中作战。他把集中兵力、选择战机和连续机动结合起来，在一个半月内取得七次作战的胜利。苏中战役后来成为解放战争初期的重要战例。这位从湖南会同走出的侗族将领，早年参加南昌起义和井冈山斗争，在长期实践中逐步形成了独立思考、审慎判断的作战风格。',
    timeline: [
      { year: 1927, text: '参加南昌起义。' },
      { year: 1946, text: '指挥苏中战役，取得七战七捷。' },
      { year: 1955, text: '被授予中国人民解放军大将军衔。' },
    ],
    sources: [{ title: '中国共产党新闻网 · 粟裕人物资料', url: 'https://cpc.people.com.cn/GB/64162/126778/127855/7536807.html' }],
    imageSource: 'https://commons.wikimedia.org/wiki/File:Su_Yu_1955_formal.jpg',
  },
  {
    id: 'xuhaidong',
    name: '徐海东',
    rank: '大将',
    province: '湖北',
    hometown: '湖北 · 大悟',
    birth: 1900,
    death: 1970,
    portrait: xuhaidong,
    tagline: '率红二十五军长征，走向陕北的会师之路',
    story: '1934年，红二十五军从河南出发长征，徐海东担任副军长。行军途中，他在庾家河战斗中负重伤，伤势未愈便继续随部队转战。1935年9月，部队到达陕北永坪镇，与刘志丹领导的红军会师。随后两支队伍合编为红十五军团，徐海东任军团长。这段路程，记录了一支年轻队伍怎样在艰难环境中保存力量，并为迎接党中央和中央红军创造条件。',
    timeline: [
      { year: 1934, text: '随红二十五军开始长征。' },
      { year: 1935, text: '率部到达陕北会师，任红十五军团军团长。' },
      { year: 1955, text: '被授予中国人民解放军大将军衔。' },
    ],
    sources: [{ title: '中国共产党新闻网 · 徐海东人物资料', url: 'https://cpc.people.com.cn/GB/64162/126778/127855/7536984.html' }],
    imageSource: 'https://commons.wikimedia.org/wiki/File:Xu_Haidong.jpg',
  },
  {
    id: 'hongxuezhi',
    name: '洪学智',
    rank: '上将',
    province: '安徽',
    hometown: '安徽 · 金寨',
    birth: 1913,
    death: 2006,
    portrait: hongxuezhi,
    tagline: '在战火中组织后勤，守护前线的运输生命线',
    story: '1951年，洪学智在担任中国人民志愿军副司令员的同时，兼任后勤司令员。面对轰炸与封锁，他组织后勤部队把防护、抢修、运输和防空配合起来，保障物资送往前线。战场上的保障工作，同样需要指挥、协同和坚持。来自金寨的洪学智，后来长期投身军队后勤建设，并先后于1955年和1988年两次被授予上将军衔。',
    timeline: [
      { year: 1951, text: '兼任志愿军后勤司令员，组织前线后勤保障。' },
      { year: 1955, text: '被授予上将军衔。' },
      { year: 1988, text: '恢复军衔制后，再次被授予上将军衔。' },
    ],
    sources: [
      { title: '中国共产党新闻网 · 洪学智人物资料', url: 'https://cpc.people.com.cn/GB/64162/126778/127857/7538760.html' },
      { title: '浙江日报 · 洪学智同志逝世（新华社电）', url: 'https://zjrb.zjol.com.cn/html/2006-11/22/content_20108.htm' },
      { title: '人民网 · 洪学智与志愿军后勤保障', url: 'https://dangshi.people.com.cn/n/2013/0131/c85037-20388182.html' },
    ],
    imageSource: 'https://commons.wikimedia.org/wiki/File:Hong_Xuezhi.jpg',
  },
  {
    id: 'chenqihan',
    name: '陈奇涵',
    rank: '上将',
    province: '江西',
    hometown: '江西 · 兴国',
    birth: 1897,
    death: 1981,
    portrait: chenqihan,
    tagline: '从免费办学到培养军事人才，一生重视教育',
    story: '1916年，陈奇涵在江西兴国家乡创办一所小学，免费招收工农子弟。后来他进入军校，参加革命，在赣南开展群众工作。抗日战争时期，他担任抗日军政大学第三分校校长，重视参谋人员、特种兵和俄文人才的培养。从乡村学校到军事教育，办学育人的经历贯穿了他的早年与军旅生涯，也提供了一条理解这位兴国将领的人生线索。',
    timeline: [
      { year: 1916, text: '在家乡创办小学，免费招收工农子弟。' },
      { year: 1939, text: '任中央军委参谋部部长兼抗大第三分校校长等职。' },
      { year: 1955, text: '被授予中国人民解放军上将军衔。' },
    ],
    sources: [{ title: '中国共产党新闻网 · 陈奇涵人物资料', url: 'https://cpc.people.com.cn/GB/64162/126778/127857/7538650.html' }],
    imageSource: 'https://commons.wikimedia.org/wiki/File:Chenqihan.jpg',
  },
  {
    id: 'zhangzhen',
    name: '张震',
    rank: '中将',
    province: '湖南',
    hometown: '湖南 · 平江',
    birth: 1914,
    death: 2015,
    portrait: zhangzhen,
    tagline: '从参谋岗位走来，参与创建国防大学',
    story: '张震从平江走上革命道路，长期在参谋和指挥岗位工作，参与淮海、渡江等战役。1954年，他进入南京军事学院战役系学习；毕业后留校，历任副院长、院长。1985年12月，他出任国防大学校长，参与新型军事人才培养。由战场走进课堂，再把经验传给后来者，是他军旅生涯的一条重要线索。他于1988年被授予上将军衔。',
    timeline: [
      { year: 1930, text: '参加中国工农红军。' },
      { year: 1955, text: '被授予中国人民解放军中将军衔。' },
      { year: 1985, text: '任国防大学校长。' },
    ],
    sources: [
      { title: '中国共产党新闻网 · 张震人物资料', url: 'https://cpc.people.com.cn/GB/64162/126778/130393/7587418.html' },
      { title: '新华社 · 张震同志生平', url: 'https://www.xinhuanet.com/politics/2015-09/09/c_1116514056.htm' },
    ],
    imageSource: 'https://commons.wikimedia.org/wiki/File:Zhang_Zhen_1955.jpg',
  },
  {
    id: 'lizhen',
    name: '李贞',
    rank: '少将',
    province: '湖南',
    hometown: '湖南 · 浏阳',
    birth: 1908,
    death: 1990,
    portrait: lizhen,
    tagline: '从浏阳走出的新中国第一位女将军',
    story: '1955年首次授衔时，李贞成为中国人民解放军第一位女将军。她1908年出生于湖南浏阳，幼年生活困苦，1926年投身革命，后来参加秋收起义和长征。在战争年代，她长期从事政治工作；新中国成立后，又担任志愿军政治部秘书长、防空军政治部干部部部长等职。从争取自身解放的乡村女性，到为部队服务的政治工作者，她的人生留下了鲜明的时代印记。',
    timeline: [
      { year: 1926, text: '参加革命，担任乡妇女协会会长。' },
      { year: 1927, text: '加入中国共产党，参加秋收起义。' },
      { year: 1955, text: '被授予少将军衔，成为人民解放军第一位女将军。' },
    ],
    sources: [
      { title: '中国共产党新闻网 · 新中国第一位女将军李贞', url: 'https://cpc.people.com.cn/n1/2022/1226/c443712-32593553.html' },
      { title: '湖南省档案局 · 李贞生平', url: 'https://sdaj.hunan.gov.cn/sdaj/wszt/xxsl/xxrw/200810/t20081017_1977961.html' },
    ],
    imageSource: 'https://sdaj.hunan.gov.cn/sdaj/wszt/xxsl/xxrw/200810/t20081017_1977961.html',
  },
]
