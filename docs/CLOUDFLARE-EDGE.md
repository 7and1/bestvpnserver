# Cloudflare Edge Setup (DNS + WAF + Bot Protection)

## DNS

1. Add your domain to Cloudflare and update nameservers at your registrar.
2. In **Workers & Pages**, attach a custom domain to the deployed OpenNext worker (apex + `www`).
3. Ensure DNS records are **proxied** (orange cloud) for CDN/WAF.

## WAF (managed rules)

Enable Cloudflare Managed Rules and OWASP in **Security → WAF → Managed rules**.
Account-level managed rulesets require Enterprise; use zone-level managed rules on non-Enterprise plans.

## WAF (custom rules)

Recommended rule ideas:

- Block common CMS probes: `/wp-login.php`, `/xmlrpc.php`, `/wp-admin/`
- Block env/secret scraping: `/.env`, `/.git`, `/.svn`
- Block known bad user agents (optional)

## Rate limiting

Add a rate limiting rule for `/api/*` and `/api/webhooks/*` to reduce abuse.
Note: the current WAF rate limiting rules require Enterprise access, so rely on application-level rate limiting if unavailable.

## Bot protection

Enable **Bot Fight Mode** (free) or **Super Bot Fight Mode** (Pro) in **Security → Bots**.
