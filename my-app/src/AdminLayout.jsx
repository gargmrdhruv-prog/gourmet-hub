import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, UtensilsCrossed, BarChart3, Settings, LogOut, ExternalLink, Menu, X } from 'lucide-react'; // 🚨 Menu aur X add kiya

const AdminLayout = ({ children }) => {
  const [logo, setLogo] = useState('');
  const [restName, setRestName] = useState('Loading...');
  const [adminId, setAdminId] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // 🚨 Mobile Sidebar Toggle State
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSettings = async () => {
      const savedUser = localStorage.getItem('admin_user');
      if (!savedUser) {
        window.location.href = '/admin-login';
        return;
      }
      
      const userObj = JSON.parse(savedUser);
      setAdminId(userObj.id);

      const { data, error } = await supabase
        .from('restaurant_settings')
        .select('logo_url, restaurant_name')
        .eq('restaurant_id', userObj.id)
        .maybeSingle(); 
      
      if (data) {
        setLogo(data.logo_url);
        setRestName(data.restaurant_name || userObj.name);
      } else {
        setRestName(userObj.name);
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
      
      {/* 🚨 MOBILE OVERLAY (Jab sidebar khula ho toh piche black shade aayega) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* --- SIDEBAR (Responsive) --- */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-900 text-white flex flex-col z-50 shadow-2xl shadow-slate-900/40 border-r border-slate-800 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        
        {/* LOGO SECTION */}
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-2xl bg-slate-800 flex items-center justify-center overflow-hidden border border-orange-500/20 shadow-inner flex-shrink-0">
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
          {/* Close button inside mobile sidebar */}
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2.5 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)} // 🚨 Mobile par click karte hi sidebar band ho jayega
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

      {/* --- MAIN CONTENT (Responsive Margin) --- */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        
        {/* --- TOP HEADER --- */}
        <header className="bg-white/95 backdrop-blur-sm h-16 border-b border-gray-100 flex items-center justify-between px-4 md:px-8 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-3">
            {/* 🚨 HAMBURGER BUTTON FOR MOBILE */}
            <button 
              className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h2 className="font-black text-lg md:text-xl text-slate-800 uppercase tracking-tight italic truncate">
              {menuItems.find(m => m.path === location.pathname)?.name || 'Admin'}
            </h2>
          </div>
          
          <div className="flex items-center gap-3 md:gap-4">
            <div className="text-right hidden sm:block"> {/* Mobile par text chupayenge, sirf logo dikhayenge */}
              <p className="text-xs font-extrabold text-slate-950 tracking-tight">{restName}</p>
              <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider flex items-center gap-1 justify-end">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span> Online
              </p>
            </div>
            
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-100 border-2 border-slate-50 shadow-inner overflow-hidden flex items-center justify-center flex-shrink-0">
              {logo ? (
                <img src={logo} alt="admin profile" className="h-full w-full object-cover" />
              ) : (
                <span className="font-black text-xs md:text-sm text-slate-500 uppercase">{restName.substring(0, 2)}</span>
              )}
            </div>
          </div>
        </header>

        {/* 🚨 RESPONSIVE PADDING FOR MAIN CONTENT */}
        <div className="p-4 md:p-8 lg:p-10 w-full max-w-[100vw] overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;