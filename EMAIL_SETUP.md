# 📧 Email Notification Setup Guide

This guide will help you set up the production email notification system using Resend.

## 🚀 Quick Setup (5 minutes)

### Step 1: Get Your Resend API Key

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account (3,000 emails/month free)
3. Verify your email
4. Go to **API Keys** in the dashboard
5. Click **Create API Key**
6. Copy the key (starts with `re_`)

### Step 2: Add API Key to Environment Variables

Add these to your `.env.local` file:

```env
# Resend Email Service
RESEND_API_KEY=re_your_api_key_here

# Cron Job Security (generate a random string)
CRON_SECRET=your_random_secret_here
```

**Generate a random CRON_SECRET:**
```bash
# On Mac/Linux:
openssl rand -hex 32

# Or use any random string generator
```

### Step 3: Verify Domain (Optional but Recommended)

For production, verify your domain in Resend:

1. Go to **Domains** in Resend dashboard
2. Add your domain (e.g., `apinow.dev`)
3. Add the DNS records they provide
4. Wait for verification (usually 5-10 minutes)

Once verified, update the email addresses in `src/services/emailService.ts`:
```typescript
from: 'APIFlow <notifications@yourdomain.com>'
```

### Step 4: Set Up Cron Job (For Weekly Reports)

#### **Option A: Vercel Cron (Recommended)**

If deploying to Vercel, create `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/weekly-reports?key=YOUR_CRON_SECRET",
    "schedule": "0 9 * * 1"
  }]
}
```

#### **Option B: External Cron Service**

Use [cron-job.org](https://cron-job.org) or similar:

1. URL: `https://yourdomain.com/api/cron/weekly-reports?key=YOUR_CRON_SECRET`
2. Schedule: Every Monday at 9:00 AM
3. Cron Expression: `0 9 * * 1`

### Step 5: Restart Your Dev Server

```bash
# Kill existing server
taskkill /F /IM node.exe

# Start fresh
npm run dev
```

## 🧪 Testing

### Test Weekly Report Manually

1. Enable Weekly Reports in Settings → Notifications
2. Call the cron endpoint manually:
```bash
curl "http://localhost:3000/api/cron/weekly-reports?key=YOUR_CRON_SECRET"
```
3. Check your email inbox!

### Test Other Notifications

The system will automatically send:
- **API Usage Alerts** - When you hit 80% or 95% of rate limit
- **Downtime Alerts** - When API endpoints fail
- **Security Alerts** - On suspicious activity

## 📊 What Gets Sent

### Weekly Report Email Includes:
- Total API requests (last 7 days)
- Success rate percentage
- Average response time
- Top 5 most-used endpoints
- Beautiful HTML email with your branding

### Alert Emails Include:
- Clear subject line with emoji
- Description of the issue
- Call-to-action button to dashboard
- Professional HTML formatting

## 🔒 Security Notes

1. **Never commit** `.env.local` to git
2. **Keep CRON_SECRET** secret - it protects your cron endpoint
3. **Verify domain** in Resend for better deliverability
4. **Monitor usage** - Free tier is 3,000 emails/month

## 🎨 Customization

### Change Email Templates

Edit `src/services/emailService.ts`:
- `generateWeeklyReportHTML()` - Weekly report design
- `sendApiUsageAlert()` - Usage alert content
- `sendDowntimeAlert()` - Downtime alert content
- `sendSecurityAlert()` - Security alert content

### Change Send Time

Edit cron schedule:
- `0 9 * * 1` = Monday 9 AM
- `0 6 * * 1` = Monday 6 AM
- `0 9 * * *` = Every day at 9 AM

## 📝 Environment Variables Reference

```env
# Required
RESEND_API_KEY=re_xxxxxxxxxxxxx
CRON_SECRET=your-secret-string-here

# Optional (for production)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## ✅ Verification Checklist

- [ ] Resend account created
- [ ] API key added to `.env.local`
- [ ] CRON_SECRET generated and added
- [ ] Server restarted
- [ ] Domain verified (optional)
- [ ] Cron job scheduled
- [ ] Test email sent successfully

## 🆘 Troubleshooting

### Emails Not Sending?

1. Check API key is correct in `.env.local`
2. Restart dev server
3. Check Resend dashboard for errors
4. Verify you haven't hit rate limit

### Weekly Reports Not Working?

1. Check cron job is running (check cron service logs)
2. Verify CRON_SECRET matches
3. Ensure users have weekly reports enabled
4. Check server logs for errors

### Domain Not Verified?

1. Wait 10-15 minutes after adding DNS records
2. Use `dig` or `nslookup` to verify DNS propagation
3. Contact Resend support if issues persist

## 📚 Additional Resources

- [Resend Documentation](https://resend.com/docs)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Email Best Practices](https://resend.com/docs/knowledge-base/email-best-practices)

---

**🎉 Once configured, your users will receive professional email notifications automatically!**
