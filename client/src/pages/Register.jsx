import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import SSOButtons from '../components/SSOButtons.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const localPart = cleanEmail.split('@')[0] || '';

    // Quick client check for fake emails like 1234@...
    if (/^\d+$/.test(localPart)) {
      toast.error('Please enter a real email address (usernames cannot be all numbers)');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setBusy(true);
    try {
      await register({ username, email: cleanEmail, password });
      toast.success('Account created');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-xl p-8 shadow-card backdrop-blur-md">
        <h1 className="text-3xl font-black mb-2">Join NARMAX</h1>
        <p className="text-zinc-400 text-sm mb-6">
          Already have an account?{' '}
          <Link to="/login" className="text-white hover:underline">
            Sign in
          </Link>
        </p>

        <SSOButtons mode="Sign up" />

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Username</label>
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded px-3 py-2 focus:border-narmax-red outline-none"
            />
          </div>
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
            <label className="text-xs text-zinc-400 block mb-1">Password (min 8)</label>
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
            {busy ? '…' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
