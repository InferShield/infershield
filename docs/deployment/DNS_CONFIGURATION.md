# DNS Configuration Required for docs.infershield.io

**Product ID:** prod_infershield_001  
**Priority:** P0 - BLOCKING DEPLOYMENT  
**Created:** 2026-03-03 16:51 UTC  
**Status:** PENDING USER ACTION

---

## Required DNS Record

To complete GitHub Pages setup for `docs.infershield.io`, add the following DNS record:

**Domain:** infershield.io  
**Record Type:** CNAME  
**Name:** docs  
**Value:** infershield.github.io  
**TTL:** 3600 (1 hour recommended)

**Full Domain Resolution:** docs.infershield.io → infershield.github.io

---

## DNS Provider Instructions

### If using Cloudflare:
1. Log in to Cloudflare dashboard
2. Select domain: infershield.io
3. Navigate to DNS → Records
4. Click "Add record"
5. Type: CNAME
6. Name: docs
7. Target: infershield.github.io
8. Proxy status: DNS only (gray cloud)
9. TTL: Auto
10. Save

### If using AWS Route 53:
```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id <ZONE_ID> \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "docs.infershield.io",
        "Type": "CNAME",
        "TTL": 3600,
        "ResourceRecords": [{"Value": "infershield.github.io"}]
      }
    }]
  }'
```

### If using GCP Cloud DNS:
```bash
gcloud dns record-sets create docs.infershield.io. \
  --rrdatas="infershield.github.io." \
  --type=CNAME \
  --ttl=3600 \
  --zone=<ZONE_NAME>
```

### If using Namecheap/GoDaddy/Generic:
1. Log in to domain registrar
2. Navigate to DNS management for infershield.io
3. Add new record:
   - Type: CNAME
   - Host: docs
   - Value: infershield.github.io
   - TTL: 3600
4. Save changes

---

## Verification Commands

After adding DNS record, verify propagation:

```bash
# Check DNS resolution
dig docs.infershield.io

# Expected output:
# docs.infershield.io.  3600  IN  CNAME  infershield.github.io.

# Alternative check
nslookup docs.infershield.io

# Test with curl (after propagation)
curl -I https://docs.infershield.io/
```

---

## Timeline

**DNS Propagation:** 5-60 minutes (typically 15-30 minutes)  
**HTTPS Certificate:** Automatically provisioned by GitHub after DNS propagates (10-30 minutes)  
**Total Time:** 30-90 minutes from DNS record creation to full HTTPS availability

---

## Current Status

**GitHub Pages Configuration:**
- ✅ Repository: InferShield/infershield
- ✅ Source: `/docs` folder on `main` branch
- ✅ Custom domain configured: docs.infershield.io
- ✅ CNAME file created and committed
- ⏳ Status: Building (triggered by CNAME change)
- ⏳ DNS: Awaiting CNAME record creation
- ⏳ HTTPS: Will be enabled after DNS propagation

**Next Steps:**
1. Add DNS CNAME record (USER ACTION REQUIRED)
2. Wait for DNS propagation (5-60 minutes)
3. Verify site accessibility
4. Enable HTTPS enforcement
5. Update deployment documentation

---

## Rollback Instructions

If needed to revert to original configuration (infershield.io):

```bash
cd ~/.openclaw/workspace/infershield/docs
echo "infershield.io" > CNAME
git add CNAME
git commit -m "docs: revert to infershield.io domain"
git push origin main

gh api -X PUT /repos/InferShield/infershield/pages -f cname=infershield.io
```

---

**Point of Contact:** DevOps Agent  
**Escalation:** CEO (if DNS access unavailable or delayed)
