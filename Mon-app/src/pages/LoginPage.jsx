import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../contexts/authStore';
import { Eye, EyeOff, Pill, Shield } from 'lucide-react';

export default function LoginPage() {
  const [form, setForm]         = useState({ username: '', password: '' });
  const [mfa, setMfa]           = useState({ show: false, token: '', userId: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const login    = useAuthStore(s => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) return toast.error('Remplissez tous les champs');
    setLoading(true);
    try {
      const payload = mfa.show ? { ...form, mfaToken: mfa.token } : form;
      const res = await login(payload);
      if (res.requiresMfa) {
        setMfa(m => ({ ...m, show: true, userId: res.userId }));
        toast('Code MFA requis', { icon: '🔐' });
      } else {
        toast.success('Connexion réussie !');
        navigate('/');
      }
    } catch (err) {
      toast.error(err.message || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pharma-DEFAULT/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-900/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-pharma-DEFAULT to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-pharma-DEFAULT/20">
            <Pill size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-100">PharmaERP</h1>
          <p className="text-slate-500 text-sm mt-1">Système de Gestion Pharmaceutique</p>
        </div>

        {/* Card */}
        <div className="card p-6 sm:p-8">
          {!mfa.show ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Identifiant</label>
                <input
                  type="text" className="input" placeholder="admin, pharmacist..."
                  value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  autoFocus autoComplete="username"
                />
              </div>
              <div>
                <label className="label">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'} className="input pr-10"
                    placeholder="••••••••"
                    value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Connexion...
                  </span>
                ) : 'Se connecter'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="text-center mb-2">
                <Shield size={32} className="mx-auto text-pharma-light mb-2" />
                <h3 className="font-medium text-slate-100">Vérification en deux étapes</h3>
                <p className="text-xs text-slate-400 mt-1">Entrez le code de votre application d'authentification</p>
              </div>
              <div>
                <label className="label">Code MFA (6 chiffres)</label>
                <input
                  type="text" className="input text-center text-xl tracking-widest font-mono"
                  placeholder="000000" maxLength={6}
                  value={mfa.token} onChange={e => setMfa(m => ({ ...m, token: e.target.value }))}
                  autoFocus
                />
              </div>
              <button type="submit" disabled={loading || mfa.token.length < 6} className="btn-primary w-full justify-center py-2.5">
                {loading ? 'Vérification...' : 'Vérifier'}
              </button>
              <button type="button" onClick={() => setMfa({ show: false, token: '', userId: '' })} className="w-full text-sm text-slate-500 hover:text-slate-300 text-center">
                Retour
              </button>
            </form>
          )}

          {/* Demo accounts */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <p className="text-xs text-slate-500 text-center mb-3">Comptes de démonstration</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { u: 'admin',       p: 'Admin123!',  label: 'Super Admin',   color: 'border-purple-800 text-purple-400' },
                { u: 'pharmacist',  p: 'Pharma123!', label: 'Pharmacien',    color: 'border-blue-800 text-blue-400' },
              ].map(acc => (
                <button
                  key={acc.u}
                  onClick={() => setForm({ username: acc.u, password: acc.p })}
                  className={`text-left p-2.5 rounded-lg border bg-slate-900 hover:bg-slate-800 transition-colors ${acc.color}`}
                >
                  <div className="text-xs font-medium">{acc.label}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">{acc.u}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">PharmaERP v1.0 · MERN Stack · © 2025</p>
      </div>
    </div>
  );
}
