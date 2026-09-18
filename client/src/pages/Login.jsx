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

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome, ${u.username}`);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-xl p-8 shadow-card backdrop-blur-md">
        <h1 className="text-3xl font-black mb-2">Sign In</h1>
        <p className="text-zinc-400 text-sm mb-6">
          New to NARMAX?{' '}
          <Link to="/register" className="text-white hover:underline">
            Create an account
          </Link>
        </p>

        <SSOButtons mode="Sign in" />

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded px-3 py-2 focus:border-narmax-red outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded px-3 py-2 focus:border-narmax-red outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-narmax-red hover:bg-red-700 py-3 rounded font-bold transition disabled:opacity-50"
          >
            {busy ? '…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
