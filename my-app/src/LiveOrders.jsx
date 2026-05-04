import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from './AdminLayout';
import { supabase } from './supabase';
import { 
  Clock, 
  UtensilsCrossed, 
  LayoutGrid, 
  AlertCircle,
  Loader2,
  CalendarDays,
  Plus
} from 'lucide-react';

const LiveOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 🚨 NEW: Filter States
  const [dateFilter, setDateFilter] = useState('today'); // 'today', 'yesterday', 'week', 'custom'
  const [customDate, setCustomDate] = useState('');

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

  // 🚨 NEW: Smart Date Filtering Logic
  const filteredOrders = useMemo(() => {
    const now = new Date();
    
    return orders.filter(order => {
      const orderDate = new Date(order.created_at);
      
      if (dateFilter === 'today') {
        return orderDate.toDateString() === now.toDateString();
      } else if (dateFilter === 'yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return orderDate.toDateString() === yesterday.toDateString();
      } else if (dateFilter === 'week') {
        const lastWeek = new Date(now);
        lastWeek.setDate(lastWeek.getDate() - 7);
        return orderDate >= lastWeek;
      } else if (dateFilter === 'custom' && customDate) {
        return orderDate.toDateString() === new Date(customDate).toDateString();
      }
      return true; // Default fallback
    });
  }, [orders, dateFilter, customDate]);

  return (
    <AdminLayout>
      {/* RESPONSIVE HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 md:mb-8 gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 italic tracking-tight">KOT Display</h1>
            {/* 🚨 LIVE BADGE COUNT */}
            <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs md:text-sm font-black tracking-widest animate-pulse border border-orange-200">
              {filteredOrders.length} ORDERS
            </span>
          </div>
          <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.1em] md:tracking-[0.2em] mt-1 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            Kitchen Status: Online & Receiving
          </p>
        </div>

        {/* 🚨 NEW: Date Filter UI */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap md:flex-nowrap gap-1 w-full lg:w-auto">
          {['today', 'yesterday', 'week'].map((f) => (
            <button 
              key={f}
              onClick={() => setDateFilter(f)}
              className={`flex-1 md:flex-none px-4 py-2 rounded-xl font-black text-[10px] md:text-xs transition-all uppercase tracking-widest ${dateFilter === f ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              {f === 'week' ? 'This Week' : f}
            </button>
          ))}
          
          <div className="flex items-center gap-2 pl-2 border-l border-slate-100">
            <button 
              onClick={() => setDateFilter('custom')}
              className={`px-3 py-2 rounded-xl transition-all ${dateFilter === 'custom' ? 'bg-orange-50 text-orange-500' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <CalendarDays size={16} />
            </button>
            {dateFilter === 'custom' && (
              <input 
                type="date" 
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-orange-500"
              />
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-48 md:h-64 flex flex-col items-center justify-center gap-3 md:gap-4">
          <Loader2 className="animate-spin text-orange-500 md:w-10 md:h-10" size={32} />
          <p className="text-slate-300 font-black text-[9px] md:text-[10px] uppercase tracking-widest">Fetching Orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-sm">
          <LayoutGrid size={48} className="text-slate-200 mb-4" />
          <h2 className="text-xl font-black text-slate-400 italic">No orders found</h2>
          <p className="text-xs font-bold text-slate-300 mt-2 uppercase tracking-widest">For the selected date filter.</p>
        </div>
      ) : (
        // 🚨 CLEAN GRID WITHOUT BUTTONS
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative flex flex-col">
              
              {/* Header: ID & Time */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 italic tracking-tighter flex items-center gap-1.5">
                    <UtensilsCrossed size={18} className="text-orange-500" /> {order.table_number !== "Takeaway / Parcel" ? `Table ${order.table_number}` : "Takeaway"}
                  </h3>
                  <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-bold uppercase tracking-wider mt-1">
                    <Clock size={10} /> {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <span className="bg-slate-50 text-slate-400 border border-slate-200 text-[9px] px-2 py-1 rounded-md font-black tracking-widest">
                  #{order.id.toString().slice(0, 4).toUpperCase()}
                </span>
              </div>

              {/* Items List */}
              <div className="bg-slate-50 rounded-2xl p-4 mb-4 border border-slate-100 flex-1 overflow-y-auto max-h-[250px] custom-scrollbar">
                <div className="space-y-3">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-1 pb-2 border-b border-slate-200/60 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-2">
                          <span className="bg-slate-200 text-slate-700 text-xs font-black px-1.5 py-0.5 rounded shrink-0">{item.qty}x</span>
                          <span className="text-sm font-black text-slate-800 leading-tight">{item.name}</span>
                        </div>
                      </div>
                      
                      {item.selectedVariants && item.selectedVariants.length > 0 && (
                        <div className="ml-7 flex flex-wrap gap-1 mt-1">
                          {item.selectedVariants.map((v, i) => (
                            <span key={i} className="text-[9px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-0.5">
                              <Plus size={8} /> {v.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {item.cookingRequest && (
                        <div className="ml-7 mt-1.5 flex items-start gap-1">
                          <AlertCircle size={10} className="text-red-500 mt-0.5 shrink-0" />
                          <p className="text-[10px] font-bold text-red-600 italic leading-tight">"{item.cookingRequest}"</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Bill</span>
                <span className="text-lg font-black text-slate-900">₹{order.total_bill}</span>
              </div>

            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default LiveOrders;