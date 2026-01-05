export async function compressImage(blob: Blob): Promise<string> {
  const image = document.createElement('img')
  const url = URL.createObjectURL(blob)

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = reject
      image.src = url
    })

    const maxWidth = 1600
    const scale = Math.min(1, maxWidth / image.width)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(image.width * scale)
    canvas.height = Math.round(image.height * scale)

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Cannot access canvas')
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

    return canvas.toDataURL('image/jpeg', 0.75)
  } finally {
    URL.revokeObjectURL(url)
  }
}


