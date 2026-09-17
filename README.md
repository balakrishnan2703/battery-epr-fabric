# Blockchain-Based EPR Verification System for India's Battery Recycling Sector

A complete college-level decentralized application built on **Hyperledger Fabric** implementing India's **Battery Waste Management Rules (BWMR), 2022** issued by the Central Pollution Control Board (CPCB) and Ministry of Environment, Forest & Climate Change (MoEFCC).

---

## 📌 Problem Statement & Regulatory Context

Under India's **Battery Waste Management Rules (BWMR) 2022**, battery manufacturers/producers are legally mandated to fulfill **Extended Producer Responsibility (EPR)** targets. This requires collecting used batteries and sending them to **CPCB-Authorized Recyclers** to recover strategic materials (Lead, Lithium, Cobalt, Plastics).

### Critical Vulnerabilities in the Existing Process:
1. **Informal Sector Leakage**: Over 60% of used batteries in India are dismantled in unorganized scrap markets without environmental safeguards.
2. **Counterfeit EPR Certificates**: Producers submit unverified or forged paper/PDF certificates to claim compliance.
3. **Double Counting Fraud**: The same batch of recycled scrap is recycled on paper multiple times across different producers.
4. **Lack of End-to-End Traceability**: No unified digital passport links a battery from the factory gate to final material extraction.

### Hyperledger Fabric Solution:
- **Unique Digital Battery Passport**: Every manufactured battery is assigned a unique Battery ID (`BAT-IND-2026-XXXX`) and scannable QR code on the Fabric ledger.
- **Permissioned Chain of Custody**: State transitions from Manufacturer -> Consumer -> Informal Collector -> Authorized Recycler.
- **Smart Contract Recycler Authorization**: Recycler CPCB registration and chemistry permits are enforced by chaincode.
- **Cryptographic Fraud Prevention**: Double recycling and duplicate EPR certificates are strictly prevented.
- **Tamper-Proof EPR Minting**: Automatic minting of immutable EPR certificates with SHA-256 digital seals.
- **Regulator Verification & Audit Trail**: Central Pollution Control Board verifies certificates and audits chronological transactions using `GetHistoryForKey`.

---

## 🏛️ System Architecture

```
+---------------------------------------------------------------------------------+
|                           HYPERLEDGER FABRIC NETWORK                           |
|  Channel: battery-channel  |  Chaincode: battery-epr  |  Endorser: Org1MSP      |
+--------------------------------------┬------------------------------------------+
                                       |
                +----------------------┴----------------------+
                |                                             |
+---------------v---------------+             +---------------v---------------+
|     IMMUTABLE BLOCK LEDGER    |             |       WORLD STATE STORE       |
|  Cryptographic Block Hash     |             |  Key-Value State Database     |
|  Merkle Root / Data Hash      |             |  * BATTERY_{id}               |
|  Previous Block Hash Pointers |             |  * RECYCLER_{id}              |
|  Transaction History Key DB   |             |  * CERT_{id}                  |
+-------------------------------+             +-------------------------------+
                ^                                             ^
                +----------------------┬----------------------+
                                       | Fabric Gateway
+--------------------------------------┴------------------------------------------+
|                         NODE.JS / EXPRESS REST API                              |
|  Port: 5000  |  Controllers: Battery, Recycler, EPR, Regulator  | QR Engine     |
+--------------------------------------┬------------------------------------------+
                                       |
+--------------------------------------┴------------------------------------------+
|                       REACT + VITE + TAILWIND FRONTEND                          |
|  Port: 5173 / 5000  |  Role-Based UI: Manufacturer, Consumer, Collector,        |
|                         Authorized Recycler, CPCB National Command Center       |
+---------------------------------------------------------------------------------+
```

---

## 📁 Modular Directory Structure

```
battery-epr-fabric/
├── tools/                         # Portable standalone Node.js v20.18 LTS runtime
├── blockchain/
│   ├── chaincode/                 # Hyperledger Fabric Smart Contract
│   │   ├── package.json
│   │   ├── index.js
│   │   ├── lib/
│   │   │   ├── battery-contract.js# Smart contract functions (Register, Collect, Recycle, Verify)
│   │   │   └── models.js          # Domain models & state schemas
│   │   └── test/
│   │       └── battery-contract.test.js # Unit tests (12/12 passed)
│   ├── ledger-node/               # Hyperledger Fabric Ledger Engine
│   │   ├── ledger-engine.js       # Append-only block ledger, world state, and key history
│   │   ├── server.js              # Ledger Node API server on port 7054
│   │   └── fabric-blocks.json     # Cryptographic Block Store (Sole source of truth)
│   └── test-network/              # Docker Compose & deployment scripts for Linux/WSL
│       ├── docker-compose-test-net.yaml
│       ├── connection-org1.json
│       └── deployCC.sh
├── backend/                       # Express REST API
│   ├── package.json
│   ├── server.js                  # Express server & static UI host on port 5000
│   ├── test-backend.js            # Backend integration tests (12/12 passed)
│   └── src/
│       ├── fabric/gateway.js      # Fabric Gateway client
│       ├── services/qrService.js  # High-res QR code generator
│       ├── controllers/           # Battery, Recycler, EPR, Regulator controllers
│       └── routes/api.js
├── frontend/                      # React + Vite + Tailwind CSS Application
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── components/            # Navbar, LifecycleTimeline, QRModal, BlockExplorer, DemoGuideModal
│       └── pages/                 # Manufacturer, Consumer, Collector, Recycler, Regulator portals
├── start-all.js                   # Unified multi-service launcher
├── start-all.bat                  # 1-Click Windows batch launcher
├── start-all.ps1                  # PowerShell launcher
├── test-live-system.js            # Live end-to-end verification suite (16/16 passed)
└── README.md
```

