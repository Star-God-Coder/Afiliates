/** Parámetro del enlace: tusitio.com/?ref=CODIGO (si lo cambias, cámbialo también en el matcher de proxy.ts). */
export const REF_PARAM = 'ref';

/** Cookie donde se guarda el código del afiliado. */
export const AFFILIATE_COOKIE = 'aff_ref';

/** Ventana de atribución: cuánto tiempo cuenta la compra para el afiliado. */
export const AFFILIATE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 días

/**
 * last-click: si entra con el enlace de otro afiliado, gana el último (lo más habitual).
 * first-click: gana el primero que lo trajo mientras la cookie siga viva.
 */
export const ATTRIBUTION: 'last-click' | 'first-click' = 'last-click';

/** URL del backend NestJS (solo se usa en el servidor). */
export const API_URL = process.env.API_URL ?? 'http://localhost:3001';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export function buildAffiliateLink(code: string, path = '/'): string {
  const url = new URL(path, SITE_URL);
  url.searchParams.set(REF_PARAM, code);
  return url.toString();
}

export function formatMoney(cents: number, currency = 'USD', locale = 'es'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
}
