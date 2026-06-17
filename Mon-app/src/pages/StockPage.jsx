import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { productService } from '../services/api';
import useAuthStore from '../contexts/authStore';
import { Search, Plus, Download, Filter, AlertTriangle, Clock, ChevronRight, Pill, Camera } from 'lucide-react';

function ProductThumb({ image, size = 36 }) {
  if (image) {
    return <img src={image} alt="" className="rounded-lg object-cover border border-slate-700 flex-shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <div className="rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-600 flex-shrink-0" style={{ width: size, height: size }}>
      <Pill size={size * 0.5} />
    </div>
  );
}

const CATS = [
  { value: '', label: 'Toutes catégories' },
  { value: 'antibiotique', label: 'Antibiotiques' },
  { value: 'antalgique', label: 'Antalgiques' },
  { value: 'cardiovasculaire', label: 'Cardiovasculaire' },
  { value: 'gastroentérologie', label: 'Gastro' },
  { value: 'diabète', label: 'Diabète' },
  { value: 'neurologie', label: 'Neurologie' },
  { value: 'parapharmacie', label: 'Parapharmacie' },
  { value: 'dispositif_médical', label: 'Dispositifs médicaux' },
];

export default function StockPage() {
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [cat, setCat]         = useState('');
  const [page, setPage]       = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected]  = useState(null);
  const isAdmin = useAuthStore(s => s.isAdmin());
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, status, cat, page],
    queryFn: () => productService.getAll({ search, status, category: cat, page, limit: 30 }),
    keepPreviousData: true,
  });

  const { data: lowData } = useQuery({
    queryKey: ['low-stock'],
    queryFn: productService.lowStock,
  });
  const { data: expData } = useQuery({
    queryKey: ['expiring', 30],
    queryFn: () => productService.expiring(30),
  });

  const adjustMut = useMutation({
    mutationFn: ({ id, ...d }) => productService.adjust(id, d),
    onSuccess: () => { toast.success('Stock ajusté'); qc.invalidateQueries(['products']); setSelected(null); },
    onError:   (e) => toast.error(e.message),
  });

  const products = data?.data?.data || [];
  const total    = data?.data?.total || 0;
  const pages    = data?.data?.pages || 1;

  const stockBadge = (p) => {
    if (p.stock === 0)              return <span className="badge-red">Rupture</span>;
    if (p.stock < p.minStock)       return <span className="badge-amber">Stock bas</span>;
    return <span className="badge-green">Normal</span>;
  };

  const nearestExpiry = (p) => {
    const active = p.lots?.filter(l => l.quantity > 0) || [];
    if (!active.length) return null;
    return active.reduce((m, l) => new Date(l.expiryDate) < new Date(m.expiryDate) ? l : m);
  };

  const expiryColor = (d) => {
    if (!d) return 'text-slate-600';
    const days = Math.floor((new Date(d) - new Date()) / 86400000);
    if (days < 0)  return 'text-red-400';
    if (days <= 30) return 'text-red-400';
    if (days <= 90) return 'text-amber-400';
    return 'text-slate-400';
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Stock & Produits</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} références actives</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button className="btn-ghost btn-sm"><Download size={14} /> Exporter</button>
          {isAdmin && (
            <button onClick={() => setShowModal(true)} className="btn-primary btn-sm"><Plus size={14} /> Nouveau produit</button>
          )}
        </div>
      </div>

      {/* Alert summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-red-900/20 border border-red-900/40">
          <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
          <div>
            <div className="text-sm font-medium text-slate-100">{lowData?.data?.data?.length || 0} produit(s) en stock bas ou rupture</div>
            <div className="text-xs text-slate-500">Nécessite réapprovisionnement</div>
          </div>
          <ChevronRight size={14} className="text-slate-600 ml-auto" />
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-900/20 border border-amber-900/40">
          <Clock size={18} className="text-amber-400 flex-shrink-0" />
          <div>
            <div className="text-sm font-medium text-slate-100">{expData?.data?.data?.length || 0} produit(s) expirant dans 30 jours</div>
            <div className="text-xs text-slate-500">Vérifier et traiter en priorité</div>
          </div>
          <ChevronRight size={14} className="text-slate-600 ml-auto" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:flex-wrap">
        <div className="relative flex-1 sm:min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text" className="input pl-9 input-sm" placeholder="Rechercher nom, DCI, code-barres..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex gap-3">
          <select className="input input-sm flex-1 sm:w-40 sm:flex-none" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Tous les statuts</option>
            <option value="rupture">Rupture (0)</option>
            <option value="bas">Stock bas</option>
            <option value="normal">Normal</option>
          </select>
          <select className="input input-sm flex-1 sm:w-44 sm:flex-none" value={cat} onChange={e => { setCat(e.target.value); setPage(1); }}>
            {CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-600 text-sm">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Produit / DCI</th>
                  <th>Code ATC</th>
                  <th>Catégorie</th>
                  <th>Lot / Expiration</th>
                  <th>Stock</th>
                  <th>Niveaux</th>
                  <th>Prix achat</th>
                  <th>Prix vente</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr><td colSpan={11} className="text-center text-slate-600 py-12">Aucun produit trouvé</td></tr>
                ) : products.map(p => {
                  const exp = nearestExpiry(p);
                  const expDate = exp ? new Date(exp.expiryDate) : null;
                  const daysToExp = expDate ? Math.floor((expDate - new Date()) / 86400000) : null;
                  return (
                    <tr key={p._id}>
                      <td><ProductThumb image={p.image} /></td>
                      <td>
                        <div className="col-main">{p.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{p.activeIngredient} · {p.form} {p.dosage}</div>
                      </td>
                      <td><span className="mono text-xs text-slate-400">{p.atcCode || '—'}</span></td>
                      <td><span className="badge-slate text-xs capitalize">{p.category?.replace('_',' ')}</span></td>
                      <td>
                        {exp ? (
                          <div>
                            <div className="text-xs mono text-slate-400">{exp.lotNumber}</div>
                            <div className={`text-xs mono ${expiryColor(exp.expiryDate)}`}>
                              {expDate?.toLocaleDateString('fr-DZ')}
                              {daysToExp !== null && daysToExp <= 90 && ` (J-${daysToExp})`}
                            </div>
                          </div>
                        ) : <span className="text-slate-600">—</span>}
                      </td>
                      <td>
                        <div className={`text-base font-bold mono ${p.stock === 0 ? 'text-red-400' : p.stock < p.minStock ? 'text-amber-400' : 'text-slate-100'}`}>
                          {p.stock}
                        </div>
                        <div className="w-20 mt-1">
                          <div className="progress">
                            <div className={`progress-fill ${p.stock === 0 ? 'bg-red-500' : p.stock < p.minStock ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(100, p.maxStock > 0 ? (p.stock / p.maxStock) * 100 : 0)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td><span className="text-xs text-slate-500">Min: {p.minStock} / Max: {p.maxStock}</span></td>
                      <td><span className="mono text-xs text-slate-300">{p.purchasePrice?.toLocaleString()} CDF</span></td>
                      <td><span className="mono text-xs text-emerald-400">{p.retailPrice?.toLocaleString()} CDF</span></td>
                      <td>{stockBadge(p)}</td>
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => setSelected({ ...p, action: 'adjust' })}
                            className="btn-ghost btn-sm btn-icon" title="Ajuster stock">⇅</button>
                          {isAdmin && (
                            <button onClick={() => setSelected({ ...p, action: 'photo' })}
                              className="btn-ghost btn-sm btn-icon" title="Changer la photo"><Camera size={13} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <span className="text-xs text-slate-500">{total} produits · Page {page}/{pages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="btn-ghost btn-sm">← Préc.</button>
              <button onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page === pages} className="btn-ghost btn-sm">Suiv. →</button>
            </div>
          </div>
        )}
      </div>

      {/* Adjust stock modal */}
      {selected?.action === 'adjust' && (
        <AdjustModal product={selected} onClose={() => setSelected(null)} onSubmit={(qty, reason) =>
          adjustMut.mutate({ id: selected._id, quantity: qty, reason })
        } />
      )}

      {/* Add product modal */}
      {showModal && <AddProductModal onClose={() => setShowModal(false)} />}

      {/* Photo modal */}
      {selected?.action === 'photo' && (
        <PhotoModal product={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function PhotoModal({ product, onClose }) {
  const qc = useQueryClient();
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(product.image || null);
  const mut = useMutation({
    mutationFn: () => productService.uploadImage(product._id, photo),
    onSuccess: () => { toast.success('Photo mise à jour'); qc.invalidateQueries(['products']); onClose(); },
    onError: e => toast.error(e.message),
  });
  const onPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card w-full max-w-sm p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-slate-100 mb-1">Photo du produit</h3>
        <p className="text-sm text-slate-500 mb-4">{product.name}</p>
        <label className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-slate-700 hover:border-slate-600 cursor-pointer transition-colors">
          {preview ? (
            <img src={preview} alt="" className="w-16 h-16 rounded-lg object-cover border border-slate-700" />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-600"><Camera size={22} /></div>
          )}
          <span className="text-sm text-slate-400">{photo ? photo.name : 'Choisir une photo (jpg, png, webp)'}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPhotoChange} />
        </label>
        <div className="flex gap-2 justify-end mt-5">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={() => mut.mutate()} disabled={!photo || mut.isPending} className="btn-primary">
            {mut.isPending ? 'Envoi...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdjustModal({ product, onClose, onSubmit }) {
  const [qty, setQty]       = useState(product.stock);
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-5 sm:p-6 animate-slide-up max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-slate-100 mb-1">Ajuster le stock</h3>
        <p className="text-sm text-slate-500 mb-5">{product.name} · Stock actuel: <strong className="text-slate-300">{product.stock}</strong></p>
        <div className="form-group">
          <label className="label">Nouvelle quantité</label>
          <input type="number" className="input" min={0} value={qty} onChange={e => setQty(+e.target.value)} />
        </div>
        <div className="form-group">
          <label className="label">Motif</label>
          <input type="text" className="input" placeholder="Inventaire, casse, péremption..." value={reason} onChange={e => setReason(e.target.value)} />
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={() => onSubmit(qty, reason)} className="btn-primary">Confirmer l'ajustement</button>
        </div>
      </div>
    </div>
  );
}

function AddProductModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name:'', activeIngredient:'', atcCode:'', category:'antibiotique', form:'comprimé', dosage:'', purchasePrice:0, wholesalePrice:0, retailPrice:0, minStock:50, maxStock:500, requiresPrescription:false });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const mut = useMutation({
    mutationFn: async (data) => {
      const { data: created } = await productService.create(data);
      const product = created.data;
      if (photo) await productService.uploadImage(product._id, photo);
      return product;
    },
    onSuccess: () => { toast.success('Produit créé'); qc.invalidateQueries(['products']); onClose(); },
    onError: e => toast.error(e.message),
  });
  const f = (k) => (e) => setForm(s => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const onPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card w-full max-w-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-slate-100 mb-5">Nouveau produit</h3>
        <div className="form-group mb-4">
          <label className="label">Photo du médicament *</label>
          <label className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-slate-700 hover:border-slate-600 cursor-pointer transition-colors">
            {photoPreview ? (
              <img src={photoPreview} alt="" className="w-14 h-14 rounded-lg object-cover border border-slate-700" />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-600"><Camera size={20} /></div>
            )}
            <span className="text-sm text-slate-400">{photo ? photo.name : 'Choisir une photo (jpg, png, webp — 5 Mo max)'}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPhotoChange} />
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="form-group sm:col-span-2"><label className="label">Nom commercial *</label><input className="input" value={form.name} onChange={f('name')} /></div>
          <div className="form-group"><label className="label">DCI / Principe actif *</label><input className="input" value={form.activeIngredient} onChange={f('activeIngredient')} /></div>
          <div className="form-group"><label className="label">Code ATC</label><input className="input" value={form.atcCode} onChange={f('atcCode')} /></div>
          <div className="form-group"><label className="label">Catégorie</label>
            <select className="input" value={form.category} onChange={f('category')}>
              {CATS.slice(1).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="label">Forme</label>
            <select className="input" value={form.form} onChange={f('form')}>
              {['comprimé','gélule','sirop','injectable','pommade','suppositoire','patch','gouttes','spray','autre'].map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="label">Dosage</label><input className="input" placeholder="ex: 500mg" value={form.dosage} onChange={f('dosage')} /></div>
          <div className="form-group"><label className="label">Prix achat (CDF) *</label><input type="number" className="input" value={form.purchasePrice} onChange={f('purchasePrice')} /></div>
          <div className="form-group"><label className="label">Prix gros (CDF) *</label><input type="number" className="input" value={form.wholesalePrice} onChange={f('wholesalePrice')} /></div>
          <div className="form-group"><label className="label">Prix détail (CDF) *</label><input type="number" className="input" value={form.retailPrice} onChange={f('retailPrice')} /></div>
          <div className="form-group"><label className="label">Stock min</label><input type="number" className="input" value={form.minStock} onChange={f('minStock')} /></div>
          <div className="form-group"><label className="label">Stock max</label><input type="number" className="input" value={form.maxStock} onChange={f('maxStock')} /></div>
          <div className="form-group flex items-center gap-2 sm:col-span-2 pt-2">
            <input type="checkbox" id="rx" checked={form.requiresPrescription} onChange={f('requiresPrescription')} className="w-4 h-4 accent-pharma-DEFAULT" />
            <label htmlFor="rx" className="text-sm text-slate-300">Médicament sur ordonnance</label>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-slate-800">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={() => mut.mutate(form)} disabled={mut.isPending || !photo || !form.name || !form.activeIngredient} className="btn-primary">
            {mut.isPending ? 'Création...' : 'Créer le produit'}
          </button>
        </div>
      </div>
    </div>
  );
}
