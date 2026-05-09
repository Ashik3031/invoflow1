import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Store, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const setAuth = useAuthStore(state => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuth(data.user, data.token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 bg-brand rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-indigo-100">
            <Store className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome Back</h1>
          <p className="text-sm text-slate-500 font-medium">Access your shop terminal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label-micro block mb-2">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-base w-full"
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label className="label-micro block mb-2">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-base w-full"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-xs font-bold text-rose-500 text-center uppercase tracking-wider">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'SIGN IN'}
          </button>
        </form>

        <p className="text-center mt-8 text-sm text-slate-500 font-medium">
          New shop?{' '}
          <Link to="/signup" className="text-brand font-bold hover:underline">
            Create an ID
          </Link>
        </p>
      </div>
    </div>
  );
}
