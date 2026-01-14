"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@lazorkit/wallet"
import { useRouter } from "next/navigation"

import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
} from "@solana/web3.js"

import { getAssociatedTokenAddress } from "@solana/spl-token"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

import { LogOut, Copy, AlertCircle, AlertTriangle } from "lucide-react"

/* ------------------ Solana Config ------------------ */
// Get your own FREE key at: https://dev.helius.xyz (takes 2 min)
// Or use QuickNode: https://www.quicknode.com
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.devnet.solana.com"

const connection = new Connection(RPC_URL, {
  commitment: "confirmed",
  confirmTransactionInitialTimeout: 90000,
})

const USDC_MINT = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
)

/* ------------------ Dashboard Page ------------------ */
export default function DashboardPage() {
  const { smartWalletPubkey, signAndSendTransaction, disconnect, isConnected } =
    useWallet()
  const router = useRouter()

  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])

  const [balanceSOL, setBalanceSOL] = useState(0)
  const [balanceUSDC, setBalanceUSDC] = useState(0)
  const [activeTab, setActiveTab] = useState("send")
  const [recipient, setRecipient] = useState("")
  const [amount, setAmount] = useState("")
  const [loadingTx, setLoadingTx] = useState(false)
  const [loadingAirdrop, setLoadingAirdrop] = useState(false)
  const [txHistory, setTxHistory] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [isHttps, setIsHttps] = useState(false)

  const address = smartWalletPubkey?.toString() ?? ""
  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-6)}`
    : ""

  /* ------------------ Check if running on HTTPS localhost ------------------ */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isLocalHttps = window.location.protocol === "https:" && 
                          window.location.hostname === "localhost"
      setIsHttps(isLocalHttps)
    }
  }, [])

  /* ------------------ Redirect if not connected ------------------ */
  useEffect(() => {
    if (!hydrated) return
    if (!isConnected || !smartWalletPubkey) router.replace("/")
  }, [hydrated, isConnected, smartWalletPubkey, router])

  /* ------------------ Fetch Balances ------------------ */
  const fetchBalances = async () => {
    if (!smartWalletPubkey) return

    try {
      const solLamports = await connection.getBalance(smartWalletPubkey)
      setBalanceSOL(solLamports / LAMPORTS_PER_SOL)

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
    } catch (err) {
      console.error("Error fetching balances:", err)
    }
  }

  /* ------------------ Fetch Transaction History ------------------ */
  const fetchHistory = async () => {
    if (!smartWalletPubkey) return
    
    try {
      const sigs = await connection.getSignaturesForAddress(
        smartWalletPubkey,
        { limit: 5 }
      )
      setTxHistory(sigs.map((s) => s.signature))
    } catch (err) {
      console.error("Error fetching history:", err)
    }
  }

  /* ------------------ Manual Refresh Button ------------------ */
  const handleRefresh = async () => {
    await fetchBalances()
    await fetchHistory()
    setSuccessMessage("✅ Balances refreshed")
    setTimeout(() => setSuccessMessage(""), 3000)
  }

  /* ------------------ Initial fetch only (no polling) ------------------ */
  useEffect(() => {
    if (!hydrated || !isConnected || !smartWalletPubkey) return
    fetchBalances()
    fetchHistory()
  }, [hydrated, isConnected, smartWalletPubkey])

  /* ------------------ Send Transaction ------------------ */
  const handleSendTransaction = async () => {
    if (!smartWalletPubkey || !recipient || !amount) {
      setErrorMessage("Please fill in all fields")
      return
    }
    
    setLoadingTx(true)
    setErrorMessage("")
    setSuccessMessage("")
    
    try {
      // Validate recipient address
      let dest: PublicKey
      try {
        dest = new PublicKey(recipient)
      } catch {
        throw new Error("Invalid recipient address format")
      }

      const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL)
      
      if (isNaN(lamports) || lamports <= 0) {
        throw new Error("Amount must be greater than 0")
      }

      if (lamports > balanceSOL * LAMPORTS_PER_SOL) {
        throw new Error(`Insufficient balance. You have ${balanceSOL.toFixed(4)} SOL`)
      }

      // Create transfer instruction
      const transferIx = SystemProgram.transfer({
        fromPubkey: smartWalletPubkey,
        toPubkey: dest,
        lamports,
      })

      console.log("Preparing transaction...")
      console.log("From:", smartWalletPubkey.toString())
      console.log("To:", dest.toString())
      console.log("Amount:", lamports / LAMPORTS_PER_SOL, "SOL")

      // Send transaction through Lazor Kit wallet
      const result = await signAndSendTransaction({ 
        instructions: [transferIx]
      })
      
      console.log("Transaction result:", result)
      
      // Clear form
      setRecipient("")
      setAmount("")
      
      // Wait for confirmation
      await new Promise(r => setTimeout(r, 3000))
      
      // Refresh balances
      await fetchBalances()
      await fetchHistory()
      
      setSuccessMessage(`✅ Successfully sent ${amount} SOL!`)
      setTimeout(() => setSuccessMessage(""), 8000)
      
    } catch (err: any) {
      console.error("❌ Transaction failed:", err)
      
      let userMessage = ""
      
      // Check for specific error types
      if (err?.message?.includes("Signing failed")) {
        userMessage = "🔐 Signing failed! This usually means:\n\n" +
                     "1. You're on HTTPS localhost (use HTTP instead)\n" +
                     "2. Browser doesn't support WebAuthn\n" +
                     "3. Wallet connection issue\n\n" +
                     "Solution: Access via http://localhost:3000 (not https://)"
      } else if (err?.message?.includes("User rejected")) {
        userMessage = "❌ You cancelled the transaction"
      } else if (err?.message?.includes("Insufficient")) {
        userMessage = err.message
      } else if (err?.message?.includes("Invalid")) {
        userMessage = err.message
      } else {
        userMessage = `❌ Transaction failed: ${err?.message || "Unknown error"}`
      }
      
      setErrorMessage(userMessage)
    } finally {
      setLoadingTx(false)
    }
  }

  /* ------------------ Request Airdrop ------------------ */
  const handleAirdrop = async () => {
    if (!smartWalletPubkey) return
    
    setLoadingAirdrop(true)
    setErrorMessage("")
    setSuccessMessage("")
    
    try {
      console.log("Requesting 1 SOL airdrop...")
      
      const signature = await connection.requestAirdrop(
        smartWalletPubkey,
        LAMPORTS_PER_SOL
      )
      
      console.log("Airdrop requested, signature:", signature)
      console.log("Waiting for confirmation...")
      
      // Wait for confirmation with timeout
      const latestBlockhash = await connection.getLatestBlockhash()
      
      await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      }, "confirmed")
      
      console.log("✅ Airdrop confirmed!")
      
      // Wait a bit then refresh
      await new Promise(r => setTimeout(r, 2000))
      await fetchBalances()
      
      setSuccessMessage("✅ Airdrop successful! 1 SOL added to your wallet.")
      setTimeout(() => setSuccessMessage(""), 8000)
      
    } catch (err: any) {
      console.error("Airdrop error:", err)
      
      let errorMsg = "Airdrop failed. "
      
      if (err?.message?.includes("429") || err?.message?.includes("rate limit")) {
        errorMsg += "Rate limit reached. Please use https://faucet.solana.com instead."
      } else if (err?.message?.includes("airdrop request limit")) {
        errorMsg += "Airdrop limit reached. Use https://faucet.solana.com"
      } else {
        errorMsg += "Try the web faucet at https://faucet.solana.com"
      }
      
      setErrorMessage(errorMsg)
    } finally {
      setLoadingAirdrop(false)
    }
  }

  /* ------------------ Copy Address ------------------ */
  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Copy failed", err)
    }
  }

  /* ------------------ Logout ------------------ */
  const handleLogout = async () => {
    await disconnect()
    router.replace("/")
  }

  /* ------------------ Render Guard ------------------ */
  if (!hydrated) return null
  if (!isConnected || !smartWalletPubkey) return null

  /* ------------------ UI ------------------ */
  return (
    <div className="min-h-screen bg-background p-6">
      {/* HTTPS Warning */}
      {isHttps && (
        <div className="bg-yellow-50 border-2 border-yellow-400 text-yellow-900 px-4 py-3 rounded mb-4 flex items-start gap-2">
          <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">⚠️ HTTPS on Localhost Detected!</strong>
            <p className="text-sm mt-1">
              WebAuthn signing will fail on HTTPS localhost. Please access via:{" "}
              <code className="bg-yellow-100 px-2 py-1 rounded">
                http://localhost:{window.location.port || "3000"}
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
          {copied && <span className="text-green-600 text-sm font-medium">Copied!</span>}
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleRefresh}>
            Refresh
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost">Menu</Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
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
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-4 font-medium">
          {successMessage}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 max-w-sm mb-6">
          <TabsTrigger value="send">Send</TabsTrigger>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-4">
          <div className="max-w-md space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Recipient Address
              </label>
              <input
                className="w-full border border-gray-300 p-3 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="Enter Solana address (e.g., 7xKX...aBcD)"
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
              <p className="text-sm text-gray-600 mt-1">
                Available: <span className="font-semibold">{balanceSOL.toFixed(4)} SOL</span>
              </p>
            </div>
            
            <Button 
              onClick={handleSendTransaction} 
              disabled={loadingTx || !recipient || !amount}
              className="w-full"
              size="lg"
            >
              {loadingTx ? "Sending..." : "Send SOL"}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              Make sure you're on <code className="bg-gray-100 px-1 rounded">http://</code> not https://
            </p>
          </div>
        </TabsContent>

        <TabsContent value="wallet" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
            <Card>
              <CardHeader>
                <CardDescription>SOL Balance</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{balanceSOL.toFixed(4)}</p>
                <p className="text-sm text-gray-500 mt-1">Solana</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>USDC Balance</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">${balanceUSDC.toFixed(2)}</p>
                <p className="text-sm text-gray-500 mt-1">USD Coin</p>
              </CardContent>
            </Card>
          </div>

          <Card className="max-w-2xl">
            <CardHeader>
              <CardDescription>Get Devnet SOL</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={handleAirdrop} 
                disabled={loadingAirdrop}
                variant="outline"
                className="w-full sm:w-auto"
              >
                {loadingAirdrop ? "Requesting..." : "Request 1 SOL (Devnet)"}
              </Button>
              <p className="text-sm text-gray-600">
                Or visit: <a 
                  href="https://faucet.solana.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  faucet.solana.com
                </a> (more reliable)
              </p>
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
                    <div key={idx} className="font-mono text-sm p-3 bg-gray-50 rounded hover:bg-gray-100 transition">
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
      </Tabs>
    </div>
  )
}