import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { Navigation } from "@/components/Navigation"

export default async function Dashboard() {
  const session = await getServerSession()

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Navigation />
      
      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="font-mono text-4xl font-bold mb-4">
            Dashboard
          </h1>
          <p className="font-mono text-gray-600 dark:text-gray-400">
            Welcome back. Start analyzing candlestick patterns.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Analysis Card */}
          <div className="border p-6">
            <h2 className="font-mono text-xl font-bold mb-4">Recent Analysis</h2>
            <div className="space-y-4">
              <p className="font-mono text-sm text-gray-600 dark:text-gray-400">
                No recent analysis found. Start a new chat to analyze patterns.
              </p>
              <button className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 font-mono text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
                New Analysis
              </button>
            </div>
          </div>

          {/* Saved Patterns Card */}
          <div className="border p-6">
            <h2 className="font-mono text-xl font-bold mb-4">Saved Patterns</h2>
            <div className="space-y-4">
              <p className="font-mono text-sm text-gray-600 dark:text-gray-400">
                No patterns saved yet. Save patterns during analysis to see them here.
              </p>
              <button className="border border-black dark:border-white px-4 py-2 font-mono text-sm hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
                Browse Patterns
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
