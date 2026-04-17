import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import Settings from "./Settings";
import SuperAdminDashboard from './SuperAdminDashboard'; 
import { Loader2, CheckCircle2, ChevronLeft, Search, X } from 'lucide-react'; // 🚨 X icon add kiya hai cancel button ke liye
import SuperAdminLogin from './SuperAdminLogin';

function App() {
  const [user, setUser] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [view, setView] = useState('welcome');
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allDishes, setAllDishes] = useState([]);
  const [filteredDishes, setFilteredDishes] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableNumber, setTableNumber] = useState('1'); 
  const [orderId, setOrderId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // 🚨 TAXES ADDED TO STORE SETTINGS
  const [storeSettings, setStoreSettings] = useState({
    name: 'Loading...',
    logo: '',
    tagline: '',
    taxes: [] 
  });

const routePath = window.location.hash.replace('#', '').toLowerCase().replace(/\/$/, "");
  useEffect(() => {
    const init = async () => {
      const savedUser = localStorage.getItem('admin_user');
      let currentUser = null;
      let activeRestId = 1;

      if (savedUser) {
        currentUser = JSON.parse(savedUser);
        setUser(currentUser);
        activeRestId = currentUser.id;
      } else {
        setUser(null);
        const urlParams = new URLSearchParams(window.location.search);
        const urlRestId = urlParams.get('rest');
        if (urlRestId) activeRestId = urlRestId;
      }
      
      await fetchInitialData(activeRestId);
      recordScan(activeRestId);
      
      setLoading(false); 
    };
    
    init();
  }, []); 

  async function recordScan(restId) {
    const sessionActive = sessionStorage.getItem('scan_recorded');
    if (sessionActive) return;

    sessionStorage.setItem('scan_recorded', 'pending');
    try {
      const todayStr = new Date().toLocaleDateString('en-CA'); 
      const { error } = await supabase
        .from('qr_scans')
        .insert([{ date: todayStr, restaurant_id: restId }]); 

      if (!error) sessionStorage.setItem('scan_recorded', 'true');
      else sessionStorage.removeItem('scan_recorded');
    } catch (err) {
      sessionStorage.removeItem('scan_recorded');
    }
  }

  async function fetchInitialData(restId) {
    setLoading(true);
    try {
      const { data: catData } = await supabase.from('subcategories').select('*').eq('restaurant_id', restId);
      const { data: dishData } = await supabase.from('dishes').select('*').eq('restaurant_id', restId);
      const { data: settingsData } = await supabase.from('restaurant_settings').select('*').eq('restaurant_id', restId).maybeSingle();
        
      if (settingsData) {
        setStoreSettings({
          name: settingsData.restaurant_name || 'Gourmet Menu',
          logo: settingsData.logo_url || '',
          tagline: settingsData.tagline || '',
          taxes: settingsData.taxes || [] // 🚨 TAX DATA FETCHED
        });
      } else {
        setStoreSettings({ name: 'Welcome to Our Menu', logo: '', tagline: '', taxes: [] });
      }

      setCategories(catData || []);
      setAllDishes(dishData || []);

      if (catData && catData.length > 0) {
        const firstCategoryId = catData[0].id;
        setSelectedCategory(firstCategoryId);
        const initialFilteredDishes = (dishData || []).filter(d => d.subcategory_id === firstCategoryId);
        setFilteredDishes(initialFilteredDishes);
      } else {
        setFilteredDishes([]);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let list = allDishes;
    if (searchTerm) {
      list = list.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
    } else if (selectedCategory) {
      list = list.filter(i => i.subcategory_id === selectedCategory)
    }
    setFilteredDishes(list)
  }, [searchTerm, selectedCategory, allDishes])

  const addToCart = (dish) => {
    const existing = cart.find(i => i.id === dish.id)
    if (existing) setCart(cart.map(i => i.id === dish.id ? { ...i, qty: i.qty + 1 } : i))
    else setCart([...cart, { ...dish, qty: 1 }])
  }

  const removeFromCart = (id) => {
    const existing = cart.find(i => i.id === id)
    if (existing.qty === 1) setCart(cart.filter(i => i.id !== id))
    else setCart(cart.map(i => i.id === id ? { ...i, qty: i.qty - 1 } : i))
  }

  const getSmartRecs = (currentDish) => {
    if (!currentDish.paired_items || currentDish.paired_items.length === 0) return [];
    return allDishes.filter(d => currentDish.paired_items.includes(d.id) && d.id !== currentDish.id);
  }

  // 🚨 NEW MATH LOGIC FOR TAXES 🚨
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const activeTaxes = storeSettings.taxes?.filter(tax => tax.active) || [];
  const taxBreakdown = activeTaxes.map(tax => ({
    name: tax.name,
    rate: tax.rate,
    amount: subtotal * (tax.rate / 100)
  }));
  const totalTaxAmount = taxBreakdown.reduce((sum, tax) => sum + tax.amount, 0);
  const grandTotal = Math.round(subtotal + totalTaxAmount); // Rounded to avoid decimals

  const handleConfirmOrder = async () => {
    if (loading) return;
    if (cart.length === 0) return alert("Bhai, cart khali hai!");

    setLoading(true);
    try {
      const finalTableStatus = tableNumber && tableNumber.trim() !== "" ? tableNumber : "Parcel";
      const activeRestId = user?.id || new URLSearchParams(window.location.search).get('rest') || 1;

      const { data, error } = await supabase
        .from('orders')
        .insert([{ 
          restaurant_id: activeRestId, 
          table_number: finalTableStatus, 
          total_bill: grandTotal, // 🚨 Saving Grand Total instead of Subtotal
          status: 'pending',
          items: cart 
        }])
        .select();
      
      if (error) throw error;

      if (data && data.length > 0) {
        setOrderId(data[0].id.toString().slice(0, 4));
        setView('receipt');
      }
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };


  // --- ROUTING LOGIC ---
  if (loading) {
    return (
      <div className="h-screen bg-slate-900 flex flex-col items-center justify-center text-white gap-4">
         <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-orange-500"></div>
         <p className="text-sm font-bold text-slate-400 uppercase">Verifying Access...</p>
      </div>
    );
  }

  if (routePath === '/super-admin') {
    const isSuperAdmin = localStorage.getItem('super_admin_auth') === 'true';
    if (!isSuperAdmin) {
      window.location.replace('/super-admin-login'); 
      return null;
    }
    return <SuperAdminDashboard />;
  }

  if (routePath === '/super-admin-login') {
    const isSuperAdmin = localStorage.getItem('super_admin_auth') === 'true';
    if (isSuperAdmin) {
      window.location.replace('/super-admin'); 
      return null;
    }
    return <SuperAdminLogin />;
  }

  if (routePath === '/admin-login') {
    if (user) {
      window.location.replace('/admin'); 
      return null;
    }
    return <AdminLogin onLoginSuccess={(u) => {
      setUser(u);
      window.location.href = '/admin'; 
    }} />;
  }

  if (routePath === '/admin/settings') {
     return <Settings />;
  }

  if (routePath.startsWith('/admin') && routePath !== '/admin-login') {
    if (!user) {
      window.location.replace('/admin-login');
      return null;
    }
    return <AdminDashboard />;
  }

  // --- CUSTOMER VIEWS ---
  if (view === 'welcome') {
    return (
      <div className="max-w-md mx-auto h-screen bg-slate-900 flex flex-col justify-end pb-20 px-8 relative overflow-hidden">
        <img src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800" className="absolute inset-0 w-full h-full object-cover opacity-50" alt="bg" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
        <div className="relative z-10 text-center">
          <h2 className="text-orange-400 font-serif italic mb-2">Welcome to</h2>
          <h1 className="text-5xl font-serif font-black text-white mb-8 tracking-tighter italic">{storeSettings.name}</h1>
          <button onClick={() => setView('menu')} className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black text-lg shadow-2xl">EXPLORE MENU</button>
        </div>
      </div>
    )
  }

  if (view === 'menu') {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-white pb-32">
        
        {/* 🚨 SMART SEARCH HEADER 🚨 */}
        <header className="bg-white shadow-sm sticky top-0 z-50 p-6 border-b border-slate-100 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100 shadow-sm flex-shrink-0">
                {storeSettings.logo ? (
                  <img src={storeSettings.logo} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-black text-xl text-orange-500 italic">{storeSettings.name.charAt(0)}</span>
                )}
              </div>
              <div className="overflow-hidden">
                <h1 className="text-xl font-black italic text-slate-800 leading-tight truncate">
                  {storeSettings.name}
                </h1>
                {storeSettings.tagline && (
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5 truncate">
                    {storeSettings.tagline}
                  </p>
                )}
              </div>
            </div>

            {/* Top Right Search Icon */}
            {!isSearchOpen && (
              <button 
                onClick={() => setIsSearchOpen(true)} 
                className="p-3 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 transition-colors shadow-sm flex-shrink-0"
              >
                <Search size={20} />
              </button>
            )}
          </div>

          {/* Expandable Search Bar */}
          {isSearchOpen && (
            <div className="flex items-center gap-2 w-full bg-slate-50 border border-slate-200 p-2 rounded-2xl animate-in fade-in zoom-in-95 duration-200 mt-4">
              <Search size={20} className="text-slate-400 ml-2" />
              <input 
                type="text"
                placeholder="Search delicacies..."
                className="bg-transparent border-none outline-none w-full text-sm font-semibold text-slate-700"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
              <button 
                onClick={() => { setIsSearchOpen(false); setSearchTerm(''); }} 
                className="p-2 text-slate-400 hover:text-red-500 font-bold"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </header>

        <nav className="flex gap-4 overflow-x-auto p-6 pt-4 sticky top-[95px] bg-white/90 backdrop-blur-md z-30 no-scrollbar">
          {categories.map(cat => (
            <button key={cat.id} onClick={() => {setSelectedCategory(cat.id); setSearchTerm('')}}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex-shrink-0 ${selectedCategory === cat.id ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
              {cat.name}
            </button>
          ))}
        </nav>

        <div className="p-6 space-y-8">
          {filteredDishes.map(dish => {
            const inCart = cart.find(i => i.id === dish.id)
            const recs = getSmartRecs(dish)
            
            return (
              <div key={dish.id} className="group">
                <div className={`flex gap-4 items-start transition-opacity ${dish.is_available === false ? 'opacity-50' : 'opacity-100'}`}>
                  <div className="w-24 h-24 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-50 shadow-sm relative">
                    <img src={dish.image_url || `https://source.unsplash.com/200x200/?food,${dish.name}`} className="w-full h-full object-cover" alt={dish.name} />
                    {dish.is_available === false && (
                      <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
                        <span className="text-[9px] font-black text-white uppercase tracking-widest">Out</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 py-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-slate-800 text-sm leading-tight pr-2">{dish.name}</h3>
                      <span className="font-black text-slate-900 text-sm">₹{dish.price}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium line-clamp-2 mb-3 leading-relaxed">{dish.description}</p>
                    
                    <div className="flex items-center justify-between mt-auto">
                      <span className={`text-[9px] font-black tracking-widest uppercase ${dish.is_available === false ? 'text-slate-400' : 'text-green-500'}`}>
                        {dish.is_available === false ? "Sold Out" : "Available"}
                      </span>

                      {dish.is_available === false ? (
                        <button disabled className="bg-slate-50 text-slate-300 px-4 py-1.5 rounded-lg font-black text-[9px] uppercase border border-slate-100 cursor-not-allowed">
                          Empty
                        </button>
                      ) : (
                        inCart ? (
                          <div className="flex items-center gap-3 bg-slate-900 rounded-lg px-2 py-1 text-white shadow-md">
                            <button onClick={() => removeFromCart(dish.id)} className="font-bold text-sm px-2 hover:text-orange-400">-</button>
                            <span className="text-xs font-black">{inCart.qty}</span>
                            <button onClick={() => addToCart(dish)} className="font-bold text-sm px-2 hover:text-orange-400">+</button>
                          </div>
                        ) : (
                          <button onClick={() => addToCart(dish)} className="bg-white border-2 border-slate-900 px-6 py-1 rounded-lg font-black text-[10px] uppercase hover:bg-slate-900 hover:text-white transition-all">
                            Add
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {inCart && recs.length > 0 && (
                  <div className="mt-4 p-4 bg-orange-50/50 rounded-2xl border border-dashed border-orange-200">
                    <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-3 italic">Perfect Add-ons</p>
                    <div className="flex flex-wrap gap-2">
                      {recs.map(r => (
                        <button 
                          key={r.id} 
                          onClick={() => addToCart(r)} 
                          disabled={r.is_available === false}
                          className={`text-[10px] px-4 py-2 rounded-xl border font-black shadow-sm active:scale-95 transition-all ${
                            r.is_available === false 
                            ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' 
                            : 'bg-white text-slate-700 border-slate-100 hover:border-orange-500 hover:text-orange-500'
                          }`}
                        >
                          + {r.name} {r.is_available === false && "(Sold Out)"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {cart.length > 0 && (
          <div className="fixed bottom-6 left-4 right-4 bg-slate-900 rounded-2xl p-4 flex justify-between items-center shadow-2xl z-50">
             <div className="pl-2 text-white">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Total Payable</p>
                <p className="text-lg font-black tracking-tight">₹{grandTotal}</p> {/* 🚨 Grand Total Shown */}
             </div>
             <button onClick={() => setView('checkout')} className="bg-orange-500 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all">Proceed</button>
          </div>
        )}
      </div>
    )
  }

  if (view === 'checkout') {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-slate-50 p-6 pb-32 overflow-y-auto">
        <button onClick={() => setView('menu')} className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 hover:text-orange-500 transition-all"><ChevronLeft size={14}/> Back to Menu</button>
        <h2 className="text-2xl font-serif font-black text-slate-900 mb-8 italic">Complete Order</h2>
        
        {/* CART ITEMS */}
        <div className="space-y-3 mb-8">
           {cart.map(item => (
             <div key={item.id} className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
               <span className="font-bold text-slate-800 text-sm">{item.qty}x {item.name}</span>
               <span className="font-black text-slate-900">₹{item.price * item.qty}</span>
             </div>
           ))}
        </div>

        {/* 🚨 NEW DETAILED BILL SUMMARY 🚨 */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl mb-8">
          <div className="space-y-3 mb-4 text-sm font-medium text-slate-300 border-b border-slate-700 pb-4">
            <div className="flex justify-between items-center">
              <span>Item Total (Subtotal)</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            
            {/* Dynamic Tax Display */}
            {taxBreakdown.map((tax, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs text-slate-400">
                <span>{tax.name} ({tax.rate}%)</span>
                <span>+ ₹{tax.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center">
            <span className="font-black tracking-widest uppercase text-sm">Grand Total</span>
            <span className="text-3xl font-black italic text-orange-400">₹{grandTotal}</span>
          </div>
        </div>

        {/* TABLE INPUT */}
        <div className="bg-white p-6 rounded-2xl shadow-sm mb-8 border border-slate-100">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center mb-4">
            Table Number (Optional)
          </label>
          <input 
            type="number" 
            min="1"
            placeholder="Eg: 5" 
            className="w-full text-center text-4xl font-black bg-slate-50 p-4 rounded-xl text-slate-900 border-none outline-none mb-3 focus:ring-2 focus:ring-orange-500 transition-all"
            value={tableNumber} 
            onChange={e => {
              const val = e.target.value;
              if (val === "" || parseInt(val) >= 0) setTableNumber(val);
            }}
          />
          <p className="text-[9px] text-slate-400 text-center font-bold uppercase tracking-widest">
            Leave blank for Takeaway / Parcel
          </p>
        </div>

        <button 
          onClick={handleConfirmOrder} 
          disabled={loading}
          className="w-full bg-orange-500 text-white py-4 rounded-xl font-black text-sm shadow-xl shadow-orange-500/20 uppercase tracking-widest flex justify-center items-center gap-2 hover:bg-orange-600 active:scale-95 transition-all"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : 'Confirm Order'}
        </button>
      </div>
    )
  }

  if (view === 'receipt') {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-slate-900 p-8 flex items-center justify-center">
        <div className="bg-white w-full rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-orange-500"></div>
          <div className="my-8 inline-flex bg-green-50 p-5 rounded-full text-green-500 border border-green-100 shadow-inner"><CheckCircle2 size={40} /></div>
          <h2 className="text-2xl font-serif font-black text-slate-900 mb-2 italic">Order Sent!</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-10 leading-relaxed">
            {tableNumber ? `Table ${tableNumber}` : 'Takeaway'} order <br/>has been registered
          </p>
          <div className="mb-10 p-5 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Receipt ID</p>
             <p className="text-xl font-black text-slate-800 tracking-tight">#{orderId}</p>
          </div>
          <button onClick={() => { setCart([]); setView('welcome'); setTableNumber('1') }} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all">Start New Order</button>
        </div>
      </div>
    )
  }
}

export default App;