import React, { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { supabase } from './supabase';
import { 
  ShoppingBag, 
  IndianRupee, 
  TrendingUp, 
  Loader2, 
  QrCode, 
  MousePointerClick, 
  Percent 
} from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    scans: 0,
    conversion: 0
  });
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });

  const handleLogout = async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/admin-login'; 
    } catch (error) {
      console.error("Error logging out:", error.message);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  async function fetchAnalyticsData() {
    setLoading(true);
    try {
      const savedUser = JSON.parse(localStorage.getItem('admin_user'));
      if (!savedUser) {
        window.location.href = '/admin-login'; 
        return;
      }
      const restId = savedUser.id; 

      const now = new Date();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStartISO = todayStart.toISOString();
      const todayDateStr = now.toLocaleDateString('en-CA');

      const { data: todayOrders } = await supabase
        .from('orders')
        .select('total_bill, status')
        .gte('created_at', todayStartISO)
        .eq('restaurant_id', restId); 

      const { data: todayScans } = await supabase
        .from('qr_scans')
        .select('id')
        .eq('date', todayDateStr)
        .eq('restaurant_id', restId); 

      // 🚨 THE FIX: Count all incoming orders towards revenue immediately
      const totalRevenue = (todayOrders || [])
        .reduce((sum, order) => sum + (Number(order?.total_bill) || 0), 0);      
      
      const orderCount = todayOrders?.length || 0;
      const scanCount = todayScans?.length || 0;
      const convRate = scanCount > 0 ? ((orderCount / scanCount) * 100).toFixed(1) : 0;

      setStats({
        revenue: totalRevenue,
        orders: orderCount,
        scans: scanCount,
        conversion: convRate
      });

      const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toLocaleDateString('en-US', { weekday: 'short' });
      }).reverse();

      setChartData({
        labels: last7Days,
        datasets: [
          {
            label: 'QR Scans',
            data: [0, 0, 0, scanCount, 0, 0, 0], 
            backgroundColor: '#e2e8f0',
            borderRadius: 8,
          },
          {
            label: 'Orders',
            data: [0, 0, 0, orderCount, 0, 0, 0],
            backgroundColor: '#f97316',
            borderRadius: 8,
          }
        ]
      });

    } catch (err) {
      console.error("Analytics Error:", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout>
      {/* RESPONSIVE HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-10 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 italic tracking-tight uppercase">Performance Bridge</h1>
          <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] md:tracking-[0.3em] mt-1 italic">Real-time Conversion Analytics</p>
        </div>
        <div className="flex gap-3 md:gap-4 w-full md:w-auto">
          <button onClick={fetchAnalyticsData} className="flex-1 md:flex-none p-3 md:p-4 flex justify-center bg-white border border-slate-100 rounded-2xl md:rounded-3xl shadow-sm hover:shadow-md transition-all">
            {loading ? <Loader2 className="animate-spin text-orange-500" size={20} /> : <TrendingUp className="text-orange-500" size={20} />}
          </button>
          <button onClick={handleLogout} className="flex-1 md:flex-none p-3 md:p-4 bg-red-50 text-red-500 font-bold border border-red-100 rounded-2xl md:rounded-3xl shadow-sm hover:bg-red-100 transition-all text-xs">
            Logout
          </button>
        </div>
      </div>

      {/* PRIMARY STATS GRID (Responsive Columns) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-10">
        <StatCard title="Total Revenue" value={`₹${stats?.revenue || 0}`} icon={<IndianRupee size={20} className="md:w-6 md:h-6" />} color="text-green-600" bg="bg-green-50" loading={loading} />
        <StatCard title="QR Scans" value={stats?.scans || 0} icon={<QrCode size={20} className="md:w-6 md:h-6" />} color="text-blue-600" bg="bg-blue-50" loading={loading} />
        <StatCard title="Orders" value={stats?.orders || 0} icon={<ShoppingBag size={20} className="md:w-6 md:h-6" />} color="text-orange-600" bg="bg-orange-50" loading={loading} />
        <StatCard title="Conversion" value={`${stats?.conversion || 0}%`} icon={<Percent size={20} className="md:w-6 md:h-6" />} color="text-purple-600" bg="bg-purple-50" loading={loading} />
      </div>

      {/* CHARTS GRID (Responsive Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mb-10">
        <div className="lg:col-span-2 bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl shadow-slate-100 border border-slate-50">
          <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-[0.3em] mb-6 md:mb-10 italic">Weekly Traffic Flow</h3>
          {/* Adjusted height for mobile so chart isn't too squished */}
          <div className="h-[250px] md:h-[300px] w-full">
            {chartData.labels.length > 0 && (
              <Bar 
                data={chartData} 
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false, 
                  plugins: { legend: { position: 'bottom', labels: { font: { weight: 'bold', size: 10 } } } },
                  scales: { y: { grid: { display: false } }, x: { grid: { display: false } } }
                }} 
              />
            )}
          </div>
        </div>

        {/* FUNNEL DISPLAY */}
        <div className="bg-slate-900 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 text-white flex flex-col justify-center relative overflow-hidden">
           <div className="relative z-10">
              <h3 className="text-orange-400 font-black uppercase text-[10px] tracking-widest mb-6">Customer Funnel</h3>
              <div className="space-y-6 md:space-y-8">
                <div>
                  <p className="text-slate-400 text-[9px] font-black uppercase mb-1">Traffic (Scans)</p>
                  <p className="text-2xl md:text-3xl font-black italic">{loading ? '...' : stats?.scans}</p>
                </div>
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full transition-all duration-1000" style={{ width: `${stats?.conversion || 0}%` }}></div>
                </div>
                <div>
                  <p className="text-slate-400 text-[9px] font-black uppercase mb-1">Orders Placed</p>
                  <p className="text-2xl md:text-3xl font-black italic">{loading ? '...' : stats?.orders}</p>
                </div>
              </div>
           </div>
           <MousePointerClick className="absolute -bottom-10 -right-10 text-white/5 w-32 h-32 md:w-48 md:h-48" />
        </div>
      </div>
    </AdminLayout>
  );
};

// Fixed StatCard with Responsive text
const StatCard = ({ title, value, icon, color, bg, loading }) => (
  <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-slate-50 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-5 transition-all">
    <div className={`${bg} ${color} p-3 md:p-4 rounded-xl md:rounded-2xl`}>{icon}</div>
    <div>
      <p className="text-[8px] md:text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">{title}</p>
      <div className="text-lg md:text-xl font-black text-slate-800 italic truncate">
        {loading ? (
          <div className="h-5 md:h-6 w-12 bg-slate-100 animate-pulse rounded-md"></div>
        ) : (
          value
        )}
      </div>
    </div>
  </div>
);

export default AdminDashboard;