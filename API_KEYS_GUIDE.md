# 🔑 API Keys Management Guide

## Overview

API Keys allow users to access their generated APIs without needing to authenticate with Firebase. They're essential for production applications.

---

## 🎯 **What API Keys Are For**

### Use Cases:
1. **Mobile Apps** - Call your APIs from iOS/Android apps
2. **Backend Services** - Server-to-server communication
3. **Third-party Integrations** - Give partners access
4. **Client Applications** - Desktop apps, scripts, etc.

### Why Use API Keys Instead of Firebase Tokens?
- ✅ **No expiration** - Firebase tokens expire after 1 hour
- ✅ **Server-side** - Perfect for backend services
- ✅ **Revocable** - Instantly disable compromised keys
- ✅ **Trackable** - See which key is being used

---

## 🚀 **How It Works**

### Step 1: Generate an API Key
1. Go to **Settings → API Keys**
2. Click **"Generate New Key"**
3. Enter a name (e.g., "Production", "Mobile App", "Client X")
4. Click OK
5. ✅ Your key is generated and automatically copied!

### Step 2: Save Your Key
```
apinow_a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

⚠️ **IMPORTANT:** This is the ONLY time you'll see the full key! Save it securely.

### Step 3: Use Your Key
```bash
# Call your API with the key
curl "https://yourdomain.com/api/dynamic/api/users" \
  -H "X-API-Key: apinow_your_key_here"

# Or as a query parameter
curl "https://yourdomain.com/api/dynamic/api/users?apiKey=apinow_your_key_here"
```

---

## 📋 **API Key Format**

All keys start with `apinow_` followed by 64 random hexadecimal characters:

```
apinow_[64 random hex characters]
```

Example:
```
apinow_a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

---

## 🧪 **Testing Guide**

### **Test 1: Generate Your First Key**

1. **Open Settings → API Keys tab**
   - You should see: "No API keys yet"

2. **Click "Generate New Key"**
   - Enter name: `Test Key`
   - Click OK

3. **Verify Success**
   - ✅ Alert shows the full key
   - ✅ Key is copied to clipboard
   - ✅ Key appears in the list

4. **Check Firestore**
   - Go to Firebase Console → Firestore
   - Collection: `apiKeys`
   - Find your document
   - Should see:
   ```json
   {
     "userId": "YOUR_USER_ID",
     "name": "Test Key",
     "key": "apinow_...",
     "active": true,
     "createdAt": "...",
     "lastUsed": null
   }
   ```

---

### **Test 2: Copy an API Key**

1. **Click "Copy" button**
   - ✅ Alert: "API Key copied to clipboard!"

2. **Paste the key**
   ```bash
   # Paste into terminal to verify
   echo "YOUR_KEY_HERE"
   ```

---

### **Test 3: Revoke a Key**

1. **Click "Revoke" button**
   - ⚠️ Confirmation dialog appears
   - Warning: "This action cannot be undone"

2. **Click OK**
   - ✅ Alert: "API Key revoked successfully!"
   - ❌ Key shows as "Revoked" (red badge)

3. **Verify in Firestore**
   - `active` should be `false`
   - `revokedAt` timestamp added

4. **Try using revoked key**
   ```bash
   curl "http://localhost:3000/api/dynamic/api/users" \
     -H "X-API-Key: YOUR_REVOKED_KEY"
   # Should return: 401 Unauthorized
   ```

---

### **Test 4: Multiple Keys**

1. **Generate 3 keys:**
   - Production Key
   - Development Key
   - Testing Key

2. **Verify they all show up**
   - All 3 keys in the list
   - Different creation times
   - All showing "Active" badge

3. **Revoke one**
   - Revoke "Testing Key"
   - Other 2 remain active

---

## 🔒 **Security Best Practices**

### **Development**
```
Test Key - For local testing
```
- Use in development environment
- Revoke after testing

### **Staging**
```
Staging Key - For QA testing
```
- Separate key for staging
- Can be shared with team

