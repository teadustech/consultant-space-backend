# Backend Audit Report — consultant-space-backend

Audit date: Based on current codebase state.  
**Update:** Critical and medium issues below have been fixed.

---

## Critical issues (FIXED)

### 1. Unprotected seeker routes (security) — FIXED

**File:** `routes/auth.js`

Previously these routes had **no authentication**:

| Route | Issue |
|-------|--------|
| `GET /api/seekers/all` | Returns all seekers (with passwords excluded). Anyone can list every seeker. |
| `GET /api/seekers/:id/profile` | Returns any seeker’s profile by ID. No ownership check. |
| `PUT /api/seekers/:id/profile` | Updates any seeker’s fullName, email, phone by ID. No auth; anyone can change any seeker. |

**Fix applied:** All three routes now use `authenticateToken`. `GET /seekers/all` requires admin (`requireAdmin`). `GET` and `PUT /seekers/:id/profile` use `requireSeekerOwnProfileOrAdmin` (seeker can only access own id, admin can access any).

---

### 2. Razorpay webhook signature verification (security / correctness) — FIXED

**File:** `routes/payments.js` (webhook handler around line 225)

- The app uses **global** `app.use(express.json())` in `index.js`, so the request body is parsed as JSON **before** it reaches the payment routes.
- The webhook then uses `req.body` (a parsed **object**) in the HMAC:  
  `crypto.createHmac('sha256', webhookSecret).update(req.body).digest('hex')`.
- Razorpay signs the **raw request body** (string). Hashing the parsed object will not match Razorpay’s signature, so verification will fail or be inconsistent.
- If `RAZORPAY_WEBHOOK_SECRET` is missing, `webhookSecret` is `undefined` and `createHmac('sha256', undefined)` can throw.

**Fix applied:** In `index.js`, `express.json()` now uses a `verify` callback that stores the raw body in `req.rawBody` for `/api/payments/webhook`. The webhook handler uses `req.rawBody` for HMAC verification and parses it for payload. `RAZORPAY_WEBHOOK_SECRET` is checked; if missing, the handler returns 503.

---

### 3. JWT_SECRET undefined at runtime — FIXED

**Files:** `middleware/auth.js`, `middleware/adminAuth.js`, `routes/auth.js`, `routes/consultants.js`, `routes/admin.js`

- `jwt.sign()` and `jwt.verify()` use `process.env.JWT_SECRET` with no check.
- If `JWT_SECRET` is not set (e.g. missing from `.env`), `jwt.sign(..., undefined, ...)` can throw and break login/register/admin login.

**Fix applied:** In `index.js`, after `dotenv.config()`, the app checks that `JWT_SECRET` is set and at least 16 characters; otherwise it logs a fatal message and exits with `process.exit(1)`.

---

## Medium / low issues

### 4. Email service used without checking env — FIXED

**File:** `utils/emailService.js`

- `createTransporter()` uses `process.env.EMAIL_USER` and `process.env.EMAIL_PASSWORD`.
- If they are missing, Nodemailer may throw or fail when sending (e.g. on forgot-password).

**Recommendation:** Before sending, check that `EMAIL_USER` and `EMAIL_PASSWORD` are set; if not, return a clear error or skip sending and log, and return a user-friendly message from the route (e.g. “Email not configured”).

---

### 5. Google Meet service

**File:** `utils/googleMeetService.js`

- Constructor calls `initializeCalendar()` which uses `process.env.GOOGLE_APPLICATION_CREDENTIALS`.
- Already wrapped in try/catch and sets `this.calendar = null` on failure; `createMeetingLink` checks for null. No change required for stability; optional to log that Google Meet is disabled when env is missing.

---

### 6. Admin login attempt counter (consistency)

**File:** `models/Admin.js` — `incLoginAttempts()`

- Uses `this.loginAttempts` in memory to decide whether to lock, but updates the DB with `updateOne()`. The in-memory `admin` document is not refreshed.
- Locking still works on the next request because the DB has the updated `lockUntil` / `loginAttempts`. Only a theoretical inconsistency within the same request.

**Recommendation:** Optional: after `incLoginAttempts()`, reload the admin from the DB before checking `isLocked()` in the same request, or derive lock from the updated document.

---

## What looks good

- **paymentService.js:** Razorpay is only initialized when credentials exist; `ensureRazorpay()` used before payment operations; server can start without Razorpay.
- **MongoDB:** Connection uses `MONGODB_URI` or `MONGO_URI` with a sensible default; no deprecated options in current `index.js`.
- **Consultant & Seeker models:** Both have `resetPasswordToken` and `resetPasswordExpires` for password reset.
- **Admin model:** Has `comparePassword`, `isLocked`, `incLoginAttempts`, `resetLoginAttempts`; admin auth and lock logic are consistent.
- **Auth routes:** Login, register, forgot-password, reset-password have basic validation and error handling.
- **Bookings:** Validation (express-validator), consultant/seeker checks, and date/time checks are in place.
- **CORS:** Configured with env-based origins for production.
- **Security headers:** Helmet and custom headers applied.
- **Linting:** No linter errors reported for the backend folder.

---

## Summary

| Severity   | Count | Status |
|-----------|--------|--------|
| Critical  | 3     | Fixed: seeker routes protected, webhook raw body + secret check, JWT_SECRET validation. |
| Medium/Low| 1     | Fixed: email env check. Admin lock consistency remains optional. |

All critical and medium items from the audit have been addressed.
