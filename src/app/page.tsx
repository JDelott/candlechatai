import { getServerSession } from "next-auth"
import Link from "next/link"


export default async function Home() {
  const session = await getServerSession()

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Hero */}
      <main className="min-h-screen flex items-center justify-center">
        <div className="max-w-xl mx-auto px-6 space-y-12 text-center">
          <h1 className="text-7xl font-bold">CandleChat</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">AI-powered market analysis</p>
          
          {session ? (
            <Link href="/dashboard" className="inline-block bg-black dark:bg-white text-white dark:text-black px-8 py-3">
              Dashboard
            </Link>
          ) : (
            <div className="flex gap-4 justify-center">
              <Link href="/login" className="bg-black dark:bg-white text-white dark:text-black px-8 py-3">Sign In</Link>
              <Link href="/register" className="border border-black dark:border-white px-8 py-3">Register</Link>
            </div>
          )}
        </div>
      </main>

      {/* Info: Grid-based content structure */}
      <section className="py-40 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto space-y-32">
          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-24">
            <div className="text-center">
              <h3 className="text-xl font-medium mb-4">AI-Powered Analysis</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Get instant insights on market patterns and candlestick formations
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-medium mb-4">Learn & Improve</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Interactive learning experience to enhance your trading knowledge
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-medium mb-4">Real-Time Support</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                24/7 AI assistance for your market analysis questions
              </p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center space-y-12">
            <h3 className="text-2xl font-bold mb-8">
              Ready to start your journey?
            </h3>
            <div className="flex flex-wrap gap-6 justify-center">
              <Link
                href="/features"
                className="bg-black dark:bg-white text-white dark:text-black px-10 py-4 font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
              >
                Explore Features
              </Link>
              <Link
                href="/pricing"
                className="border border-black dark:border-white px-10 py-4 font-medium hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
