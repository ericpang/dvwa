# VulnLab: Modern Serverless Damn Vulnerable Web Application (DVWA)

> [!CAUTION]
> **SECURITY WARNING — FOR EDUCATIONAL & AUTHORIZED TESTING ONLY**
> This application contains **intentional, critical security vulnerabilities**. It is designed exclusively for demonstrating penetration testing tools, validating vulnerability scanners, and practicing OWASP Web Security Testing Guide (WSTG) methodologies in an isolated sandbox environment. **Never deploy this application with real user data or on production networks without strict access controls.**

---

## 1. Overview & Goals

**VulnLab** is a modern, full-stack intentionally vulnerable web application built for **Vercel's free tier**. Unlike legacy PHP-based vulnerable apps that require local Docker containers or VMs, VulnLab runs natively on serverless infrastructure with a single free-tier Postgres database.

It combines two cohesive experiences in one application:
1. **Realistic E-Commerce & Account Portal ("NexusStore")**: Provides a realistic attack surface with authentication flows, shopping carts, order histories, product reviews, XML imports, webhooks, and an admin dashboard—ideal for automated crawlers, DAST scanners (Burp Suite, OWASP ZAP, Nuclei, sqlmap), and AI penetration testing agents.
2. **Interactive Pentester HUD & Lab Controller**: Allows instructors and testers to switch security difficulty levels (`Low`, `Medium`, `High`, `Fixed`), inspect raw backend queries/requests in real time, view hints/remediations, and reset the database to a clean state with a single click.

---

## 2. Tech Stack & Database Architecture

To ensure **zero-cost, frictionless deployment on Vercel**, the architecture uses a single serverless relational database:

| Layer | Technology | Why It Fits |
| :--- | :--- | :--- |
| **Framework** | **Next.js (App Router, TypeScript)** | Native Vercel deployment, supports both UI pages and REST/XML API route handlers (`/api/*`). |
| **Database (Single DB)** | **Neon Serverless Postgres** (via Vercel Marketplace) | **100% Free Tier on Vercel**, 1-click provisioning, supports raw SQL execution (`@neondatabase/serverless`) required for realistic SQL Injection (`UNION`, boolean, and `pg_sleep` time-based blind SQLi). |
| **Styling & UI** | **Tailwind CSS + Lucide Icons** | Clean, responsive UI compliant with Vercel Web Interface Guidelines, featuring a toggleable Pentester HUD. |
| **Auth & Sessions** | **Custom Cookie / JWT Session Engine** | Intentionally configurable to demonstrate weak session tokens, missing cookie flags (`HttpOnly`, `SameSite`), JWT tampering, and session fixation. |

### Architecture Diagram

```mermaid
flowchart LR
    subgraph Client["Tester & Security Tools"]
        Browser["Browser / UI"]
        Scanner["Burp Suite / sqlmap / Nuclei / AI Agent"]
    end

    subgraph Vercel["Vercel Serverless (Next.js App Router)"]
        UI["Storefront & Lab UI"]
        HUD["Pentester HUD & Difficulty Switcher"]
        API["Vulnerable REST & XML APIs (/api/*)"]
        Internal["Simulated Cloud Metadata (/api/internal/*)"]
    end

    subgraph DB["Vercel Storage (Free Tier)"]
        Neon[("Neon Serverless Postgres\n(Single Database)")]
    end

    Browser --> UI
    Browser --> HUD
    Scanner --> API
    UI --> API
    API -->|Raw SQL / Parameterized SQL| Neon
    API -->|SSRF Loopback| Internal
```

---

## 3. Security Difficulty Levels

Every vulnerability module respects a global (or per-module) security level stored in the database/session:

