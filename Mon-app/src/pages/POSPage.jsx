import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { productService, saleService, clientService } from '../services/api';
import { offlineDB } from '../services/offlineDB';
import InvoiceModal from '../components/common/InvoiceModal';
import {
  Search, Trash2, Plus, Minus, User, FileText, CreditCard, Banknote,
  Smartphone, CheckCircle, X, Tag, Pill, Printer, ShoppingCart,
} from 'lucide-react';

const PAY_METHODS = [
  { id: 'espèces',      label: 'Espèces',  icon: Banknote },
  { id: 'carte',        label: 'Carte',    icon: CreditCard },
  { id: 'mobile_money', label: 'Mobile',   icon: Smartphone },
  { id: 'chèque',       label: 'Chèque',   icon: FileText },
  { id: 'crédit',       label: 'Crédit',   icon: Tag },
];

const CATS_BTN = [
  { id: 'all',              label: 'Tous' },
  { id: 'antibiotique',     label: 'Antibiotiques' },
  { id: 'antalgique',       label: 'Antalgiques' },
  { id: 'cardiovasculaire', label: 'Cardio' },
  { id: 'gastroentérologie',label: 'Gastro' },
  { id: 'diabète',          label: 'Diabète' },
  { id: 'parapharmacie',    label: 'Parapharma' },
];

