# Documentation Site Deployment - docs.infershield.dev

**Product ID:** prod_infershield_001  
**Site URL:** https://docs.infershield.dev  
**Source:** `/docs` folder in infershield repository  
**Deployment:** GitHub Pages  
**Configured:** 2026-03-03 16:52 UTC  
**Status:** PENDING DNS CONFIGURATION

---

## Configuration

**Repository:** github.com/InferShield/infershield  
**Branch:** main  
**Source Path:** /docs  
**Custom Domain:** docs.infershield.dev  
**HTTPS:** Pending (will be enabled after DNS propagation)

**DNS Configuration:**
- Type: CNAME
- Name: docs
- Value: infershield.github.io
- Status: ⏳ PENDING USER ACTION

**GitHub Pages Settings:**
- Build type: Legacy (Jekyll/static)
- Source: Branch `main`, folder `/docs`
- Custom domain: docs.infershield.dev
- HTTPS enforced: Pending DNS propagation
- Build status: ✅ In progress (triggered 2026-03-03 16:52 UTC)

---

## Deployment Process

**Initial Setup (2026-03-03):**
1. ✅ Verified repository structure (`/docs` folder exists)
2. ✅ GitHub Pages already configured (previously: infershield.io)
3. ✅ Updated CNAME file: docs.infershield.dev
4. ✅ Committed and pushed CNAME change (commit: f87c5f6)
5. ✅ Updated GitHub Pages custom domain via API
6. ✅ Triggered GitHub Pages rebuild
7. ⏳ DNS CNAME record creation (USER ACTION REQUIRED)
8. ⏳ HTTPS enforcement (pending DNS propagation)
9. ⏳ Deployment verification

**Update Process:**
Any changes pushed to `/docs` folder in `main` branch automatically trigger redeployment:
1. Edit files in `/docs`
2. Commit and push to `main`
3. GitHub Pages automatically rebuilds (2-5 minutes)
4. Changes live at docs.infershield.dev

---

## DNS Configuration

**See:** [DNS_CONFIGURATION.md](./DNS_CONFIGURATION.md)

**Required Action:**
Add DNS CNAME record pointing `docs.infershield.dev` to `infershield.github.io`

**Verification:**
```bash
dig docs.infershield.dev
# Expected: CNAME record → infershield.github.io

curl -I https://docs.infershield.dev/
# Expected: HTTP 200 OK (after DNS propagates)
```

---

## Site Content

Documentation site includes:

**User Guides:**
- QUICKSTART.md - Getting started guide
- QUICKSTART_WINDOWS.md - Windows-specific setup
- MANUAL_INTEGRATION.md - Manual integration steps
- IDE_INTEGRATION.md - IDE/editor integration

**Security & Privacy:**
- SECURITY_OAUTH_TOKENS.md - OAuth security architecture
- OAUTH_SETUP.md - OAuth configuration guide
- OAUTH_ARCHITECTURE.md - OAuth implementation details
- PII_REDACTION.md - PII handling and redaction
- THREAT_MODEL.md - Security threat analysis
- PRIVACY_POLICY.md - Privacy policy
- TERMS_OF_SERVICE.md - Terms of service

**Attack Intelligence:**
- ATTACK_CATALOG.md - Known attack patterns
- ATTACK_SCENARIO_CROSS_STEP.md - Cross-step attack scenarios

**Deployment:**
- deployment/ - Deployment guides and configuration

---

## Verification Checklist

- [x] GitHub Pages enabled on repository
- [x] Source configured: `/docs` folder on `main` branch
- [x] CNAME file created in `/docs` folder
- [x] Custom domain configured: docs.infershield.dev
- [ ] DNS CNAME record added (PENDING USER ACTION)
- [ ] DNS propagation complete (5-60 minutes)
- [ ] Site accessible at https://docs.infershield.dev
- [ ] HTTPS enforcement enabled
- [ ] HTTPS certificate valid
- [ ] Deployment documentation committed

**Current Status:** PENDING DNS CONFIGURATION

---

## Post-DNS Steps

After DNS CNAME record is added and propagates:

1. **Verify DNS Resolution:**
   ```bash
   dig docs.infershield.dev
   nslookup docs.infershield.dev
   ```

2. **Test Site Accessibility:**
   ```bash
   curl -I http://docs.infershield.dev/
   # Should return HTTP 200 OK
   ```

3. **Enable HTTPS Enforcement:**
   ```bash
   # Wait 10-30 minutes for HTTPS certificate provisioning
   gh api -X PATCH /repos/InferShield/infershield/pages \
     -f https_enforced=true
   ```

4. **Verify HTTPS:**
   ```bash
   curl -I https://docs.infershield.dev/
   # Should return HTTP 200 OK with valid certificate
   ```

5. **Update this document with final status**

---

## Troubleshooting

**If site not accessible:**
1. Check GitHub Pages deployment status: `gh run list --workflow=pages-build-deployment`
2. Verify DNS propagation: `dig docs.infershield.dev`
3. Check CNAME file exists: `cat docs/CNAME`
4. Check GitHub Pages settings: `gh api repos/InferShield/infershield/pages`
5. View build logs: `gh run view --log`

**DNS propagation time:** 5-60 minutes (typically)  
**GitHub Pages build time:** 2-5 minutes  
**HTTPS certificate provisioning:** 10-30 minutes after DNS propagates

**Common Issues:**

- **404 Not Found:** DNS not propagated yet or CNAME record incorrect
- **HTTPS not available:** Certificate still provisioning (wait 30 minutes)
- **Build failed:** Check workflow logs for errors
- **Old content showing:** Clear browser cache or wait for CDN refresh

---

## Maintenance

**Content updates:** Edit files in `/docs`, commit, push → auto-deploys  
**DNS changes:** Update CNAME record at domain registrar  
**HTTPS renewal:** Automatic via GitHub Pages (Let's Encrypt)  
**Domain change:** Update `docs/CNAME` file and GitHub Pages settings

---

## Rollback Procedure

If critical issues arise:

```bash
cd ~/.openclaw/workspace/infershield/docs
echo "infershield.io" > CNAME
git add CNAME
git commit -m "docs: emergency rollback to infershield.io"
git push origin main

gh api -X PUT /repos/InferShield/infershield/pages -f cname=infershield.io
```

---

**Deployed By:** DevOps Agent (Subagent)  
**Configuration Date:** 2026-03-03 16:52 UTC  
**Deployment Status:** PENDING DNS CONFIGURATION ⏳  
**Target Go-Live:** Before 2026-03-06 00:00 UTC  
**Priority:** P0 (PRE-LAUNCH INFRASTRUCTURE)
