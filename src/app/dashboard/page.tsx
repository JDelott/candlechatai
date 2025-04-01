import { Navigation } from "@/components/Navigation"
import { CandlestickChat } from "@/components/CandlestickChat"

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Navigation />
      <main className="container mx-auto px-2 max-w-[1920px]">
        <CandlestickChat />
      </main>
    </div>
  )
}
