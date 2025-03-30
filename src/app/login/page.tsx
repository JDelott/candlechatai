import Link from "next/link"
import { AuthForm } from "@/components/AuthForm"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-black p-4">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <h2 className="font-mono text-3xl font-bold text-center">
            Sign in to CandleChat
          </h2>
          <p className="mt-2 text-center font-mono text-gray-600 dark:text-gray-400">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-red-600 dark:text-red-500 hover:underline">
              Register
            </Link>
          </p>
        </div>

        <AuthForm mode="login" />
      </div>
    </div>
  )
}
