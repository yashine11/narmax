import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import SSOButtons from '../components/SSOButtons.jsx';

export default function Register() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/profile', { replace: true });
    }
  }, [loading, user, navigate]);
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-narmax-red/10 border border-narmax-red/30 rounded-xl mb-3 text-narmax-red">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Join NARMAX</h1>
          <p className="text-zinc-400 text-sm mt-2">
            Create your free account in seconds with verified Google or Discord sign-in.
          </p>
        </div>

        {/* Benefits Box */}
        <div className="bg-black/50 border border-zinc-800/80 rounded-xl p-4 mb-6 space-y-2.5">
          <div className="flex items-center gap-2.5 text-xs text-zinc-300">
            <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</span>
            <span>100% Real, verified accounts only</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-zinc-300">
            <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</span>
            <span>No passwords to remember or forget</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-zinc-300">
            <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</span>
            <span>Sync watchlist, history & favorites across all devices</span>
          </div>
        </div>

        {/* SSO Buttons */}
        <SSOButtons mode="Sign up" showDivider={false} />

        {/* Footer */}
        <div className="text-center pt-4 border-t border-zinc-800/80 text-xs text-zinc-400">
          Already have an account?{' '}
          <Link to="/login" className="text-white hover:text-narmax-red font-semibold transition underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
