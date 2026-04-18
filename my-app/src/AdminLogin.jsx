import React, { useState } from 'react';
import { supabase } from './supabase';
import { Loader2, Lock, Mail, Store } from 'lucide-react';

const AdminLogin = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .maybeSingle(); 

      if (fetchError || !data) {
        throw new Error("Invalid Email ID or Password. Please check again.");
      }

      localStorage.setItem('admin_user', JSON.stringify(data));
      onLoginSuccess(data);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=2000')] bg-cover bg-center opacity-10"></div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="mx-auto w-14 h-14 md:w-16 md:h-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 mb-6">
          <Store className="text-white w-7 h-7 md:w-8 md:h-8" />
        </div>
        <h2 className="text-center text-2xl md:text-3xl font-serif font-black italic text-white tracking-tight">Restaurant Partner</h2>
        <p className="mt-2 text-center text-xs md:text-sm font-bold text-slate-400 uppercase tracking-widest">Sign in to your dashboard</p>
      </div>

      {/* 🚨 RESPONSIVE BOX WRAPPER */}
      <div className="mt-8 sm:mx-auto w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl md:rounded-3xl sm:px-10 border border-slate-100">
          
          <form className="space-y-5 md:space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 text-red-500 p-4 rounded-xl text-xs font-bold text-center border border-red-100">
                {error}
              </div>
            )}

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><Mail size={18} /></div>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl py-4 pl-12 pr-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500 text-sm md:text-base" placeholder="admin@restaurant.com" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><Lock size={18} /></div>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl py-4 pl-12 pr-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500 text-sm md:text-base" placeholder="••••••••" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-orange-500 text-white py-4 rounded-xl font-black text-sm shadow-xl shadow-orange-500/20 hover:bg-orange-600 flex justify-center items-center gap-2 transition-all">
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Access Dashboard'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;