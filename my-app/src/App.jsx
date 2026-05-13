import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import Settings from "./Settings";
import SuperAdminDashboard from './SuperAdminDashboard'; 
import { Loader2, ChevronLeft, X, Star, ChevronRight, MessageSquare, Plus, Edit3, BellRing, Grid, ArrowLeft } from 'lucide-react';
import SuperAdminLogin from './SuperAdminLogin';
import { Navigate, useLocation } from 'react-router-dom';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('welcome');
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('gourmet_cart')) || []);
  const [placedOrderItems, setPlacedOrderItems] = useState(() => JSON.parse(localStorage.getItem('gourmet_placed_items')) || []);
  const [tableNumber, setTableNumber] = useState(() => localStorage.getItem('gourmet_table') || ''); 
  const [orderId, setOrderId] = useState(() => localStorage.getItem('gourmet_order_id') || '');
  const [restaurantId, setRestaurantId] = useState(() => localStorage.getItem('gourmet_rest_id') || '1');
  
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allDishes, setAllDishes] = useState([]);
  const [filteredDishes, setFilteredDishes] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDish, setSelectedDish] = useState(null);
  const [selectedVariants, setSelectedVariants] = useState([]);
  const [cookingRequest, setCookingRequest] = useState('');
  const [mainDishQty, setMainDishQty] = useState(1); 
  const [sheetRecs, setSheetRecs] = useState({}); 

  const [editingCartItem, setEditingCartItem] = useState(null);
  const [storeSettings, setStoreSettings] = useState(null);

  const [vh, setVh] = useState(window.innerHeight);
  
  const location = useLocation();
  const currentPath = location.pathname;

  useEffect(() => {
    if (view === 'checkout' && cart.length === 0) {
      setView('menu');
    }
  }, [cart, view]);

  useEffect(() => {
    const init = async () => {
      if (currentPath.startsWith('/admin') || currentPath.startsWith('/super-admin')) {
         const { data: { session } } = await supabase.auth.getSession();

         if (session) {
           const savedUser = localStorage.getItem('admin_user');
           if (savedUser) setUser(JSON.parse(savedUser));
         } else {
           localStorage.removeItem('admin_user');
           localStorage.removeItem('admin_session_expiry');
           setUser(null);
         }
         
         setLoading(false); 
         return; 
      }

      let activeRestId = '1';
      const urlParams = new URLSearchParams(window.location.search);
      const urlRestId = urlParams.get('rest');
      const urlTableId = urlParams.get('table');

      if (urlTableId) {
        setTableNumber(urlTableId);
      }

      if (urlRestId) {
        activeRestId = urlRestId;
      } else {
        activeRestId = localStorage.getItem('gourmet_rest_id') || '1';
      }

      setRestaurantId(activeRestId);
      await fetchInitialData(activeRestId);
      recordScan(activeRestId);
    };
    
    init();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('admin_user');
        localStorage.removeItem('admin_session_expiry');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [currentPath]);

  useEffect(() => { localStorage.setItem('gourmet_cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('gourmet_table', tableNumber); }, [tableNumber]);
  useEffect(() => { localStorage.setItem('gourmet_placed_items', JSON.stringify(placedOrderItems)); }, [placedOrderItems]);
  useEffect(() => { localStorage.setItem('gourmet_order_id', orderId); }, [orderId]);
  useEffect(() => { localStorage.setItem('gourmet_rest_id', restaurantId); }, [restaurantId]);

  useEffect(() => {
    if (!currentPath.startsWith('/admin')) return; 

    const interval = setInterval(() => {
      const sessionExpiry = localStorage.getItem('admin_session_expiry');
      const now = new Date().getTime();
      
      if (sessionExpiry && now > parseInt(sessionExpiry)) {
        localStorage.removeItem('admin_user');
        localStorage.removeItem('admin_session_expiry');
        setUser(null);
        window.location.href = '/admin-login';
      }
    }, 60000); 
    
    return () => clearInterval(interval);
  }, [currentPath]);

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
    try {
      const { data: catData } = await supabase.from('subcategories').select('*').eq('restaurant_id', restId);
      const { data: dishData } = await supabase.from('dishes').select('*').eq('restaurant_id', restId);
      
      const { data: restData } = await supabase.from('restaurants').select('menu_style').eq('id', restId).maybeSingle();
      const menuStyle = restData?.menu_style || 'classic';

      const { data: settingsData } = await supabase.from('restaurant_settings')
        .select('*, primary_color, font_family, button_style')
        .eq('restaurant_id', restId)
        .maybeSingle();
        
      if (settingsData) {
        setStoreSettings({
          name: settingsData.restaurant_name || 'Gourmet Menu',
          logo: settingsData.logo_url || '',
          tagline: settingsData.tagline || '',
          welcome_bg_url: settingsData.welcome_bg_url || 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1200', 
          taxes: settingsData.taxes || [],
          theme_color: settingsData.primary_color || '#F59E0B', 
          theme_font: settingsData.font_family || 'Poppins, sans-serif',
          theme_button: settingsData.button_style || 'rounded-full',
          menu_bg_value: settingsData.menu_bg_value || '#f8fafc',
          strict_table_mode: settingsData.strict_table_mode || false,
          menu_style: menuStyle 
        });
      } else {
        setStoreSettings({ 
          name: 'Welcome to Our Menu', logo: '', tagline: '', welcome_bg_url: '', taxes: [], 
          theme_color: '#F59E0B', theme_font: 'Poppins, sans-serif', theme_button: 'rounded-full',
          menu_bg_value: '#f8fafc',
          strict_table_mode: false,
          menu_style: menuStyle
        });
      }

      setCategories(catData || []);
      setAllDishes(dishData || []);

      if (catData && catData.length > 0) {
        if (menuStyle === 'category_hero') {
           setSelectedCategory(null);
           setFilteredDishes(dishData || []);
        } else {
           const firstCategoryId = catData[0].id;
           setSelectedCategory(firstCategoryId);
           setFilteredDishes((dishData || []).filter(d => d.subcategory_id === firstCategoryId));
        }
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

  // 🚨 SMART CART ARCHITECTURE: Parent-Child Linkage & Strict Boundries
  const addToCart = (dish, variantsArray = [], request = "", closeSheet = true, qtyToAdd = 1, isFree = false, parentId = null) => {
    if (qtyToAdd <= 0) return;
    if (qtyToAdd > 20) {
      alert("⚠️ Security Alert: You cannot add more than 20 quantities of a single item at once.");
      return;
    }
    
    const variantsTotal = variantsArray.reduce((sum, v) => sum + Number(v.price), 0);
    const actualPrice = isFree ? 0 : (Number(dish.price) + variantsTotal);
    
    const variantNames = variantsArray.map(v => v.name).sort().join(' + ');
    let cartItemId = variantNames ? `${dish.id}-${variantNames}` : `${dish.id}-regular`;

    // Isolate Free items from Paid items
    if (isFree && parentId) {
        cartItemId = `${dish.id}-free-${parentId}`;
    }

    setCart(prevCart => {
      let workingCart = prevCart;
      
      // If we are updating an existing customized item, clear the old bundle (Parent + Children)
      if (editingCartItem && !isFree) {
         workingCart = prevCart.filter(i => i.cartItemId !== editingCartItem.cartItemId && i.parentCartItemId !== editingCartItem.cartItemId);
      }

      const existing = workingCart.find(i => i.cartItemId === cartItemId);
      if (existing) {
        const newQty = (editingCartItem && !isFree) ? qtyToAdd : existing.qty + qtyToAdd;
        
        if (newQty > 20) {
          alert("⚠️ Maximum limit of 20 reached for this item.");
          return workingCart; 
        }

        // 🚨 FLAW 2 & 4 FIX: Free item checkout quantity cap
        if (isFree && parentId) {
            const parentItem = workingCart.find(i => i.cartItemId === parentId);
            if (parentItem && newQty > parentItem.qty) {
                alert(`⚠️ You can only add up to ${parentItem.qty} complimentary ${dish.name}.`);
                return workingCart;
            }
        }

        return workingCart.map(i => i.cartItemId === cartItemId 
            ? { ...i, qty: newQty, cookingRequest: request || i.cookingRequest } 
            : i
        );
      } else {
        if (workingCart.length >= 30) {
          alert("⚠️ Cart is full! Please place this order first before adding more items.");
          return workingCart;
        }

        return [...workingCart, { 
            ...dish, 
            name: dish.name, 
            cartItemId, 
            price: actualPrice, 
            selectedVariants: variantsArray, 
            cookingRequest: request, 
            qty: qtyToAdd,
            isFreeItem: isFree,
            parentCartItemId: parentId
        }];
      }
    });
    
    if (closeSheet) {
      setSelectedDish(null);
      setSelectedVariants([]);
      setCookingRequest('');
      setMainDishQty(1);
      setSheetRecs({});
      setEditingCartItem(null);
    }
  }

  // 🚨 FLAW 3 FIX: Auto-Remove child if parent drops or decreases
  const removeFromCart = (cartItemId) => {
    setCart(prevCart => {
      const existing = prevCart.find(i => i.cartItemId === cartItemId);
      if (!existing) return prevCart;

      if (existing.qty === 1) {
          // Remove parent AND all its free complimentary children
          return prevCart.filter(i => i.cartItemId !== cartItemId && i.parentCartItemId !== cartItemId);
      } else {
          const newQty = existing.qty - 1;
          return prevCart.map(i => {
              if (i.cartItemId === cartItemId) return { ...i, qty: newQty };
              // 🚨 FLAW 4 FIX: Sync decrease if Free child exceeds new parent limit
              if (i.parentCartItemId === cartItemId && i.qty > newQty) return { ...i, qty: newQty };
              return i;
          });
      }
    });
  }

  // Populates existing children back to sheetRecs when Editing
  const openEditCartItem = (item) => {
    setEditingCartItem(item);
    setSelectedDish(item); 
    setSelectedVariants(item.selectedVariants || []);
    setCookingRequest(item.cookingRequest || '');
    setMainDishQty(item.qty);
    
    const existingChildren = cart.filter(c => c.parentCartItemId === item.cartItemId);
    const newSheetRecs = {};
    existingChildren.forEach(child => {
        newSheetRecs[child.id] = { dish: child, qty: child.qty };
    });
    setSheetRecs(newSheetRecs); 
  }

  const getSmartRecs = (currentDish) => {
    if (!currentDish.paired_items || currentDish.paired_items.length === 0) return [];
    return currentDish.paired_items.map(p => {
       if (!p || p === '[object Object]') return null;
       let pId, isFree;
       if (typeof p === 'string') {
          pId = p.split(':')[0];
          isFree = p.includes(':free');
       } else if (typeof p === 'object') {
          pId = p.id;
          isFree = p.isFree;
       } else return null;
       
       const dishInfo = allDishes.find(d => d.id === pId);
       if (!dishInfo) return null;
       return { ...dishInfo, isFreeItem: isFree };
    }).filter(Boolean);
  }

  const openDishSheet = (dish) => {
    setEditingCartItem(null);
    setSelectedDish(dish);
    setCookingRequest('');
    setMainDishQty(1);
    setSheetRecs({});
    setSelectedVariants([]); 
  };

  const getSheetTotals = () => {
    if (!selectedDish) return { items: 0, price: 0 };
    
    const variantsTotal = selectedVariants.reduce((sum, v) => sum + Number(v.price), 0);
    const mainPrice = (Number(selectedDish.price) + variantsTotal) * mainDishQty;
    
    const recPrice = Object.values(sheetRecs).reduce((sum, item) => {
      const itemBasePrice = item.dish.isFreeItem ? 0 : Number(item.dish.price);
      return sum + (item.variant ? itemBasePrice + Number(item.variant.price) : itemBasePrice) * item.qty;
    }, 0);
    
    const recItems = Object.values(sheetRecs).reduce((sum, item) => sum + item.qty, 0);
    
    return {
      items: mainDishQty + recItems,
      price: mainPrice + recPrice
    };
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const activeTaxes = storeSettings?.taxes?.filter(tax => tax.active) || [];
  const taxBreakdown = activeTaxes.map(tax => ({
    name: tax.name, rate: tax.rate, amount: subtotal * (tax.rate / 100)
  }));
  const totalTaxAmount = taxBreakdown.reduce((sum, tax) => sum + tax.amount, 0);
  const grandTotal = Math.round(subtotal + totalTaxAmount); 

  const handleCallWaiter = async () => {
    if (loading) return;
    if (cart.length === 0) return alert("Cart is empty!");

    const lastOrderTime = localStorage.getItem('last_order_time');
    const now = new Date().getTime();
    
    if (lastOrderTime && now - parseInt(lastOrderTime) < 10000) { 
      alert("⚠️ Processing your previous order. Please wait a few seconds.");
      return; 
    }

    setLoading(true);
    try {
      const finalTableStatus = tableNumber && tableNumber.toString().trim() !== "" ? tableNumber : "Table Unassigned";

      const todayStart = new Date();
      const startOfMonth = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { count, error: countError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .gte('created_at', startOfMonth.toISOString()); 

      if (countError) throw countError;
      
      const monthlyCount = (count || 0) + 1; 
      const sequenceNumber = monthlyCount.toString().padStart(2, '0'); 
      const month = (todayStart.getMonth() + 1).toString().padStart(2, '0');
      const year = todayStart.getFullYear().toString().slice(-2);
      
      const generatedOrderId = `#${month}${year}-${sequenceNumber}`;

      const { data, error } = await supabase
        .from('orders')
        .insert([{ 
          restaurant_id: restaurantId, 
          table_number: finalTableStatus, 
          total_bill: grandTotal, 
          status: 'pending', 
          items: cart 
        }]).select();
      
      if (error) throw error;
      if (data && data.length > 0) {
        setOrderId(generatedOrderId);
        
        setPlacedOrderItems(prev => [...prev, ...cart]); 
        setCart([]); 
        localStorage.setItem('last_order_time', new Date().getTime().toString());
        setView('waiter_screen');
      }
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const clearSessionAndStartNew = () => {
    localStorage.removeItem('gourmet_cart');
    localStorage.removeItem('gourmet_placed_items');
    localStorage.removeItem('gourmet_order_id');
    setCart([]);
    setPlacedOrderItems([]);
    setOrderId('');
    setView('menu');
  };

  if (currentPath.includes('super-admin-login')) return <SuperAdminLogin />;
  if (currentPath.includes('super-admin')) return localStorage.getItem('super_admin_auth') === 'true' ? <SuperAdminDashboard /> : <SuperAdminLogin />;
  
  if (currentPath.includes('admin-login')) {
    if (user) { 
        return <Navigate to="/admin" replace />; 
    }
    return (
       <div className="min-h-screen bg-slate-50 flex flex-col justify-center">
         <AdminLogin onLoginSuccess={(u) => { setUser(u); window.location.href = '/admin'; }} />
       </div>
    );
  }
  
  if (currentPath.includes('/admin')) {
      return null; 
  }

  if (loading || !storeSettings) {
    return (
      <div className="min-h-[100dvh] bg-slate-900 flex flex-col items-center justify-center text-white gap-4">
         <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-orange-500"></div>
         <p className="text-sm font-bold text-slate-400 uppercase">Loading...</p>
      </div>
    );
  }

  const isDarkColor = (color) => {
    if (!color) return false;
    let hex = color.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luma < 128; 
  };

  const mainBgColor = storeSettings.menu_bg_value || '#f8fafc';
  const isDarkTheme = isDarkColor(mainBgColor);
  const isRoyalFont = storeSettings.theme_font && storeSettings.theme_font.toLowerCase().includes('cinzel');

  return (
    <div style={{ fontFamily: storeSettings.theme_font, minHeight: '100dvh', backgroundColor: mainBgColor }} className="flex flex-col">
      
      {view === 'welcome' && (
        <div className="w-full min-h-[100dvh] bg-slate-900 flex flex-col justify-end md:justify-center pb-12 md:pb-20 px-6 md:px-12 relative overflow-hidden">
          {storeSettings.welcome_bg_url && (
            <img src={storeSettings.welcome_bg_url} className="absolute inset-0 w-full h-full object-cover opacity-40" alt="bg" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"></div>
          <div className="relative z-10 text-center max-w-2xl mx-auto w-full">
            {storeSettings.logo && (
              <img src={storeSettings.logo} alt="Logo" className="w-24 h-24 md:w-32 md:h-32 object-contain mx-auto mb-6 rounded-2xl bg-white/10 p-2 backdrop-blur-md" />
            )}
            <h2 style={{ color: storeSettings.theme_color }} className="font-serif italic mb-2 text-xl md:text-2xl">Welcome to</h2>
            <h1 className={`text-5xl md:text-7xl font-black text-white mb-8 ${isRoyalFont ? 'uppercase tracking-[0.15em] not-italic' : 'font-serif tracking-tighter italic'}`}>
              {storeSettings.name}
            </h1>
            <button 
              onClick={() => setView('menu')} 
              style={{ backgroundColor: storeSettings.theme_color }}
              className={`w-full md:w-auto md:px-16 text-white py-5 ${storeSettings.theme_button} font-black text-lg shadow-2xl transition-all hover:scale-105 active:scale-95`}
            >
              EXPLORE MENU
            </button>
          </div>
        </div>
      )}

      {view !== 'welcome' && (
        <div 
          className="w-full relative transition-colors duration-300 flex-1 flex flex-col"
          style={{ backgroundColor: mainBgColor, minHeight: '100dvh' }}
        >
          <div className="relative z-10 flex flex-col flex-1" style={{ minHeight: '100dvh' }}>

            {view === 'menu' && (
              <>
                <header className="shadow-sm sticky top-0 z-40 border-b border-slate-100/10 backdrop-blur-md transition-colors duration-300 bg-transparent">
                  <div className="max-w-7xl mx-auto p-4 md:px-8 md:py-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 md:gap-5 overflow-hidden">
                      <div className="h-14 w-14 md:h-16 md:w-16 rounded-xl bg-white flex items-center justify-center overflow-hidden border border-slate-200/50 shadow-sm flex-shrink-0">
                        {storeSettings.logo ? <img src={storeSettings.logo} alt="Logo" className="h-full w-full object-cover" /> : <span style={{ color: storeSettings.theme_color }} className="font-black text-xl italic">{storeSettings.name.charAt(0)}</span>}
                      </div>
                      <div className="overflow-hidden">
                        <h1 className={`text-xl md:text-2xl leading-tight truncate ${isDarkTheme ? 'text-white' : 'text-slate-800'} ${isRoyalFont ? 'uppercase tracking-widest font-black' : 'font-black italic'}`}>
                          {storeSettings.name}
                        </h1>
                        {storeSettings.tagline && <p className={`text-[10px] md:text-xs font-bold uppercase tracking-wider mt-0.5 truncate ${isDarkTheme ? 'text-slate-300' : 'text-slate-500'}`}>{storeSettings.tagline}</p>}
                      </div>
                    </div>
                    
                    {placedOrderItems.length > 0 && (
                      <button onClick={() => setView('waiter_screen')} className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-2 md:px-4 md:py-2.5 rounded-xl font-black text-[10px] md:text-xs uppercase flex items-center gap-1.5 border border-blue-200 transition-all shrink-0 shadow-sm animate-in zoom-in">
                        <BellRing size={16} className="animate-pulse" /> <span className="hidden sm:inline">Active Order</span>
                      </button>
                    )}
                  </div>
                </header>

                {storeSettings.menu_style !== 'category_hero' && (
                  <div className="sticky top-[81px] md:top-[97px] z-30 border-b border-slate-100/10 shadow-sm backdrop-blur-md transition-colors duration-300 bg-transparent">
                    <nav className="flex gap-3 md:gap-4 overflow-x-auto p-3 md:px-8 md:py-4 max-w-7xl mx-auto no-scrollbar">
                      {categories.map(cat => (
                        <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                          style={selectedCategory === cat.id ? { backgroundColor: storeSettings.theme_color, color: 'white', borderColor: storeSettings.theme_color } : {}}
                          className={`px-5 py-2.5 md:py-2 md:px-6 rounded-full text-[11px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap flex-shrink-0 ${selectedCategory === cat.id ? 'shadow-md opacity-100' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 shadow-sm'}`}>
                          {cat.name}
                        </button>
                      ))}
                    </nav>
                  </div>
                )}

                <div className="max-w-7xl mx-auto w-full p-4 md:p-6 lg:p-8 flex-1 pb-32">
                  
                  {storeSettings.menu_style === 'category_hero' && selectedCategory === null ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                      <div className="text-center mb-8 md:mb-10 mt-2">
                        <h2 className={`text-2xl md:text-4xl font-black italic mb-2 ${isDarkTheme ? 'text-white' : 'text-slate-800'} ${isRoyalFont ? 'uppercase tracking-[0.1em]' : ''}`}>Our Signature Collections</h2>
                        <p className={`text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>Handpicked culinary masterpieces</p>
                        <div style={{ backgroundColor: storeSettings.theme_color }} className="w-16 h-1 mx-auto mt-4 rounded-full"></div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                        {categories.map(cat => (
                           <div key={cat.id} onClick={() => setSelectedCategory(cat.id)} className="relative h-48 md:h-64 rounded-3xl overflow-hidden cursor-pointer shadow-md group border border-slate-100/20">
                              <img src={cat.image_url || `https://source.unsplash.com/600x600/?food,${cat.name}`} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={cat.name} />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end p-4 md:p-6">
                                 <span className="text-white font-black text-lg md:text-2xl tracking-wide">{cat.name}</span>
                              </div>
                           </div>
                        ))}
                      </div>
                    </div>
                  ) : filteredDishes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-20 px-4">
                      <span className="text-5xl grayscale opacity-50 mb-4">🍽️</span>
                      <h3 className={`text-2xl font-serif font-black mb-2 italic ${isDarkTheme ? 'text-white' : 'text-slate-800'}`}>Menu is Brewing</h3>
                      <p className={`text-xs font-bold uppercase tracking-widest ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>Chef is curating dishes for this category.</p>
                    </div>
                  ) : storeSettings.menu_style === 'category_hero' ? (
                    
                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4">
                      <button onClick={() => setSelectedCategory(null)} className={`flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-widest mb-4 transition-all w-fit px-5 py-2.5 rounded-full border border-slate-200 shadow-sm ${isDarkTheme ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                         <ArrowLeft size={14} /> Back to Collections
                      </button>

                      {filteredDishes.map(dish => {
                        const cartItemsForDish = cart.filter(i => i.id === dish.id);
                        const totalQtyInCart = cartItemsForDish.reduce((sum, item) => sum + item.qty, 0);
                        const isNonVeg = dish.tags?.some(t => t.toLowerCase().includes('non-veg'));
                        const isVeg = dish.tags?.some(t => t.toLowerCase() === 'veg 🟢' || (t.toLowerCase().includes('veg') && !t.toLowerCase().includes('non-veg')));
                        const extraTags = dish.tags?.filter(t => !t.toLowerCase().includes('veg 🟢') && !t.toLowerCase().includes('non-veg 🔴') && !t.toLowerCase().includes('bestseller ⭐')) || [];
                        const isBestseller = dish.tags?.some(t => t.toLowerCase().includes('bestseller'));

                        return (
                          <div key={dish.id} className="bg-white/95 backdrop-blur-md p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                              <div className="flex-1 pr-0 sm:pr-4">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <div className="flex-shrink-0">
                                    {isNonVeg ? (
                                      <div className="w-3.5 h-3.5 border-2 border-red-500 flex items-center justify-center rounded-sm"><div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div></div>
                                    ) : isVeg ? (
                                      <div className="w-3.5 h-3.5 border-2 border-green-600 flex items-center justify-center rounded-sm"><div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div></div>
                                    ) : null}
                                  </div>
                                  <h3 className={`font-black text-slate-800 leading-tight cursor-pointer ${isRoyalFont ? 'uppercase tracking-widest text-sm md:text-base' : 'text-lg md:text-xl'}`} onClick={() => openDishSheet(dish)}>
                                    {dish.name}
                                  </h3>
                                </div>
                                {dish.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{dish.description}</p>}
                                
                                {(extraTags.length > 0 || isBestseller) && (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {extraTags.map((tag, idx) => (
                                      <span key={idx} style={{ color: storeSettings.theme_color, backgroundColor: `${storeSettings.theme_color}15`, borderColor: `${storeSettings.theme_color}30` }} className="text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-widest">
                                        {tag}
                                      </span>
                                    ))}
                                    {isBestseller && (
                                       <span style={{ backgroundColor: storeSettings.theme_color }} className="text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm">⭐ Bestseller</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                                <span className="font-black text-slate-900 text-lg md:text-xl">₹{dish.price}</span>
                                
                                {dish.is_available === false ? (
                                  <button disabled className={`bg-slate-50 text-slate-300 px-4 py-2 ${storeSettings.theme_button} font-black text-xs uppercase border border-slate-100`}>Out</button>
                                ) : totalQtyInCart > 0 ? (
                                   <div style={{ backgroundColor: `${storeSettings.theme_color}10`, borderColor: `${storeSettings.theme_color}30` }} className={`flex items-center gap-3 ${storeSettings.theme_button} px-2 py-1.5 border`}>
                                      <button onClick={() => removeFromCart(cartItemsForDish[0].cartItemId)} style={{ color: storeSettings.theme_color }} className="font-black text-base px-2">-</button>
                                      <span style={{ color: storeSettings.theme_color }} className="text-sm font-black">{totalQtyInCart}</span>
                                      <button onClick={() => openDishSheet(dish)} style={{ color: storeSettings.theme_color }} className="font-black text-base px-2">+</button>
                                   </div>
                                ) : (
                                  <button onClick={() => openDishSheet(dish)} style={{ backgroundColor: storeSettings.theme_color, color: 'white' }} className={`px-6 py-2 ${storeSettings.theme_button} font-black text-xs uppercase tracking-widest shadow-sm active:scale-95 transition-all`}>
                                    Add
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6 animate-in fade-in slide-in-from-bottom-4">
                      {filteredDishes.map(dish => {
                        const cartItemsForDish = cart.filter(i => i.id === dish.id);
                        const totalQtyInCart = cartItemsForDish.reduce((sum, item) => sum + item.qty, 0);
                        const isNonVeg = dish.tags?.some(t => t.toLowerCase().includes('non-veg'));
                        const isVeg = dish.tags?.some(t => t.toLowerCase() === 'veg 🟢' || (t.toLowerCase().includes('veg') && !t.toLowerCase().includes('non-veg')));
                        const extraTags = dish.tags?.filter(t => !t.toLowerCase().includes('veg 🟢') && !t.toLowerCase().includes('non-veg 🔴') && !t.toLowerCase().includes('bestseller ⭐')) || [];
                        const isBestseller = dish.tags?.some(t => t.toLowerCase().includes('bestseller'));

                        return (
                          <div key={dish.id} className="bg-white/95 backdrop-blur-md rounded-3xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-all flex flex-col">
                            <div className="w-full h-44 sm:h-48 md:h-52 bg-slate-100 relative cursor-pointer flex-shrink-0" onClick={() => openDishSheet(dish)}>
                              <img src={dish.image_url || `https://source.unsplash.com/600x400/?food,${dish.name}`} className="w-full h-full object-cover" alt={dish.name} />
                              {!dish.is_available && (
                                <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-sm">
                                  <span className="text-sm font-black text-white uppercase tracking-widest bg-black/50 px-4 py-2 rounded-lg">Sold Out</span>
                                </div>
                              )}
                              {isBestseller && (
                                <div style={{ backgroundColor: storeSettings.theme_color }} className="absolute top-3 left-3 md:top-4 md:left-4 text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg">
                                  ⭐ Bestseller
                                </div>
                              )}
                            </div>
                            
                            <div className="p-4 md:p-5 flex flex-col flex-1">
                              <div className="flex items-start gap-2 mb-1">
                                <div className="mt-1 flex-shrink-0">
                                  {isNonVeg ? (
                                    <div className="w-3.5 h-3.5 border-2 border-red-500 flex items-center justify-center rounded-sm"><div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div></div>
                                  ) : isVeg ? (
                                    <div className="w-3.5 h-3.5 border-2 border-green-600 flex items-center justify-center rounded-sm"><div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div></div>
                                  ) : null}
                                </div>
                                <h3 className={`font-black text-slate-800 leading-tight cursor-pointer ${isRoyalFont ? 'uppercase tracking-widest text-sm md:text-base' : 'text-base md:text-lg'}`} onClick={() => openDishSheet(dish)}>
                                  {dish.name}
                               </h3>
                              </div>

                              {extraTags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-1.5 mb-2 pl-5 md:pl-6">
                                  {extraTags.map((tag, idx) => (
                                    <span key={idx} style={{ color: storeSettings.theme_color, backgroundColor: `${storeSettings.theme_color}15`, borderColor: `${storeSettings.theme_color}30` }} className="text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-widest">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {(dish.rating || dish.order_count) ? (
                                <div className="flex items-center gap-1.5 mb-3 pl-5 md:pl-6 mt-1">
                                  {dish.rating && (
                                    <div className="flex items-center gap-1 bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-black">
                                      <Star size={10} className="fill-green-700" /> {dish.rating}
                                    </div>
                                  )}
                                  {dish.order_count && (
                                    <span className="text-[9px] md:text-[10px] font-bold text-slate-400">{dish.order_count}+ orders</span>
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
                                  <button disabled className={`bg-slate-50 text-slate-300 px-4 py-2 ${storeSettings.theme_button} font-black text-[10px] md:text-xs uppercase border border-slate-100`}>Out</button>
                                ) : totalQtyInCart > 0 ? (
                                   <div style={{ backgroundColor: `${storeSettings.theme_color}10`, borderColor: `${storeSettings.theme_color}30` }} className={`flex items-center gap-3 md:gap-4 ${storeSettings.theme_button} px-2 py-1 border`}>
                                      <button onClick={() => removeFromCart(cartItemsForDish[0].cartItemId)} style={{ color: storeSettings.theme_color }} className="font-black text-base md:text-lg px-2">-</button>
                                      <span style={{ color: storeSettings.theme_color }} className="text-xs md:text-sm font-black">{totalQtyInCart}</span>
                                      <button onClick={() => openDishSheet(dish)} style={{ color: storeSettings.theme_color }} className="font-black text-base md:text-lg px-2">+</button>
                                   </div>
                                ) : (
                                  <button 
                                    onClick={() => openDishSheet(dish)} 
                                    style={{ backgroundColor: storeSettings.theme_color }}
                                    className={`text-white px-5 md:px-6 py-2 ${storeSettings.theme_button} font-black text-[10px] md:text-xs uppercase tracking-widest transition-all shadow-sm opacity-90 hover:opacity-100`}
                                  >
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
                  <div className="fixed bottom-4 left-4 right-4 md:bottom-8 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-xl bg-white/95 backdrop-blur-md rounded-2xl md:rounded-[2rem] p-3 md:p-4 border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.1)] md:shadow-2xl z-40 flex justify-between items-center animate-in slide-in-from-bottom-10">
                     
                     <button 
                       onClick={() => setCart([])} 
                       className="absolute -top-3 -right-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-full p-1.5 shadow border border-white transition-colors"
                     >
                       <X size={16} strokeWidth={3} />
                     </button>

                     <div className="pl-2">
                       <p className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">{cart.reduce((a,b)=>a+b.qty,0)} Items Added</p>
                       <p className="text-lg md:text-xl font-black text-slate-900 tracking-tight">₹{grandTotal}</p> 
                     </div>
                     <button 
                       onClick={() => setView('checkout')} 
                       style={{ backgroundColor: storeSettings.theme_color }}
                       className={`text-white px-6 md:px-8 py-3 md:py-3.5 ${storeSettings.theme_button} font-black text-xs md:text-sm uppercase tracking-widest flex items-center gap-2 shadow-lg hover:brightness-110 transition-all`}
                     >
                       Next <ChevronRight size={18} />
                     </button>
                  </div>
                )}
              </>
            )}

            {view === 'checkout' && (
              <div className="w-full flex-1 p-4 md:p-8 pb-32 overflow-y-auto relative bg-transparent">
                <div className="max-w-2xl mx-auto">
                  <button onClick={() => setView('menu')} className={`flex items-center gap-1 text-[11px] font-black uppercase tracking-widest mb-6 transition-all drop-shadow-sm ${isDarkTheme ? 'text-white' : 'text-slate-800'}`}><ChevronLeft size={16}/> Back to Menu</button>
                  <h2 className={`text-3xl font-black mb-8 italic tracking-tighter drop-shadow-sm ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>Your Order</h2>
                  
                  <div className="space-y-4 mb-4">
                     {cart.map(item => (
                       <div key={item.cartItemId} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                         <div className="flex justify-between items-start">
                           <div className="flex items-start gap-3">
                             <div className="mt-0.5 flex-shrink-0">
                               {item.tags?.some(t => t.toLowerCase().includes('non-veg')) ? (
                                 <div className="w-4 h-4 border-2 border-red-500 flex items-center justify-center rounded-sm"><div className="w-2 h-2 bg-red-500 rounded-full"></div></div>
                               ) : item.tags?.some(t => t.toLowerCase() === 'veg 🟢' || (t.toLowerCase().includes('veg') && !t.toLowerCase().includes('non-veg'))) ? (
                                 <div className="w-4 h-4 border-2 border-green-600 flex items-center justify-center rounded-sm"><div className="w-2 h-2 bg-green-600 rounded-full"></div></div>
                               ) : null}
                             </div>
                             <div>
                               <span className={`font-bold text-slate-800 block ${isRoyalFont ? 'uppercase tracking-wider text-xs' : ''}`}>
                                 {item.name} 
                                 {item.isFreeItem && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded ml-2 uppercase tracking-widest align-middle">Free</span>}
                               </span>
                               {item.selectedVariants && item.selectedVariants.length > 0 && (
                                 <div className="flex flex-wrap gap-1 mt-1.5">
                                   {item.selectedVariants.map((v, i) => (
                                     <span key={i} className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                       {v.name} (+₹{v.price})
                                     </span>
                                   ))}
                                 </div>
                               )}
                             </div>
                           </div>
                           <div className="text-right">
                             <span className="font-black text-slate-900 block text-lg">{item.isFreeItem ? '₹0' : `₹${item.price * item.qty}`}</span>
                           </div>
                         </div>
                         
                         <div className="flex justify-between items-end mt-2">
                            <div className="flex-1 pr-4 flex flex-col items-start gap-2">
                              {item.cookingRequest && <p style={{ color: storeSettings.theme_color, backgroundColor: `${storeSettings.theme_color}10` }} className="text-[11px] p-2 rounded-lg italic inline-block font-medium">" {item.cookingRequest} "</p>}
                              {!item.isFreeItem && (
                                <button onClick={() => openEditCartItem(item)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-700 flex items-center gap-1 mt-1 transition-colors">
                                  <Edit3 size={10} /> Customize
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-4 bg-slate-100 rounded-xl px-2 py-1 shrink-0">
                              <button onClick={() => removeFromCart(item.cartItemId)} className="font-black text-slate-600 text-lg px-2">-</button>
                              <span className="text-sm font-black text-slate-800">{item.qty}</span>
                              <button onClick={() => addToCart(item, item.selectedVariants || [], item.cookingRequest, false, 1, item.isFreeItem, item.parentCartItemId)} className="font-black text-slate-600 text-lg px-2">+</button>
                            </div>
                         </div>
                       </div>
                     ))}
                  </div>

                  <button 
                    onClick={() => setView('menu')} 
                    style={{ color: storeSettings.theme_color, borderColor: `${storeSettings.theme_color}50`, backgroundColor: `${storeSettings.theme_color}10` }}
                    className={`w-full border-2 border-dashed py-4 ${storeSettings.theme_button} font-black text-xs uppercase tracking-widest flex justify-center items-center gap-2 mb-8 shadow-sm`}
                  >
                     <Plus size={16} /> Add More Items
                  </button>

                  <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 mb-8">
                    <div className="space-y-3 mb-6 text-sm font-medium text-slate-500 border-b border-slate-100 pb-6">
                      <div className="flex justify-between items-center">
                        <span>Item Total</span>
                        <span className="font-black text-slate-800">₹{subtotal.toFixed(2)}</span>
                      </div>
                      {taxBreakdown.map((tax, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs text-slate-400">
                          <span>{tax.name} ({tax.rate}%)</span>
                          <span>+ ₹{tax.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-black text-slate-900 tracking-widest uppercase text-sm">Grand Total</span>
                      <span style={{ color: storeSettings.theme_color }} className="text-3xl font-black italic">₹{grandTotal}</span>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-[2rem] shadow-sm mb-8 border border-slate-100">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block text-center mb-4">
                      Table Number {storeSettings.strict_table_mode ? '(Locked)' : '(Optional)'}
                    </label>
                    <input 
                      type="text" 
                      disabled={storeSettings.strict_table_mode}
                      placeholder={storeSettings.strict_table_mode ? "Not Assigned" : "Eg: 5"} 
                      className={`w-full text-center text-4xl font-black p-4 rounded-2xl mb-3 transition-all ${
                        storeSettings.strict_table_mode 
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-2 border-dashed border-slate-200 outline-none' 
                          : 'bg-slate-50 text-slate-900 border-none outline-none focus:ring-2 focus:ring-slate-200'
                      }`} 
                      value={tableNumber} 
                      onKeyPress={(e) => {
                        if (e.key === '-' || e.key === 'e' || e.key === '.') {
                          e.preventDefault();
                        }
                      }}
                      onChange={(e) => {
                        if (storeSettings.strict_table_mode) return;
                        const val = e.target.value;
                        if (val === '' || parseInt(val) > 0) {
                          setTableNumber(val);
                        }
                      }} 
                    />
                    {storeSettings.strict_table_mode ? (
                      <p className="text-[10px] text-orange-500 text-center font-bold uppercase tracking-widest mt-2">
                        Table Number is locked by Restaurant
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 text-center font-bold uppercase tracking-widest mt-2">
                        Leave blank if Table is Unassigned
                      </p>
                    )}
                  </div>

                  <button onClick={handleCallWaiter} disabled={loading} className={`w-full bg-slate-900 text-white py-5 ${storeSettings.theme_button} font-black text-sm shadow-xl uppercase tracking-widest flex justify-center items-center gap-2 hover:bg-black active:scale-95 transition-all disabled:opacity-50`}>
                    {loading ? <Loader2 className="animate-spin" size={24} /> : <><BellRing size={20}/> Call Waiter To Confirm</>}
                  </button>
                </div>
              </div>
            )}

            {view === 'waiter_screen' && (
              <div className="w-full flex-1 p-4 md:p-8 flex flex-col items-center justify-center relative overflow-hidden bg-transparent">
                
                <div className="bg-white w-full max-w-md rounded-[3rem] p-8 text-center shadow-2xl relative z-10">
                  <div style={{ backgroundColor: `${storeSettings.theme_color}20`, color: storeSettings.theme_color }} className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6">
                    <BellRing size={32} />
                  </div>
                  <h2 className="text-3xl font-serif font-black text-slate-900 mb-2 italic">Show to Waiter</h2>
                  <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-6">
                    {tableNumber && tableNumber.toString().trim() !== "" ? `Table ${tableNumber}` : 'Table Unassigned'} • {orderId}
                  </p>

                  <div className="bg-slate-50 rounded-2xl p-5 mb-8 text-left max-h-[40vh] overflow-y-auto border border-slate-100 shadow-inner custom-scrollbar">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">Items to confirm</p>
                    <div className="space-y-4">
                      {placedOrderItems.map((item, idx) => (
                        <div key={idx} className="flex gap-3 items-start border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                          <div className="bg-slate-200 text-slate-800 text-xs font-black px-2.5 py-1 rounded shrink-0">{item.qty}x</div>
                          <div>
                            <span className="font-bold text-slate-800 block leading-tight">
                              {item.name} {item.isFreeItem && <span className="text-[8px] bg-green-100 text-green-700 px-1 py-0.5 rounded ml-1 uppercase tracking-widest">Free</span>}
                            </span>
                            {item.selectedVariants && item.selectedVariants.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {item.selectedVariants.map((v, i) => (
                                  <span key={i} style={{ color: storeSettings.theme_color, backgroundColor: `${storeSettings.theme_color}15` }} className="text-[9px] font-bold px-2 py-0.5 rounded border border-transparent inline-block">
                                    + {v.name}
                                  </span>
                                ))}
                              </div>
                            )}
                            {item.cookingRequest && <p className="text-[10px] text-red-500 font-bold mt-1.5 italic">Note: {item.cookingRequest}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-6 leading-relaxed">
                    Your order has been sent to the kitchen display.<br/> Waiter will confirm it shortly.
                  </p>

                  <button onClick={() => setView('menu')} className={`w-full bg-slate-100 text-slate-600 py-4 ${storeSettings.theme_button} font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all mb-3`}>
                    Add More Items
                  </button>
                  
                  <button onClick={clearSessionAndStartNew} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-red-500 transition-all">
                    Clear Session & Start Fresh
                  </button>
                </div>
              </div>
            )}
            
            {selectedDish && (
              <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setSelectedDish(null); setSheetRecs({}); setEditingCartItem(null); }}></div>
                
                <div className="relative bg-white w-full md:w-[500px] h-[85vh] md:h-auto md:max-h-[95vh] rounded-t-3xl md:rounded-3xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 shadow-2xl">
                  
                  <button onClick={() => { setSelectedDish(null); setSheetRecs({}); setEditingCartItem(null); }} className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full backdrop-blur-md">
                    <X size={20} />
                  </button>

                  <div className="overflow-y-auto custom-scrollbar flex-1 pb-[140px] md:pb-[160px]">
                    
                    {storeSettings.menu_style !== 'category_hero' && (
                      <div className="w-full h-56 md:h-64 bg-slate-100 relative">
                        <img src={selectedDish.image_url || `https://source.unsplash.com/600x400/?food,${selectedDish.name}`} className="w-full h-full object-cover" />
                      </div>
                    )}
                    
                    <div className={`p-5 md:p-6 ${storeSettings.menu_style === 'category_hero' ? 'pt-8 md:pt-10' : ''}`}>
                      <div className="flex items-center gap-2 mb-2">
                         <div className="flex-shrink-0">
                           {selectedDish.tags?.some(t => t.toLowerCase().includes('non-veg')) ? (
                             <div className="w-4 h-4 border-2 border-red-500 flex items-center justify-center rounded-sm"><div className="w-2 h-2 bg-red-500 rounded-full"></div></div>
                           ) : selectedDish.tags?.some(t => t.toLowerCase() === 'veg 🟢' || (t.toLowerCase().includes('veg') && !t.toLowerCase().includes('non-veg'))) ? (
                             <div className="w-4 h-4 border-2 border-green-600 flex items-center justify-center rounded-sm"><div className="w-2 h-2 bg-green-600 rounded-full"></div></div>
                           ) : null}
                         </div>
                         <h2 className={`font-black text-slate-900 ${isRoyalFont ? 'uppercase tracking-widest text-lg md:text-xl' : 'text-xl md:text-2xl'}`}>
                           {selectedDish.name}
                         </h2>
                      </div>

                      {selectedDish.tags && selectedDish.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {selectedDish.tags.map((tag, idx) => (
                            <span key={idx} className="text-[9px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded uppercase tracking-widest border border-slate-200">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-xs md:text-sm text-slate-500 mb-6">{selectedDish.description}</p>
                      
                      {storeSettings.menu_style === 'category_hero' && (
                         <div className="w-full h-[1px] bg-slate-100 my-6"></div>
                      )}

                      {selectedDish.variants && selectedDish.variants.length > 0 && (
                        <div className="mb-6 md:mb-8">
                          <h3 className="font-bold text-slate-800 mb-3 text-xs md:text-sm">Customize <span className="text-[9px] md:text-[10px] text-slate-400 font-normal uppercase tracking-widest ml-2">{selectedDish.variant_type === 'single' ? '(Pick 1)' : '(Optional Add-ons)'}</span></h3>
                          <div className="space-y-2 md:space-y-3">
                            
                            <label style={{ borderColor: storeSettings.theme_color, backgroundColor: `${storeSettings.theme_color}10` }} className="flex items-center justify-between p-3 md:p-4 rounded-2xl border-2 transition-all">
                              <span className="font-bold text-slate-800 text-sm">Base Item</span>
                              <div className="flex items-center gap-3">
                                <span className="font-black text-slate-900 text-sm">₹{selectedDish.price}</span>
                                <div style={{ borderColor: storeSettings.theme_color }} className={`w-4 h-4 md:w-5 md:h-5 border-[1.5px] md:border-2 flex items-center justify-center shrink-0 ${selectedDish.variant_type === 'single' ? 'rounded-full' : 'rounded-md'}`}>
                                  <div style={{ backgroundColor: storeSettings.theme_color }} className={`w-2 h-2 md:w-2.5 md:h-2.5 shrink-0 ${selectedDish.variant_type === 'single' ? 'rounded-full' : 'rounded-sm'}`}></div>
                                </div>
                              </div>
                            </label>

                            {selectedDish.variants.map((variant, idx) => {
                              const isSelected = selectedVariants.some(v => v.name === variant.name);
                              const isSingle = selectedDish.variant_type === 'single';

                              return (
                                <label key={idx} style={isSelected ? { borderColor: storeSettings.theme_color, backgroundColor: `${storeSettings.theme_color}10` } : {}} className={`flex items-center justify-between p-3 md:p-4 rounded-2xl border-2 cursor-pointer transition-all ${isSelected ? '' : 'border-slate-100 bg-white hover:border-slate-300'}`}>
                                  <span className="font-bold text-slate-800 text-sm">{variant.name}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="font-black text-slate-900 text-sm">+ ₹{variant.price}</span>
                                    <div style={isSelected ? { borderColor: storeSettings.theme_color } : {}} className={`w-4 h-4 md:w-5 md:h-5 border-[1.5px] md:border-2 flex items-center justify-center shrink-0 ${isSingle ? 'rounded-full' : 'rounded-md'} ${isSelected ? '' : 'border-slate-300'}`}>
                                      {isSelected && <div style={{ backgroundColor: storeSettings.theme_color }} className={`w-2 h-2 md:w-2.5 md:h-2.5 shrink-0 ${isSingle ? 'rounded-full' : 'rounded-sm'}`}></div>}
                                    </div>
                                  </div>
                                  <input 
                                    type={isSingle ? "radio" : "checkbox"} 
                                    name="variant_selection"
                                    className="hidden" 
                                    checked={isSelected} 
                                    onChange={() => {
                                      if (isSingle) {
                                        setSelectedVariants([variant]);
                                      } else {
                                        if (isSelected) {
                                          setSelectedVariants(selectedVariants.filter(v => v.name !== variant.name));
                                        } else {
                                          setSelectedVariants([...selectedVariants, variant]);
                                        }
                                      }
                                    }} 
                                  />
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="mb-6 md:mb-8">
                        <h3 className="font-bold text-slate-800 mb-2 md:mb-3 text-xs md:text-sm flex items-center gap-2"><MessageSquare size={14}/> Add a cooking request</h3>
                        <textarea 
                          placeholder="Any special cooking request? (e.g., Less spicy)" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 outline-none focus:bg-white transition-all resize-none h-24"
                          value={cookingRequest} 
                          maxLength={150}        
                          onChange={(e) => {
                            const safeText = e.target.value.replace(/[<>]/g, ""); 
                            setCookingRequest(safeText);
                          }}
                        />
                      </div>

                      {!editingCartItem && getSmartRecs(selectedDish).length > 0 && (
                        <div>
                          <h3 className="font-bold text-slate-800 mb-3 md:mb-4 text-xs md:text-sm">Recommended with this</h3>
                          <div className="flex overflow-x-auto gap-3 md:gap-4 pb-4 no-scrollbar">
                            {getSmartRecs(selectedDish).map(rec => {
                              const hasVariants = rec.variants && rec.variants.length > 0;
                              const recQty = sheetRecs[rec.id]?.qty || 0;
                              const isFree = rec.isFreeItem;

                              const handleRecAdd = () => {
                                if (isFree && recQty >= mainDishQty) {
                                  alert(`You can only add up to ${mainDishQty} complimentary ${rec.name} with your current selection.`);
                                  return;
                                }
                                setSheetRecs(prev => ({ ...prev, [rec.id]: { dish: rec, qty: recQty + 1 } }));
                              };

                              const handleRecRemove = () => {
                                if (recQty <= 1) {
                                  const newRecs = { ...sheetRecs };
                                  delete newRecs[rec.id];
                                  setSheetRecs(newRecs);
                                } else {
                                  setSheetRecs(prev => ({ ...prev, [rec.id]: { ...prev[rec.id], qty: recQty - 1 } }));
                                }
                              };

                              return (
                                <div key={rec.id} className="min-w-[160px] md:min-w-[180px] bg-white border-2 border-slate-100 rounded-2xl p-2 md:p-3 shadow-sm shrink-0 flex flex-col">
                                  {storeSettings.menu_style !== 'category_hero' && (
                                     <img src={rec.image_url} className="w-full h-16 md:h-20 object-cover rounded-xl mb-2 bg-slate-100" />
                                  )}
                                  <p className="font-bold text-slate-800 text-[10px] md:text-xs truncate mb-2 mt-1">{rec.name}</p>
                                  
                                  <div className="flex justify-between items-center mt-auto bg-slate-50 p-2 rounded-xl border border-slate-100">
                                    <div className="flex flex-col">
                                      {isFree ? (
                                        <span className="font-black text-green-600 text-[10px] md:text-xs flex flex-col leading-tight">
                                          <span className="line-through text-slate-400 font-bold text-[8px] md:text-[9px]">₹{rec.price}</span>FREE
                                        </span>
                                      ) : (
                                        <span className="font-black text-slate-900 text-xs">₹{rec.price}</span>
                                      )}
                                      {hasVariants && !isFree && <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Customizable</span>}
                                    </div>
                                    
                                    {recQty > 0 ? (
                                      <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-sm">
                                        <button onClick={handleRecRemove} className="text-slate-600 font-black px-1.5">-</button>
                                        <span className="text-[10px] font-black">{recQty}</span>
                                        <button onClick={handleRecAdd} className="text-slate-600 font-black px-1.5">+</button>
                                      </div>
                                    ) : (
                                      <button 
                                        onClick={handleRecAdd} 
                                        style={{ color: storeSettings.theme_color, backgroundColor: `${storeSettings.theme_color}10` }} 
                                        className="px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all"
                                      >
                                        Add +
                                      </button>
                                    )}
                                  </div>
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
                        <button 
                          onClick={() => {
                            const newQty = Math.max(1, mainDishQty - 1);
                            setMainDishQty(newQty);
                            setSheetRecs(prev => {
                              const newRecs = { ...prev };
                              Object.keys(newRecs).forEach(key => {
                                if (newRecs[key].dish.isFreeItem && newRecs[key].qty > newQty) {
                                  newRecs[key].qty = newQty;
                                }
                              });
                              return newRecs;
                            });
                          }} 
                          className="font-black text-slate-600 text-lg px-2"
                        >-</button>
                        <span className="text-sm font-black text-slate-800">{mainDishQty}</span>
                        <button onClick={() => setMainDishQty(mainDishQty + 1)} className="font-black text-slate-600 text-lg px-2">+</button>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        const variantNames = selectedVariants.map(v => v.name).sort().join(' + ');
                        const mainCartItemId = variantNames ? `${selectedDish.id}-${variantNames}` : `${selectedDish.id}-regular`;

                        addToCart(selectedDish, selectedVariants, cookingRequest, false, mainDishQty);
                        
                        Object.values(sheetRecs).forEach(recItem => {
                          addToCart(recItem.dish, [], "", false, recItem.qty, recItem.dish.isFreeItem, mainCartItemId);
                        });

                        setSelectedDish(null);
                        setSelectedVariants([]);
                        setCookingRequest('');
                        setMainDishQty(1);
                        setSheetRecs({});
                        setEditingCartItem(null);
                      }}
                      style={{ backgroundColor: storeSettings.theme_color }}
                      className={`w-full text-white py-3.5 md:py-4 ${storeSettings.theme_button} font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all`}
                    >
                      {editingCartItem ? 'Update Item' : `Add ${getSheetTotals().items > 1 ? `${getSheetTotals().items} items` : 'item'} • ₹${getSheetTotals().price}`}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;