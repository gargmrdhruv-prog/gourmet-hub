import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import Settings from "./Settings";
import SuperAdminDashboard from './SuperAdminDashboard'; 
import { Loader2, CheckCircle2, ChevronLeft, X, Star, ChevronRight, MessageSquare, Plus, ShoppingCart, Edit3, BellRing } from 'lucide-react';
import SuperAdminLogin from './SuperAdminLogin';

function App() {
  const [user, setUser] = useState(null);
  
  // 🚨 PERSISTENCE: Recovering Session from LocalStorage
  const [view, setView] = useState(() => localStorage.getItem('gourmet_view') || 'welcome');
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('gourmet_cart')) || []);
  const [placedOrderItems, setPlacedOrderItems] = useState(() => JSON.parse(localStorage.getItem('gourmet_placed_items')) || []);
  const [tableNumber, setTableNumber] = useState(() => localStorage.getItem('gourmet_table') || ''); 
  const [orderId, setOrderId] = useState(() => localStorage.getItem('gourmet_order_id') || '');
  
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allDishes, setAllDishes] = useState([]);
  const [filteredDishes, setFilteredDishes] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // BOTTOM SHEET STATES
  const [selectedDish, setSelectedDish] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [cookingRequest, setCookingRequest] = useState('');
  const [mainDishQty, setMainDishQty] = useState(1); 
  const [sheetRecs, setSheetRecs] = useState({}); 

  // EDIT CART STATES
  const [editingCartItem, setEditingCartItem] = useState(null);
  const [editCartVariant, setEditCartVariant] = useState(null);
  const [editCartRequest, setEditCartRequest] = useState('');

  const [storeSettings, setStoreSettings] = useState({
    name: 'Loading...', logo: '', tagline: '', welcome_bg_url: '', taxes: [] 
  });

  const currentURL = window.location.href; 

  // 🚨 SYNC STATES TO LOCAL STORAGE
  useEffect(() => { localStorage.setItem('gourmet_cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('gourmet_view', view); }, [view]);
  useEffect(() => { localStorage.setItem('gourmet_table', tableNumber); }, [tableNumber]);
  useEffect(() => { localStorage.setItem('gourmet_placed_items', JSON.stringify(placedOrderItems)); }, [placedOrderItems]);
  useEffect(() => { localStorage.setItem('gourmet_order_id', orderId); }, [orderId]);

  useEffect(() => {
    const init = async () => {
      const savedUser = localStorage.getItem('admin_user');
      let activeRestId = 1;

      if (savedUser) {
        const currentUser = JSON.parse(savedUser);
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
      const { error } = await supabase.from('qr_scans').insert([{ date: todayStr, restaurant_id: restId }]); 
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
          // Default bg if admin hasn't set one
          welcome_bg_url: settingsData.welcome_bg_url || 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1200', 
          taxes: settingsData.taxes || [] 
        });
      } else {
        setStoreSettings({ name: 'Welcome to Our Menu', logo: '', tagline: '', welcome_bg_url: '', taxes: [] });
      }

      setCategories(catData || []);
      setAllDishes(dishData || []);

      if (catData && catData.length > 0) {
        const firstCategoryId = catData[0].id;
        setSelectedCategory(firstCategoryId);
        setFilteredDishes((dishData || []).filter(d => d.subcategory_id === firstCategoryId));
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
    if (selectedCategory) {
      setFilteredDishes(allDishes.filter(i => i.subcategory_id === selectedCategory));
    } else {
      setFilteredDishes(allDishes);
    }
  }, [selectedCategory, allDishes]);

  const addToCart = (dish, variant = null, request = "", closeSheet = true, qtyToAdd = 1) => {
    if (qtyToAdd <= 0) return;
    const actualPrice = variant ? variant.price : dish.price;
    const cartItemId = variant ? `${dish.id}-${variant.name}` : `${dish.id}-regular`;

    setCart(prevCart => {
      const existing = prevCart.find(i => i.cartItemId === cartItemId);
      if (existing) {
        return prevCart.map(i => i.cartItemId === cartItemId ? { ...i, qty: i.qty + qtyToAdd, cookingRequest: request || i.cookingRequest } : i);
      } else {
        return [...prevCart, { ...dish, cartItemId, price: actualPrice, selectedVariant: variant, cookingRequest: request, qty: qtyToAdd }];
      }
    });
    
    if (closeSheet) {
      setSelectedDish(null);
      setSelectedVariant(null);
      setCookingRequest('');
      setMainDishQty(1);
      setSheetRecs({});
    }
  }

  const removeFromCart = (cartItemId) => {
    setCart(prevCart => {
      const existing = prevCart.find(i => i.cartItemId === cartItemId);
      if (existing.qty === 1) return prevCart.filter(i => i.cartItemId !== cartItemId);
      return prevCart.map(i => i.cartItemId === cartItemId ? { ...i, qty: i.qty - 1 } : i);
    });
  }

  const openEditCartItem = (item) => {
    setEditingCartItem(item);
    setEditCartVariant(item.selectedVariant);
    setEditCartRequest(item.cookingRequest || '');
  }

  const handleUpdateCartItem = () => {
    setCart(prevCart => {
      const newCartItemId = editCartVariant ? `${editingCartItem.id}-${editCartVariant.name}` : `${editingCartItem.id}-regular`;
      const filtered = prevCart.filter(i => i.cartItemId !== editingCartItem.cartItemId);
      const existing = filtered.find(i => i.cartItemId === newCartItemId);
      
      if (existing) {
        return filtered.map(i => i.cartItemId === newCartItemId ? { ...i, qty: i.qty + editingCartItem.qty, cookingRequest: editCartRequest || i.cookingRequest } : i);
      } else {
        return [...filtered, { 
          ...editingCartItem, 
          cartItemId: newCartItemId, 
          selectedVariant: editCartVariant, 
          cookingRequest: editCartRequest, 
          price: editCartVariant ? editCartVariant.price : editingCartItem.price 
        }];
      }
    });
    setEditingCartItem(null);
  };

  const getSmartRecs = (currentDish) => {
    if (!currentDish.paired_items || currentDish.paired_items.length === 0) return [];
    return allDishes.filter(d => currentDish.paired_items.includes(d.id) && d.id !== currentDish.id);
  }

  const openDishSheet = (dish) => {
    setSelectedDish(dish);
    setCookingRequest('');
    setMainDishQty(1);
    setSheetRecs({});
    if (dish.variants && dish.variants.length > 0) {
      setSelectedVariant(dish.variants[0]);
    } else {
      setSelectedVariant(null);
    }
  };

  const updateSheetRecQty = (dish, variant, change) => {
    const key = variant ? `${dish.id}-${variant.name}` : `${dish.id}-regular`;
    setSheetRecs(prev => {
      const currentQty = prev[key]?.qty || 0;
      const newQty = currentQty + change;
      
      if (newQty <= 0) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return {
        ...prev,
        [key]: { dish, variant, qty: newQty }
      };
    });
  };

  const getSheetTotals = () => {
    if (!selectedDish) return { items: 0, price: 0 };
    const mainPrice = (selectedVariant ? selectedVariant.price : selectedDish.price) * mainDishQty;
    const recPrice = Object.values(sheetRecs).reduce((sum, item) => sum + (item.variant ? item.variant.price : item.dish.price) * item.qty, 0);
    const recItems = Object.values(sheetRecs).reduce((sum, item) => sum + item.qty, 0);
    return {
      items: mainDishQty + recItems,
      price: mainPrice + recPrice
    };
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const activeTaxes = storeSettings.taxes?.filter(tax => tax.active) || [];
  const taxBreakdown = activeTaxes.map(tax => ({
    name: tax.name, rate: tax.rate, amount: subtotal * (tax.rate / 100)
  }));
  const totalTaxAmount = taxBreakdown.reduce((sum, tax) => sum + tax.amount, 0);
  const grandTotal = Math.round(subtotal + totalTaxAmount); 

  // 🚨 CALL WAITER (Submit order, clear cart, show waiter screen)
  const handleCallWaiter = async () => {
    if (loading) return;
    if (cart.length === 0) return alert("Cart is empty!");
    if (!tableNumber || tableNumber.trim() === "") return alert("Please enter a table number so the waiter can find you!");

    setLoading(true);
    try {
      const activeRestId = user?.id || new URLSearchParams(window.location.search).get('rest') || 1;

      const { data, error } = await supabase
        .from('orders')
        .insert([{ 
          restaurant_id: activeRestId, table_number: tableNumber, total_bill: grandTotal, status: 'pending', items: cart 
        }]).select();
      
      if (error) throw error;
      if (data && data.length > 0) {
        setOrderId(data[0].id.toString().slice(0, 4));
        setPlacedOrderItems([...cart]); // Save items for waiter view
        setCart([]); // Clear cart
        setView('waiter_screen');
      }
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Allows customer to start fresh if they want to order more
  const clearSessionAndStartNew = () => {
    localStorage.removeItem('gourmet_cart');
    localStorage.removeItem('gourmet_placed_items');
    localStorage.removeItem('gourmet_order_id');
    setCart([]);
    setPlacedOrderItems([]);
    setOrderId('');
    setView('menu');
  };

  if (loading) {
    return (
      <div className="h-screen bg-slate-900 flex flex-col items-center justify-center text-white gap-4">
         <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-orange-500"></div>
         <p className="text-sm font-bold text-slate-400 uppercase">Loading Menu...</p>
      </div>
    );
  }

  // --- PORTALS ---
  if (currentURL.includes('super-admin-login')) return <SuperAdminLogin />;
  if (currentURL.includes('super-admin')) return localStorage.getItem('super_admin_auth') === 'true' ? <SuperAdminDashboard /> : <SuperAdminLogin />;
  if (currentURL.includes('admin-login')) {
    if (user) { window.location.href = '/admin'; return null; }
    return <AdminLogin onLoginSuccess={(u) => { setUser(u); window.location.href = '/admin'; }} />;
  }
  if (currentURL.includes('admin/settings')) return <Settings />;
  if (currentURL.includes('/admin')) {
    if (!user) { window.location.href = '/admin-login'; return null; }
    return <AdminDashboard />;
  }

  // --- CUSTOMER VIEWS ---

  // 1. WELCOME SCREEN
  if (view === 'welcome') {
    return (
      <div className="w-full min-h-screen bg-slate-900 flex flex-col justify-end md:justify-center pb-12 md:pb-20 px-6 md:px-12 relative overflow-hidden">
        {/* Dynamic Background from Admin Settings */}
        {storeSettings.welcome_bg_url && (
          <img src={storeSettings.welcome_bg_url} className="absolute inset-0 w-full h-full object-cover opacity-40" alt="bg" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"></div>
        <div className="relative z-10 text-center max-w-2xl mx-auto w-full">
          {storeSettings.logo && (
            <img src={storeSettings.logo} alt="Logo" className="w-24 h-24 md:w-32 md:h-32 object-contain mx-auto mb-6 rounded-2xl bg-white/10 p-2 backdrop-blur-md" />
          )}
          <h2 className="text-orange-400 font-serif italic mb-2 text-xl md:text-2xl">Welcome to</h2>
          <h1 className="text-5xl md:text-7xl font-serif font-black text-white mb-8 tracking-tighter italic">{storeSettings.name}</h1>
          <button onClick={() => setView('menu')} className="w-full md:w-auto md:px-16 bg-orange-500 text-white py-5 rounded-2xl md:rounded-full font-black text-lg shadow-2xl hover:bg-orange-600 transition-all hover:scale-105">
            EXPLORE MENU
          </button>
        </div>
      </div>
    )
  }

  // 2. MAIN MENU
  if (view === 'menu') {
    return (
      <div className="w-full min-h-screen bg-slate-50 pb-32">
        <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-slate-100">
          <div className="max-w-7xl mx-auto p-4 md:px-8 md:py-5 flex items-center gap-3 md:gap-5">
            <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100 shadow-sm flex-shrink-0">
              {storeSettings.logo ? <img src={storeSettings.logo} alt="Logo" className="h-full w-full object-cover" /> : <span className="font-black text-xl text-orange-500 italic">{storeSettings.name.charAt(0)}</span>}
            </div>
            <div className="overflow-hidden">
              <h1 className="text-xl md:text-2xl font-black italic text-slate-800 leading-tight truncate">{storeSettings.name}</h1>
              {storeSettings.tagline && <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5 truncate">{storeSettings.tagline}</p>}
            </div>
          </div>
        </header>

        <div className="sticky top-[81px] md:top-[97px] bg-white/95 backdrop-blur-md z-30 border-b border-slate-100/50 shadow-sm">
          <nav className="flex gap-3 md:gap-4 overflow-x-auto p-3 md:px-8 md:py-4 max-w-7xl mx-auto no-scrollbar">
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                className={`px-5 py-2.5 md:py-2 md:px-6 rounded-full text-[11px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap flex-shrink-0 ${selectedCategory === cat.id ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'}`}>
                {cat.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
          {filteredDishes.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-20 px-4">
              <span className="text-5xl grayscale opacity-50 mb-4">🍽️</span>
              <h3 className="text-2xl font-serif font-black text-slate-800 mb-2 italic">Menu is Brewing</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Chef is curating dishes for this category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
              {filteredDishes.map(dish => {
                const cartItemsForDish = cart.filter(i => i.id === dish.id);
                const totalQtyInCart = cartItemsForDish.reduce((sum, item) => sum + item.qty, 0);
                const isNonVeg = dish.tags?.some(t => t.toLowerCase().includes('non-veg'));

                return (
                  <div key={dish.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-all flex flex-col">
                    <div className="w-full h-44 sm:h-48 md:h-52 bg-slate-100 relative cursor-pointer flex-shrink-0" onClick={() => openDishSheet(dish)}>
                      <img src={dish.image_url || `https://source.unsplash.com/600x400/?food,${dish.name}`} className="w-full h-full object-cover" alt={dish.name} />
                      {!dish.is_available && (
                        <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-sm">
                          <span className="text-sm font-black text-white uppercase tracking-widest bg-black/50 px-4 py-2 rounded-lg">Sold Out</span>
                        </div>
                      )}
                      {dish.tags?.some(t => t.toLowerCase().includes('bestseller')) && (
                        <div className="absolute top-3 left-3 md:top-4 md:left-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg">
                          ⭐ Bestseller
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4 md:p-5 flex flex-col flex-1">
                      <div className="flex items-start gap-2 mb-1">
                        <div className="mt-1 flex-shrink-0">
                          {isNonVeg ? (
                            <div className="w-3.5 h-3.5 border-2 border-red-500 flex items-center justify-center rounded-sm"><div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div></div>
                          ) : (
                            <div className="w-3.5 h-3.5 border-2 border-green-600 flex items-center justify-center rounded-sm"><div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div></div>
                          )}
                        </div>
                        <h3 className="font-black text-slate-800 text-base md:text-lg leading-tight cursor-pointer" onClick={() => openDishSheet(dish)}>{dish.name}</h3>
                      </div>

                      {/* Optional Rating/Order Count */}
                      {(dish.rating || dish.order_count) ? (
                        <div className="flex items-center gap-1.5 mb-3 pl-5 md:pl-6">
                          {dish.rating && (
                            <div className="flex items-center gap-1 bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-black">
                              <Star size={10} className="fill-green-700" /> {dish.rating}
                            </div>
                          )}
                          {dish.order_count && (
                            <span className="text-[9px] md:text-[10px] font-bold text-slate-400">{dish.order_count}+ orders this month</span>
                          )}
                        </div>
                      ) : (
                        <div className="mb-3"></div> 
                      )}

                      <div className="flex items-center justify-between mt-auto pl-5 md:pl-6">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 text-base md:text-lg">₹{dish.price}</span>
                          {dish.variants && dish.variants.length > 0 && <span className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Customizable</span>}
                        </div>

                        {dish.is_available === false ? (
                          <button disabled className="bg-slate-50 text-slate-300 px-4 py-2 rounded-xl font-black text-[10px] md:text-xs uppercase border border-slate-100">Out</button>
                        ) : totalQtyInCart > 0 ? (
                           <div className="flex items-center gap-3 md:gap-4 bg-orange-50 rounded-xl px-2 py-1 border border-orange-200">
                              <button onClick={() => removeFromCart(cartItemsForDish[0].cartItemId)} className="font-black text-orange-600 text-base md:text-lg px-2">-</button>
                              <span className="text-xs md:text-sm font-black text-orange-600">{totalQtyInCart}</span>
                              <button onClick={() => openDishSheet(dish)} className="font-black text-orange-600 text-base md:text-lg px-2">+</button>
                           </div>
                        ) : (
                          <button onClick={() => openDishSheet(dish)} className="bg-orange-100 text-orange-600 hover:bg-orange-500 hover:text-white px-5 md:px-6 py-2 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all shadow-sm">
                            Add +
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] md:text-[11px] text-slate-500 font-medium line-clamp-2 mt-3 md:mt-4 pl-5 md:pl-6">{dish.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}  
        </div>

        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 md:bottom-8 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-xl bg-white md:rounded-[2rem] p-4 border-t border-slate-100 md:border md:shadow-2xl z-40 flex justify-between items-center shadow-[0_-10px_20px_rgba(0,0,0,0.05)] animate-in slide-in-from-bottom-10">
             <div className="pl-2">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">{cart.reduce((a,b)=>a+b.qty,0)} Items Added</p>
                <p className="text-xl font-black text-slate-900 tracking-tight">₹{grandTotal}</p> 
             </div>
             <button onClick={() => setView('checkout')} className="bg-orange-500 text-white px-8 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-orange-600 shadow-lg shadow-orange-500/20 flex items-center gap-2">
               Next <ChevronRight size={18} />
             </button>
          </div>
        )}

        {/* BOTTOM SHEET */}
        {selectedDish && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setSelectedDish(null); setSheetRecs({}); }}></div>
            
            <div className="relative bg-white w-full md:w-[500px] h-[85vh] md:h-auto md:max-h-[95vh] rounded-t-3xl md:rounded-3xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 shadow-2xl">
              
              <button onClick={() => { setSelectedDish(null); setSheetRecs({}); }} className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full backdrop-blur-md">
                <X size={20} />
              </button>

              <div className="overflow-y-auto custom-scrollbar flex-1 pb-[140px] md:pb-[160px]">
                <div className="w-full h-56 md:h-64 bg-slate-100 relative">
                  <img src={selectedDish.image_url || `https://source.unsplash.com/600x400/?food,${selectedDish.name}`} className="w-full h-full object-cover" />
                </div>
                
                <div className="p-5 md:p-6">
                  <div className="flex items-center gap-2 mb-2">
                     <div className="w-4 h-4 border-2 border-green-600 flex items-center justify-center rounded-sm"><div className="w-2 h-2 bg-green-600 rounded-full"></div></div>
                     <h2 className="text-xl md:text-2xl font-black text-slate-900">{selectedDish.name}</h2>
                  </div>
                  <p className="text-xs md:text-sm text-slate-500 mb-6">{selectedDish.description}</p>

                  {selectedDish.variants && selectedDish.variants.length > 0 && (
                    <div className="mb-6 md:mb-8">
                      <h3 className="font-bold text-slate-800 mb-3 text-xs md:text-sm">Quantity <span className="text-[9px] md:text-[10px] text-slate-400 font-normal uppercase tracking-widest ml-2">Select Any 1</span></h3>
                      <div className="space-y-2 md:space-y-3">
                        {selectedDish.variants.map((variant, idx) => (
                          <label key={idx} className={`flex items-center justify-between p-3 md:p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedVariant?.name === variant.name ? 'border-orange-500 bg-orange-50/30' : 'border-slate-100 bg-white hover:border-orange-200'}`}>
                            <span className="font-bold text-slate-800 text-sm">{variant.name}</span>
                            <div className="flex items-center gap-3">
                              <span className="font-black text-slate-900 text-sm">₹{variant.price}</span>
                              <div className={`w-4 h-4 md:w-5 md:h-5 rounded-full border-[1.5px] md:border-2 flex items-center justify-center shrink-0 ${selectedVariant?.name === variant.name ? 'border-orange-500' : 'border-slate-300'}`}>
                                {selectedVariant?.name === variant.name && <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-orange-500 rounded-full shrink-0"></div>}
                              </div>
                            </div>
                            <input type="radio" name="variant" className="hidden" checked={selectedVariant?.name === variant.name} onChange={() => setSelectedVariant(variant)} />
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-6 md:mb-8">
                    <h3 className="font-bold text-slate-800 mb-2 md:mb-3 text-xs md:text-sm flex items-center gap-2"><MessageSquare size={14}/> Add a cooking request (optional)</h3>
                    <textarea 
                      placeholder="e.g. Don't make it too spicy" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 md:p-4 text-xs md:text-sm font-medium text-slate-700 outline-none focus:border-orange-500 focus:bg-white transition-all resize-none h-20 md:h-24"
                      value={cookingRequest}
                      onChange={(e) => setCookingRequest(e.target.value)}
                    />
                  </div>

                  {getSmartRecs(selectedDish).length > 0 && (
                    <div>
                      <h3 className="font-bold text-slate-800 mb-3 md:mb-4 text-xs md:text-sm">Recommended with this</h3>
                      <div className="flex overflow-x-auto gap-3 md:gap-4 pb-4 no-scrollbar">
                        {getSmartRecs(selectedDish).map(rec => {
                          const hasVariants = rec.variants && rec.variants.length > 0;
                          
                          return (
                            <div 
                              key={rec.id} 
                              className="min-w-[160px] md:min-w-[180px] bg-white border-2 border-slate-100 rounded-2xl p-2 md:p-3 shadow-sm shrink-0 flex flex-col"
                            >
                              <img src={rec.image_url} className="w-full h-16 md:h-20 object-cover rounded-xl mb-2 bg-slate-100" />
                              <p className="font-bold text-slate-800 text-[10px] md:text-xs truncate mb-2">{rec.name}</p>
                              
                              {hasVariants ? (
                                <div className="mt-auto flex flex-col gap-1.5 w-full">
                                  {rec.variants.map((v, i) => {
                                    const qty = sheetRecs[`${rec.id}-${v.name}`]?.qty || 0;
                                    return (
                                      <div key={i} className="flex items-center justify-between text-[9px] md:text-[10px] bg-slate-50 rounded-lg p-1 border border-slate-100">
                                        <span className="text-slate-700 font-bold pl-1">{v.name} - ₹{v.price}</span>
                                        {qty > 0 ? (
                                          <div className="flex items-center gap-1.5 bg-orange-50 text-orange-600 rounded px-1 border border-orange-200">
                                             <button onClick={() => updateSheetRecQty(rec, v, -1)} className="font-black px-1.5">-</button>
                                             <span className="font-black">{qty}</span>
                                             <button onClick={() => updateSheetRecQty(rec, v, 1)} className="font-black px-1.5">+</button>
                                          </div>
                                        ) : (
                                          <button onClick={() => updateSheetRecQty(rec, v, 1)} className="bg-white text-orange-600 px-2 py-0.5 rounded border border-orange-200 font-bold shadow-sm">Add</button>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                (() => {
                                  const qty = sheetRecs[`${rec.id}-regular`]?.qty || 0;
                                  return (
                                    <div className="flex justify-between items-center mt-auto bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                      <span className="font-black text-slate-900 text-[10px] pl-1">₹{rec.price}</span>
                                      {qty > 0 ? (
                                        <div className="flex items-center gap-2 bg-orange-50 text-orange-600 rounded px-1 border border-orange-200">
                                           <button onClick={() => updateSheetRecQty(rec, null, -1)} className="font-black px-1.5">-</button>
                                           <span className="font-black text-[10px]">{qty}</span>
                                           <button onClick={() => updateSheetRecQty(rec, null, 1)} className="font-black px-1.5">+</button>
                                        </div>
                                      ) : (
                                        <button onClick={() => updateSheetRecQty(rec, null, 1)} className="bg-white text-orange-600 px-3 py-0.5 rounded border border-orange-200 font-bold shadow-sm text-[10px]">Add</button>
                                      )}
                                    </div>
                                  )
                                })()
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 shadow-[0_-15px_30px_rgba(0,0,0,0.08)]">
                <div className="flex items-center justify-between mb-3 px-2">
                  <span className="font-bold text-slate-800 text-xs md:text-sm">Main Item Quantity</span>
                  <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1">
                    <button onClick={() => setMainDishQty(Math.max(1, mainDishQty - 1))} className="font-black text-slate-600 text-lg px-2 hover:text-orange-500">-</button>
                    <span className="text-sm font-black text-slate-800">{mainDishQty}</span>
                    <button onClick={() => setMainDishQty(mainDishQty + 1)} className="font-black text-slate-600 text-lg px-2 hover:text-orange-500">+</button>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    if (selectedDish.variants?.length > 0 && !selectedVariant) {
                      return alert("Please select Quantity (Half/Full) for the main dish!");
                    }
                    
                    addToCart(selectedDish, selectedVariant, cookingRequest, false, mainDishQty);
                    
                    Object.values(sheetRecs).forEach(recItem => {
                      addToCart(recItem.dish, recItem.variant, "", false, recItem.qty);
                    });

                    setSelectedDish(null);
                    setSelectedVariant(null);
                    setCookingRequest('');
                    setMainDishQty(1);
                    setSheetRecs({});
                  }}
                  disabled={selectedDish.variants?.length > 0 && !selectedVariant}
                  className="w-full bg-orange-500 disabled:bg-slate-300 text-white py-3.5 md:py-4 rounded-xl md:rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-orange-500/20 active:scale-95 transition-all"
                >
                  Add {getSheetTotals().items > 1 ? `${getSheetTotals().items} items` : 'item'} • ₹{getSheetTotals().price}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // 3. CHECKOUT CART
  if (view === 'checkout') {
    if (cart.length === 0) {
      return (
        <div className="w-full min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <ShoppingCart size={40} className="text-slate-400" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2 italic">Your Cart is Empty</h2>
          <p className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-widest mb-8">Add some delicious items to proceed.</p>
          <button onClick={() => setView('menu')} className="bg-orange-500 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-600 shadow-xl shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-2">
            <ChevronLeft size={18} /> Browse Menu
          </button>
        </div>
      );
    }

    return (
      <div className="w-full min-h-screen bg-slate-50 p-4 md:p-8 pb-32 overflow-y-auto relative">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => setView('menu')} className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 hover:text-orange-500 transition-all"><ChevronLeft size={14}/> Back to Menu</button>
          <h2 className="text-3xl font-black text-slate-900 mb-8 italic tracking-tighter">Your Order</h2>
          
          <div className="space-y-4 mb-4">
             {cart.map(item => (
               <div key={item.cartItemId} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                 <div className="flex justify-between items-start">
                   <div className="flex items-start gap-3">
                     <div className="mt-0.5 w-4 h-4 border-2 border-green-600 flex items-center justify-center rounded-sm shrink-0"><div className="w-2 h-2 bg-green-600 rounded-full"></div></div>
                     <div>
                       <span className="font-bold text-slate-800 block">{item.name}</span>
                       {item.selectedVariant && <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded mt-1 inline-block">{item.selectedVariant.name}</span>}
                     </div>
                   </div>
                   <div className="text-right">
                     <span className="font-black text-slate-900 block text-lg">₹{item.price * item.qty}</span>
                   </div>
                 </div>
                 
                 <div className="flex justify-between items-end mt-2">
                    <div className="flex-1 pr-4 flex flex-col items-start gap-2">
                      {item.cookingRequest && <p className="text-[11px] text-orange-600 bg-orange-50 p-2 rounded-lg italic inline-block font-medium">" {item.cookingRequest} "</p>}
                      <button onClick={() => openEditCartItem(item)} className="text-[10px] font-black text-orange-500 uppercase tracking-widest hover:underline flex items-center gap-1 bg-orange-50 px-3 py-1.5 rounded-md">
                        <Edit3 size={12} /> Customize
                      </button>
                    </div>
                    <div className="flex items-center gap-4 bg-slate-100 rounded-xl px-2 py-1 shrink-0">
                      <button onClick={() => removeFromCart(item.cartItemId)} className="font-black text-slate-600 text-lg px-2 hover:text-orange-600">-</button>
                      <span className="text-sm font-black text-slate-800">{item.qty}</span>
                      <button onClick={() => addToCart(item, item.selectedVariant, item.cookingRequest, false)} className="font-black text-slate-600 text-lg px-2 hover:text-orange-600">+</button>
                    </div>
                 </div>
               </div>
             ))}
          </div>

          <button onClick={() => setView('menu')} className="w-full bg-orange-50/50 text-orange-600 border-2 border-orange-200 border-dashed py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex justify-center items-center gap-2 hover:bg-orange-100 transition-all mb-8 shadow-sm">
             <Plus size={16} /> Add More Items
          </button>

          <div className="bg-slate-900 text-white p-6 md:p-8 rounded-[2rem] shadow-xl mb-8">
            <div className="space-y-3 mb-6 text-sm font-medium text-slate-300 border-b border-slate-700 pb-6">
              <div className="flex justify-between items-center">
                <span>Item Total</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
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

          <div className="bg-white p-6 rounded-[2rem] shadow-sm mb-8 border border-slate-100">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block text-center mb-4">Table Number</label>
            <input type="number" min="1" placeholder="Eg: 5" className="w-full text-center text-4xl font-black bg-slate-50 p-4 rounded-2xl text-slate-900 border-none outline-none mb-3 focus:ring-2 focus:ring-orange-500 transition-all" value={tableNumber} onChange={e => setTableNumber(e.target.value)} />
            <p className="text-[10px] text-slate-400 text-center font-bold uppercase tracking-widest">Required for waiter to serve you</p>
          </div>

          {/* 🚨 CALL WAITER BUTTON */}
          <button onClick={handleCallWaiter} disabled={loading || !tableNumber} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm shadow-xl uppercase tracking-widest flex justify-center items-center gap-2 hover:bg-black active:scale-95 transition-all disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={24} /> : <><BellRing size={20}/> Call Waiter To Confirm</>}
          </button>
          {!tableNumber && <p className="text-[10px] text-red-500 text-center font-bold mt-2 uppercase tracking-widest">Please enter Table Number first</p>}
        </div>
        
        {/* Cart Item Edit Modal */}
        {editingCartItem && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingCartItem(null)}></div>
            <div className="relative bg-white w-full md:w-[500px] rounded-t-3xl md:rounded-3xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 shadow-2xl p-6 md:p-8">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h2 className="text-xl font-black text-slate-900 italic">Customize {editingCartItem.name}</h2>
                    <button onClick={() => setEditingCartItem(null)} className="text-slate-400 hover:text-slate-900 bg-slate-100 p-2 rounded-full"><X size={18} /></button>
                </div>

                {editingCartItem.variants && editingCartItem.variants.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-bold text-slate-800 mb-3 text-sm">Quantity</h3>
                      <div className="space-y-2">
                        {editingCartItem.variants.map((variant, idx) => (
                          <label key={idx} className={`flex items-center justify-between p-3 md:p-4 rounded-2xl border-2 cursor-pointer transition-all ${editCartVariant?.name === variant.name ? 'border-orange-500 bg-orange-50/30' : 'border-slate-100 bg-white hover:border-orange-200'}`}>
                            <span className="font-bold text-slate-800 text-sm">{variant.name}</span>
                            <div className="flex items-center gap-3">
                              <span className="font-black text-slate-900 text-sm">₹{variant.price}</span>
                              <div className={`w-4 h-4 md:w-5 md:h-5 rounded-full border-[1.5px] md:border-2 flex items-center justify-center shrink-0 ${editCartVariant?.name === variant.name ? 'border-orange-500' : 'border-slate-300'}`}>
                                {editCartVariant?.name === variant.name && <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-orange-500 rounded-full shrink-0"></div>}
                              </div>
                            </div>
                            <input type="radio" name="edit-variant" className="hidden" checked={editCartVariant?.name === variant.name} onChange={() => setEditCartVariant(variant)} />
                          </label>
                        ))}
                      </div>
                    </div>
                )}

                <div className="mb-8">
                    <h3 className="font-bold text-slate-800 mb-2 md:mb-3 text-sm flex items-center gap-2"><MessageSquare size={14}/> Cooking Request</h3>
                    <textarea 
                      placeholder="e.g. Don't make it too spicy" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 md:p-4 text-sm font-medium text-slate-700 outline-none focus:border-orange-500 focus:bg-white transition-all resize-none h-20"
                      value={editCartRequest}
                      onChange={(e) => setEditCartRequest(e.target.value)}
                    />
                </div>

                <button onClick={handleUpdateCartItem} className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-orange-500/20 active:scale-95 transition-all">
                    Update Item
                </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // 🚨 4. NEW VIEW: WAITER CONFIRMATION SCREEN (No Prices shown)
  if (view === 'waiter_screen') {
    return (
      <div className="w-full min-h-screen bg-slate-900 p-4 md:p-8 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1200')] bg-cover opacity-10 blur-sm"></div>
        
        <div className="bg-white w-full max-w-md rounded-[3rem] p-8 text-center shadow-2xl relative z-10">
          <div className="mx-auto w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6">
            <BellRing size={32} />
          </div>
          <h2 className="text-3xl font-serif font-black text-slate-900 mb-2 italic">Show to Waiter</h2>
          <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-6">
            Table {tableNumber} • Order #{orderId}
          </p>

          <div className="bg-slate-50 rounded-2xl p-5 mb-8 text-left max-h-[40vh] overflow-y-auto border border-slate-100 shadow-inner custom-scrollbar">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">Items to confirm</p>
            <div className="space-y-4">
              {placedOrderItems.map((item, idx) => (
                <div key={idx} className="flex gap-3 items-start border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                  <div className="bg-slate-200 text-slate-800 text-xs font-black px-2.5 py-1 rounded shrink-0">{item.qty}x</div>
                  <div>
                    <span className="font-bold text-slate-800 block leading-tight">{item.name}</span>
                    {item.selectedVariant && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block">Variant: {item.selectedVariant.name}</span>}
                    {item.cookingRequest && <p className="text-[10px] text-red-500 font-bold mt-1 italic">Note: {item.cookingRequest}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-slate-400 font-bold uppercase mb-6 leading-relaxed">
            Your order has been sent to the kitchen display.<br/> Waiter will confirm it shortly.
          </p>

          <button onClick={clearSessionAndStartNew} className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">
            Order More Items
          </button>
        </div>
      </div>
    )
  }
}

export default App;