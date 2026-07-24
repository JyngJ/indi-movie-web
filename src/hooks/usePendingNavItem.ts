'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

/**
 * 리스트 안 특정 아이템(포스터/카드) 클릭 시 라우팅 완료 전까지 그 아이템만
 * pending 표시(스피너/딤)할 수 있게 해주는 훅. router.push는 결과가 올 때까지
 * 아무 시각적 반응이 없어 "눌렸나?" 하고 연타하게 되는 문제를 막기 위함.
 */
export function usePendingNavItem() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)

  function navigate(id: string, href: string) {
    setPendingId(id)
    startTransition(() => {
      router.push(href)
    })
  }

  return { pendingId: isPending ? pendingId : null, navigate }
}
