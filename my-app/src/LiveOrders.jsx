import React, { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { supabase } from './supabase';
import { 
  Clock, 
  CheckCircle2, 
  UtensilsCrossed, 
  History, 
  LayoutGrid, 
  AlertCircle,
  Loader2,
  MessageSquare,
  Plus
} from 'lucide-react';

const LiveOrders = () => {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('active');
  const [loading, setLoading] = useState(true);

  // Notification sound
  const notificationSound = new Audio('https://notificationsounds.com/storage/sounds/file-sounds-1150-pristine.mp3');

  useEffect(() => {
    fetchOrders();

    const admin = JSON.parse(localStorage.getItem('admin_user'));
    if (!admin) return;

    // REAL-TIME SUBSCRIPTION
    const channel = supabase
      .channel('public:orders')
      .on(
        'postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'orders' }, 
        (payload) => {
          if (payload.new.restaurant_id === admin.id) {
            console.log('NEW ORDER DETECTED FOR MY RESTAURANT:', payload.new);
            notificationSound.play().catch(err => {
              console.log("Audio Playback blocked. Please interact with the page first.");
            });
            setOrders((currentOrders) => [payload.new, ...currentOrders]);
          }
        }
      )
      .on(
        'postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'orders' }, 
        (payload) => {
          if (payload.new.restaurant_id === admin.id) {
            console.log('ORDER UPDATED:', payload.new);
            setOrders((currentOrders) => 
              currentOrders.map(order => 
                order.id === payload.new.id ? payload.new : order
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchOrders() {
    setLoading(true);
    try {
      const admin = JSON.parse(localStorage.getItem('admin_user')); 
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', admin.id) 
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error("Fetch Error:", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(orderId, nextStatus) {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: nextStatus })
        .eq('id', orderId);

      if (error) throw error;
      
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));

      if (nextStatus === 'completed') {
        const successSound = new Audio('https://www.soundjay.com/buttons/sounds/button-10.mp3');
        successSound.play().catch(() => {});
      }
    } catch (err) {
      alert("Error updating status: " + err.message);
    }
  }

  // Filter Logic
  const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'preparing');
  const historyOrders = orders.filter(o => o.status === 'completed');
  const currentOrders = activeTab === 'active' ? activeOrders : historyOrders;

  return (
    <AdminLayout>
      {/* RESPONSIVE HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-10 gap-4 md:gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 italic tracking-tight">Live Kitchen</h1>
          <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.1em] md:tracking-[0.2em] mt-1 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            Kitchen Status: Online & Monitoring
          </p>
        </div>

        <div className="bg-slate-100 p-1 md:p-1.5 rounded-xl md:rounded-[2rem] flex w-full md:w-auto border border-slate-200">
          <button 
            onClick={() => setActiveTab('active')}
            className={`flex-1 md:flex-none px-4 md:px-8 py-2.5 md:py-3 rounded-lg md:rounded-[1.5rem] font-black text-[10px] md:text-xs transition-all flex justify-center items-center gap-1.5 md:gap-2 ${activeTab === 'active' ? 'bg-white text-orange-500 shadow-sm' : 'text-slate-400'}`}
          >
            <LayoutGrid size={14} className="md:w-4 md:h-4" /> ACTIVE ({activeOrders.length})
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 md:flex-none px-4 md:px-8 py-2.5 md:py-3 rounded-lg md:rounded-[1.5rem] font-black text-[10px] md:text-xs transition-all flex justify-center items-center gap-1.5 md:gap-2 ${activeTab === 'history' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
          >
            <History size={14} className="md:w-4 md:h-4" /> HISTORY ({historyOrders.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-48 md:h-64 flex flex-col items-center justify-center gap-3 md:gap-4">
          <Loader2 className="animate-spin text-orange-500" size={32} className="md:w-10 md:h-10" />
          <p className="text-slate-300 font-black text-[9px] md:text-[10px] uppercase tracking-widest">Fetching Kitchen Data...</p>
        </div>
      ) : currentOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-sm">
          <UtensilsCrossed size={48} className="text-slate-200 mb-4" />
          <h2 className="text-xl font-black text-slate-400 italic">No orders right now</h2>
          <p className="text-xs font-bold text-slate-300 mt-2 uppercase tracking-widest">Waiting for customers...</p>
        </div>
      ) : (
        // RESPONSIVE GRID FOR ORDER CARDS
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          {currentOrders.map((order) => (
            <div key={order.id} className={`bg-white rounded-[2rem] md:rounded-[3rem] p-5 md:p-8 border-2 transition-all duration-300 relative overflow-hidden flex flex-col ${order.status === 'preparing' ? 'border-orange-500 shadow-lg shadow-orange-50' : 'border-slate-50 shadow-sm'}`}>
              
              {/* Status Header */}
              <div className="flex justify-between items-center mb-4 md:mb-6">
                <span className="bg-slate-900 text-white text-[9px] md:text-[10px] px-3 py-1 md:px-4 md:py-1.5 rounded-full font-black tracking-widest">
                  #{order.id.toString().slice(0, 4).toUpperCase()}
                </span>
                <span className={`text-[8px] md:text-[9px] font-black px-3 py-1 md:px-4 md:py-1.5 rounded-full uppercase tracking-widest ${
                  order.status === 'pending' ? 'bg-orange-100 text-orange-600' : 
                  order.status === 'preparing' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                }`}>
                  {order.status === 'pending' ? 'New' : order.status}
                </span>
              </div>

              {/* Table Info */}
              <div className="mb-4 md:mb-6">
                <h3 className="text-2xl md:text-3xl font-black text-slate-800 mb-1 italic tracking-tighter flex items-center gap-2">
                  <UtensilsCrossed size={20} className="text-orange-500 md:w-[22px] md:h-[22px]" /> Table {order.table_number}
                </h3>
                <div className="flex items-center gap-1.5 md:gap-2 text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-wider">
                  <Clock size={12} className="md:w-3.5 md:h-3.5" /> {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* Items List (Highlighting Customizations) */}
              <div className="bg-slate-50 rounded-2xl md:rounded-[2rem] p-4 md:p-5 mb-5 md:mb-8 border border-slate-100 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar">
                <div className="space-y-3 md:space-y-4">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-1.5 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                      
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-2">
                          <span className="bg-slate-200 text-slate-700 text-xs font-black px-2 py-0.5 rounded shrink-0">{item.qty}x</span>
                          <span className="text-sm md:text-base font-black text-slate-800 leading-tight">{item.name}</span>
                        </div>
                        <span className="text-xs font-black text-slate-400 italic mt-0.5 shrink-0 pl-2">₹{item.price * item.qty}</span>
                      </div>
                      
                      {/* 🚨 FIX: MULTIPLE VARIANTS MAPPED CORRECTLY */}
                      {item.selectedVariants && item.selectedVariants.length > 0 && (
                        <div className="ml-8 flex flex-col gap-1 mt-1">
                          {item.selectedVariants.map((v, i) => (
                            <span key={i} className="text-[9px] md:text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md uppercase tracking-wider w-fit flex items-center gap-1">
                              <Plus size={10} /> {v.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Highlight Cooking Requests (CRITICAL FOR CHEF) */}
                      {item.cookingRequest && (
                        <div className="ml-8 mt-1 bg-red-50 border border-red-100 p-2 rounded-lg flex items-start gap-1.5">
                          <AlertCircle size={12} className="text-red-500 mt-0.5 shrink-0" />
                          <p className="text-[10px] md:text-xs font-bold text-red-600 italic leading-tight">
                            "{item.cookingRequest}"
                          </p>
                        </div>
                      )}

                    </div>
                  ))}
                </div>

                <div className="border-t-2 border-slate-200 mt-4 pt-4 flex justify-between items-end">
                  <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Total Bill</span>
                  <span className="text-xl md:text-2xl font-black text-slate-900 italic">₹{order.total_bill}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 mt-auto">
                {order.status === 'pending' && (
                  <button 
                    onClick={() => updateOrderStatus(order.id, 'preparing')}
                    className="w-full bg-orange-500 text-white py-4 md:py-5 rounded-xl md:rounded-[1.8rem] font-black text-[11px] md:text-xs uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-600 active:scale-95 transition-all flex justify-center items-center gap-2"
                  >
                    Accept Order
                  </button>
                )}
                
                {order.status === 'preparing' && (
                  <button 
                    onClick={() => updateOrderStatus(order.id, 'completed')}
                    className="w-full bg-slate-900 text-white py-4 md:py-5 rounded-xl md:rounded-[1.8rem] font-black text-[11px] md:text-xs uppercase tracking-widest shadow-lg hover:bg-black active:scale-95 transition-all flex justify-center items-center gap-2"
                  >
                    Mark Ready <CheckCircle2 size={16} />
                  </button>
                )}

                {order.status === 'completed' && (
                  <div className="w-full bg-green-50 text-green-600 py-4 md:py-5 rounded-xl md:rounded-[1.8rem] font-black text-[11px] md:text-xs uppercase tracking-widest text-center border border-green-100 flex justify-center items-center gap-2">
                    Served Successfully <CheckCircle2 size={16} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default LiveOrders;