export function getAllowedEmails() {
  return (process.env.ALLOWED_EMAILS ?? '')
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean)
}
