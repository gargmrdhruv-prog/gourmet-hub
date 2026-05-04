import React, { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { supabase } from './supabase';
import { 
  Store, Phone, Clock, MapPin, Upload, Loader2, Save, Type, 
  Receipt, Plus, Trash2, QrCode, Copy, Download, ExternalLink, Image as ImageIcon, ToggleLeft, ToggleRight 
} from 'lucide-react';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminUser, setAdminUser] = useState(null);

  // MENU BACKGROUND STATES
  const [menuBgType, setMenuBgType] = useState('color'); 
  const [menuBgValue, setMenuBgValue] = useState('#f8fafc');
  const [menuBgFile, setMenuBgFile] = useState(null); 
  const [menuBgOpacity, setMenuBgOpacity] = useState(0.1);
  const [headerBgColor, setHeaderBgColor] = useState('#ffffff');
  const [menuBgPosition, setMenuBgPosition] = useState('center');
  
  const [taxes, setTaxes] = useState([]);
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [address, setAddress] = useState('');
  const [openTime, setOpenTime] = useState('');
  const [closeTime, setCloseTime] = useState('');
  
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  
  // Welcome Background States
  const [welcomeBgUrl, setWelcomeBgUrl] = useState('');
  const [welcomeBgFile, setWelcomeBgFile] = useState(null);

  // 🚨 NEW: Strict Mode & Specific Table QR State
  const [strictTableMode, setStrictTableMode] = useState(false);
  const [tableQRInput, setTableQRInput] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem('admin_user');
    if (savedUser) {
      const userObj = JSON.parse(savedUser);
      setAdminUser(userObj);
      fetchSettings(userObj.id, userObj.name);
    }
  }, []);

  const fetchSettings = async (restId, defaultName) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('restaurant_settings')
        .select('*')
        .eq('restaurant_id', restId)
        .maybeSingle(); 

      if (data) {
        setName(data.restaurant_name || '');
        setTagline(data.tagline || '');
        setAddress(data.address || '');
        setOpenTime(data.opening_time || '');
        setCloseTime(data.closing_time || '');
        setLogoUrl(data.logo_url || '');
        setWelcomeBgUrl(data.welcome_bg_url || ''); 
        setMenuBgType(data.menu_bg_type || 'color');
        setMenuBgValue(data.menu_bg_value || '#f8fafc');
        setMenuBgOpacity(data.menu_bg_opacity ?? 0.1);
        setHeaderBgColor(data.header_bg_color || '#ffffff');
        setMenuBgPosition(data.menu_bg_position || 'center');
        setStrictTableMode(data.strict_table_mode || false); // Load Strict Mode
        
        setTaxes(data.taxes || [
          { id: "cgst", name: "CGST", rate: 2.5, active: false },
          { id: "sgst", name: "SGST", rate: 2.5, active: false }
        ]);
      } else {
        setName(defaultName);
      }
    } catch (error) {
      console.error("Error fetching settings:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file, prefix) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${prefix}_${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('restaurant-assets').upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from('restaurant-assets').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!adminUser) return;
    setSaving(true);

    try {
      let finalLogoUrl = logoUrl;
      let finalBgUrl = welcomeBgUrl;
      let finalMenuBgValue = menuBgValue;

      if (logoFile) finalLogoUrl = await uploadFile(logoFile, 'logo');
      if (welcomeBgFile) finalBgUrl = await uploadFile(welcomeBgFile, 'bg'); 
      if (menuBgFile) {
        finalMenuBgValue = await uploadFile(menuBgFile, 'menubg');
      }

      const safeOpenTime = openTime ? openTime : null;
      const safeCloseTime = closeTime ? closeTime : null;

      const payload = {
        restaurant_id: adminUser.id, 
        restaurant_name: name || adminUser.name,
        tagline: tagline,
        address: address,
        opening_time: safeOpenTime,
        closing_time: safeCloseTime,
        logo_url: finalLogoUrl, 
        welcome_bg_url: finalBgUrl, 
        taxes: taxes,
        menu_bg_type: menuBgType,
        menu_bg_value: finalMenuBgValue,
        menu_bg_opacity: menuBgOpacity,
        header_bg_color: headerBgColor,
        menu_bg_position: menuBgPosition,
        strict_table_mode: strictTableMode // Save Strict Mode
      };

      const { data: existing, error: fetchErr } = await supabase
        .from('restaurant_settings')
        .select('id')
        .eq('restaurant_id', adminUser.id)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      if (existing) {
        const { error: updateErr } = await supabase.from('restaurant_settings').update(payload).eq('id', existing.id);
        if (updateErr) throw updateErr; 
      } else {
        const { error: insertErr } = await supabase.from('restaurant_settings').insert([payload]);
        if (insertErr) throw insertErr; 
      }

      setLogoUrl(finalLogoUrl);
      setLogoFile(null); 
      setWelcomeBgUrl(finalBgUrl);
      setWelcomeBgFile(null);
      alert("✅ Settings successfully saved!");

    } catch (error) {
      console.error(error);
      alert("Error saving settings: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // 🚨 Dynamic QR Logic based on Table Number
  const baseMenuLink = adminUser ? `${window.location.origin}/?rest=${adminUser.id}` : '';
  const specificMenuLink = tableQRInput && adminUser ? `${baseMenuLink}&table=${tableQRInput}` : baseMenuLink;
  const qrCodeUrl = adminUser ? `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(specificMenuLink)}` : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(specificMenuLink);
    alert("✅ Menu link copied to clipboard!");
  };

  const downloadQR = async () => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${name || 'Restaurant'}-Table-${tableQRInput || 'Universal'}-QR.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to download QR code. You can right-click the image and save it.");
    }
  };

  if (loading) return (
    <AdminLayout>
      <div className="flex flex-col h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-orange-500 mb-4" size={40} />
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto w-full">
        <div className="mb-6 md:mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Restaurant Settings ⚙️</h1>
            <p className="text-slate-500 text-xs md:text-sm mt-1">Manage your storefront details for {adminUser?.name}</p>
          </div>
          <button onClick={handleSave} disabled={saving} className="hidden md:flex bg-orange-500 text-white px-6 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider items-center gap-2 hover:bg-orange-600 transition-all shadow-lg active:scale-95">
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save All
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6 md:space-y-8">
          
          {/* BRANDING SECTION */}
          <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-base md:text-lg font-bold text-slate-800 mb-4 md:mb-6 flex items-center gap-2 border-b pb-3">
              <Store size={18} className="text-orange-500 md:w-5 md:h-5" /> Branding & Identity
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* MENU BACKGROUND SETTINGS */}
              <div className="col-span-1 md:col-span-2 bg-slate-50 p-5 md:p-6 rounded-2xl shadow-inner border border-slate-200">
                <h2 className="text-sm md:text-base font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
                  <ImageIcon size={16} className="text-purple-500" /> Menu Background
                </h2>
                
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="bgType" checked={menuBgType === 'color'} onChange={() => setMenuBgType('color')} className="accent-purple-500 w-4 h-4" />
                      <span className="text-sm font-bold text-slate-700">Solid Color</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="bgType" checked={menuBgType === 'image'} onChange={() => setMenuBgType('image')} className="accent-purple-500 w-4 h-4" />
                      <span className="text-sm font-bold text-slate-700">Upload Image</span>
                    </label>
                  </div>

                  {menuBgType === 'color' ? (
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Full Page Color Fill</label>
                      <div className="flex gap-3">
                        <input type="color" value={menuBgValue} onChange={(e) => setMenuBgValue(e.target.value)} className="h-10 w-14 rounded cursor-pointer" />
                        <input type="text" value={menuBgValue} onChange={(e) => setMenuBgValue(e.target.value)} className="flex-1 bg-white border border-slate-200 rounded-xl p-2 font-bold text-slate-700 outline-none" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5 bg-white p-4 rounded-xl border border-slate-100">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Upload Background Image</label>
                        <div className="flex items-center gap-4">
                          <div className="h-16 w-24 md:h-20 md:w-32 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden relative shrink-0">
                            {menuBgFile ? (
                              <img src={URL.createObjectURL(menuBgFile)} className="w-full h-full object-cover" style={{ objectPosition: menuBgPosition }} />
                            ) : menuBgValue && menuBgValue.startsWith('http') ? (
                              <img src={menuBgValue} className="w-full h-full object-cover" style={{ objectPosition: menuBgPosition }} />
                            ) : (
                              <span className="text-[9px] text-slate-400 font-bold">No Image</span>
                            )}
                          </div>
                          <div className="relative w-full">
                            <input type="file" accept="image/*" onChange={(e) => setMenuBgFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            <button type="button" className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold flex justify-center items-center gap-2 text-xs hover:border-purple-500 transition-all"><Upload size={14} /> Choose File</button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Focus Area</label>
                        <div className="flex gap-2">
                          {['top', 'center', 'bottom'].map(pos => (
                            <button type="button" key={pos} onClick={() => setMenuBgPosition(pos)} className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all border ${menuBgPosition === pos ? 'bg-purple-100 border-purple-500 text-purple-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                              {pos}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Header Color (Top Bar)</label>
                        <div className="flex gap-3">
                          <input type="color" value={headerBgColor} onChange={(e) => setHeaderBgColor(e.target.value)} className="h-10 w-14 rounded cursor-pointer" />
                          <input type="text" value={headerBgColor} onChange={(e) => setHeaderBgColor(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-700 outline-none" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex justify-between">
                      <span>Background Visibility (Opacity)</span>
                      <span className="text-purple-600">{Math.round(menuBgOpacity * 100)}%</span>
                    </label>
                    <input 
                      type="range" min="0" max="1" step="0.05" 
                      value={menuBgOpacity} 
                      onChange={(e) => setMenuBgOpacity(parseFloat(e.target.value))} 
                      className="w-full accent-purple-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
              
              {/* Logo Upload */}
              <div className="col-span-1 border border-slate-100 p-4 rounded-2xl bg-white">
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Restaurant Logo</label>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 md:h-20 md:w-20 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden relative shrink-0">
                    {logoFile ? <img src={URL.createObjectURL(logoFile)} className="h-full w-full object-contain p-1" /> : logoUrl ? <img src={logoUrl} className="h-full w-full object-contain p-1" /> : <span className="text-[9px] text-slate-400 font-bold">No Logo</span>}
                  </div>
                  <div className="relative w-full">
                    <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <button type="button" className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold flex justify-center items-center gap-2 text-xs hover:border-orange-500 transition-all"><Upload size={14} /> Upload Logo</button>
                  </div>
                </div>
                <input type="text" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="Or paste logo URL here" className="mt-3 w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium text-slate-600 outline-none focus:border-orange-500" />
              </div>

              {/* Welcome Background Upload */}
              <div className="col-span-1 border border-slate-100 p-4 rounded-2xl bg-white">
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Menu Welcome Background</label>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 md:h-20 md:w-20 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden relative shrink-0">
                    {welcomeBgFile ? <img src={URL.createObjectURL(welcomeBgFile)} className="h-full w-full object-cover" /> : welcomeBgUrl ? <img src={welcomeBgUrl} className="h-full w-full object-cover" /> : <ImageIcon className="text-slate-300" size={24}/>}
                  </div>
                  <div className="relative w-full">
                    <input type="file" accept="image/*" onChange={(e) => setWelcomeBgFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <button type="button" className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold flex justify-center items-center gap-2 text-xs hover:border-orange-500 transition-all"><Upload size={14} /> Upload Image</button>
                  </div>
                </div>
                <input type="text" value={welcomeBgUrl} onChange={(e) => setWelcomeBgUrl(e.target.value)} placeholder="Or paste background URL here" className="mt-3 w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium text-slate-600 outline-none focus:border-orange-500" />
              </div>

              <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Store size={12}/> Restaurant Name</label>
                  <input type="text" value={name || adminUser?.name || ''} readOnly className="w-full bg-slate-100 border-none rounded-xl p-3 font-bold text-slate-400 cursor-not-allowed select-none text-sm" />
                </div>
                <div>
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Type size={12}/> Tagline</label>
                  <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500 text-sm" placeholder="E.g. Delivering Happiness..." />
                </div>
              </div>
            </div>
          </div>

          {/* 🚨 NEW QR CODE & STRICT MODE SECTION */}
          <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <h2 className="text-base md:text-lg font-bold text-slate-800 mb-4 md:mb-6 flex items-center gap-2 border-b pb-3">
              <QrCode size={18} className="text-purple-500 md:w-5 md:h-5" /> QR Code & Table Settings
            </h2>
            
            {/* Strict Table Mode Toggle */}
            <div className={`mb-6 p-4 rounded-2xl border-2 transition-all ${strictTableMode ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex justify-between items-center cursor-pointer" onClick={() => setStrictTableMode(!strictTableMode)}>
                <div>
                  <h3 className="font-black text-slate-800 text-sm">Strict Table Mode</h3>
                  <p className="text-[10px] md:text-xs text-slate-500 font-medium mt-1">If ON, customers cannot change the table number while ordering. Use this if you generate specific QR codes for each table.</p>
                </div>
                <div>
                  {strictTableMode ? <ToggleRight size={36} className="text-orange-500" /> : <ToggleLeft size={36} className="text-slate-400" />}
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start pt-4 border-t border-slate-100">
              <div className="flex flex-col items-center gap-3 shrink-0">
                <div className="w-40 h-40 md:w-48 md:h-48 bg-white border-4 border-slate-100 rounded-2xl shadow-sm p-2 flex items-center justify-center relative overflow-hidden group">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="Menu QR Code" className="w-full h-full object-contain" />
                  ) : (
                    <Loader2 className="animate-spin text-slate-300" size={32} />
                  )}
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl backdrop-blur-sm cursor-pointer" onClick={downloadQR}>
                     <Download size={24} className="text-white mb-2" />
                     <span className="text-[10px] font-black text-white uppercase tracking-widest">Download HD</span>
                  </div>
                </div>
                <button type="button" onClick={downloadQR} className="text-xs font-black text-purple-600 uppercase tracking-widest hover:underline flex items-center gap-1">
                  <Download size={14} /> Save QR Image
                </button>
              </div>

              <div className="flex-1 w-full space-y-4">
                {/* Specific Table Generator */}
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                  <label className="text-[9px] md:text-[10px] font-black text-purple-700 uppercase tracking-widest mb-2 block">Generate specific QR for Table No.</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      placeholder="e.g. 5" 
                      value={tableQRInput}
                      onChange={(e) => setTableQRInput(e.target.value)}
                      className="bg-white border border-purple-200 rounded-lg p-2 font-black text-slate-800 outline-none focus:border-purple-500 w-24 text-center" 
                    />
                    <div className="flex items-center text-xs text-purple-600/80 font-medium leading-tight">
                      {tableQRInput 
                        ? `QR code generated for Table ${tableQRInput}. Download and place it on Table ${tableQRInput}.` 
                        : "Leave empty to download Universal QR code."}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Live URL Preview</label>
                  <div className="flex items-center gap-2">
                    <input type="text" readOnly value={specificMenuLink} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 md:p-4 text-xs font-bold text-slate-600 outline-none truncate" />
                    <button type="button" onClick={copyToClipboard} className="bg-slate-900 text-white p-3 md:p-4 rounded-xl hover:bg-slate-800 transition-all shrink-0" title="Copy Link">
                      <Copy size={18} />
                    </button>
                  </div>
                </div>
                
                <div className="pt-2">
                   <a href={specificMenuLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-black text-blue-600 uppercase tracking-widest hover:underline">
                     Open Live Menu <ExternalLink size={14} />
                   </a>
                </div>
              </div>
            </div>
          </div>

          {/* CONTACT & LOCATION */}
          <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-base md:text-lg font-bold text-slate-800 mb-4 md:mb-6 flex items-center gap-2 border-b pb-3"><Phone size={18} className="text-blue-500 md:w-5 md:h-5" /> Contact & Location</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="col-span-1 md:col-span-2">
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><MapPin size={12}/> Full Address</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows="2" className="w-full bg-slate-50 border-none rounded-xl p-3 md:p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500 resize-none text-sm md:text-base" />
              </div>
              <div>
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Clock size={12}/> Opening Time</label>
                <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl p-3 md:p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500 text-sm md:text-base" />
              </div>
              <div>
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Clock size={12}/> Closing Time</label>
                <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl p-3 md:p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500 text-sm md:text-base" />
              </div>
            </div>
          </div>

          {/* TAX MANAGEMENT */}
          <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 border-b pb-3 gap-3 sm:gap-0">
              <h2 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2"><Receipt size={18} className="text-green-500 md:w-5 md:h-5" /> Billing & Taxes</h2>
              <button 
                type="button" 
                onClick={() => setTaxes([...taxes, { id: Date.now().toString(), name: 'New Tax', rate: 0, active: true }])}
                className="w-full sm:w-auto justify-center text-[10px] md:text-xs font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1 bg-orange-50 px-3 py-2 md:py-1.5 rounded-lg transition-colors"
              >
                <Plus size={14} /> Add Custom Tax
              </button>
            </div>
            
            <div className="space-y-3 md:space-y-4">
              {taxes.map((tax, index) => (
                <div key={tax.id} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 md:p-4 rounded-xl border transition-all gap-3 sm:gap-0 ${tax.active ? 'border-green-200 bg-green-50/30' : 'border-slate-200 bg-slate-50'}`}>
                  
                  <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto">
                    <input 
                      type="checkbox" 
                      checked={tax.active}
                      onChange={(e) => {
                        const newTaxes = [...taxes];
                        newTaxes[index].active = e.target.checked;
                        setTaxes(newTaxes);
                      }}
                      className="w-4 h-4 md:w-5 md:h-5 accent-green-500 cursor-pointer flex-shrink-0"
                    />
                    
                    <input 
                      type="text" 
                      value={tax.name}
                      onChange={(e) => {
                        const newTaxes = [...taxes];
                        newTaxes[index].name = e.target.value;
                        setTaxes(newTaxes);
                      }}
                      disabled={!tax.active}
                      className="bg-transparent border-none font-bold text-sm md:text-base text-slate-700 outline-none w-full sm:w-32 disabled:opacity-50"
                    />
                  </div>

                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 md:gap-4 pl-7 sm:pl-0">
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <input 
                        type="number" 
                        step="0.1"
                        min="0"
                        value={tax.rate}
                        onChange={(e) => {
                          const newTaxes = [...taxes];
                          newTaxes[index].rate = Math.max(0, parseFloat(e.target.value) || 0);
                          setTaxes(newTaxes);
                        }}
                        disabled={!tax.active}
                        className="w-16 md:w-20 bg-white border border-slate-200 rounded-lg p-1.5 md:p-2 text-center text-sm md:text-base font-bold outline-none focus:border-orange-500 disabled:opacity-50"
                      />
                      <span className="font-bold text-slate-400 text-sm md:text-base">%</span>
                    </div>

                    {tax.id !== 'cgst' && tax.id !== 'sgst' ? (
                      <button 
                        type="button" 
                        onClick={() => setTaxes(taxes.filter(t => t.id !== tax.id))}
                        className="text-red-400 hover:text-red-500 p-2 transition-colors flex-shrink-0"
                        title="Delete this tax"
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : (
                      <div className="w-8"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4">
              * Active taxes will be automatically calculated on the total bill in the customer app.
            </p>
          </div>

          <div className="flex justify-end pt-2 pb-6">
            <button type="submit" disabled={saving} className="w-full sm:w-auto justify-center bg-orange-500 text-white px-8 py-4 rounded-xl font-black text-sm uppercase tracking-wider flex items-center gap-2 disabled:opacity-50 hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95">
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save All Settings
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default Settings;