import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { archiveService } from '../services/api';
import { Archive as ArchiveIcon, Lock, ShieldCheck } from 'lucide-react';

const fmt = (n) => Math.round(n || 0).toLocaleString('fr-DZ');
const fmtDA = (n) => `${fmt(n)} CDF`;
const ROLE_LABELS = { super_admin: 'Super Admin', admin: 'Admin', pharmacist: 'Pharmacien' };

export default function ArchivePage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['archive', page],
    queryFn: () => archiveService.getAll({ page, limit: 25 }),
    keepPreviousData: true,
  });
  const { data: summaryData } = useQuery({ queryKey: ['archive-summary'], queryFn: archiveService.summary });

  const archives = data?.data?.data || [];
  const total = data?.data?.total || 0;
  const pages = data?.data?.pages || 1;
  const byRole = summaryData?.data?.data?.byRole || [];

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 flex items-center gap-2"><ArchiveIcon size={18} /> Archivage</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} opération(s) de vente archivées automatiquement</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-purple-300 bg-purple-900/20 border border-purple-900/40 rounded-lg px-3 py-1.5 self-start sm:self-auto">
          <Lock size={12} /> Visible par Super Admin uniquement
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {byRole.map(r => (
          <div key={r._id} className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-900/30 flex items-center justify-center text-purple-400 flex-shrink-0">
              <ShieldCheck size={16} />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-100">{ROLE_LABELS[r._id] || r._id}</div>
              <div className="text-xs text-slate-500">{r.count} opération(s) · {fmtDA(r.total)}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-600 text-sm">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>N° Vente</th>
                  <th>Effectuée par</th>
                  <th>Rôle</th>
                  <th>Client</th>
                  <th>Articles</th>
                  <th>Paiement</th>
                  <th>Total</th>
                  <th>Archivé le</th>
                </tr>
              </thead>
              <tbody>
                {archives.length === 0 ? (
                  <tr><td colSpan={8} className="text-center text-slate-600 py-12">Aucune opération archivée</td></tr>
                ) : archives.map(a => (
                  <tr key={a._id}>
                    <td className="mono text-xs text-slate-300">{a.saleNumber}</td>
                    <td className="text-xs text-slate-200">{a.performedByName}</td>
                    <td><span className="badge-slate capitalize">{ROLE_LABELS[a.performedByRole] || a.performedByRole}</span></td>
                    <td className="text-xs text-slate-400">{a.client ? `${a.client.firstName} ${a.client.lastName}` : '—'}</td>
                    <td className="text-xs text-slate-400">{a.itemsCount}</td>
                    <td className="text-xs text-slate-400 capitalize">{a.paymentMethod}</td>
                    <td className="mono text-sm font-medium text-slate-100">{fmtDA(a.total)}</td>
                    <td className="text-xs text-slate-500">{new Date(a.archivedAt).toLocaleString('fr-DZ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <span className="text-xs text-slate-500">{total} opérations · Page {page}/{pages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="btn-ghost btn-sm">← Préc.</button>
              <button onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page === pages} className="btn-ghost btn-sm">Suiv. →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
