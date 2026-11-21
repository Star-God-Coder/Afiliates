import { redirect } from 'next/navigation';
import { API_URL, buildAffiliateLink, formatMoney } from '@/lib/affiliate';
import { getAuthHeaders } from '@/lib/auth';
import { joinAffiliateProgram } from './actions';
import { CopyLinkButton } from './copy-link-button';

type AffiliateStats = {
  code: string;
  commissionPercent: number;
  status: 'active' | 'suspended';
  clicks: number;
  conversions: number;
  conversionRate: number;
  pendingCents: number;
  approvedCents: number;
  paidCents: number;
};

async function getStats(): Promise<AffiliateStats | null> {
  const res = await fetch(`${API_URL}/affiliates/me`, {
    headers: await getAuthHeaders(),
    cache: 'no-store',
  });
  if (res.status === 401) redirect('/login');
  if (res.status === 404) return null; // aún no es afiliado
  if (!res.ok) throw new Error(`Error ${res.status} al cargar las estadísticas`);
  return (await res.json()) as AffiliateStats;
}

export default async function AfiliadosPage() {
  const stats = await getStats();

  if (!stats) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <h1 className="text-2xl font-semibold">Programa de afiliados</h1>
        <p className="mt-2 text-gray-600">
          Comparte tu enlace y gana una comisión por cada compra que hagan las personas que entren
          con él.
        </p>
        <form action={joinAffiliateProgram} className="mt-6">
          <button className="rounded-lg bg-black px-4 py-2 font-medium text-white hover:bg-gray-800">
            Quiero ser afiliado
          </button>
        </form>
      </main>
    );
  }

  const link = buildAffiliateLink(stats.code);
  const cards = [
    { label: 'Clics', value: stats.clicks.toLocaleString('es') },
    { label: 'Ventas', value: stats.conversions.toLocaleString('es') },
    { label: 'Conversión', value: `${(stats.conversionRate * 100).toFixed(1)} %` },
    { label: 'Pendiente', value: formatMoney(stats.pendingCents), hint: 'En periodo de devoluciones' },
    { label: 'Disponible', value: formatMoney(stats.approvedCents), hint: 'Se paga en el próximo corte' },
    { label: 'Pagado', value: formatMoney(stats.paidCents) },
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Tu panel de afiliado</h1>
      <p className="mt-1 text-gray-600">
        Ganas un {stats.commissionPercent} % de cada compra hecha desde tu enlace.
      </p>
      {stats.status === 'suspended' && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Tu cuenta de afiliado está suspendida. Contacta con soporte.
        </p>
      )}

      <div className="mt-6 flex items-center gap-2 rounded-xl border p-2">
        <code className="min-w-0 flex-1 truncate px-2 text-sm">{link}</code>
        <CopyLinkButton link={link} />
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border p-4">
            <dt className="text-sm text-gray-500">{card.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{card.value}</dd>
            {card.hint && <p className="mt-1 text-xs text-gray-400">{card.hint}</p>}
          </div>
        ))}
      </dl>
    </main>
  );
}
