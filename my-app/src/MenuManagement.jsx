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
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryText, setNewCategoryText] = useState("");
  
  const [newDish, setNewDish] = useState({ 
    name: '', 
    price: '', 
    category_id: '', 
    description: '', 
    paired_items: [],
    is_available: true 
  });

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
    const { data } = await supabase
      .from('subcategories')
      .select('*')
      .eq('restaurant_id', admin.id); 
      
    setCategories(data || []);
  }

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
      const admin = JSON.parse(localStorage.getItem('admin_user')); 

      let imageUrl = editingId ? dishes.find(d => d.id === editingId).image_url : '';

      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      let finalCategoryId = newDish.category_id;

      if (isAddingCategory && newCategoryText.trim() !== '') {
        const { data: newCat, error: catError } = await supabase
          .from('subcategories') 
          .insert([{ 
            name: newCategoryText.trim(),
            restaurant_id: admin.id 
          }])
          .select()
          .single();

        if (catError) throw catError;
        finalCategoryId = newCat.id; 
      }

      if (!finalCategoryId || finalCategoryId === '') {
        throw new Error("Please select a valid category or type a new one.");
      }

      const safePrice = Math.max(0, parseFloat(newDish.price) || 0);

      const dishData = {
        name: newDish.name,
        price: safePrice, 
        subcategory_id: finalCategoryId,
        description: newDish.description,
        image_url: imageUrl,
        paired_items: newDish.paired_items,
        is_available: newDish.is_available,
        restaurant_id: admin.id 
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
      {/* RESPONSIVE HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-12 gap-4 md:gap-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-slate-800 italic tracking-tighter">Menu Management</h1>
          <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] md:tracking-[0.3em] mt-2 italic flex items-center gap-2">
            <CheckCircle2 size={12} className="text-green-500" /> 
            {dishes.length} Delicacies currently in your vault
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full md:w-auto justify-center bg-orange-500 text-white px-8 md:px-10 py-4 md:py-5 rounded-xl md:rounded-[2rem] font-black text-xs flex items-center gap-3 shadow-xl md:shadow-2xl shadow-orange-500/20 active:scale-95 transition-all uppercase tracking-[0.2em]"
        >
          <Plus size={20} /> Add New Dish
        </button>
      </div>
      
      {/* --- CATEGORY MANAGER BOX --- */}
      <div className="mb-6 md:mb-8 p-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl">
        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Manage Categories (Click to Delete)</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm hover:border-red-300 transition-all group">
              <span className="text-[10px] md:text-xs font-bold text-slate-700">{cat.name}</span>
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

      {/* 🚨 RESPONSIVE DISHES TABLE SECTION 🚨 */}
      <div className="bg-white rounded-2xl md:rounded-[3.5rem] shadow-sm border border-slate-50 overflow-hidden shadow-xl md:shadow-2xl shadow-slate-100">
        {/* ADDED OVERFLOW-X-AUTO HERE */}
        <div className="overflow-x-auto custom-scrollbar w-full">
          <table className="w-full min-w-[700px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-50">
                <th className="p-6 md:p-10 text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] md:tracking-[0.3em]">The Delicacy</th>
                <th className="p-6 md:p-10 text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] md:tracking-[0.3em]">Category</th>
                <th className="p-6 md:p-10 text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] md:tracking-[0.3em]">Price</th>
                <th className="p-6 md:p-10 text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] md:tracking-[0.3em]">Availability</th>
                <th className="p-6 md:p-10 text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] md:tracking-[0.3em] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-10 md:p-20 text-center">
                    <Loader2 className="animate-spin mx-auto text-orange-500 mb-4" size={32} />
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Loading vault...</p>
                  </td>
                </tr>
              ) : dishes.map((dish) => (
                <tr key={dish.id} className={`hover:bg-slate-50/40 transition-all group ${!dish.is_available ? 'opacity-50' : ''}`}>
                  <td className="p-6 md:p-10 flex items-center gap-4 md:gap-8 max-w-[250px] md:max-w-none">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl md:rounded-[2rem] bg-slate-100 overflow-hidden border-2 md:border-4 border-white shadow-lg flex-shrink-0 group-hover:scale-110 transition-transform relative">
                      <img 
                        src={dish.image_url || `https://source.unsplash.com/200x200/?food,dish`} 
                        className="w-full h-full object-cover" 
                        alt={dish.name} 
                      />
                      {!dish.is_available && (
                        <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                          <XCircle size={20} className="text-white md:w-6 md:h-6" />
                        </div>
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-black text-slate-800 text-sm md:text-lg mb-0.5 md:mb-1 italic tracking-tight truncate">{dish.name}</p>
                      <p className="text-[9px] md:text-[11px] text-slate-400 font-bold tracking-tight italic line-clamp-1 max-w-[150px] md:max-w-xs">{dish.description || 'No description provided'}</p>
                    </div>
                  </td>
                  <td className="p-6 md:p-10">
                    <span className="text-[8px] md:text-[9px] font-black text-slate-400 bg-slate-50 px-3 py-1.5 md:px-5 md:py-2 rounded-full uppercase tracking-widest border border-slate-100">
                      {dish.subcategories?.name || 'General'}
                    </span>
                  </td>
                  <td className="p-6 md:p-10 font-black text-slate-900 italic text-lg md:text-xl">₹{dish.price}</td>
                  <td className="p-6 md:p-10">
                    <button 
                      onClick={() => toggleAvailability(dish.id, dish.is_available)}
                      className={`flex items-center justify-center gap-2 md:gap-3 px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[9px] uppercase tracking-[0.1em] md:tracking-[0.2em] transition-all border-2 w-28 md:w-auto ${
                        dish.is_available 
                        ? 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100' 
                        : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'
                      }`}
                    >
                      <Power size={12} className="md:w-3.5 md:h-3.5 flex-shrink-0" />
                      <span className="truncate">{dish.is_available ? 'In Stock' : 'Out'}</span>
                    </button>
                  </td>
                  <td className="p-6 md:p-10">
                    <div className="flex justify-center gap-4 md:gap-8 text-slate-200">
                      <button 
                        onClick={() => startEdit(dish)}
                        className="hover:text-blue-500 transition-all transform hover:scale-125 md:hover:scale-150"
                      >
                        <Edit2 size={18} className="md:w-[22px] md:h-[22px]" />
                      </button>
                      <button 
                        onClick={() => deleteDish(dish.id)}
                        className="hover:text-red-500 transition-all transform hover:scale-125 md:hover:scale-150"
                      >
                        <Trash2 size={18} className="md:w-[22px] md:h-[22px]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🚨 CREATE/EDIT MODAL SECTION (Responsive Size) 🚨 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-[2rem] md:rounded-[4rem] p-6 md:p-12 shadow-2xl relative my-8 md:my-auto max-h-[90vh] overflow-y-auto custom-scrollbar border border-white/20">
            <button 
              onClick={resetForm} 
              className="absolute top-4 right-4 md:top-10 md:right-10 text-slate-300 hover:text-slate-900 transition-colors bg-white/50 rounded-full p-2 md:p-0"
            >
              <X size={24} className="md:w-8 md:h-8" />
            </button>
            
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-6 md:mb-10 italic tracking-tighter pr-8">
              {editingId ? 'Refine Delicacy' : 'Craft New Delicacy'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                {/* Image Upload Area */}
                <div className="space-y-3 md:space-y-4">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em] ml-2">Visual Showcase</label>
                  <div className="relative group">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className={`aspect-[4/3] md:aspect-square border-4 border-dashed rounded-2xl md:rounded-[3rem] flex flex-col items-center justify-center transition-all ${
                      imageFile ? 'border-orange-500 bg-orange-50' : 'border-slate-100 bg-slate-50 group-hover:border-slate-300'
                    }`}>
                      {imageFile ? (
                        <CheckCircle2 className="text-orange-500 mb-2 md:mb-4" size={36} />
                      ) : (
                        <UploadCloud className="text-slate-200 mb-2 md:mb-4" size={36} />
                      )}
                      <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest text-center px-4 md:px-6">
                        {imageFile ? imageFile.name : 'Drop high-res image here'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Info Fields Area */}
                <div className="space-y-4 md:space-y-6">
                  <div>
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em] ml-2">Dish Name</label>
                    <input 
                      required 
                      className="w-full bg-slate-50 border-none rounded-xl md:rounded-[1.5rem] p-4 md:p-5 mt-2 font-black italic text-slate-800 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none text-sm md:text-base" 
                      value={newDish.name} 
                      onChange={e => setNewDish({...newDish, name: e.target.value})} 
                    />
                  </div>

                  <div>
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em] ml-2">Price Value (₹)</label>
                    <input
                      required
                      type="number"
                      min="0" 
                      onKeyDown={(e) => {
                        if (e.key === '-' || e.key === 'e') e.preventDefault(); 
                      }}
                      className="w-full bg-slate-50 border-none rounded-xl md:rounded-[1.5rem] p-4 md:p-5 mt-2 font-black italic text-slate-800 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none text-sm md:text-base"
                      value={newDish.price}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val >= 0 || val === "") {
                          setNewDish({...newDish, price: val});
                        }
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em] ml-2">Flavor Collection</label>
                    {!isAddingCategory ? (
                      <select
                        className="w-full bg-slate-50 border-none rounded-xl md:rounded-[1.5rem] p-4 md:p-5 mt-2 font-black italic text-slate-800 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none appearance-none cursor-pointer text-sm md:text-base"
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
                      <div className="flex flex-col sm:flex-row gap-2 mt-2 animate-in fade-in slide-in-from-right-2">
                        <input
                          type="text"
                          placeholder="Type new category name..."
                          className="w-full sm:flex-1 bg-slate-50 border-none rounded-xl md:rounded-[1.5rem] p-4 md:p-5 font-black italic text-slate-800 focus:ring-4 focus:ring-orange-500/10 outline-none text-sm md:text-base"
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
                          className="bg-slate-200 text-slate-600 p-4 md:px-6 md:py-0 rounded-xl md:rounded-[1.5rem] font-black text-xs hover:bg-slate-300 transition-all w-full sm:w-auto"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em] ml-2">The Story (Description)</label>
                <textarea 
                  className="w-full bg-slate-50 border-none rounded-2xl md:rounded-[2rem] p-4 md:p-6 mt-2 font-bold text-slate-600 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none h-24 md:h-32 resize-none text-sm md:text-base" 
                  value={newDish.description} 
                  onChange={e => setNewDish({...newDish, description: e.target.value})} 
                />
              </div>

              {/* PAIRED ITEMS SELECTOR */}
              <div className="bg-slate-50 p-4 md:p-8 rounded-2xl md:rounded-[3rem] border border-slate-100">
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em] flex items-center gap-2 md:gap-3 mb-4 md:mb-6 italic">
                  <Link size={14} className="text-orange-500 md:w-4 md:h-4" /> Curated Pairings
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 max-h-48 overflow-y-auto pr-2 md:pr-4 custom-scrollbar">
                  {dishes.filter(d => d.id !== editingId).map(dish => (
                    <button
                      key={dish.id}
                      type="button"
                      onClick={() => togglePairing(dish.id)}
                      className={`p-3 md:p-4 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-tight text-left transition-all border-2 truncate ${
                        newDish.paired_items.includes(dish.id) 
                        ? 'border-orange-500 bg-white text-orange-600 shadow-md shadow-orange-500/10' 
                        : 'border-white bg-white text-slate-300 hover:border-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        {newDish.paired_items.includes(dish.id) ? '✓' : '+'} {dish.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={actionLoading}
                className="w-full bg-slate-900 text-white py-5 md:py-7 rounded-xl md:rounded-[2.5rem] font-black text-xs md:text-sm uppercase tracking-[0.2em] md:tracking-[0.3em] shadow-xl md:shadow-2xl shadow-slate-900/20 active:scale-95 transition-all flex justify-center items-center gap-3 md:gap-4"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} /> Committing...
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

const XCircle = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);

export default MenuManagement;