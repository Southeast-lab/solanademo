"use client"

import { useState, useEffect } from "react"
import { useWallet } from '@lazorkit/wallet'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Fingerprint, LogIn, ArrowLeft } from "lucide-react"

export default function AuthPage() {
  const { connect, isConnecting, isConnected, smartWalletPubkey } = useWallet()
  const [isCreating, setIsCreating] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setHydrated(true)
  }, [])

  // Redirect to dashboard if already connected
  useEffect(() => {
    if (!hydrated) return
    if (isConnected && smartWalletPubkey) {
      router.replace('/dashboard')
    }
  }, [hydrated, isConnected, smartWalletPubkey, router])

  const handleCreateWallet = async () => {
    setIsCreating(true)
    try {
      await connect({ feeMode: 'paymaster' })
      router.push('/dashboard')
    } catch (error) {
      console.error('Wallet creation failed:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleSignIn = async () => {
    try {
      await connect({ feeMode: 'paymaster' })
      router.push('/dashboard')
    } catch (error) {
      console.error('Sign in failed:', error)
    }
  }

  const statusColor = isConnected ? 'bg-green-500' : 'bg-orange-500'
  const statusText = isConnected 
    ? `Connected: ${smartWalletPubkey?.toString().slice(0,6)}...` 
    : 'Ready for Devnet'

  // Don't render if already connected (will redirect)
  if (hydrated && isConnected) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 flex flex-col">
      <nav className="border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </nav>
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <Card className="w-full max-w-md border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Fingerprint className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Passkey Auth</CardTitle>
            <CardDescription>Device passkey login - no seed phrases</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg border border-border bg-muted/30 flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${statusColor}`}></div>
              <span className="text-sm">{statusText}</span>
            </div>
            <div className="space-y-3 pt-2">
              <Button 
                onClick={handleCreateWallet} 
                disabled={isCreating || isConnecting || isConnected} 
                size="lg" 
                className="w-full"
              >
                {isCreating ? "Creating..." : "Create New Wallet"}
              </Button>
              <Button
                onClick={handleSignIn}
                disabled={isConnecting || isCreating || isConnected}
                variant="outline"
                size="lg"
                className="w-full gap-2"
              >
                <LogIn className="w-4 h-4" />
                {isConnecting ? "Signing In..." : "Sign In with Passkey"}
              </Button>
            </div>
            <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border">
              Passkeys stay on device. Gasless on Devnet.
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}