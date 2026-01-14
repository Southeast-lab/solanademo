'use client'

import { LazorkitProvider } from '@lazorkit/wallet'
import { useEffect } from 'react'

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Client-only Buffer polyfill
    if (typeof window !== 'undefined') {
      ;(window as any).Buffer =
        (window as any).Buffer || require('buffer').Buffer
    }
  }, [])

  return (
    <LazorkitProvider
      rpcUrl="https://api.devnet.solana.com"
      portalUrl="https://portal.lazor.sh"
      paymasterConfig={{
        paymasterUrl: 'https://kora.devnet.lazorkit.com',
      }}
    >
      {children}
    </LazorkitProvider>
  )
}
