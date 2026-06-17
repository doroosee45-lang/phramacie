import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js';
import { financeService } from '../services/api';
import { subscribeToSales } from '../services/socketService';
import { Wallet, TrendingUp, TrendingDown, RefreshCcw, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const fmt = (n) => Math.round(n || 0).toLocaleString('fr-DZ');
const fmtDA = (n) => `${fmt(n)} CDF`;

export default function FinancePage() {
  const qc = useQueryClient();

  const { data: summaryData, isLoading } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: () => financeService.summary(),
  });
  const { data: trendData } = useQuery({
    queryKey: ['finance-trend'],
    queryFn: () => financeService.trend(14),
  });
  const { data: ledgerData } = useQuery({
    queryKey: ['finance-ledger'],
    queryFn: () => financeService.ledger({ limit: 15 }),
  });

  // Live update on every sale — matches the socket pattern already used for alerts/dashboard
  useEffect(() => {
    const unsub = subscribeToSales(() => {
      qc.invalidateQueries(['finance-summary']);
      qc.invalidateQueries(['finance-trend']);
      qc.invalidateQueries(['finance-ledger']);
    });
    return () => unsub?.();
  }, [qc]);

  const s = summaryData?.data?.data;
  const trend = trendData?.data?.data || [];
  const ledger = ledgerData?.data?.data || [];

  const lineData = {
    labels: trend.map(d => format(new Date(d.date), 'dd MMM', { locale: fr })),
    datasets: [
      { label: 'Revenu', data: trend.map(d => d.revenue), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,.08)', borderWidth: 2, pointRadius: 2, fill: true, tension: .4 },
      { label: 'Bénéfice', data: trend.map(d => d.profit), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,.06)', borderWidth: 2, pointRadius: 2, fill: true, tension: .4 },
    ],
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-slate-400">
        <RefreshCcw size={18} className="animate-spin" />
        <span className="text-sm">Chargement des données financières...</span>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Finance</h1>
          <p className="text-sm text-slate-500 mt-0.5">Mise à jour automatique à chaque vente</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-900/20 border border-emerald-900/40 rounded-lg px-3 py-1.5 self-start sm:self-auto">
          <Zap size={12} className="animate-pulse" /> Live
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <FinanceCard label="Aujourd'hui" data={s?.today} color="emerald" />
        <FinanceCard label="7 derniers jours" data={s?.week} color="blue" />
        <FinanceCard label="Ce mois" data={s?.month} color="purple" />
        <FinanceCard label="Cette année" data={s?.year} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card">
          <div className="card-header">
            <div>
              <div className="text-sm font-semibold text-slate-100">Revenu vs bénéfice</div>
              <div className="text-xs text-slate-500 mt-0.5">14 derniers jours, en CDF</div>
            </div>
          </div>
          <div className="p-5">
            <div style={{ height: 240 }}>
              {trend.length > 0 ? (
                <Line data={lineData} options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: true, labels: { color: '#94a3b8', boxWidth: 10, font: { size: 11 } } }, tooltip: { backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1, titleColor: '#e2e8f0', bodyColor: '#94a3b8', padding: 10 } },
                  scales: {
                    x: { ticks: { color: '#475569', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,.04)' } },
                    y: { ticks: { color: '#475569', font: { size: 11 }, callback: v => `${(v/1000).toFixed(0)}K` }, grid: { color: 'rgba(255,255,255,.04)' } },
                  },
                }} />
              ) : <div className="flex items-center justify-center h-full text-slate-600 text-sm">Aucune donnée</div>}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="text-sm font-semibold text-slate-100">Remboursements (mois)</div></div>
          <div className="p-5 space-y-3">
            <div className="text-2xl font-bold mono text-red-400">{fmtDA(s?.refunds?.total)}</div>
            <div className="text-xs text-slate-500">{s?.refunds?.count || 0} vente(s) remboursée(s)</div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="card-header"><div className="text-sm font-semibold text-slate-100">Transactions récentes</div></div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr><th>N° Vente</th><th>Caissier</th><th>Client</th><th>Paiement</th><th>Statut</th><th>Total</th></tr>
            </thead>
            <tbody>
              {ledger.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-slate-600 py-8">Aucune transaction</td></tr>
              ) : ledger.map(s => (
                <tr key={s._id}>
                  <td className="mono text-xs text-slate-300">{s.saleNumber}</td>
                  <td className="text-xs text-slate-400">{s.cashier ? `${s.cashier.firstName} ${s.cashier.lastName}` : '—'}</td>
                  <td className="text-xs text-slate-400">{s.client ? `${s.client.firstName} ${s.client.lastName}` : '—'}</td>
                  <td className="text-xs text-slate-400 capitalize">{s.paymentMethod}</td>
                  <td>{s.status === 'remboursé' ? <span className="badge-red">Remboursé</span> : <span className="badge-green">Complété</span>}</td>
                  <td className="mono text-sm font-medium text-slate-100">{fmtDA(s.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FinanceCard({ label, data, color }) {
  const colors = { emerald: '#22c55e', blue: '#3b82f6', purple: '#a855f7', amber: '#f59e0b' }[color];
  const profit = data?.profit || 0;
  return (
    <div className="kpi-card">
      <div className="h-0.5 w-full" style={{ background: colors }} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${colors}26` }}>
            <Wallet size={15} style={{ color: colors }} />
          </div>
        </div>
        <div className="text-xl font-bold text-slate-100 mono tracking-tight">{fmtDA(data?.revenue)}</div>
        <div className="flex items-center gap-1.5 mt-2 text-xs">
          {profit >= 0 ? <TrendingUp size={11} className="text-emerald-400" /> : <TrendingDown size={11} className="text-red-400" />}
          <span className={profit >= 0 ? 'text-emerald-400' : 'text-red-400'}>{fmtDA(profit)} bénéfice</span>
          <span className="text-slate-600">· {data?.margin || 0}%</span>
        </div>
      </div>
    </div>
  );
}
