function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('The image could not be read.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('The image could not be processed.'))
    image.src = dataUrl
  })
}

export async function createResizedImageDataUrl(file) {
  const maxAllowedSize = 33_554_432

  if (file.size > maxAllowedSize) {
    throw new Error('Selected file is too big. Please choose a file under 32 MB.')
  }

  if (file.type === 'image/gif') {
    return readFileAsDataUrl(file)
  }

  const dataUrl = await readFileAsDataUrl(file)
  const image = await loadImage(dataUrl)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  const maxWidth = 500
  const maxHeight = 500
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1)

  canvas.width = Math.round(image.width * scale)
  canvas.height = Math.round(image.height * scale)

  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL(file.type || 'image/png')
}
