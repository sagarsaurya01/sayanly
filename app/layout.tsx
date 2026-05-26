import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sayanly — AI Social Media Content Factory',
  description: 'Generate a week of social media content in minutes with AI',
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="noise min-h-full flex flex-col bg-black text-white">
        {children}
      </body>
    </html>
  )
}
