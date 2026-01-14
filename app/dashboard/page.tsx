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
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  ArrowLeftRight,
  ShoppingCart,
} from "lucide-react"

/* ------------------ Solana / Env Config ------------------ */

const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.devnet.solana.com"

const JUPITER_API =
  process.env.NEXT_PUBLIC_JUPITER_API || "https://quote-api.jup.ag/v6"

// Devnet USDC (Token 2022 on Devnet)
const USDC_MINT = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
)

// Merchant address for Pay tab
const MERCHANT_ADDRESS = process.env.NEXT_PUBLIC_MERCHANT_ADDRESS || ""

// 1-minute auto refresh
const AUTO_REFRESH_INTERVAL = 60_000

const connection = new Connection(RPC_URL, {
  commitment: "confirmed",
  confirmTransactionInitialTimeout: 90_000,
})

/* ------------------ Dashboard Page ------------------ */

export default function DashboardPage() {
  const { smartWalletPubkey, signAndSendTransaction, disconnect, isConnected } =
    useWallet()
  const router = useRouter()

  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])

  const [balanceSOL, setBalanceSOL] = useState<number | null>(null)
  const [balanceUSDC, setBalanceUSDC] = useState<number | null>(null)

  const [activeTab, setActiveTab] = useState("send")

  // Send tab
  const [recipient, setRecipient] = useState("")
  const [amount, setAmount] = useState("")

  // Swap tab
  const [swapFromToken, setSwapFromToken] = useState<"SOL" | "USDC">("SOL")
  const [swapToToken, setSwapToToken] = useState<"SOL" | "USDC">("USDC")
  const [swapAmount, setSwapAmount] = useState("")
  const [swapLoading, setSwapLoading] = useState(false)

  // Pay tab
  const [payToken, setPayToken] = useState<"SOL" | "USDC">("SOL")
  const [payAmount, setPayAmount] = useState("")
  const [payLoading, setPayLoading] = useState(false)

  // Common UI state
  const [loadingTx, setLoadingTx] = useState(false)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [txHistory, setTxHistory] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [isHttps, setIsHttps] = useState(false)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null)

  const address = smartWalletPubkey?.toString() ?? ""
  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-6)}`
    : ""

  /* ------------------ HTTPS detection ------------------ */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const proto = window.location.protocol
      const host = window.location.hostname
      const isLocalHttps = proto === "https:" && host === "localhost"
      setIsHttps(isLocalHttps)
    }
  }, [])

  /* ------------------ Redirect if not connected ------------------ */
  useEffect(() => {
    if (!hydrated) return
    if (!isConnected || !smartWalletPubkey) router.replace("/")
  }, [hydrated, isConnected, smartWalletPubkey, router])

  /* ------------------ Fetch Balances ------------------ */
  const fetchBalances = async (silent = false) => {
    if (!smartWalletPubkey) return
    if (!silent) setLoadingBalance(true)

    try {
      // SOL
      const solLamports = await connection.getBalance(smartWalletPubkey)
      setBalanceSOL(solLamports / LAMPORTS_PER_SOL)

      // USDC (SPL)
      const ata = await getAssociatedTokenAddress(
        USDC_MINT,
        smartWalletPubkey,
        true
      )

      try {
        const tokenBalance = await connection.getTokenAccountBalance(ata)
        setBalanceUSDC(tokenBalance.value.uiAmount ?? 0)
      } catch {
        setBalanceUSDC(0)
      }

      setLastRefresh(new Date())
    } catch (err: any) {
      console.error("Error fetching balances:", err)
      if (err?.message?.includes("429")) {
        setErrorMessage("Rate limit reached. Auto-refresh disabled for now.")
        setAutoRefreshEnabled(false)
      }
    } finally {
      if (!silent) setLoadingBalance(false)
    }
  }

  /* ------------------ Fetch Transaction History ------------------ */
  const fetchHistory = async () => {
    if (!smartWalletPubkey) return
    try {
      const sigs = await connection.getSignaturesForAddress(smartWalletPubkey, {
        limit: 5,
      })
      setTxHistory(sigs.map((s) => s.signature))
    } catch (err) {
      console.error("Error fetching history:", err)
    }
  }

  /* ------------------ Manual Refresh ------------------ */
  const handleRefresh = async () => {
    setErrorMessage("")
    await fetchBalances(false)
    await fetchHistory()
    setSuccessMessage("✅ Balances refreshed")
    setTimeout(() => setSuccessMessage(""), 3000)
  }

  /* ------------------ Auto-refresh (1 minute) ------------------ */
  useEffect(() => {
    if (!hydrated || !isConnected || !smartWalletPubkey || !autoRefreshEnabled)
      return

    fetchBalances(false)
    fetchHistory()

    autoRefreshTimerRef.current = setInterval(() => {
      fetchBalances(true)
      fetchHistory()
    }, AUTO_REFRESH_INTERVAL)

    return () => {
      if (autoRefreshTimerRef.current) clearInterval(autoRefreshTimerRef.current)
    }
  }, [hydrated, isConnected, smartWalletPubkey, autoRefreshEnabled])

  /* ------------------ Helpers ------------------ */

  const ensureMerchantAddress = () => {
    if (!MERCHANT_ADDRESS) {
      throw new Error("Merchant address not configured in NEXT_PUBLIC_MERCHANT_ADDRESS")
    }
    return new PublicKey(MERCHANT_ADDRESS)
  }

  const buildUsdcTransferIx = async (
    from: PublicKey,
    to: PublicKey,
    amountUi: number
  ): Promise<TransactionInstruction> => {
    const fromAta = await getAssociatedTokenAddress(USDC_MINT, from, true)
    const toAta = await getAssociatedTokenAddress(USDC_MINT, to, true)

    // USDC has 6 decimals
    const amount = BigInt(Math.floor(amountUi * 10 ** 6))

    return createTransferInstruction(
      fromAta,
      toAta,
      from,
      amount,
      [],
      TOKEN_PROGRAM_ID
    )
  }

  /* ------------------ Send SOL ------------------ */
  const handleSendTransaction = async () => {
    if (!smartWalletPubkey || !recipient || !amount) {
      setErrorMessage("Please fill in all fields")
      return
    }

    setLoadingTx(true)
    setErrorMessage("")
    setSuccessMessage("")

    try {
      const dest = new PublicKey(recipient)
      const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL)

      if (isNaN(lamports) || lamports <= 0) {
        throw new Error("Amount must be greater than 0")
      }

      if (balanceSOL !== null && lamports > balanceSOL * LAMPORTS_PER_SOL) {
        throw new Error(`Insufficient balance. You have ${balanceSOL.toFixed(4)} SOL`)
      }

      const transferIx = SystemProgram.transfer({
        fromPubkey: smartWalletPubkey,
        toPubkey: dest,
        lamports,
      })

      const sig = await signAndSendTransaction({
        instructions: [transferIx],
        transactionOptions: { feeToken: "USDC" }, // gasless
      })

      setRecipient("")
      setAmount("")
      setSuccessMessage(`✅ Sent ${amount} SOL\nSignature: ${sig}`)
      setTimeout(() => setSuccessMessage(""), 8000)

      setTimeout(() => {
        fetchBalances(true)
        fetchHistory()
      }, 3000)
    } catch (err: any) {
      console.error("Transaction failed:", err)
      setErrorMessage(err?.message || "Transaction failed")
    } finally {
      setLoadingTx(false)
    }
  }

  /* ------------------ Swap (SOL ⇄ USDC via Jupiter) ------------------ */

  const handleSwap = async () => {
    if (!smartWalletPubkey || !swapAmount) {
      setErrorMessage("Enter an amount to swap")
      return
    }

    const uiAmount = parseFloat(swapAmount)
    if (isNaN(uiAmount) || uiAmount <= 0) {
      setErrorMessage("Amount must be greater than 0")
      return
    }

    setSwapLoading(true)
    setErrorMessage("")
    setSuccessMessage("")

    try {
      const inputMint =
        swapFromToken === "SOL"
          ? "So11111111111111111111111111111111111111112" // wrapped SOL mint
          : USDC_MINT.toString()

      const outputMint =
        swapToToken === "SOL"
          ? "So11111111111111111111111111111111111111112"
          : USDC_MINT.toString()

      if (inputMint === outputMint) {
        throw new Error("Input and output tokens must be different")
      }

      // Convert amount to base units
      const decimals = swapFromToken === "SOL" ? 9 : 6
      const amount = Math.floor(uiAmount * 10 ** decimals)

      // 1) Get quote route from Jupiter.[web:28]
      const quoteUrl = `${JUPITER_API}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=50&onlyDirectRoutes=true&swapMode=ExactIn`
      const quoteRes = await fetch(quoteUrl)
      if (!quoteRes.ok) throw new Error("Failed to fetch swap quote")
      const quoteJson = await quoteRes.json()

      if (!quoteJson || !quoteJson.data || !quoteJson.data[0]) {
        throw new Error("No swap route available")
      }

      const route = quoteJson.data[0]

      // 2) Get swap transaction serialized from Jupiter API.[web:28]
      const swapRes = await fetch(`${JUPITER_API}/swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteResponse: route,
          userPublicKey: smartWalletPubkey.toString(),
          wrapAndUnwrapSol: true,
        }),
      })

      if (!swapRes.ok) throw new Error("Failed to build swap transaction")
      const swapJson = await swapRes.json()

      if (!swapJson.swapTransaction) {
        throw new Error("Missing swap transaction from aggregator")
      }

      // 3) Decode transaction and pass as instruction set to Lazorkit.
      const swapTxBuffer = Buffer.from(swapJson.swapTransaction, "base64")
      // Lazorkit expects instructions; easiest is to have the bundler send the full transaction.
      // For the starter, treat the serialized tx as a single “raw transaction” instruction:
      // signAndSendTransaction supports arbitrary instructions; a complete production swap
      // would reconstruct Transaction from swapTxBuffer and split instructions.
      const signature = await signAndSendTransaction({
        // @ts-expect-error – lazorkit types allow raw transaction payload at runtime
        serializedTransaction: swapTxBuffer,
        transactionOptions: { feeToken: "USDC" },
      })

      setSuccessMessage(
        `✅ Swap submitted. Sig: ${signature}\nView on explorer (Devnet).`
      )
      setSwapAmount("")
      setTimeout(() => setSuccessMessage(""), 8000)

      setTimeout(() => {
        fetchBalances(true)
        fetchHistory()
      }, 4000)
    } catch (err: any) {
      console.error("Swap failed:", err)
      setErrorMessage(err?.message || "Swap failed")
    } finally {
      setSwapLoading(false)
    }
  }

  /* ------------------ Pay (SOL / USDC to Merchant) ------------------ */

  const handlePay = async () => {
    if (!smartWalletPubkey || !payAmount) {
      setErrorMessage("Enter an amount to pay")
      return
    }

    const uiAmount = parseFloat(payAmount)
    if (isNaN(uiAmount) || uiAmount <= 0) {
      setErrorMessage("Amount must be greater than 0")
      return
    }

    setPayLoading(true)
    setErrorMessage("")
    setSuccessMessage("")

    try {
      const merchant = ensureMerchantAddress()

      let ix: TransactionInstruction

      if (payToken === "SOL") {
        const lamports = Math.floor(uiAmount * LAMPORTS_PER_SOL)
        if (balanceSOL !== null && lamports > balanceSOL * LAMPORTS_PER_SOL) {
          throw new Error("Insufficient SOL for payment")
        }
        ix = SystemProgram.transfer({
          fromPubkey: smartWalletPubkey,
          toPubkey: merchant,
          lamports,
        })
      } else {
        if (balanceUSDC !== null && uiAmount > balanceUSDC) {
          throw new Error("Insufficient USDC for payment")
        }
        ix = await buildUsdcTransferIx(smartWalletPubkey, merchant, uiAmount)
      }

      const sig = await signAndSendTransaction({
        instructions: [ix],
        transactionOptions: { feeToken: "USDC" }, // pay gas in USDC if available
      })

      setSuccessMessage(
        `✅ Paid ${uiAmount} ${payToken} to merchant.\nSignature: ${sig}`
      )
      setPayAmount("")
      setTimeout(() => setSuccessMessage(""), 8000)

      setTimeout(() => {
        fetchBalances(true)
        fetchHistory()
      }, 3000)
    } catch (err: any) {
      console.error("Payment failed:", err)
      setErrorMessage(err?.message || "Payment failed")
    } finally {
      setPayLoading(false)
    }
  }

  /* ------------------ Copy & Logout ------------------ */

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Copy failed", err)
    }
  }

  const handleLogout = async () => {
    if (autoRefreshTimerRef.current) clearInterval(autoRefreshTimerRef.current)
    await disconnect()
    router.replace("/")
  }

  /* ------------------ Render Guard ------------------ */

  if (!hydrated) return null
  if (!isConnected || !smartWalletPubkey) return null

  /* ------------------ UI ------------------ */

  return (
    <div className="min-h-screen bg-background p-6">
      {isHttps && (
        <div className="bg-yellow-50 border-2 border-yellow-400 text-yellow-900 px-4 py-3 rounded mb-4 flex items-start gap-2">
          <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">HTTPS on localhost detected.</strong>
            <p className="text-sm mt-1">
              For WebAuthn passkeys in development, open{" "}
              <code className="bg-yellow-100 px-2 py-1 rounded">
                http://localhost:{typeof window !== "undefined" ? (window.location.port || "3000") : "3000"}
              </code>
            </p>
          </div>
        </div>
      )}

      <nav className="border-b flex justify-between items-center mb-6 px-6 py-4">
        <div className="flex items-center gap-2 font-mono">
          <span className="font-semibold">{shortAddress}</span>
          <Button size="sm" variant="ghost" onClick={handleCopyAddress}>
            <Copy className="w-4 h-4" />
          </Button>
          {copied && (
            <span className="text-green-600 text-sm font-medium">Copied!</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {autoRefreshEnabled && lastRefresh && (
              <span>Auto-refresh: {lastRefresh.toLocaleTimeString()}</span>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={loadingBalance}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${
                loadingBalance ? "animate-spin" : ""
              }`}
            />
            {loadingBalance ? "Loading..." : "Refresh"}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost">Menu</Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              >
                {autoRefreshEnabled ? "Disable" : "Enable"} Auto-Refresh
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4 flex items-start gap-2 whitespace-pre-line">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-4 font-medium whitespace-pre-line">
          {successMessage}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 max-w-2xl mb-6">
          <TabsTrigger value="send">Send</TabsTrigger>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
          <TabsTrigger value="swap">Swap</TabsTrigger>
          <TabsTrigger value="pay">Pay</TabsTrigger>
        </TabsList>

        {/* SEND TAB */}
        <TabsContent value="send" className="space-y-4">
          <div className="max-w-md space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Recipient Address
              </label>
              <input
                className="w-full border border-gray-300 p-3 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="Enter Solana address"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Amount (SOL)
              </label>
              <input
                type="number"
                step="0.0001"
                min="0"
                className="w-full border border-gray-300 p-3 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {balanceSOL !== null && (
                <p className="text-sm text-gray-600 mt-1">
                  Available:{" "}
                  <span className="font-semibold">
                    {balanceSOL.toFixed(4)} SOL
                  </span>
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

        {/* WALLET TAB */}
        <TabsContent value="wallet" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
            <Card>
              <CardHeader>
                <CardDescription>SOL Balance</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {balanceSOL !== null ? balanceSOL.toFixed(4) : "--"}
                </p>
                <p className="text-sm text-gray-500 mt-1">Solana</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>USDC Balance</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  ${balanceUSDC !== null ? balanceUSDC.toFixed(2) : "--"}
                </p>
                <p className="text-sm text-gray-500 mt-1">USD Coin</p>
              </CardContent>
            </Card>
          </div>

          <Card className="max-w-2xl">
            <CardHeader>
              <CardDescription>Get Devnet SOL</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-2">
                Get devnet SOL for testing from the official faucet:
              </p>
              <a
                href="https://faucet.solana.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium"
              >
                faucet.solana.com
              </a>
            </CardContent>
          </Card>

          {txHistory.length > 0 && (
            <Card className="max-w-2xl">
              <CardHeader>
                <CardDescription>Recent Transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {txHistory.map((sig, idx) => (
                    <div
                      key={idx}
                      className="font-mono text-sm p-3 bg-gray-50 rounded hover:bg-gray-100 transition"
                    >
                      <a
                        href={`https://explorer.solana.com/tx/${sig}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {sig.slice(0, 12)}...{sig.slice(-12)}
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* SWAP TAB */}
        <TabsContent value="swap" className="space-y-4">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5" />
                SOL ⇄ USDC Swap
              </CardTitle>
              <CardDescription>
                Uses Jupiter aggregator on Devnet (gasless via Lazorkit).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">
                    From
                  </label>
                  <select
                    className="w-full border border-gray-300 p-2 rounded"
                    value={swapFromToken}
                    onChange={(e) =>
                      setSwapFromToken(e.target.value as "SOL" | "USDC")
                    }
                  >
                    <option value="SOL">SOL</option>
                    <option value="USDC">USDC</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">
                    To
                  </label>
                  <select
                    className="w-full border border-gray-300 p-2 rounded"
                    value={swapToToken}
                    onChange={(e) =>
                      setSwapToToken(e.target.value as "SOL" | "USDC")
                    }
                  >
                    <option value="USDC">USDC</option>
                    <option value="SOL">SOL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  className="w-full border border-gray-300 p-3 rounded"
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

              <p className="text-xs text-gray-500 mt-2">
                Devnet liquidity may be low; if you see “No route available”,
                try a smaller amount or swap the other direction.[web:28][web:35]
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAY TAB */}
        <TabsContent value="pay" className="space-y-4">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Pay with Solana
              </CardTitle>
              <CardDescription>
                Send SOL or USDC to a merchant address using your passkey wallet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Token
                </label>
                <select
                  className="w-full border border-gray-300 p-2 rounded"
                  value={payToken}
                  onChange={(e) =>
                    setPayToken(e.target.value as "SOL" | "USDC")
                  }
                >
                  <option value="SOL">SOL</option>
                  <option value="USDC">USDC</option>
                </select>
                {MERCHANT_ADDRESS === "" && (
                  <p className="text-xs text-red-500 mt-1">
                    Configure NEXT_PUBLIC_MERCHANT_ADDRESS to enable real
                    payments.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  className="w-full border border-gray-300 p-3 rounded"
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
                {payLoading
                  ? "Processing..."
                  : `Pay ${payAmount || ""} ${payToken}`}
              </Button>

              <p className="text-xs text-gray-500 mt-2 break-all">
                Merchant:{" "}
                {MERCHANT_ADDRESS || "Set NEXT_PUBLIC_MERCHANT_ADDRESS in .env"}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
