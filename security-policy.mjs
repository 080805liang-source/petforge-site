import { createHash } from 'node:crypto';

export function contentSecurityPolicy(pages) {
  const hashes = [...new Set(pages.flatMap(html => [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes, content]) => !/\bsrc\s*=/.test(attributes) && content.trim())
    .map(([, , content]) => `'sha256-${createHash('sha256').update(content).digest('base64')}'`)))];
  return [
    "default-src 'none'", `script-src 'self' 'wasm-unsafe-eval' ${hashes.join(' ')}`,
    "script-src-attr 'none'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:",
    "font-src 'self'", "media-src 'self' blob:", "worker-src 'self' blob:",
    "connect-src 'self' https://cloud-paw-vip-cn-d0eub7r110788a3-1460995143.ap-shanghai.app.tcloudbase.com",
    "manifest-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'self'", "upgrade-insecure-requests"
  ].join('; ');
}

export function staticHeaders(csp) {
  return `/*
  Content-Security-Policy: ${csp}; frame-ancestors 'none'
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  Strict-Transport-Security: max-age=31536000

/admin.html
  Cache-Control: no-store
  X-Robots-Tag: noindex, nofollow

/sw.js
  Cache-Control: no-cache
`;
}
