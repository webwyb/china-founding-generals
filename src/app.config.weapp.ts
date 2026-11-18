export default defineAppConfig({
  pages: ['pages/index/index', 'pages/explore/index', 'pages/person/index', 'pages/card/index', 'pages/about/index', 'pages/topics/index'],
  window: { navigationBarTitleText: '名在山河', navigationBarBackgroundColor: '#f4f7f3', navigationBarTextStyle: 'black', backgroundColor: '#f4f7f3' },
  permission: { 'scope.writePhotosAlbum': { desc: '将您选择的纪念卡保存到相册' } },
  lazyCodeLoading: 'requiredComponents'
})
