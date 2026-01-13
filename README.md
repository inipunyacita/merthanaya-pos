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

### Upcoming (Sprint 2-4)
- [ ] Barcode scanner integration (html5-qrcode)
- [ ] Bluetooth thermal printer support
- [ ] User authentication (Runner identification)
- [ ] Sales analytics & reporting

## 📄 License

MIT License
# merthanaya-pos
