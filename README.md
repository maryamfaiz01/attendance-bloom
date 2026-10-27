# Attendance Bloom

QR-code student attendance system built for the **Thondaman Vocational Training Centre (TVTC)**. Staff scan student ID cards with a webcam or phone; admins manage students, issue ID cards and export reports.

![Node](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express)
![Tests](https://img.shields.io/badge/tests-14%20passing-brightgreen)

**Live demo:** _add your Render URL here_ · demo login `staff` / `staff123`

## Features

- **QR attendance scanning** using the device camera (`html5-qrcode`) with manual ID fallback
- **Role-based access control** (admin / staff), enforced on the API, not just the UI
- **Secure auth:** bcrypt password hashing, HTTP-only `SameSite=Strict` JWT cookies, login rate limiting, forced password change on first admin login
- **Student ID card creator** with photo upload and printable QR
- **Reports:** filter by date or student, export to CSV
- **HTTPS dev mode** (`npm run dev:https`) so phone cameras work on a local network

## Tech stack

Node.js · Express · JWT · bcryptjs · express-validator · vanilla JS front end · `node:test` + Supertest

## Run locally

```bash
git clone https://github.com/maryamfaiz01/attendance-bloom.git
cd attendance-bloom
cp .env.example .env
npm install
npm start          # http://localhost:3000
npm test           # 14 integration tests
```

Seeded accounts: `admin` / `admin123` (must change on first login) and `staff` / `staff123`.



Step 1: Open the Project in Your Code Editor (VS Code / Antigravity)
Open VS Code (or your code editor).
Click File in the top menu bar ➔ select Open Folder... (or press Ctrl + K, Ctrl + O).
Navigate to:
text
C:\Users\hp\OneDrive\Desktop\Attendance Bloom Student system
Click Select Folder. The project files and folders will appear in your left sidebar.
Step 2: Open the Terminal and Start the Server

Open your terminal:

Inside VS Code: Press Ctrl + (backtick) or go to Terminal > New Terminal.
Or using Windows Command Prompt / PowerShell: Press Win + R, type cmd, and press Enter.

Move into the project folder by copying and pasting this command:

cmd
cd "C:\Users\hp\OneDrive\Desktop\Attendance Bloom Student system"

Start the application:

cmd
node server/server.js

Look for this confirmation in the terminal:


text
===================================================
  Attendance Bloom - Thondaman Vocational Training Centre
  Mode: HTTP
  Local URL:   http://localhost:3000
===================================================

IMPORTANT

Keep this terminal window open while using the application. If you close it, the server turns off.

Step 3: Open the Website in Your Browser
Open Google Chrome or Microsoft Edge.
Type this address in your URL bar and hit Enter:
text
http://localhost:3000/login.html
🔑 Login Credentials
Admin Account:
Username: admin
Password: admin123 (will ask to set a new password on first login)
Staff Account:
Username: staff
Password: staff123

NOTE

If you instead wanted to open the Java Employee Management System, navigate to C:\Users\hp\OneDrive\Desktop\Employee Management and run run.bat.

## Project structure

```
server/   Express app, routes (auth, students, attendance, settings), middleware, tests
public/   Static front end (dashboard, scanner, cards, reports)
docs/     Wireframes
```

## Roadmap

- [ ] Replace JSON store with PostgreSQL
- [ ] Per-class attendance analytics dashboard
- [ ] Parent notification (SMS/WhatsApp) on absence

