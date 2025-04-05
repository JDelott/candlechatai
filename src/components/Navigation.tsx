"use client"

import { signOut, useSession } from "next-auth/react"
import Link from "next/link"

export function Navigation() {
  const { data: session } = useSession()

  return (
    <nav className="border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 max-w-[1920px]">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-xl font-bold">
              CandleChat AI
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Chart
              </Link>
              <Link
                href="/dashboard/scanner"
                className="px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Pattern Scanner
              </Link>
            </div>
          </div>
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
      </div>
    </nav>
  )
}
