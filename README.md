# Merthanaya POS

A **Traditional Market Hybrid Point-of-Sales System** designed for grocery stores in Bali that sell a mix of barcoded goods (Sembako) and loose/visual goods (Daging, Canang, Jajan).

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Runner (📱)  │  │ Cashier (💳) │  │  Admin (⚙️)  │       │
│  │   Tablet     │  │   Desktop    │  │   Desktop     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
└─────────┼─────────────────┼─────────────────┼───────────────┘
          │                 │                 │
          │    REST API     │   Realtime      │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (FastAPI)                          │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Database (Supabase)                         │
│            PostgreSQL + Realtime + Auth                      │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 The Ticket System

Unlike a standard supermarket where the cashier does everything, this system **splits the workload**:

1. **Runners (Mobile Staff)**: Use tablets to consult with customers, input items, and generate a ticket (#001, #002, etc.)
2. **Cashier (Desk Staff)**: Sees tickets appear in real-time, verifies the total, and processes payment

## 📁 Project Structure

```
/merthanaya
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── main.py         # FastAPI app
│   │   ├── config.py       # Environment config
│   │   ├── db/             # Supabase connection
│   │   ├── models/         # Pydantic schemas
│   │   └── routers/        # API endpoints
│   └── requirements.txt
│
└── frontend/               # Next.js frontend
    ├── src/
    │   ├── app/            # App router pages
    │   │   ├── admin/      # Product management
    │   │   ├── runner/     # Runner POS
    │   │   └── cashier/    # Cashier dashboard
    │   ├── components/     # React components
    │   ├── lib/            # API client, Supabase
    │   └── types/          # TypeScript types
    └── package.json
```

## 🚀 Quick Start

### 1. Database Setup (Supabase)

Create a new project at [supabase.com](https://supabase.com) and run the SQL schema in the SQL Editor. See `implementation_plan.md` for the complete schema.

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file with:
# SUPABASE_URL=your_url
# SUPABASE_ANON_KEY=your_anon_key
# SUPABASE_SERVICE_ROLE_KEY=your_service_key

uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Create .env.local file with:
# NEXT_PUBLIC_SUPABASE_URL=your_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
# NEXT_PUBLIC_API_URL=http://localhost:8000

npm run dev
```

### 4. Access the System

- **Landing Page**: http://localhost:3000
- **Runner POS**: http://localhost:3000/runner
- **Cashier Dashboard**: http://localhost:3000/cashier
- **Admin Panel**: http://localhost:3000/admin/products
- **API Docs**: http://localhost:8000/docs

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (Python) + Pydantic
- **Database**: Supabase (PostgreSQL + Realtime)
- **UI Components**: Shadcn UI + Sonner (toasts)

## 📋 Features Implemented

### Sprint 1 ✅
- [x] Product CRUD (Admin)
- [x] Category-based fields (Barcode for Sembako, Image for visual items)
- [x] Runner POS interface with product grid
- [x] Cart management with quantity controls
- [x] Daily ticket numbering (#001, #002...)
- [x] Cashier dashboard with pending orders
- [x] Real-time order updates via Supabase

### Sprint 1.5 - Admin Enhancements ✅
- [x] **Pagination**: 10 products per page with navigation controls
- [x] **Soft Delete/Reactivate**: Products can be deactivated and reactivated
- [x] **Hard Delete**: Option to permanently delete products
- [x] **Unit Types**: Support for kg, item, and pcs unit types
- [x] **Light Theme**: Converted admin panel from dark to light theme
- [x] **Icon-based Actions**: Edit, Deactivate, Activate, Delete buttons use Lucide React icons
- [x] **Form UX**: Price/stock fields clear default 0 on focus
- [x] **Tailwind CSS v4**: Updated to use new data attribute and CSS variable syntax

### Sprint 1.75 - Runner & Cashier Enhancements ✅
- [x] **Invoice ID System**: Unique invoice ID generated after order submission
- [x] **Barcode Scanner**: html5-qrcode integration for product lookup
- [x] **Cashier Sidebar**: SPA navigation with Pending/Success Orders menus
- [x] **Pending Orders Pagination**: 6 orders per page with navigation
- [x] **Success Order History**: View and print completed orders
- [x] **Invoice Printing**: Print receipts for completed transactions

---

## 🚀 Upcoming Sprint Roadmap

### Sprint 2 - Mobile & Hardware Integration

**Goal**: Enable portable hardware support and optimize for mobile devices.

#### Features & Implementation Steps:

**1. Bluetooth Thermal Printer Support** 🖨️
- [ ] Research Web Bluetooth API compatibility
- [ ] Create printer connection manager component
- [ ] Implement ESC/POS command protocol for receipt formatting
- [ ] Design receipt template (header, items, total, footer)
- [ ] Add "Print Receipt" button to cashier success orders
- [ ] Test with common thermal printers (Epson TM-series, etc.)

**2. Mobile-Responsive Runner Interface** 📱
- [ ] Audit current Runner page for mobile breakpoints
- [ ] Implement touch-optimized product grid (larger tap targets)
- [ ] Add swipe gestures for cart management
- [ ] Optimize keyboard input for tablet devices
- [ ] Test on various tablet sizes (iPad, Android tablets)

**3. Offline Mode (PWA)** 📴
- [ ] Configure Next.js PWA with service worker
- [ ] Implement IndexedDB for local order queue
- [ ] Create sync mechanism when connection restored
- [ ] Add offline indicator UI
- [ ] Cache product catalog for offline access

**4. Camera-Based Product Lookup** 📷
- [ ] Extend html5-qrcode for continuous scanning mode
- [ ] Add product image matching (optional ML feature)
- [ ] Quick-add buttons for frequently sold items

---

### Sprint 3 - Authentication & Security

**Goal**: Implement user authentication and role-based access control.

#### Features & Implementation Steps:

**1. User Authentication System** 🔐
- [ ] Set up Supabase Auth with email/password
- [ ] Create login page with form validation
- [ ] Implement JWT token handling
- [ ] Add protected route middleware
- [ ] Create user profile storage in database

**2. Runner Identification** 👤
- [ ] Add `runner_id` field to orders table
- [ ] Display runner name on order tickets
- [ ] Create runner assignment at login
- [ ] Track runner performance metrics

**3. Role-Based Access Control** 🛡️
- [ ] Define roles: Admin, Cashier, Runner
- [ ] Create `user_roles` table with permissions
- [ ] Implement role-checking middleware
- [ ] Restrict Admin panel to admin role only
- [ ] Restrict Cashier functions to cashier/admin roles

**4. Session Management** ⏱️
- [ ] Implement session timeout (configurable)
- [ ] Add "Stay logged in" option
- [ ] Create logout functionality
- [ ] Track active sessions per user
- [ ] Implement device management (optional)

---

### Sprint 4 - Analytics & Reporting

**Goal**: Provide business insights through analytics dashboards and reports.

#### Features & Implementation Steps:

**1. Daily Sales Summary** 📊
- [ ] Create `/api/analytics/daily` endpoint
- [ ] Calculate daily revenue, order count, average order value
- [ ] Identify top-selling products
- [ ] Display summary cards on admin dashboard
- [ ] Add date picker for historical data

**2. Sales Analytics Dashboard** �
- [ ] Integrate charting library (Recharts or Chart.js)
- [ ] Create revenue trend line chart (7/30/90 days)
- [ ] Build product category pie chart
- [ ] Add order volume bar chart by hour
- [ ] Implement comparison views (this week vs last week)

**3. Inventory Management** 📦
- [ ] Add stock tracking on order completion
- [ ] Create low-stock alert system (configurable threshold)
- [ ] Build inventory report page
- [ ] Add stock adjustment functionality
- [ ] Implement stock history log

**4. Export Reports** 📄
- [ ] Generate CSV export for transactions
- [ ] Create PDF receipts for accounting
- [ ] Build end-of-day summary report
- [ ] Add scheduled report generation (optional)
- [ ] Implement email report delivery (optional)

**5. Transaction History & Audit Trail** 🔍
- [ ] Create comprehensive transaction log
- [ ] Add search and filter functionality
- [ ] Implement date range queries
- [ ] Track order modifications and cancellations
- [ ] Store payment method details

---

## 📄 License

MIT License
