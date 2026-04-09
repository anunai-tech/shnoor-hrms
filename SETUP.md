# SHNOOR HRMS — Setup Guide

## Prerequisites

- Node.js v18+
- PostgreSQL 14+
- Git

## Step 1 — Clone the repo

```cmd
git clone https://github.com/anunai-tech/shnoor-hrms.git
cd shnoor-hrms
```

## Step 2 — Backend Setup

```cmd
cd hrms-backend
npm install
```

Copy `.env.example` to `.env` and fill in your values:
```cmd
copy .env.example .env
```

Edit `.env` with your own PostgreSQL password and other values.

## Step 3 — Database Setup

1. Open pgAdmin
2. Create a new database called `hrms_db`
3. Open Query Tool
4. Run `schema.sql` (copy paste entire file and execute)
5. Run `seed.sql` (copy paste entire file and execute)
6. Generate bcrypt hash for superadmin password:

```cmd
node -e "const b = require('bcryptjs'); b.hash('admin123', 10).then(h => console.log(h))"
```

7. Copy the hash and update seed.sql superadmin INSERT, then run it.

## Step 4 — Frontend Setup

```cmd
cd ../hrms-frontend
npm install
```

## Step 5 — Run the project

Terminal 1 — Backend:
```cmd
cd hrms-backend
npm run dev
```

Terminal 2 — Frontend:
```cmd
cd hrms-frontend
npm run dev
```

Open `http://localhost:5173`

Login: `admin@shnoor.com` / `admin123`