Lazorkit Starter — Solana Smart Wallet

A wallet-less Solana wallet with passkey authentication, gasless transactions, and instant setup. Built with Next.js, TailwindCSS, Lazorkit Wallet SDK, and Jupiter aggregator for Devnet swaps.

---

Features

Passkey Authentication: Biometric & device security login. No seed phrases required.
Gasless Transactions: Send SOL/USDC or perform swaps without paying network fees (via paymaster).
Instant Wallet Setup: No browser extensions or downloads required.
Swap SOL ⇄ USDC: Powered by Jupiter Devnet aggregator.
Payment Flow: Send SOL/USDC to a merchant address with a single click.
Dashboard: View balances, recent transactions, and quick actions.
Responsive Design: Built with TailwindCSS for modern UI and animations.

---

Tech Stack

Frontend: Next.js 16, React 19, TailwindCSS 4
Wallet Integration: [@lazorkit/wallet](https://www.npmjs.com/package/@lazorkit/wallet)
UI Components: Radix UI, Lucide Icons, Recharts
Blockchain: Solana Devnet (@solana/web3.js, @solana/spl-token)
Swap Aggregator: Jupiter API v6
Forms & Validation: React Hook Form, Zod

---

Environment Variables

Create a .env.local file with the following keys (replace placeholders with your own):


NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_JUPITER_API=https://quote-api.jup.ag/v6
NEXT_PUBLIC_MERCHANT_ADDRESS=YOUR_MERCHANT_PUBLIC_KEY


> ⚠️ Do not commit your private keys. Only public RPC endpoints and public addresses should be exposed.

---

Installation

```bash
# Clone the repository
git clone https://github.com/Southeast-lab/solanademo.git
cd solanademo

# Install dependencies
npm install

# Run development server
npm run dev
```

Open http://localhost:3000 to view the app.

---

Available Scripts

| Command         | Description                                       |
| --------------- | ------------------------------------------------- |
| `npm run dev`   | Runs the app in development mode with hot reload. |
| `npm run build` | Builds the production-ready app.                  |
| `npm run start` | Starts the production server.                     |
| `npm run lint`  | Runs ESLint checks.                               |

---

Project Structure

```
/app
  /auth          
  /dashboard     
  page.tsx      
  layout.tsx    
/components
  /ui            
/public          
/styles
  globals.css    
.env.local       
package.json     
```

---

How It Works

1. Landing Page
   Users can get started or view their wallet if already connected.

2. Authentication (/auth)
   Users sign in with passkey authentication. No seed phrase is needed. Wallet is gasless on Devnet.

3. Dashboard (/dashboard)

   View SOL and USDC balances.
   Send SOL/USDC to any address.
   Swap between SOL ⇄ USDC using Jupiter Devnet aggregator.
   Pay a merchant address in SOL/USDC.
   View recent transactions with links to Solana Explorer.

4. Wallet Operations

   Send SOL: Gasless via paymaster.
   Swap Tokens: Queries Jupiter API for best direct swap route.
   Pay Merchant: Supports SOL or USDC transfers.

---

Notes

Only Solana Devnet is currently supported.
Swaps rely on Jupiter’s public Devnet API; liquidity may vary.
Passkeys are stored only on the user’s device.
All transactions are signed using the Lazorkit Smart Wallet SDK.

---

Contributing

1. Fork the repository.
2. Create your feature branch: git checkout -b feature/my-feature.
3. Commit changes: git commit -m "Add my feature".
4. Push to branch: git push origin feature/my-feature.
5. Open a pull request.

---

License

MIT License © Southeast-lab

---
