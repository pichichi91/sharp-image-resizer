import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Image Zipper',
  description: 'Zip your images with ease',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-courier">{children}</body>
    </html>
  )
}

