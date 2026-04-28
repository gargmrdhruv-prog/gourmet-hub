import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Palette, Type, MousePointerSquareDashed, Save, Loader2, CheckCircle2 } from 'lucide-react';

const ThemeCustomizer = ({ restaurantId }) => {
  const [theme, setTheme] = useState({
    primary_color: '#F59E0B',
    font_family: 'Poppins, sans-serif',
    button_style: 'rounded-full'
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Available options for dropdowns
  const fontOptions = [
    { name: 'Poppins (Modern & Clean)', value: 'Poppins, sans-serif' },
    { name: 'Playfair Display (Premium/Fine Dine)', value: '"Playfair Display", serif' },
    { name: 'Montserrat (Bold & Edgy)', value: 'Montserrat, sans-serif' },
    { name: 'Caveat (Quirky/Cafe Vibe)', value: 'Caveat, cursive' }
  ];

  const buttonOptions = [
    { name: 'Fully Rounded (Pill)', value: 'rounded-full' },
    { name: 'Soft Edges (Standard)', value: 'rounded-xl' },
    { name: 'Sharp Edges (Minimal)', value: 'rounded-none' }
  ];

  // Fetch current theme on load
  useEffect(() => {
    const fetchTheme = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('restaurant_settings')
          .select('primary_color, font_family, button_style')
          .eq('restaurant_id', restaurantId)
          .single();

        if (error) throw error;
        
        if (data) {
          setTheme({
            primary_color: data.primary_color || '#F59E0B',
            font_family: data.font_family || 'Poppins, sans-serif',
            button_style: data.button_style || 'rounded-full'
          });
        }
      } catch (error) {
        console.error("Error fetching theme:", error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (restaurantId) fetchTheme();
  }, [restaurantId]);

  // Handle Input Changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setTheme(prev => ({ ...prev, [name]: value }));
  };

  // Save to Supabase
  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const { error } = await supabase
        .from('restaurant_settings')
        .update({
          primary_color: theme.primary_color,
          font_family: theme.font_family,
          button_style: theme.button_style
        })
        .eq('restaurant_id', restaurantId);

      if (error) throw error;
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000); // Hide success message after 3 seconds
    } catch (error) {
      console.error("Error saving theme:", error.message);
      alert("Failed to save theme settings.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        <span className="ml-3 text-slate-500 font-medium">Loading Theme Engine...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden max-w-2xl">
      {/* Header */}
      <div className="bg-slate-900 p-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Palette className="w-5 h-5 text-orange-500" />
            Brand Personalization
          </h3>
          <p className="text-slate-400 text-xs mt-1">Customize the UI vibe for this specific restaurant.</p>
        </div>
        {/* Live Preview Badge */}
        <div 
          className={`px-4 py-1.5 text-xs font-bold text-white ${theme.button_style}`}
          style={{ backgroundColor: theme.primary_color, fontFamily: theme.font_family }}
        >
          Preview Button
        </div>
      </div>

      {/* Settings Body */}
      <div className="p-6 space-y-6">
        
        {/* 1. Primary Color Picker */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Palette className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800">Primary Brand Color</label>
              <span className="text-xs text-slate-500">Used for buttons, accents, and icons</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono bg-white px-2 py-1 rounded border text-slate-600">
              {theme.primary_color.toUpperCase()}
            </span>
            <input 
              type="color" 
              name="primary_color"
              value={theme.primary_color} 
              onChange={handleChange}
              className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent"
            />
          </div>
        </div>

        {/* 2. Typography Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Type className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800">Typography (Font)</label>
              <span className="text-xs text-slate-500">The primary font family for the menu</span>
            </div>
          </div>
          <select 
            name="font_family"
            value={theme.font_family}
            onChange={handleChange}
            className="p-2 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-orange-500 w-full md:w-48 font-medium text-slate-700"
          >
            {fontOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.name}</option>
            ))}
          </select>
        </div>

        {/* 3. Button Style Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <MousePointerSquareDashed className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800">Button Sharpness</label>
              <span className="text-xs text-slate-500">Controls the border-radius of UI elements</span>
            </div>
          </div>
          <select 
            name="button_style"
            value={theme.button_style}
            onChange={handleChange}
            className="p-2 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-orange-500 w-full md:w-48 font-medium text-slate-700"
          >
            {buttonOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Footer / Action */}
      <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
        <div>
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
              Theme synced successfully!
            </span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'Syncing Theme...' : 'Save & Apply Theme'}
        </button>
      </div>
    </div>
  );
};

export default ThemeCustomizer;