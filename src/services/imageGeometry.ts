export interface ImageSize { width: number; height: number }
export interface ImageFrame extends ImageSize { x: number; y: number }

/** Keep the entire source image, with proportional whitespace where necessary. */
export function containImage(source: ImageSize, frame: ImageFrame): ImageFrame {
  if (![source.width, source.height, frame.width, frame.height].every(value => Number.isFinite(value) && value > 0) || !Number.isFinite(frame.x) || !Number.isFinite(frame.y)) throw new Error('图像尺寸无效')
  const scale = Math.min(frame.width / source.width, frame.height / source.height)
  const width = source.width * scale, height = source.height * scale
  return { x: frame.x + (frame.width - width) / 2, y: frame.y + (frame.height - height) / 2, width, height }
}
