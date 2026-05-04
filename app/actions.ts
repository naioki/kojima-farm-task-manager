'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

/**
 * Called from the LoginScreen form. Reads `role` from the hidden input,
 * writes a 1-year persistent cookie, then redirects back to `/`.
 */
export async function selectRole(formData: FormData): Promise<void> {
  const role = formData.get('role')
  if (role !== 'admin' && role !== 'staff') return

  const cookieStore = await cookies()
  cookieStore.set('farm-role', role, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
  })
  redirect('/')
}

/** Called from the logout button in any dashboard. Clears role and returns to login. */
export async function clearRole(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('farm-role')
  redirect('/')
}
