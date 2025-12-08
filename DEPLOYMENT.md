# 🚀 Deployment Guide - Hebrew-English Vocab App

## Prerequisites
1. **Google Cloud Account** - to create OAuth credentials
2. **Vercel Account** - for hosting
3. **Gemini API Key** - already have this ✓

---

## Step 1: Setup Google OAuth

### A. Create OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
5. If prompted, configure the OAuth consent screen:
   - User Type: **External** (or Internal if for organization only)
   - App name: `Hebrew-English Vocab Practice`
   - User support email: your email
   - Developer contact: your email
   - Save and Continue (you can skip optional fields)
6. Back to Create OAuth Client ID:
   - Application type: **Web application**
   - Name: `Vocab App Web Client`
   - **Authorized JavaScript origins:**
     - Add: `http://localhost:3003` (for local dev)
     - Add: `https://your-domain.com` (your production domain)
     - Add: `https://your-vercel-app.vercel.app` (Vercel preview URL)
   - **Authorized redirect URIs:**
     - Add: `http://localhost:3003`
     - Add: `https://your-domain.com`
     - Add: `https://your-vercel-app.vercel.app`
7. Click **CREATE**
8. **Copy the Client ID** - you'll need this!

### B. (Optional) Restrict to School Domain
If you want only students from a specific school:
1. Go to **OAuth consent screen**
2. Under "Test users", add specific email addresses
3. Or use **Internal** user type if your organization has Google Workspace

---

## Step 2: Configure Local Environment

1. Copy `.env.example` to `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```
   VITE_GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
   GEMINI_API_KEY=AIzaSy...your-existing-key
   ```

3. Test locally:
   ```powershell
   npm run dev
   ```

4. Open `http://localhost:3003` and verify:
   - Login screen appears with Google button
   - You can sign in with Google
   - After login, you see the app

---

## Step 3: Deploy to Vercel

### A. Add Environment Variables in Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `hebrew-english-vocab-master`
3. Go to **Settings** → **Environment Variables**
4. Add these two variables:

   **Variable 1:**
   - Key: `VITE_GOOGLE_CLIENT_ID`
   - Value: `your-client-id.apps.googleusercontent.com` (from Step 1)
   - Environments: ✅ Production, ✅ Preview, ✅ Development

   **Variable 2:**
   - Key: `GEMINI_API_KEY`
   - Value: `AIzaSy...` (your current Gemini key)
   - Environments: ✅ Production, ✅ Preview, ✅ Development

5. Click **Save** for each

### B. Remove Vercel Protection
1. In same project settings, go to **Deployment Protection**
2. Find "**Protect Preview Deployments**" or "**Protection**"
3. **Turn it OFF** (toggle to disabled)
4. Save changes

### C. Deploy
1. Push your code to GitHub:
   ```powershell
   git add .
   git commit -m "Add Google OAuth authentication"
   git push origin main
   ```

2. Vercel will automatically redeploy
3. Wait 1-2 minutes for build to complete

### D. Test Deployment
1. Visit your Vercel URL (e.g., `https://english-exam-...vercel.app`)
2. You should see the login screen (NOT the 401 error)
3. Click "Sign in with Google"
4. After login, the app loads

---

## Step 4: Add Custom Domain (Optional)

1. In Vercel project, go to **Settings** → **Domains**
2. Enter your domain: `vocab.yourschool.com` (or whatever you own)
3. Vercel will show DNS records to add
4. Go to your domain registrar (GoDaddy, Namecheap, etc.)
5. Add the DNS records:
   - For subdomain: Add **CNAME** → `cname.vercel-dns.com`
   - For apex domain: Add **A** → `76.76.21.21`
6. Wait 5-10 minutes for DNS propagation
7. Vercel will auto-verify and issue SSL certificate

### Update Google OAuth with Custom Domain
1. Go back to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth Client ID
3. Add your custom domain to:
   - **Authorized JavaScript origins**: `https://vocab.yourschool.com`
   - **Authorized redirect URIs**: `https://vocab.yourschool.com`
4. Save

---

## Step 5: Verify Everything Works

### ✅ Security Checklist:
- [ ] Login screen appears on first visit
- [ ] Google sign-in button works
- [ ] After login, app loads with user profile in top-right
- [ ] Can logout and must re-login to access app
- [ ] API calls work (test by uploading text/image)
- [ ] Gemini API key is NOT visible in browser dev tools
- [ ] `.env` file is in `.gitignore` and not committed to GitHub

### 🎉 Success Indicators:
- Users must login to access the app
- Your Gemini API key stays server-side (safe)
- App works on custom domain
- SSL certificate shows green padlock 🔒

---

## Troubleshooting

### "Sign in with Google" button doesn't appear
- Check that `VITE_GOOGLE_CLIENT_ID` is set in Vercel
- Verify the Client ID is correct
- Check browser console for errors

### "Unauthorized - Please login" when using features
- Check that user is logged in (profile shows in top-right)
- Verify sessionStorage contains `authUser`
- Check browser console network tab for 401 errors

### OAuth Error: "redirect_uri_mismatch"
- Go to Google Cloud Console → Credentials
- Verify your domain is listed in "Authorized redirect URIs"
- Make sure there are no typos (http vs https, trailing slashes)

### Still seeing 401 on Vercel deployment
- Verify Deployment Protection is OFF in Vercel settings
- Try opening in incognito/private window
- Clear browser cache and cookies

---

## For Students/Teachers

**How to access the app:**
1. Go to: `https://your-domain.com`
2. Click "Sign in with Google"
3. Use your Google account
4. Start practicing vocabulary!

**No installation needed** - just a web browser and Google account.

---

## Need Help?

- Google OAuth Setup: https://developers.google.com/identity/protocols/oauth2
- Vercel Deployment: https://vercel.com/docs
- Environment Variables: https://vitejs.dev/guide/env-and-mode.html
