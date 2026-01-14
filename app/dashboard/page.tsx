"use client"

import { useState, useEffect, useRef } from "react"
import { useWallet } from "@lazorkit/wallet"
import { useRouter } from "next/navigation"
import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js"
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import {
  LogOut,
  Copy,
  AlertTriangle,
  RefreshCw,
  ArrowLeftRight,
  ShoppingCart,
  X,
} from "lucide-react"

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.devnet.solana.com"

const JUPITER_API = process.env.NEXT_PUBLIC_JUPITER_API || "https://quote-api.jup.ag/v6"

const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU")

const MERCHANT_ADDRESS = process.env.NEXT_PUBLIC_MERCHANT_ADDRESS || ""

const connection = new Connection(RPC_URL, {
  commitment: "confirmed",
  confirmTransactionInitialTimeout: 90_000,
})

const REFRESH_COOLDOWN_MS = 10_000 // 10 seconds

export default function DashboardPage() {
  const { smartWalletPubkey, signAndSendTransaction, disconnect, isConnected } = useWallet()
  const router = useRouter()

  const [hydrated, setHydrated] = useState(false)

  const [balanceSOL, setBalanceSOL] = useState<number | null>(null)
  const [balanceUSDC, setBalanceUSDC] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState("send")

  const [recipient, setRecipient] = useState("")
  const [amount, setAmount] = useState("")
  const [loadingTx, setLoadingTx] = useState(false)

  const [swapFromToken, setSwapFromToken] = useState<"SOL" | "USDC">("SOL")
  const [swapToToken, setSwapToToken] = useState<"SOL" | "USDC">("USDC")
  const [swapAmount, setSwapAmount] = useState("")
  const [swapLoading, setSwapLoading] = useState(false)

  const [payToken, setPayToken] = useState<"SOL" | "USDC">("SOL")
  const [payAmount, setPayAmount] = useState("")
  const [payLoading, setPayLoading] = useState(false)

  const [txHistory, setTxHistory] = useState<string[]>([])
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const [copied, setCopied] = useState(false)
  const [isHttps, setIsHttps] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState("")
  const [modalBody, setModalBody] = useState("")

  const lastRefreshTimeRef = useRef<number>(0)

  const address = smartWalletPubkey?.toString() ?? ""
  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-6)}` : ""

  useEffect(() => setHydrated(true), [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsHttps(window.location.protocol === "https:" && window.location.hostname === "localhost")
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (!isConnected || !smartWalletPubkey) {
      router.replace("/")
    }
  }, [hydrated, isConnected, smartWalletPubkey, router])

  useEffect(() => {
    if (!hydrated || !isConnected || !smartWalletPubkey) return
    refreshData(false) // initial load, no cooldown check
  }, [hydrated, isConnected, smartWalletPubkey])

  const openModal = (title: string, body: string) => {
    setModalTitle(title)
    setModalBody(body)
    setModalOpen(true)
  }

  const refreshData = async (isUserAction = false) => {
    if (!smartWalletPubkey) return

    const now = Date.now()
    if (isUserAction && now - lastRefreshTimeRef.current < REFRESH_COOLDOWN_MS) {
      openModal("Please wait", "You refreshed recently. Try again in a few seconds.")
      return
    }

    lastRefreshTimeRef.current = now
    setLoadingBalance(true)

    try {
      // SOL balance
      const solLamports = await connection.getBalance(smartWalletPubkey)
      setBalanceSOL(solLamports / LAMPORTS_PER_SOL)

      // USDC balance
      const ata = await getAssociatedTokenAddress(USDC_MINT, smartWalletPubkey, true)
      try {
        const tokenBalance = await connection.getTokenAccountBalance(ata)
        setBalanceUSDC(tokenBalance.value.uiAmount ?? 0)
      } catch {
        setBalanceUSDC(0)
      }

      // Transaction history
      const sigs = await connection.getSignaturesForAddress(smartWalletPubkey, { limit: 5 })
      setTxHistory(sigs.map((s) => s.signature))

      setLastRefresh(new Date())
    } catch (err) {
      console.warn("Refresh failed:", err)
    } finally {
      setLoadingBalance(false)
    }
  }

  const handleRefresh = () => {
    refreshData(true)
  }

  const ensureMerchantAddress = () => {
    if (!MERCHANT_ADDRESS) throw new Error("Merchant address not configured")
    return new PublicKey(MERCHANT_ADDRESS)
  }

  const buildUsdcTransferIx = async (from: PublicKey, to: PublicKey, amountUi: number): Promise<TransactionInstruction> => {
    const fromAta = await getAssociatedTokenAddress(USDC_MINT, from, true)
    const toAta = await getAssociatedTokenAddress(USDC_MINT, to, true)
    const amount = BigInt(Math.floor(amountUi * 1_000_000))
    return createTransferInstruction(fromAta, toAta, from, amount, [], TOKEN_PROGRAM_ID)
  }

  const handleSendTransaction = async () => {
    if (!smartWalletPubkey || !recipient || !amount) return
    setLoadingTx(true)
    try {
      const dest = new PublicKey(recipient)
      const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL)
      if (isNaN(lamports) || lamports <= 0) return

      const transferIx = SystemProgram.transfer({
        fromPubkey: smartWalletPubkey,
        toPubkey: dest,
        lamports,
      })

      const sig = await signAndSendTransaction({
        instructions: [transferIx],
        transactionOptions: { feeToken: "USDC" },
      })

      setRecipient("")
      setAmount("")
      openModal(
        "Transaction sent",
        `Sent ${parseFloat(amount).toFixed(4)} SOL\n\nSignature:\n${sig}\n\nRefresh to see updated balance.`
      )
    } catch (err: any) {
      openModal("Error", err.message || "Transaction failed")
    } finally {
      setLoadingTx(false)
    }
  }

  const handleSwap = async () => {
    if (!smartWalletPubkey || !swapAmount) return
    const uiAmount = parseFloat(swapAmount)
    if (isNaN(uiAmount) || uiAmount <= 0) return

    setSwapLoading(true)
    try {
      const inputMint = swapFromToken === "SOL" ? "So11111111111111111111111111111111111111112" : USDC_MINT.toString()
      const outputMint = swapToToken === "SOL" ? "So11111111111111111111111111111111111111112" : USDC_MINT.toString()
      if (inputMint === outputMint) return

      const decimals = swapFromToken === "SOL" ? 9 : 6
      const amount = Math.floor(uiAmount * 10 ** decimals)

      const quoteRes = await fetch(
        `${JUPITER_API}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=50&onlyDirectRoutes=true&swapMode=ExactIn`
      )
      if (!quoteRes.ok) throw new Error("Quote request failed")
      const quoteJson = await quoteRes.json()
      const route = quoteJson.data?.[0]
      if (!route) throw new Error("No route found")

      const swapRes = await fetch(`${JUPITER_API}/swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteResponse: route,
          userPublicKey: smartWalletPubkey.toString(),
          wrapAndUnwrapSol: true,
        }),
      })
      if (!swapRes.ok) throw new Error("Swap request failed")
      const swapJson = await swapRes.json()
      if (!swapJson.swapTransaction) throw new Error("No transaction returned")

      const swapTxBuffer = Buffer.from(swapJson.swapTransaction, "base64")

      const signature = await signAndSendTransaction({
        serializedTransaction: swapTxBuffer,
        transactionOptions: { feeToken: "USDC" },
      })

      setSwapAmount("")
      openModal(
        "Swap submitted",
        `Transaction sent.\n\nSignature:\n${signature}\n\nRefresh to see updated balances.`
      )
    } catch (err: any) {
      openModal("Swap failed", err.message || "Unknown error")
    } finally {
      setSwapLoading(false)
    }
  }

  const handlePay = async () => {
    if (!smartWalletPubkey || !payAmount) return
    const uiAmount = parseFloat(payAmount)
    if (isNaN(uiAmount) || uiAmount <= 0) return

    setPayLoading(true)
    try {
      const merchant = ensureMerchantAddress()
      let ix: TransactionInstruction

      if (payToken === "SOL") {
        const lamports = Math.floor(uiAmount * LAMPORTS_PER_SOL)
        ix = SystemProgram.transfer({
          fromPubkey: smartWalletPubkey,
          toPubkey: merchant,
          lamports,
        })
      } else {
        ix = await buildUsdcTransferIx(smartWalletPubkey, merchant, uiAmount)
      }

      const sig = await signAndSendTransaction({
        instructions: [ix],
        transactionOptions: { feeToken: "USDC" },
      })

      setPayAmount("")
      openModal(
        "Payment sent",
        `Paid ${uiAmount.toFixed(4)} ${payToken}\n\nSignature:\n${sig}\n\nRefresh to see updated balance.`
      )
    } catch (err: any) {
      openModal("Payment failed", err.message || "Unknown error")
    } finally {
      setPayLoading(false)
    }
  }

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const handleLogout = async () => {
    await disconnect()
    router.replace("/")
  }

  if (!hydrated) return null
  if (!isConnected || !smartWalletPubkey) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 text-slate-50 flex flex-col">
      {isHttps && (
        <div className="bg-yellow-500/10 border border-yellow-500/60 text-yellow-100 px-4 py-3 rounded mb-3 mx-4 mt-3 flex items-start gap-2 text-xs sm:text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold">HTTPS on localhost.</strong> Use
            <code className="bg-yellow-500/20 px-1 py-0.5 rounded ml-1">
              http://localhost:{typeof window !== "undefined" ? window.location.port || "3000" : "3000"}
            </code> for passkeys.
          </div>
        </div>
      )}

      <nav className="border-b border-slate-800 px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center">
            <img src="/solana-logo.svg" alt="Solana" className="w-7 h-7 object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-400">Smart Wallet</span>
            <button
              onClick={handleCopyAddress}
              className="text-xs sm:text-sm font-mono text-slate-100 hover:text-teal-300 transition"
            >
              {shortAddress}
              {copied && <span className="ml-2 text-teal-400">Copied</span>}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="hidden sm:inline text-xs text-slate-400">
              Last refresh: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={loadingBalance}
            className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loadingBalance ? "animate-spin" : ""}`} />
            {loadingBalance ? "Refreshing..." : "Refresh"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">Menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700 text-slate-50">
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      <div className="px-4 sm:px-6 mt-4">
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800">
          <img src="/solana-logo.svg" alt="Solana" className="absolute inset-0 w-full h-full object-cover opacity-20" />
          <div className="relative px-4 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-teal-300">Lazorkit · Gasless · Devnet</p>
              <p className="text-sm text-slate-300 mt-1">
                Passkey smart wallet with SOL / USDC, swap & pay flows.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Devnet</span>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 w-full sm:max-w-lg mb-6 bg-slate-900 border border-slate-800">
            <TabsTrigger value="send" className="text-xs sm:text-sm">Send</TabsTrigger>
            <TabsTrigger value="wallet" className="text-xs sm:text-sm">Wallet</TabsTrigger>
            <TabsTrigger value="swap" className="text-xs sm:text-sm">Swap</TabsTrigger>
            <TabsTrigger value="pay" className="text-xs sm:text-sm">Pay</TabsTrigger>
          </TabsList>

          {/* SEND */}
          <TabsContent value="send">
            <div className="max-w-md space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Recipient Address</label>
                <input
                  className="w-full border border-slate-700 bg-slate-900 text-slate-50 p-3 rounded-md text-xs sm:text-sm font-mono"
                  placeholder="Enter Solana address"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Amount (SOL)</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  className="w-full border border-slate-700 bg-slate-900 text-slate-50 p-3 rounded-md text-sm"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                {balanceSOL !== null && (
                  <p className="text-xs text-slate-400 mt-1">
                    Available: <span className="font-semibold">{balanceSOL.toFixed(4)} SOL</span>
                  </p>
                )}
              </div>
              <Button
                onClick={handleSendTransaction}
                disabled={loadingTx || !recipient || !amount}
                className="w-full"
                size="lg"
              >
                {loadingTx ? "Sending..." : "Send SOL (gasless)"}
              </Button>
            </div>
          </TabsContent>

          {/* WALLET */}
          <TabsContent value="wallet" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader><CardDescription>SOL Balance</CardDescription></CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{balanceSOL !== null ? balanceSOL.toFixed(4) : "--"}</p>
                  <p className="text-xs text-slate-400 mt-1">Solana</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800">
                <CardHeader><CardDescription>USDC Balance</CardDescription></CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">${balanceUSDC !== null ? balanceUSDC.toFixed(2) : "--"}</p>
                  <p className="text-xs text-slate-400 mt-1">USD Coin</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-slate-900 border-slate-800 max-w-2xl">
              <CardHeader><CardDescription>Get Devnet SOL</CardDescription></CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300 mb-2">Get devnet SOL for testing from the official faucet.</p>
                <a href="https://faucet.solana.com" target="_blank" rel="noopener noreferrer" className="text-teal-300 hover:underline text-sm">
                  faucet.solana.com
                </a>
              </CardContent>
            </Card>

            {txHistory.length > 0 && (
              <Card className="bg-slate-950 border-slate-700 max-w-2xl">
                <CardHeader><CardDescription>Recent Transactions</CardDescription></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {txHistory.map((sig, idx) => (
                      <div key={idx} className="font-mono text-xs sm:text-sm p-3 rounded bg-slate-900 text-slate-50 hover:bg-slate-800 transition">
                        <a href={`https://explorer.solana.com/tx/${sig}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {sig.slice(0, 16)}...{sig.slice(-16)}
                        </a>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* SWAP */}
          <TabsContent value="swap">
            <Card className="max-w-md bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ArrowLeftRight className="w-5 h-5" /> SOL ⇄ USDC Swap
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Uses Jupiter aggregator on Devnet with Lazorkit signing.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-medium mb-1">From</label>
                    <select
                      className="w-full border border-slate-700 bg-slate-950 text-slate-50 p-2 rounded text-sm"
                      value={swapFromToken}
                      onChange={(e) => setSwapFromToken(e.target.value as "SOL" | "USDC")}
                    >
                      <option value="SOL">SOL</option>
                      <option value="USDC">USDC</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium mb-1">To</label>
                    <select
                      className="w-full border border-slate-700 bg-slate-950 text-slate-50 p-2 rounded text-sm"
                      value={swapToToken}
                      onChange={(e) => setSwapToToken(e.target.value as "SOL" | "USDC")}
                    >
                      <option value="USDC">USDC</option>
                      <option value="SOL">SOL</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-2">Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    className="w-full border border-slate-700 bg-slate-950 text-slate-50 p-3 rounded text-sm"
                    placeholder="0.0"
                    value={swapAmount}
                    onChange={(e) => setSwapAmount(e.target.value)}
                  />
                </div>
                <Button
                  disabled={swapLoading || !swapAmount}
                  onClick={handleSwap}
                  className="w-full"
                >
                  {swapLoading ? "Swapping..." : "Swap via Jupiter"}
                </Button>
                <p className="text-[11px] text-slate-400 mt-1">
                  If Devnet liquidity or Jupiter’s public API is unavailable, the swap may silently no-op.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PAY */}
          <TabsContent value="pay">
            <Card className="max-w-md bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShoppingCart className="w-5 h-5" /> Pay with Solana
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Send SOL or USDC to a merchant address using your passkey wallet.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-2">Token</label>
                  <select
                    className="w-full border border-slate-700 bg-slate-950 text-slate-50 p-2 rounded text-sm"
                    value={payToken}
                    onChange={(e) => setPayToken(e.target.value as "SOL" | "USDC")}
                  >
                    <option value="SOL">SOL</option>
                    <option value="USDC">USDC</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-2">Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    className="w-full border border-slate-700 bg-slate-950 text-slate-50 p-3 rounded text-sm"
                    placeholder="0.0"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                  />
                </div>
                <Button
                  disabled={payLoading || !payAmount || !MERCHANT_ADDRESS}
                  onClick={handlePay}
                  className="w-full"
                >
                  {payLoading ? "Processing..." : `Pay ${payAmount || ""} ${payToken}`}
                </Button>
                <p className="text-[11px] text-slate-400 mt-1 break-all">
                  Merchant: {MERCHANT_ADDRESS || "Set NEXT_PUBLIC_MERCHANT_ADDRESS in .env"}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-950 border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <h2 className="text-sm sm:text-base font-semibold text-teal-300">{modalTitle}</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 py-4">
              <pre className="whitespace-pre-wrap text-xs sm:text-sm text-slate-100 font-mono">
                {modalBody}
              </pre>
            </div>
            <div className="px-4 py-3 border-t border-slate-800 flex justify-end">
              <Button size="sm" onClick={() => setModalOpen(false)} className="bg-teal-600 hover:bg-teal-500">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}