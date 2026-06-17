// ============================================================
// All remaining pages consolidated
// ============================================================
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { orderService, supplierService, clientService, prescriptionService, invoiceService, alertService, analyticsService, userService } from '../services/api';
import useAuthStore from '../contexts/authStore';
import InvoiceModal from '../components/common/InvoiceModal';
import { Plus, Search, CheckCircle, AlertTriangle, Clock, Users, FileText, Package, TrendingUp, Shield, Download, Eye, Trash2 } from 'lucide-react';

// ── Shared table + badge helpers ──────────────────────────────────────────────
const BadgeMap = {
  // Order statuses
  brouillon: 'badge-slate', validé: 'badge-blue', envoyé: 'badge-purple',
  en_transit: 'badge-purple', partiellement_reçu: 'badge-amber', reçu: 'badge-green',
  annulé: 'badge-red',
  // Invoice statuses
  émise: 'badge-blue', payée: 'badge-green', partiellement_payée: 'badge-amber',
  en_retard: 'badge-red', annulée: 'badge-slate',
  // Prescription statuses
  en_attente: 'badge-blue', en_cours: 'badge-amber', dispensée: 'badge-green',
  expirée: 'badge-red',
  // User roles
  super_admin: 'badge-purple', admin: 'badge-blue', depot_manager: 'badge-blue',
  pharmacist: 'badge-green', cashier: 'badge-slate', viewer: 'badge-slate',
  // Alert severities
  critique: 'badge-red', urgent: 'badge-amber', info: 'badge-blue',
};

const Badge = ({ value }) => <span className={BadgeMap[value] || 'badge-slate'}>{value}</span>;

const fmt = (n) => (n || 0).toLocaleString('fr-DZ');
const fmtDA = (n) => `${fmt(n)} CDF`;

