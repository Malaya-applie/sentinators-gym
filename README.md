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
| GET    | `/settings`        | Admin | Get quarterly/monthly surcharge percentages            |
| PUT    | `/settings`        | Admin | Update quarterly/monthly surcharge percentages         |

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
- **Website Content**: CMS for all site content (hero, plans, trainers, testimonials, FAQ, etc.)
- **Settings**: Configure quarterly and monthly instalment surcharge percentages with a live preview

---

## Pricing & Payment Calculation Logic

### Payment Frequencies

A member can choose one of three payment frequencies during registration:

| Frequency | Value       | Description                                     |
| --------- | ----------- | ----------------------------------------------- |
| Yearly    | `UPFRONT`   | Pay the full amount once at the time of joining |
| Quarterly | `QUARTERLY` | Pay every 3 months (surcharge applied)          |
| Monthly   | `MONTHLY`   | Pay every month (surcharge applied)             |

---

### Instalment Surcharge (configurable in Admin → Settings)

Quarterly and monthly billing incur a processing surcharge to cover administration and payment costs. The default surcharges are:

| Frequency | Default Surcharge |
| --------- | ----------------- |
| Quarterly | **+5 %**          |
| Monthly   | **+10 %**         |

Admins can change these percentages any time from **Admin Panel → Settings** tab. The new values apply across the entire frontend immediately.

---

### Total Amount Formula

The surcharge is applied to the **full yearly total** (plan price + add-ons + registration fee − discount):

```
yearly_total = plan.price + additionalTotal + registrationFee − discountAmount

UPFRONT / Yearly:  total = yearly_total
QUARTERLY:         total = yearly_total × (1 + quarterlyFeePercent / 100)
MONTHLY:           total = yearly_total × (1 + monthlyFeePercent / 100)
```

> The result is always clamped to `≥ 0`.

---

### Per-Period Amount (shown in contract / email)

| Frequency   | Per-period amount                                                          |
| ----------- | -------------------------------------------------------------------------- |
| `UPFRONT`   | `null` — no periodic payments, shown as lump sum (labelled "Yearly")       |
| `MONTHLY`   | `yearly_total × (1 + monthlyFeePercent / 100) ÷ totalPlanMonths`           |
| `QUARTERLY` | `yearly_total × (1 + quarterlyFeePercent / 100) ÷ ceil(totalPlanMonths/3)` |

---

### Example

**Plan:** 12-Month Gym Membership — `price = CHF 840`  
Add-ons: CHF 0 | Registration fee: CHF 99 | Discount: CHF 49  
Surcharges: Quarterly +5 %, Monthly +10 %

```
yearly_total = 840 + 0 + 99 − 49 = CHF 890
```

| Frequency | Total calculation | Total      | Per-period calculation | Per-period      |
| --------- | ----------------- | ---------- | ---------------------- | --------------- |
| Yearly    | 890               | CHF 890    | —                      | —               |
| Quarterly | 890 × 1.05        | CHF 934.50 | 934.50 ÷ 4             | CHF 233.63 /qtr |
| Monthly   | 890 × 1.10        | CHF 979.00 | 979.00 ÷ 12            | CHF 81.58 /mo   |

> Surcharges apply to the **full yearly total** (including add-ons, registration fee, and discount).

---

### Configuring Surcharges

1. Log in to the admin panel at `/admin`
2. Click **Settings** in the left sidebar
3. Set **Quarterly Payment Surcharge (%)** and **Monthly Payment Surcharge (%)**
4. Click **Save Settings** — changes take effect immediately on the frontend

---

### Auto-reset Rules

- If a plan duration is **less than 3 months**, Quarterly is not available — the frequency is auto-reset to **Yearly** (UPFRONT).

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
