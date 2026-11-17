export default defineAppConfig({
  animation: false,
  pages: [
    'pages/index/index',
    'pages/explore/index',
    'pages/person/index',
    'pages/card/index',
    'pages/directory/index',
    'pages/about/index'
  ],
  window: {
    navigationStyle: 'custom',
    navigationBarTitleText: '山河有名',
    navigationBarBackgroundColor: '#f4f7f3',
    navigationBarTextStyle: 'black',
    backgroundColor: '#f4f7f3',
    backgroundTextStyle: 'dark'
  }
})
