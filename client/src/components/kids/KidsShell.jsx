import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

const KIDS_KEY = 'narmax_kids_token';

function readKidsToken() {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(KIDS_KEY);
}

export default function KidsShell() {
  const loc = useLocation();
  const token = readKidsToken();
  const isGate = loc.pathname === '/kids' || loc.pathname === '/kids/';

  if (!token && !isGate) {
    return <Navigate to="/kids" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950/50 to-black text-white">
      {token && (
        <header className="sticky top-0 z-50 bg-blue-950/95 border-b border-blue-900/60 backdrop-blur-md">
          <div className="max-w-[1920px] mx-auto px-4 py-3 flex items-center justify-between">
            <span className="font-black text-xl text-blue-100 tracking-tight">NARMAX Kids</span>
            <KidsExit />
          </div>
        </header>
      )}
      <Outlet context={{ kids: true }} />
    </div>
  );
}

function KidsExit() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    try {
      const r = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/kids/exit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (!r.ok) throw new Error();
      sessionStorage.removeItem(KIDS_KEY);
      setOpen(false);
      setCode('');
      window.location.href = '/';
    } catch {
      toast.error('Invalid code');
    }
  };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-sm bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg border border-zinc-600">
        Exit Kids
      </button>
      {open && (
        <div className="fixed inset-0 z-[200] bg-black/85 flex items-center justify-center px-4">
          <form onSubmit={submit} className="bg-zinc-900 border border-zinc-700 rounded-xl p-8 max-w-sm w-full shadow-2xl">
            <h2 className="font-bold text-lg mb-2">Exit Kids Mode</h2>
            <p className="text-zinc-400 text-sm mb-4">Enter the family code.</p>
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded px-3 py-2 mb-4 outline-none focus:border-blue-500"
              placeholder="Code"
            />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-blue-600 py-2 rounded font-bold">
                Unlock
              </button>
              <button type="button" onClick={() => setOpen(false)} className="flex-1 bg-zinc-800 py-2 rounded">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
