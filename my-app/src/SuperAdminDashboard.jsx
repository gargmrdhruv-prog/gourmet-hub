import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Building2, LayoutDashboard, Wallet, Users, PlusCircle, LogOut, X, Loader2, Edit, Trash2, Menu } from 'lucide-react';
import ThemeCustomizer from './ThemeCustomizer';

const SuperAdminDashboard = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null); 
  const [modalTab, setModalTab] = useState('details'); 
  
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

  const handleSaveRestaurant = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      const cleanEmail = newRest.email.toLowerCase().trim();
      
      const payload = {
        name: newRest.name, 
        owner_contact: newRest.contact,
        email: cleanEmail,
        password: newRest.password,
        address: newRest.address,
        subscription_status: newRest.payment,
        status: 'active'
      };

      if (editingId) {
        // Edit Mode: Update existing details
        const { error } = await supabase.from('restaurants').update(payload).eq('id', editingId);
        if (error) throw error;
        alert("✅ Client Details Updated Successfully!");
      } else {
        // 🛡️ DEFENSE 7 (Part C): Onboarding Auto-Security
        // Naya restaurant banate waqt, sabse pehle Supabase Auth mein secure user banayenge
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: newRest.password,
        });

        if (authError) {
          throw new Error(`Auth Error: ${authError.message} (Database record not created to prevent errors)`);
        }

        // Auth User banne ke baad, uski details normal table mein save karenge
        const { error, data } = await supabase.from('restaurants').insert([payload]).select();
        if (error) throw error;
        
        // Settings row add karna
        if(data && data.length > 0) {
            await supabase.from('restaurant_settings').insert([{ restaurant_id: data[0].id }]);
        }

        // Chupke se sign out karna zaroori hai, warna SuperAdmin ka session is naye restaurant se replace ho jayega
        await supabase.auth.signOut();

        alert("✅ New Client Onboarded & Secured Successfully!");
      }

      closeModal();
      fetchRestaurants(); 

    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setAdding(false);
    }
  };

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
    setModalTab('details'); 
    setIsModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    const isConfirmed = window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`);
    if (isConfirmed) {
      try {
        const { error } = await supabase.from('restaurants').delete().eq('id', id);
        if (error) throw error;
        fetchRestaurants(); 
      } catch (error) {
        alert("Delete failed: " + error.message);
      }
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setModalTab('details');
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
      
      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* --- SIDEBAR --- */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-black text-white p-6 flex flex-col z-50 shadow-2xl transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="mb-10 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">Gourmet HQ</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Super Admin Portal</p>
          </div>
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          <button onClick={() => {setActiveTab('dashboard'); setIsSidebarOpen(false);}} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <LayoutDashboard size={18} /> Master Dashboard
          </button>
          <button onClick={() => {setActiveTab('restaurants'); setIsSidebarOpen(false);}} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeTab === 'restaurants' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
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

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 md:ml-64 w-full">
        {/* MOBILE HEADER */}
        <div className="md:hidden bg-white h-16 border-b border-gray-200 flex items-center px-4 sticky top-0 z-30">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-800">
            <Menu size={24} />
          </button>
          <h1 className="ml-2 font-black italic text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">Gourmet HQ</h1>
        </div>

        <div className="p-4 md:p-10 max-w-[100vw] overflow-x-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 md:mb-10 gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{activeTab === 'dashboard' ? 'Business Overview' : 'Client Management'}</h2>
            </div>
            <button onClick={() => { closeModal(); setIsModalOpen(true); }} className="w-full sm:w-auto justify-center bg-slate-900 text-white px-6 py-3 md:py-4 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 shadow-lg transition-all active:scale-95 text-sm md:text-base">
              <PlusCircle size={18} /> Add New Restaurant
            </button>
          </div>

          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
                <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center mb-4"><Building2 size={20} className="md:w-6 md:h-6" /></div>
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Clients</p>
                  <p className="text-2xl md:text-3xl font-black text-slate-800">{metrics.total}</p>
                </div>
                <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-green-50 text-green-500 rounded-xl flex items-center justify-center mb-4"><LayoutDashboard size={20} className="md:w-6 md:h-6" /></div>
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Active Status</p>
                  <p className="text-2xl md:text-3xl font-black text-slate-800">{metrics.active}</p>
                </div>
                <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center mb-4"><Users size={20} className="md:w-6 md:h-6" /></div>
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Paid Subscriptions</p>
                  <p className="text-2xl md:text-3xl font-black text-slate-800">{metrics.paid}</p>
                </div>
                <div className="bg-gradient-to-br from-slate-900 to-black p-5 md:p-6 rounded-2xl shadow-xl border border-slate-800 relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 opacity-10"><Wallet size={100} /></div>
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 text-green-400 rounded-xl flex items-center justify-center mb-4"><Wallet size={20} className="md:w-6 md:h-6" /></div>
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Monthly MRR</p>
                  <p className="text-2xl md:text-3xl font-black text-white">₹{metrics.revenue.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RESTAURANTS TABLE */}
          {activeTab === 'restaurants' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
              <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-base md:text-lg">Client Database</h3>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full min-w-[600px] text-left">
                  <thead className="bg-slate-50 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <tr>
                      <th className="p-3 md:p-4">ID</th>
                      <th className="p-3 md:p-4">Restaurant</th>
                      <th className="p-3 md:p-4">Email ID</th>
                      <th className="p-3 md:p-4">Status</th>
                      <th className="p-3 md:p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {restaurants.map((rest) => (
                      <tr key={rest.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 md:p-4 text-xs md:text-sm font-bold text-slate-400">#{rest.id}</td>
                        <td className="p-3 md:p-4 text-xs md:text-sm font-black text-slate-800">{rest.name}</td>
                        <td className="p-3 md:p-4 text-xs md:text-sm font-medium text-slate-500">{rest.email || 'N/A'}</td>
                        <td className="p-3 md:p-4">
                          <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest px-2 py-1 md:px-3 md:py-1 rounded-full ${rest.subscription_status === 'paid' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                            {rest.subscription_status}
                          </span>
                        </td>
                        <td className="p-3 md:p-4 text-center flex justify-center gap-2 md:gap-3">
                          <button onClick={() => openEditModal(rest)} className="p-1.5 md:p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-all" title="Edit">
                            <Edit size={14} className="md:w-4 md:h-4" />
                          </button>
                          <button onClick={() => handleDelete(rest.id, rest.name)} className="p-1.5 md:p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all" title="Delete">
                            <Trash2 size={14} className="md:w-4 md:h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL (ADD & EDIT) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden my-8">
            <div className="p-5 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-lg md:text-xl text-slate-800 italic">{editingId ? 'Edit Client Details' : 'Onboard New Client'}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-red-500 bg-white p-2 rounded-full shadow-sm"><X size={18} /></button>
            </div>
            
            {/* 🚨 MODAL TABS FOR EDITING 🚨 */}
            {editingId && (
              <div className="flex border-b border-slate-100">
                <button 
                  onClick={() => setModalTab('details')}
                  className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${modalTab === 'details' ? 'border-orange-500 text-orange-600 bg-orange-50/30' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                >
                  Business Details
                </button>
                <button 
                  onClick={() => setModalTab('theme')}
                  className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${modalTab === 'theme' ? 'border-orange-500 text-orange-600 bg-orange-50/30' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                >
                  Personalization (Theme)
                </button>
              </div>
            )}

            <div className="p-5 md:p-8">
              {modalTab === 'details' || !editingId ? (
                <form onSubmit={handleSaveRestaurant} className="space-y-5 md:space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase block mb-1.5 md:mb-2">Restaurant Name *</label>
                      <input type="text" required value={newRest.name} onChange={(e) => setNewRest({...newRest, name: e.target.value})} className="w-full bg-slate-50 rounded-xl p-3 md:p-4 text-sm md:text-base font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500" />
                    </div>
                    <div>
                      <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase block mb-1.5 md:mb-2">Contact Number</label>
                      <input type="text" value={newRest.contact} onChange={(e) => setNewRest({...newRest, contact: e.target.value})} className="w-full bg-slate-50 rounded-xl p-3 md:p-4 text-sm md:text-base font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 p-4 md:p-5 bg-orange-50/50 rounded-2xl border border-orange-100">
                    <div>
                      <label className="text-[9px] md:text-[10px] font-black text-orange-600 uppercase block mb-1.5 md:mb-2">Login Email *</label>
                      <input type="email" required value={newRest.email} onChange={(e) => setNewRest({...newRest, email: e.target.value})} className="w-full bg-white border border-orange-200 rounded-xl p-3 md:p-4 text-sm md:text-base font-bold outline-none focus:ring-2 focus:ring-orange-500" />
                    </div>
                    <div>
                      <label className="text-[9px] md:text-[10px] font-black text-orange-600 uppercase block mb-1.5 md:mb-2">Password *</label>
                      <input type="text" required value={newRest.password} onChange={(e) => setNewRest({...newRest, password: e.target.value})} className="w-full bg-white border border-orange-200 rounded-xl p-3 md:p-4 text-sm md:text-base font-bold outline-none focus:ring-2 focus:ring-orange-500" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase block mb-1.5 md:mb-2">Payment Status</label>
                    <select value={newRest.payment} onChange={(e) => setNewRest({...newRest, payment: e.target.value})} className="w-full bg-slate-50 rounded-xl p-3 md:p-4 text-sm md:text-base font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500">
                      <option value="paid">✅ Paid (Active)</option>
                      <option value="unpaid">⏳ Unpaid (Trial)</option>
                    </select>
                  </div>

                  <button type="submit" disabled={adding} className="w-full bg-orange-500 text-white py-3 md:py-4 rounded-xl font-black text-sm md:text-base shadow-xl hover:bg-orange-600 flex justify-center items-center">
                    {adding ? <Loader2 className="animate-spin" size={20} /> : (editingId ? 'Update Restaurant' : 'Create Profile')}
                  </button>
                </form>
              ) : (
                <ThemeCustomizer restaurantId={editingId} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;