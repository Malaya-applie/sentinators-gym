# GYM — Full-Stack Gym Management Application

A full-stack gym management platform with a Next.js frontend, Node.js/Express backend, PostgreSQL database via Prisma ORM, and a dark admin panel for managing members, memberships, and shop orders.

---

## Tech Stack

| Layer            | Technology                                          |
| ---------------- | --------------------------------------------------- |
| Frontend         | Next.js 16.2, React 19, Tailwind CSS, Radix UI      |
| State Management | Redux Toolkit (RTK), React-Redux                    |
| Backend          | Node.js, Express.js, TypeScript                     |
| Database         | PostgreSQL                                          |
| ORM              | Prisma 5                                            |
| Auth             | JWT (HS256) — separate secrets for users and admins |
| HTTP Client      | Axios                                               |

---

## Project Structure

```
GYM/
├── backend/               # Express + TypeScript API
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   ├── src/
│   │   ├── index.ts       # Server entry point (port 5000)
│   │   ├── lib/prisma.ts  # PrismaClient singleton
│   │   ├── middleware/
│   │   │   └── auth.ts    # requireAuth / requireAdmin middleware
│   │   ├── routes/
│   │   │   ├── auth.ts        # /api/auth
│   │   │   ├── membership.ts  # /api/membership
│   │   │   ├── shop.ts        # /api/shop
│   │   │   └── admin.ts       # /api/admin
│   │   └── seed.ts        # Database seeder
│   ├── .env               # Environment variables (update before running)
│   └── package.json
│
└── frontend/              # Next.js application
    ├── app/
    │   ├── layout.tsx     # Root layout with ReduxProvider
    │   ├── page.tsx       # Homepage
    │   └── admin/
    │       └── page.tsx   # Admin panel at /admin
    ├── components/
    │   ├── navbar.tsx          # Member Login popup
    │   ├── hero-section.tsx    # Registration form
    │   ├── pricing-section.tsx # Membership plans (API-connected)
    │   ├── shop/
    │   │   └── shop-products-section.tsx  # Products + order placement
    │   └── admin/
    │       ├── admin-login.tsx       # Admin login form
    │       ├── admin-layout.tsx      # Sidebar shell
    │       ├── admin-dashboard.tsx   # Stats overview
    │       ├── admin-users.tsx       # Customer table
    │       ├── admin-memberships.tsx # Approve/reject memberships
    │       └── admin-orders.tsx      # Approve/reject shop orders
    ├── store/
    │   ├── index.ts        # Redux store
    │   ├── hooks.ts        # Typed hooks
    │   └── slices/
    │       ├── authSlice.ts       # User auth state
    │       ├── membershipSlice.ts # Membership plans & purchases
    │       ├── shopSlice.ts       # Products, cart, orders
    │       └── adminSlice.ts      # Admin auth & all admin data
    ├── lib/
    │   └── api.ts          # Axios instance (auto-attaches JWT)
    └── .env.local          # Frontend env vars
```

---

## Setup & Installation

### Prerequisites

- Node.js 18+
- PostgreSQL running locally (default port 5432)

---

### 1. Database

Create a PostgreSQL database:

```sql
CREATE DATABASE gymdb;
```

---

### 2. Backend

```bash
cd backend

# Install dependencies
npm install

# Configure environment
# Edit .env and update DATABASE_URL with your PostgreSQL credentials:
# DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/gymdb"

# Run database migrations
npx prisma migrate dev --name init

# Seed the database (creates admin, membership plans, products)
npm run seed

# Start the development server
npm run dev
```

The backend will run on **http://localhost:5000**.

---

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will run on **http://localhost:3000**.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable           | Description                  | Default                                               |
| ------------------ | ---------------------------- | ----------------------------------------------------- |
| `DATABASE_URL`     | PostgreSQL connection string | `postgresql://postgres:password@localhost:5432/gymdb` |
| `JWT_SECRET`       | Secret for user JWT tokens   | `your_jwt_secret_here`                                |
| `JWT_ADMIN_SECRET` | Secret for admin JWT tokens  | `your_admin_jwt_secret_here`                          |
| `PORT`             | Backend port                 | `5000`                                                |
| `ADMIN_EMAIL`      | Default admin email          | `admin@gym.com`                                       |
| `ADMIN_PASSWORD`   | Default admin password       | `Admin@123`                                           |

