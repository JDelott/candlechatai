import { NextResponse } from 'next/server'
import { hash } from 'bcrypt'
import { pool } from '@/lib/db'
import { DatabaseError } from 'pg'

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json()

    // Basic validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hash(password, 10)

    // Insert user into database
    const result = await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, hashedPassword, name]
    )

    return NextResponse.json({
      user: {
        id: result.rows[0].id,
        email: result.rows[0].email,
        name: result.rows[0].name,
      }
    })

  } catch (error) {
    // Check for unique violation on email
    if (error instanceof DatabaseError && error.code === '23505') {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }

    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
