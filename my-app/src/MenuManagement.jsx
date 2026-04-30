import React, { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { supabase } from './supabase';
import { 
  Plus, Edit2, Trash2, X, Loader2, UploadCloud, Link, CheckCircle2, Star
} from 'lucide-react';

const MenuManagement = () => {
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryText, setNewCategoryText] = useState("");
  
  const [currentVariant, setCurrentVariant] = useState({ name: '', price: '' });

  const [newDish, setNewDish] = useState({ 
    name: '', price: '', category_id: '', description: '', paired_items: [], is_available: true,
    rating: '', order_count: '', tags: [], has_variants: false, variants: []
  });

  const availableTags = ['Veg 🟢', 'Non-Veg 🔴', 'Bestseller ⭐', 'Spicy 🌶️', "Chef's Special 👨‍🍳", 'Sweet 🍯'];

  useEffect(() => {
    fetchDishes();
    fetchCategories();
  }, []);

  async function fetchDishes() {
    setLoading(true);
    try {
      const admin = JSON.parse(localStorage.getItem('admin_user')); 
      const { data, error } = await supabase
        .from('dishes')
        .select('*, subcategories(name, id)')
        .eq('restaurant_id', admin.id) 
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDishes(data || []);
    } catch (err) {
      console.error("Fetch Error:", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    const admin = JSON.parse(localStorage.getItem('admin_user')); 
    const { data } = await supabase.from('subcategories').select('*').eq('restaurant_id', admin.id); 
    setCategories(data || []);
  }

  async function toggleAvailability(id, currentStatus) {
    const newStatus = !currentStatus;
    setDishes(prev => prev.map(d => d.id === id ? { ...d, is_available: newStatus } : d));
    try {
      const { error } = await supabase.from('dishes').update({ is_available: newStatus }).eq('id', id);
      if (error) throw error;
    } catch (err) {
      alert("Status update failed. Reverting changes.");
      fetchDishes(); 
    }
  }

  const uploadImage = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('Dishes_pics').upload(fileName, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('Dishes_pics').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const resetForm = () => {
    setNewDish({ 
      name: '', price: '', category_id: '', description: '', paired_items: [], is_available: true,
      rating: '', order_count: '', tags: [], has_variants: false, variants: []
    });
    setEditingId(null);
    setImageFile(null);
    setIsModalOpen(false);
    setIsAddingCategory(false);
    setNewCategoryText("");
    setCurrentVariant({ name: '', price: '' });
  };

  const startEdit = (dish) => {
    setEditingId(dish.id);
    const hasVars = dish.variants && dish.variants.length > 0;
    
    setNewDish({
      name: dish.name,
      price: dish.price,
      category_id: dish.subcategory_id,
      description: dish.description,
      paired_items: dish.paired_items || [],
      is_available: dish.is_available ?? true,
      rating: dish.rating === null ? '' : dish.rating, 
      order_count: dish.order_count === null ? '' : dish.order_count,
      tags: dish.tags || [],
      has_variants: hasVars,
      variants: hasVars ? dish.variants : []
    });
    setIsModalOpen(true);
  };

  const togglePairing = (id) => {
    setNewDish(prev => ({
      ...prev,
      paired_items: prev.paired_items.includes(id) ? prev.paired_items.filter(item => item !== id) : [...prev.paired_items, id]
    }));
  };

  const toggleTag = (tag) => {
    setNewDish(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag]
    }));
  };

  const deleteDish = async (id) => {
    if (window.confirm("Are you sure you want to remove this dish from the menu?")) {
      const { error } = await supabase.from('dishes').delete().eq('id', id);
      if (error) alert("Error deleting dish");
      else fetchDishes();
    }
  };

  const deleteCategory = async (categoryId, categoryName) => {
    if (!window.confirm(`Are you sure you want to delete "${categoryName}"?`)) return;
    try {
      const { data: linkedDishes, error: checkError } = await supabase.from('dishes').select('id').eq('subcategory_id', categoryId);
      if (checkError) throw checkError;
      if (linkedDishes && linkedDishes.length > 0) return alert(`❌ Cannot delete! There are ${linkedDishes.length} dishes in this category.`);
      const { error: deleteError } = await supabase.from('subcategories').delete().eq('id', categoryId);
      if (deleteError) throw deleteError;
      fetchCategories(); 
      alert(`✅ "${categoryName}" deleted!`);
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleAddVariant = () => {
    if (currentVariant.name && currentVariant.price) {
      setNewDish({
        ...newDish,
        variants: [...(newDish.variants || []), { name: currentVariant.name, price: Number(currentVariant.price) }]
      });
      setCurrentVariant({ name: '', price: '' }); 
    }
  };

  const handleRemoveVariant = (indexToRemove) => {
    setNewDish({
      ...newDish,
      variants: newDish.variants.filter((_, index) => index !== indexToRemove)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const admin = JSON.parse(localStorage.getItem('admin_user')); 
      let imageUrl = editingId ? dishes.find(d => d.id === editingId).image_url : '';
      if (imageFile) imageUrl = await uploadImage(imageFile);

      let finalCategoryId = newDish.category_id;
      if (isAddingCategory && newCategoryText.trim() !== '') {
        const { data: newCat, error: catError } = await supabase.from('subcategories').insert([{ name: newCategoryText.trim(), restaurant_id: admin.id }]).select().single();
        if (catError) throw catError;
        finalCategoryId = newCat.id; 
      }
      if (!finalCategoryId || finalCategoryId === '') throw new Error("Please select a valid category or type a new one.");

      let finalVariants = [];
      let finalPrice = Math.max(0, parseFloat(newDish.price) || 0); // 🚨 Base Price hamesha pick hoga

      if (newDish.has_variants && newDish.variants && newDish.variants.length > 0) {
        finalVariants = newDish.variants.map(v => ({ name: v.name, price: parseFloat(v.price) }));
      } else if (newDish.has_variants && newDish.variants.length === 0) {
        throw new Error("Please add at least one variant or uncheck 'Has Variants'.");
      }

      const safeRating = newDish.rating === '' ? null : Math.min(5, Math.max(1, parseFloat(newDish.rating)));
      const safeOrderCount = newDish.order_count === '' ? null : Math.max(0, parseInt(newDish.order_count));

      const dishData = {
        name: newDish.name,
        price: finalPrice, 
        subcategory_id: finalCategoryId,
        description: newDish.description,
        image_url: imageUrl,
        paired_items: newDish.paired_items,
        is_available: newDish.is_available,
        restaurant_id: admin.id,
        rating: safeRating,
        order_count: safeOrderCount,
        tags: newDish.tags,
        variants: finalVariants
      };

      if (editingId) {
        const { error } = await supabase.from('dishes').update(dishData).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('dishes').insert([dishData]);
        if (error) throw error;
      }

      resetForm();
      fetchDishes();
      fetchCategories(); 
      
    } catch (error) {
      console.error(error);
      alert("Process Error: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-12 gap-4 md:gap-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-slate-800 italic tracking-tighter">Menu Management</h1>
          <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] md:tracking-[0.3em] mt-2 italic flex items-center gap-2">
            <CheckCircle2 size={12} className="text-green-500" /> 
            {dishes.length} Delicacies currently in your vault
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="w-full md:w-auto justify-center bg-orange-500 text-white px-8 md:px-10 py-4 md:py-5 rounded-xl md:rounded-[2rem] font-black text-xs flex items-center gap-3 shadow-xl md:shadow-2xl shadow-orange-500/20 active:scale-95 transition-all uppercase tracking-[0.2em]">
          <Plus size={20} /> Add New Dish
        </button>
      </div>
      
      <div className="mb-6 md:mb-8 p-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl">
        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Manage Categories (Click to Delete)</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm hover:border-red-300 transition-all group">
              <span className="text-[10px] md:text-xs font-bold text-slate-700">{cat.name}</span>
              <button onClick={() => deleteCategory(cat.id, cat.name)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl md:rounded-[3.5rem] shadow-sm border border-slate-50 overflow-hidden shadow-xl md:shadow-2xl shadow-slate-100">
        <div className="overflow-x-auto custom-scrollbar w-full">
          <table className="w-full min-w-[800px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-50">
                <th className="p-6 md:p-10 text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] md:tracking-[0.3em]">The Delicacy</th>
                <th className="p-6 md:p-10 text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] md:tracking-[0.3em]">Category & Tags</th>
                <th className="p-6 md:p-10 text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] md:tracking-[0.3em]">Price / Variants</th>
                <th className="p-6 md:p-10 text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] md:tracking-[0.3em]">Availability</th>
                <th className="p-6 md:p-10 text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] md:tracking-[0.3em] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="5" className="p-10 md:p-20 text-center"><Loader2 className="animate-spin mx-auto text-orange-500 mb-4" size={32} /></td></tr>
              ) : dishes.map((dish) => (
                <tr key={dish.id} className={`hover:bg-slate-50/40 transition-all group ${!dish.is_available ? 'opacity-50' : ''}`}>
                  <td className="p-6 md:p-10 flex items-center gap-4 md:gap-6 max-w-[250px] md:max-w-none">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl md:rounded-[2rem] bg-slate-100 overflow-hidden border-2 md:border-4 border-white shadow-lg flex-shrink-0 relative">
                      <img src={dish.image_url || `https://source.unsplash.com/200x200/?food,dish`} className="w-full h-full object-cover" alt={dish.name} />
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-black text-slate-800 text-sm md:text-lg mb-0.5 md:mb-1 italic tracking-tight truncate">{dish.name}</p>
                      
                      {(dish.rating || dish.order_count) && (
                         <p className="text-[9px] md:text-[11px] text-orange-500 font-bold tracking-widest uppercase flex items-center gap-1 mt-1">
                           {dish.rating && <><Star size={10} className="fill-orange-500"/> {dish.rating}</>}
                           {dish.rating && dish.order_count && " • "}
                           {dish.order_count && `${dish.order_count} Orders`}
                         </p>
                      )}
                    </div>
                  </td>
                  <td className="p-6 md:p-10">
                    <span className="text-[8px] md:text-[9px] font-black text-slate-400 bg-slate-50 px-3 py-1.5 md:px-5 md:py-2 rounded-full uppercase tracking-widest border border-slate-100 block w-fit mb-2">
                      {dish.subcategories?.name || 'General'}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {dish.tags?.map((t, i) => <span key={i} className="text-[8px] font-bold text-slate-500 border border-slate-200 px-2 py-0.5 rounded-md">{t.split(' ')[0]}</span>)}
                    </div>
                  </td>
                  <td className="p-6 md:p-10">
                    {dish.variants && dish.variants.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Base</span>
                        <span className="font-black text-slate-900 italic text-lg md:text-xl">₹{dish.price}</span>
                        <span className="text-[9px] font-bold text-orange-500 uppercase bg-orange-50 px-2 py-1 rounded w-fit border border-orange-100">
                          {dish.variants.length} Add-ons
                        </span>
                      </div>
                    ) : (
                      <span className="font-black text-slate-900 italic text-lg md:text-xl">₹{dish.price}</span>
                    )}
                  </td>
                  <td className="p-6 md:p-10">
                    <button onClick={() => toggleAvailability(dish.id, dish.is_available)} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-black text-[8px] uppercase tracking-[0.1em] transition-all border-2 w-24 ${dish.is_available ? 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100' : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'}`}>
                      <span className="truncate">{dish.is_available ? 'In Stock' : 'Out'}</span>
                    </button>
                  </td>
                  <td className="p-6 md:p-10">
                    <div className="flex justify-center gap-4 text-slate-200">
                      <button onClick={() => startEdit(dish)} className="hover:text-blue-500 transition-all transform hover:scale-125"><Edit2 size={18} /></button>
                      <button onClick={() => deleteDish(dish.id)} className="hover:text-red-500 transition-all transform hover:scale-125"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-[2rem] md:rounded-[4rem] p-6 md:p-10 shadow-2xl relative my-8 md:my-auto max-h-[90vh] overflow-y-auto custom-scrollbar border border-white/20">
            <button onClick={resetForm} className="absolute top-4 right-4 md:top-8 md:right-8 text-slate-300 hover:text-slate-900 transition-colors bg-slate-50 rounded-full p-2"><X size={20} /></button>
            
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-6 italic tracking-tighter pr-8">
              {editingId ? 'Refine Delicacy' : 'Craft New Delicacy'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1 space-y-3">
                  <div className="relative group">
                    <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className={`aspect-square border-4 border-dashed rounded-2xl md:rounded-[2rem] flex flex-col items-center justify-center transition-all ${imageFile ? 'border-orange-500 bg-orange-50' : 'border-slate-100 bg-slate-50 group-hover:border-slate-300'}`}>
                      {imageFile ? <CheckCircle2 className="text-orange-500 mb-2" size={32} /> : <UploadCloud className="text-slate-200 mb-2" size={32} />}
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center px-4">{imageFile ? 'Image Selected' : 'Drop HD Image'}</p>
                    </div>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Dish Name *</label>
                      <input required className="w-full bg-slate-50 border-none rounded-xl p-4 mt-1 font-black italic text-slate-800 focus:ring-2 focus:ring-orange-500 outline-none text-sm" value={newDish.name} onChange={e => setNewDish({...newDish, name: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Category *</label>
                      {!isAddingCategory ? (
                        <select className="w-full bg-slate-50 border-none rounded-xl p-4 mt-1 font-black italic text-slate-800 focus:ring-2 focus:ring-orange-500 outline-none appearance-none cursor-pointer text-sm" value={newDish.category_id} onChange={(e) => { if (e.target.value === 'ADD_NEW') { setIsAddingCategory(true); setNewDish({ ...newDish, category_id: '' }); } else { setNewDish({ ...newDish, category_id: e.target.value }); } }} required={!isAddingCategory}>
                          <option value="">Choose category...</option>
                          {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                          <option value="ADD_NEW" className="font-bold text-orange-500 bg-orange-50">+ Add Category</option>
                        </select>
                      ) : (
                        <div className="flex gap-2 mt-1">
                          <input type="text" placeholder="New category..." className="w-full bg-slate-50 border-none rounded-xl p-4 font-black italic text-slate-800 outline-none text-sm" value={newCategoryText} onChange={(e) => setNewCategoryText(e.target.value)} required={isAddingCategory} autoFocus />
                          <button type="button" onClick={() => {setIsAddingCategory(false); setNewCategoryText("");}} className="bg-slate-200 text-slate-600 px-4 rounded-xl font-black text-xs hover:bg-slate-300">Cancel</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Description</label>
                    <textarea className="w-full bg-slate-50 border-none rounded-2xl p-4 mt-1 font-bold text-slate-600 focus:ring-2 focus:ring-orange-500 outline-none h-20 resize-none text-sm" value={newDish.description} onChange={e => setNewDish({...newDish, description: e.target.value})} placeholder="E.g. Stir-fried noodles with fresh vegetables..." />
                  </div>
                </div>
              </div>

              <div className="bg-orange-50/30 p-5 md:p-6 rounded-[2rem] border border-orange-100/50 space-y-6">
                <h3 className="text-xs font-black text-orange-600 uppercase tracking-widest flex items-center gap-2"><Star size={14}/> Marketing & Variants Settings</h3>
                
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">Highlight Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => (
                      <button type="button" key={tag} onClick={() => toggleTag(tag)} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${newDish.tags.includes(tag) ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20' : 'bg-white text-slate-400 border-slate-200 hover:border-orange-200'}`}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex gap-4">
                    <div className="flex-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 block">Rating (Optional)</label>
                      <input type="number" step="0.1" max="5" min="1" placeholder="e.g. 4.5" className="w-full bg-slate-50 rounded-xl p-3 font-black text-orange-500 outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-slate-300" value={newDish.rating} 
                        onChange={e => setNewDish({...newDish, rating: e.target.value})} 
                        onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }} 
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 block">Fake Orders (Opt)</label>
                      <input type="number" min="0" placeholder="e.g. 120" className="w-full bg-slate-50 rounded-xl p-3 font-black text-slate-800 outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-slate-300" 
                        value={newDish.order_count} 
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '' || parseInt(val) >= 0) {
                            setNewDish({...newDish, order_count: val});
                          }
                        }} 
                        onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }} 
                      />
                    </div>
                  </div>

                  {/* 🚨 UPDATED VARIANTS & PRICE SECTION */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    
                    {/* ALWAYS SHOW BASE PRICE */}
                    <div className="mb-4">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 block">Standard Base Price (₹) *</label>
                      <input type="number" min="0" required className="w-full bg-slate-50 rounded-xl p-3 font-black text-slate-800 outline-none focus:ring-2 focus:ring-orange-500" value={newDish.price} onChange={e => { const val = e.target.value; if (val >= 0 || val === "") setNewDish({...newDish, price: val}); }} />
                    </div>

                    <div className="flex items-center gap-2 mb-3 pt-4 border-t border-slate-100">
                      <input type="checkbox" id="variantsToggle" checked={newDish.has_variants} onChange={e => setNewDish({...newDish, has_variants: e.target.checked})} className="w-4 h-4 accent-orange-500 cursor-pointer" />
                      <label htmlFor="variantsToggle" className="text-[10px] font-black text-slate-800 uppercase tracking-widest cursor-pointer select-none">Add Variants / Customizations?</label>
                    </div>

                    {newDish.has_variants && (
                      <div className="animate-in fade-in zoom-in-95 mt-3">
                        <div className="flex gap-2 mb-3">
                          <input
                            type="text"
                            placeholder="e.g., Extra Cheese"
                            className="flex-1 bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500"
                            value={currentVariant.name}
                            onChange={(e) => setCurrentVariant({ ...currentVariant, name: e.target.value })}
                          />
                          <input
                            type="number"
                            min="0"
                            placeholder="Price (₹)"
                            className="w-28 bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500"
                            value={currentVariant.price}
                            onChange={(e) => setCurrentVariant({ ...currentVariant, price: e.target.value })}
                          />
                          <button
                            type="button"
                            onClick={handleAddVariant}
                            disabled={!currentVariant.name || !currentVariant.price}
                            className="bg-slate-900 text-white px-4 rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-black transition-all"
                          >
                            Add
                          </button>
                        </div>

                        {newDish.variants && newDish.variants.length > 0 && (
                          <div className="flex flex-col gap-2 mt-4 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Added Variants / Add-ons:</p>
                            {newDish.variants.map((variant, index) => (
                              <div key={index} className="flex justify-between items-center bg-slate-50 p-2.5 px-4 rounded-xl">
                                <span className="font-bold text-slate-700 text-sm">{variant.name}</span>
                                <div className="flex items-center gap-4">
                                  <span className="font-black text-slate-900 text-sm">₹{variant.price}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveVariant(index)}
                                    className="text-red-500 hover:bg-red-100 p-1.5 rounded-lg transition-all"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-100">
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-4 italic">
                  <Link size={14} className="text-orange-500" /> Curated Pairings
                </label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {dishes.filter(d => d.id !== editingId).map(dish => (
                    <button type="button" key={dish.id} onClick={() => togglePairing(dish.id)} className={`p-3 rounded-xl text-[9px] font-black uppercase tracking-tight text-left transition-all border-2 truncate ${newDish.paired_items.includes(dish.id) ? 'border-orange-500 bg-white text-orange-600 shadow-sm' : 'border-slate-200 bg-white text-slate-400 hover:border-orange-200'}`}>
                      <span className="flex items-center gap-2 truncate">{newDish.paired_items.includes(dish.id) ? '✓' : '+'} {dish.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={actionLoading} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] shadow-xl shadow-slate-900/20 active:scale-95 transition-all flex justify-center items-center gap-3">
                {actionLoading ? <><Loader2 className="animate-spin" size={18} /> Committing...</> : (editingId ? 'Update Masterpiece' : 'Finalize Delicacy')}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default MenuManagement;