---

## ⚡ Quick Start & Running the Project

### Current Running Endpoints
All services are currently running and ready to demo:
- **Frontend UI (Vite)**: [http://localhost:5173](http://localhost:5173)
- **Frontend UI (Integrated)**: [http://localhost:5000](http://localhost:5000)
- **Backend API**: [http://localhost:5000/api](http://localhost:5000/api)
- **Fabric Ledger Status**: [http://localhost:7054/api/fabric/status](http://localhost:7054/api/fabric/status)

### Launching from Scratch
To start all services at any time:
```powershell
cd "C:\Users\Balakrishnan A\.gemini\antigravity\scratch\battery-epr-fabric"
.\start-all.ps1
```
Or double-click `start-all.bat`.

---

## 🧪 Testing & Validation

### 1. Chaincode Unit Tests
```powershell
& "tools\node\node.exe" blockchain\chaincode\test\battery-contract.test.js
```
Validates all 12 smart contract rules (Recycler authorization, duplicate prevention, double recycling rejection, fake cert rejection, history).

### 2. Backend Integration Tests
```powershell
& "tools\node\node.exe" backend\test-backend.js
```
Validates all 12 REST API endpoints connected to the Fabric Gateway.

### 3. Live System End-to-End Tests
```powershell
& "tools\node\node.exe" test-live-system.js
```
Runs 16 complete live tests across ports 5173, 5000, and 7054.

---

## 🎬 College Demonstration Script (Step-by-Step)

1. Open **[http://localhost:5173](http://localhost:5173)** in your web browser.
2. Click **"Demo Walkthrough"** on the top navigation bar for a quick summary modal.
3. **Step 1 - Manufacturer Portal**:
   - Pick the preset "Lithium-Ion EV Pack (48V 100Ah)".
   - Click **"Mint Battery ID & QR Code on Ledger"**.
   - Review the generated unique ID, Fabric Block number, and QR code sticker. Click **"View Sticker"** or **"Download QR"**.
4. **Step 2 - Consumer Portal**:
   - The minted battery is selected. View the digital battery passport and environmental advisory.
   - Click **"Activate Battery in Consumer Operation"** -> Status updates to `IN_USE`.
5. **Step 3 - Informal Collector Portal**:
   - Select the battery, enter scrap yard location, and click **"Log Scrap Collection on Fabric Ledger"** -> Status updates to `COLLECTED`.
6. **Step 4 - Authorized Recycler Portal**:
   - **Show Authorization Rejection**: Click **"Test Unauthorized Entity"** (`ILLEGAL-UNLICENSED-SCRAPPER`). Click to receive custody -> Observe the smart contract error: `UNAUTHORIZED_RECYCLER`.
   - Select authorized recycler `REC-CPCB-KAR-042` (EcoMetals Green Recycling Ltd).
   - Click **"Accept Custody at Recycling Facility"** -> Status updates to `RECEIVED_BY_RECYCLER`.
   - Enter recovered Lead, Lithium, and Cobalt weights.
   - Click **"Recycle Battery & Mint EPR Certificate on Blockchain"**.
   - Observe the newly minted `EPR-CERT-IND-2026-XXXX` with its cryptographic SHA-256 seal.
   - **Show Double-Recycling Fraud Prevention**: Click **"Test Smart Contract: Attempt Double Recycling"** -> Observe the smart contract block: `DOUBLE_RECYCLING_PREVENTED`.
7. **Step 5 - CPCB Regulator Command Center**:
   - View national metrics, material recovery totals, and compliance percentages.
   - **Verify Authentic Certificate**: Click **"Test Valid Certificate"** -> View the green cryptographic ledger seal and linked battery details.
   - **Test Counterfeit ID**: Click **"Test Fake/Counterfeit ID"** -> Observe the prominent red `FRAUD ALERT` showing the smart contract rejecting fake certificates.
   - **Audit Battery Lifecycle (`GetHistoryForKey`)**: Audit the battery ID to see the complete chronological chain of custody with every block, transaction ID, and timestamp.
8. **Inspect the Blockchain**: Click **"Block #N"** on the top right to open the **Hyperledger Fabric Ledger Explorer** to inspect raw blocks, previous block hashes, Merkle roots, and transaction write-sets.

---

## 📄 License & Attribution
Developed for college capstone / project demonstration based on **CPCB India Battery Waste Management Rules, 2022**.
