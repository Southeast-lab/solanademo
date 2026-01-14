"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@lazorkit/wallet"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export default function HomePage() {
  const { isConnected, smartWalletPubkey } = useWallet()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  const handleGetStarted = () => {
    setIsLoading(true)
    if (isConnected) {
      router.push("/dashboard")
    } else {
      router.push("/auth")
    }
  }

  const shortAddress = smartWalletPubkey?.toString()
    ? `${smartWalletPubkey.toString().slice(0, 6)}...${smartWalletPubkey.toString().slice(-6)}`
    : ""

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">S</span>
            </div>
            <span className="font-bold text-lg">Solana Demo</span>
          </div>
          <div className="flex items-center gap-4">
            {hydrated && isConnected && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-green-200 bg-green-50">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-green-700">{shortAddress}</span>
              </div>
            )}
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Docs
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              About
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-3xl text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold text-balance">Solana Without Wallets</h1>
            <p className="text-xl text-muted-foreground text-balance">
              Experience seamless blockchain transactions with passkey authentication. No wallet installation. No seed
              phrases. Pure simplicity.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-12">
            <div className="p-6 rounded-lg border border-border bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-primary text-xl">🔐</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Passkey Login</h3>
              <p className="text-sm text-muted-foreground">Use biometric authentication for secure access</p>
            </div>

            <div className="p-6 rounded-lg border border-border bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <span className="text-accent text-xl">⚡</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Gasless Transactions</h3>
              <p className="text-sm text-muted-foreground">Send transactions without paying gas fees</p>
            </div>

            <div className="p-6 rounded-lg border border-border bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
                <span className="text-secondary text-xl">✨</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">No Installation</h3>
              <p className="text-sm text-muted-foreground">Get started instantly without extra setup</p>
            </div>
          </div>

          {/* CTA Button */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            {hydrated && isConnected ? (
              <Button size="lg" onClick={handleGetStarted} disabled={isLoading} className="gap-2">
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <>
                <Button size="lg" onClick={handleGetStarted} disabled={isLoading} className="gap-2">
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button size="lg" variant="outline">
                  View Docs
                </Button>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          <p>Built with Lazorkit SDK and Solana Devnet</p>
        </div>
      </footer>
    </div>
  )
}