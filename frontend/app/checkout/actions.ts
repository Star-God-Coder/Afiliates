'use server';

import { cookies } from 'next/headers';
import { AFFILIATE_COOKIE, API_URL } from '@/lib/affiliate';
import { getAuthHeaders } from '@/lib/auth';

export type CartItem = { productId: string; quantity: number };
export type CreatedOrder = { id: string; totalCents: number; status: string };

/**
 * Crea el pedido en el backend enviando el código del afiliado que trajo al cliente.
 * Úsalo desde tu botón de "Pagar" y, con el id devuelto, crea la sesión de pago
 * (p. ej. Stripe Checkout con metadata.orderId = order.id).
 */
export async function createOrder(items: CartItem[]): Promise<CreatedOrder> {
  const affiliateCode = (await cookies()).get(AFFILIATE_COOKIE)?.value;

  const res = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify({ items, affiliateCode }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`No se pudo crear el pedido (${res.status})`);

  return (await res.json()) as CreatedOrder;
}
