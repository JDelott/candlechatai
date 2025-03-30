"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

interface AuthFormProps {
  mode: "login" | "register"
}

export function AuthForm({ mode }: AuthFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const name = formData.get("name") as string

    if (mode === "register") {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      })

      if (res.ok) {
        // After registration, sign in automatically
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        })
        if (result?.ok) router.push("/dashboard")
      } else {
        const data = await res.json()
        setError(data.error)
      }
    } else {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })
      if (result?.ok) {
        router.push("/dashboard")
      } else {
        setError("Invalid credentials")
      }
    }
    setLoading(false)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-sm w-full">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 text-sm font-mono">
          {error}
        </div>
      )}
      
      {mode === "register" && (
        <div>
          <label htmlFor="name" className="block font-mono text-sm mb-2">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            className="w-full p-3 border bg-white dark:bg-black font-mono"
            required
          />
        </div>
      )}

      <div>
        <label htmlFor="email" className="block font-mono text-sm mb-2">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="w-full p-3 border bg-white dark:bg-black font-mono"
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="block font-mono text-sm mb-2">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="w-full p-3 border bg-white dark:bg-black font-mono"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-black dark:bg-white text-white dark:text-black p-3 font-mono hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
      >
        {loading ? "Loading..." : mode === "login" ? "Sign In" : "Register"}
      </button>
    </form>
  )
}
