"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@lazorkit/wallet"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowRight, LogOut, Copy } from "lucide-react"

export default function HomePage() {
  const { isConnected, smartWalletPubkey, disconnect } = useWallet()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  const handleGetStarted = async () => {
    setIsLoading(true)
    if (isConnected) {
      router.push("/dashboard")
    } else {
      router.push("/auth")
    }
  }

  const handleCopyAddress = async () => {
    if (smartWalletPubkey) {
      try {
        await navigator.clipboard.writeText(smartWalletPubkey.toString())
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // ignore
      }
    }
  }

  const handleDisconnect = async () => {
    await disconnect()
  }

  const shortAddress = smartWalletPubkey?.toString()
    ? `${smartWalletPubkey.toString().slice(0, 6)}...${smartWalletPubkey.toString().slice(-6)}`
    : ""

  if (!hydrated) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 text-slate-50 flex flex-col relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-72 h-72 bg-teal-500/20 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-emerald-500/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-slate-800/50 px-4 sm:px-6 py-4 backdrop-blur-md bg-slate-950/80">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-r from-slate-800 to-slate-700 flex items-center justify-center shadow-lg">
              <img 
                src="/solana-logo.svg" 
                alt="Solana" 
                className="w-6 h-6 object-contain drop-shadow-sm"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                Passkey Wallet
              </span>
              <span className="text-xs text-slate-400">Solana Devnet</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isConnected && smartWalletPubkey && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <button
                  onClick={handleCopyAddress}
                  className="text-xs font-mono text-slate-200 hover:text-teal-300 transition-colors"
                >
                  {shortAddress}
                  {copied && <span className="ml-1 text-emerald-400 text-[10px]">Copied</span>}
                </button>
                <button
                  onClick={handleDisconnect}
                  className="ml-2 p-1 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Disconnect"
                >
                  <LogOut className="w-3 h-3 text-slate-400 hover:text-slate-200" />
                </button>
              </div>
            )}
            <Button
              size="sm"
              variant={isConnected ? "default" : "outline"}
              onClick={handleGetStarted}
              disabled={isLoading}
              className="border-slate-700 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-teal-600/10 hover:to-emerald-600/10 text-slate-100 hover:text-teal-300 border-slate-700/50"
            >
              {isConnected ? "Dashboard" : "Get Started"}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-16 sm:py-24 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></div>
            <span className="text-xs font-semibold text-teal-300 uppercase tracking-wide">Lazorkit Passkeys</span>
          </div>

          {/* Main heading */}
          <div className="space-y-6">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold bg-gradient-to-r from-slate-100 via-teal-200 to-emerald-300 bg-clip-text text-transparent leading-tight">
              Solana Smart Wallet
              <span className="block text-3xl sm:text-4xl md:text-5xl bg-gradient-to-r from-teal-400 to-emerald-400">
                No Extensions Needed
              </span>
            </h1>
            <p className="text-xl sm:text-2xl md:text-3xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Passkey authentication. Gasless transactions. Instant setup.
              <br />
              <span className="text-teal-300 font-semibold">Pure Solana magic.</span>
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
            <div className="group p-8 rounded-2xl border border-slate-800/50 bg-slate-900/30 backdrop-blur-sm hover:border-teal-500/50 hover:bg-slate-900/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-2xl">🔐</span>
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-3">Passkey Auth</h3>
              <p className="text-slate-400 leading-relaxed">Biometrics & device security. No seed phrases.</p>
            </div>

            <div className="group p-8 rounded-2xl border border-slate-800/50 bg-slate-900/30 backdrop-blur-sm hover:border-teal-500/50 hover:bg-slate-900/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-3">Gasless TX</h3>
              <p className="text-slate-400 leading-relaxed">Send SOL/USDC/swaps without gas fees.</p>
            </div>

            <div className="group p-8 rounded-2xl border border-slate-800/50 bg-slate-900/30 backdrop-blur-sm hover:border-teal-500/50 hover:bg-slate-900/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-2xl">✨</span>
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-3">1-Click Setup</h3>
              <p className="text-slate-400 leading-relaxed">No downloads. No extensions. Instant access.</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-md mx-auto text-center text-sm sm:text-base">
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-teal-400 mb-1">0.1s</div>
              <div className="text-slate-400">Passkey Login</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-emerald-400 mb-1">100%</div>
              <div className="text-slate-400">Gasless</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-purple-400 mb-1">Devnet</div>
              <div className="text-slate-400">Ready</div>
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-12">
            <Button 
              size="lg" 
              onClick={handleGetStarted} 
              disabled={isLoading}
              className="px-8 h-14 text-lg font-semibold bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 gap-3 min-w-[200px]"
            >
              {isLoading ? "Loading..." : (isConnected ? "Enter Dashboard" : "Get Started")}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="px-8 h-14 text-lg border-slate-700/50 bg-slate-900/50 backdrop-blur-sm hover:bg-slate-900 hover:border-teal-500/50 hover:text-teal-300"
            >
              View Code →
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex items-center gap-8 text-xs text-slate-500 mt-20 pt-12 border-t border-slate-800/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
              <span>Solana Devnet</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
              <span>Lazorkit SDK</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span>Passkey Secure</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/50 px-6 py-12 backdrop-blur-md bg-slate-950/50">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-slate-400 mb-4">
            Built for Solana bounties • Powered by Lazorkit & Jupiter
          </p>
          <div className="flex flex-wrap gap-6 justify-center items-center text-xs text-slate-500">
            <a href="#" className="hover:text-teal-300 transition-colors">GitHub</a>
            <a href="#" className="hover:text-teal-300 transition-colors">Docs</a>
            <a href="#" className="hover:text-teal-300 transition-colors">Twitter</a>
            <span>•</span>
            <span>Solana Devnet {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}
