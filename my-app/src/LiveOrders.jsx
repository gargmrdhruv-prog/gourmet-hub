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
  Bell
} from 'lucide-react';

const LiveOrders = () => {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('active');
  const [loading, setLoading] = useState(true);

  // Wahi Purana Sound Link jo pehle kaam kar raha tha
  const notificationSound = new Audio('https://notificationsounds.com/storage/sounds/file-sounds-1150-pristine.mp3');

  useEffect(() => {
    fetchOrders();

    // 🚨 ADMIN ID NIKALI REAL-TIME NOTIFICATIONS KE LIYE
    const admin = JSON.parse(localStorage.getItem('admin_user'));
    if (!admin) return;

    // FULL REAL-TIME SUBSCRIPTION (Detailed Logic)
    const channel = supabase
      .channel('public:orders')
      .on(
        'postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'orders' }, 
        (payload) => {
          // 🚨 LOCK: Sirf tabhi order add karo aur sound bajao jab order apne restaurant ka ho
          if (payload.new.restaurant_id === admin.id) {
            console.log('NEW ORDER DETECTED FOR MY RESTAURANT:', payload.new);
            // Sound Playback
            notificationSound.play().catch(err => {
              console.log("Audio Playback blocked. Please interact with the page first.");
            });
            // Add new order to top of the list
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
      .subscribe((status) => {
        console.log("Realtime Subscription Status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchOrders() {
    setLoading(true);
    try {
      const admin = JSON.parse(localStorage.getItem('admin_user')); // 🚨 ADMIN ID
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', admin.id) // 🚨 LOCK: Sirf apne orders mangwao
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
      // Direct Database Update
      const { error } = await supabase
        .from('orders')
        .update({ status: nextStatus })
        .eq('id', orderId);

      if (error) throw error;
      
      // Local state update for immediate UI feedback
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
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 italic tracking-tight">Live Orders</h1>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            Kitchen Status: Online & Monitoring
          </p>
        </div>

        <div className="bg-slate-100 p-1.5 rounded-[2rem] flex gap-2 border border-slate-200">
          <button 
            onClick={() => setActiveTab('active')}
            className={`px-8 py-3 rounded-[1.5rem] font-black text-xs transition-all flex items-center gap-2 ${activeTab === 'active' ? 'bg-white text-orange-500 shadow-sm' : 'text-slate-400'}`}
          >
            <LayoutGrid size={16} /> ACTIVE ({activeOrders.length})
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-8 py-3 rounded-[1.5rem] font-black text-xs transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
          >
            <History size={16} /> HISTORY ({historyOrders.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-orange-500" size={40} />
          <p className="text-slate-300 font-black text-[10px] uppercase tracking-widest">Fetching Orders...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {currentOrders.map((order) => (
            <div key={order.id} className={`bg-white rounded-[3rem] p-8 border-2 transition-all duration-300 relative overflow-hidden ${order.status === 'preparing' ? 'border-orange-500 shadow-xl shadow-orange-50' : 'border-slate-50'}`}>
              
              {/* Status Header */}
              <div className="flex justify-between items-center mb-6">
                <span className="bg-slate-900 text-white text-[10px] px-4 py-1.5 rounded-full font-black tracking-widest">
                  #{order.id.toString().slice(0, 4).toUpperCase()}
                </span>
                <span className={`text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${
                  order.status === 'pending' ? 'bg-orange-100 text-orange-600' : 
                  order.status === 'preparing' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                }`}>
                  {order.status}
                </span>
              </div>

              {/* Table Info */}
              <div className="mb-6">
                <h3 className="text-3xl font-black text-slate-800 mb-1 italic tracking-tighter flex items-center gap-2">
                  <UtensilsCrossed size={22} className="text-orange-500" /> Table {order.table_number}
                </h3>
                <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase">
                  <Clock size={12} /> {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* Items List */}
              <div className="bg-slate-50 rounded-[2rem] p-5 mb-8 border border-slate-100">
                <div className="space-y-3">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-700">{item.qty} x {item.name}</span>
                      </div>
                      <span className="text-xs font-black text-slate-400 italic">₹{item.price * item.qty}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-200 mt-4 pt-4 flex justify-between items-end">
                  <span className="text-[10px] font-black text-slate-300 uppercase italic">Total Amount</span>
                  <span className="text-2xl font-black text-slate-900 italic">₹{order.total_bill}</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="space-y-3">
                {order.status === 'pending' && (
                  <button 
                    onClick={() => updateOrderStatus(order.id, 'preparing')}
                    className="w-full bg-orange-500 text-white py-5 rounded-[1.8rem] font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-100 active:scale-95 transition-all"
                  >
                    Accept Order
                  </button>
                )}
                
                {order.status === 'preparing' && (
                  <button 
                    onClick={() => updateOrderStatus(order.id, 'completed')}
                    className="w-full bg-slate-900 text-white py-5 rounded-[1.8rem] font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                  >
                    Mark Ready ✓
                  </button>
                )}

                {order.status === 'completed' && (
                  <div className="w-full bg-green-50 text-green-600 py-5 rounded-[1.8rem] font-black text-xs uppercase text-center border border-green-100">
                    Served Successfully
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