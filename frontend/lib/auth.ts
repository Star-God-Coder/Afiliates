import { cookies } from 'next/headers';

/**
 * ⚠️ MARCADOR DE POSICIÓN.
 * Adáptalo a tu sistema de login (Auth.js, Clerk, cookie propia...).
 * Debe devolver las cabeceras con las que el backend NestJS reconoce al usuario.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = (await cookies()).get('access_token')?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
