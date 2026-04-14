# SHNOOR HRMS

A full-stack Human Resource Management System built for SHNOOR International LLC. Designed to handle everything from employee onboarding to payroll, attendance, leaves, and internal communication — all in one platform.

---

## What it does

SHNOOR HRMS is a multi-tenant SaaS platform where one installation serves multiple companies. Each company gets its own isolated data, with three user roles:

- **Super Admin** — SHNOOR platform owner. Manages companies, subscriptions, and the public landing page.
- **Manager** — Company owner or HR admin. Manages employees, approves leaves, handles payroll, and communicates with staff.
- **Employee** — Company staff. Clocks in and out, applies for leaves, submits expenses, views salary, and chats with their manager.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4 |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Auth | JWT (JSON Web Tokens) |
| Email | Nodemailer + Gmail SMTP |

---

## Project Structure
```
shnoor-hrms/
├── hrms-frontend/
│   └── src/
│       ├── context/
│       ├── layouts/
│       ├── pages/
│       ├── services/
│       ├── components/
│       └── hooks/
│
├── hrms-backend/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       └── routes/
│
├── schema.sql
├── seed.sql
├── README.md
└── SETUP.md
```
---

## Features

**Super Admin Panel**
- Manage companies and assign subscription plans
- View auto-generated transaction history
- Manage superadmin and manager accounts
- Edit landing page content including hero section, CTA, contact info, footer, and logo
- View and respond to contact queries from the landing page

**Manager Panel**
- Full employee management including create, edit, and deactivate
- Approve or reject leave requests
- Mark and track attendance for employees
- Approve or reject expense claims
- Set salary structure for each employee
- Generate HR letters such as offer, warning, and termination letters
- Manage offboarding requests and complaints
- Manage company holidays and policies
- Real-time chat with employees

**Employee Panel**
- Clock in and clock out once per day
- Apply for leaves and track approval status
- Submit expense claims
- View salary structure and payslips
- View company holidays and policies
- Chat with manager
- View HR letters issued by the company

---

## Setup

See [SETUP.md](./SETUP.md) for complete step-by-step instructions.

---

## Default Login

After completing setup, open your browser and go to:

http://localhost:5173

Log in with:

Email:    admin@shnoor.com
Password: admin123
