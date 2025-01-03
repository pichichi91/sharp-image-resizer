import { Metadata } from 'next'
import ImageZipper from '@/components/image-zipper'

export const metadata: Metadata = {
  title: 'Image Resizer',
  description: 'Resize and compress your images with ease',
}

export default function Home() {
  return (
    <main className="max-w-3xl mx-auto p-4 space-y-8 pt-24">
      <h1 className="text-4xl font-bold text-center">Image Resizer</h1>
      <ImageZipper />
    </main>
  )
}
