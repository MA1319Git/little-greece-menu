# Park Restaurant CRM — Architecture Document

**Project:** Seasonal self-service park restaurant  
**Version:** 1.0  
**Date:** 2026-03-31  
**Status:** Pre-build planning

---

## 1. System Overview

A lightweight, mobile-first ordering and CRM system for a small seasonal self-service restaurant operating in a local park during summer. Customers scan a QR code to browse the menu and place orders from their phones. Staff manage orders via a tablet kiosk. A large digital display board shows the current menu. Payments are handled by Revolut Business. Customers are notified when their order is ready via SMS, push notification, and a physical buzzer system. The owner manages the menu, monitors orders, and views reports via a web admin panel.

### High-Level System Diagram (C4 Context)

```
+---------------------+       QR scan        +--------------------+
|   Customer Phone    |--------------------->|  Customer Web App  |
| (mobile browser)    |<---------------------|  (PWA, no install) |
+---------------------+   order status push  +--------------------+
                                                       |
+---------------------+       HTTP/WS        +--------------------+
|   Staff Tablet      |<-------------------->|   Backend API      |
|   (Kiosk/POS app)   |                      |  (REST + WebSocket)|
+---------------------+                      +--------------------+
                                               |    |    |    |
+---------------------+       HTTP/WS         |    |    |    |
|  Menu Display Board |<----------------------+    |    |    |
| (large screen, PWA) |                            |    |    |
+---------------------+                            |    |    |
                                                   |    |    |
+---------------------+                     +------+    |    |
|   Admin Web Panel   |<------------------->| PostgreSQL |    |
|  (owner, browser)   |                     |  Database  |    |
+---------------------+                     +-----------+    |
                                                              |
+---------------------+                     +----------------+
|  Revolut Business   |<------------------->| Payment Service|
|  (payment gateway)  |                     +----------------+
+---------------------+

+---------------------+
|   SMS Gateway       |<--- order ready trigger
|  (Twilio / similar) |
+---------------------+

+---------------------+
|   Buzzer Controller |<--- HTTP trigger from backend
|  (Raspberry Pi/USB) |
+---------------------+
```

---

## 2. Tech Stack Recommendation

### 2.1 Frontend

| Surface | Technology | Reasoning |
|---|---|---|
| Customer ordering app | Progressive Web App (PWA) — React + Vite | No app store install required; customer scans QR and lands directly; works offline with service worker; mobile-first |
| Staff kiosk / POS | Same PWA, kiosk mode | Reuses the same codebase with a different route/role; tablet-optimised layout; pinned to home screen |
| Menu display board | Same PWA, display mode | Third role on same app; read-only live view; auto-refreshes |
| Admin panel | React + Vite (separate app or protected route) | Owner is tech-comfortable; web browser, no install; simple CRUD + charts |

Using a single React codebase with role-based routing (customer / kiosk / display / admin) minimises maintenance.

### 2.2 Backend

| Layer | Technology | Reasoning |
|---|---|---|
| API server | Node.js + Fastify | Lightweight, fast, good TypeScript support, easy to deploy on a small VPS |
| Real-time | WebSocket via Fastify + `@fastify/websocket` | Live order updates to kiosk and display board without polling |
| Database | PostgreSQL (hosted on Supabase free tier or Railway) | Relational, strong consistency, good for reporting queries; free tier sufficient for seasonal load |
| ORM | Prisma | Type-safe, good migrations, works well with PostgreSQL |
| Auth | JWT + refresh tokens (owner/staff only; customers are anonymous or soft-identified by phone number) | Simple, stateless, low maintenance |
| Push notifications | Web Push API (VAPID keys) via `web-push` npm package | Free, no third-party dependency for in-browser push |
| SMS | Twilio (or Vonage as fallback) | Reliable, pay-per-message, no monthly fee — cost-effective for low volume |
| File storage | Supabase Storage or Cloudflare R2 | Menu item images; free tier sufficient |
| Hosting | Railway.app or Fly.io | Simple deployment, free/low-cost tier, automatic HTTPS, supports Node.js + PostgreSQL |

### 2.3 Payment

Revolut Business — covered in detail in Section 6.

### 2.4 Offline / PWA

Service Worker with Workbox for asset caching and a local IndexedDB queue for orders placed while offline — covered in Section 8.

### 2.5 Cost Estimate (Monthly, Operating Season)

