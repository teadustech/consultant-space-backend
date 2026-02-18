# consultant-space-backend
The backend code of the consultant-space website. This repository contains the backend for "consultant-space" — Your Go-To Experts.

## Tech Stack
- Backend: Node.js with Express
- Database: MongoDB

## Getting Started

1. **Install dependencies**
   ```bash
   cd consultant-space-backend
   npm install
   ```

2. **Environment variables**  
   Copy `.env.example` to `.env` and set at least:
   - `MONGODB_URI` (or `MONGO_URI`) – MongoDB connection string (default: `mongodb://localhost:27017/go-to-experts`)
   - `JWT_SECRET` – Secret for JWT auth (required for login/register)

   Optional: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` for payments; `EMAIL_*` for password reset; see `.env.example`.

3. **Run the server**
   ```bash
   npm start
   ```
   API runs at **http://localhost:5000** (or set `PORT` in `.env`).

**Note:** If Razorpay keys are not set, the server still starts; payment routes will return an error until you add them.

## Admin login (first-time setup)

Admin users are **not** created via the website; you create the first one with a script.

1. **Create the first admin** (one-time, from the backend folder):
   ```bash
   node scripts/setup-admin.js
   ```
2. **Optional:** set in `.env` before running the script:
   - `ADMIN_EMAIL` – admin login email (default: `admin@consultantspace.com`)
   - `ADMIN_PASSWORD` – admin password (default: `Admin@123`)
   - `ADMIN_FULLNAME` – display name (default: `Super Admin`)
3. **Log in on the site:** open **/admin/login** (e.g. `http://localhost:3000/admin/login`), use the email and password from step 1–2.
4. **Change the default password** after first login if you used the default.

To add more admins later, log in as a super_admin and use the Admin → Manage Admins section (or the API).

