# LightVote Production Deployment Guide

This guide covers deployment options for the LightVote application stack:
1. **Docker Compose (Full-Stack)**
2. **Cloud / VPS Server (Ubuntu/Debian with Gunicorn & Nginx)**
3. **Public Blockchain Testnet Deployment (Sepolia / Polygon Amoy)**

---

## 1. Quick Deployment via Docker Compose

The simplest way to run both the frontend and backend in production:

```bash
cd blockchain

# Build and start both containers
docker-compose up -d --build
```
- **Frontend**: `http://<your-server-ip>/` (served via Nginx on port 80, proxying `/api/` to Django)
- **Backend API**: `http://<your-server-ip>:8000/api/`

---

## 2. Deploying Smart Contracts to Public EVM Testnets

LightVote is configured for **Sepolia (Ethereum Testnet)** and **Polygon Amoy**:

### Step 1: Set Environment Variables
In `blockchain/.env`:
```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
POLYGON_AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_API_KEY
DEPLOYER_PRIVATE_KEY=0xYOUR_TESTNET_DEPLOYER_PRIVATE_KEY
```

### Step 2: Deploy Contracts
```bash
# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# OR Deploy to Polygon Amoy
npx hardhat run scripts/deploy.js --network amoy
```
*The deployment script automatically updates `frontend/src/contracts/contracts.json` and `backend/contracts_meta/contracts.json` with the deployed addresses and ABIs.*

---

## 3. Production Environment Checklist

Before publishing to production:

| Variable | Location | Production Recommended Setting |
|---|---|---|
| `DJANGO_DEBUG` | `backend/.env` | `False` |
| `DJANGO_SECRET_KEY` | `backend/.env` | 50+ character random string |
| `DJANGO_ALLOWED_HOSTS` | `backend/.env` | Your domain name (e.g., `vote.example.org`) |
| `CORS_ALLOWED_ORIGINS` | `backend/.env` | `https://vote.example.org` |
| `CSRF_TRUSTED_ORIGINS` | `backend/.env` | `https://vote.example.org` |
| `HARDHAT_RPC_URL` | `backend/.env` | Public RPC or Alchemy/Infura URL |
| `CHAIN_ID` | `backend/.env` | `11155111` (Sepolia) or `80002` (Amoy) |
| `BALLOT_NULLIFIER_SECRET` | `backend/.env` | 64-character secret for voter nullifiers |
| `EMAIL_BACKEND_TYPE` | `backend/.env` | `smtp` with real SMTP credentials for OTP delivery |

---

## 4. Frontend Standalone Static Hosting (Vercel / Netlify)

If hosting the frontend separately on Vercel or Netlify:

1. Configure Build Settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
2. Set Environment Variables:
   - `VITE_API_BASE_URL`: `https://api.yourdomain.com/api`
   - `VITE_RPC_URL`: `https://rpc.sepolia.org`
   - `VITE_CHAIN_ID`: `11155111`
   - `VITE_CHAIN_NAME`: `Sepolia Testnet`