- **`low` (Vulnerable — Default)**: Zero input validation, raw string-concatenated SQL queries, verbose database/stack error messages, no rate limiting, and missing security headers/cookie flags. Designed for quick scanner detection and introductory demos.
- **`medium` (Naive Filtering)**: Basic blocklists (e.g., stripping `<script>` or single quotes, client-side-only validation, naive path checks) that can be bypassed using encoding, case variation, or HTTP parameter tampering.
- **`high` (Hardened but Subtle Flaws)**: Stronger validation with edge-case logic flaws, second-order injections, or subtle race conditions requiring manual Burp Suite analysis.
- **`fixed` (Secure Reference)**: Implements industry-standard remediations (parameterized queries, strict RBAC middleware, CSPRNG tokens, DOMPurify sanitization, and row-level locking) to validate remediation retesting.

---

## 4. Vulnerability Modules (OWASP WSTG Aligned)

The application implements vulnerabilities across all six testing phases of the **OWASP Web Security Testing Guide (WSTG)**:

### Phase 1: Reconnaissance & Information Disclosure
| ID | Vulnerability | Affected Endpoint / Location | Description & Demo Goal |
| :--- | :--- | :--- | :--- |
| **REC-01** | **Sensitive Disallowed Paths & Backup Files** | `/robots.txt`, `/api/debug/env`, `/.env.backup` | Exposes hidden administrative routes, debug configuration endpoints, and simulated backup files to directory fuzzers (`ffuf`, Burp Content Discovery). |
| **REC-02** | **Leaked Secrets in Client Bundle** |Frontend JS bundle & `/api/docs` | Hardcoded internal API keys, staging endpoints, and an unauthenticated OpenAPI/Swagger specification. |
| **REC-03** | **Verbose Error & Stack Trace Leakage** | All `/api/*` endpoints (on `low`) | Returns raw PostgreSQL syntax errors, table names, and server stack traces on malformed inputs. |

### Phase 2: Authentication Testing
| ID | Vulnerability | Affected Endpoint / Location | Description & Demo Goal |
| :--- | :--- | :--- | :--- |
| **AUTH-01** | **Account Enumeration** | `POST /api/auth/login`, `POST /api/auth/forgot-password` | Returns distinct HTTP status codes (`404 User not found` vs `401 Invalid password`) and response timing discrepancies. |
| **AUTH-02** | **Missing Brute-Force Protection** | `POST /api/auth/login` | Allows unlimited rapid credential stuffing / Burp Intruder attacks without rate limiting or account lockout. |
| **AUTH-03** | **Weak Password Policy** | `POST /api/auth/register` | Accepts single-character or common passwords (`123456`, `password`). |
| **AUTH-04** | **Predictable Password Reset Tokens** | `POST /api/auth/reset-password` | Generates sequential or timestamp-based reset tokens (`md5(email + timestampMinutes)`) and trusts the `Host` header for reset links. |
| **AUTH-05** | **JWT Algorithm Confusion & Weak Secret** | `Authorization: Bearer <token>` | Accepts `alg: "none"` or tokens signed with a weak dictionary secret (`secret123`). |

### Phase 3: Authorization & Access Control
| ID | Vulnerability | Affected Endpoint / Location | Description & Demo Goal |
| :--- | :--- | :--- | :--- |
| **AUTHZ-01** | **Horizontal IDOR (Orders & Profiles)** | `GET /api/orders/[orderId]`, `GET /api/users/[id]` | Authenticated users can enumerate sequential integer IDs (`1001`, `1002`, ...) to read other customers' PII, shipping addresses, and payment summaries. |
| **AUTHZ-02** | **Vertical Privilege Escalation (Mass Assignment)** | `PUT /api/users/profile` | Accepting `{ "role": "admin", "wallet_balance": 99999 }` in the JSON body updates privileged columns directly. |
| **AUTHZ-03** | **Forced Browsing & Method Tampering** | `GET/DELETE /api/admin/users` | Admin UI checks role client-side, while API endpoints fail to verify admin privileges or allow `X-HTTP-Method-Override: DELETE` via `POST`. |

