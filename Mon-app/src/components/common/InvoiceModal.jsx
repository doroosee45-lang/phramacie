import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invoiceService, settingsService } from '../../services/api';
import { FileText, X, Printer } from 'lucide-react';

/**
 * Shared invoice/receipt viewer — stylisé pour imprimante thermique (80mm).
 * Used both right after a POS sale and when viewing an existing invoice
 * from the Facturation page, so the two stay visually identical.
 *
 * Expected `data` shape (already normalized by the caller):
 * {
 *   invoiceId?: string,        // if set, the real invoiceNumber is fetched from the backend
 *   invoiceNumber?: string,    // fallback label if invoiceId isn't available (e.g. offline sale)
 *   date: Date,
 *   client?: { firstName, lastName, phone },
 *   items: [{ name, qty, unitPrice, total }],
 *   subtotal, discount?, discountAmt?, tva, total, change?, amountPaid, payMethod,
 * }
 */
export default function InvoiceModal({ data, onClose }) {
  const invoiceRef = useRef(null);

  const { data: invoiceData } = useQuery({
    queryKey: ['invoice', data.invoiceId],
    queryFn: () => invoiceService.getOne(data.invoiceId),
    enabled: !!data.invoiceId,
  });
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.get,
    staleTime: 5 * 60_000,
  });
  const invoiceNumber = invoiceData?.data?.data?.invoiceNumber || data.invoiceNumber;
  const pharmacy = settingsData?.data?.data || { pharmacyName: 'Pharmacie', address: '', phone: '', invoiceFooter: 'Merci de votre confiance.' };

  const fmt = (n) => Math.round(n || 0).toLocaleString('fr-FR');
  const dateStr = data.date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = data.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const handlePrint = () => {
    const content = invoiceRef.current;
    if (!content) return;
    const printWindow = window.open('', '_blank', 'width=420,height=700');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <title>Facture ${invoiceNumber}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Courier New', Courier, monospace; background: #fff; color: #111; font-size: 12px; }
          .invoice { width: 280px; margin: 0 auto; padding: 16px 12px; }
          .center { text-align: center; }
          .name { font-size: 16px; font-weight: bold; letter-spacing: 1px; }
          .sub { font-size: 10px; color: #444; margin-top: 2px; }
          .title { font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-top: 10px; }
          .meta { font-size: 10px; color: #444; margin-top: 2px; }
          .dashed { border: none; border-top: 1px dashed #999; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; }
          th { font-size: 9px; text-transform: uppercase; color: #555; text-align: left; padding: 3px 0; border-bottom: 1px solid #999; }
          th:last-child, td:last-child { text-align: right; }
          td { font-size: 11px; padding: 4px 0; vertical-align: top; border-bottom: 1px dotted #ddd; }
          .item-sub { font-size: 9px; color: #777; }
          .totals { margin-top: 8px; }
          .row { display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; }
          .grand { font-size: 14px; font-weight: bold; border-top: 2px solid #111; border-bottom: 2px solid #111; padding: 6px 0; margin-top: 4px; }
          .footer { text-align: center; margin-top: 14px; font-size: 10px; color: #555; line-height: 1.6; }
          @media print { body { margin: 0; } .invoice { width: 100%; } }
        </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 400);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <span className="text-sm font-semibold text-gray-800 flex items-center gap-2"><FileText size={15} className="text-emerald-600" /> Facture {invoiceNumber}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {/* Receipt preview */}
        <div className="overflow-y-auto flex-1 bg-gray-100 p-4">
          <div ref={invoiceRef} className="invoice bg-white mx-auto shadow" style={{ width: 280, padding: '16px 12px', fontFamily: "'Courier New', Courier, monospace", fontSize: 12, color: '#111' }}>
            <div className="center" style={{ textAlign: 'center' }}>
              <div className="name" style={{ fontSize: 16, fontWeight: 'bold', letterSpacing: 1 }}>{pharmacy.pharmacyName}</div>
              {pharmacy.address && <div className="sub" style={{ fontSize: 10, color: '#444', marginTop: 2 }}>{pharmacy.address}</div>}
              {pharmacy.phone && <div className="sub" style={{ fontSize: 10, color: '#444' }}>{pharmacy.phone}</div>}
              <div className="title" style={{ fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginTop: 10 }}>Facture de vente</div>
              <div className="meta" style={{ fontSize: 10, color: '#444', marginTop: 2 }}>N° {invoiceNumber}</div>
              <div className="meta" style={{ fontSize: 10, color: '#444' }}>{dateStr} à {timeStr}</div>
            </div>

            {data.client && (
              <>
                <hr className="dashed" style={{ border: 'none', borderTop: '1px dashed #999', margin: '8px 0' }} />
                <div style={{ fontSize: 11 }}>
                  <strong>{data.client.firstName} {data.client.lastName}</strong>
                  {data.client.phone && <span style={{ color: '#666' }}> · {data.client.phone}</span>}
                </div>
              </>
            )}

            <hr className="dashed" style={{ border: 'none', borderTop: '1px dashed #999', margin: '8px 0' }} />

            <table>
              <thead>
                <tr>
                  <th style={{ fontSize: 9, textTransform: 'uppercase', color: '#555', textAlign: 'left', borderBottom: '1px solid #999', padding: '3px 0' }}>Médicament</th>
                  <th style={{ fontSize: 9, textTransform: 'uppercase', color: '#555', textAlign: 'center', borderBottom: '1px solid #999', padding: '3px 0' }}>Qté</th>
                  <th style={{ fontSize: 9, textTransform: 'uppercase', color: '#555', textAlign: 'right', borderBottom: '1px solid #999', padding: '3px 0' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontSize: 11, padding: '4px 0', borderBottom: '1px dotted #ddd' }}>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div className="item-sub" style={{ fontSize: 9, color: '#777' }}>{fmt(item.unitPrice)} CDF × {item.qty}</div>
                    </td>
                    <td style={{ fontSize: 11, padding: '4px 0', borderBottom: '1px dotted #ddd', textAlign: 'center' }}>{item.qty}</td>
                    <td style={{ fontSize: 11, padding: '4px 0', borderBottom: '1px dotted #ddd', textAlign: 'right', fontWeight: 600 }}>{fmt(item.total)} CDF</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="totals" style={{ marginTop: 8 }}>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0' }}>
                <span>Sous-total</span><span>{fmt(data.subtotal)} CDF</span>
              </div>
              {data.discountAmt > 0 && (
                <div className="row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0', color: '#2a7a2a' }}>
                  <span>Remise ({data.discount}%)</span><span>− {fmt(data.discountAmt)} CDF</span>
                </div>
              )}
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0' }}>
                <span>TVA (19%)</span><span>{fmt(data.tva)} CDF</span>
              </div>
              <div className="grand" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 'bold', borderTop: '2px solid #111', borderBottom: '2px solid #111', padding: '6px 0', marginTop: 4 }}>
                <span>TOTAL TTC</span><span>{fmt(data.total)} CDF</span>
              </div>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#666', marginTop: 6 }}>
                <span>Paiement</span><span style={{ textTransform: 'uppercase' }}>{data.payMethod}</span>
              </div>
              {data.change > 0 && (
                <div className="row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 'bold', color: '#1a5f9a', marginTop: 2 }}>
                  <span>Monnaie rendue</span><span>{fmt(data.change)} CDF</span>
                </div>
              )}
            </div>

            <div className="footer" style={{ textAlign: 'center', marginTop: 14, fontSize: 10, color: '#555', lineHeight: 1.6 }}>
              <div>{pharmacy.invoiceFooter}</div>
              <div>Conservez ce reçu pour tout échange.</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 py-3 border-t border-gray-200 flex-shrink-0 bg-white">
          <button onClick={handlePrint} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors">
            <Printer size={15} /> Imprimer / PDF
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm transition-colors">Fermer</button>
        </div>
      </div>
    </div>
  );
}
