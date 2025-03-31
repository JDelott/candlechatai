import { Navigation } from "@/components/Navigation"
import { CandlestickChat } from "@/components/CandlestickChat"

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Navigation />
      <main className="max-w-6xl mx-auto px-4">
        <CandlestickChat />
      </main>
    </div>
  )
}
