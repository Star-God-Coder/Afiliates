// Next.js 16+: este archivo se llama proxy.ts y exporta `proxy`.
// En Next.js 15 o anterior, renómbralo a middleware.ts y la función a `middleware`.
import { NextResponse, type NextRequest } from 'next/server';
import {
  AFFILIATE_COOKIE,
  AFFILIATE_COOKIE_MAX_AGE,
  API_URL,
  ATTRIBUTION,
  REF_PARAM,
} from './lib/affiliate';

const CODE_REGEX = /^[a-z0-9_-]{3,32}$/;

export async function proxy(request: NextRequest) {
  const code = request.nextUrl.searchParams.get(REF_PARAM)?.trim().toLowerCase();
  if (!code) return NextResponse.next();

  // Redirigimos a la misma URL sin ?ref= (URLs limpias y sin contenido duplicado para Google).
  const cleanUrl = request.nextUrl.clone();
  cleanUrl.searchParams.delete(REF_PARAM);
  const response = NextResponse.redirect(cleanUrl);

  if (!CODE_REGEX.test(code)) return response;

  // Registramos el clic siempre (estadísticas), y el backend nos dice si el código existe.
  const valid = await registerClick(request, code);
  if (!valid) return response;

  const alreadyReferred = request.cookies.has(AFFILIATE_COOKIE);
  if (ATTRIBUTION === 'first-click' && alreadyReferred) return response;

  response.cookies.set(AFFILIATE_COOKIE, code, {
    maxAge: AFFILIATE_COOKIE_MAX_AGE,
    httpOnly: true, // el navegador no puede leerla ni modificarla con JS
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  return response;
}

async function registerClick(request: NextRequest, code: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/affiliates/clicks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code,
        landingPath: request.nextUrl.pathname.slice(0, 512),
        ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim().slice(0, 64),
        userAgent: request.headers.get('user-agent')?.slice(0, 512),
      }),
      signal: AbortSignal.timeout(1500),
    });
    // Si el backend está caído (5xx), guardamos la cookie igualmente:
    // el código se vuelve a validar al crear el pedido.
    if (!res.ok) return res.status >= 500;
    const data = (await res.json()) as { valid: boolean };
    return data.valid;
  } catch {
    return true;
  }
}

export const config = {
  // Solo se ejecuta en páginas que llegan con ?ref=, así no añade latencia al resto.
  // Si ya tienes un proxy.ts (p. ej. para auth), une ambas lógicas en un solo archivo.
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      has: [{ type: 'query', key: 'ref' }],
    },
  ],
};
