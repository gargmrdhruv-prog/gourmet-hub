import React, { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { IndianRupee, ShoppingBag, QrCode, TrendingUp, Calendar as CalendarIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { supabase } from './supabase';

import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Title, Tooltip, Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Title, Tooltip, Legend);

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('today');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [activeTab, setActiveTab] = useState('revenue'); // revenue, orders, scans

  const [stats, setStats] = useState({ revenue: 0, orders: 0, scans: 0, growth: 0 });
  const [prevPeriodText, setPrevPeriodText] = useState('');
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });

  useEffect(() => {
    if (timeFilter !== 'custom' || (fromDate && toDate)) {
      fetchFilteredData();
    }
  }, [timeFilter, fromDate, toDate, activeTab]);

  // Date Formatting Helper
  const formatDate = (date) => date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

  const fetchFilteredData = async () => {
    setLoading(true);
    try {
      const admin = JSON.parse(localStorage.getItem('admin_user')); // 🚨 ADMIN ID FETCH KI
      if (!admin) return;

      let start, end;
      const now = new Date();
      
      if (timeFilter === 'custom') {
        start = new Date(fromDate); start.setHours(0,0,0,0);
        end = new Date(toDate); end.setHours(23,59,59,999);
      } else {
        start = new Date();
        if (timeFilter === 'today') start.setHours(0,0,0,0);
        else if (timeFilter === 'week') start.setDate(now.getDate() - 7);
        else if (timeFilter === 'month') start.setMonth(now.getMonth() - 1);
        end = now;
      }

      // Previous Period for Comparison
      const duration = end.getTime() - start.getTime();
      const prevStart = new Date(start.getTime() - duration - 1);
      const prevEnd = new Date(start.getTime() - 1);
      setPrevPeriodText(`${formatDate(prevStart)} - ${formatDate(prevEnd)}`);

      // 1. Fetch Orders (Current)
      const { data: currentOrders } = await supabase
        .from('orders')
        .select('total_bill, created_at, status') 
        .eq('restaurant_id', admin.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      // 2. Fetch Orders (Prev)
      const { data: prevOrders } = await supabase
        .from('orders')
        .select('total_bill, status')
        .eq('restaurant_id', admin.id)
        .gte('created_at', prevStart.toISOString())
        .lte('created_at', prevEnd.toISOString());
      
      // 3. Fetch Scans
      const { data: currentScans } = await supabase
        .from('qr_scans')
        .select('scanned_at')
        .eq('restaurant_id', admin.id)
        .gte('scanned_at', start.toISOString())
        .lte('scanned_at', end.toISOString());

      // 🚨 THE FIX: Remove strict filtering. Count ALL orders.
      const validCurrentOrders = currentOrders || [];
      const currRev = validCurrentOrders.reduce((sum, o) => sum + (Number(o.total_bill) || 0), 0) || 0;
      
      const validPrevOrders = prevOrders || [];
      const prevRev = validPrevOrders.reduce((sum, o) => sum + (Number(o.total_bill) || 0), 0) || 0;
      
      let growthPct = prevRev > 0 ? ((currRev - prevRev) / prevRev) * 100 : (currRev > 0 ? 100 : 0);

      setStats({ 
        revenue: currRev, 
        orders: validCurrentOrders.length,
        scans: currentScans?.length || 0, 
        growth: Math.round(growthPct) 
      });

      // 5. Trend Logic for Graph
      const labels = [];
      const dayMap = {};

      // Initialize days in range
      let tempDate = new Date(start);
      while (tempDate <= end) {
        const d = formatDate(tempDate);
        labels.push(d);
        dayMap[d] = 0;
        tempDate.setDate(tempDate.getDate() + 1);
      }

      // Fill data based on Active Tab
      if (activeTab === 'revenue') {
        validCurrentOrders.forEach(o => { const d = formatDate(new Date(o.created_at)); if(dayMap[d] !== undefined) dayMap[d] += Number(o.total_bill); });
      } else if (activeTab === 'orders') {
        validCurrentOrders.forEach(o => { const d = formatDate(new Date(o.created_at)); if(dayMap[d] !== undefined) dayMap[d] += 1; });
      } else {
        currentScans?.forEach(s => { const d = formatDate(new Date(s.scanned_at)); if(dayMap[d] !== undefined) dayMap[d] += 1; });
      }

      setChartData({
        labels,
        datasets: [{
          label: activeTab.toUpperCase(),
          data: labels.map(l => dayMap[l]),
          fill: true,
          borderColor: activeTab === 'revenue' ? '#10b981' : (activeTab === 'orders' ? '#3b82f6' : '#6366f1'),
          backgroundColor: activeTab === 'revenue' ? 'rgba(16, 185, 129, 0.1)' : (activeTab === 'orders' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(99, 102, 241, 0.1)'),
          tension: 0.4,
          pointRadius: 4,
        }]
      });

    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto w-full space-y-8">
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Business Analytics 📈</h1>
            <p className="text-slate-500 text-sm">Real-time performance tracking</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
              <CalendarIcon size={18} className="text-slate-400 ml-2" />
              <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="bg-transparent border-none outline-none font-bold text-slate-700 cursor-pointer pr-2">
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            {timeFilter === 'custom' && (
              <div className="flex items-center gap-2">
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-white border p-2 rounded-xl text-sm font-semibold" />
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-white border p-2 rounded-xl text-sm font-semibold" />
              </div>
            )}
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Revenue" value={`₹${stats.revenue}`} icon={<IndianRupee className="text-emerald-500" />} loading={loading} />
          <StatCard title="Total Orders" value={stats.orders} icon={<ShoppingBag className="text-blue-500" />} loading={loading} />
          <StatCard title="QR Scanned" value={stats.scans} icon={<QrCode className="text-indigo-500" />} loading={loading} />
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-slate-50 rounded-xl"><TrendingUp className="text-purple-500" /></div>
              {!loading && (
                <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-lg ${stats.growth >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {stats.growth >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {Math.abs(stats.growth)}%
                </div>
              )}
            </div>
            <div className="mt-4">
              <h3 className="text-slate-500 text-sm font-medium">Business Growth</h3>
              <p className="text-2xl font-bold text-slate-800">{loading ? "..." : `${stats.growth}%`}</p>
              <p className="text-[10px] text-slate-400 mt-1 font-medium italic">Vs: {prevPeriodText}</p>
            </div>
          </div>
        </div>

        {/* INTERACTIVE CHART SECTION */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <h3 className="text-lg font-bold text-slate-800">Performance Graph</h3>
            
            {/* TABS FILTER */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {['revenue', 'orders', 'scans'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-300 animate-pulse font-bold">Updating Chart...</div>
            ) : (
              <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } } }} />
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

const StatCard = ({ title, value, icon, loading }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
    <div className="p-3 bg-slate-50 rounded-xl w-fit">{icon}</div>
    <div className="mt-4">
      <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
      <p className="text-2xl font-bold text-slate-800">{loading ? "..." : value}</p>
    </div>
  </div>
);

export default Analytics;