> **Important**: Change `JWT_SECRET` and `JWT_ADMIN_SECRET` to strong random strings in production.

### Frontend (`frontend/.env.local`)

| Variable              | Description          | Default                     |
| --------------------- | -------------------- | --------------------------- |
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:5000/api` |

---

## Default Credentials

### Admin Panel (`/admin`)

| Field    | Value           |
| -------- | --------------- |
| Email    | `admin@gym.com` |
| Password | `Admin@123`     |

---

## API Routes

### Auth (`/api/auth`)

| Method | Endpoint    | Auth | Description              |
| ------ | ----------- | ---- | ------------------------ |
| POST   | `/register` | —    | Register a new user      |
| POST   | `/login`    | —    | User login, returns JWT  |
| GET    | `/me`       | User | Get current user profile |

### Membership (`/api/membership`)

| Method | Endpoint        | Auth | Description                                         |
| ------ | --------------- | ---- | --------------------------------------------------- |
| GET    | `/plans`        | —    | List all membership plans                           |
| POST   | `/purchase`     | User | Purchase a membership plan (creates PENDING record) |
| GET    | `/my-purchases` | User | Get current user's membership purchases             |

### Shop (`/api/shop`)

| Method | Endpoint     | Auth | Description                             |
| ------ | ------------ | ---- | --------------------------------------- |
| GET    | `/products`  | —    | List all products                       |
| POST   | `/order`     | User | Place an order (creates PENDING record) |
| GET    | `/my-orders` | User | Get current user's orders               |

### Admin (`/api/admin`)

| Method | Endpoint           | Auth  | Description                                            |
| ------ | ------------------ | ----- | ------------------------------------------------------ |
| POST   | `/login`           | —     | Admin login, returns admin JWT                         |
| GET    | `/stats`           | Admin | Dashboard statistics                                   |
| GET    | `/users`           | Admin | List all registered users                              |
| GET    | `/memberships`     | Admin | List membership purchases (optional `?status=PENDING`) |
| PATCH  | `/memberships/:id` | Admin | Approve or reject a membership (`{status, notes}`)     |
| GET    | `/orders`          | Admin | List shop orders (optional `?status=PENDING`)          |
| PATCH  | `/orders/:id`      | Admin | Approve or reject an order (`{status, notes}`)         |

---

## Database Schema

### Models

| Model                | Description                                    |
| -------------------- | ---------------------------------------------- |
| `Admin`              | Admin accounts (seeded, not self-registerable) |
| `User`               | Gym members (registration via hero form)       |
| `MembershipPlan`     | Available membership plans                     |
| `MembershipPurchase` | User membership purchases with approval status |
| `Product`            | Shop products                                  |
| `Order`              | Shop orders with approval status               |
| `OrderItem`          | Individual items within an order               |

### Enums

- `Gender`: `MALE`, `FEMALE`, `OTHER`
- `ApprovalStatus`: `PENDING`, `APPROVED`, `REJECTED`
- `PlanCategory`: `MEMBERSHIP`, `SHORT_TERM`, `ADDITIONAL`

---

## Features

### Public Site

- **Registration** (hero section): Full member registration form — name, email, password, age, gender, height, weight, phone, fitness goal, experience level
- **Member Login** (navbar): Popup login dialog, shows member name + logout when authenticated
- **Membership Plans** (pricing section): Plans loaded from database; "Get Started" submits a purchase request
- **Shop** (shop page): Products loaded from database; "Pick Now" places an order

### Admin Panel (`/admin`)

- Dark-themed dashboard
- **Dashboard**: Stats cards (total users, pending/approved memberships, pending orders) + recent activity lists
- **Customers**: Full table of all registered members with profile details
- **Memberships**: Filter by status, approve/reject purchase requests with optional admin notes
- **Shop Orders**: Filter by status, approve/reject orders with optional admin notes

---

## Pricing & Payment Calculation Logic

### Plan Price Fields

Each `MembershipPlan` has three price fields:

| Field            | Type   | Purpose                                                    |
| ---------------- | ------ | ---------------------------------------------------------- |
| `price`          | Float  | Base upfront price for the plan (always required)          |
| `monthlyPrice`   | Float? | Per-month charge when member selects Monthly frequency     |
| `quarterlyPrice` | Float? | Per-quarter charge when member selects Quarterly frequency |

> If `monthlyPrice` / `quarterlyPrice` are `null` or `0`, the frequency total falls back to the base upfront `price`.

---

### Payment Frequencies

A member can choose one of three payment frequencies during registration:

| Frequency | Value       | Description                                     |
| --------- | ----------- | ----------------------------------------------- |
| Yearly    | `UPFRONT`   | Pay the full amount once at the time of joining |
| Monthly   | `MONTHLY`   | Pay a fixed amount every month                  |
| Quarterly | `QUARTERLY` | Pay a fixed amount every 3 months               |

---

### Total Amount Formula

```
Total = Plan Charge + Add-on Total + Registration Fee − Discount
```

Where **Plan Charge** depends on the selected frequency:

| Frequency   | Plan Charge Calculation                                        |
| ----------- | -------------------------------------------------------------- |
| `UPFRONT`   | `plan.price`                                                   |
| `MONTHLY`   | `plan.monthlyPrice × totalPlanMonths` (if monthlyPrice is set) |
| `QUARTERLY` | `plan.quarterlyPrice × floor(totalPlanMonths / 3)` (if set)    |

**Full formula:**

```
UPFRONT (displayed as "Yearly" — pay full amount at once):
  total = plan.price + additionalTotal + registrationFee − discountAmount

