import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Store, Loader2 } from 'lucide-react';
import api from '../lib/api';

export default function SignupPage() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', shopName: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/signup', formData);
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Signup failed');
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Get Started</h1>
          <p className="text-sm text-slate-500 font-medium">Digitalize your retail shop</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label-micro block mb-2">Full Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-base w-full"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="label-micro block mb-2">Retail Shop Name</label>
            <input
              type="text"
              required
              value={formData.shopName}
              onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
              className="input-base w-full"
              placeholder="Balaji General Store"
            />
          </div>
          <div>
            <label className="label-micro block mb-2">Email Address</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input-base w-full"
              placeholder="shop@example.com"
            />
          </div>
          <div>
            <label className="label-micro block mb-2">Security Password</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="input-base w-full"
              placeholder="Min. 8 characters"
            />
          </div>

          {error && <p className="text-xs font-bold text-rose-500 text-center uppercase tracking-wider">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'CREATE TERMINAL'}
          </button>
        </form>

        <p className="text-center mt-8 text-sm text-slate-500 font-medium">
          Already registered?{' '}
          <Link to="/login" className="text-brand font-bold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
