'use client'
import { Navigation } from "@/components/Navigation"
import { PatternScannerView } from "@/components/PatternScannerView"

export default function Scanner() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Navigation />
      <main className="container mx-auto px-2 max-w-[1920px]">
        <PatternScannerView />
      </main>
    </div>
  )
} 
