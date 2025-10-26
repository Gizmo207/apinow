# 🧪 API Platform Testing Checklist

## Automated Tests

Run the automated test suite:

```bash
# Get your auth token first
# 1. Go to https://apinow.cloud and log in
# 2. Open DevTools > Application > Local Storage
# 3. Find your Firebase auth token
# 4. Export it:

export TEST_AUTH_TOKEN="your-token-here"

# Run tests
node test-api-platform.js
```

---

## Manual Testing Checklist

### 🔐 Authentication & User Management

- [ ] Sign up with new account
- [ ] Log in with existing account
- [ ] Log out
- [ ] Password reset flow
- [ ] User profile displays correctly
- [ ] Session persists on page refresh

---

### 🗄️ Database Connections

- [ ] Can view saved database connections
- [ ] Can add new Firebase connection
- [ ] Can test connection (introspection works)
- [ ] Connection shows collections/tables
- [ ] Can delete connection
- [ ] Credentials stored securely (encrypted)

---

### 🔌 API Explorer

- [ ] Select database from dropdown
- [ ] Collections/tables load correctly
- [ ] Generate endpoints button works
- [ ] Endpoints show correct paths (`/api/dynamic/collection` not `/api/dynamic/api/collection`)
- [ ] Can save endpoints
- [ ] Saved endpoints don't duplicate
- [ ] Test button for each endpoint works
- [ ] Test returns real data

---

### 📝 My APIs

- [ ] Shows all saved endpoints
- [ ] Displays correct path, method, table name
- [ ] "Copy URL" button works
- [ ] "Test in API Tester" button works and navigates
- [ ] "Delete" button removes endpoint
- [ ] "Delete All Endpoints" works
- [ ] Empty state shows when no endpoints saved
- [ ] "Go to API Explorer" button works

---

### ⚡ API Tester

- [ ] Page loads without errors
- [ ] Dropdown shows saved endpoints (only testable ones)
- [ ] Endpoints with `:id` filtered out from dropdown
- [ ] Selecting endpoint auto-fills:
  - [ ] URL
  - [ ] Method
  - [ ] Body (for POST requests)
- [ ] URL persists when navigated from My APIs
- [ ] Can manually enter URL
- [ ] Method dropdown works
- [ ] Headers can be edited
- [ ] Body editor works
- [ ] "Include authentication" checkbox works
- [ ] Send Request button works
- [ ] Response displays correctly (Pretty & Raw views)
- [ ] Status code shows
- [ ] Debug info shows auth status
- [ ] Copy response button works
- [ ] Can send GET, POST, PUT, DELETE requests

---

### 🚀 Dynamic API Execution

Test actual API calls:

#### GET Requests
- [ ] GET list endpoint returns array
- [ ] Returns 200 status
- [ ] Data structure correct
- [ ] Limit parameter works
- [ ] Empty collections return `[]`

#### POST Requests
- [ ] POST creates new document
- [ ] Returns created document with ID
- [ ] Returns 200/201 status
- [ ] Validation errors handled

#### PUT Requests
- [ ] PUT updates existing document
- [ ] Requires ID parameter
- [ ] Returns updated document
- [ ] Returns 400 if ID missing

#### DELETE Requests
- [ ] DELETE removes document
- [ ] Requires ID parameter
- [ ] Returns success message
- [ ] Returns 400 if ID missing

---

### 📊 Analytics

- [ ] Analytics page loads
- [ ] Shows total requests count
- [ ] Shows success rate
- [ ] Chart displays if data exists
- [ ] Filter by source works (all/protected/public)
- [ ] Refresh button works
- [ ] Shows "No data" when empty

---

### 🔑 API Keys (if implemented)

- [ ] Can view API keys
- [ ] Can generate new key
- [ ] Key displays once then hidden
- [ ] Can delete key
- [ ] Key works for authentication

---

### 🌐 Environment-Specific

#### Production (apinow.cloud)
- [ ] All features work on prod domain
- [ ] HTTPS enabled
- [ ] Environment variables loaded
- [ ] Firebase Admin SDK works
- [ ] No credential errors in logs

#### Development (localhost:3000)
- [ ] Can run locally
- [ ] Hot reload works
- [ ] Can test with local Firebase emulator (optional)