### Phase 4: Input Validation & Injection
| ID | Vulnerability | Affected Endpoint / Location | Description & Demo Goal |
| :--- | :--- | :--- | :--- |
| **INJ-01** | **SQL Injection (Auth Bypass & UNION)** | `POST /api/auth/login`, `GET /api/products?search=` | Raw SQL string interpolation into Neon Postgres. Supports `' OR 1=1--`, `UNION SELECT username, password_hash FROM users--`, and `pg_sleep(5)` blind SQLi with `sqlmap`. |
| **INJ-02** | **Cross-Site Scripting (Reflected, Stored, DOM)** | `/search?q=`, `POST /api/products/[id]/reviews` | Unescaped HTML rendering in search banners (Reflected), product reviews that execute when an admin views `/admin/reviews` (Stored), and URL hash rendering (DOM). |
| **INJ-03** | **Server-Side Request Forgery (SSRF)** | `POST /api/products/fetch-image`, `POST /api/webhooks/test` | Server fetches user-supplied URLs. Includes a built-in simulated cloud metadata endpoint (`/api/internal/metadata` & `http://169.254.169.254` interceptor) returning mock IAM credentials safely inside Vercel. |
| **INJ-04** | **XML External Entity (XXE)** | `POST /api/orders/import-xml` | Parses uploaded XML bulk orders with external entity resolution enabled, allowing simulated file disclosure (`/etc/passwd`, application config). |
| **INJ-05** | **Server-Side Template & Command Injection (Sandboxed)** | `POST /api/admin/diagnostics`, `POST /api/invoices/preview` | Evaluates template expressions (`{{7*7}}`) and diagnostic ping inputs (`127.0.0.1; whoami`) within a safe serverless emulator so scanners can verify RCE/SSTI payloads without compromising the host platform. |

### Phase 5: Session Management & CSRF
| ID | Vulnerability | Affected Endpoint / Location | Description & Demo Goal |
| :--- | :--- | :--- | :--- |
| **SESS-01** | **Predictable Session Tokens (Low Entropy)** | `POST /api/auth/login` (`vulnlab_sid` cookie) | Issues sequential or predictable hex tokens suitable for **Burp Sequencer** entropy analysis. |
| **SESS-02** | **Session Fixation & Non-Expiring Sessions** | `/api/auth/login`, `/api/auth/logout` | Preserves pre-login `vulnlab_sid` query/cookie values after authentication and fails to invalidate tokens server-side on logout. |
| **SESS-03** | **Insecure Cookie Attributes & CSRF** | `POST /api/wallet/transfer`, `POST /api/users/email` | Session cookies omit `HttpOnly`, `Secure`, and `SameSite` flags on `low` difficulty, enabling Cross-Site Request Forgery (CSRF) and cookie theft via XSS. |

