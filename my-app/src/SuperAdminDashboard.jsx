import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Building2, LayoutDashboard, Wallet, Users, PlusCircle, LogOut, X, Loader2, Edit, Trash2 } from 'lucide-react';

const SuperAdminDashboard = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard'); 

  // Modal & Edit States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null); // Pata chalega ki Update karna hai ya Naya banana hai
  
  const [newRest, setNewRest] = useState({
    name: '', contact: '', email: '', password: '', address: '', payment: 'unpaid'
  });

  const [metrics, setMetrics] = useState({ total: 0, active: 0, paid: 0, revenue: 0 });
  const MONTHLY_FEE = 999; 

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase.from('restaurants').select('*').order('id', { ascending: true });
      if (error) throw error;

      if (data) {
        setRestaurants(data);
        const total = data.length;
        const active = data.filter(r => r.status === 'active').length;
        const paid = data.filter(r => r.subscription_status === 'paid').length;
        setMetrics({ total, active, paid, revenue: paid * MONTHLY_FEE });
      }
    } catch (error) {
      console.error("Fetch error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Naya Add karna YA Purana Update karna (Donon isme handle honge)
  const handleSaveRestaurant = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      const payload = {
        name: newRest.name, 
        owner_contact: newRest.contact,
        email: newRest.email,
        password: newRest.password,
        address: newRest.address,
        subscription_status: newRest.payment,
        status: 'active'
      };

      if (editingId) {
        // UPDATE EXISTING RESTAURANT
        const { error } = await supabase.from('restaurants').update(payload).eq('id', editingId);
        if (error) throw error;
        alert("✅ Client Details Updated Successfully!");
      } else {
        // INSERT NEW RESTAURANT
        const { error } = await supabase.from('restaurants').insert([payload]);
        if (error) throw error;
        alert("✅ New Client Onboarded Successfully!");
      }

      closeModal();
      fetchRestaurants(); 

    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setAdding(false);
    }
  };

  // Edit Button Click Function
  const openEditModal = (rest) => {
    setNewRest({
      name: rest.name || '',
      contact: rest.owner_contact || '',
      email: rest.email || '',
      password: rest.password || '',
      address: rest.address || '',
      payment: rest.subscription_status || 'unpaid'
    });
    setEditingId(rest.id);
    setIsModalOpen(true);
  };

  // Delete Button Click Function
  const handleDelete = async (id, name) => {
    const isConfirmed = window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`);
    if (isConfirmed) {
      try {
        const { error } = await supabase.from('restaurants').delete().eq('id', id);
        if (error) throw error;
        fetchRestaurants(); // Refresh list
      } catch (error) {
        alert("Delete failed: " + error.message);
      }
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setNewRest({ name: '', contact: '', email: '', password: '', address: '', payment: 'unpaid' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white flex-col gap-4">
        <Loader2 className="animate-spin text-orange-500" size={40} />
        <p className="font-bold tracking-widest uppercase text-sm text-slate-400">Loading Super Admin...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 relative">
      <aside className="w-64 bg-black text-white p-6 flex flex-col fixed h-full z-10 shadow-2xl">
        <div className="mb-10">
          <h1 className="text-2xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">Gourmet HQ</h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Super Admin Portal</p>
        </div>

        <nav className="flex-1 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <LayoutDashboard size={18} /> Master Dashboard
          </button>
          <button onClick={() => setActiveTab('restaurants')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeTab === 'restaurants' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <Building2 size={18} /> All Restaurants
          </button>
        </nav>
      <div className="mt-auto pt-8 border-t border-slate-800">
          <button 
            onClick={() => {
              localStorage.removeItem('super_admin_auth');
              window.location.href = '/super-admin-login';
            }} 
            className="w-full flex items-center gap-3 p-3 rounded-xl font-bold text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={18} /> Secure Logout
          </button>
        </div>

      </aside>

      <main className="ml-64 flex-1 p-10">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{activeTab === 'dashboard' ? 'Business Overview' : 'Client Management'}</h2>
          </div>
          <button onClick={() => { closeModal(); setIsModalOpen(true); }} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 shadow-lg transition-all active:scale-95">
            <PlusCircle size={18} /> Add New Restaurant
          </button>
        </div>

        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center mb-4"><Building2 size={24} /></div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Clients</p>
                <p className="text-3xl font-black text-slate-800">{metrics.total}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="w-12 h-12 bg-green-50 text-green-500 rounded-xl flex items-center justify-center mb-4"><LayoutDashboard size={24} /></div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Active Status</p>
                <p className="text-3xl font-black text-slate-800">{metrics.active}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center mb-4"><Users size={24} /></div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Paid Subscriptions</p>
                <p className="text-3xl font-black text-slate-800">{metrics.paid}</p>
              </div>
              <div className="bg-gradient-to-br from-slate-900 to-black p-6 rounded-2xl shadow-xl border border-slate-800 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-10"><Wallet size={100} /></div>
                <div className="w-12 h-12 bg-white/10 text-green-400 rounded-xl flex items-center justify-center mb-4"><Wallet size={24} /></div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Monthly MRR</p>
                <p className="text-3xl font-black text-white">₹{metrics.revenue.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RESTAURANTS TABLE (WITH EDIT/DELETE ACTIONS) */}
        {activeTab === 'restaurants' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg">Client Database</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="p-4">ID</th>
                    <th className="p-4">Restaurant</th>
                    <th className="p-4">Email ID</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {restaurants.map((rest) => (
                    <tr key={rest.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-sm font-bold text-slate-400">#{rest.id}</td>
                      <td className="p-4 text-sm font-black text-slate-800">{rest.name}</td>
                      <td className="p-4 text-sm font-medium text-slate-500">{rest.email || 'N/A'}</td>
                      <td className="p-4">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${rest.subscription_status === 'paid' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                          {rest.subscription_status}
                        </span>
                      </td>
                      {/* ACTION BUTTONS (EDIT & DELETE) */}
                      <td className="p-4 text-center flex justify-center gap-3">
                        <button onClick={() => openEditModal(rest)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-all" title="Edit">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(rest.id, rest.name)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL (ADD & EDIT) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-xl text-slate-800 italic">{editingId ? 'Edit Client Details' : 'Onboard New Client'}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-red-500 bg-white p-2 rounded-full shadow-sm"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSaveRestaurant} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Restaurant Name *</label>
                  <input type="text" required value={newRest.name} onChange={(e) => setNewRest({...newRest, name: e.target.value})} className="w-full bg-slate-50 rounded-xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Contact Number</label>
                  <input type="text" value={newRest.contact} onChange={(e) => setNewRest({...newRest, contact: e.target.value})} className="w-full bg-slate-50 rounded-xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                <div>
                  <label className="text-[10px] font-black text-orange-600 uppercase block mb-2">Login Email *</label>
                  <input type="email" required value={newRest.email} onChange={(e) => setNewRest({...newRest, email: e.target.value})} className="w-full bg-white border border-orange-200 rounded-xl p-4 font-bold outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-orange-600 uppercase block mb-2">Password *</label>
                  <input type="text" required value={newRest.password} onChange={(e) => setNewRest({...newRest, password: e.target.value})} className="w-full bg-white border border-orange-200 rounded-xl p-4 font-bold outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Payment Status</label>
                <select value={newRest.payment} onChange={(e) => setNewRest({...newRest, payment: e.target.value})} className="w-full bg-slate-50 rounded-xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500">
                  <option value="paid">✅ Paid (Active)</option>
                  <option value="unpaid">⏳ Unpaid (Trial)</option>
                </select>
              </div>

              <button type="submit" disabled={adding} className="w-full bg-orange-500 text-white py-4 rounded-xl font-black shadow-xl hover:bg-orange-600 flex justify-center items-center">
                {adding ? <Loader2 className="animate-spin" size={20} /> : (editingId ? 'Update Restaurant' : 'Create Profile')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;