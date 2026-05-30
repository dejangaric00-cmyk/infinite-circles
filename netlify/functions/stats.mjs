// netlify/functions/stats.mjs
// Proxy für Umami Analytics — API-Key bleibt server-side, nie im Browser.
// Erreichbar unter: /.netlify/functions/stats
// now.astro ruft /api/stats auf → netlify.toml leitet das weiter hierher.

const UMAMI_API = 'https://api.umami.is/v1';

export default async function handler(req, context) {
  const SITE_ID = Netlify.env.get('UMAMI_WEBSITE_ID');
  const API_KEY = Netlify.env.get('UMAMI_API_KEY');

  if (!API_KEY || !SITE_ID) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const now     = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const headers = { 'x-umami-api-key': API_KEY };

  try {
    const [statsRes, pagesRes] = await Promise.all([
      fetch(`${UMAMI_API}/websites/${SITE_ID}/stats?startAt=${weekAgo}&endAt=${now}`, { headers }),
      fetch(`${UMAMI_API}/websites/${SITE_ID}/metrics?startAt=${weekAgo}&endAt=${now}&type=url&limit=10`, { headers }),
    ]);

    const [stats, pages] = await Promise.all([
      statsRes.ok ? statsRes.json() : null,
      pagesRes.ok ? pagesRes.json() : null,
    ]);

    return new Response(JSON.stringify({ stats, pages }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // 5 Minuten CDN-Cache — Umami-Daten müssen nicht sekündlich aktuell sein
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Upstream fetch failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const config = {
  path: '/api/stats',
};
