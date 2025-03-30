

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <main className="max-w-5xl mx-auto px-4 py-24">
        {/* Hero Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <h1 className="font-mono text-5xl md:text-7xl font-bold tracking-tight">
              Candle
              <span className="text-red-600 dark:text-red-500">Chat</span>
              AI
            </h1>
            <p className="font-mono text-lg text-gray-600 dark:text-gray-400 max-w-md">
              Decode market patterns through AI-powered conversations about candlestick analysis
            </p>
            <div className="flex gap-4">
              <button className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 font-mono hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
                Start Chat
              </button>
              <button className="border-2 border-black dark:border-white px-8 py-3 font-mono hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
                Learn More
              </button>
            </div>
          </div>

          {/* Right Content */}
          <div className="relative aspect-square">
            <div className="absolute inset-0 grid grid-cols-3 gap-4">
              {[...Array(9)].map((_, i) => (
                <div 
                  key={i} 
                  className="bg-gray-100 dark:bg-gray-900 rounded-sm flex items-center justify-center"
                >
                  <div className="w-4 h-12 bg-black dark:bg-white relative">
                    <div className="absolute w-[2px] h-4 bg-black dark:bg-white -top-4 left-1/2 -translate-x-1/2"></div>
                    <div className="absolute w-[2px] h-4 bg-black dark:bg-white -bottom-4 left-1/2 -translate-x-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
