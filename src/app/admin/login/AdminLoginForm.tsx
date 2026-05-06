'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/primitives'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import styles from '../admin.module.css'

export function AdminLoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error || !data.session?.access_token) {
        throw new Error(error?.message ?? '로그인에 실패했습니다.')
      }

      const response = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accessToken: data.session.access_token }),
      })
      const result = (await response.json()) as { error?: { message: string } }

      if (!response.ok) {
        await supabase.auth.signOut()
        throw new Error(result.error?.message ?? '관리자 권한 확인에 실패했습니다.')
      }

      router.replace('/admin')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className={styles.loginForm} onSubmit={submit}>
      <label>
        이메일
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label>
        비밀번호
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      {message && <p className={styles.message}>{message}</p>}
      <Button type="submit" loading={loading} fullWidth>
        로그인
      </Button>
    </form>
  )
}
