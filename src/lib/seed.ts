export const SEED_SQL: string[] = [
  `DROP TABLE IF EXISTS uploaded_files CASCADE`,
  `DROP TABLE IF EXISTS coupons CASCADE`,
  `DROP TABLE IF EXISTS reviews CASCADE`,
  `DROP TABLE IF EXISTS order_items CASCADE`,
  `DROP TABLE IF EXISTS orders CASCADE`,
  `DROP TABLE IF EXISTS products CASCADE`,
  `DROP TABLE IF EXISTS sessions CASCADE`,
  `DROP TABLE IF EXISTS users CASCADE`,
  `DROP TABLE IF EXISTS lab_settings CASCADE`,

  `CREATE TABLE lab_settings (
    key VARCHAR(64) PRIMARY KEY,
    value VARCHAR(255) NOT NULL
  )`,

  `CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'customer',
    wallet_balance NUMERIC(12, 2) NOT NULL DEFAULT 100.00,
    full_name VARCHAR(120),
    shipping_address TEXT,
    phone VARCHAR(40),
    api_key VARCHAR(120),
    reset_token VARCHAR(120),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE sessions (
    token VARCHAR(128) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    category VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 25,
    image_url TEXT NOT NULL,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE
  )`,

  `CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'paid',
    shipping_address TEXT NOT NULL,
    customer_name VARCHAR(120) NOT NULL,
    customer_email VARCHAR(120) NOT NULL,
    customer_phone VARCHAR(40) NOT NULL,
    credit_card_last4 VARCHAR(16) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_name VARCHAR(160) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL
  )`,

  `CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_name VARCHAR(120) NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(64) UNIQUE NOT NULL,
    discount_amount NUMERIC(10, 2) NOT NULL,
    max_uses INTEGER NOT NULL DEFAULT 1,
    times_used INTEGER NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE uploaded_files (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(120) NOT NULL,
    content_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `INSERT INTO lab_settings (key, value) VALUES ('security_level', 'low')`,

  `INSERT INTO users (id, username, email, password_hash, role, wallet_balance, full_name, shipping_address, phone, api_key, reset_token)
   VALUES
   (1, 'alice', 'alice@vulnlab.local', 'password123', 'customer', 150.00, 'Alice Mercer (Test User A)', '742 Evergreen Terrace, Apt 4B, Springfield, IL 62704', '+1-555-0101', 'usr_live_alice_88a1b2c3', 'reset_1001'),
   (2, 'bob', 'bob@vulnlab.local', 'hunter2', 'customer', 2850.00, 'Bob Vance (Victim User B)', '1408 Slough Avenue, Suite 210, Scranton, PA 18503', '+1-555-0199', 'usr_live_bob_secret_77f8e9', 'reset_1002'),
   (3, 'admin', 'admin@vulnlab.local', 'admin123', 'admin', 99999.00, 'System Administrator', '1 Nexus Cyber Command Center, Vault Floor 9, Austin, TX 78701', '+1-555-0001', 'adm_master_key_FLAG{SQLI_AND_IDOR_MASTER_KEY_2026}', 'reset_1003')`,

  `INSERT INTO products (id, name, category, description, price, stock, image_url, is_hidden)
   VALUES
   (1, 'Flipper Zero Multi-Tool Lab Edition', 'Hardware', 'Portable multi-tool for pentesters and hardware geeks in a toy-like body. Supports Sub-1 GHz, RFID, NFC, and IR.', 169.00, 18, 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80', FALSE),
   (2, 'Nexus WiFi Pineapple Mark VII', 'Wireless', 'Automated wireless auditing and penetration testing platform with dual-band rogue AP reconnaissance.', 199.99, 12, 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80', FALSE),
   (3, 'Proxmark3 RDV4 RFID Research Kit', 'RFID / NFC', 'Compact high-frequency and low-frequency RFID security analysis and cloning research instrument.', 349.00, 7, 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80', FALSE),
   (4, 'Rubber Ducky USB Keystroke Injector', 'Hardware', 'Looks like a standard flash drive, types like a keyboard at 1000 words per minute for authorized physical tests.', 59.99, 40, 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80', FALSE),
   (5, 'HackRF One Software Defined Radio', 'SDR', '1 MHz to 6 GHz half-duplex software defined radio transceiver for RF protocol analysis.', 319.00, 9, 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80', FALSE),
   (6, 'INTERNAL PROTOTYPE: Zero-Day Vault Key [FLAG{HIDDEN_PRODUCT_SQLI_DISCOVERED}]', 'Classified', 'Unreleased internal Red Team hardware HSM containing staging root credentials. Should NEVER appear in public catalog.', 0.01, 1, 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&w=600&q=80', TRUE)`,

  `INSERT INTO orders (id, user_id, total_amount, status, shipping_address, customer_name, customer_email, customer_phone, credit_card_last4, notes)
   VALUES
   (1001, 1, 228.99, 'shipped', '742 Evergreen Terrace, Apt 4B, Springfield, IL 62704', 'Alice Mercer', 'alice@vulnlab.local', '+1-555-0101', '4242 (Visa)', 'Leave package at front desk'),
   (1002, 2, 548.99, 'paid', '1408 Slough Avenue, Suite 210, Scranton, PA 18503', 'Bob Vance', 'bob@vulnlab.local', '+1-555-0199', '8819 (Amex Corp)', 'CONFIDENTIAL: Contains Bob corporate tax ID #99-4810221 and door code #4920'),
   (1003, 3, 0.01, 'delivered', '1 Nexus Cyber Command Center, Vault Floor 9, Austin, TX 78701', 'System Administrator', 'admin@vulnlab.local', '+1-555-0001', '0000 (Internal)', 'ADMIN VAULT KEY: FLAG{IDOR_ORDER_ENUMERATION_SUCCESS}')`,

  `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price)
   VALUES
   (1001, 1, 'Flipper Zero Multi-Tool Lab Edition', 1, 169.00),
   (1001, 4, 'Rubber Ducky USB Keystroke Injector', 1, 59.99),
   (1002, 2, 'Nexus WiFi Pineapple Mark VII', 1, 199.99),
   (1002, 3, 'Proxmark3 RDV4 RFID Research Kit', 1, 349.00),
   (1003, 6, 'INTERNAL PROTOTYPE: Zero-Day Vault Key', 1, 0.01)`,

  `INSERT INTO reviews (product_id, user_id, author_name, rating, comment)
   VALUES
   (1, 1, 'Alice Mercer', 5, 'Awesome lab hardware! Works out of the box with Sub-GHz capture.'),
   (1, 2, 'Bob Vance', 4, 'Fast shipping. Note to self: do not leave default PIN enabled.'),
   (2, 2, 'Bob Vance', 5, 'Great for demonstrating rogue AP detection in our corporate SOC training.')`,

  `INSERT INTO coupons (code, discount_amount, max_uses, times_used)
   VALUES
   ('WELCOME50', 50.00, 1, 0),
   ('PENTEST100', 100.00, 1, 0),
   ('VIP25', 25.00, 5, 0)`
];
