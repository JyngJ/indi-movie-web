import { Icon } from './Icon'
import styles from './LoadingStatus.module.css'

interface LoadingStatusProps {
  message?: string
  visible?: boolean
  /** 떠 있는 안내가 기본이며, 목록·패널 안에서는 inline을 사용해요. */
  placement?: 'floating' | 'inline'
}

/** 요청이 끝날 때까지 유지하는 상태 안내. 완료 결과는 Toast를 사용해요. */
export function LoadingStatus({
  message = '불러오는 중…',
  visible = true,
  placement = 'floating',
}: LoadingStatusProps) {
  if (!visible) return null

  return (
    <div role="status" aria-live="polite" className={`${styles.status} ${styles[placement]}`}>
      <Icon name="loader-circle" size="md" className={styles.spinner} />
      <span>{message}</span>
    </div>
  )
}
