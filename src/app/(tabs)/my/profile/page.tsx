'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { MyPageShell } from '@/components/auth/MyPageShell'
import { MenuCard } from '@/components/primitives'
import { Avatar, Button, ConfirmDialog, Input } from '@/components/primitives'
import { DISPLAY_NAME_MAX, validateDisplayName, type AuthProvider } from '@/lib/auth/types'

const PROVIDER_LABEL: Record<AuthProvider, string> = { kakao: '카카오', google: '구글' }

/** 프로필 · 계정 관리 (IA 29) — 닉네임 수정 · 연결된 소셜 계정 · 로그아웃 · 회원탈퇴 */
export default function ProfilePage() {
  const router = useRouter()
  const { status, user, signOut, updateDisplayName, deleteAccount } = useAuth()

  const [name, setName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)

  useEffect(() => {
    if (user) setName(user.displayName ?? '')
  }, [user])

  useEffect(() => {
    if (status === 'signed-out') router.replace('/my')
  }, [status, router])

  const dirty = user ? name.trim() !== (user.displayName ?? '') : false

  const handleSave = async () => {
    const v = validateDisplayName(name)
    if (!v.ok) { setNameError(v.message); return }
    setNameError(null)
    setSaving(true)
    try {
      await updateDisplayName(v.value)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch {
      setNameError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    setBusy(true)
    try { await signOut(); setConfirmLogout(false) } finally { setBusy(false) }
  }

  const handleDelete = async () => {
    setBusy(true)
    try {
      await deleteAccount()
      setConfirmDelete(false)
      router.replace('/my')
    } catch {
      setBusy(false)
    }
  }

  return (
    <MyPageShell title="프로필 · 계정 관리" onBack={() => router.push('/my')}>
      {status === 'signed-in' && user && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 'var(--gutter)', marginTop: 8 }}>
            <Avatar name={user.displayName ?? '사용자'} photoUrl={user.avatarUrl} size={72} />
            <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>
              프로필 사진은 로그인한 소셜 계정을 따라가요
            </span>
          </div>

          <MenuCard>
            <div style={{ padding: 16, backgroundColor: 'var(--color-surface-card)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Input
                label="닉네임"
                value={name}
                maxLength={DISPLAY_NAME_MAX}
                onChange={(e) => { setName(e.target.value); setNameError(null) }}
                error={nameError ?? undefined}
                hint={saved ? '저장했어요' : `${name.trim().length}/${DISPLAY_NAME_MAX}`}
                autoComplete="nickname"
              />
              <Button variant="secondary" size="md" onClick={handleSave} disabled={!dirty} loading={saving}>
                닉네임 저장
              </Button>
            </div>
          </MenuCard>

          <MenuCard>
            <div style={{ padding: '12px var(--gutter)', fontSize: 'var(--text-caption)', fontWeight: 500, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--color-text-caption)', backgroundColor: 'var(--color-surface-card)' }}>
              연결된 계정
            </div>
            {user.providers.length === 0 && (
              <div style={{ padding: '12px var(--gutter)', fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-surface-card)' }}>—</div>
            )}
            {user.providers.map((p, i) => (
              <div key={p} style={{ padding: '12px var(--gutter)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--color-surface-card)', borderBottom: i < user.providers.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                <span style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-text-primary)' }}>{PROVIDER_LABEL[p]}</span>
                {user.email && <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>{user.email}</span>}
              </div>
            ))}
          </MenuCard>

          {/* 로그아웃 / 회원탈퇴 — 분리 버튼, 둘 다 확인 다이얼로그 (피그마 C 확정 2026-08-17) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 'var(--gutter)', paddingRight: 'var(--gutter)', marginTop: 8 }}>
            <Button variant="tertiary" size="md" onClick={() => setConfirmLogout(true)} disabled={busy}>로그아웃</Button>
            <Button variant="text" size="md" onClick={() => setConfirmDelete(true)} disabled={busy} style={{ color: 'var(--color-error)' }}>회원탈퇴</Button>
          </div>

          <ConfirmDialog
            open={confirmLogout}
            title="로그아웃할까요?"
            description="이 기기에서 로그아웃돼요. 관심 목록은 그대로 남아 있고 다시 로그인하면 이어서 볼 수 있어요."
            confirmLabel="로그아웃"
            busy={busy}
            onConfirm={handleSignOut}
            onCancel={() => setConfirmLogout(false)}
          />

          <ConfirmDialog
            open={confirmDelete}
            title="정말 탈퇴할까요?"
            description="계정과 관심 목록·알림 설정이 모두 삭제돼요. 같은 카카오 계정으로 다시 가입할 수는 있지만 이전 기록은 복구되지 않아요."
            confirmLabel="탈퇴하기"
            danger
            busy={busy}
            onConfirm={handleDelete}
            onCancel={() => setConfirmDelete(false)}
          />
        </>
      )}
    </MyPageShell>
  )
}
