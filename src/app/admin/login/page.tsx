import { AdminLoginForm } from './AdminLoginForm'
import styles from '../admin.module.css'

export default function AdminLoginPage() {
  return (
    <main className={styles.loginShell}>
      <section className={styles.loginPanel}>
        <p className={styles.eyebrow}>운영자 콘솔</p>
        <h1>관리자 로그인</h1>
        <AdminLoginForm />
      </section>
    </main>
  )
}
