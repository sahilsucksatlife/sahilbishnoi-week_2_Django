import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Plus, 
  Trash2, 
  LogOut, 
  User, 
  Clock, 
  Filter, 
  RotateCcw, 
  DollarSign, 
  Calendar, 
  Tag, 
  FileText 
} from 'lucide-react';
import { Doughnut, Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement 
} from 'chart.js';

// Register Chart.js modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const EXPENSE_CATEGORIES = {
  "Food & Dining": { icon: "🍔", color: "#ef4444" },
  "Transport & Fuel": { icon: "🚗", color: "#3b82f6" },
  "Rent & Utilities": { icon: "🏠", color: "#8b5cf6" },
  "Entertainment & Leisure": { icon: "🎬", color: "#ec4899" },
  "Shopping & Apparel": { icon: "🛍️", color: "#f59e0b" },
  "Health & Medical": { icon: "🏥", color: "#10b981" },
  "Education": { icon: "🎓", color: "#6366f1" },
  "Investments & Business": { icon: "💼", color: "#06b6d4" },
  "Others": { icon: "🏷️", color: "#6b7280" }
};

const INCOME_CATEGORIES = {
  "Salary & Wages": { icon: "💼", color: "#10b981" },
  "Investments & Yield": { icon: "📈", color: "#059669" },
  "Gifts & Bonuses": { icon: "🎁", color: "#f59e0b" },
  "Side Hustles": { icon: "💰", color: "#06b6d4" },
  "Others": { icon: "🏷️", color: "#6b7280" }
};