export default function POSPage() {
  const [search, setSearch]         = useState('');
  const [cat, setCat]               = useState('all');
  const [cart, setCart]             = useState([]);
  const [cartOpen, setCartOpen]     = useState(false);
  const [payMethod, setPayMethod]   = useState('espèces');
  const [discount, setDiscount]     = useState(0);
  const [client, setClient]         = useState(null);
  const [amountPaid, setAmountPaid] = useState('');
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [showSuccess, setShowSuccess] = useState(null);
  const [showInvoice, setShowInvoice] = useState(null);
  const searchRef = useRef(null);
  const isOnline  = navigator.onLine;
  const qc        = useQueryClient();

  useEffect(() => { searchRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F8') { e.preventDefault(); handleCheckout(); }
      if (e.key === 'Escape') { setSearch(''); setCartOpen(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const { data: productsData } = useQuery({
    queryKey: ['pos-products', search, cat],
    queryFn: () => search.length >= 2
      ? productService.search(search)
      : productService.getAll({ category: cat === 'all' ? '' : cat, limit: 60 }),
    keepPreviousData: true,
  });

  const products = productsData?.data?.data || [];

  const addToCart = (product) => {
    if (product.stock === 0) { toast.error(`Rupture de stock : ${product.name}`); return; }
    setCart(c => {
      const existing = c.find(i => i._id === product._id);
      if (existing) {
        if (existing.qty >= product.stock) { toast.error('Stock maximum atteint'); return c; }
        return c.map(i => i._id === product._id ? { ...i, qty: i.qty + 1 } : i);
      }
      toast.success(`${product.name} ajouté`, { duration: 1200, position: 'bottom-center' });
      return [...c, { ...product, qty: 1, unitDiscount: 0 }];
    });
  };

  const updateQty = (id, delta) =>
    setCart(c => c.map(i => i._id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i));

  const removeItem = (id) => setCart(c => c.filter(i => i._id !== id));
  const clearCart  = () => { setCart([]); setClient(null); setDiscount(0); setAmountPaid(''); };

  const subtotal    = cart.reduce((s, i) => s + i.retailPrice * i.qty, 0);
  const discountAmt = (subtotal * discount) / 100;
  const tva         = (subtotal - discountAmt) * 0.19;
  const total       = subtotal - discountAmt + tva;
  const change      = amountPaid ? Math.max(0, parseFloat(amountPaid) - total) : 0;
  const totalItems  = cart.reduce((s, i) => s + i.qty, 0);

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

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden bg-slate-950 animate-fade-in">

      {/* ── EN-TÊTE avec recherche + icône panier ───────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-900 border-b border-slate-800 flex-shrink-0">
        {/* Recherche */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            ref={searchRef}
            type="text"
            className="input pl-9 pr-9 text-sm"
            placeholder="Rechercher médicament, DCI..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Bouton client */}
        <button
          onClick={() => setShowClientSearch(true)}
          className={`relative flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center border transition-all ${
            client ? 'border-blue-600 bg-blue-900/30 text-blue-400' : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title={client ? `${client.firstName} ${client.lastName}` : 'Associer un client'}
        >
          <User size={16} />
        </button>

        {/* Icône panier avec badge */}
        <button
          onClick={() => setCartOpen(true)}
          className="relative flex-shrink-0 flex items-center gap-2 px-3 h-9 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
        >
          <ShoppingCart size={16} />
          {totalItems > 0 && (
            <>
              <span className="text-sm font-semibold mono">{total.toLocaleString()} CDF</span>
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {totalItems}
              </span>
            </>
          )}
          {totalItems === 0 && <span className="text-xs text-slate-500">Panier</span>}
        </button>
      </div>

      {/* ── FILTRES CATÉGORIES ───────────────────────────────────────── */}
      <div className="flex gap-1.5 px-3 py-2 border-b border-slate-800 overflow-x-auto scrollbar-hide flex-shrink-0 bg-slate-900">
        {CATS_BTN.map(c => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              cat === c.id
                ? 'bg-pharma-pale/20 border-pharma-light text-pharma-light'
                : 'border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* ── GRILLE PRODUITS (pleine largeur) ────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 content-start">
        {products.map(p => {
          const inCart = cart.find(i => i._id === p._id);
          return (
            <button
              key={p._id}
              onClick={() => addToCart(p)}
              disabled={p.stock === 0}
              className={`pos-product text-left relative flex flex-col ${p.stock === 0 ? 'opacity-40 cursor-not-allowed' : ''} ${inCart ? 'border-pharma-light/50 ring-1 ring-pharma-light/30' : ''}`}
            >
              {/* Badge quantité dans le panier */}
              {inCart && (
                <span className="absolute top-1.5 left-1.5 z-10 min-w-[20px] h-5 bg-pharma-light text-slate-900 text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  ×{inCart.qty}
                </span>
              )}

              {/* Image */}
              {p.image ? (
                <img src={p.image} alt="" className="w-full h-14 object-cover rounded-lg mb-2 border border-slate-700" />
              ) : (
                <div className="w-full h-14 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-600 mb-2">
                  <Pill size={18} />
                </div>
              )}

              <div className="text-xs font-medium text-slate-100 leading-snug mb-0.5 line-clamp-2 flex-1">{p.name}</div>
              <div className="text-[10px] text-slate-500 truncate mb-1.5">{p.activeIngredient}</div>
              <div className="flex items-end justify-between mt-auto">
                <span className="text-xs font-bold text-emerald-400 mono">{p.retailPrice?.toLocaleString()} CDF</span>
                <span className={`text-[10px] ${p.stock === 0 ? 'text-red-400' : p.stock < p.minStock ? 'text-amber-400' : 'text-slate-600'}`}>
                  {p.stock === 0 ? 'Rupture' : `${p.stock}`}
                </span>
              </div>
              {p.requiresPrescription && (
                <span className="absolute top-1.5 right-1.5 text-[9px] text-purple-400 border border-purple-800 rounded px-1 bg-slate-900/80">Rx</span>
              )}
            </button>
          );
        })}
        {products.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-600 gap-2">
            <Pill size={32} className="opacity-30" />
            <span className="text-sm">{search.length >= 2 ? 'Aucun produit trouvé' : 'Chargement...'}</span>
          </div>
        )}
      </div>

      {/* ── BACKDROP panier ─────────────────────────────────────────── */}
      {cartOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setCartOpen(false)}
        />
      )}

      {/* ── PANNEAU PANIER (drawer droite sur desktop, bottom sheet mobile) ── */}
      <div className={`
        fixed z-50 bg-slate-900 flex flex-col shadow-2xl transition-all duration-300 ease-out
        bottom-0 left-0 right-0 rounded-t-2xl max-h-[92vh]
        lg:bottom-auto lg:top-0 lg:right-0 lg:left-auto lg:w-96 lg:h-full lg:rounded-none lg:border-l lg:border-slate-800
        ${cartOpen ? 'translate-y-0 lg:translate-x-0' : 'translate-y-full lg:translate-y-0 lg:translate-x-full'}
      `}>

        {/* Barre de glissement (mobile) */}
        <div className="lg:hidden flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-slate-700 rounded-full" />
        </div>

        {/* En-tête panier */}
        <div className="px-4 py-3 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart size={16} className="text-slate-400" />
              <span className="text-sm font-semibold text-slate-100">Mon panier</span>
              {totalItems > 0 && (
                <span className="bg-emerald-900/40 text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-900">
                  {totalItems} article{totalItems > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {cart.length > 0 && (
                <button onClick={clearCart} className="btn-ghost btn-sm btn-icon text-red-400" title="Vider">
                  <Trash2 size={13} />
                </button>
              )}
              <button onClick={() => setCartOpen(false)} className="btn-ghost btn-sm btn-icon text-slate-500">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Client associé */}
          {client ? (
            <div className="flex items-center gap-2 mt-2 bg-blue-900/20 border border-blue-900/40 rounded-lg px-2.5 py-1.5">
              <User size={12} className="text-blue-400 flex-shrink-0" />
              <span className="text-xs text-blue-300 font-medium truncate">{client.firstName} {client.lastName}</span>
              <span className="text-[10px] text-blue-500 capitalize flex-shrink-0">{client.loyaltyLevel} · {client.loyaltyPoints} pts</span>
              <button onClick={() => setClient(null)} className="ml-auto text-slate-600 hover:text-red-400 flex-shrink-0"><X size={11} /></button>
            </div>
          ) : (
            <button
              onClick={() => setShowClientSearch(true)}
              className="mt-2 w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-dashed border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-400 text-xs transition-all"
            >
              <User size={12} />
              Associer un client fidélité (optionnel)
            </button>
          )}
        </div>

        {/* ── ZONE SCROLLABLE : articles + totaux + paiement ── */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 space-y-3">

          {/* Articles */}
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-600 gap-2">
              <ShoppingCart size={28} className="opacity-30" />
              <span className="text-sm">Votre panier est vide</span>
              <span className="text-xs text-slate-700">Sélectionnez des médicaments</span>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item, idx) => (
                <div key={item._id} className="flex items-center gap-3 bg-slate-800 border border-slate-700/60 rounded-xl p-2.5">
                  <span className="text-[10px] text-slate-600 font-mono w-4 flex-shrink-0 text-center">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-100 truncate">{item.name}</div>
                    <div className="text-[10px] text-slate-500 mono">{item.retailPrice?.toLocaleString()} CDF / unité</div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => updateQty(item._id, -1)} className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-red-900/40 hover:text-red-400 flex items-center justify-center text-slate-300 transition-colors">
                      <Minus size={12} />
                    </button>
                    <span className="w-7 text-center text-sm font-bold mono text-slate-100">{item.qty}</span>
                    <button onClick={() => updateQty(item._id, 1)} className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-emerald-900/40 hover:text-emerald-400 flex items-center justify-center text-slate-300 transition-colors">
                      <Plus size={12} />
                    </button>
                  </div>
                  <div className="text-right flex-shrink-0 min-w-[60px]">
                    <div className="text-xs font-bold mono text-emerald-400">{(item.retailPrice * item.qty).toLocaleString()}</div>
                    <div className="text-[9px] text-slate-600">CDF</div>
                  </div>
                  <button onClick={() => removeItem(item._id)} className="text-slate-600 hover:text-red-400 transition-colors p-0.5 flex-shrink-0">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Totaux + paiement (visibles dans le scroll) */}
          {cart.length > 0 && (
            <div className="space-y-3 pt-1">
              {/* Récapitulatif */}
              <div className="bg-slate-800/60 rounded-xl px-3 py-2.5 space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Sous-total HT</span>
                  <span className="mono">{subtotal.toLocaleString()} CDF</span>
                </div>
                {discountAmt > 0 && (
                  <div className="flex justify-between text-xs text-emerald-500">
                    <span>Remise ({discount}%)</span>
                    <span className="mono">− {discountAmt.toLocaleString()} CDF</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-slate-500">
                  <span>TVA (19%)</span>
                  <span className="mono">+ {Math.round(tva).toLocaleString()} CDF</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-700 pt-1.5 mt-1">
                  <span className="text-sm font-bold text-slate-100">TOTAL TTC</span>
                  <span className="text-base font-bold mono text-emerald-400">{Math.round(total).toLocaleString()} CDF</span>
                </div>
              </div>

              {/* Remise */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 flex-1">Remise globale</span>
                <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5">
                  <input
                    type="number" min={0} max={100}
                    className="bg-transparent w-12 text-sm text-right text-slate-200 focus:outline-none mono"
                    value={discount}
                    onChange={e => setDiscount(Math.min(100, Math.max(0, +e.target.value)))}
                  />
                  <span className="text-xs text-slate-500">%</span>
                </div>
              </div>

              {/* Modes de paiement */}
              <div className="grid grid-cols-5 gap-1.5">
                {PAY_METHODS.map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setPayMethod(id)} title={label}
                    className={`flex flex-col items-center gap-1 py-2 rounded-xl border text-[10px] font-medium transition-all ${
                      payMethod === id
                        ? 'border-pharma-light bg-pharma-pale/20 text-pharma-light'
                        : 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                    }`}>
                    <Icon size={15} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Montant remis */}
              {payMethod === 'espèces' && (
                <div className="space-y-1.5">
                  <input
                    type="number" className="input input-sm"
                    placeholder={`Montant remis CDF (min. ${Math.ceil(total).toLocaleString()})`}
                    value={amountPaid}
                    onChange={e => setAmountPaid(e.target.value)}
                  />
                  {change > 0 && (
                    <div className="flex items-center justify-between bg-emerald-900/25 border border-emerald-900/50 rounded-lg px-3 py-2">
                      <span className="text-xs text-emerald-400">Monnaie à rendre</span>
                      <span className="text-sm font-bold mono text-emerald-400">{Math.round(change).toLocaleString()} CDF</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── BOUTON ENCAISSER toujours visible en bas ── */}
        {cart.length > 0 && (
          <div className="px-4 pb-4 pt-2 flex-shrink-0 bg-slate-900 border-t border-slate-800">
            <button
              onClick={handleCheckout}
              disabled={saleMut.isPending}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl py-4 text-sm transition-all active:scale-[0.98] shadow-lg shadow-emerald-900/40"
            >
              {saleMut.isPending ? (
                <>
                  <span className="animate-spin text-base">↻</span>
                  Traitement...
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  Encaisser — {Math.round(total).toLocaleString()} CDF
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── MODALS ──────────────────────────────────────────────────── */}
      {showClientSearch && (
        <ClientSearchModal
          onSelect={(c) => { setClient(c); setShowClientSearch(false); }}
          onClose={() => setShowClientSearch(false)}
        />
      )}

      {showSuccess && (
        <SaleSuccessModal
          data={showSuccess}
          onClose={() => setShowSuccess(null)}
          onPrint={() => { setShowInvoice(showSuccess); setShowSuccess(null); }}
        />
      )}

      {showInvoice && <InvoiceModal data={showInvoice} onClose={() => setShowInvoice(null)} />}
    </div>
  );
}

// ── Recherche client ───────────────────────────────────────────────────────────
function ClientSearchModal({ onSelect, onClose }) {
  const [q, setQ] = useState('');
  const { data } = useQuery({
    queryKey: ['client-search', q],
    queryFn: () => clientService.getAll({ search: q, limit: 10 }),
    enabled: q.length >= 2,
  });
  const clients = data?.data?.data || [];
  const LEVEL_COLORS = { or: 'text-amber-400', argent: 'text-slate-300', bronze: 'text-amber-700' };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4" onClick={onClose}>
      <div className="card w-full sm:max-w-md p-5 animate-slide-up rounded-t-2xl sm:rounded-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-slate-100 mb-3">Associer un client</h3>
        <input
          autoFocus type="text" className="input mb-3"
          placeholder="Nom, téléphone..."
          value={q} onChange={e => setQ(e.target.value)}
        />
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {clients.map(c => (
            <button key={c._id} onClick={() => onSelect(c)}
              className="w-full text-left flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {c.firstName?.[0]}{c.lastName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-100 truncate">{c.firstName} {c.lastName}</div>
                <div className="text-xs text-slate-500">{c.phone} · {c.loyaltyPoints} pts</div>
              </div>
              <span className={`text-xs font-semibold capitalize flex-shrink-0 ${LEVEL_COLORS[c.loyaltyLevel]}`}>{c.loyaltyLevel}</span>
            </button>
          ))}
          {q.length >= 2 && !clients.length && <div className="text-center text-slate-600 text-sm py-6">Aucun client trouvé</div>}
          {q.length < 2 && <div className="text-center text-slate-600 text-sm py-6">Tapez au moins 2 caractères</div>}
        </div>
        <button className="btn-ghost w-full mt-3" onClick={onClose}>Annuler</button>
      </div>
    </div>
  );
}

// ── Modal succès vente ─────────────────────────────────────────────────────────
function SaleSuccessModal({ data, onClose, onPrint }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="card w-full max-w-xs p-7 text-center animate-slide-up">
        <div className="w-16 h-16 bg-emerald-900/30 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={30} className="text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-100 mb-1">Vente enregistrée !</h3>
        <p className="text-sm text-slate-400 mb-4 mono">{data.saleNumber}</p>
        <div className="bg-slate-800 rounded-xl p-4 mb-5 space-y-2 text-left">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Total encaissé</span>
            <span className="mono font-bold text-emerald-400">{data.total.toLocaleString()} CDF</span>
          </div>
          {data.change > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Monnaie rendue</span>
              <span className="mono text-slate-100">{data.change.toLocaleString()} CDF</span>
            </div>
          )}
          {data.client && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Client</span>
              <span className="text-slate-200">{data.client.firstName} {data.client.lastName}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onPrint} className="btn-ghost flex-1 text-xs gap-1.5">
            <Printer size={13} /> Imprimer
          </button>
          <button onClick={onClose} className="btn-primary flex-1">
            Nouvelle vente
          </button>
        </div>
      </div>
    </div>
  );
}
