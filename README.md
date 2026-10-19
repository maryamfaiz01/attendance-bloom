---
title: Attendance Bloom Student System
emoji: 🎓
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# Student Attendance Management System

Production-quality full-stack web application built for the **Thondaman Vocational Training Centre (TVTC)**. It features real-time QR code camera scanning, student profile administration, role-based authentication, and automated attendance logging.

---

## 🌟 Key Features

- 🔒 **Secure Authentication**: Node.js + Express backend with `bcryptjs` password hashing and HTTP-Only, `SameSite=Strict` JWT session cookies.
- 🔑 **Forced Password Reset**: Default seeded admin account is forced to change password on first login (`mustChangePassword` flag).
- 🛡️ **Brute-Force Protection**: Rate limiting on login attempts via `express-rate-limit`.
- 🪪 **QR Code Attendance Scanning**: Real-time webcam scanning via `html5-qrcode` library + manual student ID entry fallback.
- 📱 **Mobile LAN Camera Support (HTTPS Mode)**: Auto-generated SSL certificates for testing webcam QR scanning over local Wi-Fi / LAN IP.
- 📊 **Live Reports & CSV Export**: Filter attendance logs by date or student ID and export reports in CSV format.
- 🎨 **Modern Responsive UI**: Clean navy dark mode design system matching TVTC branding with Lucide icons and custom toast notifications.
- 💾 **Database Persistence**: Student profiles, user accounts, and attendance logs are saved in a local zero-config database file (`server/db/database.json`).

---

## 📂 Project Structure

```
System Group Project/
├── server/
│   ├── server.js               # Express server entry point (HTTP & HTTPS support)
│   ├── certHelper.js           # SSL Certificate generator for local HTTPS dev mode
│   ├── db/
│   │   ├── database.js         # Persistent database helper
│   │   └── seed.js             # DB seeder (Admin, Staff, Demo Students)
│   ├── middleware/
│   │   ├── auth.js             # JWT verification & RBAC middleware
│   │   ├── rateLimiter.js      # Login rate limiter
│   │   └── validation.js       # Input validation & sanitization
│   ├── routes/
│   │   ├── auth.js             # Auth endpoints (/login, /logout, /change-password, /me)
│   │   ├── students.js         # Student profile CRUD endpoints (/api/students)
│   │   └── attendance.js       # Attendance scan & log endpoints (/api/attendance)
│   └── tests/
│       ├── auth.test.js        # Auth API unit & integration tests
│       ├── attendance.test.js  # Attendance API unit & integration tests
│       └── students.test.js    # Student CRUD & edit unit tests
├── public/
│   ├── index.html              # Dashboard page
│   ├── login.html              # Sign in page
│   ├── admin.html              # Admin site
│   ├── attendance.html         # QR scanner terminal
│   ├── cards.html              # Student profile card directory
│   ├── create-card.html        # Student ID Card creator & editor
│   ├── summary.html            # Attendance log reports
│   ├── change-password.html    # Password change page
│   ├── css/
│   │   ├── style.css           # Global design system & layout
│   │   └── components.css      # Toasts, badges, tables, scanner styles
│   ├── js/
│   │   ├── app.js              # Session check, navbar, toasts, logout
│   │   ├── login.js            # Login form logic
│   │   ├── attendance.js       # QR scanner & manual submission
│   │   ├── cards.js            # Student card directory & QR modal
│   │   ├── summary.js          # Reports table & CSV export
│   │   └── admin.js            # Password change logic
│   └── assets/
│       ├── images/             # TVTC branding logo
│       └── students/           # Student profile pictures
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 🚀 Setup & Running Instructions

### 1. Installation

Install Node.js dependencies:

```bash
npm install
```

### 2. Environment Configuration

Ensure a `.env` file exists (copied from `.env.example`):

```env
PORT=3000
JWT_SECRET=super-secret-tvtc-attendance-key-change-in-production!
DB_PATH=./server/db/database.sqlite
NODE_ENV=development
```

### 3. Database Seeding

Seed default admin/staff accounts and initial student profiles:

```bash
npm run seed
```

### 4. Running the Application

- **Standard HTTP Mode (Local Development)**:
  ```bash
  npm start
  ```
  Open `http://localhost:3000` in your browser.

- **HTTPS Dev Mode (Recommended for Mobile LAN Camera Scanning)**:
  ```bash
  npm run dev:https
  ```
  Generates a local self-signed SSL certificate automatically. Open `https://<YOUR_LAN_IP>:3000` on your mobile device to test live camera QR scanning over local Wi-Fi.

---

## 🔑 Default Credentials

> [!IMPORTANT]
> Upon first launch, the system automatically seeds default accounts:

| Username | Default Password | Role  | Action Required on First Login |
| :--- | :--- | :--- | :--- |
| `admin` | `admin123` | Admin | ⚠️ Forced password change required on first login |
| `staff` | `staff123` | Staff | Access scanner & reports |

---

## 🧪 Running Automated Tests

Run the automated test suite powered by Node's native test runner and Supertest:

```bash
npm test
```

---

## 🛠️ Troubleshooting

### 1. Camera Access Blocked on Mobile / LAN IP
- **Problem**: Modern mobile web browsers (iOS Safari, Android Chrome) block camera access when connecting over unencrypted `http://192.168.x.x:3000` because HTTP is considered an insecure context.
- **Solution**: Start the server in HTTPS mode using:
  ```bash
  npm run dev:https
  ```
  Navigate to `https://<LAN_IP>:3000` on your mobile phone, accept the self-signed certificate warning, and camera access will function. Alternatively, use the **Manual Student ID Entry** form built into the attendance page.

### 2. Port Conflict (`EADDRINUSE`)
- **Problem**: Port 3000 is already in use by another application.
- **Solution**: The server catches port conflicts cleanly and displays a friendly notice. Update the `PORT` variable in your `.env` file (e.g., `PORT=3001`) or terminate the existing process using port 3000.

### 3. Account Recovery / Reset Admin Password (`npm run reset-admin`)
- **Problem**: You forgot your admin username or password and are locked out of your local instance.
- **Solution**: Run the CLI account recovery script anytime from your terminal:
  ```bash
  npm run reset-admin
  ```
  This command finds (or creates) the administrator account, resets the username to `admin` and temporary password to `admin123`, and sets `mustChangePassword = 1` so you are forced to choose a new password on your next login.