export default function Dashboard() {
  const { user, logout, fetchWithAuth } = useAuth();
  const navigate = useNavigate();

  // State variables
  const [time, setTime] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [analytics, setAnalytics] = useState({
    total_income: 0,
    total_expense: 0,
    net_savings: 0,
    expense_breakdown: [],
    income_breakdown: [],
    top_expense_category: 'None',
    average_expense: 0,
    monthly_trend: []
  });

  // Form states
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [type, setType] = useState('expense'); // expense or income
  const [formLoading, setFormLoading] = useState(false);

  // Filter states
  const [filterType, setFilterType] = useState('ALL');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  // Time ticks
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleDateString(undefined, { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        }) + " // " + now.toLocaleTimeString()
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Dashboard Data
  const loadData = async () => {
    try {
      // 1. Fetch Analytics
      const analRes = await fetchWithAuth(`${API_URL}/analysis`);
      if (analRes.ok) {
        const data = await analRes.json();
        setAnalytics(data);
      }

      // 2. Fetch Transactions
      const params = [];
      if (filterType !== 'ALL') params.push(`type=${filterType}`);
      if (filterMonth) params.push(`month=${filterMonth}`);
      if (filterCategory !== 'ALL') params.push(`category=${encodeURIComponent(filterCategory)}`);
      
      const queryStr = params.length > 0 ? `?${params.join('&')}` : '';
      const txRes = await fetchWithAuth(`${API_URL}/expenses/${queryStr}`);
      if (txRes.ok) {
        const data = await txRes.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error("Error refreshing dashboard:", error);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterType, filterMonth, filterCategory]);

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Please enter a positive amount.");
      return;
    }
    if (!category) {
      alert("Please select a category.");
      return;
    }

    setFormLoading(true);
    try {
      const response = await fetchWithAuth(`${API_URL}/expenses/`, {
        method: 'POST',
        body: JSON.stringify({
          amount: parsedAmount,
          category,
          date,
          notes,
          type
        })
      });

      if (response.ok) {
        // Reset form
        setAmount('');
        setCategory('');
        setNotes('');
        setDate(new Date().toISOString().split('T')[0]);
        await loadData();
      } else {
        const errorData = await response.json();
        alert("Error: " + JSON.stringify(errorData));
      }
    } catch (err) {
      alert("Error adding transaction: " + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      const response = await fetchWithAuth(`${API_URL}/expenses/${id}/`, {
        method: 'DELETE'
      });
      if (response.ok) {
        await loadData();
      } else {
        alert("Failed to delete record.");
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleResetFilters = () => {
    setFilterType('ALL');
    setFilterMonth('');
    setFilterCategory('ALL');
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(val || 0);
  };

  const formatDate = (str) => {
    const parts = str.split("-");
    if (parts.length !== 3) return str;
    const dateObj = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    return dateObj.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      timeZone: 'UTC'
    });
  };

  // Prepare Doughnut Chart Data
  const categoriesList = analytics.expense_breakdown;
  const doughnutData = {
    labels: categoriesList.map(c => c.category),
    datasets: [{
      data: categoriesList.map(c => c.total),
      backgroundColor: categoriesList.map(c => (EXPENSE_CATEGORIES[c.category] || { color: "#6b7280" }).color),
      borderColor: 'rgba(15, 18, 25, 0.8)',
      borderWidth: 2,
      hoverOffset: 12
    }]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#a1a1aa',
          font: { family: 'Plus Jakarta Sans', size: 11 },
          boxWidth: 10,
          padding: 12
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const val = context.raw;
            const pct = categoriesList[context.dataIndex]?.percentage || 0;
            return ` Spent: ${formatCurrency(val)} (${pct}%)`;
          }
        }
      }
    },
    cutout: '70%'
  };

  // Prepare Trend Line Chart Data
  const trendList = analytics.monthly_trend;
  
  const formatMonthLabel = (monthStr) => {
    const parts = monthStr.split("-");
    if (parts.length !== 2) return monthStr;
    const dObj = new Date(Date.UTC(parts[0], parts[1] - 1, 1));
    return dObj.toLocaleDateString(undefined, { 
      month: 'short', 
      year: '2-digit',
      timeZone: 'UTC'
    });
  };

  const lineData = {
    labels: trendList.map(t => formatMonthLabel(t.month)),
    datasets: [
      {
        label: 'Incoming (Income)',
        data: trendList.map(t => t.income),
        borderColor: '#10b981',
        borderWidth: 3,
        pointBackgroundColor: '#10b981',
        pointHoverRadius: 6,
        tension: 0.35,
        fill: false
      },
      {
        label: 'Outgoing (Expense)',
        data: trendList.map(t => t.expense),
        borderColor: '#8b5cf6',
        borderWidth: 3,
        pointBackgroundColor: '#8b5cf6',
        pointHoverRadius: 6,
        tension: 0.35,
        fill: false
      }
    ]
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#a1a1aa',
          font: { family: 'Plus Jakarta Sans', size: 11 },
          boxWidth: 12
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.02)' },
        ticks: { color: '#a1a1aa', font: { family: 'Plus Jakarta Sans', size: 10 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.02)' },
        ticks: { 
          color: '#a1a1aa', 
          font: { family: 'Plus Jakarta Sans', size: 10 },
          callback: value => "$" + value
        }
      }
    }
  };

  // Compile active categories list based on type for Form
  const activeCategories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const allCategoriesKeys = Array.from(new Set([
    ...Object.keys(EXPENSE_CATEGORIES),
    ...Object.keys(INCOME_CATEGORIES)
  ]));

  return (
    <div style={{ maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '32px 24px' }} className="fade-in">
      
      {/* Header */}
      <header className="glass-panel" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '32px',
        padding: '18px 32px'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px', color: '#fff', margin: 0 }}>
            EXPENSE <span style={{ color: 'var(--primary)' }}>TRACKER</span>
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <Clock size={14} />
            <span>{time}</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            <User size={16} style={{ color: 'var(--primary)' }} />
            <span>{user?.username}</span>
          </div>
          
          <button onClick={logout} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* KPI Cards Grid */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* Total Income */}
        <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.05)',
            filter: 'blur(10px)'
          }} />
          <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Total Income</span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.1)',
              color: 'var(--income)'
            }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#fff', marginBottom: '4px' }}>
            {formatCurrency(analytics.total_income)}
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Accumulated earnings</span>
        </div>

        {/* Total Expense */}
        <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.05)',
            filter: 'blur(10px)'
          }} />
          <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Total Outgoings</span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--expense)'
            }}>
              <TrendingDown size={18} />
            </div>
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#fff', marginBottom: '4px' }}>
            {formatCurrency(analytics.total_expense)}
          </h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>Expenses logged</span>
            <span>Avg: {formatCurrency(analytics.average_expense)}/log</span>
          </div>
        </div>

        {/* Net Savings */}
        <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: analytics.net_savings < 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(139, 92, 246, 0.05)',
            filter: 'blur(10px)'
          }} />
          <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Net Balance</span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: analytics.net_savings < 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(139, 92, 246, 0.1)',
              color: analytics.net_savings < 0 ? 'var(--expense)' : 'var(--primary)'
            }}>
              <Wallet size={18} />
            </div>
          </div>
          <h2 style={{ 
            fontSize: '28px', 
            fontWeight: '800', 
            color: analytics.net_savings < 0 ? '#f87171' : '#34d399', 
            marginBottom: '4px' 
          }}>
            {formatCurrency(analytics.net_savings)}
          </h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>Remaining wallet balance</span>
            <span>Top Category: {analytics.top_expense_category}</span>
          </div>
        </div>
      </section>

      {/* Main Grid: Form + Charts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(320px, 400px) 1fr',
        gap: '32px',
        marginBottom: '32px',
        alignItems: 'start'
      }}>
        {/* Form Container */}
        <section className="glass-panel">
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '24px', color: '#fff' }}>Add Transaction</h3>
          
          <form onSubmit={handleAddTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Toggle Switch */}
            <div>
              <label className="form-label">Type</label>
              <div style={{
                display: 'flex',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px',
                padding: '4px'
              }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    background: type === 'expense' ? 'var(--expense)' : 'transparent',
                    color: type === 'expense' ? '#fff' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                  onClick={() => { setType('expense'); setCategory(''); }}
                >
                  Expense
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    background: type === 'income' ? 'var(--income)' : 'transparent',
                    color: type === 'income' ? '#fff' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                  onClick={() => { setType('income'); setCategory(''); }}
                >
                  Income
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="form-label">Amount ($) *</label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={16} style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }} />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className="form-input"
                  style={{ paddingLeft: '38px' }}
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  disabled={formLoading}
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="form-label">Category *</label>
              <div style={{ position: 'relative' }}>
                <Tag size={16} style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  zIndex: 2
                }} />
                <select
                  required
                  className="form-input"
                  style={{ paddingLeft: '38px', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', backgroundColor: '#000000' }}
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  disabled={formLoading}
                >
                  <option value="" disabled style={{ backgroundColor: '#000000' }}>Select category</option>
                  {Object.entries(activeCategories).map(([name, meta]) => (
                    <option key={name} value={name} style={{ backgroundColor: '#000000' }}>{meta.icon} {name}</option>
                  ))}
                </select>
                <div style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                  fontSize: '12px'
                }}>▼</div>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="form-label">Date *</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={16} style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }} />
                <input
                  type="date"
                  required
                  className="form-input"
                  style={{ paddingLeft: '38px' }}
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  disabled={formLoading}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="form-label">Notes</label>
              <div style={{ position: 'relative' }}>
                <FileText size={16} style={{
                  position: 'absolute',
                  left: '14px',
                  top: '16px',
                  color: 'var(--text-muted)'
                }} />
                <textarea
                  className="form-input"
                  style={{ paddingLeft: '38px', minHeight: '80px', resize: 'vertical' }}
                  placeholder="Details of transaction..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  disabled={formLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px 24px', marginTop: '4px' }}
              disabled={formLoading}
            >
              <Plus size={16} />
              <span>{formLoading ? 'Adding...' : 'Add Transaction'}</span>
            </button>
          </form>
        </section>

        {/* Charts Section */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 350px) 1fr',
          gap: '24px',
          height: '100%'
        }}>
          {/* Category Breakdown (Doughnut) */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', minHeight: '360px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#fff', marginBottom: '16px' }}>Expense Breakdown</h4>
            <div style={{ flex: 1, position: 'relative', minHeight: '220px' }}>
              {categoriesList.length === 0 ? (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: '14px'
                }}>
                  No expense records logged.
                </div>
              ) : (
                <Doughnut data={doughnutData} options={doughnutOptions} />
              )}
            </div>
          </div>

          {/* Comparative Monthly Trend (Line) */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', minHeight: '360px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#fff', marginBottom: '16px' }}>Cash Flow Trend</h4>
            <div style={{ flex: 1, position: 'relative', minHeight: '220px' }}>
              {trendList.length === 0 ? (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: '14px'
                }}>
                  No trend data available.
                </div>
              ) : (
                <Line data={lineData} options={lineOptions} />
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Filters & Log History */}
      <section className="glass-panel" style={{ padding: '24px 32px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          paddingBottom: '20px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', margin: 0 }}>Transaction History</h3>
            <span style={{
              background: 'rgba(139, 92, 246, 0.12)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              borderRadius: '20px',
              padding: '2px 10px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#c084fc',
              marginLeft: '8px'
            }}>
              {transactions.length} record{transactions.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Filtering controls */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Filter by Type */}
            <select
              className="form-input"
              style={{ width: '120px', padding: '8px 12px', cursor: 'pointer', backgroundColor: '#000000' }}
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="ALL" style={{ backgroundColor: '#000000' }}>All Types</option>
              <option value="expense" style={{ backgroundColor: '#000000' }}>Expense</option>
              <option value="income" style={{ backgroundColor: '#000000' }}>Income</option>
            </select>

            {/* Filter by Month */}
            <input
              type="month"
              className="form-input"
              style={{ width: '150px', padding: '8px 12px' }}
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
            />

            {/* Filter by Category */}
            <select
              className="form-input"
              style={{ width: '160px', padding: '8px 12px', cursor: 'pointer', backgroundColor: '#000000' }}
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
            >
              <option value="ALL" style={{ backgroundColor: '#000000' }}>All Categories</option>
              {allCategoriesKeys.map(cat => {
                const meta = EXPENSE_CATEGORIES[cat] || INCOME_CATEGORIES[cat] || { icon: "🏷️" };
                return (
                  <option key={cat} value={cat} style={{ backgroundColor: '#000000' }}>{meta.icon} {cat}</option>
                );
              })}
            </select>

            {/* Reset Filter Button */}
            <button
              onClick={handleResetFilters}
              className="btn btn-secondary"
              style={{ padding: '8px 12px', fontSize: '13px' }}
              title="Reset Filters"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div style={{ overflowX: 'auto' }}>
          {transactions.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 0',
              color: 'var(--text-secondary)',
              gap: '12px'
            }}>
              <FileText size={48} style={{ color: 'var(--text-muted)', strokeWidth: 1.5 }} />
              <span>No transactions match the selected filters.</span>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Date</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Type</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Category</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Amount</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Notes</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => {
                  const isInc = tx.type === 'income';
                  const catMeta = EXPENSE_CATEGORIES[tx.category] || INCOME_CATEGORIES[tx.category] || { icon: "🏷️" };
                  
                  return (
                    <tr key={tx.id} style={{
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      transition: 'var(--transition)'
                    }} className="table-row-hover">
                      
                      {/* Date */}
                      <td style={{ padding: '16px', fontSize: '14px', whiteSpace: 'nowrap' }}>
                        {formatDate(tx.date)}
                      </td>

                      {/* Type Badge */}
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          background: isInc ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: isInc ? '#34d399' : '#f87171',
                          border: isInc ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                        }}>
                          {tx.type}
                        </span>
                      </td>

                      {/* Category */}
                      <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500' }}>
                        {catMeta.icon} {tx.category}
                      </td>

                      {/* Amount */}
                      <td style={{ 
                        padding: '16px', 
                        fontSize: '14px', 
                        fontWeight: '700', 
                        color: isInc ? '#34d399' : '#f87171'
                      }}>
                        {isInc ? '+' : '-'}{formatCurrency(tx.amount)}
                      </td>

                      {/* Notes */}
                      <td style={{ 
                        padding: '16px', 
                        fontSize: '14px', 
                        color: 'var(--text-secondary)',
                        maxWidth: '220px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }} title={tx.notes || ''}>
                        {tx.notes || '—'}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteTransaction(tx.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '6px',
                            transition: 'var(--transition)'
                          }}
                          className="btn-delete-hover"
                          title="Delete Record"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Injecting dynamic hover style for table delete & rows */}
      <style>{`
        .table-row-hover:hover {
          background: rgba(255, 255, 255, 0.015);
        }
        .btn-delete-hover:hover {
          color: var(--expense) !important;
          background: rgba(239, 68, 68, 0.08) !important;
        }
      `}</style>
    </div>
  );
}
