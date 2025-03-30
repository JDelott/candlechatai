"use client"

import { signOut, useSession } from "next-auth/react"
import Link from "next/link"

export function Navigation() {
  const { data: session } = useSession()

  return (
    <nav className="border-b bg-white dark:bg-black">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link 
          href="/" 
          className="font-mono text-xl font-bold"
        >
          CandleChat<span className="text-red-600 dark:text-red-500">AI</span>
        </Link>

        <div className="flex items-center gap-6">
          {session ? (
            <>
              <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                {session.user?.email}
              </span>
              <button
                onClick={() => signOut()}
                className="font-mono text-sm hover:text-red-600 dark:hover:text-red-500"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="font-mono text-sm hover:text-red-600 dark:hover:text-red-500"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
