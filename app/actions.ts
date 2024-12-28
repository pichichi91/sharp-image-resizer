'use server'

import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import JSZip from 'jszip'
import sharp from 'sharp'

export async function handleImages(formData: FormData) {
  const images = formData.getAll('images') as File[]
  const format = formData.get('format') as string
  const maxWidth = Number(formData.get('maxWidth')) || undefined
  const maxHeight = Number(formData.get('maxHeight')) || undefined

  const zip = new JSZip()
  let totalOriginalSize = 0
  let totalProcessedSize = 0
  const fileSizes: { name: string; originalSize: number; processedSize: number }[] = []

  for (const image of images) {
    const buffer = Buffer.from(await image.arrayBuffer())
    totalOriginalSize += buffer.length

    let sharpImage = sharp(buffer)

    if (maxWidth || maxHeight) {
      sharpImage = sharpImage.resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
    }

    if (format !== 'original') {
      sharpImage = sharpImage.toFormat(format as keyof sharp.FormatEnum)
    }

    const processedBuffer = await sharpImage.toBuffer()
    totalProcessedSize += processedBuffer.length

    const fileName = `${image.name.split('.')[0]}.${format === 'original' ? image.name.split('.').pop() : format}`
    fileSizes.push({ 
      name: fileName, 
      originalSize: buffer.length, 
      processedSize: processedBuffer.length 
    })

    zip.file(fileName, processedBuffer)
  }

  const zipContent = await zip.generateAsync({ type: 'nodebuffer' })
  const zipSize = zipContent.length

  const outputDir = join(process.cwd(), 'public', 'output')
  await mkdir(outputDir, { recursive: true })
  const zipPath = join(outputDir, 'images.zip')
  await writeFile(zipPath, zipContent)

  return { 
    zipContent: zipContent.toString('base64'),
    totalOriginalSize,
    totalProcessedSize,
    zipSize,
    fileSizes
  }
}

