'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { handleImages } from '@/app/actions'

export default function ImageResizer() {
  const [files, setFiles] = useState<File[]>([])

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    onDrop: (acceptedFiles) => {
      setFiles((prevFiles) => [...prevFiles, ...acceptedFiles])
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (files.length === 0) return

    const formData = new FormData()
    files.forEach((file) => formData.append('images', file))

    const response = await handleImages(formData)
    if (response.url) {
      window.location.href = response.url
    }
  }

  return (
    <div className="space-y-8">
      <div {...getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer">
        <input {...getInputProps()} />
        <p>Drag &apos;n&apos; drop some images here, or click to select files</p>
      </div>

      {files.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Uploaded Images:</h2>
          <ul className="list-disc pl-5">
            {files.map((file, index) => (
              <li key={index}>{file.name}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Button type="submit" disabled={files.length === 0}>
          Download as ZIP
        </Button>
      </form>
    </div>
  )
}

