# LightVote: Blockchain Electronic Voting Research Prototype

[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.22.17-yellow)](https://hardhat.org/)
[![Django](https://img.shields.io/badge/Django-5.1.x-092E20?logo=django)](https://djangoproject.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)

LightVote is an electronic voting research prototype built with React, Django REST Framework, SQLite, Hardhat, and MetaMask.

> **Privacy limitation:** the current `castVote` call sends `candidateId` as public transaction calldata. Chain observers can read each candidate choice, and a wallet tied to a voter can link the transaction to that voter. The event omits candidate ID, but that does not provide ballot secrecy. Do not use this prototype for real elections. Confidential tally publication and nullifier checks do not hide individual choices. A private ballot protocol (for example, audited encrypted ballots with verifiable tallying) is required before real-world use.

---

## 1. System Architecture

```
                  +----------------------------------------------+
                  |               Voter Web Client               |
                  |     (React 18 + TypeScript + Tailwind CSS)   |
                  +----------------------+-----------------------+
                                         |
                  +----------------------+-----------------------+
                  |                                              |
                  v                                              v
      [ JSON-RPC / Ethers.js v6 ]                     [ REST API / Session Cookie ]
                  |                                              |
                  v                                              v
    +---------------------------+                 +-----------------------------+
    |  EVM Blockchain (Hardhat) |                 |  Django REST Backend (5.1)  |
    +---------------------------+                 +-----------------------------+
    | - ElectionManager         |                 | - Voter Eligibility & EPIC  |
    | - VoterEligibility        |                 | - Email OTP Service         |
    | - LightVote (Voting Core) |                 | - Tamil Nadu Geospatial DB  |
    | - ElectionResults         |                 | - PDF Receipt Generation    |
    | - On-chain Nullifiers     |                 | - Benchmark Metrics Engine  |
    +---------------------------+                 +-----------------------------+
                  |                                              |
                  +----------------------+-----------------------+
                                         |
                                         v
                         +-------------------------------+
                         |   Cryptographic Verification  |
                         |  - SHA-256 Nullifier Hashes   |
                         |  - Merkle Tree Proofs         |
                         |  - Off-chain identity records |
                         +-------------------------------+
```

---

## 2. Privacy & Security Model

1. **Off-chain identity data**: PII remains in the Django database and is not included in vote transaction calldata. Voter wallet association can still link voter and transaction.
2. **Nullifier enforcement**: An election-scoped nullifier prevents a second accepted vote for the same credential.
3. **Public candidate choice**: `castVote` calldata contains the candidate ID. The omission from `VoteRecorded` events does not hide this input.
4. **Verifiable receipts**:
   - The receipt can verify that a transaction was accepted, but the public transaction calldata contains the selected candidate ID and sender address. The current system cannot promise that a voter's choice remains unlinkable.

---

## 3. Local Development Accounts

### Local Development Seed Administrators
- Seed account emails default to `admin@lightvote.org` and `district.trichy@lightvote.org`.
- Set `LIGHTVOTE_CENTRAL_ADMIN_PASSWORD` and `LIGHTVOTE_DISTRICT_ADMIN_PASSWORD` before running `seed_initial_data` to create missing local seed accounts. Never use these development accounts in production.
- **Capabilities**: Create elections, set schedules, open/close elections, publish final results, view research benchmarks.

The seed command now preserves existing catalog, election, and candidate rows. It only creates missing seed rows. District and constituency data changes require a deliberate data update; rerunning the seed command will not rewrite existing assignments.

### Default Local Blockchain Accounts (Hardhat Chain ID: 31337)
- **RPC URL**: `http://127.0.0.1:8545`
- **Deployer / Admin**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Test Voter 1**: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- **Test Voter 2**: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`

---

## 4. Quick Start & Running Instructions

### Prerequisites
- Node.js v18+ or v20+
- Python 3.11+ or 3.12+ (tested through 3.14)
- Git

Copy the example environment files and replace the Django and nullifier secrets before use. The example uses the console email backend; it prints OTP messages only in the backend terminal. Use SMTP environment values for email delivery.

### Step 1: Start the Local Hardhat Node
```powershell
cd D:\demo\blockchain
npx hardhat node
```
*Runs at `http://127.0.0.1:8545` (Chain ID 31337).*

### Step 2: Deploy Smart Contracts
In a new terminal:
```powershell
cd D:\demo\blockchain
npm run deploy
```
*This deploys all 4 contracts and exports addresses & ABIs to both frontend and backend.*

### Step 3: Start the Django Backend
In a new terminal:
```powershell
cd D:\demo\blockchain\backend
Copy-Item .env.example .env
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```
*API is accessible at `http://127.0.0.1:8000/api/`.*

### Step 4: Start the React Frontend
In a new terminal:
```powershell
cd D:\demo\blockchain\frontend
Copy-Item .env.example .env
npm run dev
```
*Open your browser and navigate to `http://127.0.0.1:5173/`.*

---

## 5. Smart Contracts Overview

| Contract | Address (Localhost) | Responsibility |
|---|---|---|
| `ElectionManager` | See generated deployment config | Election state machine (`UPCOMING` -> `ACTIVE` -> `ENDED` -> `RESULTS_PUBLISHED` -> `ARCHIVED`, or `CANCELLED`) |
| `VoterEligibility` | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` | Merkle root validation, nullifier registry, double-vote prevention |
| `LightVote` | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` | Main voting contract, vote casting execution, privacy event emissions |
| `ElectionResults` | `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` | Official tally aggregation and cryptographic result certification |

---

## 6. Testing

### Run Solidity Smart Contract Tests (Hardhat)
```powershell
cd <repository-root>
npm test
```
This runs the Solidity unit and integration suite. No coverage percentage is claimed.

### Run Django Backend Unit Tests
```powershell
cd <repository-root>\backend
.\.venv\Scripts\python.exe manage.py test
```

### Production Frontend Build Check
```powershell
cd <repository-root>\frontend
npm run build
```

---

## 7. Research & Benchmarking Module

LightVote includes a comprehensive scientific benchmarking engine comparing LightVote's Lightweight Multi-Validator model against standard Proof-of-Work (PoW) baselines:

- **Metrics Tracked**: Average Latency (ms), P95 Latency (ms), Throughput (TPS), Gas Consumption, Verification Time (ms), CPU/Memory Utilization.
- **Export**: Real-time simulation runs with CSV data export available directly from `/research`.
- **API Endpoint**: `GET /api/research/benchmarks/` and `GET /api/research/export-csv/`.

Local CPU simulation rows are labeled `LOCAL_SIMULATION`; seed rows are `DEVELOPMENT_SEED`. Local simulations do not measure EVM gas or block confirmation time. Only chain transaction measurements may populate those fields.

## 8. API Reference

All routes are prefixed with `/api/`. Session-authenticated writes use the session cookie and CSRF token. OTP send/verify and login are CSRF protected; public read endpoints are anonymous. Administrative routes enforce backend roles. List endpoints use DRF pagination (`page`, `page_size`, maximum 200).

| Endpoint | Methods | Access / purpose |
|---|---|---|
| `/auth/csrf/`, `/auth/send-otp/`, `/auth/verify-otp/`, `/auth/login/`, `/auth/logout/`, `/auth/me/` | GET/POST | CSRF bootstrap; OTP and session authentication |
| `/auth/admins/`, `/auth/admins/<id>/` | GET/POST/PATCH | Central admin only; provision admin accounts, list them, assign district administrators, and activate/deactivate accounts |
| `/voters/register/`, `/voters/profile/` | POST / GET | Register and view own voter profile |
| `/voters/ballot-credential/` | POST | Authenticated approved voter; wallet, election and candidate eligibility check; returns nullifier and Merkle proof |
| `/voters/admin/list/`, `/voters/admin/<id>/review/`, `/voters/admin/<id>/audit-logs/` | GET / POST | Authorized central or assigned district administrators |
| `/voters/admin/eligibility-roots/?election_id=<id>` | GET | Administrator; returns constituency Merkle roots for chain sync |
| `/elections/states/`, `/districts/`, `/constituencies/`, `/elections/` | GET | Public catalog; election creation is central-admin POST with confirmed `creation_tx_hash` |
| `/elections/elections/<id>/` | GET | Election detail |
| `/elections/elections/<id>/status-control/` | POST | Central admin; `{action, tx_hash}` reconciles lifecycle or cancellation against chain |
| `/elections/elections/<id>/sync-from-chain/` | POST | Central admin; synchronizes the election schedule and status from the active contract |
| `/elections/elections/<id>/` | DELETE | Central admin; removes only an election missing from the active chain and with no candidates or receipts; chain history is never erased |
| `/candidates/candidates/`, `/candidates/candidates/<id>/` | GET/POST/PATCH | Candidate reads; admin writes require confirmed registration transaction for creation |
| `/candidates/parties/`, `/candidates/parties/<id>/` | GET/POST/PATCH | Party catalog and central-admin management |
| `/receipts/record/` | POST | Authenticated voter; records only a confirmed matching vote transaction |
| `/receipts/my-receipts/` | GET | Authenticated own receipts |
| `/receipts/verify/<receipt-ref-or-tx>/`, `/receipts/download-pdf/<receipt-ref>/` | GET | Chain-verified public receipt; PDF requires transaction still available on configured chain |
| `/explorer/blocks/`, `/explorer/transactions/`, `/explorer/transactions/<tx-hash>/` | GET | Chain blocks and ledger receipt records |
| `/research/benchmarks/`, `/research/export-csv/` | GET | Public metrics/export; seed and simulation sources are labeled |
| `/research/run-simulation/` | POST | Central admin; `{workload_size, consensus_type}` runs local CPU simulation |

## 9. Environment and Local Setup

Environment variables are documented in `backend/.env.example` and `frontend/.env.example`. Production must set a private `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=False`, explicit `DJANGO_ALLOWED_HOSTS`, exact frontend origins in both `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`, a private `BALLOT_NULLIFIER_SECRET`, `VITE_API_BASE_URL`, the intended RPC and chain ID, contract addresses, and a real email provider. Do not use the local console mail backend or local Hardhat accounts in production. Contract deployment writes ABIs and addresses to `frontend/src/contracts/contracts.json` and `backend/contracts_meta/contracts.json`.

The API uses session cookies and CSRF checks. The frontend gets a CSRF token from `/api/auth/csrf/`; production CORS and CSRF origins must name the exact deployed frontend origin. Wildcard Vercel or Render tenant origins are not trusted.

For a fresh checkout, install root and frontend npm dependencies (`npm install` in each directory), create/activate a backend virtual environment and install `backend/requirements.txt`, copy the example env files, then run:

```powershell
cd D:\demo\blockchain\backend
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py seed_initial_data
.\.venv\Scripts\python.exe manage.py seed_2026_candidates
```

Start each service in its own PowerShell terminal from the repository root (except the Django command, which runs from `backend`):

```powershell
# Terminal 1: local Hardhat JSON-RPC node
npm run node

# Terminal 2: deploy contracts to the local node and publish ABI/address files
npm run deploy

# Terminal 3: Django API
Set-Location .\backend
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000

# Terminal 4: Vite frontend
Set-Location .\frontend
npm run dev
```

The frontend is served at `http://127.0.0.1:5173`. Run `npm run build` from `frontend`, `npm test` from the repository root, and `..\.venv\Scripts\python.exe manage.py test` from `backend` to check the build and test suites.

Use seed users only on a local development instance. Before creating missing seed administrators, set `LIGHTVOTE_CENTRAL_ADMIN_PASSWORD` and `LIGHTVOTE_DISTRICT_ADMIN_PASSWORD` in the environment; the command does not print or embed passwords. Root synchronization is an explicit administrator action after approved voters are present. Freshly deployed contracts start with empty eligibility roots; votes are rejected until roots are synced.

---

## 10. License

This project is released under the **MIT License**.
