# SHNOOR HRMS — Developer Setup Guide

Follow these steps exactly to get the project running on your machine.

---

## Prerequisites

Make sure you have all of these installed before starting:

- [Node.js v18+](https://nodejs.org) — download the LTS version
- [PostgreSQL 14+](https://www.postgresql.org/download/windows/) — remember the password you set during install
- [Git](https://git-scm.com/download/win) — keep all default settings during install
- [pgAdmin 4](https://www.pgadmin.org/download/) — comes with PostgreSQL installer

To verify your installs, open CMD and run:
```cmd
node --version
npm --version
git --version
```

---

## Step 1 — Get access to the repo

Send your GitHub username to the project lead. Wait for a collaboration invite in your email, then accept it.

---

## Step 2 — Clone the project

Open CMD, navigate to where you want to save the project, then run:

```cmd
git clone https://github.com/anunai-tech/shnoor-hrms.git
cd shnoor-hrms
```

---

## Step 3 — Set up the backend

```cmd
cd hrms-backend
npm install
```

Create your environment file:
```cmd
copy .env.example .env
```

Open `.env` in VS Code and fill in your values. The project lead will send you the actual values privately — never share these or commit this file.

---

## Step 4 — Set up the database

1. Open **pgAdmin 4**
2. In the left panel, right-click **Databases** → **Create** → **Database**
3. Name it `hrms_db` and click Save
4. Click on `hrms_db` to expand it, then right-click and open **Query Tool**
5. Open the file `hrms-backend/schema.sql` from the project folder
6. Select all the content, paste it into the Query Tool, and press **F5** to run
7. Now open `hrms-backend/seed.sql` — but before running it, you need to generate a password hash first

**Generate the superadmin password hash:**

Open a new CMD window, navigate to `hrms-backend`, and run:
```cmd
node -e "const b = require('bcryptjs'); b.hash('admin123', 10).then(h => console.log(h))"
```

Copy the output (it starts with `$2b$`), then open `seed.sql` and replace `REPLACE_WITH_BCRYPT_HASH` with your copied hash. Then paste the full `seed.sql` content into pgAdmin Query Tool and press **F5**.

---

## Step 5 — Set up the frontend

Open a new CMD window:
```cmd
cd hrms-frontend
npm install
```

---

## Step 6 — Run the project

You need two CMD windows running at the same time.

**Terminal 1 — Backend:**
```cmd
cd hrms-backend
npm run dev
```
You should see: `SHNOOR HRMS Server running on http://localhost:5000`

**Terminal 2 — Frontend:**
```cmd
cd hrms-frontend
npm run dev
```
You should see: `Local: http://localhost:5173`

Open your browser and go to `http://localhost:5173`

**Default login:**
Email:    admin@shnoor.com
Password: admin123
---

## ⚠️ Git Rules — Read Before You Touch Anything

This project uses a branch-based workflow. Breaking these rules will cause problems for the entire team.

**Never push directly to `main`.** Main is the stable production branch. Your code must go through a branch and a pull request first.

**Every feature or fix gets its own branch.** Always start from an updated main:

```cmd
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

**Save and push your work regularly:**
```cmd
git add .
git commit -m "feat: describe what you did"
git push origin feature/your-feature-name
```

**Raise a Pull Request when done:**
1. Go to `https://github.com/anunai-tech/shnoor-hrms`
2. Click **Compare & pull request**
3. Write a short description of your changes
4. Click **Create pull request**
5. Message the project lead — they will review and merge

**Only the project lead merges PRs.** Do not merge your own PR.

---

## Common Issues

**Backend not starting — MODULE_NOT_FOUND**
Make sure you ran `npm install` inside `hrms-backend`.

**Database connection error**
Check that PostgreSQL is running and your `.env` DB password matches what you set during PostgreSQL install.

**401 Unauthorized errors**
Log out and log back in to get a fresh JWT token.

**PowerShell execution policy error**
Always use CMD, not PowerShell, for running commands in this project.