| Service | Cost |
|---|---|
| Railway / Fly.io (backend + DB) | $5–$10 |
| Twilio SMS (estimated 200 SMS/month) | ~$2 |
| Supabase Storage (images) | Free tier |
| Revolut Business (payment processing) | ~0.8% + €0.02 per transaction |
| Domain + SSL | ~$1 (Let's Encrypt = free SSL) |
| **Total** | **~$10–$15/month** |

---

## 3. Data Models

All models use UUID primary keys. Timestamps use UTC.

### 3.1 Category

```typescript
interface Category {
  id: string;           // UUID
  name: string;         // e.g. "Основни ястия" (Bulgarian)
  slug: string;         // URL-safe, e.g. "osnovni-yastiya"
  displayOrder: number; // sort order on menu
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.2 DietaryLabel

```typescript
interface DietaryLabel {
  id: string;
  key: string;          // e.g. "vegetarian", "gluten_free", "contains_nuts"
  labelBg: string;      // Bulgarian display label
  labelEn: string;      // English display label
  iconSlug: string;     // icon identifier for UI
}
```

Seeded values:
- `vegetarian` — Вегетарианско
- `vegan` — Веганско
- `gluten_free` — Без глутен
- `contains_nuts` — Съдържа ядки
- `contains_dairy` — Съдържа млечни продукти
- `contains_eggs` — Съдържа яйца
- `contains_fish` — Съдържа риба
- `spicy` — Лютиво

### 3.3 MenuItem

```typescript
interface MenuItem {
  id: string;
  categoryId: string;           // FK -> Category
  nameBg: string;               // Bulgarian name
  nameEn?: string;              // Optional English name
  descriptionBg?: string;
  descriptionEn?: string;
  price: number;                // In stotinki (integer cents), e.g. 850 = 8.50 лв.
  imageUrl?: string;
  isAvailable: boolean;         // Can be toggled off without deleting
  displayOrder: number;
  dietaryLabels: DietaryLabel[]; // Many-to-many via MenuItemDietaryLabel join table
  createdAt: Date;
  updatedAt: Date;
}
```

Note: Price stored as integer (stotinki) to avoid floating-point issues.

### 3.4 MenuItemDietaryLabel (join table)

```typescript
interface MenuItemDietaryLabel {
  menuItemId: string;
  dietaryLabelId: string;
}
```

### 3.5 Customer

```typescript
interface Customer {
  id: string;
  phoneNumber?: string;         // E.164 format, e.g. +359881234567
  pushSubscription?: string;    // JSON string of Web Push subscription object
  name?: string;                // Optional, if they provide it
  preferredLanguage: string;   // "bg" | "en", default "bg"
  firstSeenAt: Date;
  lastSeenAt: Date;
  orderCount: number;           // Denormalised for quick lookup
  totalSpent: number;           // In stotinki, denormalised
}
```

Customers are soft-identified. A customer without a phone number is a guest session (no CRM tracking). Phone number is collected only at the point of requesting SMS notification or opting into loyalty.

### 3.6 LoyaltyAccount

```typescript
interface LoyaltyAccount {
  id: string;
  customerId: string;           // FK -> Customer (1:1)
  points: number;               // Current point balance
  tier: "bronze" | "silver" | "gold";
  totalPointsEarned: number;   // Lifetime total
  enrolledAt: Date;
  updatedAt: Date;
}
```

Simple points model: 1 point per 1 лв. spent. Tier thresholds: Bronze 0–99, Silver 100–299, Gold 300+. Redemption to be defined in Phase 2.

### 3.7 LoyaltyTransaction

```typescript
interface LoyaltyTransaction {
  id: string;
  loyaltyAccountId: string;
  orderId: string;
  pointsDelta: number;          // Positive = earned, negative = redeemed
  reason: string;               // "order_complete" | "redemption" | "manual_adjustment"
  createdAt: Date;
}
```

### 3.8 Order

```typescript
interface Order {
  id: string;
  orderNumber: string;          // Human-readable, e.g. "A-042" (resets daily)
  customerId?: string;          // FK -> Customer, null for anonymous
  source: "qr_scan" | "kiosk" | "staff_manual";
  status: OrderStatus;
  paymentMode: "prepay_app" | "pay_at_counter";
  subtotal: number;             // In stotinki
  total: number;                // In stotinki
  notes?: string;               // Customer free-text notes
  buzzerId?: string;            // Physical buzzer unit assigned
  createdAt: Date;
  updatedAt: Date;
  readyAt?: Date;
  completedAt?: Date;
}

type OrderStatus =
  | "pending_payment"           // Awaiting payment (prepay mode)
  | "confirmed"                 // Payment received or pay-at-counter accepted
  | "preparing"                 // Kitchen is preparing
  | "ready"                     // Ready for pickup
  | "completed"                 // Customer collected
  | "cancelled";
```

### 3.9 OrderItem

```typescript
interface OrderItem {
  id: string;
  orderId: string;              // FK -> Order
  menuItemId: string;           // FK -> MenuItem
  quantity: number;
  unitPrice: number;            // Snapshot of price at time of order (stotinki)
  lineTotal: number;            // quantity * unitPrice
  notes?: string;               // Per-item notes
}
```

Price is snapshotted at order time so historical orders are not affected by price changes.

### 3.10 Payment

```typescript
interface Payment {
  id: string;
  orderId: string;              // FK -> Order
  provider: "revolut";
  revolutOrderId: string;       // Revolut's order ID
  revolutPaymentId?: string;    // Revolut's payment ID (set after payment)
  method?: "card" | "apple_pay" | "google_pay" | "cash";
  amount: number;               // In stotinki
  currency: string;             // "BGN"
  status: "pending" | "authorised" | "completed" | "failed" | "refunded";
  webhookEvents: object[];      // Array of raw Revolut webhook payloads (for audit)
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 4. User Flows

### 4.1 Customer QR Scan Flow

```
1. Customer sits at table or picks up physical menu
2. Scans QR code (unique per location, or per table if tables are numbered)
3. Browser opens PWA → /order?table=5 (or just /order for single-location)
4. PWA loads menu (served from cache if offline, syncs when online)
5. Customer browses categories, taps items to add to cart
6. Customer reviews cart
7. Customer chooses payment mode:
   a. "Pay now" → Revolut payment sheet opens (card / Apple Pay / Google Pay)
      - On payment success → order created with status "confirmed"
   b. "Pay at counter" → order created with status "confirmed", customer collects
      number/buzzer and pays when picking up
8. Customer optionally provides phone number for SMS notification
   (or allows push notification from browser)
9. Order confirmation screen shown with order number
10. When order is ready → customer receives SMS and/or push notification
    → buzzer activates
11. Customer picks up order
```

### 4.2 Counter / Kiosk Flow (Staff)

```
1. Staff opens kiosk app on tablet → /kiosk (PIN-protected)
2. Staff selects items on behalf of customer (same menu UI, staff layout)
3. Staff selects payment mode: "Card/Pay later" or "Cash"
4. Order submitted → appears on same order queue
5. For cash: staff marks payment received manually
6. For card: Revolut terminal integration or manual card payment,
   staff marks as paid
7. Staff presses "Order Ready" when food is ready
   → backend triggers buzzer + sends SMS/push to customer
```

### 4.3 Admin Flow (Owner)

```
1. Owner opens admin panel in browser → /admin (email + password login)
2. Dashboard: today's revenue, order count, top items
3. Menu Management:
   a. View all categories and items
   b. Toggle item availability (on/off switch — instant, no page reload)
   c. Edit item: name (BG/EN), price, description, dietary labels, image upload
   d. Reorder items via drag-and-drop
   e. Add/edit categories
4. Order Management:
   a. Live order list (WebSocket-powered)
   b. Filter by status, date
   c. View order details
   d. Manually update order status
5. Reports:
   a. Best-selling items (by count and by revenue)
   b. Busiest hours (orders by hour of day, heatmap)
   c. Daily revenue chart
   d. Export to CSV
6. Customer list: search by phone, view order history, loyalty points
7. Settings: opening hours display, buzzer configuration, notification templates
```

### 4.4 Order-Ready Notification Flow

```
1. Staff taps "Mark Ready" on kiosk tablet for order #A-042
2. Backend receives PATCH /orders/:id { status: "ready" }
3. Backend performs in parallel:
   a. WebSocket broadcast to kiosk and display board → order card turns green
   b. If customer has push subscription → send Web Push notification
      "Your order #A-042 is ready! Please collect it."
   c. If customer provided phone number → send SMS via Twilio
      "Вашата поръчка #A-042 е готова! Моля, вземете я."
   d. If buzzer assigned → HTTP POST to buzzer controller
      { buzzerId: "B-03", duration: 3, pattern: "short-short-long" }
4. Customer hears buzzer, sees notification, collects order
5. Staff taps "Completed" — order archived
```

---

## 5. Component Breakdown

### 5.1 Frontend Applications

All three frontend surfaces share a single React + Vite codebase at `/apps/web`. Role is determined by route prefix and auth state.

**Customer PWA (`/order/*`)**
- Menu browser with category tabs
- Cart with quantity controls
- Checkout flow (payment mode selection, phone input)
- Order confirmation + status page
- Offline-capable via service worker
- Installable (add to home screen optional but not required)

**Staff Kiosk (`/kiosk/*`)**
- PIN login (4-digit, stored in localStorage)
- Menu in kiosk layout (larger tap targets)
- Order queue panel (live WebSocket updates)
- "Mark Ready" / "Mark Completed" per order
- Basic shift summary

**Menu Display Board (`/display`)**
- Full-screen menu grid
- Auto-rotates categories
- "Currently unavailable" item overlay
- Polls or subscribes via WebSocket for availability changes
- No user interaction required

**Admin Panel (`/admin/*`)**
- Email/password auth (JWT)
- Menu CRUD
- Order management
- Reports (Recharts for charts)
- Customer lookup
- Settings

### 5.2 Backend Services

Single Node.js + Fastify application at `/apps/api`. Given the scale, a monolith is appropriate. Internal modules are cleanly separated by domain.

**Modules:**

```
/apps/api/src/
  modules/
    menu/           — Category, MenuItem, DietaryLabel CRUD
    orders/         — Order creation, status transitions, order number generation
    payments/       — Revolut integration, webhook handler
    customers/      — Customer upsert, phone lookup, push subscription storage
    loyalty/        — Points calculation, tier updates
    notifications/  — SMS (Twilio) + Web Push dispatch
    buzzer/         — HTTP trigger to buzzer controller
    reports/        — Aggregation queries for admin dashboard
    auth/           — JWT issue/verify, staff PIN management
  websocket/        — WebSocket hub, broadcast helpers
  workers/          — Background jobs (order timeout cleanup, daily report snapshot)
```

**API surface:**

| Method | Path | Description |
|---|---|---|
| GET | /menu | Full menu with categories and items (cached) |
| POST | /orders | Create order |
| GET | /orders/:id | Get order status (customer polling fallback) |
| PATCH | /orders/:id | Update order status (staff) |
| POST | /payments/revolut/create | Create Revolut order |
| POST | /payments/revolut/webhook | Revolut webhook receiver |
| POST | /customers | Upsert customer (phone number) |
| GET | /admin/orders | Admin order list |
| GET | /admin/reports/sales | Sales report data |
| GET | /admin/reports/items | Item popularity |
| POST | /admin/menu/items | Create menu item |
| PATCH | /admin/menu/items/:id | Update menu item |
| DELETE | /admin/menu/items/:id | Soft-delete menu item |
| POST | /auth/login | Admin login |
| GET | /health | Health check |

### 5.3 Database

PostgreSQL managed instance (Railway or Supabase). Prisma ORM for schema management and migrations.

Key indexes:
- `orders.createdAt` — for date-range reporting
- `orders.status` — for live queue queries
- `orders.orderNumber` — for customer lookup
- `customers.phoneNumber` — for SMS lookup
- `menuItems.categoryId` + `menuItems.displayOrder` — for menu rendering

### 5.4 Background Workers

Lightweight in-process workers using `node-cron`:
- Daily order number reset at midnight (resets `A-001` sequence)
- Hourly report snapshot write to a `daily_summary` table
- Weekly loyalty tier recalculation

### 5.5 Integrations

See Sections 6 and 7 for Revolut and Buzzer detail.

- **Twilio** — SMS notifications (order ready)
- **Web Push (VAPID)** — Browser push notifications
- **Cloudflare R2 / Supabase Storage** — Menu item image uploads

---

## 6. Revolut Business Integration Notes

### 6.1 What to Use

Use the **Revolut Business Merchant API** (not Revolut Pay widget alone). This gives access to:
- Order creation and payment link generation
- Webhook events for payment status
- Apple Pay and Google Pay via the hosted payment page or embedded widget
- Cash/manual payment recording outside Revolut (for pay-at-counter cash)

Documentation: `https://developer.revolut.com/docs/merchant`

### 6.2 Integration Flow (Prepay Mode)

```
1. Customer confirms cart → POST /payments/revolut/create
2. Backend calls Revolut POST /api/orders with:
   {
     amount: 1250,          // in stotinki
     currency: "BGN",
     capture_mode: "automatic",
     merchant_order_ext_ref: "A-042",
     description: "Park Restaurant Order A-042",
     email: null,           // optional
     metadata: { internalOrderId: "uuid" }
   }
3. Revolut returns { id, checkout_url, token }
4. Backend stores revolutOrderId in Payment record
5. Frontend opens checkout_url in same tab (or Revolut embedded widget)
6. Customer pays (card, Apple Pay, Google Pay)
7. Revolut sends webhook to POST /payments/revolut/webhook:
   { event: "ORDER_COMPLETED", order_id: "...", ... }
8. Backend validates webhook signature (HMAC-SHA256 with signing secret)
9. Backend updates Payment status → "completed"
10. Backend updates Order status → "confirmed"
11. WebSocket broadcast to kiosk
```

### 6.3 Pay at Counter Mode

- Order is created in backend with `paymentMode: "pay_at_counter"` and status `"confirmed"` immediately
- No Revolut order is created at this stage
- When customer pays cash: staff marks as paid manually (no Revolut involvement)
- When customer pays card at counter: staff uses Revolut POS terminal (separate hardware) or creates a payment link manually via Revolut Business app — outside the scope of this system

### 6.4 Webhook Security

```typescript
// Validate Revolut webhook signature
import { createHmac } from "crypto";

function validateRevolutWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return expected === signature;
}
```

Store `REVOLUT_WEBHOOK_SECRET` in environment variables, never in source code.

### 6.5 Environment Configuration

```
REVOLUT_API_KEY=           # Merchant API key from Revolut Business dashboard
REVOLUT_WEBHOOK_SECRET=    # Webhook signing secret
REVOLUT_API_BASE=          # https://merchant.revolut.com (prod) or https://sandbox-merchant.revolut.com (sandbox)
```

### 6.6 Test / Sandbox

Revolut provides a sandbox environment with test cards. Use `sandbox-merchant.revolut.com` during development. Switch to production URL at go-live.

---

## 7. Buzzer System Integration Notes

### 7.1 Recommended Hardware

A Raspberry Pi Zero 2W (~$15) or a USB relay controller connected to off-the-shelf restaurant call buzzers (pager system). The Pi runs a tiny HTTP server that listens for trigger commands from the backend.

Alternatively, an ESP32 microcontroller (~$5) with Wi-Fi can expose a simple HTTP endpoint — lower cost but requires embedded firmware.

### 7.2 Buzzer Controller API (runs on local network)

The buzzer device exposes a simple REST endpoint on the local park Wi-Fi:

```
POST http://192.168.1.50:8080/buzz
Content-Type: application/json

{
  "buzzerId": "B-03",
  "durationMs": 2000,
  "pattern": "short-short-long"
}
```

Response: `200 OK` or `503 Service Unavailable` (if buzzer not connected).

### 7.3 Backend Integration

```typescript
async function triggerBuzzer(buzzerId: string): Promise<void> {
  const BUZZER_URL = process.env.BUZZER_CONTROLLER_URL;
  try {
    await fetch(`${BUZZER_URL}/buzz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buzzerId, durationMs: 2000, pattern: "short-short-long" }),
      signal: AbortSignal.timeout(3000)   // 3-second timeout, non-blocking
    });
  } catch (err) {
    // Buzzer failure is non-fatal — log and continue
    logger.warn("Buzzer trigger failed", { buzzerId, error: err });
  }
}
```

Buzzer failure must never block the order-ready notification flow. SMS and push notifications proceed regardless.

### 7.4 Buzzer Assignment

The `Order` record has an optional `buzzerId` field. Staff assign a physical buzzer unit to a customer when they place an order at the counter. For QR orders, buzzer assignment is optional (notification via phone is sufficient).

### 7.5 Network Topology

The buzzer controller is on the same local Wi-Fi as the staff tablet. The backend API may be on the internet (cloud-hosted). Two options:

**Option A (Recommended):** Backend calls buzzer controller via an ngrok-style tunnel or the backend is local.

**Option B:** Staff tablet acts as the buzzer trigger — kiosk app makes a local network request to the buzzer controller directly when "Mark Ready" is tapped, bypassing the cloud backend for this specific action. This is simpler and avoids the cloud-to-local routing problem.

For a park setting, Option B is recommended: the tablet and buzzer share the park's Wi-Fi, and the tablet triggers the buzzer locally.

---

## 8. Offline Resilience Strategy

### 8.1 Threat Model

The park may have intermittent 4G or weak Wi-Fi. Key failure scenarios:

| Scenario | Impact | Mitigation |
|---|---|---|
| Customer loses connection while browsing menu | Cannot see menu | Cache menu in service worker |
| Customer loses connection at checkout | Cannot pay | Show clear error, preserve cart |
| Staff tablet loses connection | Cannot receive orders | Optimistic local queue + sync on reconnect |
| Backend is down | Everything fails | Show maintenance page, preserve pending orders in IndexedDB |

### 8.2 Service Worker Strategy (Customer PWA)

Use Workbox (integrated with Vite via `vite-plugin-pwa`).

```javascript
// Cache-first for static assets and menu data
registerRoute(
  ({ url }) => url.pathname.startsWith("/menu"),
  new CacheFirst({
    cacheName: "menu-cache",
    plugins: [
      new ExpirationPlugin({ maxAgeSeconds: 60 * 60 }) // 1 hour TTL
    ]
  })
);

