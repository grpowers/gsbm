# GSBM: Greg's Sports Betting Model

*"Luck is what happens when preparation meets opportunity."*

A high-integrity data aggregation and weighting system for professional sports wagering. Features dynamic probability thresholds, automated unit-stake allocation, and a persistent performance auditing layer built in Google Sheets.


[![Google Sheets](https://img.shields.io/badge/Google%20Sheets-Master%20Dashboard-34A853?style=for-the-badge&logo=google-sheets&logoColor=white)](https://docs.google.com/spreadsheets/d/1N0aw7OLwWUpUFy3VK1Z_kfUiKJGafTVVzWJNc-ZDRMg/edit?gid=106434201#gid=106434201)


## ⚙️ Logic & Architecture
The GSBM utilizes a performance-weighted consensus engine to determine signal strength:
- **Elite (1.5x):** Win Rate ≥ 55%
- **Mid-Tier (1.0x):** Win Rate 48% – 54.9%
- **Low-Tier (0.5x):** Win Rate < 48%

### Execution Thresholds (Post Burn-In)
| WCS Score | Action | Unit Size |
| :--- | :--- | :--- |
| **4.0+** | Max Stake | 3.0 Units |
| **3.0 - 3.9** | High Consensus | 2.0 Units |
| **2.0 - 2.9** | Standard Play | 1.0 Unit |
| **< 2.0** | Pass | 0.0 Units |

### Data Sources & Technical Protocols
* **Live Scoreboard API:** Utilizes `site.api.espn.com` V2 scoreboard endpoint for real-time tracking.
* **Refresh Mechanism:** To bypass server-side caching, a dynamic `?refresh=[Z1]` query parameter is appended. Toggling cell `Z1` via Apps Script forces a fresh handshake.
* **External Latency:** During high-traffic events, "No Games Found" or "Loading..." may appear. The system is designed to "Self-Heal" on the next 1-minute refresh cycle.

---

## 💰 Bankroll & Sizing Protocol
To protect the GSBM core profit, all speculative "Gems" use fractional units. *Stakes will be updated periodically.*

| Asset Class | Strategy | Stake | Logic | Status |
| :--- | :--- | :--- | :--- | :--- |
| **GSBM Straights** | Core Engine | 1.0 Unit ($1.00) | Data-driven market signals. | **ACTIVE** |
| **MLB HR Parlays** | High Variance | 0.10 Units ($0.10) | Parlay + RR by 2s/3s. | **ACTIVE** |
| **PrizePicks Flex** | Ceiling Growth | 1.0 Unit ($1.00) | Top +EV alignment. | **ACTIVE** |
| **SGP Storyteller** | Speculative | 0.10 Units ($0.10) | Refactoring for ROI efficiency. | **PAUSED** |

---

## 📑 Rules & Signal Logic

### 1. The "One Source, One Vote" Rule
Multiple analysts from the same source on the same play? **Log ONLY ONE entry** to prevent artificial WCS inflation.

### 2. The "Market Silo" Rule (ML vs. Spread)
Source plays both Moneyline and Spread? **Log BOTH.** They are tracked as separate categories.

### 3. The "Internal Source Conflict" Rule
Analysts from the same source pick opposing sides? **Log BOTH.** This neutralizes the source weight (e.g., 1.5 - 1.5 = 0).

### 4. The "Worst Line" Principle & 1-Point Filter
* **Stress Test:** If multiple lines exist for one side, log the **Worst Line** available (Underdogs use the lower number; Favorites use the higher number).
* **Market Movement:** If the market moves past the signal, log the current **Best Available Line** as the new "Worst Line."
* **1-Point Filter (ABORT RULE):** If the market move exceeds **1.0 point** from the original signal, the play is **VOID**. The edge has evaporated. Do not execute.

### 5. The "Primary Signal" Policy
Only log picks from a source's **Primary Picks Dashboard**. Exclude articles, supplemental content, or parlay legs unless they are also promoted to the Main Page.

### 6. Time-Stamping & Retro-Auditing
"My Pick" selections lock daily. Late finds are logged in the Sport Log for **Audit Only**, never for previous-day WCS.

### 7. The "Bonus Bet" & "Promo" Protocol
Execution via "Free Bets" or "Boosts" is logged with a **Stake of $0.00**. Profit is logged normally; losses are $0.00. This protects "Hard Cash" ROI.

### 8. Sustainability over Perfection
Correct human errors when found, but **never** trigger a system-wide reset. Consistency in daily logging location is prioritized over exhaustive perfection.

### 9. The "Life Happens" Clause (Consistency over Coverage)
If unable to access the audit tool (weddings, travel, etc.), **No Execution occurs.** A day with no bets is a $0.00 day, not a failure.

### 10. The Multi-Sport "Anchor" Protocol
If a parlay involves multiple sports or has no clear primary: **Log on the MLB Tab (Default Hub).** Manually enter "MULTI-SPORT" in the Game column and list legs in the Notes.

---

## 🛡️ PHASE 1: THE BURN-IN PROTOCOL (ACTIVE)
**Target Window:** 14 Graded Days (Starts May 4, 2026; Ends approx. May 18, 2026)
**Objective:** Stress-test AI logic against real-world variance.

1. **Flat Betting Only:** Regardless of WCS, all live wagers are capped at **1.0 Unit ($1.00)**.
2. **Shadow-Tracking:** Suggested units (2u/3u) may be logged in "Notes" for theoretical tracking, but "Wager" must reflect the 1u stake.
3. **Transition:** After 14 graded days and 30+ picks, evaluate accuracy to move to Phase 2 (Variable Sizing).

---

## ⚡ The Auditor's Cheat Sheet
* 📡 **Main Page Only:** Primary dashboards only.
* 🚫 **No Double-Dipping:** 1 source = 1 vote.
* 📉 **Stress Test:** Log the "Worst" current line.
* 🛑 **1-Point Filter:** If line moves $\ge$ 1.0 point, **DO NOT BET.**
* 🎁 **Bonus Bets:** Log as **$0.00 Stake**. 
* 🛡️ **Burn-In Rule:** **1u Flat Bets** for the first 14 days.
