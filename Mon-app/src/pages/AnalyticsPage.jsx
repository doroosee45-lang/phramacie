import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { analyticsService } from '../services/api';
import { Brain, AlertTriangle, Shield, Zap } from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, Line, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

// ── Recharts theme — mirrors the Chart.js palette used on Dashboard/Finance ───
const RC_GRID = 'rgba(255,255,255,.06)';
const RC_AXIS = '#475569';
const RC_TOOLTIP = { contentStyle: { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }, labelStyle: { color: '#e2e8f0' }, itemStyle: { color: '#94a3b8' } };
const RC_COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4'];

export default function AnalyticsPage() {
  const [aiQuery, setAiQuery] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [weeksRange, setWeeksRange] = useState(8);

  const { data: forecastData } = useQuery({ queryKey:['rupture-forecast'], queryFn: analyticsService.ruptureForecast });
  const { data: anomalyData }  = useQuery({ queryKey:['anomalies'], queryFn: analyticsService.anomalies });
  const { data: trendsData }   = useQuery({ queryKey:['consumption-trends', weeksRange], queryFn: () => analyticsService.trends(weeksRange) });
  const forecasts = forecastData?.data?.data || [];
  const anomalies = anomalyData?.data?.data || [];
  const trends = trendsData?.data?.data || [];
  const RISK_COLORS = { critique:'text-red-400 bg-red-900/20', élevé:'text-amber-400 bg-amber-900/20', moyen:'text-orange-400 bg-orange-900/20', faible:'text-emerald-400 bg-emerald-900/20' };

  // Aggregate the raw per-product/per-week rows into a weekly revenue+quantity trend
  const weeklyMap = new Map();
  trends.forEach(t => {
    const key = `${t._id.year}-${t._id.week}`;
    if (!weeklyMap.has(key)) weeklyMap.set(key, { year: t._id.year, week: t._id.week, qty: 0, revenue: 0 });
    const w = weeklyMap.get(key);
    w.qty += t.qty;
    w.revenue += t.revenue;
  });
  const weeklyTrend = Array.from(weeklyMap.values())
    .sort((a, b) => a.year - b.year || a.week - b.week)
    .map(w => ({ label: `S${w.week}`, qty: w.qty, revenue: Math.round(w.revenue) }));

  // Aggregate by product to find the top sellers over the selected period
  const productMap = new Map();
  trends.forEach(t => {
    const key = t._id.product?.toString() || t._id.name;
    if (!productMap.has(key)) productMap.set(key, { name: t._id.name, qty: 0, revenue: 0 });
    const p = productMap.get(key);
    p.qty += t.qty;
    p.revenue += t.revenue;
  });
  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)
    .map(p => ({ ...p, revenue: Math.round(p.revenue) }));

  const runAI = async () => {
    if (!aiQuery) return;
    setAiLoading(true);
    try {
      const res = await analyticsService.aiSuggest({ type: 'generic', context: { productName: aiQuery, dci: aiQuery } });
      setAiResult(res.data?.data);
    } catch { toast.error('Erreur IA'); }
    finally { setAiLoading(false); }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div><h1 className="text-xl font-semibold text-slate-100">Analytics IA</h1><p className="text-sm text-slate-500 mt-0.5">Prédictions et détection d'anomalies — Claude API</p></div>
        <div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse-slow" /><span className="text-xs text-slate-500">Modèle actif</span></div>
      </div>

      {/* AI Suggestions */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Brain size={16} className="text-purple-400" />
          <h3 className="text-sm font-semibold text-slate-100">Suggestions Génériques (IA)</h3>
          <span className="badge-purple">Claude API</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input className="input flex-1" placeholder="Entrez un nom de médicament pour obtenir des alternatives génériques..." value={aiQuery} onChange={e=>setAiQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&runAI()} />
          <button onClick={runAI} disabled={!aiQuery||aiLoading} className="btn-primary justify-center">
            {aiLoading ? <span className="flex items-center gap-2"><span className="animate-spin">↻</span>Analyse...</span> : <span className="flex items-center gap-2"><Zap size={14}/>Analyser</span>}
          </button>
        </div>
        {aiResult && (
          <div className="mt-4 bg-slate-800 rounded-xl p-4">
            <div className="text-xs text-purple-400 font-medium mb-2">Réponse Claude AI</div>
            <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">{typeof aiResult === 'string' ? aiResult : JSON.stringify(aiResult, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Consumption trend (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card">
          <div className="card-header flex-col sm:flex-row items-start sm:items-center gap-2">
            <div>
              <div className="text-sm font-semibold text-slate-100">Tendance de consommation</div>
              <div className="text-xs text-slate-500 mt-0.5">Revenu et quantité vendue par semaine</div>
            </div>
            <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
              {[4, 8, 12].map(w => (
                <button key={w} onClick={() => setWeeksRange(w)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${weeksRange === w ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}>
                  {w}sem
                </button>
              ))}
            </div>
          </div>
          <div className="p-5">
            <div style={{ height: 240 }}>
              {weeklyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={weeklyTrend} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={RC_GRID} vertical={false} />
                    <XAxis dataKey="label" stroke={RC_AXIS} fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="revenue" stroke={RC_AXIS} fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                    <YAxis yAxisId="qty" orientation="right" stroke={RC_AXIS} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip {...RC_TOOLTIP} formatter={(v, name) => name === 'Revenu (CDF)' ? [`${v.toLocaleString()} DA`, name] : [v, name]} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                    <Bar yAxisId="revenue" dataKey="revenue" name="Revenu (CDF)" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={26} />
                    <Line yAxisId="qty" dataKey="qty" name="Quantité vendue" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : <div className="flex items-center justify-center h-full text-slate-600 text-sm">Aucune donnée de consommation</div>}
            </div>
          </div>
        </div>

        {/* Top products by revenue */}
        <div className="card">
          <div className="card-header"><div className="text-sm font-semibold text-slate-100">Top produits (période)</div></div>
          <div className="p-5">
            <div style={{ height: 240 }}>
              {topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical" margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={RC_GRID} horizontal={false} />
                    <XAxis type="number" stroke={RC_AXIS} fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} width={90} tickLine={false} axisLine={false} tick={{ width: 85 }} />
                    <Tooltip {...RC_TOOLTIP} formatter={v => [`${v.toLocaleString()} CDF`, 'Revenu']} />
                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={16}>
                      {topProducts.map((_, i) => <Cell key={i} fill={RC_COLORS[i % RC_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="flex items-center justify-center h-full text-slate-600 text-sm">Aucune donnée</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Rupture forecast */}
        <div className="card overflow-hidden">
          <div className="card-header">
            <div className="flex items-center gap-2"><AlertTriangle size={15} className="text-amber-400" /><span className="text-sm font-semibold text-slate-100">Prévisions de rupture (J+15)</span></div>
          </div>
          <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Produit</th><th>Stock</th><th>Jours restants</th><th>Risque</th></tr></thead>
            <tbody>
              {forecasts.length===0 ? <tr><td colSpan={4} className="text-center py-8 text-slate-600">Analyse en cours...</td></tr>
              : forecasts.slice(0,8).map(f => (
                <tr key={f.product._id}>
                  <td><div className="col-main text-xs">{f.product.name}</div></td>
                  <td className="mono text-xs">{f.stock}</td>
                  <td><span className={`mono text-xs font-bold ${f.daysLeft===0?'text-red-400':f.daysLeft<=7?'text-amber-400':'text-slate-300'}`}>{f.daysLeft}j</span></td>
                  <td><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RISK_COLORS[f.risk]}`}>{f.risk}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        {/* Anomalies */}
        <div className="card overflow-hidden">
          <div className="card-header">
            <div className="flex items-center gap-2"><Shield size={15} className="text-red-400" /><span className="text-sm font-semibold text-slate-100">Anomalies détectées</span></div>
          </div>
          <div className="p-4 space-y-2.5">
            {anomalies.length===0 ? <div className="text-center py-8 text-slate-600 text-sm">Aucune anomalie détectée</div>
            : anomalies.slice(0,5).map((a,i) => (
              <div key={i} className={`alert-box ${a.severity==='critique'?'red':a.severity==='urgent'?'amber':'blue'}`}>
                <AlertTriangle size={14} className={a.severity==='critique'?'text-red-400':a.severity==='urgent'?'text-amber-400':'text-blue-400'} />
                <div>
                  <div className="text-xs font-medium text-slate-100 capitalize">{a.type.replace('_',' ')}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{a.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
