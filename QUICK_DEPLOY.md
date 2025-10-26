# ⚡ **QUICK DEPLOY TO VERCEL**

---

## 🚀 **COPY & PASTE THESE COMMANDS:**

```bash
# 1. Install Vercel CLI (if not installed)
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy to production
vercel --prod

# 4. Add custom domain
vercel domains add apinow.cloud

# 5. Check deployment
vercel ls
```

---

## 📋 **AFTER DEPLOYMENT:**

### **1. Add Environment Variables**
→ Go to https://vercel.com/dashboard
→ Select project → Settings → Environment Variables
→ Copy from `VERCEL_ENV_VARS.md` (all 23 variables)

### **2. Update Stripe Webhook**
→ Go to https://dashboard.stripe.com/webhooks
→ Update URL to: `https://apinow.cloud/api/stripe/webhook`

### **3. Test Your App**
→ https://apinow.cloud
→ Sign up, create API, test billing

---

## ✅ **DONE!**

Your app is live and making money! 💰

---

## 🔄 **FUTURE DEPLOYMENTS:**

Just run:
```bash
vercel --prod
```

Vercel auto-deploys from Git if connected!