### Phase 6: Business Logic Flaws
| ID | Vulnerability | Affected Endpoint / Location | Description & Demo Goal |
| :--- | :--- | :--- | :--- |
| **BIZ-01** | **Price & Negative Quantity Manipulation** | `POST /api/checkout` | Trusts `unit_price` and `quantity` sent in the request payload (e.g., buying items for `$0.01` or `-5` quantity to credit the user's wallet). |
| **BIZ-02** | **Race Condition (TOCTOU)** | `POST /api/coupons/redeem`, `POST /api/wallet/transfer` | Performs `SELECT` balance check followed by an artificial delay (`150ms`) before `UPDATE` without a transaction lock—exploitable via concurrent requests (Burp Turbo Intruder). |
| **BIZ-03** | **Multi-Step Workflow Bypass** | `POST /api/checkout/complete` | Allows skipping the payment verification step (`/checkout/payment`) by calling the order completion endpoint directly. |
| **BIZ-04** | **Unrestricted File Upload** | `POST /api/upload/avatar` | Validates only client-supplied `Content-Type` or allows double extensions (`shell.php.jpg`, `xss.svg`). Files are stored safely in the Postgres database and served via `/api/files/[id]` with raw MIME types. |

---

## 5. Single Database Schema (Neon Postgres)

All application state, virtual file uploads, sessions, and lab settings live in **one Neon PostgreSQL database** so the entire environment can be reset in `< 200ms` via `POST /api/lab/reset`.

```mermaid
erDiagram
    USERS ||--o{ SESSIONS : has
    USERS ||--o{ ORDERS : places
    USERS ||--o{ REVIEWS : writes
    PRODUCTS ||--o{ ORDER_ITEMS : included_in
    PRODUCTS ||--o{ REVIEWS : receives
    ORDERS ||--|{ ORDER_ITEMS : contains
    USERS ||--o{ UPLOADED_FILES : uploads

    USERS {
        serial id PK
        varchar username UK
        varchar email UK
        varchar password_hash "Plaintext/MD5 on Low, bcrypt on Fixed"
        varchar role "customer | support | admin"
        numeric wallet_balance
        varchar reset_token
        timestamp created_at
    }

    SESSIONS {
        varchar token PK "Sequential on Low, UUIDv4 on Fixed"
        int user_id FK
        boolean is_active
        timestamp expires_at
    }

    PRODUCTS {
        serial id PK
        varchar name
        text description
        numeric price
        int stock
        varchar image_url
        boolean is_hidden "Hidden products for SQLi discovery"
    }

    ORDERS {
        serial id PK "Sequential integer (1001+) for IDOR"
        int user_id FK
        numeric total_amount
        varchar status "pending | paid | shipped"
        text shipping_address
        varchar credit_card_last4
        timestamp created_at
    }

    ORDER_ITEMS {
        serial id PK
        int order_id FK
        int product_id FK
        int quantity
        numeric unit_price
    }

    REVIEWS {
        serial id PK
        int product_id FK
        int user_id FK
        int rating
        text comment "Stored XSS payload target"
        timestamp created_at
    }

    COUPONS {
        serial id PK
        varchar code UK
        numeric discount_amount
        int max_uses
        int times_used "Race condition target"
    }

    UPLOADED_FILES {
        serial id PK
        int user_id FK
        varchar filename
        varchar content_type
        text content_base64 "Serverless-safe storage in DB"
        timestamp created_at
    }

    LAB_SETTINGS {
        varchar key PK
        varchar value "security_level: low | medium | high | fixed"
    }
```

### Pre-Seeded Test Accounts

The database seed script populates three default accounts for immediate multi-privilege testing (as required by OWASP WSTG authorization testing):

| Role | Username / Email | Password | Pre-Populated Data |
| :--- | :--- | :--- | :--- |
| **Customer A (Attacker)** | `alice@vulnlab.local` | `password123` | Order `#1001`, `$100.00` wallet balance |
| **Customer B (Victim)** | `bob@vulnlab.local` | `hunter2` | Order `#1002` (contains full PII & address), `$2,500.00` wallet balance |
| **Administrator** | `admin@vulnlab.local` | `admin123` | Order `#1003`, access to `/admin`, API keys, and system diagnostics |

---

## 6. UI/UX & Pentester Features

Built following the **Vercel Web Interface Guidelines**, the frontend provides both a realistic target application and an ergonomic testing workbench:

1. **Floating Pentester HUD (Toggleable via `Ctrl + Shift + L`)**:
   - **Difficulty Selector**: Instant switch between `Low`, `Medium`, `High`, and `Fixed`.
   - **Query & Sink Inspector**: Displays the exact SQL query, shell command, or file path executed by the last API call, highlighting injection points in real time for live demonstrations.
   - **One-Click DB Reset**: Restores all tables, orders, reviews, and wallet balances to their clean seed state after destructive tests (like Stored XSS or SQLi modifications).
   - **Quick Credential Switcher**: 1-click login buttons for `Unauthenticated`, `Alice (User A)`, `Bob (User B)`, and `Admin` to streamline manual demo flows.
2. **Vulnerability Catalog Page (`/labs`)**:
   - Interactive checklist of all 21 vulnerabilities mapped to OWASP Top 10 & WSTG IDs.
   - Expandable **Hints**, **Sample Payloads (curl / Burp / sqlmap)**, and **Code Diffs** (Vulnerable vs. Fixed code).
3. **OpenAPI / Swagger Endpoint (`/api/docs`)**:
   - Machine-readable OpenAPI 3.0 JSON spec so automated API scanners and AI pentesting agents can ingest the full endpoint schema immediately.

---

## 7. Project Directory Structure

```text
├── .agents/
│   └── skills/
│       ├── performing-web-application-penetration-test/
│       └── web-design-guidelines/
├── src/
│   ├── app/
│   │   ├── (store)/              # Realistic E-Commerce Storefront UI
│   │   │   ├── page.tsx          # Product catalog & vulnerable search
│   │   │   ├── products/[id]/    # Product details & Stored XSS reviews
│   │   │   ├── checkout/         # Multi-step checkout & price tampering
│   │   │   ├── orders/[orderId]/ # Order receipt view (IDOR target)
│   │   │   └── profile/          # User profile, wallet, avatar upload
│   │   ├── admin/                # Admin dashboard (Forced browsing & Stored XSS sink)
│   │   ├── labs/                 # Interactive Vulnerability Matrix & Walkthroughs
│   │   └── api/                  # Intentionally vulnerable REST & XML route handlers
│   │       ├── auth/             # login, register, reset-password, logout
│   │       ├── products/         # SQLi search, SSRF image import, reviews
│   │       ├── orders/           # IDOR order lookup, XXE XML import
│   │       ├── users/            # Mass assignment, CSRF email update
│   │       ├── wallet/           # Race condition transfers & coupons
│   │       ├── admin/            # Broken access control & sandboxed command injection
│   │       ├── internal/         # Simulated cloud metadata service (169.254.169.254)
│   │       ├── docs/             # OpenAPI 3.0 JSON specification
│   │       └── lab/              # DB reset, seed, and difficulty level controller
│   ├── components/
│   │   ├── PentesterHud.tsx      # Floating difficulty switcher & SQL/Request inspector
│   │   ├── Navbar.tsx            # Storefront navigation & quick-login bar
│   │   └── CodeComparison.tsx    # Vulnerable vs. Remediated code viewer
│   └── lib/
│       ├── db.ts                 # Neon Serverless Postgres client & raw query logger
│       ├── seed.ts               # Schema DDL & initial test data seeder
│       ├── security-level.ts     # Helper to read current Low/Med/High/Fixed mode
│       └── ssrf-sandbox.ts       # Safe loopback interceptor for metadata SSRF demos
├── public/
│   └── robots.txt                # Intentionally reveals hidden paths (/admin, /api/debug)
├── .env.example
├── package.json
└── README.md
```

---

## 8. Deployment & Local Setup (Vercel + Free Neon DB)

### Option A: One-Click Deploy to Vercel (Free Tier)

1. Push this repository to GitHub/GitLab.
2. Import the project into **[Vercel](https://vercel.com/new)**.
3. In your Vercel project dashboard, go to the **Storage** tab → **Create Database** → select **Neon Postgres (Free Tier)** from the Vercel Marketplace.
4. Vercel automatically injects `DATABASE_URL` into your project environment variables.
5. Deploy the application, then visit `/labs` and click **"Initialize / Reset Database"** (or call `POST /api/lab/reset`) to create the tables and seed the test accounts.

### Option B: Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Configure environment variables**:
   Copy `.env.example` to `.env.local` and paste your free Neon Postgres connection string (or connect via `vercel env pull .env.local`):
   ```env
   DATABASE_URL="postgresql://user:password@ep-example.us-east-2.aws.neon.tech/neondb?sslmode=require"
   JWT_SECRET="secret123"
   ```
3. **Start the development server**:
   ```bash
   npm run dev
   ```
4. **Initialize the database**:
   Open `http://localhost:3000` and click **"Reset / Seed DB"** in the bottom-right Pentester HUD.

