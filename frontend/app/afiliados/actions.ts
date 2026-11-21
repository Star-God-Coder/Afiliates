'use server';

import { revalidatePath } from 'next/cache';
import { API_URL } from '@/lib/affiliate';
import { getAuthHeaders } from '@/lib/auth';

export async function joinAffiliateProgram(): Promise<void> {
  const res = await fetch(`${API_URL}/affiliates/me`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`No se pudo completar el alta (${res.status})`);
  revalidatePath('/afiliados');
}
