import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import SSOButtons from '../components/SSOButtons.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome, ${u.username}`);
      navigate(u.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">Welcome Back</h1>
          <p className="text-zinc-400 text-sm">
            Sign in with your verified account to continue streaming.
          </p>
        </div>

        {/* Google & Discord SSO */}
        <SSOButtons mode="Continue" showDivider={false} />

        {/* Toggle for Admin email login */}
        <div className="mt-6 pt-4 border-t border-zinc-800/80">
          {!showAdminLogin ? (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowAdminLogin(true)}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition underline"
              >
                Administrator email login
              </button>
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Admin Login
                </span>
                <button
                  type="button"
                  onClick={() => setShowAdminLogin(false)}
                  className="text-xs text-zinc-500 hover:text-zinc-300"
                >
                  ✕ Close
                </button>
              </div>

              <form onSubmit={submit} className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-narmax-red outline-none"
                    placeholder="admin@narmax.local"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-narmax-red outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 py-2.5 rounded-lg text-sm font-bold text-white transition disabled:opacity-50"
                >
                  {busy ? 'Authenticating…' : 'Sign in as Admin'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 pt-4 border-t border-zinc-800/80 text-xs text-zinc-400">
          New to NARMAX?{' '}
          <Link to="/register" className="text-white hover:text-narmax-red font-semibold transition underline">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
