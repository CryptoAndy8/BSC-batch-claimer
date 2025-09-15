# BSC Batch Claimer

Headless batch claimer for **Xterio BNB** migration on BSC.  
Calls `claim(uint256 amount, bytes32[] proof)` directly on-chain.

**Features**
- RPC rotation (comma-separated RPC list)
- Auto-discovery of Xterio proof endpoints (with `AIRDROP_ID`)
- Parses multiple proof JSON shapes (works with the portal’s response)
- Random per-wallet delay (`DELAY_RANGE_SEC`)
- Claim-only (no sweeping)

## Requirements
- Node.js 18+
- BSC RPC(s)

## Setup

1. Install:
   ```bash
   npm i
Create .env from .env.example and edit:

BSC_RPC_URLS – e.g. https://binance.llamarpc.com,https://bsc-rpc.publicnode.com

CLAIM_CONTRACT – 0xB0B8c92a12655E97A692cb6Dc1867abc71BeFDBC

AIRDROP_ID – from the claim page URL (UUID)

Optional: PROOF_AUTH_HEADER, PROOF_COOKIE, PROOF_HEADERS_EXTRA
(leave empty if the endpoint is public)

Create keys.txt (one private key per line).

Run
npm start
