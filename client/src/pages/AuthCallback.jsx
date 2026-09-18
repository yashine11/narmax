import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const [statusText, setStatusText] = useState('Completing authentication...');
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const token = params.get('token');
    const err = params.get('error');

    if (err) {
      const decodedErr = decodeURIComponent(err);
      setErrorMsg(decodedErr);
      toast.error(decodedErr);
      setTimeout(() => navigate('/login'), 2500);
      return;
    }

    if (!token) {
      navigate('/login');
      return;
    }

    setStatusText('Signing you into NARMAX...');
    loginWithToken(token)
      .then((user) => {
        toast.success(`Welcome, ${user?.username || 'back'}!`);
        navigate('/');
      })
      .catch((err) => {
        console.error('SSO Token Error:', err);
        const msg = err.response?.data?.message || 'Authentication failed. Please try again.';
        setErrorMsg(msg);
        toast.error(msg);
        setTimeout(() => navigate('/login'), 2500);
      });
  }, [params, navigate, loginWithToken]);

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-xl p-8 text-center shadow-card backdrop-blur-md">
        {errorMsg ? (
          <div className="space-y-4">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto text-red-500">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Sign-in Failed</h2>
            <p className="text-sm text-zinc-400">{errorMsg}</p>
            <p className="text-xs text-zinc-500">Redirecting you to login...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative w-12 h-12 mx-auto">
              <div className="w-12 h-12 border-3 border-zinc-700 border-t-narmax-red rounded-full animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">NARMAX</h2>
            <p className="text-sm text-zinc-400">{statusText}</p>
          </div>
        )}
      </div>
    </div>
  );
}
