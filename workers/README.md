# WizeLife Cloudflare Workers

Self-hosted edge proxies so we don't leak request bodies through public
CORS-proxy services.

## stock-proxy.js

Replaces `api.allorigins.win`, `corsproxy.io`, `api.codetabs.com` for
FinSight's Yahoo Finance / TASE / exchangerate-api calls.

### Allow-listed upstreams

- `query1.finance.yahoo.com`
- `query2.finance.yahoo.com`
- `mayaapi.tase.co.il`
- `api.exchangerate-api.com`

Anything else → `403`.

### Deploy

```bash
# from inside workers/
cd "TOTALIST/wizelife/workers"

# one-time: log in to your Cloudflare account
npx wrangler login

# deploy
npx wrangler deploy stock-proxy.js --name stock-proxy --compatibility-date 2025-01-01
```

Wrangler will prompt for the Cloudflare account ID the first time. After
that the Worker is reachable at:

```
https://stock-proxy.<your-subdomain>.workers.dev/?url=<encoded upstream>
```

### Optional: custom domain `stocks.wizelife.ai`

1. Cloudflare dashboard → Workers & Pages → `stock-proxy` → Settings →
   Triggers → "Add Custom Domain".
2. Enter `stocks.wizelife.ai`. CF auto-creates the DNS record (proxied,
   orange-cloud).
3. Wait ~30 seconds. The Worker is now also live at
   `https://stocks.wizelife.ai/?url=...`.

### Cut FinSight over after the Worker is healthy

In `finance dashboard/js/stock-api.js` the three public proxies are
hard-coded. Replace the array with a single entry pointing at the
Worker, e.g.:

```js
const CORS_PROXIES = [
  'https://stocks.wizelife.ai/?url=',
];
```

(or the `*.workers.dev` URL if no custom domain). Bump the SW cache
version so existing clients pick up the new file.

### Tuning

- `Cache-Control: public, max-age=60` on responses + `cf.cacheTtl: 60`
  on the upstream fetch — quote-heavy pages won't pound Yahoo every
  refresh.
- CORS: requests from `wizelife.ai`, `www.wizelife.ai`,
  `finsightai.github.io`, and local dev ports get an echoed
  `Access-Control-Allow-Origin`. Everyone else gets `*` (still works for
  un-credentialed GETs).
- Cookies and `Authorization` headers are stripped before forwarding —
  public market data, no reason to leak session state to Yahoo.
- On upstream failure: returns `502` with a JSON body, and logs the
  error to the Cloudflare Workers dashboard (Logs tab).
