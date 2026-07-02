# Topics Used in Consultant-Space-Backend

Interview prep reference for Node.js/Express concepts used in this project.

---

## Topic: Callback Functions

**Intro:** A callback is a function passed as an argument to another function. It runs after some operation completes (e.g. async I/O). Node.js uses callbacks heavily for non-blocking behavior.

**Used:**  
- **Route handlers:** Express handlers like `(req, res) => { ... }` are callbacks passed to `app.get()`, `app.post()`, etc.  
- **JWT verification:** In `middleware/auth.js`, `jwt.verify(token, secret, (err, user) => { ... })` uses a callback that runs when verification finishes; it checks `err`, sets `req.user`, and calls `next()`.  
- **Mongoose:** In `index.js`, `mongoose.connect(uri).then(...).catch(...)` uses promise-style callbacks. In `models/Seeker.js`, `seekerSchema.pre('save', function(next) { ...; next(); })` uses a callback with `next` to run logic before saving.  
- **Body parser:** In `index.js`, `express.json({ verify: (req, res, buf) => { ... } })` uses a callback to capture the raw body for webhook signature verification.

**Interview answer:**  
"We use callbacks for async work: Express route handlers, JWT verify, and Mongoose pre-save hooks. For example, `jwt.verify` takes a callback that runs when verification is done; we check for errors and attach the user to the request before calling `next()`."

---

## Topic: Arrow Functions

**Intro:** Arrow functions (`() => {}`) are a short way to write functions. They keep the surrounding `this` and are often used for callbacks and short handlers.

**Used:**  
- **Routes:** Handlers are arrow functions, e.g. `app.get("/", (req, res) => { res.json({ ... }); })` in `index.js`.  
- **Middleware:** `authenticateToken`, `requireConsultant`, etc. in `middleware/auth.js` are defined as `(req, res, next) => { ... }`.  
- **Inline logic:** In `index.js`, `productionOrigins` uses `() =>`, and `.map(s => s.trim())` and `.filter(Boolean)` use arrow functions.  
- **Async route handlers:** Routes in `routes/auth.js`, `routes/bookings.js`, etc. use `async (req, res) => { ... }` for async logic.

**Interview answer:**  
"We use arrow functions for route handlers, middleware, and small helpers. They keep the code short and we don’t need to rebind `this`. For example, all our auth middleware and route handlers are arrow functions."

---

## Topic: Destructuring

**Intro:** Destructuring pulls values out of objects or arrays into variables in one step. It makes code clearer and avoids repeated `obj.property` access.

**Used:**  
- **Imports:** `const { securityHeaders, customSecurityHeaders } = require('./middleware/securityHeaders')` in `index.js`; `const { body, validationResult } = require('express-validator')` in routes.  
- **Request data:** In `routes/auth.js`, `const { fullName, email, phone, password } = req.body` and `const { email, userType } = req.body`. In `routes/payments.js`, `const { bookingId } = req.body` and `const { orderId, paymentId, signature } = req.body`.  
- **Params/query:** e.g. `const { consultantId } = req.params` and `const { startDate, endDate } = req.query` in `routes/bookings.js`.

**Interview answer:**  
"We use destructuring for require statements, `req.body`, `req.params`, and `req.query` so we get only the fields we need. For example, we do `const { email, password, userType } = req.body` instead of using `req.body.email` everywhere."

---

## Topic: Filter and Find Methods

**Intro:**  
- **Array `filter`:** Returns a new array with only elements that pass a test function.  
- **Find:** On arrays, `find()` returns the first matching element; in Mongoose, `Model.find()` returns documents that match a query.

**Used:**  
- **Array filter:** In `index.js`, `process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)` uses `filter(Boolean)` to drop empty strings after splitting and trimming.  
- **Mongoose find:** Used across the app: `Consultant.find(searchCriteria)`, `Seeker.find({})`, `Booking.find(filter)`, `Booking.findById(id)`, `Admin.findOne({ email })`, etc. in `routes/consultants.js`, `routes/auth.js`, `routes/bookings.js`, `routes/admin.js`, and `models/Booking.js`.

**Interview answer:**  
"We use array `filter` when building the allowed CORS origins to remove empty entries. We use Mongoose `find` and `findOne`/`findById` everywhere we query the database—consultants, seekers, bookings, admins—to get lists or single documents by criteria."

---

## Topic: Promises

**Intro:** Promises represent a value (or error) that will be available later. They support `.then()` and `.catch()` and work with `async/await` for readable async code.

