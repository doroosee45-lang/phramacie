import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { productService, saleService, clientService } from '../services/api';
import { offlineDB } from '../services/offlineDB';
import InvoiceModal from '../components/common/InvoiceModal';
import { Search, Trash2, Plus, Minus, User, FileText, CreditCard, Banknote, Smartphone, CheckCircle, X, Tag, Pill, Printer, ShoppingCart, ChevronUp } from 'lucide-react';

const PAY_METHODS = [
  { id: 'espèces',      label: 'Espèces',    icon: Banknote },
  { id: 'carte',        label: 'Carte',      icon: CreditCard },
  { id: 'mobile_money', label: 'Mobile',     icon: Smartphone },
  { id: 'chèque',       label: 'Chèque',     icon: FileText },
  { id: 'crédit',       label: 'Crédit',     icon: Tag },
];

export default function POSPage() {
  const [search, setSearch]       = useState('');
  const [cat, setCat]             = useState('all');
  const [cart, setCart]           = useState([]);
  const [payMethod, setPayMethod] = useState('espèces');
  const [discount, setDiscount]   = useState(0);
  const [client, setClient]       = useState(null);
  const [amountPaid, setAmountPaid] = useState('');
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [showSuccess, setShowSuccess] = useState(null);
  const [showInvoice, setShowInvoice] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const searchRef = useRef(null);
  const isOnline  = navigator.onLine;
  const qc        = useQueryClient();

  // Focus search on mount
  useEffect(() => { searchRef.current?.focus(); }, []);

  // Keyboard shortcut F2 = focus search
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F8') { e.preventDefault(); handleCheckout(); }
      if (e.key === 'Escape') setSearch('');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const { data: productsData } = useQuery({
    queryKey: ['pos-products', search, cat],
    queryFn: () => search.length >= 2
      ? productService.search(search)
      : productService.getAll({ category: cat === 'all' ? '' : cat, limit: 50 }),
    keepPreviousData: true,
  });

  const products = productsData?.data?.data || [];

  const addToCart = (product) => {
    if (product.stock === 0) { toast.error(`Rupture de stock : ${product.name}`); return; }
    setCart(c => {
      const existing = c.find(i => i._id === product._id);
      if (existing) {
        if (existing.qty >= product.stock) { toast.error('Quantité maximale atteinte'); return c; }
        return c.map(i => i._id === product._id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...c, { ...product, qty: 1, unitDiscount: 0 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(c => c.map(i => i._id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i).filter(i => i.qty > 0));
  };

  const removeItem = (id) => setCart(c => c.filter(i => i._id !== id));
  const clearCart  = () => { setCart([]); setClient(null); setDiscount(0); setAmountPaid(''); };

  // Totals
  const subtotal   = cart.reduce((s, i) => s + i.retailPrice * i.qty, 0);
  const discountAmt = (subtotal * discount) / 100;
  const tva        = (subtotal - discountAmt) * 0.19;
  const total      = subtotal - discountAmt + tva;
  const change     = amountPaid ? Math.max(0, parseFloat(amountPaid) - total) : 0;

  const saleMut = useMutation({
    mutationFn: async (data) => {
      if (isOnline) return saleService.create(data);
      await offlineDB.saveSale({ ...data, cashier: 'offline' });
      return { data: { data: { saleNumber: `OFF-${Date.now()}` }, invoiceId: null } };
    },
    onSuccess: (res) => {
      setShowSuccess({
        saleNumber: res.data.data.saleNumber,
        invoiceNumber: res.data.data.saleNumber,
        invoiceId: res.data.invoiceId,
        items: cart.map(i => ({ name: i.name, qty: i.qty, unitPrice: i.retailPrice, total: i.retailPrice * i.qty })),
        client, payMethod, discount, discountAmt, tva, subtotal, total, change,
        amountPaid: amountPaid ? parseFloat(amountPaid) : total,
        date: new Date(),
      });
      clearCart();
      setCartOpen(false);
      qc.invalidateQueries(['products']);
      qc.invalidateQueries(['dashboard-kpis']);
      if (!isOnline) toast('Vente enregistrée hors-ligne', { icon: '📶' });
    },
    onError: (e) => toast.error(e.message || 'Erreur lors de la vente'),
  });

  const handleCheckout = useCallback(() => {
    if (!cart.length) { toast.error('Panier vide'); return; }
    saleMut.mutate({
      items: cart.map(i => ({ productId: i._id, quantity: i.qty, discount: i.unitDiscount || 0 })),
      clientId: client?._id,
      paymentMethod: payMethod,
      discount,
      amountPaid: amountPaid ? parseFloat(amountPaid) : total,
      isOffline: !isOnline,
    });
  }, [cart, client, payMethod, discount, amountPaid, total, isOnline]);

  const CATS_BTN = [
    { id: 'all', label: 'Tous' },
    { id: 'antibiotique', label: 'Antibiotiques' },
    { id: 'antalgique', label: 'Antalgiques' },
    { id: 'cardiovasculaire', label: 'Cardio' },
    { id: 'gastroentérologie', label: 'Gastro' },
    { id: 'diabète', label: 'Diabète' },
    { id: 'parapharmacie', label: 'Parapharma' },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-56px)] overflow-hidden animate-fade-in">
      {/* LEFT: Products */}
      <div className="flex-1 flex flex-col min-w-0 lg:border-r border-slate-800 overflow-hidden">
        {/* Search */}
        <div className="p-3 border-b border-slate-800 bg-slate-900">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              ref={searchRef}
              type="text" className="input pl-9"
              placeholder="F2 — Rechercher par nom, DCI, code-barres..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"><X size={14} /></button>}
          </div>
        </div>

        {/* Category filters */}
        <div className="flex gap-1.5 px-3 py-2 border-b border-slate-800 overflow-x-auto scrollbar-hide">
          {CATS_BTN.map(c => (
            <button key={c.id} onClick={() => setCat(c.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                cat === c.id
                  ? 'bg-pharma-pale border-pharma-light text-pharma-light'
                  : 'border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600'
              }`}>
              {c.label}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-3 pb-20 lg:pb-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 content-start">
          {products.map(p => (
            <button key={p._id} onClick={() => addToCart(p)}
              className={`pos-product text-left relative ${p.stock === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
              disabled={p.stock === 0}>
              {p.image ? (
                <img src={p.image} alt="" className="w-full h-16 object-cover rounded-lg mb-2 border border-slate-700" />
              ) : (
                <div className="w-full h-16 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-600 mb-2"><Pill size={20} /></div>
              )}
              <div className="text-xs font-medium text-slate-100 leading-snug mb-1 line-clamp-2">{p.name}</div>
              <div className="text-[10px] text-slate-500 mb-2 truncate">{p.activeIngredient}</div>
              <div className="flex items-end justify-between">
                <span className="text-sm font-bold text-emerald-400 mono">{p.retailPrice?.toLocaleString()} CDF</span>
                <span className={`text-[10px] ${p.stock === 0 ? 'text-red-400' : p.stock < p.minStock ? 'text-amber-400' : 'text-slate-600'}`}>
                  {p.stock === 0 ? 'Rupture' : `${p.stock} u.`}
                </span>
              </div>
              {p.requiresPrescription && (
                <span className="absolute top-2 right-2 text-[9px] text-purple-400 border border-purple-800 rounded px-1">Rx</span>
              )}
            </button>
          ))}
          {products.length === 0 && (
            <div className="col-span-full flex items-center justify-center py-16 text-slate-600 text-sm">
              {search.length >= 2 ? 'Aucun produit trouvé' : 'Chargement...'}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Cart — static sidebar on desktop, full-screen sheet on mobile */}
      <div className={`${cartOpen ? 'flex' : 'hidden'} lg:flex fixed inset-0 z-40 lg:static lg:inset-auto lg:z-auto w-full lg:w-80 flex-shrink-0 flex-col bg-slate-900`}>
        {/* Cart header */}
        <div className="p-3 border-b border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <button onClick={() => setCartOpen(false)} className="lg:hidden btn-ghost btn-sm btn-icon" title="Retour">
                <X size={15} />
              </button>
              <div className="text-sm font-semibold text-slate-100">Panier ({cart.length} articles)</div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setShowClientSearch(true)} className="btn-ghost btn-sm btn-icon" title="Client fidélité">
                <User size={13} className={client ? 'text-blue-400' : ''} />
              </button>
              <button onClick={clearCart} className="btn-ghost btn-sm btn-icon text-red-400" title="Vider panier">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
          {client && (
            <div className="flex items-center gap-2 bg-blue-900/20 border border-blue-900/40 rounded-lg px-2.5 py-1.5">
              <User size={12} className="text-blue-400" />
              <span className="text-xs text-blue-300 font-medium">{client.firstName} {client.lastName}</span>
              <span className="text-[10px] text-blue-500 capitalize">{client.loyaltyLevel} · {client.loyaltyPoints} pts</span>
              <button onClick={() => setClient(null)} className="ml-auto text-slate-600 hover:text-red-400"><X size={11} /></button>
            </div>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-600">
              <div className="text-3xl mb-2 opacity-30">🛒</div>
              <div className="text-sm">Panier vide</div>
              <div className="text-xs mt-1">Cliquez sur un produit</div>
            </div>
          ) : cart.map(item => (
            <div key={item._id} className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg p-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-100 truncate">{item.name}</div>
                <div className="text-[10px] text-slate-500 truncate">{item.activeIngredient}</div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQty(item._id, -1)} className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300 transition-colors">
                  <Minus size={10} />
                </button>
                <span className="w-6 text-center text-xs font-bold mono text-slate-100">{item.qty}</span>
                <button onClick={() => updateQty(item._id, 1)} className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300 transition-colors">
                  <Plus size={10} />
                </button>
              </div>
              <div className="text-right min-w-[52px]">
                <div className="text-xs font-bold mono text-slate-100">{(item.retailPrice * item.qty).toLocaleString()}</div>
                <div className="text-[10px] text-slate-500">DA</div>
              </div>
              <button onClick={() => removeItem(item._id)} className="text-slate-600 hover:text-red-400 transition-colors">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Totals & checkout */}
        <div className="border-t border-slate-800 p-3 space-y-3">
          {/* Discount */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 flex-1">Remise globale (%)</span>
            <input type="number" min={0} max={100} className="input input-sm w-20 text-right"
              value={discount} onChange={e => setDiscount(Math.min(100, Math.max(0, +e.target.value)))} />
          </div>

          {/* Totals */}
          <div className="space-y-1.5">
            {[
              ['Sous-total', subtotal],
              ['Remise', -discountAmt, 'text-emerald-400'],
              ['TVA (19%)', tva, 'text-slate-400'],
            ].map(([l, v, cls]) => v !== 0 && (
              <div key={l} className="flex justify-between text-xs">
                <span className="text-slate-500">{l}</span>
                <span className={`mono ${cls || 'text-slate-300'}`}>{v < 0 ? '-' : ''}{Math.abs(v).toLocaleString()} CDF</span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-1.5 border-t border-slate-800">
              <span className="text-sm font-semibold text-slate-100">TOTAL</span>
              <span className="text-lg font-bold mono text-emerald-400">{total.toLocaleString()} CDF</span>
            </div>
          </div>

          {/* Payment method */}
          <div className="grid grid-cols-5 gap-1">
            {PAY_METHODS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setPayMethod(id)}
                className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border text-[10px] transition-all ${
                  payMethod === id
                    ? 'border-pharma-light bg-pharma-pale/20 text-pharma-light'
                    : 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                }`}>
                <Icon size={13} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Amount paid */}
          {payMethod === 'espèces' && (
            <div>
              <label className="label">Montant remis (DA)</label>
              <input type="number" className="input input-sm"
                placeholder={`Min: ${Math.ceil(total)}`}
                value={amountPaid} onChange={e => setAmountPaid(e.target.value)} />
              {change > 0 && (
                <div className="flex justify-between text-xs mt-1.5 bg-emerald-900/20 border border-emerald-900/40 rounded px-2 py-1">
                  <span className="text-emerald-400">Monnaie à rendre</span>
                  <span className="mono font-bold text-emerald-400">{change.toLocaleString()} CDF</span>
                </div>
              )}
            </div>
          )}

          {/* Checkout button */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || saleMut.isPending}
            className="w-full btn-depot py-3 text-sm justify-center disabled:opacity-50">
            {saleMut.isPending ? (
              <span className="flex items-center gap-2"><span className="animate-spin">↻</span>Traitement...</span>
            ) : (
              <span className="flex items-center gap-2"><CheckCircle size={16} />F8 — Encaisser {total.toLocaleString()} CDF</span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile: floating cart bar */}
      {!cartOpen && cart.length > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="lg:hidden fixed bottom-3 left-3 right-3 z-30 flex items-center justify-between gap-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-4 py-3 shadow-xl shadow-emerald-900/40 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <ShoppingCart size={16} />
            {cart.length} article{cart.length > 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1.5 text-sm font-bold">
            {total.toLocaleString()} CDF
            <ChevronUp size={15} />
          </span>
        </button>
      )}

      {/* Client search modal */}
      {showClientSearch && <ClientSearchModal onSelect={(c) => { setClient(c); setShowClientSearch(false); }} onClose={() => setShowClientSearch(false)} />}

      {/* Success modal */}
      {showSuccess && (
        <SaleSuccessModal
          data={showSuccess}
          onClose={() => setShowSuccess(null)}
          onPrint={() => { setShowInvoice(showSuccess); setShowSuccess(null); }}
        />
      )}

      {/* Invoice modal (thermal print) */}
      {showInvoice && <InvoiceModal data={showInvoice} onClose={() => setShowInvoice(null)} />}
    </div>
  );
}

function ClientSearchModal({ onSelect, onClose }) {
  const [q, setQ] = useState('');
  const { data } = useQuery({
    queryKey: ['client-search', q],
    queryFn: () => clientService.getAll({ search: q, limit: 10 }),
    enabled: q.length >= 2,
  });
  const clients = data?.data?.data || [];
  const levelColors = { or: 'text-amber-400', argent: 'text-slate-300', bronze: 'text-amber-700' };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-5 animate-slide-up" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-slate-100 mb-3">Associer un client</h3>
        <input autoFocus type="text" className="input mb-3" placeholder="Nom, téléphone..." value={q} onChange={e => setQ(e.target.value)} />
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {clients.map(c => (
            <button key={c._id} onClick={() => onSelect(c)}
              className="w-full text-left flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {c.firstName[0]}{c.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-100 truncate">{c.firstName} {c.lastName}</div>
                <div className="text-xs text-slate-500">{c.phone} · {c.loyaltyPoints} points</div>
              </div>
              <span className={`text-xs font-medium capitalize ${levelColors[c.loyaltyLevel]}`}>{c.loyaltyLevel}</span>
            </button>
          ))}
          {q.length >= 2 && !clients.length && <div className="text-center text-slate-600 text-sm py-4">Aucun client trouvé</div>}
          {q.length < 2 && <div className="text-center text-slate-600 text-sm py-4">Tapez au moins 2 caractères</div>}
        </div>
        <button className="btn-ghost w-full mt-3" onClick={onClose}>Annuler</button>
      </div>
    </div>
  );
}

function SaleSuccessModal({ data, onClose, onPrint }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-xs p-8 text-center animate-slide-up">
        <div className="w-16 h-16 bg-emerald-900/30 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={30} className="text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-100 mb-1">Vente enregistrée</h3>
        <p className="text-sm text-slate-400 mb-4">{data.saleNumber}</p>
        <div className="bg-slate-800 rounded-xl p-4 mb-5 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Total</span>
            <span className="mono font-bold text-emerald-400">{data.total.toLocaleString()} CDF</span>
          </div>
          {data.change > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Monnaie rendue</span>
              <span className="mono text-slate-100">{data.change.toLocaleString()} CDF</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onPrint} className="btn-ghost flex-1 text-xs"><Printer size={13} /> Imprimer</button>
          <button onClick={onClose} className="btn-primary flex-1">Nouvelle vente</button>
        </div>
      </div>
    </div>
  );
}
