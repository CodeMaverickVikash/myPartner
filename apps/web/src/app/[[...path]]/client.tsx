'use client'

import dynamic from 'next/dynamic'

const PortalApp = dynamic(() => import('@/features/portal/PortalApp'), {
  ssr: false,
})

export default function ClientRoot() {
  return <PortalApp />
}
