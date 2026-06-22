import { redirect } from 'next/navigation'
import { getAdminSessionUser } from '@/lib/admin/auth'
import { AdminConsoleTabs } from './AdminConsoleTabs'

export default async function AdminPage() {
  const user = await getAdminSessionUser()

  if (!user) {
    redirect('/admin/login')
  }

  return <AdminConsoleTabs />
}