**Used:**  
- **Mongoose:** In `index.js`, `mongoose.connect(mongoUri).then(() => { app.listen(port); }).catch((err) => { ... })` so the server starts only after DB connection.  
- **Async/await:** Most route handlers are `async (req, res) => { ... }` and use `await` for DB and services: e.g. `await Consultant.findOne(...)`, `await bcrypt.hash(...)`, `await booking.save()`, `await emailService.sendMeetingConfirmation(...)` in `routes/auth.js`, `routes/bookings.js`, `routes/payments.js`, etc.  
- **Libraries:** Razorpay, Nodemailer, and Google APIs are used with `await` (they return promises).

**Interview answer:**  
"We use promises via async/await in route handlers for all DB and external service calls. We also use `.then()/.catch()` for the MongoDB connection in `index.js` so the server listens only after a successful connection. That keeps startup sequential and error handling clear."

---

## Topic: Hoisting

**Intro:** Hoisting is when the JavaScript engine moves declarations to the top of their scope. `function` declarations are fully hoisted (name and body), so you can call them before the line they’re written on. `var` is hoisted but not initialized until its line runs.

**Used:**  
- **Function declarations:** In `scripts/setup-admin.js`, `async function setupAdmin() { ... }`; in `routes/payments.js`, `async function handlePaymentSuccess(webhookData)`, `handlePaymentFailure`, `handleRefundProcessed`; in `utils/emailService.js`, `function isEmailConfigured()`; in `utils/paymentService.js`, `function ensureRazorpay()`. These are all hoisted, so they can be defined after they’re referenced in the same scope.

**Interview answer:**  
"We use regular function declarations for helpers and webhook handlers (e.g. `async function handlePaymentSuccess`). Those are hoisted, so the function name is available for the whole scope. We use them where we want a named, reusable function rather than an inline arrow function."

---

## Topic: JWT Token Flow

**Intro:** JWTs (JSON Web Tokens) are used for stateless auth. The server signs a token (with user id, type, etc.) on login; the client sends it (e.g. in the `Authorization` header); the server verifies it and trusts the payload.

**Used:**  
- **Signing:** In `routes/auth.js` and `routes/consultants.js`, after successful login/register we call `jwt.sign({ userId, userType, email }, process.env.JWT_SECRET, { expiresIn: '7d' })` and send the token in the response. Same idea in `routes/admin.js` for admin login.  
- **Verification:** In `middleware/auth.js`, `authenticateToken` reads `Authorization: Bearer <token>`, then calls `jwt.verify(token, process.env.JWT_SECRET, (err, user) => { ... })`. If valid, it sets `req.user` and calls `next()`.  
- **Protection:** Routes that need auth use `authenticateToken` (and sometimes `requireConsultant`/`requireSeeker`). Admin routes use similar middleware in `middleware/adminAuth.js` with a separate admin JWT.

**Interview answer:**  
"On login or register we create a JWT with `jwt.sign` (userId, userType, expiry) and return it to the client. The client sends it as `Authorization: Bearer <token>`. Our `authenticateToken` middleware verifies it with `jwt.verify` and attaches the payload to `req.user`. Protected routes use this middleware so only valid tokens get access."

---

## Topic: Event Emitter

**Intro:** Node’s `EventEmitter` lets objects emit named events and other code subscribe with `.on()`. Many Node APIs (e.g. `http.Server`, streams) are built on it. You use it when you want custom event-driven behavior.

**Used:**  
**Not used in this codebase.** We don’t require `events` or use `EventEmitter`, `.on()`, or `.emit()` for app logic. Express and Mongoose use events internally, but we don’t add our own emitters.

**Interview answer:**  
"We didn’t need a custom EventEmitter in this project. Auth is JWT-based and flow is request/response and async/await. If the interviewer asks, I’d say we rely on Express and Mongoose’s built-in events rather than implementing our own event emitter."

---

## Topic: Event Loop

**Intro:** The event loop is what lets Node.js do non-blocking I/O. It runs in a single thread, takes callbacks from a queue, and runs them when I/O or timers complete. All async code (callbacks, promises, async/await) eventually runs via the event loop.

**Used:**  
The whole app runs on the event loop: every incoming HTTP request is handled asynchronously; every `await` (DB, Razorpay, email, Google API) yields to the loop until the promise resolves; middleware and route callbacks are scheduled on the loop. We don’t reference the event loop in code—it’s the runtime model Node uses.

**Interview answer:**  
"Our API is built on the event loop. When a request comes in, Express schedules our handler; when we `await` MongoDB or external APIs, execution pauses and the loop can process other requests. So we get concurrency without threads. I don’t touch the event loop directly; I just write async code and let Node handle scheduling."

---

*Good luck with your interview.*