// Network-first for orders (we want fresh data)
registerRoute(
  ({ url }) => url.pathname.startsWith("/orders"),
  new NetworkFirst({ cacheName: "orders-cache" })
);
```

### 8.3 Offline Order Queue (Customer)

If a customer submits an order while offline:

1. Order is saved to IndexedDB with status `"queued_offline"`
2. UI shows "Order saved. Will be submitted when connected."
3. Service worker Background Sync API retries the POST request when connectivity resumes
4. On success, order confirmation is shown

Note: Payments cannot be taken offline. If customer is in "prepay" mode and goes offline before payment, they are directed to pay at counter instead.

### 8.4 Kiosk Resilience (Staff Tablet)

The kiosk app uses a local WebSocket connection with automatic reconnection (exponential backoff). During disconnection:

- Staff can still browse the menu and add items to orders
- Orders are queued in IndexedDB
- On reconnect, queued orders are flushed to the backend
- A "OFFLINE" banner is shown on the kiosk so staff know to hold orders

### 8.5 Menu Caching

The menu rarely changes during service. The backend serves the menu with a `Cache-Control: max-age=3600` header and an `ETag`. The PWA caches this response. On load, the app renders from cache immediately and fetches an update in the background (stale-while-revalidate pattern).

---

## 9. Placeholder Menu Structure in Bulgarian

This is the initial seed data for the database. Real items and prices to be filled in by the owner via the admin panel.

```json
{
  "categories": [
    {
      "slug": "osnovni-yastiya",
      "name": "Основни ястия",
      "displayOrder": 1,
      "items": [
        { "nameBg": "Артикул 1", "price": 0, "isAvailable": false },
        { "nameBg": "Артикул 2", "price": 0, "isAvailable": false }
      ]
    },
    {
      "slug": "zakuski",
      "name": "Закуски",
      "displayOrder": 2,
      "items": [
        { "nameBg": "Артикул 1", "price": 0, "isAvailable": false },
        { "nameBg": "Артикул 2", "price": 0, "isAvailable": false }
      ]
    },
    {
      "slug": "napitki",
      "name": "Напитки",
      "displayOrder": 3,
      "items": [
        { "nameBg": "Артикул 1", "price": 0, "isAvailable": false },
        { "nameBg": "Артикул 2", "price": 0, "isAvailable": false }
      ]
    },
    {
      "slug": "deserti",
      "name": "Десерти",
      "displayOrder": 4,
      "items": [
        { "nameBg": "Артикул 1", "price": 0, "isAvailable": false },
        { "nameBg": "Артикул 2", "price": 0, "isAvailable": false }
      ]
    }
  ],
  "dietaryLabels": [
    { "key": "vegetarian",     "labelBg": "Вегетарианско",           "iconSlug": "leaf" },
    { "key": "vegan",          "labelBg": "Веганско",                "iconSlug": "leaf-circle" },
    { "key": "gluten_free",    "labelBg": "Без глутен",              "iconSlug": "wheat-off" },
    { "key": "contains_nuts",  "labelBg": "Съдържа ядки",           "iconSlug": "nut" },
    { "key": "contains_dairy", "labelBg": "Съдържа млечни продукти", "iconSlug": "milk" },
    { "key": "contains_eggs",  "labelBg": "Съдържа яйца",           "iconSlug": "egg" },
    { "key": "contains_fish",  "labelBg": "Съдържа риба",           "iconSlug": "fish" },
    { "key": "spicy",          "labelBg": "Лютиво",                  "iconSlug": "flame" }
  ]
}
```

The QR code should point to `https://order.yourrestaurant.bg/order` (or equivalent domain). A single QR code is sufficient for a self-service restaurant without numbered tables. If table numbers are needed in future, QR codes can encode `?table=N`.