MONTHLY (when monthlyPrice is set):
  total = (plan.monthlyPrice × totalPlanMonths) + additionalTotal + registrationFee − discountAmount

QUARTERLY (when quarterlyPrice is set):
  quarters = floor(totalPlanMonths / 3)
  total = (plan.quarterlyPrice × quarters) + additionalTotal + registrationFee − discountAmount

Fallback (MONTHLY/QUARTERLY without explicit price set):
  total = plan.price + additionalTotal + registrationFee − discountAmount
```

> The result is always clamped to `≥ 0`.

---

### Per-Period Amount (shown in contract / email)

This is the installment amount shown on the signed contract and in the confirmation email.

| Frequency   | Per-period amount                                                    |
| ----------- | -------------------------------------------------------------------- |
| `UPFRONT`   | `null` — no periodic payments, shown as lump sum (labelled "Yearly") |
| `MONTHLY`   | `plan.monthlyPrice` (if set), else `plan.price / totalPlanMonths`    |
| `QUARTERLY` | `plan.quarterlyPrice` (if set), else `plan.price / floor(months/3)`  |

---

### Example

**Plan:** 6-Month Gym Membership  
`price = CHF 388`, `monthlyPrice = CHF 70`, `quarterlyPrice = CHF 200`  
Add-ons: CHF 0 | Registration fee: CHF 30 | Discount: CHF 0

| Frequency          | Calculation               | Total   | Per-period   |
| ------------------ | ------------------------- | ------- | ------------ |
| Yearly (= UPFRONT) | 388 + 30                  | CHF 418 | —            |
| Monthly            | (70 × 6) + 30 = 420 + 30  | CHF 450 | CHF 70 /mo   |
| Quarterly          | (200 × 2) + 30 = 400 + 30 | CHF 430 | CHF 200 /qtr |

---

### Auto-reset Rules

- If a plan duration is **less than 3 months**, Quarterly is not available — the frequency is auto-reset to **Yearly** (UPFRONT).
- Prices are validated server-side: `monthlyPrice` and `quarterlyPrice` cannot be negative (`Math.max(0, value)`).
- If `monthlyPrice` / `quarterlyPrice` is saved as `0` in the admin panel, it is stored as `null` (treated as "not set").

---

## Running Both Servers Concurrently

Open two terminal windows:

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Then open **http://localhost:3000** in your browser and **http://localhost:3000/admin** for the admin panel.
