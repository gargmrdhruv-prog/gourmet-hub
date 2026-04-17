import React, { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { supabase } from './supabase';
import { Store, Phone, Clock, MapPin, Upload, Loader2, Save, Type, Receipt, Plus, Trash2 } from 'lucide-react';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [taxes, setTaxes] = useState([]);
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [address, setAddress] = useState('');
  const [openTime, setOpenTime] = useState('');
  const [closeTime, setCloseTime] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState(null);

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
        
        // 🚨 TAXES FETCHING LOGIC
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

  const uploadLogo = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `logo_${Date.now()}.${fileExt}`;
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
      if (logoFile) finalLogoUrl = await uploadLogo(logoFile);

      const safeOpenTime = openTime ? openTime : null;
      const safeCloseTime = closeTime ? closeTime : null;

      const payload = {
        restaurant_id: adminUser.id, 
        restaurant_name: name || adminUser.name,
        tagline: tagline,
        address: address,
        opening_time: safeOpenTime,
        closing_time: safeCloseTime,
        logo_url: finalLogoUrl, // 🚨 FIX: Yahan comma miss tha aapke code mein
        taxes: taxes
      };

      const { data: existing, error: fetchErr } = await supabase
        .from('restaurant_settings')
        .select('id')
        .eq('restaurant_id', adminUser.id)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      if (existing) {
        const { error: updateErr } = await supabase
          .from('restaurant_settings')
          .update(payload)
          .eq('id', existing.id);
        if (updateErr) throw updateErr; 
      } else {
        const { error: insertErr } = await supabase
          .from('restaurant_settings')
          .insert([payload]);
        if (insertErr) throw insertErr; 
      }

      setLogoUrl(finalLogoUrl);
      setLogoFile(null); 
      alert("✅ Settings successfully saved!");

    } catch (error) {
      console.error(error);
      alert("Error saving settings: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <AdminLayout>
      <div className="flex flex-col h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-orange-500 mb-4" size={40} /></div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Restaurant Settings ⚙️</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your storefront details for {adminUser?.name}</p>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          
          {/* BRANDING SECTION */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b pb-3"><Store size={20} className="text-orange-500" /> Branding & Identity</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Restaurant Logo</label>
                <div className="flex items-center gap-6">
                  <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden relative">
                    {logoFile ? <img src={URL.createObjectURL(logoFile)} className="h-full w-full object-contain p-2" /> : logoUrl ? <img src={logoUrl} className="h-full w-full object-contain p-2" /> : <span className="text-xs text-slate-400 font-bold">No Logo</span>}
                  </div>
                  <div className="relative">
                    <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <button type="button" className="bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2"><Upload size={18} /> Choose New Logo</button>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Store size={12}/> Restaurant Name</label>
                <input type="text" value={name || adminUser?.name || ''} readOnly className="w-full bg-slate-100 border-none rounded-xl p-4 font-bold text-slate-400 cursor-not-allowed select-none" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Type size={12}/> Tagline</label>
                <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500" placeholder="E.g. Delivering Happiness..." />
              </div>
            </div>
          </div>

          {/* CONTACT SECTION */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b pb-3"><Phone size={20} className="text-blue-500" /> Contact & Location</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><MapPin size={12}/> Full Address</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows="2" className="w-full bg-slate-50 border-none rounded-xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Clock size={12}/> Opening Time</label>
                <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Clock size={12}/> Closing Time</label>
                <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
            </div>
          </div>

          {/* 🚨 TAX MANAGEMENT SECTION 🚨 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6 border-b pb-3">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Receipt size={20} className="text-green-500" /> Billing & Taxes</h2>
              <button 
                type="button" 
                onClick={() => setTaxes([...taxes, { id: Date.now().toString(), name: 'New Tax', rate: 0, active: true }])}
                className="text-xs font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1 bg-orange-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus size={14} /> Add Custom Tax
              </button>
            </div>
            
            <div className="space-y-4">
              {taxes.map((tax, index) => (
                <div key={tax.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${tax.active ? 'border-green-200 bg-green-50/30' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex items-center gap-4 w-full">
                    {/* Active Toggle */}
                    <input 
                      type="checkbox" 
                      checked={tax.active}
                      onChange={(e) => {
                        const newTaxes = [...taxes];
                        newTaxes[index].active = e.target.checked;
                        setTaxes(newTaxes);
                      }}
                      className="w-5 h-5 accent-green-500 cursor-pointer"
                    />
                    
                    {/* Tax Name */}
                    <input 
                      type="text" 
                      value={tax.name}
                      onChange={(e) => {
                        const newTaxes = [...taxes];
                        newTaxes[index].name = e.target.value;
                        setTaxes(newTaxes);
                      }}
                      disabled={!tax.active}
                      className="bg-transparent border-none font-bold text-slate-700 outline-none w-1/3 disabled:opacity-50"
                    />

                    {/* Tax Rate % */}
                    <div className="flex items-center gap-2">
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
                        className="w-20 bg-white border border-slate-200 rounded-lg p-2 text-center font-bold outline-none focus:border-orange-500 disabled:opacity-50"
                      />
                      <span className="font-bold text-slate-400">%</span>
                    </div>
                  </div>

                  {/* Delete Button (Only for custom taxes, cant delete default CGST/SGST) */}
                  {tax.id !== 'cgst' && tax.id !== 'sgst' && (
                    <button 
                      type="button" 
                      onClick={() => setTaxes(taxes.filter(t => t.id !== tax.id))}
                      className="text-red-400 hover:text-red-500 p-2 transition-colors"
                      title="Delete this tax"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4">
              * Active taxes will be automatically calculated on the total bill in the customer app.
            </p>
          </div>

          {/* SAVE BUTTON */}
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="bg-orange-500 text-white px-8 py-4 rounded-xl font-black text-sm uppercase tracking-wider flex items-center gap-2 disabled:opacity-50 hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95">
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save All Settings
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default Settings;