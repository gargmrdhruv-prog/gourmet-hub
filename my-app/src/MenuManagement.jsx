import React, { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { supabase } from './supabase';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Loader2, 
  UploadCloud, 
  Link, 
  Power,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';

const MenuManagement = () => {
  // --- ALL CORE STATES ---
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryText, setNewCategoryText] = useState("");
  
  // Detailed Form State including is_available
  const [newDish, setNewDish] = useState({ 
    name: '', 
    price: '', 
    category_id: '', 
    description: '', 
    paired_items: [],
    is_available: true 
  });

  // --- INITIAL DATA FETCHING ---
  useEffect(() => {
    fetchDishes();
    fetchCategories();
  }, []);

  async function fetchDishes() {
    setLoading(true);
    try {
      // 🚨 FIX 1: Fetching Locked to Admin ID
      const admin = JSON.parse(localStorage.getItem('admin_user')); 

      const { data, error } = await supabase
        .from('dishes')
        .select('*, subcategories(name, id)')
        .eq('restaurant_id', admin.id) // 🔒 Yahan lock lagaya
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
    // 🚨 Ye aapne pehle hi sahi kar diya tha
    const admin = JSON.parse(localStorage.getItem('admin_user')); 
    
    const { data } = await supabase
      .from('subcategories')
      .select('*')
      .eq('restaurant_id', admin.id); 
      
    setCategories(data || []);
  }

  // --- AVAILABILITY TOGGLE LOGIC ---
  async function toggleAvailability(id, currentStatus) {
    const newStatus = !currentStatus;
    setDishes(prev => prev.map(d => d.id === id ? { ...d, is_available: newStatus } : d));
    
    try {
      const { error } = await supabase
        .from('dishes')
        .update({ is_available: newStatus })
        .eq('id', id);
      
      if (error) throw error;
    } catch (err) {
      alert("Status update failed. Reverting changes.");
      fetchDishes(); 
    }
  }

  // --- IMAGE UPLOAD LOGIC ---
  const uploadImage = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('Dishes_pics')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('Dishes_pics')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  // --- FORM HANDLERS ---
  const resetForm = () => {
    setNewDish({ 
      name: '', 
      price: '', 
      category_id: '', 
      description: '', 
      paired_items: [],
      is_available: true 
    });
    setEditingId(null);
    setImageFile(null);
    setIsModalOpen(false);
    setIsAddingCategory(false);
    setNewCategoryText("");
  };

  const startEdit = (dish) => {
    setEditingId(dish.id);
    setNewDish({
      name: dish.name,
      price: dish.price,
      category_id: dish.subcategory_id,
      description: dish.description,
      paired_items: dish.paired_items || [],
      is_available: dish.is_available ?? true
    });
    setIsModalOpen(true);
  };

  const togglePairing = (id) => {
    setNewDish(prev => ({
      ...prev,
      paired_items: prev.paired_items.includes(id) 
        ? prev.paired_items.filter(item => item !== id) 
        : [...prev.paired_items, id]
    }));
  };

  const deleteDish = async (id) => {
    if (window.confirm("Bhai, are you sure you want to remove this dish from the menu?")) {
      const { error } = await supabase.from('dishes').delete().eq('id', id);
      if (error) alert("Error deleting dish");
      else fetchDishes();
    }
  };

  const deleteCategory = async (categoryId, categoryName) => {
    if (!window.confirm(`Kya aap sach mein "${categoryName}" category ko delete karna chahte hain?`)) return;

    try {
      const { data: linkedDishes, error: checkError } = await supabase
        .from('dishes').select('id').eq('subcategory_id', categoryId);

      if (checkError) throw checkError;

      if (linkedDishes && linkedDishes.length > 0) {
        alert(`❌ Ise delete nahi kar sakte! Is category mein ${linkedDishes.length} dishes hain. Pehle un dishes ko delete ya change karein.`);
        return;
      }

      const { error: deleteError } = await supabase
        .from('subcategories').delete().eq('id', categoryId);

      if (deleteError) throw deleteError;

      fetchCategories(); 
      alert(`✅ "${categoryName}" category delete ho gayi!`);
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const admin = JSON.parse(localStorage.getItem('admin_user')); // 🚨 Admin info for inserting

      let imageUrl = editingId ? dishes.find(d => d.id === editingId).image_url : '';

      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      let finalCategoryId = newDish.category_id;

      if (isAddingCategory && newCategoryText.trim() !== '') {
        // 🚨 FIX 2: Nayi category create karte waqt 'restaurant_id' daalna zaroori hai
        const { data: newCat, error: catError } = await supabase
          .from('subcategories') 
          .insert([{ 
            name: newCategoryText.trim(),
            restaurant_id: admin.id // 🔒 Lock laga diya
          }])
          .select()
          .single();

        if (catError) throw catError;
        finalCategoryId = newCat.id; 
      }

      if (!finalCategoryId || finalCategoryId === '') {
        throw new Error("Please select a valid category or type a new one.");
      }

      const dishData = {
        name: newDish.name,
        price: parseFloat(newDish.price),
        subcategory_id: finalCategoryId,
        description: newDish.description,
        image_url: imageUrl,
        paired_items: newDish.paired_items,
        is_available: newDish.is_available,
        restaurant_id: admin.id // 🚨 FIX 3: Nayi dish create/update karte waqt 'restaurant_id'
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
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800 italic tracking-tighter">Menu Management</h1>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-2 italic flex items-center gap-2">
            <CheckCircle2 size={12} className="text-green-500" /> 
            {dishes.length} Delicacies currently in your vault
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-orange-500 text-white px-10 py-5 rounded-[2rem] font-black text-xs flex items-center gap-3 shadow-2xl shadow-orange-500/20 active:scale-95 transition-all uppercase tracking-[0.2em]"
        >
          <Plus size={20} /> Add New Dish
        </button>
      </div>
      
      {/* --- CATEGORY MANAGER BOX --- */}
      <div className="mb-8 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Manage Categories (Click to Delete)</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm hover:border-red-300 transition-all group">
              <span className="text-xs font-bold text-slate-700">{cat.name}</span>
              <button 
                onClick={() => deleteCategory(cat.id, cat.name)}
                className="text-slate-300 hover:text-red-500 transition-colors"
                title="Delete Category"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* DISHES TABLE SECTION */}
      <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-50 overflow-hidden shadow-2xl shadow-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-50">
                <th className="p-10 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">The Delicacy</th>
                <th className="p-10 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Category</th>
                <th className="p-10 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Price</th>
                <th className="p-10 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Availability</th>
                <th className="p-10 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-20 text-center">
                    <Loader2 className="animate-spin mx-auto text-orange-500 mb-4" size={32} />
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Loading vault...</p>
                  </td>
                </tr>
              ) : dishes.map((dish) => (
                <tr key={dish.id} className={`hover:bg-slate-50/40 transition-all group ${!dish.is_available ? 'opacity-50' : ''}`}>
                  <td className="p-10 flex items-center gap-8">
                    <div className="w-20 h-20 rounded-[2rem] bg-slate-100 overflow-hidden border-4 border-white shadow-xl flex-shrink-0 group-hover:scale-110 transition-transform relative">
                      <img 
                        src={dish.image_url || `https://source.unsplash.com/200x200/?food,dish`} 
                        className="w-full h-full object-cover" 
                        alt={dish.name} 
                      />
                      {!dish.is_available && (
                        <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                          <XCircle size={24} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-lg mb-1 italic tracking-tight">{dish.name}</p>
                      <p className="text-[11px] text-slate-400 font-bold tracking-tight italic line-clamp-1 max-w-xs">{dish.description || 'No description provided'}</p>
                    </div>
                  </td>
                  <td className="p-10">
                    <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-5 py-2 rounded-full uppercase tracking-widest border border-slate-100">
                      {dish.subcategories?.name || 'General'}
                    </span>
                  </td>
                  <td className="p-10 font-black text-slate-900 italic text-xl">₹{dish.price}</td>
                  <td className="p-10">
                    <button 
                      onClick={() => toggleAvailability(dish.id, dish.is_available)}
                      className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] transition-all border-2 ${
                        dish.is_available 
                        ? 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100' 
                        : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'
                      }`}
                    >
                      <Power size={14} />
                      {dish.is_available ? 'In Stock' : 'Out of Stock'}
                    </button>
                  </td>
                  <td className="p-10">
                    <div className="flex justify-center gap-8 text-slate-200">
                      <button 
                        onClick={() => startEdit(dish)}
                        className="hover:text-blue-500 transition-all transform hover:scale-150"
                      >
                        <Edit2 size={22} />
                      </button>
                      <button 
                        onClick={() => deleteDish(dish.id)}
                        className="hover:text-red-500 transition-all transform hover:scale-150"
                      >
                        <Trash2 size={22} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE/EDIT MODAL SECTION */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-3xl rounded-[4rem] p-12 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar border border-white/20">
            <button 
              onClick={resetForm} 
              className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 transition-colors"
            >
              <X size={32} />
            </button>
            
            <h2 className="text-3xl font-black text-slate-900 mb-10 italic tracking-tighter">
              {editingId ? 'Refine Delicacy' : 'Craft New Delicacy'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Image Upload Area */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Visual Showcase</label>
                  <div className="relative group">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className={`aspect-square border-4 border-dashed rounded-[3rem] flex flex-col items-center justify-center transition-all ${
                      imageFile ? 'border-orange-500 bg-orange-50' : 'border-slate-100 bg-slate-50 group-hover:border-slate-300'
                    }`}>
                      {imageFile ? (
                        <CheckCircle2 className="text-orange-500 mb-4" size={48} />
                      ) : (
                        <UploadCloud className="text-slate-200 mb-4" size={48} />
                      )}
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center px-6">
                        {imageFile ? imageFile.name : 'Drop high-res image here'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Info Fields Area */}
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Dish Name</label>
                    <input 
                      required 
                      className="w-full bg-slate-50 border-none rounded-[1.5rem] p-5 mt-2 font-black italic text-slate-800 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none" 
                      value={newDish.name} 
                      onChange={e => setNewDish({...newDish, name: e.target.value})} 
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Price Value (₹)</label>
                    <input 
                      required 
                      type="number" 
                      className="w-full bg-slate-50 border-none rounded-[1.5rem] p-5 mt-2 font-black italic text-slate-800 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none" 
                      value={newDish.price} 
                      onChange={e => setNewDish({...newDish, price: e.target.value})} 
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Flavor Collection</label>
                    {/* NAYA HYBRID CATEGORY SELECTOR */}
      {!isAddingCategory ? (
        <select
          className="w-full bg-slate-50 border-none rounded-[1.5rem] p-5 mt-2 font-black italic text-slate-800 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none appearance-none cursor-pointer"
          value={newDish.category_id}
          onChange={(e) => {
            if (e.target.value === 'ADD_NEW') {
              setIsAddingCategory(true);
              setNewDish({ ...newDish, category_id: '' });
            } else {
              setNewDish({ ...newDish, category_id: e.target.value });
            }
          }}
          required={!isAddingCategory}
        >
          <option value="">Choose category...</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
          <option value="ADD_NEW" className="font-bold text-orange-500 bg-orange-50">
            + Add New Category
          </option>
        </select>
      ) : (
        <div className="flex gap-2 mt-2 animate-in fade-in slide-in-from-right-2">
          <input
            type="text"
            placeholder="Type new category name..."
            className="w-full bg-slate-50 border-none rounded-[1.5rem] p-5 font-black italic text-slate-800 focus:ring-4 focus:ring-orange-500/10 outline-none"
            value={newCategoryText}
            onChange={(e) => setNewCategoryText(e.target.value)}
            required={isAddingCategory}
            autoFocus
          />
          <button
            type="button"
            onClick={() => {
              setIsAddingCategory(false);
              setNewCategoryText("");
            }}
            className="bg-slate-200 text-slate-600 px-6 rounded-[1.5rem] font-black text-xs hover:bg-slate-300 transition-all"
          >
            Cancel
          </button>
        </div>
      )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">The Story (Description)</label>
                <textarea 
                  className="w-full bg-slate-50 border-none rounded-[2rem] p-6 mt-2 font-bold text-slate-600 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none h-32 resize-none" 
                  value={newDish.description} 
                  onChange={e => setNewDish({...newDish, description: e.target.value})} 
                />
              </div>

              {/* PAIRED ITEMS SELECTOR */}
              <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3 mb-6 italic">
                  <Link size={16} className="text-orange-500" /> Curated Pairings (Recommendations)
                </label>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto pr-4 custom-scrollbar">
                  {dishes.filter(d => d.id !== editingId).map(dish => (
                    <button
                      key={dish.id}
                      type="button"
                      onClick={() => togglePairing(dish.id)}
                      className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-tight text-left transition-all border-2 ${
                        newDish.paired_items.includes(dish.id) 
                        ? 'border-orange-500 bg-white text-orange-600 shadow-xl shadow-orange-500/10' 
                        : 'border-white bg-white text-slate-300 hover:border-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {newDish.paired_items.includes(dish.id) ? '✓' : '+'} {dish.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* FINAL ACTION BUTTON */}
              <button 
                type="submit" 
                disabled={actionLoading}
                className="w-full bg-slate-900 text-white py-7 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-slate-900/20 active:scale-95 transition-all flex justify-center items-center gap-4"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="animate-spin" /> Committing Changes...
                  </>
                ) : (
                  editingId ? 'Update Masterpiece' : 'Finalize Delicacy'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

// Custom circle-x icon helper
const XCircle = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);

export default MenuManagement;