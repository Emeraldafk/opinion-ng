# Tired.Fun — Perpetual Opinion Markets on Robinhood Chain

**Tired.Fun** is a full-stack decentralized opinion & sentiment intelligence platform built natively for **Robinhood Chain Testnet (Chain ID `46630`)**, inspired by [pov.co](https://pov.co/).

---

## 1. Smart Contract Architecture & Security Audit

The smart contract [`Tired.FunMarkets.sol`](file:///c:/Users/JAYSOFT.TEC/Music/nullhood/contracts/Tired.FunMarkets.sol) (v2 Audited) implements perpetual conviction markets with independent bonding curves and mathematical solvency guarantees:

* **Strict Virtual Reserve Isolation**:
  - Each side (`YES` and `NO`) initializes with virtual reserves ($E_{\text{virtual}} = 0.5\text{ ETH}$, $S_{\text{virtual}} = 500{,}000\times 10^{18}\text{ shares}$, $K = 2.5\times 10^{23}$).
  - Virtual reserves bootstrap initial pricing ($0.000001\text{ ETH}$) and are **strictly non-withdrawable**. Gross ETH payouts on sells are rigorously capped by `curve.realEth`.
* **$O(1)$ Global Solvency Invariant**:
  - Verified on every trade and withdrawal:
    $$\text{balance}(\text{contract}) \ge \sum \text{realEth}_{\text{curves}} + \sum \text{claimableCreatorFees} + \text{protocolFeesAccrued}$$
  - Public audit view: `verifyProtocolSolvency()` reports live contract backing and surplus down to the wei.
* **Anti-Dust Minimum Trade Guard**:
  - Requires `MIN_TRADE_ETH = 0.0001 ether` on all buys to prevent fee-rounding evasion.
* **Security & Governance Controls**:
  - Reentrancy protection via `nonReentrant` on all state-mutating functions.
  - Emergency circuit breaker: `setPaused(bool)`.
  - Two-step ownership transfer: `transferOwnership` + `acceptOwnership`.
  - Configurable fee splits via `setFeeConfiguration` capped at a hard-coded maximum of `5.00%` (`MAX_TOTAL_FEE_BPS = 500`).

---

## 2. Tired Pulse (Real-Time Social & Market Intelligence)

Tired Pulse provides a real-time conviction radar across the ecosystem:
* **Large Conviction Flows (Whale Activity)**: Flags high-volume positions ($\ge 0.25\text{ ETH}$) with post-trade sentiment impact.
* **Sudden Sentiment Shifts**: Tracks 24-hour sentiment acceleration to uncover emerging market narratives.
* **50/50 Dual-Curve Heat (Most Controversial Debates)**: Ranks markets where both YES and NO curves are surging simultaneously.
* **Multi-Dimensional Filters**: Filter activity stream by category, market ID, transaction type (buys, sells, whales), time horizon (1h, 6h, 24h, all), and verification source.
* **Unmistakable Verification Origin**: Every event is explicitly badged as either an **`ON-CHAIN TX`** (with direct link to the Robinhood Chain block explorer) or a **`SANDBOX EVENT`**.

---

## 3. Opinion Reputation (Transparent & Sybil-Resistant)

Because Tired.Fun markets measure perpetual collective conviction rather than binary oracle dates, **Reputation never equates trading profit with truth**.

Reputation is computed deterministically from 4 transparent, logarithmic pillars (Max 1,000 points):
1. **Creator Impact (0–400 pts)**: $150 \cdot \ln(1 + M_{\text{created}} \cdot U_{\text{factor}})$
2. **Market Diversity (0–250 pts)**: $120 \cdot \ln(1 + \text{UniqueMarketsTraded})$
3. **Backed Discourse (0–200 pts)**: $90 \cdot \ln(1 + \text{StakeBackedComments})$
4. **Curve Participation (0–150 pts)**: $80 \cdot \ln(1 + \text{CumulativeVolumeETH})$

Whale wash-trading cannot purchase reputation linearly, and Sybil accounts without real curve stake receive minimal scoring weight.

---

## 4. Market Intelligence

Each market features an advanced terminal:
* **Bonding Curve Trajectory**: Interactive SVG visualizer plotting exact coordinates $(R_{\text{locked}}, P_{\text{spot}})$ along $P(R) = (0.5 + R)^2 / K$.
* **Dual YES vs NO Historical Price**: Tracks independent appreciation of both sides over time.
* **Buy vs Sell Volume Pressure**: Gauges net capital inflows vs liquidation pressure on each curve.
* **Holder Distribution**: Inspects top token holders and concentration on each side.
* **Explicit Sentiment vs Probability Disclaimer**: Clearly distinguishes perpetual conviction ratio from binary event probability.

---

## 5. Creator Economics & Protocol Treasury

* **Uniform 1.00% Fee Deduction**: On buys, $1.00\%$ is deducted from gross ETH in; on sells, $1.00\%$ is deducted from gross ETH out.
* **Withdrawable Anytime**: Creators call `claimCreatorFees()` to withdraw native ETH directly to their Robinhood Chain address.
* **Solvency Reconciled**: All claimable amounts reconcile against actual contract balances.
* **Historical Audit Log**: Displays confirmed fee claims with block timestamps and transaction hashes.

---

## 6. Robinhood Chain Testnet Configuration

| Property | Value |
| :--- | :--- |
| **Network Name** | Robinhood Chain Testnet |
| **Chain ID** | `46630` (`0xb626`) |
| **Native Currency** | `ETH` (18 decimals) |
| **Public RPC URL** | `https://rpc.testnet.chain.robinhood.com` |
| **Block Explorer** | `https://explorer.testnet.chain.robinhood.com` |
| **Testnet Faucet** | `https://faucet.testnet.chain.robinhood.com` |

---

## 7. Verification & Testing

```bash
# Run contract compilation, unit tests, 1,500 fuzz operations, bank-run simulation & invariants
npm run test:contract

# Production build
npm run build

# Start development server
npm run dev
```
