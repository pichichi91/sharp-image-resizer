'use client'

import { useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import Image from 'next/image'
import JSZip from 'jszip'

const getDefaultQuality = (format: string): number => {
  switch (format) {
    case 'webp':
      return 75; // Lowered from 80 to 75
    case 'jpeg':
      return 85;
    case 'png':
      return 90;
    default:
      return 75;
  }
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' bytes'
  else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB'
  else return (bytes / 1048576).toFixed(2) + ' MB'
}

export default function ImageZipper() {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [processedFiles, setProcessedFiles] = useState<{ name: string; originalSize: number; processedSize: number }[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [format, setFormat] = useState('webp')
  const [maxLength, setMaxLength] = useState<number>(2000)
  const [quality, setQuality] = useState<number>(() => getDefaultQuality('webp'))
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [totalOriginalSize, setTotalOriginalSize] = useState(0)
  const [totalProcessedSize, setTotalProcessedSize] = useState(0)
  const [zipSize, setZipSize] = useState(0)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    onDrop: (acceptedFiles) => {
      setFiles((prevFiles) => [...prevFiles, ...acceptedFiles])
      setProcessedFiles([])
      setProgress(null)
      setTotalOriginalSize(0)
      setTotalProcessedSize(0)
      setZipSize(0)
    }
  })

  useEffect(() => {
    const objectUrls = files.map(file => URL.createObjectURL(file))
    setPreviews(objectUrls)
    return () => objectUrls.forEach(URL.revokeObjectURL)
  }, [files])

  useEffect(() => {
    setQuality(getDefaultQuality(format));
  }, [format]);

  const processImage = async (file: File): Promise<{ processedFile: File; originalSize: number; processedSize: number }> => {
    const img = await createImageBitmap(file)
    let { width, height } = img

    if (maxLength && (width > maxLength || height > maxLength)) {
      if (width > height) {
        height = Math.round((height / width) * maxLength)
        width = maxLength
      } else {
        width = Math.round((width / height) * maxLength)
        height = maxLength
      }
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')

    ctx.drawImage(img, 0, 0, width, height)

    const mimeType = format === 'original' ? file.type : `image/${format}`
    const qualityValue = quality / 100 // Convert percentage to decimal

    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), mimeType, qualityValue))
    const newFileName = `${file.name.split('.')[0]}.${format === 'original' ? file.name.split('.').pop() : format}`
    const processedFile = new File([blob], newFileName, { type: mimeType })

    console.log(`Processed ${file.name}: ${width}x${height}, Original: ${formatFileSize(file.size)}, Processed: ${formatFileSize(processedFile.size)}`)

    return {
      processedFile,
      originalSize: file.size,
      processedSize: processedFile.size,
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (files.length === 0) return

    setIsLoading(true)
    setProgress({ current: 0, total: files.length })
    const zip = new JSZip()
    let totalOriginal = 0
    let totalProcessed = 0
    const processedFilesInfo: { name: string; originalSize: number; processedSize: number }[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const { processedFile, originalSize, processedSize } = await processImage(file)
        zip.file(processedFile.name, processedFile)
        totalOriginal += originalSize
        totalProcessed += processedSize
        processedFilesInfo.push({ name: processedFile.name, originalSize, processedSize })
        setProgress({ current: i + 1, total: files.length })
      }

      const zipContent = await zip.generateAsync({ type: 'blob' })
      const zipFileSize = zipContent.size

      setProcessedFiles(processedFilesInfo)
      setTotalOriginalSize(totalOriginal)
      setTotalProcessedSize(totalProcessed)
      setZipSize(zipFileSize)

      const zipUrl = URL.createObjectURL(zipContent)
      const link = document.createElement('a')
      link.href = zipUrl
      link.download = 'images.zip'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(zipUrl)
    } catch (error) {
      console.error('Error processing images:', error)
    } finally {
      setIsLoading(false)
      setProgress(null)
    }
  }

  return (
    <div className="space-y-8">
      <div 
        {...getRootProps()} 
        className={`
          border-2 border-dashed border-gray-300 
          flex items-center justify-center 
          h-[200px] rounded-lg p-8 text-center cursor-pointer
          transition-all duration-300 ease-in-out
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-400 hover:bg-gray-50'}
        `}
      >
        <input {...getInputProps()} />
        <p className="transition-colors duration-300">
          {isDragActive ? 'Drop the images here...' : 'Drag \'n\' drop some images here, or click to select files'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="format">Output Format</Label>
            <Select value={format} onValueChange={(newFormat) => {
              setFormat(newFormat);
              setQuality(getDefaultQuality(newFormat));
            }}>
              <SelectTrigger id="format" className="transition-all duration-300 hover:border-gray-400">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="original">Original</SelectItem>
                <SelectItem value="webp">WebP</SelectItem>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="jpeg">JPEG</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxLength">Max Length (px)</Label>
            <Input
              id="maxLength"
              type="number"
              value={maxLength}
              onChange={(e) => setMaxLength(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="Optional"
              className="transition-all duration-300 hover:border-gray-400"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="quality">Quality: {quality}%</Label>
          <Slider
            id="quality"
            min={1}
            max={100}
            step={1}
            value={[quality]}
            onValueChange={(value) => setQuality(value[0])}
            className="w-full"
          />
        </div>
        <Button 
          type="submit" 
          className="w-full transition-all duration-300 hover:bg-opacity-90" 
          disabled={files.length === 0 || isLoading}
        >
          {isLoading ? 'Processing Images...' : 'Process and Download ZIP'}
        </Button>
      </form>

      <p className="text-sm text-gray-600 mb-4">
        Note: Images will be resized to fit within the specified max length while maintaining their aspect ratio. The quality slider allows you to balance between file size and image quality. Lower quality values result in smaller file sizes but may reduce image quality.
      </p>

      {progress && (
        <div className="space-y-2">
          <Progress value={(progress.current / progress.total) * 100} className="transition-all duration-300" />
          <p className="text-center transition-all duration-300">{`${progress.current}/${progress.total} images processed`}</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="transition-all duration-300 ease-in-out">
          <h2 className="text-2xl font-semibold mb-4">Uploaded Images:</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Preview</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>Original Size</TableHead>
                <TableHead>Processed Size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file, index) => (
                <TableRow key={index} className="transition-all duration-300 hover:bg-gray-50">
                  <TableCell>
                    {previews[index] && (
                      <Image 
                        src={previews[index]} 
                        alt={file.name} 
                        width={50} 
                        height={50} 
                        className="object-cover rounded transition-all duration-300 hover:scale-110"
                      />
                    )}
                  </TableCell>
                  <TableCell>{file.name}</TableCell>
                  <TableCell>{formatFileSize(file.size)}</TableCell>
                  <TableCell>
                    {processedFiles[index] 
                      ? formatFileSize(processedFiles[index].processedSize)
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {zipSize > 0 && (
        <div className="space-y-2 transition-all duration-300 ease-in-out">
          <p>Total Original Size: {formatFileSize(totalOriginalSize)}</p>
          <p>Total Processed Size: {formatFileSize(totalProcessedSize)}</p>
          <p>ZIP File Size: {formatFileSize(zipSize)}</p>
        </div>
      )}
    </div>
  )
}

