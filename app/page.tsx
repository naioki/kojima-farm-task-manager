export const runtime = 'edge'

import { cookies } from 'next/headers'
import { LoginScreen }    from '@/components/LoginScreen'
import { StaffDashboard } from '@/components/StaffDashboard'
import { AdminDashboard } from '@/components/AdminDashboard'

export default async function HomePage() {
  const cookieStore = await cookies()
  const role = cookieStore.get('farm-role')?.value

  if (!role)            return <LoginScreen />
  if (role === 'admin') return <AdminDashboard />
  return <StaffDashboard />
}
