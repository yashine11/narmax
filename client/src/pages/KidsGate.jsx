import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const KIDS_KEY = 'narmax_kids_token';

export default function KidsGate() {
  const nav = useNavigate();
  const [code, setCode] = useState('');

  useEffect(() => {
    if (sessionStorage.getItem(KIDS_KEY)) {
      nav('/kids/browse', { replace: true });
    }
  }, [nav]);

  const enter = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/kids/enter`, { code });
      sessionStorage.setItem(KIDS_KEY, data.token);
      setCode('');
      toast.success('Welcome to Kids');
      nav('/kids/browse', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Wrong code');
    }
  };

  return (
    <div className="min-h-[calc(100vh-0px)] flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-zinc-900 border border-blue-900/50 rounded-2xl p-8 text-center shadow-2xl">
        <p className="text-4xl mb-4">🔐</p>
        <h1 className="text-2xl font-black mb-2">Kids Zone</h1>
        <p className="text-zinc-400 text-sm mb-6">Enter the family code. Only kid-friendly titles are shown here.</p>
        <form onSubmit={enter} className="space-y-4">
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Secret code"
            className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-center text-lg tracking-widest focus:border-blue-500 outline-none"
          />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-bold transition">
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
