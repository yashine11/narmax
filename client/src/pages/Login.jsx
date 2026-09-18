import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import SSOButtons from '../components/SSOButtons.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPortal =
    searchParams.get('portal') === 'riablo-sphinx' ||
    searchParams.get('admin') === '1';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submitAdmin = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome back, ${u.username}`);
      navigate('/admin');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Admin authentication failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
        {isPortal ? (
          /* Secret Sphinx Admin Portal View */
          <div>
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-mono mb-3">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>SPHINX PORTAL</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">Admin Authentication</h1>
              <p className="text-zinc-400 text-xs mt-1">
                Authorized master access only.
              </p>
            </div>

            <form onSubmit={submitAdmin} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 block mb-1 font-medium">Administrator Email</label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
                  placeholder="admin@narmax.local"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1 font-medium">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 py-3 rounded-xl text-sm font-bold text-black transition shadow-lg disabled:opacity-50"
              >
                {busy ? 'Authenticating…' : 'Unlock Admin Dashboard'}
              </button>
            </form>

            <div className="text-center mt-6 pt-4 border-t border-zinc-800/80">
              <Link to="/login" className="text-xs text-zinc-500 hover:text-zinc-300 transition">
                ← Return to standard login
              </Link>
            </div>
          </div>
        ) : (
          /* Public Standard Visitor View - 100% Clean */
          <div>
            <div className="text-center mb-6">
              <h1 className="text-3xl font-black text-white tracking-tight mb-2">Welcome Back</h1>
              <p className="text-zinc-400 text-sm">
                Sign in with your verified account to continue streaming.
              </p>
            </div>

            <SSOButtons mode="Continue" showDivider={false} />

            <div className="text-center mt-6 pt-4 border-t border-zinc-800/80 text-xs text-zinc-400">
              New to NARMAX?{' '}
              <Link to="/register" className="text-white hover:text-narmax-red font-semibold transition underline">
                Create an account
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
