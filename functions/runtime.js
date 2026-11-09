export async function onRequest({ request }) {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  try {
    const upstream = await fetch('https://petforge-desktop.pages.dev/assets/PetForge.exe?v=2026.11.09-recovery-animals-r5', { redirect: 'manual', signal: AbortSignal.timeout(60000) });
    if (!upstream.ok || upstream.status >= 300) throw new Error('Runtime unavailable');
    return new Response(upstream.body, { headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': '11586504', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=3600', 'Content-Disposition': 'attachment; filename=PetForge.exe' } });
  } catch (_) { return new Response('Runtime temporarily unavailable', { status: 502, headers: { 'Cache-Control': 'no-store' } }); }
}
