import { redirect } from 'next/navigation'
import { getAdminSessionUser } from '@/lib/admin/auth'
import { AdminShowtimeConsole } from './AdminShowtimeConsole'

export default async function AdminPage() {
  const user = await getAdminSessionUser()

  if (!user) {
    redirect('/admin/login')
  }

  return <AdminShowtimeConsole />
}
