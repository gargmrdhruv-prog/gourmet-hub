import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, UtensilsCrossed, BarChart3, Settings, LogOut, ExternalLink } from 'lucide-react'; // ExternalLink add kiya hai

const AdminLayout = ({ children }) => {
  const [logo, setLogo] = useState('');
  const [restName, setRestName] = useState('Loading...');
  const [adminId, setAdminId] = useState(1); // Live menu URL ke liye
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSettings = async () => {
      // 🚨 FIX: LocalStorage se pata lagao kaunsa Admin login hai
      const savedUser = localStorage.getItem('admin_user');
      if (!savedUser) {
        window.location.href = '/admin-login';
        return;
      }
      
      const userObj = JSON.parse(savedUser);
      setAdminId(userObj.id);

      // 🚨 FIX: Sirf ussi restaurant ki settings laao
      const { data, error } = await supabase
        .from('restaurant_settings')
        .select('logo_url, restaurant_name')
        .eq('restaurant_id', userObj.id) // ID 1 ki jagah dynamic ID
        .maybeSingle(); 
      
      if (data) {
        setLogo(data.logo_url);
        setRestName(data.restaurant_name || userObj.name);
      } else {
        setRestName(userObj.name); // Naya rest. hai to default naam
      }
    };
    fetchSettings();
  }, [location.pathname]); 

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/admin' },
    { name: 'Live Orders', icon: <ShoppingCart size={20} />, path: '/admin/orders' },
    { name: 'Menu Management', icon: <UtensilsCrossed size={20} />, path: '/admin/menu' },
    { name: 'Analytics', icon: <BarChart3 size={20} />, path: '/admin/analytics' },
    { name: 'Settings', icon: <Settings size={20} />, path: '/admin/settings' },
  ];

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/admin-login'; 
    } catch (error) {
      console.error("Logout failed:", error.message);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* --- SIDEBAR --- */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-10 shadow-2xl shadow-slate-900/40 border-r border-slate-800">
        
        {/* LOGO SECTION (LEFT SIDEBAR) */}
        <div className="p-6 flex items-center gap-3.5 border-b border-slate-800">
          <div className="h-10 w-10 rounded-2xl bg-orange-500/10 flex items-center justify-center overflow-hidden border border-orange-500/20 shadow-inner flex-shrink-0 bg-slate-800">
            {logo ? (
              <img src={logo} alt="brand logo" className="h-full w-full object-cover" />
            ) : (
              <span className="font-black text-xl text-orange-500 italic">{restName.charAt(0)}</span>
            )}
          </div>
          <div className="overflow-hidden">
            <h1 className="text-sm font-black italic text-white leading-tight truncate">{restName}</h1>
            <p className="text-[9px] text-gray-400 uppercase tracking-widest mt-1">Admin Portal</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2.5">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3.5 p-3.5 rounded-xl transition-all duration-300 font-semibold group ${
                location.pathname === item.path 
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
                : 'text-gray-400 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className={`${location.pathname === item.path ? 'text-white' : 'text-orange-500/80 group-hover:text-white'}`}>
                {item.icon}
              </div>
              <span className="text-sm tracking-tight">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          {/* 🚨 NAYA: Apna menu live dekhne ka link */}
          <a 
            href={`/?rest=${adminId}`} 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-3.5 text-blue-400 p-3.5 w-full hover:bg-blue-500/10 rounded-xl transition-all duration-300 font-semibold text-sm"
          >
            <ExternalLink size={20} />
            <span className="tracking-tight">View Live Menu</span>
          </a>

          <button 
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3.5 text-red-400 p-3.5 w-full hover:bg-red-500/10 rounded-xl transition-all duration-300 font-semibold text-sm"
          >
            <LogOut size={20} />
            <span className="tracking-tight">Logout</span>
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="ml-64 flex-1">
        
        {/* --- TOP HEADER --- */}
        <header className="bg-white/95 backdrop-blur-sm h-16 border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-20 shadow-sm">
          <h2 className="font-black text-xl text-slate-800 uppercase tracking-tight italic">
            {menuItems.find(m => m.path === location.pathname)?.name || 'Admin'}
          </h2>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-extrabold text-slate-950 tracking-tight">{restName}</p>
              <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider flex items-center gap-1 justify-end">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span> Online
              </p>
            </div>
            
            {/* AVATAR LOGO (TOP RIGHT) */}
            <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-slate-50 shadow-inner overflow-hidden flex items-center justify-center flex-shrink-0">
              {logo ? (
                <img src={logo} alt="admin profile" className="h-full w-full object-cover" />
              ) : (
                <span className="font-black text-sm text-slate-500 uppercase">{restName.substring(0, 2)}</span>
              )}
            </div>
          </div>
        </header>

        <div className="p-10">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;