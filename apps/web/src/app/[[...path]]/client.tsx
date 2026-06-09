'use client'

import { useEffect, useState } from 'react'
import PortalApp from '@/features/portal/PortalApp'

export default function ClientRoot() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return <PortalApp />
}
