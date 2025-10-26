# 🚀 **APINOW PRODUCTION DEPLOYMENT CHECKLIST**

---

## ✅ **PRE-DEPLOYMENT CHECKLIST**

### **1. Code Readiness**
- [x] All features implemented
- [x] Stripe billing integrated
- [x] Redis caching implemented
- [x] Usage limits enforced
- [x] API documentation generated
- [x] Firebase Admin auth working
- [ ] Run production build locally: `npm run build`
- [ ] Test production build: `npm start`

### **2. Environment Variables**
- [ ] Copy all vars from `VERCEL_ENV_VARS.md`
- [ ] Update `NEXT_PUBLIC_APP_URL` to `https://apinow.cloud`
- [ ] Add to Vercel Dashboard

### **3. Firebase Setup**
- [x] Firestore database configured
- [x] Service account key generated
- [x] Auth providers enabled
- [ ] Firestore indexes created (if needed)
- [ ] Security rules reviewed

### **4. Stripe Setup**
- [x] All products created
- [x] All price IDs added
- [x] Webhook configured
- [ ] Update webhook URL to `https://apinow.cloud/api/stripe/webhook`
- [ ] Test webhook with Stripe CLI

---

## 🎯 **DEPLOYMENT STEPS**

### **Step 1: Install Vercel CLI**

```bash
npm install -g vercel
```

### **Step 2: Login to Vercel**

```bash
vercel login
```

(Opens browser, log in with your account)

### **Step 3: Link Project (First Time)**

```bash
cd e:\apinow
vercel
```

Answer the prompts:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N** (first time) or **Y** (if exists)
- Project name: `apinow`
- Directory: `./`
- Override settings? **N**

### **Step 4: Add Environment Variables**

Go to: https://vercel.com/dashboard → Your Project → Settings → Environment Variables

Add all 23 variables from `VERCEL_ENV_VARS.md`

### **Step 5: Deploy to Production**

```bash
vercel --prod
```

Wait for deployment to complete (~3-5 minutes)

### **Step 6: Custom Domain Setup**

```bash
# Add your domain
vercel domains add apinow.cloud

# SSL certificate (automatic)
vercel certs issue apinow.cloud
```

**Then update your DNS:**
- Add A record: `76.76.21.21` (Vercel IP)
- Or CNAME: `cname.vercel-dns.com`

(Vercel will show exact DNS settings after domain added)

---

## 🔧 **POST-DEPLOYMENT CONFIGURATION**

### **1. Update Stripe Webhook URL**

1. Go to: https://dashboard.stripe.com/webhooks
2. Find your webhook endpoint
3. Click **Edit**
4. Update URL to: `https://apinow.cloud/api/stripe/webhook`
5. **Save**

### **2. Update Firebase Authorized Domains**

1. Go to: https://console.firebase.google.com/project/api-now-bd858/authentication/settings
2. Click **Authorized domains**
3. Add: `apinow.cloud`
4. **Save**

### **3. Test Stripe Webhook**

```bash
stripe trigger checkout.session.completed --api-key sk_live_...
```

Or use Stripe Dashboard → Webhooks → Send test event

---

## ✅ **VERIFICATION CHECKLIST**

### **App Loads**
- [ ] Visit https://apinow.cloud → Landing page loads
- [ ] Sign up works
- [ ] Sign in works
- [ ] Dashboard loads

### **Core Features**
- [ ] Database connections work
- [ ] API endpoints can be created
- [ ] API endpoints can be called
- [ ] Analytics show data
- [ ] Settings load

### **Billing System**
- [ ] Settings → Billing tab loads
- [ ] All 3 plans displayed
- [ ] "Upgrade" button works
- [ ] Stripe checkout opens
- [ ] Back button returns correctly
- [ ] Test payment with card: `4242 4242 4242 4242`
- [ ] Webhook receives event
- [ ] User plan updated in Firestore
- [ ] Usage limits enforced

### **API Routes**
- [ ] `/api/health` → 200 OK
- [ ] `/api/user/plan` → Returns user plan
- [ ] `/api/stripe/checkout` → Creates session
- [ ] `/api/stripe/webhook` → Receives events
- [ ] `/api/docs` → Returns OpenAPI spec

### **Performance**
- [ ] Page load < 3 seconds
- [ ] API response < 1 second
- [ ] Redis cache working (check logs)

---

## 🐛 **TROUBLESHOOTING**

### **Build Fails**

```bash
# Check build locally first
npm run build

# Check Vercel logs
vercel logs
```

### **Environment Variables Not Working**

- Redeploy after adding vars: `vercel --prod`
- Check spelling matches exactly
- Ensure selected for Production environment

### **Webhook Not Receiving Events**

- Check Stripe Dashboard → Webhooks → Event deliveries
- Verify URL is `https://apinow.cloud/api/stripe/webhook`
- Check signing secret matches env var
- View Vercel function logs

### **404 Errors**

- Check Next.js routes exist
- Verify file structure in Vercel deployment
- Check build output for errors

---

## 📊 **MONITORING**

### **Vercel Dashboard**
- Analytics: https://vercel.com/dashboard/analytics
- Logs: `vercel logs --follow`
- Performance: Speed Insights tab

### **Stripe Dashboard**
- Webhooks: https://dashboard.stripe.com/webhooks
- Payments: https://dashboard.stripe.com/payments
- Customers: https://dashboard.stripe.com/customers

### **Firebase Console**
- Firestore: https://console.firebase.google.com/project/api-now-bd858/firestore
- Auth: https://console.firebase.google.com/project/api-now-bd858/authentication
- Usage: Dashboard tab

---

## 🎉 **YOU'RE LIVE!**

Once all checkboxes are ✅:

**Your app is now:**
- ✅ Live at https://apinow.cloud
- ✅ Accepting payments
- ✅ Enforcing usage limits
- ✅ Auto-scaling with Vercel
- ✅ Production-ready!

---

## 📞 **SUPPORT**

- Vercel: https://vercel.com/support
- Stripe: https://support.stripe.com
- Firebase: https://firebase.google.com/support

**Congratulations! APIFlow is in production! 🚀💰**
