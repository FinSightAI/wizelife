/**
 * WizeLife stock-data CORS proxy (Cloudflare Worker)
 *
 * Replaces public proxies (allorigins / corsproxy / codetabs) so request
 * bodies aren't visible to a 3rd party. Only allow-listed upstream hosts
 * are forwarded; everything else returns 403.
 *
 * Deploy:
 *   npx wrangler deploy stock-proxy.js
 *
 * Call from FinSight:
 *   https://stock-proxy.<your-subdomain>.workers.dev/?url=<encoded upstream URL>
 *   (or stocks.wizelife.ai/?url=... if a custom domain is mapped)
 */

// Upstream hosts we're willing to proxy. Anything else => 403.
const ALLOWED_HOSTS = new Set([
  'query1.finance.yahoo.com',
  'query2.finance.yahoo.com',
  'mayaapi.tase.co.il',
  'api.exchangerate-api.com',
]);

// Browser origins we want to send back as Access-Control-Allow-Origin.
// Anything not in this list still gets a working preflight (`*`), but
// authenticated/CORS-credentialed requests will be rejected by the browser.
const ALLOWED_ORIGINS = new Set([
  'https://wizelife.ai',
  'https://www.wizelife.ai',
  'https://finsightai.github.io',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://127.0.0.1:5500',
]);

function corsHeaders(origin) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : '*';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'GET') {
      return new Response('Method not allowed', {
        status: 405,
        headers: cors,
      });
    }

    const reqUrl = new URL(request.url);
    const target = reqUrl.searchParams.get('url');
    if (!target) {
      return new Response('Missing ?url= parameter', {
        status: 400,
        headers: cors,
      });
    }

    let upstream;
    try {
      upstream = new URL(target);
    } catch {
      return new Response('Invalid url parameter', {
        status: 400,
        headers: cors,
      });
    }

    if (upstream.protocol !== 'https:') {
      return new Response('Only https upstreams allowed', {
        status: 400,
        headers: cors,
      });
    }

    if (!ALLOWED_HOSTS.has(upstream.hostname)) {
      return new Response(`Host not allowed: ${upstream.hostname}`, {
        status: 403,
        headers: cors,
      });
    }

    // Build a stripped request — public market data, no cookies/auth needed
    // upstream, and we don't want to leak the caller's session to Yahoo.
    const upstreamReq = new Request(upstream.toString(), {
      method: 'GET',
      headers: {
        // Yahoo serves JSON to a normal-looking UA; some endpoints 403 on
        // blank UAs.
        'User-Agent': 'Mozilla/5.0 (compatible; WizeLife-Proxy/1.0)',
        'Accept': 'application/json, text/plain, */*',
      },
      redirect: 'follow',
    });

    try {
      const upstreamRes = await fetch(upstreamReq, {
        cf: { cacheTtl: 60, cacheEverything: true },
      });

      const contentType =
        upstreamRes.headers.get('Content-Type') || 'application/json';

      const headers = {
        ...cors,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=60',
        'X-Proxy-Upstream-Status': String(upstreamRes.status),
      };

      // Pass the body through verbatim. We don't need to clone — Workers
      // can stream the upstream body directly.
      return new Response(upstreamRes.body, {
        status: upstreamRes.status,
        headers,
      });
    } catch (err) {
      // Visible in Cloudflare dashboard → Workers → Logs.
      console.error('upstream fetch failed', upstream.toString(), err);
      return new Response(
        JSON.stringify({ error: 'upstream_failure', message: String(err) }),
        {
          status: 502,
          headers: { ...cors, 'Content-Type': 'application/json' },
        }
      );
    }
  },
};