---

## 10. Next Steps / Build Order

### Phase 1 — Foundation (Week 1–2)

1. Set up monorepo: `apps/web`, `apps/api`, `packages/shared-types`
2. Configure Prisma schema with all models above
3. Deploy PostgreSQL on Railway (or Supabase)
4. Seed database with placeholder menu categories and dietary labels
5. Build basic Fastify API: `GET /menu`, `POST /orders`, `GET /orders/:id`
6. Build customer PWA: menu browser, cart, order confirmation (no payment yet)
7. Deploy PWA to Cloudflare Pages or Vercel (free tier)
8. Generate and test QR code linking to the PWA

Deliverable: Customer can scan QR, browse menu, submit order (no payment, pay-at-counter only). Staff can see orders via API.

### Phase 2 — Staff Kiosk + Display Board (Week 3)

1. Build kiosk layout (role-based routing on same PWA)
2. Implement WebSocket hub in backend
3. Live order queue on kiosk (WebSocket)
4. "Mark Ready" and "Mark Completed" actions
5. Build display board view (read-only, live updates)
6. Admin panel shell: login, menu management (CRUD)

Deliverable: Staff can take orders at counter, manage order flow, display board shows live menu.

### Phase 3 — Payments (Week 4)

1. Create Revolut Business merchant account
2. Implement `POST /payments/revolut/create` and `POST /payments/revolut/webhook`
3. Integrate Revolut checkout in customer PWA (prepay mode)
4. Test with sandbox cards (Visa, Mastercard, Apple Pay simulator)
5. Handle payment failure gracefully (retry, fall back to pay-at-counter)
6. Go-live with production Revolut API keys

