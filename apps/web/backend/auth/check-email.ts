import { getAllowedEmails } from '../env'

export function checkEmail(body: Record<string, unknown>) {
  const allowedEmails = getAllowedEmails()
  if (allowedEmails.length === 0) return { allowed: true }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  return { allowed: allowedEmails.includes(email) }
}
