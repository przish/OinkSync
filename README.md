# 🐷 PiggyTrack (OinkSync) — Smart Pig Farm Management System

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

**PiggyTrack** is an all-in-one farm operations and financial management operating system designed for piggeries and swine farming enterprises. It unifies herd inventory tracking, pen management, financial accounting, daily logs, investor reporting, and scaling readiness into an intuitive, real-time dashboard.

---

## 🌟 Key Features

### 📊 1. Executive Dashboard & KPIs
- **Real-Time Financial Overview**: Total capital, gross revenue, operating expenses, net profit, and ROI tracking.
- **Herd Snapshot**: Live counts for active pigs, breeding sows, piglets, and market-ready animals.
- **Pending Approvals & Alerts**: Notification banner for transactions and critical farm alerts.
- **Investor Overview**: Breakdown of capital contributions across roles and stakeholders.

### 🐖 2. Herd & Pen Inventory
- **Pen Capacity Management**: Visual progress bars tracking occupancy rates across pens.
- **Animal Profiling**: Detailed tracking per animal (ear tag/code, birth date, gender, current weight, health status, and pen assignment).
- **Health Monitoring**: Instant alerts for sick or recovering pigs.

### 📝 3. Daily Pen Logs
- **Feeding Logs**: Feed type, quantity (kg), and water checks.
- **Sanitation & Hygiene**: Cleanliness scoring (1–10) and cleaning status tracking.
- **Health & Mortality**: Log sickness incidents, mortalities, and causes.

### 💳 4. Financials & Transaction Approvals
- **Dual-Flow Bookkeeping**: Full income and expense categorization (Feed, Medicine, Logistics, Utilities, Sales, etc.).
- **Receipt Attachments**: Upload and preview transaction receipts directly with Supabase Storage.
- **Approval Workflow**: Admins review, approve, or reject transactions submitted by farm staff.

### 📈 5. Analytics & Scaling Plan
- **Financial Trends**: Interactive revenue vs. expense charts powered by Recharts.
- **Expense Categorization**: Breakdown charts to pinpoint major cost drivers.
- **Scaling Readiness Engine**: Evaluates capital readiness, target pig capacity, and timeline projections for farm expansion.

### 👥 6. Team & Role-Based Access Control (RBAC)
- **Roles Supported**:
  - `Admin`: Full access, approval authority, financial oversight, and member invitations.
  - `Pen Manager`: Herd logging, health updates, and inventory additions.
  - `Logistics`: Expense logging and operational support.
  - `Investor`: Read-only financial statements, ROI dashboards, and profit-sharing reports.
- **Secure Invitations**: Admin-controlled team invites powered by Supabase Service Role and Row-Level Security (RLS).

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Styling**: Custom CSS Design System with CSS variables and responsive glassmorphism/dark aesthetics
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL with RLS, Auth, Storage)
- **Forms & Validation**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Charts & Visuals**: [Recharts](https://recharts.org/), [Lucide React](https://lucide.dev/)
- **Notifications**: [React Hot Toast](https://react-hot-toast.com/)

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.18+ or v20+
- **npm**, **yarn**, **pnpm**, or **bun**
- A **[Supabase](https://supabase.com)** project

---

### 1. Clone the Repository
```bash
git clone https://github.com/przish/PiggyTrack.git
cd PiggyTrack
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 4. Setup Database & Policies
1. Open your **Supabase Dashboard** → **SQL Editor**.
2. Run your table schema migrations.
3. Run the policy setup script located in [`supabase/fix-rls.sql`](./supabase/fix-rls.sql) to configure Row-Level Security (RLS) policies and seed your initial admin user.

### 5. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## 📁 Project Structure

```text
PiggyTrack/
├── src/
│   ├── app/                      # Next.js App Router routes
│   │   ├── (auth)/login          # Authentication & Login
│   │   ├── analytics/            # Financial & operational analytics
│   │   ├── api/                  # API Route Handlers (REST endpoints)
│   │   │   ├── analytics/
│   │   │   ├── inventory/
│   │   │   ├── pen-logs/
│   │   │   ├── transactions/
│   │   │   └── users/
│   │   ├── dashboard/            # Executive overview & KPIs
│   │   ├── inventory/            # Herd & pen management
│   │   ├── pen-logs/             # Daily feeding & sanitation logs
│   │   ├── reports/              # Monthly reports & investor statements
│   │   ├── scaling-plan/         # Growth projection calculator
│   │   ├── settings/             # Farm settings
│   │   └── users/                # Team member management
│   ├── components/               # Modular UI & Layout components
│   │   ├── Auth/                 # Protected route guards
│   │   ├── Forms/                # Modals & input components
│   │   ├── Navigation/           # Sidebar & TopBar
│   │   └── UI/                   # Badges, Buttons, Cards, Spinners
│   ├── lib/                      # Utilities, hooks, auth & supabase clients
│   │   ├── hooks/                # Custom React hooks (useAuth, useInventory, etc.)
│   │   ├── supabase/             # Client, server, and middleware configurations
│   │   └── utils/                # Validation schemas, formatting helpers
│   └── types/                    # TypeScript interfaces & API definitions
├── supabase/                     # SQL migration scripts & RLS policies
└── public/                       # Static assets & icons
```

---

## 🔒 Security & Row-Level Security (RLS)

PiggyTrack uses strict PostgreSQL Row-Level Security policies:
- All read access is restricted to authenticated users.
- Transaction submissions and daily logs verify the submitting `auth.uid()`.
- Admin-level actions (e.g., creating team members) use secure server-side API routes configured with the Supabase Service Role client to safely enforce administrative rights.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/przish/PiggyTrack/issues).

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