### **Production**
```
Production Key - Live app
Mobile App Key - iOS/Android
Backend Service Key - Server API
```
- One key per service
- Never commit to git
- Store in environment variables

---

## 🎯 **Production Checklist**

### **Before Launch:**
- [ ] Generate production API key
- [ ] Store key securely (env variables, secrets manager)
- [ ] Test key works in production
- [ ] Revoke all test/dev keys
- [ ] Set up key rotation schedule

### **Security:**
- [ ] Never commit keys to version control
- [ ] Use HTTPS only (keys in headers)
- [ ] Enable IP whitelisting if possible
- [ ] Monitor key usage in analytics
- [ ] Have key revocation plan

### **Monitoring:**
- [ ] Check "Last used" timestamps
- [ ] Revoke unused keys after 90 days
- [ ] Rotate keys every 6 months
- [ ] Alert on suspicious usage patterns

---

## 🚨 **What If a Key is Compromised?**

### **Immediate Actions:**

1. **Revoke the compromised key**
   ```
   Settings → API Keys → Revoke
   ```

2. **Generate a new key**
   ```
   Generate New Key → Update your app
   ```

3. **Update your application**
   ```bash
   # Update environment variable
   API_KEY=apinow_new_key_here
   ```

4. **Deploy the update**
   ```
   Redeploy with new key
   ```

---

## 📊 **Key Management UI Features**

### **Key List Shows:**
- ✅ Key name
- ✅ Key preview (first 20 chars)
- ✅ Creation date
- ✅ Last used timestamp
- ✅ Active/Revoked status

### **Actions Available:**
- 📋 **Copy** - Copy full key to clipboard
- 🗑️ **Revoke** - Immediately disable key
- 🔄 **Refresh** - Reload keys from database

---

## 💡 **Tips & Tricks**

### **Naming Convention:**
```
Environment - Purpose - Date
Examples:
- "Prod - Mobile App - Jan 2024"
- "Dev - Testing - Oct 2024"
- "Staging - QA Team - Nov 2024"
```

### **Key Rotation:**
```bash
# Step 1: Generate new key
NEW_KEY=apinow_new_key

# Step 2: Update app with new key
# Deploy with NEW_KEY

# Step 3: Monitor for 24 hours
# Check logs for old key usage

# Step 4: Revoke old key
# Once confirmed no usage
```

### **Environment Variables:**
```bash
# .env (NEVER commit this file!)
APINOW_API_KEY=apinow_your_production_key_here

# Load in your app
const apiKey = process.env.APINOW_API_KEY;
```

---

## 🧪 **Quick Test Commands**

### **Test Key Works:**
```bash
# Using header (recommended)
curl "http://localhost:3000/api/dynamic/api/users" \
  -H "X-API-Key: apinow_your_key_here"

# Using query parameter
curl "http://localhost:3000/api/dynamic/api/users?apiKey=apinow_your_key_here"
```

### **Test Revoked Key Fails:**
```bash
# Should return 401 Unauthorized
curl "http://localhost:3000/api/dynamic/api/users" \
  -H "X-API-Key: apinow_revoked_key_here"
```

### **Check Key in Firestore:**
```bash
# Firebase CLI
firebase firestore:get apiKeys/KEY_DOC_ID

# Or use Firebase Console UI
```

---

## ✅ **Production Ready Checklist**

Your API Keys system is production-ready when:

- [x] Generate new keys works
- [x] Keys are stored in Firestore
- [x] Keys display in UI with preview
- [x] Copy button works
- [x] Revoke button works with confirmation
- [x] Keys auto-load when tab opens
- [x] Refresh button reloads keys
- [x] Active/Revoked status shows
- [x] Last used timestamp displays
- [x] Security warnings are clear

---

## 🎉 **Your API Keys System is Ready!**

You now have a professional-grade API key management system that:
- ✅ Generates secure random keys
- ✅ Stores keys safely in Firestore
- ✅ Allows instant revocation
- ✅ Tracks usage and creation
- ✅ Shows clear status indicators
- ✅ Provides easy copy/revoke actions

**Go test it now! Generate your first API key!** 🔑✨
