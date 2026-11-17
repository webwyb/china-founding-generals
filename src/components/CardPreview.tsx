export default function CardPreview({ src, name }: { src: string; name: string }) {
  return <img className='live-card-preview' src={src} alt={`${name}的纪念卡，预览与保存使用同一张图片`} />
}
