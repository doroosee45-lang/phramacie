import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { dashboardService } from '../services/api';
import { TrendingUp, TrendingDown, Package, AlertTriangle, ShoppingBag, Users, Zap, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1, titleColor: '#e2e8f0', bodyColor: '#94a3b8', padding: 10 } },
  scales: {
    x: { ticks: { color: '#475569', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,.04)' } },
    y: { ticks: { color: '#475569', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,.04)' }, beginAtZero: false },
  },
};

const fmt = (n) => typeof n === 'number' ? n.toLocaleString('fr-DZ') : '—';
const fmtDA = (n) => `${fmt(n)} CDF`;

export default function DashboardPage() {
  const [salesDays, setSalesDays] = useState(7);

  const { data: kpiData, isLoading: kpiLoad, refetch: refetchKpi } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: () => dashboardService.kpis(),
    refetchInterval: 60_000,
  });
  const { data: chartData, isLoading: chartLoad } = useQuery({
    queryKey: ['sales-chart', salesDays],
    queryFn: () => dashboardService.salesChart(salesDays),
  });
  const { data: catData } = useQuery({
    queryKey: ['category-chart'],
    queryFn: () => dashboardService.categoryChart(),
  });
  const { data: topData } = useQuery({
    queryKey: ['top-products'],
    queryFn: () => dashboardService.topProducts({ limit: 8 }),
  });
  const { data: payData } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => dashboardService.paymentMethods(),
  });

  const kpis = kpiData?.data?.data;
  const salesChart = chartData?.data?.data || [];
  const categories = catData?.data?.data || [];
  const topProducts = topData?.data?.data || [];
  const payMethods = payData?.data?.data || [];

  // Sales line chart config
  const lineData = {
    labels: salesChart.map(d => format(new Date(d._id), salesDays <= 7 ? 'EEE dd' : 'dd MMM', { locale: fr })),
    datasets: [{
      label: 'Ventes CDF',
      data: salesChart.map(d => d.total),
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34,197,94,.08)',
      borderWidth: 2,
      pointBackgroundColor: '#22c55e',
      pointRadius: 3,
      pointHoverRadius: 5,
      fill: true,
      tension: .4,
    }],
  };

  // Category doughnut
  const CAT_COLORS = ['#3b82f6','#22c55e','#f59e0b','#a855f7','#06b6d4','#ef4444','#ec4899','#84cc16'];
  const catLabels = { antibiotique:'Antibiotiques', antalgique:'Antalgiques', cardiovasculaire:'Cardio', gastroentérologie:'Gastro', diabète:'Diabète', neurologie:'Neuro', respiratoire:'Respiratoire', parapharmacie:'Parapharmacie', autre:'Autre' };
  const donutData = {
    labels: categories.map(c => catLabels[c._id] || c._id),
    datasets: [{ data: categories.map(c => c.total), backgroundColor: CAT_COLORS, borderWidth: 0, hoverOffset: 6 }],
  };

  // Payment bar
  const PAY_LABELS = { espèces:'Espèces', carte:'Carte', mobile_money:'Mobile', chèque:'Chèque', crédit:'Crédit', virement:'Virement' };
  const barData = {
    labels: payMethods.map(p => PAY_LABELS[p._id] || p._id),
    datasets: [{
      data: payMethods.map(p => p.total),
      backgroundColor: ['#22c55e','#3b82f6','#a855f7','#f59e0b','#ef4444','#06b6d4'],
      borderRadius: 6,
    }],
  };

  if (kpiLoad) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-slate-400">
        <RefreshCw size={18} className="animate-spin" />
        <span className="text-sm">Chargement du tableau de bord...</span>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Tableau de bord</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {format(new Date(), "EEEE dd MMMM yyyy", { locale: fr })}
          </p>
        </div>
        <button onClick={() => refetchKpi()} className="btn-ghost btn-sm gap-2 self-start sm:self-auto">
          <RefreshCw size={13} /> Actualiser
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Ventes aujourd'hui"
          value={fmtDA(kpis?.sales?.today)}
          sub={`${fmt(kpis?.sales?.todayCount)} transactions`}
          trend={kpis?.sales?.todayVsYesterday}
          trendLabel="vs hier"
          color="emerald"
          icon={ShoppingBag}
        />
        <KpiCard
          label="CA ce mois"
          value={fmtDA(kpis?.sales?.month)}
          sub={`${fmt(kpis?.sales?.monthCount)} ventes`}
          trend={kpis?.sales?.monthVsLast}
          trendLabel="vs mois dernier"
          color="blue"
          icon={TrendingUp}
        />
        <KpiCard
          label="Valeur stock"
          value={fmtDA(kpis?.stock?.value)}
          sub={`${fmt(kpis?.stock?.productCount)} références`}
          color="purple"
          icon={Package}
        />
        <KpiCard
          label="Alertes actives"
          value={fmt(kpis?.alerts)}
          sub={`${fmt(kpis?.stock?.rupture)} ruptures · ${fmt(kpis?.stock?.expiring)} péremptions`}
          color="red"
          icon={AlertTriangle}
          urgent={kpis?.alerts > 0}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Ruptures', value: kpis?.stock?.rupture || 0, color: 'text-red-400', bg: 'bg-red-900/20 border-red-900' },
          { label: 'Stock bas', value: kpis?.stock?.lowStock || 0, color: 'text-amber-400', bg: 'bg-amber-900/20 border-amber-900' },
          { label: 'Péremptions J-30', value: kpis?.stock?.expiring || 0, color: 'text-orange-400', bg: 'bg-orange-900/20 border-orange-900' },
        ].map(item => (
          <div key={item.label} className={`flex items-center gap-4 p-4 rounded-xl border ${item.bg}`}>
            <div className={`text-3xl font-bold mono ${item.color}`}>{item.value}</div>
            <div className="text-sm text-slate-400">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales trend */}
        <div className="lg:col-span-2 card">
          <div className="card-header flex-col sm:flex-row items-start sm:items-center gap-2">
            <div>
              <div className="text-sm font-semibold text-slate-100">Évolution des ventes</div>
              <div className="text-xs text-slate-500 mt-0.5">Chiffre d'affaires en CDF</div>
            </div>
            <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
              {[7, 30, 90].map(d => (
                <button key={d} onClick={() => setSalesDays(d)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${salesDays === d ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}>
                  {d}j
                </button>
              ))}
            </div>
          </div>
          <div className="p-5">
            <div style={{ height: 220 }}>
              {salesChart.length > 0 ? (
                <Line data={lineData} options={{ ...CHART_DEFAULTS, scales: { ...CHART_DEFAULTS.scales, y: { ...CHART_DEFAULTS.scales.y, ticks: { ...CHART_DEFAULTS.scales.y.ticks, callback: v => `${(v/1000).toFixed(0)}K` } } } }} />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-600 text-sm">Aucune donnée de vente</div>
              )}
            </div>
          </div>
        </div>

        {/* Category donut */}
        <div className="card">
          <div className="card-header">
            <div className="text-sm font-semibold text-slate-100">Répartition</div>
          </div>
          <div className="p-5">
            {categories.length > 0 ? (
              <>
                <div style={{ height: 160 }}>
                  <Doughnut data={donutData} options={{ ...CHART_DEFAULTS, cutout: '68%', scales: undefined }} />
                </div>
                <div className="space-y-2 mt-4">
                  {categories.slice(0, 4).map((c, i) => (
                    <div key={c._id} className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CAT_COLORS[i] }} />
                      <span className="text-slate-400 flex-1 truncate">{catLabels[c._id] || c._id}</span>
                      <span className="text-slate-300 mono">{((c.total / categories.reduce((s,x)=>s+x.total,0))*100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <div className="flex items-center justify-center h-40 text-slate-600 text-sm">Aucune donnée</div>}
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top products */}
        <div className="card">
          <div className="card-header">
            <div className="text-sm font-semibold text-slate-100">Top produits (30j)</div>
            <span className="badge-blue">Par CA</span>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Produit</th>
                  <th>Qté</th>
                  <th>CA (CDF)</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.length > 0 ? topProducts.map((p, i) => (
                  <tr key={p._id}>
                    <td>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-900/50 text-amber-400' : i === 1 ? 'bg-slate-700 text-slate-300' : i === 2 ? 'bg-amber-900/30 text-amber-600' : 'text-slate-600'}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="col-main max-w-[140px] truncate">{p.name}</td>
                    <td className="mono text-slate-400">{fmt(p.qty)}</td>
                    <td className="mono text-emerald-400 font-medium">{fmt(Math.round(p.revenue))}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="text-center text-slate-600 py-8">Aucune vente enregistrée</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment methods */}
        <div className="card">
          <div className="card-header">
            <div className="text-sm font-semibold text-slate-100">Modes de paiement (30j)</div>
          </div>
          <div className="p-5">
            {payMethods.length > 0 ? (
              <div style={{ height: 200 }}>
                <Bar data={barData} options={{ ...CHART_DEFAULTS, scales: { ...CHART_DEFAULTS.scales, y: { ...CHART_DEFAULTS.scales.y, ticks: { ...CHART_DEFAULTS.scales.y.ticks, callback: v => `${(v/1000).toFixed(0)}K` } } } }} />
              </div>
            ) : (
              <div className="space-y-3">
                {[['Espèces', 60, 'bg-emerald-500'], ['Carte', 25, 'bg-blue-500'], ['Mobile', 10, 'bg-purple-500'], ['Autres', 5, 'bg-slate-600']].map(([l, p, c]) => (
                  <div key={l}>
                    <div className="flex justify-between text-xs mb-1"><span className="text-slate-400">{l}</span><span className="text-slate-300 mono">{p}%</span></div>
                    <div className="progress"><div className={`progress-fill ${c}`} style={{ width: `${p}%` }} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, trend, trendLabel, color, icon: Icon, urgent }) {
  const colors = {
    emerald: { accent: 'border-t-emerald-500', iconBg: 'bg-emerald-900/30', iconColor: 'text-emerald-400' },
    blue:    { accent: 'border-t-blue-500',    iconBg: 'bg-blue-900/30',    iconColor: 'text-blue-400' },
    purple:  { accent: 'border-t-purple-500',  iconBg: 'bg-purple-900/30',  iconColor: 'text-purple-400' },
    red:     { accent: 'border-t-red-500',      iconBg: 'bg-red-900/30',     iconColor: 'text-red-400' },
  }[color] || {};

  return (
    <div className={`kpi-card ${urgent ? 'border-red-900/50' : ''}`}>
      <div className={`h-0.5 w-full ${colors.accent?.replace('border-t-','')} ${colors.accent ? '' : ''}`} style={{ background: { emerald:'#22c55e', blue:'#3b82f6', purple:'#a855f7', red:'#ef4444' }[color] }} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
          <div className={`w-8 h-8 rounded-lg ${colors.iconBg} flex items-center justify-center`}>
            <Icon size={15} className={colors.iconColor} />
          </div>
        </div>
        <div className="text-2xl font-bold text-slate-100 mono tracking-tight">{value}</div>
        <div className="flex items-center gap-2 mt-2">
          {trend !== undefined && (
            <span className={`flex items-center gap-1 text-xs font-medium ${parseFloat(trend) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {parseFloat(trend) >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {Math.abs(parseFloat(trend))}% {trendLabel}
            </span>
          )}
          {sub && <span className="text-xs text-slate-600">{trend !== undefined ? '·' : ''} {sub}</span>}
        </div>
      </div>
    </div>
  );
}