---

### ❌ Error Handling

- [ ] 404 page for invalid routes
- [ ] 401 for unauthorized requests
- [ ] 403 for forbidden resources
- [ ] 500 with error message for server errors
- [ ] Friendly error messages shown to user
- [ ] Errors logged but don't expose sensitive info

---

### 🔒 Security

- [ ] API endpoints require authentication
- [ ] Can't access other users' data
- [ ] SQL injection protected (parameterized queries)
- [ ] XSS protection (React escaping)
- [ ] CSRF tokens (if using cookies)
- [ ] Firestore rules properly configured
- [ ] Service account key secure in env vars
- [ ] No sensitive data in client-side code
- [ ] No API keys in source code

---

### 📱 UI/UX

- [ ] Responsive on mobile
- [ ] Responsive on tablet
- [ ] No layout shifts
- [ ] Loading states show
- [ ] Success/error toasts appear
- [ ] Buttons disabled during loading
- [ ] Forms validate before submit
- [ ] Navigation smooth
- [ ] No console errors

---

### ⚡ Performance

- [ ] Pages load in < 3 seconds
- [ ] API requests respond in < 2 seconds
- [ ] No memory leaks (check DevTools)
- [ ] Images optimized
- [ ] Code split properly

---

## Critical Issues to Check

### 🚨 Double `/api/api` Bug
- [ ] NO endpoints have path `/api/dynamic/api/api_*`
- [ ] All endpoints follow pattern `/api/dynamic/{collection}`
- [ ] Check Firebase `api_endpoints` collection directly
- [ ] Old broken endpoints deleted

### 🚨 Firebase Credentials
- [ ] `FIREBASE_SERVICE_ACCOUNT_KEY` set in Vercel
- [ ] No "Could not load credentials" errors
- [ ] No "Unterminated string" errors
- [ ] No "permission denied" errors
- [ ] Service account has correct IAM roles

### 🚨 Authentication
- [ ] Auth token included in same-origin requests
- [ ] Auth works on both localhost and prod
- [ ] Token refreshes before expiration
- [ ] Logout clears token

---

## Load Testing (Optional)

```bash
# Install Apache Bench
# Ubuntu: apt-get install apache2-utils
# Mac: brew install httpd

# Test endpoint (replace with your URL and token)
ab -n 100 -c 10 -H "Authorization: Bearer YOUR_TOKEN" \
   https://apinow.cloud/api/dynamic/api_analytics
```

Expected:
- [ ] No 500 errors under load
- [ ] Average response time < 500ms
- [ ] 99th percentile < 2s

---

## Pre-Launch Checklist

- [ ] All manual tests passed
- [ ] All automated tests passed
- [ ] No errors in Vercel logs
- [ ] Firebase quotas checked (not hitting limits)
- [ ] DNS configured correctly
- [ ] SSL certificate valid
- [ ] Monitoring/alerting setup
- [ ] Backup strategy in place
- [ ] Documentation updated
- [ ] README has setup instructions

---

## Post-Launch Monitoring

First 24 hours:
- [ ] Check error rates every hour
- [ ] Monitor API response times
- [ ] Watch Firebase usage/costs
- [ ] Check user signups work
- [ ] Verify analytics collecting
- [ ] Read Vercel function logs
- [ ] Check for any 500 errors

---

## Known Issues / TODOs

- [ ] Rate limiting not yet implemented
- [ ] API key management incomplete
- [ ] No pagination on large datasets
- [ ] Public/private endpoint toggle needs testing
- [ ] Webhook support not implemented
- [ ] OpenAPI/Swagger docs not generated
- [ ] Email verification not enforced

---

## Emergency Rollback Plan

If something breaks in production:

1. **Quick Fix**: Revert to previous deployment
   ```bash
   vercel rollback
   ```

2. **Check Logs**:
   - Vercel dashboard > Functions > Logs
   - Firebase console > Firestore > Usage

3. **Common Fixes**:
   - Re-add environment variable
   - Clear browser cache
   - Redeploy with `vercel --prod`

---

## Support Contacts

- Vercel Support: vercel.com/support
- Firebase Support: firebase.google.com/support
- GitHub Issues: github.com/Gizmo207/apinow/issues