// ── ORDERS PAGE ───────────────────────────────────────────────────────────────
export function OrdersPage() {
  const [status, setStatus] = useState('');
  const [page, setPage]     = useState(1);
  const [showNew, setShowNew] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['orders', status, page],
    queryFn: () => orderService.getAll({ status, page, limit: 20 }),
  });
  const statusMut = useMutation({
    mutationFn: ({ id, status, note }) => orderService.setStatus(id, { status, note }),
    onSuccess: () => { toast.success('Statut mis à jour'); qc.invalidateQueries(['orders']); },
    onError: e => toast.error(e.message),
  });

  const orders = data?.data?.data || [];
  const STATUSES = ['','brouillon','validé','envoyé','en_transit','reçu','annulé'];
  const NEXT_STATUS = { brouillon:'validé', validé:'envoyé', envoyé:'en_transit', en_transit:'reçu' };

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div><h1 className="text-xl font-semibold text-slate-100">Bons de Commande</h1><p className="text-sm text-slate-500 mt-0.5">Approvisionnement fournisseurs</p></div>
        <button onClick={() => setShowNew(true)} className="btn-primary btn-sm self-start sm:self-auto"><Plus size={14} /> Nouvelle commande</button>
      </div>
      <div className="flex gap-2 flex-wrap">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${status === s ? 'bg-pharma-pale/20 border-pharma-light text-pharma-light' : 'border-slate-700 text-slate-500 hover:border-slate-600'}`}>
            {s || 'Tous'}
          </button>
        ))}
      </div>
      <div className="card overflow-hidden">
        {isLoading ? <div className="py-16 text-center text-slate-600 text-sm">Chargement...</div> : (
          <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>N° BC</th><th>Fournisseur</th><th>Date</th><th>Réf.</th><th>Total TTC</th><th>Statut</th><th>Livraison</th><th>Actions</th></tr></thead>
            <tbody>
              {orders.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-slate-600">Aucune commande</td></tr>
              : orders.map(o => (
                <tr key={o._id}>
                  <td className="col-main mono text-xs">{o.orderNumber}</td>
                  <td>{o.supplier?.name || '—'}</td>
                  <td className="text-xs text-slate-400">{new Date(o.createdAt).toLocaleDateString('fr-DZ')}</td>
                  <td className="mono text-slate-400">{o.items?.length} réf.</td>
                  <td className="mono text-emerald-400 font-medium">{fmtDA(o.total)}</td>
                  <td><Badge value={o.status} /></td>
                  <td className="text-xs text-slate-400">{o.expectedDate ? new Date(o.expectedDate).toLocaleDateString('fr-DZ') : '—'}</td>
                  <td>
                    {NEXT_STATUS[o.status] && (
                      <button onClick={() => statusMut.mutate({ id: o._id, status: NEXT_STATUS[o.status] })}
                        className="btn-ghost btn-sm text-xs">→ {NEXT_STATUS[o.status]}</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
      {showNew && <NewOrderModal onClose={() => setShowNew(false)} />}
    </div>
  );
}

function NewOrderModal({ onClose }) {
  const qc = useQueryClient();
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [items, setItems] = useState([{ productName:'', quantity:1, unitPrice:0 }]);
  const { data: supData } = useQuery({ queryKey:['suppliers-list'], queryFn: supplierService.getAll });
  const suppliers = supData?.data?.data || [];
  const mut = useMutation({
    mutationFn: orderService.create,
    onSuccess: () => { toast.success('Bon de commande créé'); qc.invalidateQueries(['orders']); onClose(); },
    onError: e => toast.error(e.message),
  });
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card w-full max-w-lg p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-slate-100 mb-5">Nouveau bon de commande</h3>
        <div className="form-group"><label className="label">Fournisseur</label>
          <select className="input" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
            <option value="">Sélectionner...</option>
            {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="label">Date de livraison prévue</label>
          <input type="date" className="input" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
        </div>
        <div className="space-y-2 mb-4">
          <label className="label">Articles</label>
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <input className="input sm:col-span-6" placeholder="Produit" value={item.productName} onChange={e => setItems(it => it.map((x,j) => j===i ? {...x, productName: e.target.value} : x))} />
              <input type="number" className="input sm:col-span-3" placeholder="Qté" value={item.quantity} onChange={e => setItems(it => it.map((x,j) => j===i ? {...x, quantity:+e.target.value} : x))} />
              <input type="number" className="input sm:col-span-3" placeholder="PU CDF" value={item.unitPrice} onChange={e => setItems(it => it.map((x,j) => j===i ? {...x, unitPrice:+e.target.value, totalPrice:+e.target.value*item.quantity} : x))} />
            </div>
          ))}
          <button onClick={() => setItems(it => [...it, {productName:'',quantity:1,unitPrice:0}])} className="btn-ghost btn-sm w-full">+ Ajouter une ligne</button>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={() => mut.mutate({ supplier: supplierId, expectedDate, items: items.map(i => ({...i, totalPrice: i.quantity*i.unitPrice})) })} disabled={!supplierId || mut.isPending} className="btn-primary">
            {mut.isPending ? 'Création...' : 'Créer le BC'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SUPPLIERS PAGE ────────────────────────────────────────────────────────────
export function SuppliersPage() {
  const [showNew, setShowNew] = useState(false);
  const { data, isLoading } = useQuery({ queryKey:['suppliers'], queryFn: supplierService.getAll });
  const suppliers = data?.data?.data || [];
  return (
    <div className="p-4 sm:p-6 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div><h1 className="text-xl font-semibold text-slate-100">Fournisseurs</h1><p className="text-sm text-slate-500 mt-0.5">{suppliers.length} fournisseurs actifs</p></div>
        <button onClick={() => setShowNew(true)} className="btn-primary btn-sm self-start sm:self-auto"><Plus size={14} /> Ajouter</button>
      </div>
      <div className="card overflow-hidden">
        {isLoading ? <div className="py-16 text-center text-slate-600 text-sm">Chargement...</div> : (
          <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Fournisseur</th><th>Contact</th><th>Délai livraison</th><th>Paiement</th><th>Score qualité</th><th>Statut</th></tr></thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s._id}>
                  <td><div className="col-main">{s.name}</div><div className="text-xs text-slate-500 mono">{s.code}</div></td>
                  <td><div className="text-xs text-slate-300">{s.contact?.name}</div><div className="text-xs text-slate-500">{s.contact?.phone}</div></td>
                  <td className="text-xs text-slate-400">{s.deliveryDelay} jours</td>
                  <td className="text-xs text-slate-400">{s.paymentTerms} jours</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="progress w-16"><div className={`progress-fill ${s.qualityScore>=90?'bg-emerald-500':s.qualityScore>=70?'bg-amber-500':'bg-red-500'}`} style={{width:`${s.qualityScore}%`}} /></div>
                      <span className={`text-xs mono font-medium ${s.qualityScore>=90?'text-emerald-400':s.qualityScore>=70?'text-amber-400':'text-red-400'}`}>{s.qualityScore}%</span>
                    </div>
                  </td>
                  <td><span className="badge-green">Actif</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
      {showNew && <NewSupplierModal onClose={() => setShowNew(false)} />}
    </div>
  );
}

function NewSupplierModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name:'', contact:{ name:'', phone:'', email:'' }, deliveryDelay:5, paymentTerms:30 });
  const mut = useMutation({ mutationFn: supplierService.create, onSuccess: () => { toast.success('Fournisseur créé'); qc.invalidateQueries(['suppliers']); onClose(); }, onError: e => toast.error(e.message) });
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-slate-100 mb-5">Nouveau fournisseur</h3>
        <div className="space-y-3">
          <div><label className="label">Raison sociale *</label><input className="input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} /></div>
          <div><label className="label">Nom contact</label><input className="input" value={form.contact.name} onChange={e => setForm(f=>({...f,contact:{...f.contact,name:e.target.value}}))} /></div>
          <div><label className="label">Téléphone</label><input className="input" value={form.contact.phone} onChange={e => setForm(f=>({...f,contact:{...f.contact,phone:e.target.value}}))} /></div>
          <div><label className="label">Email</label><input className="input" value={form.contact.email} onChange={e => setForm(f=>({...f,contact:{...f.contact,email:e.target.value}}))} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label">Délai livraison (j)</label><input type="number" className="input" value={form.deliveryDelay} onChange={e => setForm(f=>({...f,deliveryDelay:+e.target.value}))} /></div>
            <div><label className="label">Paiement (j)</label><input type="number" className="input" value={form.paymentTerms} onChange={e => setForm(f=>({...f,paymentTerms:+e.target.value}))} /></div>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={() => mut.mutate(form)} disabled={!form.name||mut.isPending} className="btn-primary">{mut.isPending?'Création...':'Créer'}</button>
        </div>
      </div>
    </div>
  );
}

// ── CLIENTS PAGE ──────────────────────────────────────────────────────────────
export function ClientsPage() {
  const [search, setSearch] = useState('');
  const [level, setLevel]   = useState('');
  const [showNew, setShowNew] = useState(false);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey:['clients',search,level], queryFn: () => clientService.getAll({ search, level, limit:50 }) });
  const clients = data?.data?.data || [];
  const LEVEL_COLORS = { or:'text-amber-400', argent:'text-slate-300', bronze:'text-amber-700' };
  return (
    <div className="p-4 sm:p-6 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div><h1 className="text-xl font-semibold text-slate-100">Clients & Fidélité</h1><p className="text-sm text-slate-500 mt-0.5">{data?.data?.total || 0} clients enregistrés</p></div>
        <button onClick={() => setShowNew(true)} className="btn-primary btn-sm self-start sm:self-auto"><Plus size={14} /> Nouveau client</button>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input className="input pl-9 input-sm" placeholder="Nom, téléphone..." value={search} onChange={e=>setSearch(e.target.value)} /></div>
        <select className="input input-sm w-full sm:w-36" value={level} onChange={e=>setLevel(e.target.value)}>
          <option value="">Tous niveaux</option>
          <option value="or">Or ★★★</option>
          <option value="argent">Argent ★★</option>
          <option value="bronze">Bronze ★</option>
        </select>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="table">
          <thead><tr><th>Client</th><th>Téléphone</th><th>Niveau fidélité</th><th>Points</th><th>Total dépensé</th><th>Achats</th><th>Dernière visite</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={7} className="text-center py-12 text-slate-600">Chargement...</td></tr>
            : clients.map(c => (
              <tr key={c._id}>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{c.firstName?.[0]?.toUpperCase() ?? '?'}{c.lastName?.[0]?.toUpperCase() ?? ''}</div>
                    <div><div className="col-main">{c.firstName} {c.lastName}</div>{c.chronicConditions?.length>0&&<div className="text-[10px] text-slate-500">{c.chronicConditions.join(', ')}</div>}</div>
                  </div>
                </td>
                <td className="text-slate-400 text-xs">{c.phone}</td>
                <td><span className={`text-xs font-medium capitalize ${LEVEL_COLORS[c.loyaltyLevel]}`}>{c.loyaltyLevel} {c.loyaltyLevel==='or'?'★★★':c.loyaltyLevel==='argent'?'★★':'★'}</span></td>
                <td className="mono text-slate-300">{fmt(c.loyaltyPoints)}</td>
                <td className="mono text-emerald-400">{fmtDA(c.totalSpent)}</td>
                <td className="mono text-slate-400">{c.totalPurchases}</td>
                <td className="text-xs text-slate-400">{c.lastVisit ? new Date(c.lastVisit).toLocaleDateString('fr-DZ') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      {showNew && <NewClientModal onClose={() => setShowNew(false)} />}
    </div>
  );
}

function NewClientModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ firstName:'', lastName:'', phone:'', email:'', gender:'', address:'' });
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const mut = useMutation({
    mutationFn: clientService.create,
    onSuccess: () => { toast.success('Client créé'); qc.invalidateQueries(['clients']); onClose(); },
    onError: e => toast.error(e?.response?.data?.message || e.message),
  });
  const valid = form.firstName.trim() && form.lastName.trim() && form.phone.trim();
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-slate-100 mb-4">Nouveau client</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="form-group mb-0"><label className="label">Prénom *</label><input className="input" value={form.firstName} onChange={f('firstName')} placeholder="Prénom" /></div>
          <div className="form-group mb-0"><label className="label">Nom *</label><input className="input" value={form.lastName} onChange={f('lastName')} placeholder="Nom" /></div>
        </div>
        <div className="form-group"><label className="label">Téléphone *</label><input className="input" value={form.phone} onChange={f('phone')} placeholder="+243..." /></div>
        <div className="form-group"><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={f('email')} placeholder="email@exemple.com" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="form-group mb-0">
            <label className="label">Genre</label>
            <select className="input" value={form.gender} onChange={f('gender')}>
              <option value="">—</option>
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div className="form-group mb-0"><label className="label">Adresse</label><input className="input" value={form.address} onChange={f('address')} placeholder="Adresse" /></div>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={() => mut.mutate(form)} disabled={!valid || mut.isPending} className="btn-primary">
            {mut.isPending ? 'Création...' : 'Créer le client'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PRESCRIPTIONS PAGE ────────────────────────────────────────────────────────
export function PrescriptionsPage() {
  const [showNew, setShowNew]     = useState(false);
  const [viewImage, setViewImage] = useState(null);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['prescriptions'], queryFn: () => prescriptionService.getAll({ limit: 100 }) });
  const prescriptions = data?.data?.data || [];

  const deleteMut = useMutation({
    mutationFn: prescriptionService.remove,
    onSuccess: () => { toast.success('Ordonnance supprimée'); qc.invalidateQueries(['prescriptions']); },
    onError: e => toast.error(e?.response?.data?.message || e.message),
  });

  const handleDelete = (p) => {
    if (window.confirm(`Supprimer l'ordonnance ${p.prescriptionNumber} ?`)) deleteMut.mutate(p._id);
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-fade-in">

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Ordonnances scannées</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {data?.data?.total || 0} ordonnance(s) archivée(s)
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary btn-sm self-start sm:self-auto flex items-center gap-1.5">
          <Plus size={14} /> Scanner une ordonnance
        </button>
      </div>

      {/* Contenu */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="bg-slate-800 h-44 rounded-t-xl" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-slate-800 rounded w-3/4" />
                <div className="h-3 bg-slate-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 gap-3">
          <FileText size={40} className="text-slate-700" />
          <p className="text-slate-500 font-medium">Aucune ordonnance enregistrée</p>
          <p className="text-slate-600 text-sm">Cliquez sur « Scanner une ordonnance » pour commencer</p>
          <button onClick={() => setShowNew(true)} className="btn-primary btn-sm mt-2 flex items-center gap-1.5">
            <Plus size={13} /> Scanner
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {prescriptions.map(p => (
            <div key={p._id} className="card overflow-hidden flex flex-col group">

              {/* Image */}
              <button
                onClick={() => p.scannedImage && setViewImage(p.scannedImage)}
                className="relative block h-44 bg-slate-900 flex-shrink-0 overflow-hidden"
                title="Voir en plein écran"
              >
                {p.scannedImage ? (
                  <>
                    <img
                      src={p.scannedImage}
                      alt="scan"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <Eye size={22} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText size={36} className="text-slate-700" />
                  </div>
                )}
              </button>

              {/* Infos */}
              <div className="p-3 flex flex-col gap-1 flex-1">
                <span className="mono text-xs font-semibold text-pharma-light">{p.prescriptionNumber}</span>
                <span className="text-xs text-slate-400">{new Date(p.date).toLocaleDateString('fr-DZ')}</span>
                {p.notes && (
                  <span className="text-xs text-slate-500 truncate mt-0.5" title={p.notes}>{p.notes}</span>
                )}
                <div className="mt-auto pt-2 flex justify-end">
                  <button
                    onClick={() => handleDelete(p)}
                    className="btn-ghost btn-sm btn-icon text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Supprimer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {showNew && <ScanPrescriptionModal onClose={() => setShowNew(false)} />}

      {viewImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 cursor-zoom-out"
          onClick={() => setViewImage(null)}
        >
          <img
            src={viewImage}
            alt="Ordonnance"
            className="max-w-full max-h-[92vh] rounded-lg shadow-2xl object-contain"
          />
        </div>
      )}
    </div>
  );
}

function ScanPrescriptionModal({ onClose }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate]         = useState(today);
  const [notes, setNotes]       = useState('');
  const [imageB64, setImageB64] = useState(null);
  const [preview, setPreview]   = useState(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setImageB64(ev.target.result); setPreview(ev.target.result); };
    reader.readAsDataURL(file);
  };

  const mut = useMutation({
    mutationFn: prescriptionService.create,
    onSuccess: () => { toast.success('Ordonnance enregistrée'); qc.invalidateQueries(['prescriptions']); onClose(); },
    onError: e => toast.error(e?.response?.data?.message || e.message),
  });

  const handleSubmit = () => {
    if (!imageB64) return toast.error("Veuillez d'abord choisir une image");
    mut.mutate({ date, notes, scannedImage: imageB64 });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-slate-100 mb-4">Enregistrer une ordonnance</h3>

        {/* Zone d'upload */}
        <div className="mb-4">
          <label className="label mb-2 block">Photo / Scan *</label>
          {preview ? (
            <div className="relative">
              <img src={preview} alt="aperçu" className="w-full max-h-64 object-contain rounded-lg border border-slate-700 bg-slate-900" />
              <button
                onClick={() => { setImageB64(null); setPreview(null); }}
                className="absolute top-2 right-2 bg-red-600 hover:bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs leading-none"
              >✕</button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-600 hover:border-pharma-light rounded-lg h-40 cursor-pointer transition-colors bg-slate-900/40">
              <FileText size={32} className="text-slate-600" />
              <div className="text-center">
                <div className="text-sm text-slate-400">Cliquez pour choisir une image</div>
                <div className="text-xs text-slate-600 mt-0.5">JPG, PNG</div>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
          )}
        </div>

        <div className="form-group">
          <label className="label">Date de l'ordonnance</label>
          <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        <div className="form-group mb-5">
          <label className="label">Notes</label>
          <input className="input" placeholder="Observations (optionnel)" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={handleSubmit} disabled={mut.isPending || !imageB64} className="btn-primary">
            {mut.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── INVOICES PAGE ─────────────────────────────────────────────────────────────
export function InvoicesPage() {
  const [status, setStatus]           = useState('');
  const [viewInvoice, setViewInvoice] = useState(null);
  const [showNew, setShowNew]         = useState(false);
  const qc = useQueryClient();
  const isAdmin = useAuthStore(s => s.isAdmin());
  const { data, isLoading } = useQuery({ queryKey:['invoices',status], queryFn: () => invoiceService.getAll({ status, limit:30 }) });
  const invoices = data?.data?.data || [];

  const cancelMut = useMutation({
    mutationFn: (id) => invoiceService.cancel(id),
    onSuccess: () => { toast.success('Facture annulée et archivée'); qc.invalidateQueries(['invoices']); },
    onError: e => toast.error(e.message),
  });

  const openInvoice = (inv) => {
    setViewInvoice({
      invoiceId: inv._id,
      invoiceNumber: inv.invoiceNumber,
      date: new Date(inv.createdAt),
      client: inv.client ? { firstName: inv.client.firstName, lastName: inv.client.lastName, phone: inv.client.phone } : null,
      items: (inv.items || []).map(i => ({ name: i.description, qty: i.quantity, unitPrice: i.unitPrice, total: i.total })),
      subtotal: inv.subtotal, tva: inv.tva, total: inv.total,
      payMethod: inv.paymentMethod || '—', amountPaid: inv.paidAmount,
    });
  };

  const handleCancel = (inv) => {
    if (window.confirm(`Annuler la facture ${inv.invoiceNumber} ? Elle sera archivée et conservée pour l'audit, pas supprimée.`)) {
      cancelMut.mutate(inv._id);
    }
  };

  const printReport = () => {
    const rows = invoices.map(inv => `
      <tr>
        <td>${inv.invoiceNumber}</td>
        <td>${inv.client ? `${inv.client.firstName} ${inv.client.lastName}` : '—'}</td>
        <td>${new Date(inv.createdAt).toLocaleDateString('fr-DZ')}</td>
        <td style="text-align:right">${fmt(inv.subtotal)} CDF</td>
        <td style="text-align:right">${fmt(inv.tva)} CDF</td>
        <td style="text-align:right">${fmt(inv.total)} CDF</td>
        <td>${inv.status}</td>
      </tr>`).join('');
    const totalTTC = invoices.reduce((s, i) => s + (i.total || 0), 0);
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="fr"><head><meta charset="UTF-8" /><title>Rapport de facturation</title>
      <style>
        * { box-sizing: border-box; } body { font-family: Arial, sans-serif; color: #111; padding: 24px; }
        h1 { font-size: 18px; margin-bottom: 2px; } p { font-size: 12px; color: #555; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { text-align: left; background: #f1f5f9; padding: 8px; border-bottom: 2px solid #cbd5e1; }
        td { padding: 7px 8px; border-bottom: 1px solid #e2e8f0; }
        tfoot td { font-weight: bold; border-top: 2px solid #111; }
        @media print { body { padding: 0; } }
      </style></head>
      <body>
        <h1>Rapport de facturation</h1>
        <p>${status ? `Statut : ${status}` : 'Toutes les factures'} · Généré le ${new Date().toLocaleDateString('fr-DZ')} · ${invoices.length} facture(s)</p>
        <table>
          <thead><tr><th>N° Facture</th><th>Client</th><th>Date</th><th>Sous-total</th><th>TVA</th><th>Total TTC</th><th>Statut</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><td colspan="5"></td><td style="text-align:right">${fmt(totalTTC)} CDF</td><td></td></tr></tfoot>
        </table>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 400);
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div><h1 className="text-xl font-semibold text-slate-100">Facturation</h1><p className="text-sm text-slate-500 mt-0.5">Factures et règlements</p></div>
        <div className="flex gap-2">
          <button onClick={printReport} disabled={invoices.length === 0} className="btn-ghost btn-sm"><Download size={14} /> Rapport PDF</button>
          <button onClick={() => setShowNew(true)} className="btn-primary btn-sm"><Plus size={14} /> Nouvelle facture</button>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {['','émise','payée','partiellement_payée','en_retard','annulée'].map(s => (
          <button key={s} onClick={()=>setStatus(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${status===s?'bg-pharma-pale/20 border-pharma-light text-pharma-light':'border-slate-700 text-slate-500 hover:border-slate-600'}`}>
            {s||'Toutes'}
          </button>
        ))}
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="table">
          <thead><tr><th>N° Facture</th><th>Client</th><th>Date</th><th>Sous-total</th><th>TVA</th><th>Total TTC</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={8} className="text-center py-12 text-slate-600">Chargement...</td></tr>
            : invoices.length===0 ? <tr><td colSpan={8} className="text-center py-12 text-slate-600">Aucune facture</td></tr>
            : invoices.map(inv => (
              <tr key={inv._id}>
                <td className="col-main mono text-xs">{inv.invoiceNumber}</td>
                <td>{inv.client?.firstName} {inv.client?.lastName}</td>
                <td className="text-xs text-slate-400">{new Date(inv.createdAt).toLocaleDateString('fr-DZ')}</td>
                <td className="mono text-xs text-slate-300">{fmtDA(inv.subtotal)}</td>
                <td className="mono text-xs text-slate-400">{fmtDA(inv.tva)}</td>
                <td className="mono font-medium text-emerald-400">{fmtDA(inv.total)}</td>
                <td><Badge value={inv.status} /></td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => openInvoice(inv)} className="btn-ghost btn-sm btn-icon" title="Voir / Imprimer"><Eye size={13} /></button>
                    {isAdmin && inv.status !== 'annulée' && (
                      <button onClick={() => handleCancel(inv)} className="btn-ghost btn-sm btn-icon text-red-400" title="Supprimer (archive)"><Trash2 size={13} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {viewInvoice && <InvoiceModal data={viewInvoice} onClose={() => setViewInvoice(null)} />}
      {showNew && <NewInvoiceModal onClose={() => setShowNew(false)} />}
    </div>
  );
}

function NewInvoiceModal({ onClose }) {
  const qc = useQueryClient();
  const [clientId, setClientId]     = useState('');
  const [clientName, setClientName] = useState('');
  const [tvaRate, setTvaRate]       = useState(19);
  const [notes, setNotes]           = useState('');
  const [items, setItems]           = useState([{ description: '', quantity: 1, unitPrice: 0 }]);

  const { data: clData } = useQuery({ queryKey: ['clients-list'], queryFn: () => clientService.getAll({ limit: 200 }) });
  const clients = clData?.data?.data || [];

  const updateItem = (i, field, val) =>
    setItems(prev => prev.map((x, j) => j === i ? { ...x, [field]: val } : x));

  const subtotal = items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
  const tva      = Math.round(subtotal * tvaRate / 100);
  const total    = subtotal + tva;
  const fmt      = n => Math.round(n || 0).toLocaleString('fr-DZ');

  const mut = useMutation({
    mutationFn: invoiceService.create,
    onSuccess: () => { toast.success('Facture créée'); qc.invalidateQueries(['invoices']); onClose(); },
    onError: e => toast.error(e?.response?.data?.message || e.message),
  });

  const handleSubmit = () => {
    if (items.some(i => !i.description.trim() || i.quantity < 1 || i.unitPrice < 0))
      return toast.error('Vérifiez les lignes de la facture');
    mut.mutate({ client: clientId || undefined, clientName: clientId ? undefined : clientName, items, tvaRate, notes });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card w-full max-w-2xl p-6 animate-slide-up flex flex-col gap-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        <h3 className="text-base font-semibold text-slate-100">Nouvelle facture</h3>

        {/* Client */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="form-group mb-0">
            <label className="label">Client enregistré</label>
            <select className="input" value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">— Aucun / Passant —</option>
              {clients.map(c => (
                <option key={c._id} value={c._id}>{c.firstName} {c.lastName}{c.phone ? ` · ${c.phone}` : ''}</option>
              ))}
            </select>
          </div>
          {!clientId && (
            <div className="form-group mb-0">
              <label className="label">Nom du client</label>
              <input className="input" placeholder="Ex : Jean Dupont" value={clientName} onChange={e => setClientName(e.target.value)} />
            </div>
          )}
        </div>

        {/* Lignes */}
        <div>
          <label className="label mb-2 block">Lignes de facturation</label>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input
                  className="input col-span-6"
                  placeholder="Description"
                  value={item.description}
                  onChange={e => updateItem(i, 'description', e.target.value)}
                />
                <input
                  type="number" min="1"
                  className="input col-span-2"
                  placeholder="Qté"
                  value={item.quantity}
                  onChange={e => updateItem(i, 'quantity', +e.target.value)}
                />
                <input
                  type="number" min="0"
                  className="input col-span-3"
                  placeholder="Prix unit."
                  value={item.unitPrice}
                  onChange={e => updateItem(i, 'unitPrice', +e.target.value)}
                />
                <button
                  onClick={() => setItems(prev => prev.filter((_, j) => j !== i))}
                  disabled={items.length === 1}
                  className="btn-ghost btn-sm btn-icon col-span-1 text-red-400 disabled:opacity-20"
                >✕</button>
              </div>
            ))}
          </div>
          <button
            onClick={() => setItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0 }])}
            className="btn-ghost btn-sm w-full mt-2"
          >+ Ajouter une ligne</button>
        </div>

        {/* TVA + Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="form-group mb-0">
            <label className="label">TVA</label>
            <select className="input" value={tvaRate} onChange={e => setTvaRate(+e.target.value)}>
              <option value={0}>0 % (exonéré)</option>
              <option value={19}>19 %</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="label">Notes</label>
            <input className="input" placeholder="Observations (optionnel)" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        {/* Totaux */}
        <div className="bg-slate-800/60 rounded-lg px-4 py-3 flex flex-col gap-1 text-sm">
          <div className="flex justify-between text-slate-400"><span>Sous-total HT</span><span className="mono">{fmt(subtotal)} CDF</span></div>
          <div className="flex justify-between text-slate-400"><span>TVA ({tvaRate}%)</span><span className="mono">{fmt(tva)} CDF</span></div>
          <div className="flex justify-between font-semibold text-slate-100 border-t border-slate-700 pt-1 mt-1"><span>Total TTC</span><span className="mono text-emerald-400">{fmt(total)} CDF</span></div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={handleSubmit} disabled={mut.isPending || total === 0} className="btn-primary">
            {mut.isPending ? 'Création...' : 'Créer la facture'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ALERTS PAGE ───────────────────────────────────────────────────────────────
export function AlertsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey:['alerts'], queryFn: () => alertService.getAll({ isResolved:false, limit:50 }) });
  const alerts = data?.data?.data || [];
  const resolveMut = useMutation({
    mutationFn: ({ id }) => alertService.resolve(id, { note: '' }),
    onSuccess: () => { toast.success('Alerte résolue'); qc.invalidateQueries(['alerts']); qc.invalidateQueries(['alerts-count']); },
  });
  const SEV_ICONS = { critique:'🔴', urgent:'🟡', info:'🔵' };
  return (
    <div className="p-4 sm:p-6 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div><h1 className="text-xl font-semibold text-slate-100">Centre d'alertes</h1><p className="text-sm text-slate-500 mt-0.5">{data?.data?.total||0} alertes actives</p></div>
        <button onClick={() => alertService.readAll().then(()=>qc.invalidateQueries(['alerts']))} className="btn-ghost btn-sm self-start sm:self-auto">Tout marquer comme lu</button>
      </div>
      <div className="space-y-2.5">
        {isLoading ? <div className="text-center py-16 text-slate-600 text-sm">Chargement...</div>
        : alerts.length===0 ? (
          <div className="card p-12 text-center">
            <CheckCircle size={32} className="text-emerald-500 mx-auto mb-3" />
            <div className="text-slate-300 font-medium">Aucune alerte active</div>
            <div className="text-slate-600 text-sm mt-1">Tout est en ordre</div>
          </div>
        ) : alerts.map(a => (
          <div key={a._id} className={`card p-4 flex items-start gap-3 border-l-4 ${a.severity==='critique'?'border-red-500':a.severity==='urgent'?'border-amber-500':'border-blue-500'}`}>
            <span className="text-lg flex-shrink-0">{SEV_ICONS[a.severity]}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-medium text-slate-100">{a.title}</span>
                <Badge value={a.severity} />
              </div>
              <div className="text-xs text-slate-400">{a.message}</div>
              {a.product && <div className="text-[10px] text-slate-600 mt-1">Produit: {a.product.name}</div>}
              <div className="text-[10px] text-slate-600 mt-1">{new Date(a.createdAt).toLocaleString('fr-DZ')}</div>
            </div>
            <button onClick={() => resolveMut.mutate({ id: a._id })} className="btn-ghost btn-sm text-xs flex-shrink-0">Résoudre</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── USERS PAGE ────────────────────────────────────────────────────────────────
export function UsersPage() {
  const [showNew, setShowNew] = useState(false);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey:['users'], queryFn: userService.getAll });
  const users = data?.data?.data || [];
  const toggleActive = useMutation({
    mutationFn: ({ id, active }) => userService.update(id, { active }),
    onSuccess: () => { toast.success('Compte mis à jour'); qc.invalidateQueries(['users']); },
  });
  return (
    <div className="p-4 sm:p-6 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div><h1 className="text-xl font-semibold text-slate-100">Gestion des Utilisateurs</h1><p className="text-sm text-slate-500 mt-0.5">{users.length} comptes</p></div>
        <button onClick={() => setShowNew(true)} className="btn-primary btn-sm self-start sm:self-auto"><Plus size={14} /> Nouveau compte</button>
      </div>
      <div className="card overflow-hidden">
        {isLoading ? <div className="py-16 text-center text-slate-600 text-sm">Chargement...</div> : (
          <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Utilisateur</th><th>Identifiant</th><th>Rôle</th><th>MFA</th><th>Dernière connexion</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-xs font-bold">{u.firstName?.[0]?.toUpperCase() ?? '?'}{u.lastName?.[0]?.toUpperCase() ?? ''}</div>
                      <div><div className="col-main">{u.firstName} {u.lastName}</div><div className="text-[10px] text-slate-500">{u.email}</div></div>
                    </div>
                  </td>
                  <td className="mono text-xs text-slate-400">{u.username}</td>
                  <td><Badge value={ROLE_LABELS[u.role] || u.role} /></td>
                  <td>{u.mfaEnabled ? <span className="badge-green">Activé</span> : <span className="badge-slate">Désactivé</span>}</td>
                  <td className="text-xs text-slate-400">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('fr-DZ') : 'Jamais'}</td>
                  <td>{u.active ? <span className="badge-green">Actif</span> : <span className="badge-red">Suspendu</span>}</td>
                  <td>
                    <button onClick={() => toggleActive.mutate({ id: u._id, active: !u.active })}
                      className={`btn-sm ${u.active ? 'btn-ghost text-amber-400 border-amber-900' : 'btn-ghost text-emerald-400 border-emerald-900'}`}>
                      {u.active ? 'Suspendre' : 'Activer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
      {showNew && <NewUserModal onClose={() => setShowNew(false)} />}
    </div>
  );
}

const ROLE_LABELS = { super_admin: 'Super Admin', admin: 'Admin', pharmacist: 'Pharmacien' };

function NewUserModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ firstName:'', lastName:'', username:'', email:'', password:'', role:'pharmacist' });
  const mut = useMutation({
    mutationFn: () => userService.create({ ...form, module: form.role === 'pharmacist' ? 'pharmacy' : 'global' }),
    onSuccess: () => { toast.success('Utilisateur créé'); qc.invalidateQueries(['users']); onClose(); },
    onError: e => toast.error(e.message),
  });
  const f = k => e => setForm(s=>({...s,[k]:e.target.value}));
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-6 animate-slide-up" onClick={e=>e.stopPropagation()}>
        <h3 className="text-base font-semibold text-slate-100 mb-5">Nouveau compte utilisateur</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="label">Prénom *</label><input className="input" value={form.firstName} onChange={f('firstName')} /></div>
          <div><label className="label">Nom *</label><input className="input" value={form.lastName} onChange={f('lastName')} /></div>
          <div><label className="label">Identifiant *</label><input className="input" value={form.username} onChange={f('username')} /></div>
          <div><label className="label">Email *</label><input className="input" value={form.email} onChange={f('email')} /></div>
          <div className="sm:col-span-2"><label className="label">Mot de passe *</label><input type="password" className="input" value={form.password} onChange={f('password')} placeholder="Min. 6 caractères" /></div>
          <div className="sm:col-span-2"><label className="label">Rôle</label>
            <select className="input" value={form.role} onChange={f('role')}>
              {Object.entries(ROLE_LABELS).map(([r,label])=><option key={r} value={r}>{label}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={() => mut.mutate()} disabled={!form.firstName||!form.username||!form.password||mut.isPending} className="btn-primary">{mut.isPending?'Création...':'Créer le compte'}</button>
        </div>
      </div>
    </div>
  );
}



// // ============================================================
// // All remaining pages consolidated
// // ============================================================
// import { useState, useRef } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import toast from 'react-hot-toast';
// import { orderService, supplierService, clientService, prescriptionService, invoiceService, alertService, analyticsService, userService } from '../services/api';
// import {
//   Plus, Search, CheckCircle, AlertTriangle, Clock, Brain,
//   Users, FileText, Package, TrendingUp, Shield, Zap,
//   Printer, X, Receipt, Download, Eye,
// } from 'lucide-react';

// // ── Shared helpers ────────────────────────────────────────────────────────────
// const BadgeMap = {
//   brouillon:'badge-slate', validé:'badge-blue', envoyé:'badge-purple',
//   en_transit:'badge-purple', partiellement_reçu:'badge-amber', reçu:'badge-green',
//   annulé:'badge-red',
//   émise:'badge-blue', payée:'badge-green', partiellement_payée:'badge-amber',
//   en_retard:'badge-red',
//   en_attente:'badge-blue', en_cours:'badge-amber', dispensée:'badge-green',
//   expirée:'badge-red',
//   super_admin:'badge-purple', admin:'badge-blue', depot_manager:'badge-blue',
//   pharmacist:'badge-green', cashier:'badge-slate', viewer:'badge-slate',
//   critique:'badge-red', urgent:'badge-amber', info:'badge-blue',
// };
// const Badge = ({ value }) => <span className={BadgeMap[value] || 'badge-slate'}>{value}</span>;

// // ── Currency helpers — Franc Congolais (FC) ───────────────────────────────────
// const CURRENCY = 'FC';

// /** Format a raw number to "1 234 567 FC" */
// const fmtFC = (n) =>
//   new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(Math.round(n || 0)) +
//   '\u00a0' + CURRENCY;

// /** Format without the FC suffix (for table cells that already have a column header) */
// const fmtNum = (n) =>
//   new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(Math.round(n || 0));

// /** Legacy alias used by non-invoice pages */
// const fmt   = (n) => fmtNum(n);
// const fmtDA = (n) => fmtFC(n);   // kept name for minimal diff in other pages


// // ═══════════════════════════════════════════════════════════════════════════════
// // ── INVOICES PAGE ─────────────────────────────────────────────────────────────
// // ═══════════════════════════════════════════════════════════════════════════════
// export function InvoicesPage() {
//   const [status, setStatus]         = useState('');
//   const [showInvoice, setShowInvoice] = useState(null);   // invoice object to preview/print
//   const [showNew, setShowNew]       = useState(false);

//   const { data, isLoading } = useQuery({
//     queryKey: ['invoices', status],
//     queryFn:  () => invoiceService.getAll({ status, limit: 30 }),
//   });
//   const invoices = data?.data?.data || [];

//   // KPI cards derived from loaded data
//   const totalEmis   = invoices.filter(i => i.status === 'émise').length;
//   const totalRetard = invoices.filter(i => i.status === 'en_retard').length;
//   const totalPayées = invoices.filter(i => i.status === 'payée').length;
//   const caTotal     = invoices.reduce((s, i) => s + (i.total || 0), 0);

//   const STATUS_TABS = ['', 'émise', 'payée', 'partiellement_payée', 'en_retard'];
//   const STATUS_LABELS = { '': 'Toutes', émise: 'Émises', payée: 'Payées', partiellement_payée: 'Part. payées', en_retard: 'En retard' };

//   return (
//     <div className="p-6 space-y-5 animate-fade-in">
//       {/* Header */}
//       <div className="flex items-center justify-between">
//         <div>
//           <h1 className="text-xl font-semibold text-slate-100">Facturation</h1>
//           <p className="text-sm text-slate-500 mt-0.5">Factures et règlements — devise : {CURRENCY}</p>
//         </div>
//         <div className="flex gap-2">
//           <button className="btn-ghost btn-sm flex items-center gap-1.5">
//             <Download size={13} /> Export PDF
//           </button>
//           <button onClick={() => setShowNew(true)} className="btn-primary btn-sm">
//             <Plus size={14} /> Nouvelle facture
//           </button>
//         </div>
//       </div>

//       {/* KPI strip */}
//       <div className="grid grid-cols-4 gap-3">
//         {[
//           { label: 'CA total',      value: fmtFC(caTotal),   color: 'text-emerald-400', sub: `${invoices.length} factures` },
//           { label: 'Émises',        value: totalEmis,         color: 'text-blue-400',    sub: 'En attente de paiement' },
//           { label: 'Payées',        value: totalPayées,       color: 'text-emerald-400', sub: 'Réglées' },
//           { label: 'En retard',     value: totalRetard,       color: 'text-red-400',     sub: 'À relancer' },
//         ].map(kpi => (
//           <div key={kpi.label} className="card p-4">
//             <div className="text-xs text-slate-500 mb-1">{kpi.label}</div>
//             <div className={`text-lg font-bold mono ${kpi.color}`}>{kpi.value}</div>
//             <div className="text-[10px] text-slate-600 mt-0.5">{kpi.sub}</div>
//           </div>
//         ))}
//       </div>

//       {/* Status tabs */}
//       <div className="flex gap-2 flex-wrap">
//         {STATUS_TABS.map(s => (
//           <button
//             key={s}
//             onClick={() => setStatus(s)}
//             className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
//               status === s
//                 ? 'bg-pharma-pale/20 border-pharma-light text-pharma-light'
//                 : 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300'
//             }`}
//           >
//             {STATUS_LABELS[s]}
//           </button>
//         ))}
//       </div>

//       {/* Table */}
//       <div className="card overflow-hidden">
//         {isLoading ? (
//           <div className="py-16 text-center text-slate-600 text-sm">Chargement...</div>
//         ) : (
//           <table className="table">
//             <thead>
//               <tr>
//                 <th>N° Facture</th>
//                 <th>Client</th>
//                 <th>Date</th>
//                 <th className="text-right">Sous-total HT</th>
//                 <th className="text-right">TVA (19%)</th>
//                 <th className="text-right">Total TTC</th>
//                 <th>Statut</th>
//                 <th>Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {invoices.length === 0 ? (
//                 <tr>
//                   <td colSpan={8} className="text-center py-12 text-slate-600">
//                     Aucune facture trouvée
//                   </td>
//                 </tr>
//               ) : invoices.map(inv => (
//                 <tr key={inv._id}>
//                   <td className="col-main mono text-xs">{inv.invoiceNumber}</td>
//                   <td>
//                     {inv.client
//                       ? `${inv.client.firstName} ${inv.client.lastName}`
//                       : <span className="text-slate-500">—</span>}
//                   </td>
//                   <td className="text-xs text-slate-400">
//                     {new Date(inv.createdAt).toLocaleDateString('fr-FR')}
//                   </td>
//                   <td className="mono text-xs text-slate-300 text-right">
//                     {fmtFC(inv.subtotal)}
//                   </td>
//                   <td className="mono text-xs text-slate-400 text-right">
//                     {fmtFC(inv.tva)}
//                   </td>
//                   <td className="mono font-semibold text-emerald-400 text-right">
//                     {fmtFC(inv.total)}
//                   </td>
//                   <td><Badge value={inv.status} /></td>
//                   <td>
//                     <button
//                       onClick={() => setShowInvoice(inv)}
//                       className="btn-ghost btn-sm text-xs flex items-center gap-1"
//                     >
//                       <Eye size={11} /> Voir
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         )}
//       </div>

//       {/* Modals */}
//       {showNew    && <NewInvoiceModal    onClose={() => setShowNew(false)} />}
//       {showInvoice && <InvoicePrintModal data={showInvoice} onClose={() => setShowInvoice(null)} />}
//     </div>
//   );
// }

// // ── New Invoice Modal ─────────────────────────────────────────────────────────
// function NewInvoiceModal({ onClose }) {
//   const qc = useQueryClient();
//   const [clientId, setClientId] = useState('');
//   const [items, setItems] = useState([{ description: '', quantity: 1, unitPrice: 0 }]);
//   const [discount, setDiscount] = useState(0);

//   const { data: cliData } = useQuery({
//     queryKey: ['clients-list'],
//     queryFn:  () => clientService.getAll({ limit: 100 }),
//   });
//   const clients = cliData?.data?.data || [];

//   const subtotal    = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
//   const discountAmt = (subtotal * discount) / 100;
//   const tva         = (subtotal - discountAmt) * 0.19;
//   const total       = subtotal - discountAmt + tva;

//   const mut = useMutation({
//     mutationFn: invoiceService.create,
//     onSuccess: () => { toast.success('Facture créée'); qc.invalidateQueries(['invoices']); onClose(); },
//     onError:   e => toast.error(e.message),
//   });

//   const updateItem = (idx, key, val) =>
//     setItems(it => it.map((x, j) => j === idx ? { ...x, [key]: val } : x));

//   return (
//     <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
//       <div className="card w-full max-w-2xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
//         <h3 className="text-base font-semibold text-slate-100 mb-5">Nouvelle facture</h3>

//         {/* Client */}
//         <div className="form-group mb-4">
//           <label className="label">Client</label>
//           <select className="input" value={clientId} onChange={e => setClientId(e.target.value)}>
//             <option value="">Sans client (comptant)</option>
//             {clients.map(c => (
//               <option key={c._id} value={c._id}>{c.firstName} {c.lastName}</option>
//             ))}
//           </select>
//         </div>

//         {/* Items */}
//         <label className="label mb-2 block">Lignes de facture</label>
//         <div className="space-y-2 mb-3">
//           {/* Column headers */}
//           <div className="grid grid-cols-12 gap-2 text-[10px] text-slate-500 uppercase px-1">
//             <span className="col-span-5">Désignation / Médicament</span>
//             <span className="col-span-2 text-center">Qté</span>
//             <span className="col-span-3 text-right">P.U. (FC)</span>
//             <span className="col-span-2 text-right">Total (FC)</span>
//           </div>

//           {items.map((item, i) => {
//             const lineTotal = item.quantity * item.unitPrice;
//             return (
//               <div key={i} className="grid grid-cols-12 gap-2 items-center">
//                 <input
//                   className="input col-span-5"
//                   placeholder="Amoxicilline 500mg..."
//                   value={item.description}
//                   onChange={e => updateItem(i, 'description', e.target.value)}
//                 />
//                 <input
//                   type="number" min={1}
//                   className="input col-span-2 text-center"
//                   value={item.quantity}
//                   onChange={e => updateItem(i, 'quantity', Math.max(1, +e.target.value))}
//                 />
//                 <input
//                   type="number" min={0}
//                   className="input col-span-3 text-right"
//                   placeholder="0"
//                   value={item.unitPrice}
//                   onChange={e => updateItem(i, 'unitPrice', Math.max(0, +e.target.value))}
//                 />
//                 <div className="col-span-2 text-right mono text-sm font-semibold text-emerald-400 pr-1">
//                   {fmtNum(lineTotal)} <span className="text-[9px] font-normal text-slate-500">FC</span>
//                 </div>
//                 {items.length > 1 && (
//                   <button
//                     onClick={() => setItems(it => it.filter((_, j) => j !== i))}
//                     className="col-span-12 flex justify-end text-red-400 hover:text-red-300 text-xs mt-0.5"
//                   >
//                     <X size={12} /> Supprimer
//                   </button>
//                 )}
//               </div>
//             );
//           })}
//           <button
//             onClick={() => setItems(it => [...it, { description: '', quantity: 1, unitPrice: 0 }])}
//             className="btn-ghost btn-sm w-full text-xs"
//           >
//             + Ajouter une ligne
//           </button>
//         </div>

//         {/* Discount + totals */}
//         <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4 space-y-2 text-sm">
//           <div className="flex justify-between items-center">
//             <span className="text-slate-400 text-xs">Remise globale (%)</span>
//             <input
//               type="number" min={0} max={100}
//               className="w-16 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-right text-slate-100"
//               value={discount}
//               onChange={e => setDiscount(Math.min(100, Math.max(0, +e.target.value)))}
//             />
//           </div>
//           <div className="flex justify-between text-xs text-slate-400">
//             <span>Sous-total HT</span>
//             <span className="mono">{fmtFC(subtotal)}</span>
//           </div>
//           {discountAmt > 0 && (
//             <div className="flex justify-between text-xs text-emerald-400">
//               <span>Remise ({discount}%)</span>
//               <span className="mono">− {fmtFC(discountAmt)}</span>
//             </div>
//           )}
//           <div className="flex justify-between text-xs text-slate-400">
//             <span>TVA (19%)</span>
//             <span className="mono">{fmtFC(tva)}</span>
//           </div>
//           <div className="flex justify-between font-bold text-slate-100 pt-2 border-t border-slate-700/60">
//             <span>TOTAL TTC</span>
//             <span className="mono text-emerald-400 text-base">{fmtFC(total)}</span>
//           </div>
//         </div>

//         <div className="flex gap-2 justify-end mt-5">
//           <button onClick={onClose} className="btn-ghost">Annuler</button>
//           <button
//             onClick={() => mut.mutate({
//               clientId: clientId || undefined,
//               items: items.map(i => ({ ...i, total: i.quantity * i.unitPrice })),
//               discount,
//               subtotal, tva, total,
//             })}
//             disabled={items.every(i => !i.description) || mut.isPending}
//             className="btn-primary"
//           >
//             {mut.isPending ? 'Création...' : 'Créer la facture'}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ── Invoice Print Modal ───────────────────────────────────────────────────────
// function InvoicePrintModal({ data: inv, onClose }) {
//   const invoiceRef = useRef(null);

//   const dateStr = inv.createdAt
//     ? new Date(inv.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
//     : '—';
//   const timeStr = inv.createdAt
//     ? new Date(inv.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
//     : '';

//   // Recalculate totals from items to guarantee accuracy
//   const items      = inv.items || [];
//   const subtotal   = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);
//   const discount   = Number(inv.discount) || 0;
//   const discountAmt = (subtotal * discount) / 100;
//   const tva        = (subtotal - discountAmt) * 0.19;
//   const total      = subtotal - discountAmt + tva;
//   const totalUnits = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

//   const handlePrint = () => {
//     const content = invoiceRef.current;
//     if (!content) return;

//     const win = window.open('', '_blank', 'width=820,height=750');
//     win.document.write(`<!DOCTYPE html>
// <html lang="fr">
// <head>
//   <meta charset="UTF-8"/>
//   <title>Facture ${inv.invoiceNumber}</title>
//   <style>
//     *{box-sizing:border-box;margin:0;padding:0}
//     body{font-family:'Courier New',Courier,monospace;background:#fff;color:#111;font-size:12px}
//     .invoice{max-width:420px;margin:0 auto;padding:28px 22px}
//     /* header */
//     .inv-header{text-align:center;border-bottom:2px dashed #333;padding-bottom:14px;margin-bottom:14px}
//     .inv-name{font-size:19px;font-weight:900;letter-spacing:2px;margin-bottom:5px}
//     .inv-sub{font-size:10px;color:#555;margin-bottom:2px}
//     .inv-title{font-size:14px;font-weight:bold;margin:12px 0 3px;text-transform:uppercase;letter-spacing:1px}
//     .inv-meta{font-size:10px;color:#666}
//     /* client */
//     .sect-label{font-size:9px;color:#999;text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px}
//     .client-box{background:#f9f9f9;border:1px solid #e0e0e0;border-radius:4px;padding:6px 8px;margin-bottom:10px}
//     /* table */
//     table{width:100%;border-collapse:collapse;margin:10px 0}
//     thead tr{background:#f0f0f0}
//     thead th{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#444;padding:5px 4px;border-bottom:2px solid #bbb;white-space:nowrap}
//     thead th.right{text-align:right}
//     thead th.center{text-align:center}
//     tbody tr:nth-child(even){background:#fafafa}
//     tbody td{font-size:11px;padding:6px 4px;border-bottom:1px dotted #ddd;vertical-align:top}
//     tbody td.right{text-align:right;white-space:nowrap}
//     tbody td.center{text-align:center}
//     tfoot td{font-size:10px;padding:5px 4px;border-top:2px solid #999;color:#666;font-style:italic}
//     tfoot td.right{text-align:right;color:#333;font-weight:700}
//     /* totals */
//     .totals{margin-top:6px}
//     .tot-row{display:flex;justify-content:space-between;padding:3px 4px;font-size:11px}
//     .tot-row.discount{color:#1a7a3a}
//     .tot-row.tva{color:#666}
//     .tot-grand{display:flex;justify-content:space-between;align-items:center;padding:7px 6px;font-size:15px;font-weight:900;border-top:3px solid #111;border-bottom:3px solid #111;margin-top:4px;background:#f8f8f8;text-transform:uppercase;letter-spacing:.5px}
//     /* payment */
//     .pay-block{margin-top:8px;padding-top:6px;border-top:1px dashed #bbb}
//     .pay-row{display:flex;justify-content:space-between;font-size:10px;color:#666;padding:2px 0}
//     .pay-row strong{color:#333}
//     .change-row{display:flex;justify-content:space-between;padding:4px 6px;font-size:12px;font-weight:bold;color:#1a5f9a;background:#eff6ff;border-radius:4px;margin-top:3px}
//     /* footer */
//     .inv-footer{text-align:center;margin-top:18px;padding-top:12px;border-top:2px dashed #333;font-size:10px;color:#888;line-height:1.7}
//     .barcode{margin-top:8px;font-size:8px;color:#ccc;letter-spacing:7px;text-align:center}
//     @media print{body{margin:0}.no-print{display:none!important}.invoice{max-width:100%}}
//   </style>
// </head>
// <body>
//   ${content.innerHTML}
// </body>
// </html>`);
//     win.document.close();
//     win.focus();
//     setTimeout(() => win.print(), 600);
//   };

//   return (
//     <div
//       className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
//       onClick={onClose}
//     >
//       <div
//         className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh] overflow-hidden"
//         onClick={e => e.stopPropagation()}
//       >
//         {/* Modal toolbar */}
//         <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0 no-print">
//           <div className="flex items-center gap-2">
//             <Receipt size={16} className="text-emerald-600" />
//             <span className="text-sm font-semibold text-gray-800">Aperçu facture</span>
//             <span className="text-xs text-gray-400 font-mono">{inv.invoiceNumber}</span>
//           </div>
//           <div className="flex items-center gap-2">
//             <button
//               onClick={handlePrint}
//               className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors"
//             >
//               <Printer size={12} /> Imprimer
//             </button>
//             <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
//               <X size={18} />
//             </button>
//           </div>
//         </div>

//         {/* Scrollable invoice preview */}
//         <div className="overflow-y-auto flex-1 bg-gray-100 p-5">
//           {/* ── Printable area ── */}
//           <div
//             ref={invoiceRef}
//             className="invoice bg-white shadow-lg rounded-lg mx-auto"
//             style={{ maxWidth: 420, padding: '28px 22px', fontFamily: "'Courier New', Courier, monospace" }}
//           >
//             {/* Header */}
//             <div className="inv-header" style={{ textAlign: 'center', borderBottom: '2px dashed #333', paddingBottom: 14, marginBottom: 14 }}>
//               <div className="inv-name" style={{ fontSize: 19, fontWeight: 900, letterSpacing: 2, marginBottom: 5 }}>
//                 ✚ PHARMACIE CENTRALE
//               </div>
//               <div className="inv-sub" style={{ fontSize: 10, color: '#555', marginBottom: 2 }}>Avenue de la Libération, Kinshasa — RDC</div>
//               <div className="inv-sub" style={{ fontSize: 10, color: '#555', marginBottom: 2 }}>Tél : +243 XX XXX XX XX</div>
//               <div className="inv-sub" style={{ fontSize: 10, color: '#555', marginBottom: 2 }}>RCCM : CD/KIN/RCCM/XX-XXXX &nbsp;·&nbsp; NIF : XXXXXXXX</div>

//               <div className="inv-title" style={{ fontSize: 14, fontWeight: 'bold', marginTop: 12, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 1 }}>
//                 FACTURE DE VENTE
//               </div>
//               <div className="inv-meta" style={{ fontSize: 10, color: '#666' }}>N° <strong>{inv.invoiceNumber}</strong></div>
//               <div className="inv-meta" style={{ fontSize: 10, color: '#666' }}>{dateStr} à {timeStr}</div>
//             </div>

//             {/* Client info */}
//             {inv.client && (
//               <div style={{ marginBottom: 10 }}>
//                 <div className="sect-label" style={{ fontSize: 9, color: '#999', textTransform: 'uppercase', letterSpacing: .6, marginBottom: 3 }}>Client</div>
//                 <div className="client-box" style={{ background: '#f9f9f9', border: '1px solid #e0e0e0', borderRadius: 4, padding: '6px 8px' }}>
//                   <div style={{ fontWeight: 700, fontSize: 12 }}>{inv.client.firstName} {inv.client.lastName}</div>
//                   {inv.client.phone && <div style={{ fontSize: 10, color: '#666', marginTop: 1 }}>{inv.client.phone}</div>}
//                 </div>
//               </div>
//             )}

//             <hr style={{ border: 'none', borderTop: '1px dashed #ccc', margin: '8px 0' }} />

//             {/* ── Items table ── */}
//             <table style={{ width: '100%', borderCollapse: 'collapse', margin: '10px 0' }}>
//               <thead>
//                 <tr style={{ background: '#f0f0f0' }}>
//                   <th style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: '#444', padding: '5px 4px', borderBottom: '2px solid #bbb', textAlign: 'left' }}>
//                     Médicament / Désignation
//                   </th>
//                   <th style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: '#444', padding: '5px 4px', borderBottom: '2px solid #bbb', textAlign: 'center', width: 32 }}>
//                     Qté
//                   </th>
//                   <th style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: '#444', padding: '5px 4px', borderBottom: '2px solid #bbb', textAlign: 'right', whiteSpace: 'nowrap' }}>
//                     P.U. (FC)
//                   </th>
//                   <th style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: '#444', padding: '5px 4px', borderBottom: '2px solid #bbb', textAlign: 'right', whiteSpace: 'nowrap' }}>
//                     Total (FC)
//                   </th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {items.map((item, idx) => {
//                   const qty       = Number(item.quantity)  || 0;
//                   const unitPrice = Number(item.unitPrice) || 0;
//                   const lineTotal = qty * unitPrice;          // ← exact calc per line
//                   return (
//                     <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
//                       {/* Désignation */}
//                       <td style={{ fontSize: 11, padding: '6px 4px', borderBottom: '1px dotted #ddd', verticalAlign: 'top' }}>
//                         <div style={{ fontWeight: 700, color: '#111' }}>
//                           {item.description || item.productId?.name || item.name || '—'}
//                         </div>
//                         {(item.activeIngredient || item.productId?.activeIngredient) && (
//                           <div style={{ fontSize: 9, color: '#999', marginTop: 1 }}>
//                             {item.activeIngredient || item.productId?.activeIngredient}
//                           </div>
//                         )}
//                       </td>
//                       {/* Qté */}
//                       <td style={{ fontSize: 12, fontWeight: 700, padding: '6px 4px', borderBottom: '1px dotted #ddd', textAlign: 'center', color: '#222' }}>
//                         {qty}
//                       </td>
//                       {/* P.U. FC */}
//                       <td style={{ fontSize: 11, padding: '6px 4px', borderBottom: '1px dotted #ddd', textAlign: 'right', whiteSpace: 'nowrap', color: '#333' }}>
//                         {fmtNum(unitPrice)}&nbsp;FC
//                       </td>
//                       {/* Total ligne FC */}
//                       <td style={{ fontSize: 11, padding: '6px 4px', borderBottom: '1px dotted #ddd', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700, color: '#111' }}>
//                         {fmtNum(lineTotal)}&nbsp;FC
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//               <tfoot>
//                 <tr>
//                   <td colSpan={2} style={{ padding: '5px 4px', borderTop: '2px solid #999', fontSize: 10, color: '#777', fontStyle: 'italic' }}>
//                     {totalUnits} unité(s) · {items.length} ligne(s)
//                   </td>
//                   <td style={{ padding: '5px 4px', borderTop: '2px solid #999', fontSize: 10, color: '#777', textAlign: 'right' }}>
//                     Sous-total HT
//                   </td>
//                   <td style={{ padding: '5px 4px', borderTop: '2px solid #999', fontWeight: 700, fontSize: 11, textAlign: 'right', whiteSpace: 'nowrap' }}>
//                     {fmtNum(subtotal)}&nbsp;FC
//                   </td>
//                 </tr>
//               </tfoot>
//             </table>

//             {/* ── Totals block ── */}
//             <div style={{ marginTop: 6 }}>
//               {discount > 0 && (
//                 <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 4px', fontSize: 11, color: '#1a7a3a', background: '#f0fff4', borderRadius: 3 }}>
//                   <span>Remise ({discount}%)</span>
//                   <span style={{ fontWeight: 700 }}>− {fmtNum(discountAmt)}&nbsp;FC</span>
//                 </div>
//               )}
//               <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 4px', fontSize: 11, color: '#666' }}>
//                 <span>TVA (19%)</span>
//                 <span>{fmtNum(tva)}&nbsp;FC</span>
//               </div>

//               {/* Grand total */}
//               <div style={{
//                 display: 'flex', justifyContent: 'space-between', alignItems: 'center',
//                 padding: '8px 6px', fontSize: 15, fontWeight: 900,
//                 borderTop: '3px solid #111', borderBottom: '3px solid #111',
//                 marginTop: 4, background: '#f8f8f8',
//                 textTransform: 'uppercase', letterSpacing: .5,
//               }}>
//                 <span>Total TTC</span>
//                 <span style={{ fontSize: 16 }}>{fmtNum(total)}&nbsp;FC</span>
//               </div>

//               {/* Payment mode */}
//               {inv.paymentMethod && (
//                 <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px dashed #bbb' }}>
//                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#666', padding: '2px 0' }}>
//                     <span>Mode de paiement</span>
//                     <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>{inv.paymentMethod}</span>
//                   </div>
//                   {inv.amountPaid > 0 && (
//                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0' }}>
//                       <span>Montant remis</span>
//                       <span style={{ fontWeight: 600 }}>{fmtNum(inv.amountPaid)}&nbsp;FC</span>
//                     </div>
//                   )}
//                   {(inv.amountPaid - total) > 0 && (
//                     <div style={{
//                       display: 'flex', justifyContent: 'space-between',
//                       padding: '4px 6px', fontSize: 12, fontWeight: 'bold',
//                       color: '#1a5f9a', background: '#eff6ff', borderRadius: 4, marginTop: 3,
//                     }}>
//                       <span>Monnaie rendue</span>
//                       <span>{fmtNum(inv.amountPaid - total)}&nbsp;FC</span>
//                     </div>
//                   )}
//                 </div>
//               )}

//               {/* Invoice status */}
//               <div style={{ marginTop: 6, display: 'flex', justifyContent: 'flex-end' }}>
//                 <span style={{
//                   display: 'inline-block', border: '1px solid #333',
//                   padding: '2px 10px', fontSize: 10,
//                   textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700,
//                 }}>
//                   {inv.status}
//                 </span>
//               </div>
//             </div>

//             {/* Footer */}
//             <div style={{ textAlign: 'center', marginTop: 18, paddingTop: 12, borderTop: '2px dashed #333', fontSize: 10, color: '#888', lineHeight: 1.8 }}>
//               <div>Merci pour votre confiance.</div>
//               <div>Conservez ce document pour tout échange ou remboursement.</div>
//               <div style={{ marginTop: 3, fontSize: 9, color: '#bbb' }}>Ce document tient lieu de facture officielle.</div>
//               <div style={{ marginTop: 8, fontSize: 8, color: '#ccc', letterSpacing: 7 }}>
//                 {(inv.invoiceNumber || '').replace(/[^0-9]/g, '')}
//               </div>
//             </div>
//           </div>
//           {/* ── end printable area ── */}
//         </div>

//         {/* Bottom action bar */}
//         <div className="flex gap-2 px-4 py-3 border-t border-gray-200 flex-shrink-0 bg-white no-print">
//           <button
//             onClick={handlePrint}
//             className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors"
//           >
//             <Printer size={15} /> Imprimer la facture
//           </button>
//           <button
//             onClick={onClose}
//             className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm transition-colors"
//           >
//             Fermer
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }


// // ═══════════════════════════════════════════════════════════════════════════════
// // ── ORDERS PAGE ───────────────────────────────────────────────────────────────
// // ═══════════════════════════════════════════════════════════════════════════════
// export function OrdersPage() {
//   const [status, setStatus] = useState('');
//   const [page, setPage]     = useState(1);
//   const [showNew, setShowNew] = useState(false);
//   const qc = useQueryClient();

//   const { data, isLoading } = useQuery({
//     queryKey: ['orders', status, page],
//     queryFn: () => orderService.getAll({ status, page, limit: 20 }),
//   });
//   const statusMut = useMutation({
//     mutationFn: ({ id, status, note }) => orderService.setStatus(id, { status, note }),
//     onSuccess: () => { toast.success('Statut mis à jour'); qc.invalidateQueries(['orders']); },
//     onError: e => toast.error(e.message),
//   });

//   const orders = data?.data?.data || [];
//   const STATUSES = ['','brouillon','validé','envoyé','en_transit','reçu','annulé'];
//   const NEXT_STATUS = { brouillon:'validé', validé:'envoyé', envoyé:'en_transit', en_transit:'reçu' };

//   return (
//     <div className="p-6 space-y-5 animate-fade-in">
//       <div className="flex items-center justify-between">
//         <div><h1 className="text-xl font-semibold text-slate-100">Bons de Commande</h1><p className="text-sm text-slate-500 mt-0.5">Approvisionnement fournisseurs</p></div>
//         <button onClick={() => setShowNew(true)} className="btn-primary btn-sm"><Plus size={14} /> Nouvelle commande</button>
//       </div>
//       <div className="flex gap-2 flex-wrap">
//         {STATUSES.map(s => (
//           <button key={s} onClick={() => setStatus(s)}
//             className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${status === s ? 'bg-pharma-pale/20 border-pharma-light text-pharma-light' : 'border-slate-700 text-slate-500 hover:border-slate-600'}`}>
//             {s || 'Tous'}
//           </button>
//         ))}
//       </div>
//       <div className="card overflow-hidden">
//         {isLoading ? <div className="py-16 text-center text-slate-600 text-sm">Chargement...</div> : (
//           <table className="table">
//             <thead><tr><th>N° BC</th><th>Fournisseur</th><th>Date</th><th>Réf.</th><th>Total TTC</th><th>Statut</th><th>Livraison</th><th>Actions</th></tr></thead>
//             <tbody>
//               {orders.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-slate-600">Aucune commande</td></tr>
//               : orders.map(o => (
//                 <tr key={o._id}>
//                   <td className="col-main mono text-xs">{o.orderNumber}</td>
//                   <td>{o.supplier?.name || '—'}</td>
//                   <td className="text-xs text-slate-400">{new Date(o.createdAt).toLocaleDateString('fr-FR')}</td>
//                   <td className="mono text-slate-400">{o.items?.length} réf.</td>
//                   <td className="mono text-emerald-400 font-medium">{fmtDA(o.total)}</td>
//                   <td><Badge value={o.status} /></td>
//                   <td className="text-xs text-slate-400">{o.expectedDate ? new Date(o.expectedDate).toLocaleDateString('fr-FR') : '—'}</td>
//                   <td>
//                     {NEXT_STATUS[o.status] && (
//                       <button onClick={() => statusMut.mutate({ id: o._id, status: NEXT_STATUS[o.status] })}
//                         className="btn-ghost btn-sm text-xs">→ {NEXT_STATUS[o.status]}</button>
//                     )}
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         )}
//       </div>
//       {showNew && <NewOrderModal onClose={() => setShowNew(false)} />}
//     </div>
//   );
// }

// function NewOrderModal({ onClose }) {
//   const qc = useQueryClient();
//   const [supplierId, setSupplierId] = useState('');
//   const [expectedDate, setExpectedDate] = useState('');
//   const [items, setItems] = useState([{ productName:'', quantity:1, unitPrice:0 }]);
//   const { data: supData } = useQuery({ queryKey:['suppliers-list'], queryFn: supplierService.getAll });
//   const suppliers = supData?.data?.data || [];
//   const mut = useMutation({
//     mutationFn: orderService.create,
//     onSuccess: () => { toast.success('Bon de commande créé'); qc.invalidateQueries(['orders']); onClose(); },
//     onError: e => toast.error(e.message),
//   });
//   return (
//     <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
//       <div className="card w-full max-w-lg p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
//         <h3 className="text-base font-semibold text-slate-100 mb-5">Nouveau bon de commande</h3>
//         <div className="form-group"><label className="label">Fournisseur</label>
//           <select className="input" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
//             <option value="">Sélectionner...</option>
//             {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
//           </select>
//         </div>
//         <div className="form-group"><label className="label">Date de livraison prévue</label>
//           <input type="date" className="input" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
//         </div>
//         <div className="space-y-2 mb-4">
//           <label className="label">Articles</label>
//           {items.map((item, i) => (
//             <div key={i} className="grid grid-cols-12 gap-2">
//               <input className="input col-span-6" placeholder="Produit" value={item.productName} onChange={e => setItems(it => it.map((x,j) => j===i ? {...x, productName: e.target.value} : x))} />
//               <input type="number" className="input col-span-3" placeholder="Qté" value={item.quantity} onChange={e => setItems(it => it.map((x,j) => j===i ? {...x, quantity:+e.target.value} : x))} />
//               <input type="number" className="input col-span-3" placeholder="PU FC" value={item.unitPrice} onChange={e => setItems(it => it.map((x,j) => j===i ? {...x, unitPrice:+e.target.value} : x))} />
//             </div>
//           ))}
//           <button onClick={() => setItems(it => [...it, {productName:'',quantity:1,unitPrice:0}])} className="btn-ghost btn-sm w-full">+ Ajouter une ligne</button>
//         </div>
//         <div className="flex gap-2 justify-end">
//           <button onClick={onClose} className="btn-ghost">Annuler</button>
//           <button onClick={() => mut.mutate({ supplier: supplierId, expectedDate, items: items.map(i => ({...i, totalPrice: i.quantity*i.unitPrice})) })} disabled={!supplierId || mut.isPending} className="btn-primary">
//             {mut.isPending ? 'Création...' : 'Créer le BC'}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ── SUPPLIERS PAGE ────────────────────────────────────────────────────────────
// export function SuppliersPage() {
//   const [showNew, setShowNew] = useState(false);
//   const { data, isLoading } = useQuery({ queryKey:['suppliers'], queryFn: supplierService.getAll });
//   const suppliers = data?.data?.data || [];
//   return (
//     <div className="p-6 space-y-5 animate-fade-in">
//       <div className="flex items-center justify-between">
//         <div><h1 className="text-xl font-semibold text-slate-100">Fournisseurs</h1><p className="text-sm text-slate-500 mt-0.5">{suppliers.length} fournisseurs actifs</p></div>
//         <button onClick={() => setShowNew(true)} className="btn-primary btn-sm"><Plus size={14} /> Ajouter</button>
//       </div>
//       <div className="card overflow-hidden">
//         {isLoading ? <div className="py-16 text-center text-slate-600 text-sm">Chargement...</div> : (
//           <table className="table">
//             <thead><tr><th>Fournisseur</th><th>Contact</th><th>Délai livraison</th><th>Paiement</th><th>Score qualité</th><th>Statut</th></tr></thead>
//             <tbody>
//               {suppliers.map(s => (
//                 <tr key={s._id}>
//                   <td><div className="col-main">{s.name}</div><div className="text-xs text-slate-500 mono">{s.code}</div></td>
//                   <td><div className="text-xs text-slate-300">{s.contact?.name}</div><div className="text-xs text-slate-500">{s.contact?.phone}</div></td>
//                   <td className="text-xs text-slate-400">{s.deliveryDelay} jours</td>
//                   <td className="text-xs text-slate-400">{s.paymentTerms} jours</td>
//                   <td>
//                     <div className="flex items-center gap-2">
//                       <div className="progress w-16"><div className={`progress-fill ${s.qualityScore>=90?'bg-emerald-500':s.qualityScore>=70?'bg-amber-500':'bg-red-500'}`} style={{width:`${s.qualityScore}%`}} /></div>
//                       <span className={`text-xs mono font-medium ${s.qualityScore>=90?'text-emerald-400':s.qualityScore>=70?'text-amber-400':'text-red-400'}`}>{s.qualityScore}%</span>
//                     </div>
//                   </td>
//                   <td><span className="badge-green">Actif</span></td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         )}
//       </div>
//       {showNew && <NewSupplierModal onClose={() => setShowNew(false)} />}
//     </div>
//   );
// }

// function NewSupplierModal({ onClose }) {
//   const qc = useQueryClient();
//   const [form, setForm] = useState({ name:'', contact:{ name:'', phone:'', email:'' }, deliveryDelay:5, paymentTerms:30 });
//   const mut = useMutation({ mutationFn: supplierService.create, onSuccess: () => { toast.success('Fournisseur créé'); qc.invalidateQueries(['suppliers']); onClose(); }, onError: e => toast.error(e.message) });
//   return (
//     <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
//       <div className="card w-full max-w-md p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
//         <h3 className="text-base font-semibold text-slate-100 mb-5">Nouveau fournisseur</h3>
//         <div className="space-y-3">
//           <div><label className="label">Raison sociale *</label><input className="input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} /></div>
//           <div><label className="label">Nom contact</label><input className="input" value={form.contact.name} onChange={e => setForm(f=>({...f,contact:{...f.contact,name:e.target.value}}))} /></div>
//           <div><label className="label">Téléphone</label><input className="input" value={form.contact.phone} onChange={e => setForm(f=>({...f,contact:{...f.contact,phone:e.target.value}}))} /></div>
//           <div><label className="label">Email</label><input className="input" value={form.contact.email} onChange={e => setForm(f=>({...f,contact:{...f.contact,email:e.target.value}}))} /></div>
//           <div className="grid grid-cols-2 gap-3">
//             <div><label className="label">Délai livraison (j)</label><input type="number" className="input" value={form.deliveryDelay} onChange={e => setForm(f=>({...f,deliveryDelay:+e.target.value}))} /></div>
//             <div><label className="label">Paiement (j)</label><input type="number" className="input" value={form.paymentTerms} onChange={e => setForm(f=>({...f,paymentTerms:+e.target.value}))} /></div>
//           </div>
//         </div>
//         <div className="flex gap-2 justify-end mt-5">
//           <button onClick={onClose} className="btn-ghost">Annuler</button>
//           <button onClick={() => mut.mutate(form)} disabled={!form.name||mut.isPending} className="btn-primary">{mut.isPending?'Création...':'Créer'}</button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ── CLIENTS PAGE ──────────────────────────────────────────────────────────────
// export function ClientsPage() {
//   const [search, setSearch] = useState('');
//   const [level, setLevel]   = useState('');
//   const { data, isLoading } = useQuery({ queryKey:['clients',search,level], queryFn: () => clientService.getAll({ search, level, limit:50 }) });
//   const clients = data?.data?.data || [];
//   const LEVEL_COLORS = { or:'text-amber-400', argent:'text-slate-300', bronze:'text-amber-700' };
//   return (
//     <div className="p-6 space-y-5 animate-fade-in">
//       <div className="flex items-center justify-between">
//         <div><h1 className="text-xl font-semibold text-slate-100">Clients & Fidélité</h1><p className="text-sm text-slate-500 mt-0.5">{data?.data?.total || 0} clients enregistrés</p></div>
//         <button className="btn-primary btn-sm"><Plus size={14} /> Nouveau client</button>
//       </div>
//       <div className="flex gap-3">
//         <div className="relative flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input className="input pl-9 input-sm" placeholder="Nom, téléphone..." value={search} onChange={e=>setSearch(e.target.value)} /></div>
//         <select className="input input-sm w-36" value={level} onChange={e=>setLevel(e.target.value)}>
//           <option value="">Tous niveaux</option>
//           <option value="or">Or ★★★</option>
//           <option value="argent">Argent ★★</option>
//           <option value="bronze">Bronze ★</option>
//         </select>
//       </div>
//       <div className="card overflow-hidden">
//         <table className="table">
//           <thead><tr><th>Client</th><th>Téléphone</th><th>Niveau fidélité</th><th>Points</th><th>Total dépensé</th><th>Achats</th><th>Dernière visite</th></tr></thead>
//           <tbody>
//             {isLoading ? <tr><td colSpan={7} className="text-center py-12 text-slate-600">Chargement...</td></tr>
//             : clients.map(c => (
//               <tr key={c._id}>
//                 <td>
//                   <div className="flex items-center gap-2">
//                     <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{c.firstName?.[0]?.toUpperCase() ?? '?'}{c.lastName?.[0]?.toUpperCase() ?? ''}</div>
//                     <div><div className="col-main">{c.firstName} {c.lastName}</div>{c.chronicConditions?.length>0&&<div className="text-[10px] text-slate-500">{c.chronicConditions.join(', ')}</div>}</div>
//                   </div>
//                 </td>
//                 <td className="text-slate-400 text-xs">{c.phone}</td>
//                 <td><span className={`text-xs font-medium capitalize ${LEVEL_COLORS[c.loyaltyLevel]}`}>{c.loyaltyLevel} {c.loyaltyLevel==='or'?'★★★':c.loyaltyLevel==='argent'?'★★':'★'}</span></td>
//                 <td className="mono text-slate-300">{fmt(c.loyaltyPoints)}</td>
//                 <td className="mono text-emerald-400">{fmtDA(c.totalSpent)}</td>
//                 <td className="mono text-slate-400">{c.totalPurchases}</td>
//                 <td className="text-xs text-slate-400">{c.lastVisit ? new Date(c.lastVisit).toLocaleDateString('fr-FR') : '—'}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

// // ── PRESCRIPTIONS PAGE ────────────────────────────────────────────────────────
// export function PrescriptionsPage() {
//   const [status, setStatus] = useState('');
//   const { data, isLoading } = useQuery({ queryKey:['prescriptions',status], queryFn: () => prescriptionService.getAll({ status, limit:30 }) });
//   const prescriptions = data?.data?.data || [];
//   return (
//     <div className="p-6 space-y-5 animate-fade-in">
//       <div className="flex items-center justify-between">
//         <div><h1 className="text-xl font-semibold text-slate-100">Ordonnances</h1><p className="text-sm text-slate-500 mt-0.5">Gestion et dispensation</p></div>
//         <button className="btn-primary btn-sm"><Plus size={14} /> Saisir ordonnance</button>
//       </div>
//       <div className="flex gap-2">
//         {['','en_attente','en_cours','dispensée','expirée'].map(s => (
//           <button key={s} onClick={() => setStatus(s)}
//             className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${status===s?'bg-pharma-pale/20 border-pharma-light text-pharma-light':'border-slate-700 text-slate-500 hover:border-slate-600'}`}>
//             {s||'Toutes'}
//           </button>
//         ))}
//       </div>
//       <div className="card overflow-hidden">
//         <table className="table">
//           <thead><tr><th>N° Ordonnance</th><th>Patient</th><th>Médecin</th><th>Date</th><th>Médicaments</th><th>Interactions</th><th>Statut</th><th>Actions</th></tr></thead>
//           <tbody>
//             {isLoading ? <tr><td colSpan={8} className="text-center py-12 text-slate-600">Chargement...</td></tr>
//             : prescriptions.length===0 ? <tr><td colSpan={8} className="text-center py-12 text-slate-600">Aucune ordonnance</td></tr>
//             : prescriptions.map(p => (
//               <tr key={p._id}>
//                 <td className="col-main mono text-xs">{p.prescriptionNumber}</td>
//                 <td>{p.client?.firstName} {p.client?.lastName}</td>
//                 <td className="text-xs text-slate-400">Dr. {p.doctor?.name || '—'}</td>
//                 <td className="text-xs text-slate-400">{new Date(p.date).toLocaleDateString('fr-FR')}</td>
//                 <td className="text-xs">{p.items?.length} médicaments</td>
//                 <td>{p.hasInteractions ? <span className="badge-amber">⚠ Alerte</span> : <span className="badge-green">Aucune</span>}</td>
//                 <td><Badge value={p.status} /></td>
//                 <td><button className="btn-ghost btn-sm text-xs">Traiter</button></td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

// // ── ANALYTICS PAGE ────────────────────────────────────────────────────────────
// export function AnalyticsPage() {
//   const [aiQuery, setAiQuery] = useState('');
//   const [aiResult, setAiResult] = useState(null);
//   const [aiLoading, setAiLoading] = useState(false);

//   const { data: forecastData } = useQuery({ queryKey:['rupture-forecast'], queryFn: analyticsService.ruptureForecast });
//   const { data: anomalyData }  = useQuery({ queryKey:['anomalies'], queryFn: analyticsService.anomalies });
//   const forecasts = forecastData?.data?.data || [];
//   const anomalies = anomalyData?.data?.data || [];
//   const RISK_COLORS = { critique:'text-red-400 bg-red-900/20', élevé:'text-amber-400 bg-amber-900/20', moyen:'text-orange-400 bg-orange-900/20', faible:'text-emerald-400 bg-emerald-900/20' };

//   const runAI = async () => {
//     if (!aiQuery) return;
//     setAiLoading(true);
//     try {
//       const res = await analyticsService.aiSuggest({ type: 'generic', context: { productName: aiQuery, dci: aiQuery } });
//       setAiResult(res.data?.data);
//     } catch { toast.error('Erreur IA'); }
//     finally { setAiLoading(false); }
//   };

//   return (
//     <div className="p-6 space-y-5 animate-fade-in">
//       <div className="flex items-center justify-between">
//         <div><h1 className="text-xl font-semibold text-slate-100">Analytics IA</h1><p className="text-sm text-slate-500 mt-0.5">Prédictions et détection d'anomalies — Claude API</p></div>
//         <div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse-slow" /><span className="text-xs text-slate-500">Modèle actif</span></div>
//       </div>
//       <div className="card p-5">
//         <div className="flex items-center gap-2 mb-4">
//           <Brain size={16} className="text-purple-400" />
//           <h3 className="text-sm font-semibold text-slate-100">Suggestions Génériques (IA)</h3>
//           <span className="badge-purple">Claude API</span>
//         </div>
//         <div className="flex gap-3">
//           <input className="input flex-1" placeholder="Entrez un nom de médicament pour obtenir des alternatives génériques..." value={aiQuery} onChange={e=>setAiQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&runAI()} />
//           <button onClick={runAI} disabled={!aiQuery||aiLoading} className="btn-primary">
//             {aiLoading ? <span className="flex items-center gap-2"><span className="animate-spin">↻</span>Analyse...</span> : <span className="flex items-center gap-2"><Zap size={14}/>Analyser</span>}
//           </button>
//         </div>
//         {aiResult && (
//           <div className="mt-4 bg-slate-800 rounded-xl p-4">
//             <div className="text-xs text-purple-400 font-medium mb-2">Réponse Claude AI</div>
//             <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">{typeof aiResult === 'string' ? aiResult : JSON.stringify(aiResult, null, 2)}</pre>
//           </div>
//         )}
//       </div>
//       <div className="grid grid-cols-2 gap-4">
//         <div className="card overflow-hidden">
//           <div className="card-header">
//             <div className="flex items-center gap-2"><AlertTriangle size={15} className="text-amber-400" /><span className="text-sm font-semibold text-slate-100">Prévisions de rupture (J+15)</span></div>
//           </div>
//           <table className="table">
//             <thead><tr><th>Produit</th><th>Stock</th><th>Jours restants</th><th>Risque</th></tr></thead>
//             <tbody>
//               {forecasts.length===0 ? <tr><td colSpan={4} className="text-center py-8 text-slate-600">Analyse en cours...</td></tr>
//               : forecasts.slice(0,8).map(f => (
//                 <tr key={f.product._id}>
//                   <td><div className="col-main text-xs">{f.product.name}</div></td>
//                   <td className="mono text-xs">{f.stock}</td>
//                   <td><span className={`mono text-xs font-bold ${f.daysLeft===0?'text-red-400':f.daysLeft<=7?'text-amber-400':'text-slate-300'}`}>{f.daysLeft}j</span></td>
//                   <td><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RISK_COLORS[f.risk]}`}>{f.risk}</span></td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//         <div className="card overflow-hidden">
//           <div className="card-header">
//             <div className="flex items-center gap-2"><Shield size={15} className="text-red-400" /><span className="text-sm font-semibold text-slate-100">Anomalies détectées</span></div>
//           </div>
//           <div className="p-4 space-y-2.5">
//             {anomalies.length===0 ? <div className="text-center py-8 text-slate-600 text-sm">Aucune anomalie détectée</div>
//             : anomalies.slice(0,5).map((a,i) => (
//               <div key={i} className={`alert-box ${a.severity==='critique'?'red':a.severity==='urgent'?'amber':'blue'}`}>
//                 <AlertTriangle size={14} className={a.severity==='critique'?'text-red-400':a.severity==='urgent'?'text-amber-400':'text-blue-400'} />
//                 <div>
//                   <div className="text-xs font-medium text-slate-100 capitalize">{a.type.replace('_',' ')}</div>
//                   <div className="text-[11px] text-slate-400 mt-0.5">{a.description}</div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ── ALERTS PAGE ───────────────────────────────────────────────────────────────
// export function AlertsPage() {
//   const qc = useQueryClient();
//   const { data, isLoading } = useQuery({ queryKey:['alerts'], queryFn: () => alertService.getAll({ isResolved:false, limit:50 }) });
//   const alerts = data?.data?.data || [];
//   const resolveMut = useMutation({
//     mutationFn: ({ id }) => alertService.resolve(id, { note: '' }),
//     onSuccess: () => { toast.success('Alerte résolue'); qc.invalidateQueries(['alerts']); qc.invalidateQueries(['alerts-count']); },
//   });
//   const SEV_ICONS = { critique:'🔴', urgent:'🟡', info:'🔵' };
//   return (
//     <div className="p-6 space-y-5 animate-fade-in">
//       <div className="flex items-center justify-between">
//         <div><h1 className="text-xl font-semibold text-slate-100">Centre d'alertes</h1><p className="text-sm text-slate-500 mt-0.5">{data?.data?.total||0} alertes actives</p></div>
//         <button onClick={() => alertService.readAll().then(()=>qc.invalidateQueries(['alerts']))} className="btn-ghost btn-sm">Tout marquer comme lu</button>
//       </div>
//       <div className="space-y-2.5">
//         {isLoading ? <div className="text-center py-16 text-slate-600 text-sm">Chargement...</div>
//         : alerts.length===0 ? (
//           <div className="card p-12 text-center">
//             <CheckCircle size={32} className="text-emerald-500 mx-auto mb-3" />
//             <div className="text-slate-300 font-medium">Aucune alerte active</div>
//             <div className="text-slate-600 text-sm mt-1">Tout est en ordre</div>
//           </div>
//         ) : alerts.map(a => (
//           <div key={a._id} className={`card p-4 flex items-start gap-3 border-l-4 ${a.severity==='critique'?'border-red-500':a.severity==='urgent'?'border-amber-500':'border-blue-500'}`}>
//             <span className="text-lg flex-shrink-0">{SEV_ICONS[a.severity]}</span>
//             <div className="flex-1 min-w-0">
//               <div className="flex items-center gap-2 mb-0.5">
//                 <span className="text-sm font-medium text-slate-100">{a.title}</span>
//                 <Badge value={a.severity} />
//               </div>
//               <div className="text-xs text-slate-400">{a.message}</div>
//               {a.product && <div className="text-[10px] text-slate-600 mt-1">Produit: {a.product.name}</div>}
//               <div className="text-[10px] text-slate-600 mt-1">{new Date(a.createdAt).toLocaleString('fr-FR')}</div>
//             </div>
//             <button onClick={() => resolveMut.mutate({ id: a._id })} className="btn-ghost btn-sm text-xs flex-shrink-0">Résoudre</button>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// // ── USERS PAGE ────────────────────────────────────────────────────────────────
// export function UsersPage() {
//   const [showNew, setShowNew] = useState(false);
//   const qc = useQueryClient();
//   const { data, isLoading } = useQuery({ queryKey:['users'], queryFn: userService.getAll });
//   const users = data?.data?.data || [];
//   const toggleActive = useMutation({
//     mutationFn: ({ id, active }) => userService.update(id, { active }),
//     onSuccess: () => { toast.success('Compte mis à jour'); qc.invalidateQueries(['users']); },
//   });
//   return (
//     <div className="p-6 space-y-5 animate-fade-in">
//       <div className="flex items-center justify-between">
//         <div><h1 className="text-xl font-semibold text-slate-100">Gestion des Utilisateurs</h1><p className="text-sm text-slate-500 mt-0.5">{users.length} comptes</p></div>
//         <button onClick={() => setShowNew(true)} className="btn-primary btn-sm"><Plus size={14} /> Nouveau compte</button>
//       </div>
//       <div className="card overflow-hidden">
//         {isLoading ? <div className="py-16 text-center text-slate-600 text-sm">Chargement...</div> : (
//           <table className="table">
//             <thead><tr><th>Utilisateur</th><th>Identifiant</th><th>Rôle</th><th>Module</th><th>MFA</th><th>Dernière connexion</th><th>Statut</th><th>Actions</th></tr></thead>
//             <tbody>
//               {users.map(u => (
//                 <tr key={u._id}>
//                   <td>
//                     <div className="flex items-center gap-2">
//                       <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-xs font-bold">{u.firstName?.[0]?.toUpperCase() ?? '?'}{u.lastName?.[0]?.toUpperCase() ?? ''}</div>
//                       <div><div className="col-main">{u.firstName} {u.lastName}</div><div className="text-[10px] text-slate-500">{u.email}</div></div>
//                     </div>
//                   </td>
//                   <td className="mono text-xs text-slate-400">{u.username}</td>
//                   <td><Badge value={u.role} /></td>
//                   <td><span className="badge-slate capitalize">{u.module}</span></td>
//                   <td>{u.mfaEnabled ? <span className="badge-green">Activé</span> : <span className="badge-slate">Désactivé</span>}</td>
//                   <td className="text-xs text-slate-400">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('fr-FR') : 'Jamais'}</td>
//                   <td>{u.active ? <span className="badge-green">Actif</span> : <span className="badge-red">Suspendu</span>}</td>
//                   <td>
//                     <button onClick={() => toggleActive.mutate({ id: u._id, active: !u.active })}
//                       className={`btn-sm ${u.active ? 'btn-ghost text-amber-400 border-amber-900' : 'btn-ghost text-emerald-400 border-emerald-900'}`}>
//                       {u.active ? 'Suspendre' : 'Activer'}
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         )}
//       </div>
//       {showNew && <NewUserModal onClose={() => setShowNew(false)} />}
//     </div>
//   );
// }

// function NewUserModal({ onClose }) {
//   const qc = useQueryClient();
//   const [form, setForm] = useState({ firstName:'', lastName:'', username:'', email:'', password:'', role:'cashier', module:'pharmacy' });
//   const mut = useMutation({ mutationFn: userService.create, onSuccess: () => { toast.success('Utilisateur créé'); qc.invalidateQueries(['users']); onClose(); }, onError: e => toast.error(e.message) });
//   const f = k => e => setForm(s=>({...s,[k]:e.target.value}));
//   return (
//     <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
//       <div className="card w-full max-w-md p-6 animate-slide-up" onClick={e=>e.stopPropagation()}>
//         <h3 className="text-base font-semibold text-slate-100 mb-5">Nouveau compte utilisateur</h3>
//         <div className="grid grid-cols-2 gap-3">
//           <div><label className="label">Prénom *</label><input className="input" value={form.firstName} onChange={f('firstName')} /></div>
//           <div><label className="label">Nom *</label><input className="input" value={form.lastName} onChange={f('lastName')} /></div>
//           <div><label className="label">Identifiant *</label><input className="input" value={form.username} onChange={f('username')} /></div>
//           <div><label className="label">Email *</label><input className="input" value={form.email} onChange={f('email')} /></div>
//           <div className="col-span-2"><label className="label">Mot de passe *</label><input type="password" className="input" value={form.password} onChange={f('password')} placeholder="Min. 6 caractères" /></div>
//           <div><label className="label">Rôle</label>
//             <select className="input" value={form.role} onChange={f('role')}>
//               {['super_admin','admin','depot_manager','depot_staff','pharmacist','cashier','doctor','secretary','viewer'].map(r=><option key={r} value={r}>{r}</option>)}
//             </select>
//           </div>
//           <div><label className="label">Module</label>
//             <select className="input" value={form.module} onChange={f('module')}>
//               {['global','depot','pharmacy','clinic'].map(m=><option key={m} value={m}>{m}</option>)}
//             </select>
//           </div>
//         </div>
//         <div className="flex gap-2 justify-end mt-5">
//           <button onClick={onClose} className="btn-ghost">Annuler</button>
//           <button onClick={() => mut.mutate(form)} disabled={!form.firstName||!form.username||!form.password||mut.isPending} className="btn-primary">{mut.isPending?'Création...':'Créer le compte'}</button>
//         </div>
//       </div>
//     </div>
//   );
// }