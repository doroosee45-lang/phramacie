import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsService } from '../services/api';
import { Settings as SettingsIcon, Save, Store } from 'lucide-react';

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsService.get });
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (data?.data?.data) setForm(data.data.data);
  }, [data]);

  const mut = useMutation({
    mutationFn: () => settingsService.update(form),
    onSuccess: () => { toast.success('Paramètres enregistrés'); qc.invalidateQueries(['settings']); },
    onError: e => toast.error(e.message),
  });

  const f = (k) => (e) => setForm(s => ({ ...s, [k]: e.target.value }));

  if (isLoading || !form) return (
    <div className="flex items-center justify-center h-64 text-slate-600 text-sm">Chargement...</div>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-100 flex items-center gap-2"><SettingsIcon size={18} /> Paramètres</h1>
        <p className="text-sm text-slate-500 mt-0.5">Configuration de l'application et des factures</p>
      </div>

      <div className="card p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-100 mb-2">
          <Store size={15} className="text-emerald-400" /> Informations de la pharmacie
        </div>
        <p className="text-xs text-slate-500 -mt-2 mb-2">Ces informations apparaissent sur les factures imprimées.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="form-group sm:col-span-2">
            <label className="label">Nom de la pharmacie *</label>
            <input className="input" value={form.pharmacyName} onChange={f('pharmacyName')} />
          </div>
          <div className="form-group sm:col-span-2">
            <label className="label">Adresse</label>
            <input className="input" value={form.address} onChange={f('address')} placeholder="Adresse de la pharmacie" />
          </div>
          <div className="form-group">
            <label className="label">Téléphone</label>
            <input className="input" value={form.phone} onChange={f('phone')} placeholder="+213 XX XX XX XX" />
          </div>
          <div className="form-group">
            <label className="label">Email</label>
            <input className="input" value={form.email} onChange={f('email')} />
          </div>
          <div className="form-group">
            <label className="label">RC / NIF</label>
            <input className="input" value={form.taxId} onChange={f('taxId')} />
          </div>
          <div className="form-group">
            <label className="label">Taux TVA par défaut (%)</label>
            <input type="number" className="input" value={form.tvaRate} onChange={f('tvaRate')} />
          </div>
          <div className="form-group sm:col-span-2">
            <label className="label">Message de pied de facture</label>
            <input className="input" value={form.invoiceFooter} onChange={f('invoiceFooter')} />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-800">
          <button onClick={() => mut.mutate()} disabled={mut.isPending || !form.pharmacyName} className="btn-primary">
            <Save size={14} /> {mut.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
