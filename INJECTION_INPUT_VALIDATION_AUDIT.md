# Deep Injection & Input Validation Security Audit
## Comprehensive Analysis of Injection Vectors & Weak Validation

**Date**: May 9, 2026  
**Scope**: Full-stack injection and input-validation assessment  
**Mode**: Read-only audit (no code modifications)

---

## Executive Summary

**Overall Assessment**: ✅ **SECURE** with **3 LIKELY** and **2 UNVERIFIED** findings

The application demonstrates **strong input validation** fundamentals with:
- ✅ Express-validator on all routes (field type enforcement)
- ✅ Mongoose schema validation (enum, minlength, required constraints)
- ✅ Whitelist-based sorting (only allowed fields accepted)
- ✅ Ownership checks preventing horizontal privilege escalation
- ✅ mongoSanitize middleware stripping $ and . from all inputs
- ⚠️ 3 potential injection vectors identified (low-to-medium confidence)

**No SQL injection** (Node.js app, not SQL)  
**No critical XSS** (backend API, no template injection)  
**No command injection** (no shell execution patterns found)  
**No path traversal** (no file operations with user input)  

---

## Findings by Category

### 1. NoSQL INJECTION ⚠️ LIKELY

#### Finding #1A: $regex Query Without Escape

**File**: [backend/src/services/customerService.js](backend/src/services/customerService.js#L64-L72)

**Confidence**: 🟠 **LIKELY** (mongoSanitize mitigates, but pattern is not best practice)

**Vulnerable Code**:
```javascript
const users = await User.find({
  $or: [
    { name:  { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } },
  ],
}).select('_id');
```

**How It Can Be Abused**:

1. **Regex DoS Attack**: Attacker sends `search=a*a*a*a*a*a*a*b` (catastrophic backtracking)
   - Database CPU spikes to 100%
   - Query hangs indefinitely
   - Service denial of service

2. **Regex-Based Data Leakage** (lower severity):
   - Attacker sends `search=^admin.*$` to search for users starting with "admin"
   - Combined with timing attacks, could leak partial data

**Validation Status**:
```javascript
query('search').optional().trim().isString()  // ← Only checks type, not length
```
- ✅ **trim()** removes leading/trailing whitespace
- ✅ **isString()** enforces type
- ❌ **No maximum length** enforced
- ❌ **No regex escape** applied before $regex operator

**mongoSanitize Mitigation**: 
```javascript
// mongoSanitize runs BEFORE this controller
// It strips $ and . from req.query
// So req.query.search = "admin.*" → "admin.*" (no $ to strip)
// ✅ DOES NOT protect against regex DoS
```

**Severity**: 🟠 **MEDIUM** (Regex DoS can crash database)

**Attack Flow**:
```
1. Admin calls GET /api/v1/customers?search=a*a*a*a*a*a*a*b
2. express-validator validates: search.isString() ✅ passes
3. mongoSanitize checks: No $ or . found ✅ passes
4. Customer service runs: User.find({ name: { $regex: "a*a*a*a*a*a*a*b", ... } })
5. MongoDB regex engine attempts catastrophic backtracking
6. CPU spikes, query times out → Service unavailable ❌
```

**Fix Guidance**:
```javascript
// Escape regex special characters before using in $regex
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const escapedSearch = escapeRegex(search);
const users = await User.find({
  $or: [
    { name:  { $regex: escapedSearch, $options: 'i' } },
    { email: { $regex: escapedSearch, $options: 'i' } },
  ],
}).select('_id');
```

**Best Practice**:
```javascript
// OR: Add maximum length constraint to route validation
query('search')
  .optional()
  .trim()
  .isString()
  .isLength({ max: 50 })  // ← Prevent overly long regexes
```

---

#### Finding #1B: Audit Log Query Parameter Injection

**File**: [backend/src/controllers/auditController.js](backend/src/controllers/auditController.js#L1-L23)

**Confidence**: 🟠 **LIKELY** (Depends on MongoDB field names, but pattern is weak)

**Vulnerable Code**:
```javascript
const getLogs = async (req, res, next) => {
  const { action, actor, startDate, endDate, page = 1, limit = 50 } = req.query;
  const query = {};
  if (action) query.action = action;           // ← Direct assignment, no enum check
  if (actor)  query.actor  = actor;            // ← Can be any string, including regex
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate)   query.createdAt.$lte = new Date(endDate);
  }
  const logs = await AuditLog.find(query).populate('actor', 'name email');
};
```

**Route Validation**:
```javascript
query('action').optional().trim().isString(),
query('actor').optional().trim().isString(),
```

**Problems**:
1. ❌ **action** has no enum validation (allowed values: CUSTOMER_CREATED, LOGIN, etc.)
2. ❌ **actor** accepts any string - not validated as MongoDB ObjectId
3. ❌ If attacker sends `actor={"$ne":""}`, it bypasses the ObjectId validation

**How It Can Be Abused**:

**Scenario 1: Filter Bypass**
```
GET /api/v1/audit-logs?action=HACK&actor={"$ne":""}
Query becomes: { action: "HACK", actor: { $ne: "" } }
Returns all logs where actor field exists (any actor) ✅ Access control bypass
```

**Scenario 2: Information Disclosure**
```
GET /api/v1/audit-logs?action=CUSTOMER_DELETED&actor=admin
Without enum validation, custom actions like SENSITIVE_OPERATION are searchable
```

**Severity**: 🟠 **MEDIUM** (Information disclosure + filter bypass)

**mongoSanitize Status**: ✅ **Protected**
```javascript
// mongoSanitize runs first
// Input: actor={"$ne":""}
// Output: actor="ne:" ($ stripped, . stripped)
// Protected from $ne operator injection ✅
```

**However**, the direct string assignment to **action** field still allows unvalidated searches.

**Fix Guidance**:
```javascript
// 1. Define allowed actions (enum)
const ALLOWED_ACTIONS = [
  'CUSTOMER_CREATED', 'CUSTOMER_UPDATED', 'CUSTOMER_DELETED',
  'TRANSACTION_CREATED', 'TRANSACTION_VOIDED',
  'LOGIN', 'LOGOUT', 'PASSWORD_CHANGED',
  // ... etc
];

// 2. Validate action is in enum
if (action && !ALLOWED_ACTIONS.includes(action)) {
  return sendError(res, 'Invalid action', 400);
}

// 3. Validate actor is a valid MongoDB ObjectId
const query = {};
if (action) query.action = action;
if (actor) {
  if (!mongoose.Types.ObjectId.isValid(actor)) {
    return sendError(res, 'Invalid actor ID', 400);
  }
  query.actor = new mongoose.Types.ObjectId(actor);
}
```

---

### 2. UNSAFE DATE PARSING ⚠️ UNVERIFIED

#### Finding #2: new Date() Without Validation

**File**: [backend/src/controllers/auditController.js](backend/src/controllers/auditController.js#L13)

**Confidence**: 🟡 **UNVERIFIED** (Depends on MongoDB behavior with invalid dates)

**Vulnerable Code**:
```javascript
if (startDate || endDate) {
  query.createdAt = {};
  if (startDate) query.createdAt.$gte = new Date(startDate);  // ← No validation
  if (endDate)   query.createdAt.$lte = new Date(endDate);    // ← No validation
}
```

**Route Validation**:
```javascript
query('startDate').optional().isISO8601(),
query('endDate').optional().isISO8601(),
```

**Status**: ✅ **Actually Protected** (isISO8601() validates format first)

The express-validator middleware validates ISO8601 format **before** reaching the controller:
- `2026-05-09` ✅ valid
- `invalid-date` ❌ rejected at middleware
- `2026-13-45` ❌ rejected at middleware

**However**, the controller does **not check for Invalid Date objects**:
```javascript
const d = new Date('garbage');  // Invalid Date object
d.getTime();                     // NaN
// MongoDB query with NaN may behave unexpectedly
```

**Risk**: Low (isISO8601 validation prevents this in practice)

**Recommendation**: Consider explicit validation:
```javascript
const parsedStart = new Date(startDate);
if (isNaN(parsedStart.getTime())) {
  return sendError(res, 'Invalid startDate', 400);
}
```

---

### 3. REGEX DoS IN PASSWORD VALIDATION ⚠️ LIKELY

#### Finding #3: Complex Password Regex

**File**: [backend/src/validators/authValidator.js](backend/src/validators/authValidator.js#L44)

**Confidence**: 🟠 **LIKELY** (Pattern is complex but input is length-limited)

**Vulnerable Code**:
```javascript
if (!/[A-Z]/.test(value.newPassword) || 
    !/[a-z]/.test(value.newPassword) || 
    !/[0-9]/.test(value.newPassword) || 
    !/[!@#\$%\^&\*\(\)_\+\-=\[\]{};':"\\|,.<>\/?]/.test(value.newPassword)) {
  errors.push({ ... });
}
```

**Issues**:
1. ❌ **Complex character class**: `[!@#\$%\^&\*\(\)_\+\-=\[\]{};':"\\|,.<>\/?]` is difficult to parse
2. ❌ **Multiple test() calls**: Same password tested 4 times sequentially
3. ✅ **Input length limit**: 12-128 characters (mitigates ReDoS)

**How It Can Be Abused** (Low Risk):

An attacker can't cause catastrophic backtracking due to length limits, but regex is inefficient:
```javascript
// Password: "Aa1!" 
// Test 1: /[A-Z]/.test("Aa1!") → True
// Test 2: /[a-z]/.test("Aa1!") → True
// Test 3: /[0-9]/.test("Aa1!") → True
// Test 4: /[!@#...]/.test("Aa1!") → True
// ✅ 4 full regex scans required (inefficient but not DoS)
```

**Severity**: 🟡 **LOW** (Input length bounded, no catastrophic backtracking possible)

**Fix Guidance**:
```javascript
// Single regex test instead of multiple:
const hasUpperCase = /[A-Z]/.test(value.newPassword);
const hasLowerCase = /[a-z]/.test(value.newPassword);
const hasDigit = /[0-9]/.test(value.newPassword);
const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(value.newPassword);

if (!hasUpperCase || !hasLowerCase || !hasDigit || !hasSpecial) {
  errors.push({ ... });
}
```

---

### 4. REFLECTED XSS ✅ NOT VULNERABLE

**Assessment**: ✅ **SAFE**

**Evidence**:
1. **Backend is API-only** (returns JSON, no HTML rendering)
   ```javascript
   return res.json({ success: false, message: 'Validation failed', errors: [...] });
   ```

2. **No template engine usage** (no EJS, Jade, etc.)
   ```bash
   grep -r "ejs\|jade\|pug" backend/package.json
   # No matches
   ```

3. **No HTML construction from user input**
   ```bash
   grep -r "html\|innerHTML" backend/src/
   # No matches
   ```

4. **Frontend escapes output** (React auto-escapes by default)
   ```javascript
   // React element - automatically escaped
   <div>{userInput}</div>  // ✅ Escaped
   <p>{userProvidedString}</p>  // ✅ Escaped
   ```

---

### 5. COMMAND INJECTION ✅ NOT VULNERABLE

**Assessment**: ✅ **SAFE**

**Evidence**:
```bash
grep -r "child_process\|execSync\|exec\(.*req\|spawn\(.*req" backend/src/
# No matches found
```

No command execution patterns with user input found.

---

### 6. PATH TRAVERSAL ✅ NOT VULNERABLE

**Assessment**: ✅ **SAFE**

**Evidence**:
1. **No file system operations** with user input:
   ```bash
   grep -r "readFile\|writeFile\|unlink" backend/src/
   # No matches
   ```

2. **File operations are hardcoded**:
   ```javascript
   // backend/src/services/excelService.js
   const filename = `petro_monthly_${year}_${String(month).padStart(2,'0')}.xlsx`;
   // filename computed from validated year/month, not user path
   ```

3. **No path.join with user input**:
   ```bash
   grep -r "path\.join.*req\|path\.resolve.*req" backend/src/
   # No matches
   ```

---

### 7. SSRF (Server-Side Request Forgery) ✅ NOT VULNERABLE

**Assessment**: ✅ **SAFE**

**Evidence**:
1. **No HTTP client usage** with user-supplied URLs:
   ```bash
   grep -r "axios\|http\.get\|https\|fetch" backend/src/
   # Only used for internal MongoDB connections and Redis (hardcoded)
   ```

2. **No URL parsing of user input**:
   ```bash
   grep -r "url\.parse\|new URL" backend/src/
   # No matches
   ```

---

### 8. MASS ASSIGNMENT ✅ NOT VULNERABLE

**Assessment**: ✅ **SAFE**

**Evidence**:
```javascript
// backend/src/services/customerService.js
const updateCustomer = async ({ profileId, updates, updatedBy, requestId }) => {
  const allowedFields = ['phone', 'address', 'vehicleInfo', 'creditLimit', 'notes', 'isActive'];
  const sanitized = {};
  allowedFields.forEach(f => { if (updates[f] !== undefined) sanitized[f] = updates[f]; });
  
  // Only allowedFields are passed to MongoDB ✅
  const profile = await CustomerProfile.findByIdAndUpdate(profileId, sanitized, ...);
};
```

**Pattern**: Whitelist-based field selection prevents:
- `_id` tampering
- `createdBy` modification
- `userId` reassignment
- Internal fields change

---

### 9. UNSAFE OBJECT SPREAD/MERGE ✅ NOT VULNERABLE

**Assessment**: ✅ **SAFE**

**Evidence**:
No instances of:
- `Object.assign(db.record, req.body)` ❌ Found
- `{...dbRecord, ...req.body}` ❌ Found
- `Object.create(req.body)` ❌ Found

All updates go through controlled service methods with field whitelisting.

---

### 10. STORED XSS IN DATABASE ✅ NOT VULNERABLE

**Assessment**: ✅ **SAFE**

**Evidence**:
1. **No HTML storage**:
   ```javascript
   // All fields stored as plain text
   notes: { type: String, trim: true },     // ✅ Plain text
   address: { type: String, trim: true },   // ✅ Plain text
   vehicleInfo: { type: String, trim: true }, // ✅ Plain text
   ```

2. **Frontend escaping**:
   ```javascript
   // React auto-escapes on render
   <div>{transaction.notes}</div>  // ✅ Automatically escaped
   ```

3. **No dangerouslySetInnerHTML usage**:
   ```bash
   grep -r "dangerouslySetInnerHTML" frontend/src/
   # Not found ✅
   ```

---

### 11. WEAK INPUT VALIDATION - REPORT EXPORT PARAMETERS ⚠️ LIKELY

**File**: [backend/src/controllers/reportController.js](backend/src/controllers/reportController.js#L18-L19)

**Confidence**: 🟠 **LIKELY** (Year validation is loose)

**Vulnerable Code**:
```javascript
const getMonthlyReport = async (req, res, next) => {
  const year  = parseInt(req.query.year, 10);
  const month = parseInt(req.query.month, 10);
  
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  // ← No validation that year is reasonable
};
```

**Route Validation**:
```javascript
query('year').isInt({ min: 2000 }),
query('month').isInt({ min: 1, max: 12 })
```

**Issue**:
- ✅ **month** is bounded (1-12)
- ❌ **year** only has minimum (2000), no maximum

**How It Can Be Abused**:
```
GET /api/v1/reports/monthly?year=9999999&month=1
JavaScript Date(Date.UTC(9999999, 0, 1)) → Creates date far in future
Large date values can cause memory issues in some contexts
```

**Severity**: 🟡 **LOW** (JavaScript handles large dates gracefully, no actual harm)

**Fix Guidance**:
```javascript
query('year').isInt({ min: 2000, max: 2100 })
```

---

### 12. UNSAFE FILENAME GENERATION ✅ SAFE

**File**: [backend/src/services/excelService.js](backend/src/services/excelService.js#L56-L57)

**Vulnerable Code**:
```javascript
const safeSheetName = (value, fallback = 'Sheet') => {
  const cleaned = String(value || fallback)
    .replace(/[\\/\?\*\[\]:]/g, ' ')     // ← Removes special chars
    .replace(/\s+/g, ' ')                 // ← Collapses whitespace
    .trim();
  return cleaned.slice(0, 31) || fallback;
};
```

**Assessment**: ✅ **SAFE**
- Special characters removed
- Max length enforced (31 characters, Excel sheet name limit)
- Whitespace normalized
- Fallback provided

---

### 13. WEAK VALIDATION ON BODY PARAMETERS ✅ SAFE

**File**: [backend/src/routes/customerRoutes.js](backend/src/routes/customerRoutes.js)

**Validation Applied**:
```javascript
const customerBody = [
  body('name').trim().notEmpty(),                    // ✅ trim + required
  body('email').isEmail().normalizeEmail(),         // ✅ email format enforced
  body('password').optional().isLength({ min: 12 }), // ✅ min length
  body('customerCode').trim().notEmpty(),           // ✅ trim + required
  body().custom((value, { req }) => {
    if (!req.body.password && !req.body.phone) {
      throw new Error('Either password or phone is required');
    }
    return true;
  }),
];
```

**Assessment**: ✅ **STRONG**
- Type coercion: `.trim()`, `.normalizeEmail()`
- Constraint validation: `.notEmpty()`, `.isLength()`
- Custom validators: Cross-field validation (password XOR phone)

---

### 14. NUMERIC INPUT VALIDATION ✅ SAFE

**File**: [backend/src/controllers/transactionController.js](backend/src/controllers/transactionController.js#L27-L30)

**Vulnerable Code**:
```javascript
const resolvedAmount = totalAmount ?? amount;
const resolvedPayment = paymentReceived ?? paymentAmount;
const parsedPayment = Number.parseFloat(resolvedPayment);

if (!Number.isFinite(parsedPayment) || parsedPayment <= 0) {
  return sendError(res, 'Payment received is required', 400);
}
```

**Assessment**: ✅ **SAFE**
- ✅ `Number.isFinite()` checks for NaN, Infinity, non-numeric values
- ✅ Range validation: `<= 0` rejected
- ✅ Type coercion: `parseFloat()` used carefully

**Route Validation**:
```javascript
body('fuelQuantity').optional().isFloat({ min: 0 }),
body('rate').optional().isFloat({ min: 0 }),
body('paymentReceived').optional().isFloat({ min: 0 }),
```

✅ **STRONG** — isFloat validates both type AND range

---

## Summary Table

| Category | Finding | Severity | Confidence | Details |
|----------|---------|----------|-----------|---------|
| NoSQL Injection | $regex DoS | 🟠 MEDIUM | LIKELY | Regex DoS via search param, mongoSanitize insufficient |
| NoSQL Injection | Audit query param | 🟠 MEDIUM | LIKELY | No enum on action, no validation on actor |
| Date Parsing | Unsafe new Date() | 🟡 LOW | UNVERIFIED | Mitigated by isISO8601 validation |
| Regex DoS | Password validation | 🟡 LOW | LIKELY | Complex regex but bounded input length |
| Report Generation | Unbounded year | 🟡 LOW | LIKELY | No max year, but low risk in practice |
| XSS (Reflected) | API endpoints | ✅ OK | CONFIRMED | Backend is JSON API, no HTML rendering |
| XSS (Stored) | Database fields | ✅ OK | CONFIRMED | No HTML storage, React auto-escapes |
| Command Injection | Any endpoints | ✅ OK | CONFIRMED | No shell execution patterns |
| Path Traversal | File operations | ✅ OK | CONFIRMED | No file operations with user input |
| SSRF | HTTP requests | ✅ OK | CONFIRMED | No HTTP calls with user-supplied URLs |
| Mass Assignment | Update operations | ✅ OK | CONFIRMED | Whitelist-based field selection |
| Object Spread | Data mutations | ✅ OK | CONFIRMED | No unsafe Object.assign patterns |
| Filename Safety | Excel export | ✅ OK | CONFIRMED | Special chars stripped, length limited |
| Numeric Validation | float/int | ✅ OK | CONFIRMED | Number.isFinite() + range checks |
| Body Validation | CRUD operations | ✅ OK | CONFIRMED | express-validator on all routes |

---

## Remediation Priority

### HIGH PRIORITY (Before Production)

**Action Required: Fix NoSQL Injection Vulnerabilities**

1. **Escape regex in customer search** (15 minutes)
   - File: `backend/src/services/customerService.js` line 65-72
   - Add regex escape function
   - Escape search param before $regex operator
   - Add max length constraint (50 chars)

2. **Validate audit log parameters** (10 minutes)
   - File: `backend/src/controllers/auditController.js` line 13-17
   - Add enum validation for action field
   - Validate actor as MongoDB ObjectId
   - Prevent unvalidated query filters

---

### MEDIUM PRIORITY (Post-Deployment Monitoring)

3. **Add year bounds to report generation** (5 minutes)
   - File: `backend/src/controllers/reportController.js` line 18
   - Change `{ min: 2000 }` to `{ min: 2000, max: 2100 }`

4. **Monitor regex complexity** (ongoing)
   - Add logging for search operations
   - Alert on queries taking > 1000ms
   - Monitor database CPU during search operations

---

### LOW PRIORITY (Best Practice Improvements)

5. **Refactor password validation regex** (10 minutes)
   - Use boolean flags instead of multiple .test() calls
   - Document character classes more clearly
   - Consider complexity reduction

6. **Add date validation helpers** (5 minutes)
   - Check `isNaN(date.getTime())` before using
   - Create utility function for date validation
   - Apply consistently across audit/report controllers

---

## Secure Validation Patterns

### Pattern 1: Regex DoS Prevention
```javascript
// ❌ UNSAFE
const users = await User.find({ name: { $regex: search } });

// ✅ SAFE
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
const escapedSearch = escapeRegex(search);
const users = await User.find({ 
  name: { $regex: escapedSearch, $options: 'i' } 
});
```

### Pattern 2: Enum Validation
```javascript
// ❌ UNSAFE
if (action) query.action = action;

// ✅ SAFE
const ALLOWED_ACTIONS = ['LOGIN', 'LOGOUT', 'CUSTOMER_CREATED'];
if (action) {
  if (!ALLOWED_ACTIONS.includes(action)) {
    return sendError(res, 'Invalid action', 400);
  }
  query.action = action;
}
```

### Pattern 3: ObjectId Validation
```javascript
// ❌ UNSAFE
query.actor = actor;  // Can be any string

// ✅ SAFE
if (actor) {
  if (!mongoose.Types.ObjectId.isValid(actor)) {
    return sendError(res, 'Invalid actor ID', 400);
  }
  query.actor = new mongoose.Types.ObjectId(actor);
}
```

### Pattern 4: Numeric Range Validation
```javascript
// ❌ UNSAFE
const year = parseInt(req.query.year, 10);

// ✅ SAFE
const year = parseInt(req.query.year, 10);
if (isNaN(year) || year < 2000 || year > 2100) {
  return sendError(res, 'Invalid year', 400);
}
```

### Pattern 5: Whitelist-Based Field Updates
```javascript
// ❌ UNSAFE
const profile = await Profile.findByIdAndUpdate(id, req.body);

// ✅ SAFE
const allowedFields = ['phone', 'address', 'notes'];
const sanitized = {};
allowedFields.forEach(f => {
  if (req.body[f] !== undefined) sanitized[f] = req.body[f];
});
const profile = await Profile.findByIdAndUpdate(id, sanitized);
```

---

## Conclusion

**Security Posture**: ✅ **STRONG** with targeted remediations needed

The application demonstrates:
- ✅ Comprehensive input validation framework (express-validator)
- ✅ Proper schema-level constraints (Mongoose)
- ✅ NoSQL injection prevention middleware (mongoSanitize)
- ✅ No critical injection vectors detected

**2 Medium-severity findings** require attention before production:
1. **Regex DoS** in customer search
2. **Audit log parameter injection** (query bypass)

**Remediation effort: ~25 minutes** total for both findings

**Production readiness**: ⚠️ **CONDITIONAL** — Fix high-priority items first, then deploy with confidence.

---

**Audit Date**: May 9, 2026  
**Auditor**: GitHub Copilot Security Audit  
**Read-Only Mode**: YES (no code modifications made)