Deliverable: Customers can pay by card, Apple Pay, or Google Pay before collecting.

### Phase 4 — Notifications + Buzzer (Week 5)

1. Integrate Twilio SMS (order-ready notification in Bulgarian)
2. Implement Web Push (VAPID) — prompt customer for push permission after ordering
3. Build buzzer controller firmware (Raspberry Pi or ESP32)
4. Connect buzzer trigger to order-ready event
5. Test full notification flow end-to-end

Deliverable: Customer is notified by SMS, push, and buzzer when order is ready.

### Phase 5 — CRM + Loyalty (Week 6)

1. Customer phone number collection and upsert
2. Order history view (customer can see past orders by phone number)
3. Loyalty points calculation on order completion
4. Loyalty tier display in customer PWA
5. Admin customer list with search and order history

Deliverable: Returning customers are recognised, points accumulate.

### Phase 6 — Reporting + Polish (Week 7)

1. Admin reports: best-selling items, busiest hours, daily revenue
2. CSV export
3. PWA offline resilience (service worker, IndexedDB queue)
4. Performance optimisation (menu caching, image compression)
5. Bulgarian language polish throughout
6. Final QR code design and print materials

Deliverable: Full system ready for summer opening.

### Decisions to Revisit Before Build

| Decision | Options | Recommended | Notes |
|---|---|---|---|
| Hosting | Railway vs Fly.io vs Supabase | Railway | Simpler for combined Node+Postgres |
| SMS provider | Twilio vs Vonage vs MSG91 | Twilio | Best documentation, reliable |
| Buzzer hardware | Raspberry Pi vs ESP32 | ESP32 | Cheaper, simpler firmware, Wi-Fi built in |
| Table QR | Single QR vs per-table | Single QR | Start simple; add per-table in Phase 2 if needed |
| Customer auth | Anonymous vs soft phone ID | Soft phone ID | Collect phone only when needed |
| Image hosting | Supabase Storage vs R2 | Supabase Storage | Free tier, same platform as potential DB host |
| Push notifications | Web Push only vs FCM | Web Push (VAPID) | No Firebase dependency, works natively |

---

*End of Architecture Document*
