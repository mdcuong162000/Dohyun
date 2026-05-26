import { useState, useMemo, useEffect } from 'react';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  ArrowUpDown, 
  Search, 
  Building2, 
  User, 
  Scissors, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  Calendar,
  MousePointerClick,
  Percent,
  Lock,
  LogOut,
  AlertCircle,
  Play,
  FileSpreadsheet
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import localMockData from './data/dohyun_daily_clean.json';

interface DailyRecord {
  team: string;
  operator: string;
  branch: string;
  bm: string;
  service: string;
  ads_spend: number;
  contacts: number;
  comments: number;
  avg_engagement: number;
  leads: number;
  cost_per_lead: number;
  showups: number;
  cost_per_showup: number;
  revenue: number;
  ads_ratio: number;
  date: string;
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#3a86ff', '#06d6a0', '#ff006e', '#8338ec', '#ffbe0b'];

// Google Auth client instance declared outside React cycle
let tokenClient: any = null;

export default function App() {
  // --- AUTH STATE ---
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('dohyun_access_token');
  });
  const [authError, setAuthError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  
  // --- DATA STATE ---
  const [records, setRecords] = useState<DailyRecord[]>([]);

  // Env variables
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const spreadsheetId = import.meta.env.VITE_SPREADSHEET_ID;
  const isClientIdPlaceholder = !clientId || clientId.includes('PLACEHOLDER');

  // --- INITIALIZE GOOGLE OAUTH CLIENT ---
  useEffect(() => {
    // Load local mock data if in Demo Mode
    if (isDemoMode) {
      setRecords(localMockData as DailyRecord[]);
      return;
    }

    if (!accessToken) {
      setRecords([]);
      return;
    }

    // Load data from Google Sheets API
    const loadGoogleData = async () => {
      setIsLoading(true);
      setAuthError('');
      try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Daily`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });
        
        if (res.status === 401) {
          // Token expired or invalid
          handleLogout();
          throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        }

        if (!res.ok) {
          throw new Error(`Google API trả về mã lỗi: ${res.status} (${res.statusText})`);
        }

        const data = await res.json();
        const parsed = parseSheetsData(data.values);
        setRecords(parsed);
      } catch (err: any) {
        console.error('Fetch error:', err);
        setAuthError(err.message || 'Lỗi khi tải dữ liệu từ Google Sheets.');
        // Fallback to demo mode if load fails and we have no records
        if (records.length === 0) {
          setIsDemoMode(true);
          setRecords(localMockData as DailyRecord[]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadGoogleData();
  }, [accessToken, isDemoMode]);

  // Load Google Identity Services SDK library on mount
  useEffect(() => {
    if (isClientIdPlaceholder) return;

    const initGsi = () => {
      if ((window as any).google && (window as any).google.accounts) {
        tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
          callback: (response: any) => {
            if (response.error) {
              setAuthError(`Lỗi xác thực: ${response.error}`);
              return;
            }
            if (response.access_token) {
              localStorage.setItem('dohyun_access_token', response.access_token);
              setAccessToken(response.access_token);
              setIsDemoMode(false);
            }
          },
        });
      }
    };

    if ((window as any).google) {
      initGsi();
    } else {
      const script = document.querySelector('script[src*="gsi/client"]');
      if (script) {
        script.addEventListener('load', initGsi);
      }
    }
  }, [clientId, isClientIdPlaceholder]);

  // --- GOOGLE SHEETS RAW ROWS PARSER ---
  const parseSheetsData = (rows: any[][]): DailyRecord[] => {
    if (!rows || rows.length <= 1) return [];
    
    const headers = rows[0].map(h => String(h).trim());
    
    const colIndex = (name: string) => headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
    
    const idxDate = colIndex('ngày tháng') !== -1 ? colIndex('ngày tháng') : 0;
    const idxTeam = colIndex('team');
    const idxOperator = colIndex('người thực hiện');
    const idxBranch = colIndex('chi nhánh');
    const idxBm = colIndex('bm');
    const idxService = colIndex('dịch vụ');
    const idxAdsSpend = colIndex('chi tiêu ads');
    const idxContacts = colIndex('người liên hệ');
    const idxComments = colIndex('bình luận');
    const idxEngagement = colIndex('tương tác');
    const idxLeads = colIndex('sđt');
    const idxCostLead = colIndex('giá cost \nsđt') !== -1 ? colIndex('giá cost \nsđt') : colIndex('cost \nsđt');
    const idxShowups = colIndex('khách đến');
    const idxCostShowup = colIndex('giá cost\n khách đến') !== -1 ? colIndex('giá cost\n khách đến') : colIndex('cost\n khách đến');
    const idxRevenue = colIndex('doanh số');
    const idxAdsRatio = colIndex('%ads');
    
    const parsedRecords: DailyRecord[] = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[idxDate] || !row[idxBranch]) continue;
      
      let dateStr = String(row[idxDate]).trim();
      
      // Handle Date conversions (Excel standard format is YYYY-MM-DD, Google sheets might return DD/MM/YYYY)
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          let d = parts[0].padStart(2, '0');
          let m = parts[1].padStart(2, '0');
          let y = parts[2];
          if (y.length === 2) y = '20' + y;
          dateStr = `${y}-${m}-${d}`;
        }
      } else if (dateStr.includes('T')) {
        dateStr = dateStr.split('T')[0];
      }

      const cleanNum = (val: any): number => {
        if (val === undefined || val === null || val === '') return 0;
        if (typeof val === 'number') return val;
        const str = String(val).trim().replace(/\s/g, '');
        if (str === '-' || str === 'd' || str === 'đ') return 0;
        
        // Remove currency suffix and dots
        const cleanStr = str.replace(/[^\d.,-]/g, '');
        if (cleanStr.includes('.') && !cleanStr.includes(',')) {
          const parts = cleanStr.split('.');
          if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
            return parseFloat(cleanStr.replace(/\./g, ''));
          }
          return parseFloat(cleanStr);
        }
        return parseFloat(cleanStr.replace(/,/g, ''));
      };

      parsedRecords.push({
        team: idxTeam !== -1 ? String(row[idxTeam] || '').trim() : '',
        operator: idxOperator !== -1 ? String(row[idxOperator] || '').trim() : '',
        branch: idxBranch !== -1 ? String(row[idxBranch] || '').trim() : '',
        bm: idxBm !== -1 ? String(row[idxBm] || '').trim() : '',
        service: idxService !== -1 ? String(row[idxService] || '').trim() : '',
        ads_spend: cleanNum(row[idxAdsSpend]),
        contacts: Math.round(cleanNum(row[idxContacts])),
        comments: Math.round(cleanNum(row[idxComments])),
        avg_engagement: cleanNum(row[idxEngagement]),
        leads: Math.round(cleanNum(row[idxLeads])),
        cost_per_lead: cleanNum(row[idxCostLead]),
        showups: Math.round(cleanNum(row[idxShowups])),
        cost_per_showup: cleanNum(row[idxCostShowup]),
        revenue: cleanNum(row[idxRevenue]),
        ads_ratio: cleanNum(row[idxAdsRatio]),
        date: dateStr
      });
    }
    
    return parsedRecords;
  };

  // --- ACTIONS ---
  const handleLogin = () => {
    if (tokenClient) {
      tokenClient.requestAccessToken();
    } else {
      setAuthError('OAuth client chưa được khởi tạo. Vui lòng tải lại trang.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dohyun_access_token');
    setAccessToken(null);
    setIsDemoMode(false);
  };

  const handleEnterDemo = () => {
    setIsDemoMode(true);
  };

  // --- FILTER STATE ---
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const [selectedTeam, setSelectedTeam] = useState<string>('All');
  const [selectedService, setSelectedService] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Table sorting & pagination
  const [sortBy, setSortBy] = useState<keyof DailyRecord>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // --- DERIVED METADATA ---
  const uniqueBranches = useMemo(() => {
    const branches = new Set(records.map(r => r.branch).filter(Boolean));
    return ['All', ...Array.from(branches)];
  }, [records]);

  const uniqueTeams = useMemo(() => {
    const teams = new Set(records.map(r => r.team).filter(Boolean));
    return ['All', ...Array.from(teams)];
  }, [records]);

  const uniqueServices = useMemo(() => {
    const services = new Set(records.map(r => r.service).filter(Boolean));
    return ['All', ...Array.from(services)];
  }, [records]);

  const { minDate, maxDate } = useMemo(() => {
    if (!records.length) return { minDate: '', maxDate: '' };
    const dates = records.map(r => r.date).sort();
    return { minDate: dates[0], maxDate: dates[dates.length - 1] };
  }, [records]);

  // --- FILTERED DATA ---
  const filteredData = useMemo(() => {
    return records.filter(r => {
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;
      if (selectedBranch !== 'All' && r.branch !== selectedBranch) return false;
      if (selectedTeam !== 'All' && r.team !== selectedTeam) return false;
      if (selectedService !== 'All' && r.service !== selectedService) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          r.operator.toLowerCase().includes(query) ||
          r.bm.toLowerCase().includes(query) ||
          r.service.toLowerCase().includes(query) ||
          r.branch.toLowerCase().includes(query) ||
          r.team.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [records, selectedBranch, selectedTeam, selectedService, startDate, endDate, searchQuery]);

  // --- CORE METRICS ---
  const metrics = useMemo(() => {
    let adsSpend = 0;
    let leads = 0;
    let showups = 0;
    let revenue = 0;
    let contacts = 0;
    let comments = 0;

    filteredData.forEach(r => {
      adsSpend += r.ads_spend;
      leads += r.leads;
      showups += r.showups;
      revenue += r.revenue;
      contacts += r.contacts;
      comments += r.comments;
    });

    const costPerLead = leads > 0 ? adsSpend / leads : 0;
    const costPerShowup = showups > 0 ? adsSpend / showups : 0;
    const leadToShowupRate = leads > 0 ? (showups / leads) * 100 : 0;
    const roas = adsSpend > 0 ? revenue / adsSpend : 0;

    return {
      adsSpend,
      leads,
      showups,
      revenue,
      contacts,
      comments,
      costPerLead,
      costPerShowup,
      leadToShowupRate,
      roas
    };
  }, [filteredData]);

  // --- CHART DATA ---
  const trendChartData = useMemo(() => {
    const grouped: { [date: string]: { date: string; adsSpend: number; revenue: number; leads: number } } = {};
    filteredData.forEach(r => {
      if (!grouped[r.date]) {
        grouped[r.date] = { date: r.date, adsSpend: 0, revenue: 0, leads: 0 };
      }
      grouped[r.date].adsSpend += r.ads_spend;
      grouped[r.date].revenue += r.revenue;
      grouped[r.date].leads += r.leads;
    });
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData]);

  const serviceChartData = useMemo(() => {
    const grouped: { [service: string]: { name: string; adsSpend: number; revenue: number } } = {};
    filteredData.forEach(r => {
      const s = r.service || 'Khác';
      if (!grouped[s]) {
        grouped[s] = { name: s, adsSpend: 0, revenue: 0 };
      }
      grouped[s].adsSpend += r.ads_spend;
      grouped[s].revenue += r.revenue;
    });
    return Object.values(grouped).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [filteredData]);

  const branchChartData = useMemo(() => {
    const grouped: { [branch: string]: { name: string; value: number } } = {};
    filteredData.forEach(r => {
      const b = r.branch || 'Khác';
      if (!grouped[b]) {
        grouped[b] = { name: b, value: 0 };
      }
      grouped[b].value += r.revenue;
    });
    return Object.values(grouped).filter(item => item.value > 0);
  }, [filteredData]);

  const teamChartData = useMemo(() => {
    const grouped: { [team: string]: { name: string; adsSpend: number; revenue: number } } = {};
    filteredData.forEach(r => {
      const t = r.team || 'Khác';
      if (!grouped[t]) {
        grouped[t] = { name: t, adsSpend: 0, revenue: 0 };
      }
      grouped[t].adsSpend += r.ads_spend;
      grouped[t].revenue += r.revenue;
    });
    return Object.values(grouped);
  }, [filteredData]);

  // --- SORTED & PAGINATED TABLE DATA ---
  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      if (typeof aVal === 'string') {
        aVal = (aVal as string).toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredData, sortBy, sortDirection]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;

  const handleSort = (field: keyof DailyRecord) => {
    if (sortBy === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSelectedBranch('All');
    setSelectedTeam('All');
    setSelectedService('All');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val);
  };

  // --- RENDER LOGIN SCREEN IF NOT AUTHENTICATED ---
  if (!accessToken && !isDemoMode) {
    return (
      <div className="login-screen-container">
        <div className="login-box">
          <div className="login-header">
            <div className="logo-badge large-badge">DOHYUN</div>
            <h1 className="login-title">DOHYUN GROUP</h1>
            <p className="login-subtitle">Hệ thống phân tích tự động dữ liệu Marketing & Doanh số</p>
          </div>

          <div className="login-card-body">
            {authError && (
              <div className="alert alert-danger">
                <AlertCircle size={16} />
                <span>{authError}</span>
              </div>
            )}

            {isClientIdPlaceholder ? (
              <div className="config-warning-box">
                <div className="warning-header">
                  <AlertCircle size={18} className="text-amber" />
                  <h3>Chưa thiết lập Google OAuth Client ID</h3>
                </div>
                <p className="warning-desc">
                  Để xem dữ liệu thời gian thực từ Google Sheets, sếp cần đăng ký OAuth Client ID trên Google Cloud Console và dán vào tệp <code>.env.local</code>.
                </p>
                <div className="steps-list">
                  <div className="step-item">
                    <span className="step-num">1</span>
                    <span>Vào <strong>APIs & Services</strong> ➔ <strong>Credentials</strong> trong Google Cloud Console.</span>
                  </div>
                  <div className="step-item">
                    <span className="step-num">2</span>
                    <span>Tạo <strong>OAuth Client ID</strong> (Application Type: Web Application).</span>
                  </div>
                  <div className="step-item">
                    <span className="step-num">3</span>
                    <span>Đặt Authorized Javascript Origins là <code>http://localhost:5173</code> (hoặc domain Vercel).</span>
                  </div>
                  <div className="step-item">
                    <span className="step-num">4</span>
                    <span>Sao chép Client ID dán vào <code>VITE_GOOGLE_CLIENT_ID</code> trong file <code>.env.local</code> của dự án.</span>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="login-actions">
              <button 
                type="button" 
                className="btn btn-primary btn-login" 
                onClick={handleLogin}
                disabled={isClientIdPlaceholder}
              >
                <Lock size={16} /> Đăng Nhập Với Google
              </button>
              
              <button 
                type="button" 
                className="btn btn-secondary btn-demo" 
                onClick={handleEnterDemo}
              >
                <Play size={16} /> Xem Dữ Liệu Mẫu (Offline Demo)
              </button>
            </div>
          </div>
          <div className="login-footer">
            <p>© 2026 Dohyun Group. Bảo mật nội bộ.</p>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER LOADER ---
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Đang tải dữ liệu từ Google Sheets...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <header className="dashboard-header">
        <div className="header-title-container">
          <div className="logo-badge">DOHYUN</div>
          <div>
            <h1 className="header-title">DOHYUN GROUP</h1>
            <p className="header-subtitle">
              {isDemoMode ? 'Chế độ: Dữ liệu mẫu (Offline Demo)' : 'Kết nối dữ liệu: Google Sheet Live Sync'}
            </p>
          </div>
        </div>
        
        <div className="header-meta">
          {records.length > 0 && (
            <span className="meta-badge">
              <Calendar size={14} />
              Dữ liệu: {minDate} đến {maxDate}
            </span>
          )}
          
          {!isDemoMode && (
            <span className="meta-badge pulse-badge">
              Google Sheet Live
            </span>
          )}

          <button 
            type="button" 
            className="btn btn-secondary btn-logout" 
            onClick={handleLogout}
            title="Đăng xuất"
            aria-label="Đăng xuất"
          >
            <LogOut size={14} /> {isDemoMode ? 'Đăng nhập lại' : 'Đăng xuất'}
          </button>
        </div>
      </header>

      {/* FILTER PANEL */}
      <section className="filter-panel" id="filters">
        <div className="filter-grid">
          {/* Branch Select */}
          <div className="filter-group">
            <label htmlFor="branch-select">Chi Nhánh</label>
            <div className="select-wrapper">
              <Building2 size={16} className="select-icon" />
              <select 
                id="branch-select" 
                value={selectedBranch} 
                onChange={(e) => { setSelectedBranch(e.target.value); setCurrentPage(1); }}
              >
                {uniqueBranches.map(b => <option key={b} value={b}>{b === 'All' ? 'Tất cả Chi Nhánh' : b}</option>)}
              </select>
            </div>
          </div>

          {/* Team Select */}
          <div className="filter-group">
            <label htmlFor="team-select">Đội Ngũ (Team)</label>
            <div className="select-wrapper">
              <User size={16} className="select-icon" />
              <select 
                id="team-select" 
                value={selectedTeam} 
                onChange={(e) => { setSelectedTeam(e.target.value); setCurrentPage(1); }}
              >
                {uniqueTeams.map(t => <option key={t} value={t}>{t === 'All' ? 'Tất cả Team' : t}</option>)}
              </select>
            </div>
          </div>

          {/* Service Select */}
          <div className="filter-group">
            <label htmlFor="service-select">Dịch Vụ</label>
            <div className="select-wrapper">
              <Scissors size={16} className="select-icon" />
              <select 
                id="service-select" 
                value={selectedService} 
                onChange={(e) => { setSelectedService(e.target.value); setCurrentPage(1); }}
              >
                {uniqueServices.map(s => <option key={s} value={s}>{s === 'All' ? 'Tất cả Dịch Vụ' : s}</option>)}
              </select>
            </div>
          </div>

          {/* Date Picker Start */}
          <div className="filter-group">
            <label htmlFor="start-date-picker">Từ ngày</label>
            <input 
              type="date" 
              id="start-date-picker" 
              value={startDate} 
              min={minDate}
              max={maxDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
            />
          </div>

          {/* Date Picker End */}
          <div className="filter-group">
            <label htmlFor="end-date-picker">Đến ngày</label>
            <input 
              type="date" 
              id="end-date-picker" 
              value={endDate} 
              min={minDate}
              max={maxDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
            />
          </div>

          {/* Search bar */}
          <div className="filter-group search-group">
            <label htmlFor="search-input">Tìm kiếm nhanh</label>
            <div className="search-wrapper">
              <Search size={16} className="search-icon" />
              <input 
                type="text" 
                id="search-input" 
                placeholder="Tìm operator, BM, dịch vụ..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>
        </div>

        {/* Reset button */}
        <div className="filter-actions">
          <span className="results-count">Tìm thấy <strong>{filteredData.length}</strong> chiến dịch ngày</span>
          
          <div className="action-buttons-group">
            {!isDemoMode && (
              <a 
                href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                target="_blank" 
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ marginRight: '8px' }}
              >
                <FileSpreadsheet size={14} /> Mở Google Sheet
              </a>
            )}
            
            <button 
              type="button" 
              id="clear-filters-btn" 
              className="btn btn-secondary" 
              onClick={handleResetFilters}
              aria-label="Xóa tất cả bộ lọc"
            >
              <RefreshCw size={14} /> Xóa Bộ Lọc
            </button>
          </div>
        </div>
      </section>

      {/* KPI METRICS BLOCK */}
      <section className="kpi-grid">
        {/* Card 1: Revenue */}
        <div className="kpi-card premium-card">
          <div className="kpi-icon-container bg-emerald">
            <TrendingUp size={20} />
          </div>
          <div className="kpi-details">
            <span className="kpi-label">Tổng Doanh Số</span>
            <span className="kpi-value text-emerald">{formatCurrency(metrics.revenue)}</span>
            <div className="kpi-subtext">Từ chiến dịch quảng cáo mới</div>
          </div>
        </div>

        {/* Card 2: Ads Spend */}
        <div className="kpi-card">
          <div className="kpi-icon-container bg-blue">
            <DollarSign size={20} />
          </div>
          <div className="kpi-details">
            <span className="kpi-label">Chi Tiêu Ads</span>
            <span className="kpi-value text-blue">{formatCurrency(metrics.adsSpend)}</span>
            <div className="kpi-subtext">Ngân sách chạy quảng cáo</div>
          </div>
        </div>

        {/* Card 3: ROAS */}
        <div className="kpi-card">
          <div className="kpi-icon-container bg-purple">
            <Percent size={20} />
          </div>
          <div className="kpi-details">
            <span className="kpi-label">ROAS (Doanh số / Ads)</span>
            <span className={`kpi-value ${metrics.roas >= 1.5 ? 'text-emerald' : metrics.roas >= 1.0 ? 'text-amber' : 'text-rose'}`}>
              {metrics.roas.toFixed(2)}x
            </span>
            <div className="kpi-subtext">Hiệu suất chi tiêu ads</div>
          </div>
        </div>

        {/* Card 4: Leads (SĐT) */}
        <div className="kpi-card">
          <div className="kpi-icon-container bg-amber">
            <Users size={20} />
          </div>
          <div className="kpi-details">
            <span className="kpi-label">Tổng Số Điện Thoại (Leads)</span>
            <span className="kpi-value text-amber">{formatNumber(metrics.leads)}</span>
            <div className="kpi-subtext">Chi phí / Lead: {formatCurrency(metrics.costPerLead)}</div>
          </div>
        </div>

        {/* Card 5: Show-ups (Khách đến) */}
        <div className="kpi-card">
          <div className="kpi-icon-container bg-violet">
            <MousePointerClick size={20} />
          </div>
          <div className="kpi-details">
            <span className="kpi-label">Khách Đến Chi Nhánh</span>
            <span className="kpi-value text-violet">{formatNumber(metrics.showups)}</span>
            <div className="kpi-subtext">Tỷ lệ đến: {metrics.leadToShowupRate.toFixed(1)}%</div>
          </div>
        </div>
      </section>

      {/* CHARTS CONTAINER */}
      {records.length > 0 && (
        <section className="charts-grid">
          {/* Chart 1: Trend Area Chart */}
          <div className="chart-card large-chart-card">
            <div className="chart-header">
              <h2 className="chart-title">Xu Hướng Chi Tiêu Ads vs Doanh Số</h2>
              <span className="chart-tag">Theo ngày</span>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorAds" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
                  <XAxis dataKey="date" stroke="#a0aec0" fontSize={12} tickLine={false} />
                  <YAxis 
                    stroke="#a0aec0" 
                    fontSize={12} 
                    tickLine={false} 
                    tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a202c', borderColor: '#2d3748', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    formatter={(val: number) => [formatCurrency(val), '']}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Area name="Doanh Số" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                  <Area name="Chi Tiêu Ads" type="monotone" dataKey="adsSpend" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorAds)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Service Breakdown */}
          <div className="chart-card">
            <div className="chart-header">
              <h2 className="chart-title">Top 10 Dịch Vụ Theo Doanh Số</h2>
              <span className="chart-tag">Doanh số & Ads</span>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={serviceChartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
                  <XAxis dataKey="name" stroke="#a0aec0" fontSize={11} tickLine={false} />
                  <YAxis 
                    stroke="#a0aec0" 
                    fontSize={11} 
                    tickLine={false} 
                    tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a202c', borderColor: '#2d3748', borderRadius: '8px' }}
                    formatter={(val: number) => [formatCurrency(val), '']}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Bar name="Doanh Số" dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar name="Chi Tiêu Ads" dataKey="adsSpend" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Branch breakdown pie */}
          <div className="chart-card">
            <div className="chart-header">
              <h2 className="chart-title">Tỷ Lệ Doanh Số Theo Chi Nhánh</h2>
              <span className="chart-tag">Cơ cấu %</span>
            </div>
            <div className="chart-body flex-center">
              {branchChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={branchChartData}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {branchChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a202c', borderColor: '#2d3748', borderRadius: '8px' }}
                      formatter={(val: number) => [formatCurrency(val), 'Doanh Số']}
                    />
                    <Legend verticalAlign="bottom" height={36} layout="horizontal" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-data">Không có dữ liệu doanh số</div>
              )}
            </div>
          </div>

          {/* Chart 4: Funnel / Conversion Bar */}
          <div className="chart-card large-chart-card">
            <div className="chart-header">
              <h2 className="chart-title">So Sánh Doanh Số vs Chi Tiêu Ads Theo Team</h2>
              <span className="chart-tag">Hiệu suất team</span>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={teamChartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
                  <XAxis dataKey="name" stroke="#a0aec0" fontSize={12} tickLine={false} />
                  <YAxis 
                    stroke="#a0aec0" 
                    fontSize={12} 
                    tickLine={false} 
                    tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a202c', borderColor: '#2d3748', borderRadius: '8px' }}
                    formatter={(val: number) => [formatCurrency(val), '']}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Bar name="Doanh Số" dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar name="Chi Tiêu Ads" dataKey="adsSpend" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {/* DATA TABLE CONTAINER */}
      <section className="table-card">
        <div className="table-header">
          <div>
            <h2 className="table-title">Chi Tiết Nhật Ký Quảng Cáo</h2>
            <p className="table-subtitle">Hiển thị {sortedData.length} dòng dữ liệu</p>
          </div>
          
          <div className="page-size-selector">
            <label htmlFor="page-size-select">Dòng trên trang:</label>
            <select 
              id="page-size-select" 
              value={pageSize} 
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="custom-table" id="data-log-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('date')} className="sortable">
                  Ngày <ArrowUpDown size={12} />
                </th>
                <th onClick={() => handleSort('branch')} className="sortable">
                  Chi Nhánh <ArrowUpDown size={12} />
                </th>
                <th onClick={() => handleSort('team')} className="sortable">
                  Team <ArrowUpDown size={12} />
                </th>
                <th onClick={() => handleSort('operator')} className="sortable">
                  Người Làm <ArrowUpDown size={12} />
                </th>
                <th onClick={() => handleSort('service')} className="sortable">
                  Dịch Vụ <ArrowUpDown size={12} />
                </th>
                <th onClick={() => handleSort('ads_spend')} className="sortable text-right">
                  Chi Tiêu Ads <ArrowUpDown size={12} />
                </th>
                <th onClick={() => handleSort('leads')} className="sortable text-right">
                  SĐT (Lead) <ArrowUpDown size={12} />
                </th>
                <th onClick={() => handleSort('cost_per_lead')} className="sortable text-right">
                  Cost/SĐT <ArrowUpDown size={12} />
                </th>
                <th onClick={() => handleSort('showups')} className="sortable text-right">
                  Khách Đến <ArrowUpDown size={12} />
                </th>
                <th onClick={() => handleSort('revenue')} className="sortable text-right">
                  Doanh Số <ArrowUpDown size={12} />
                </th>
                <th onClick={() => handleSort('ads_ratio')} className="sortable text-right">
                  %Ads/DT <ArrowUpDown size={12} />
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length > 0 ? (
                paginatedData.map((row, idx) => (
                  <tr key={idx}>
                    <td><span className="date-badge">{row.date}</span></td>
                    <td>{row.branch}</td>
                    <td>{row.team}</td>
                    <td><span className="operator-badge">{row.operator}</span></td>
                    <td><span className="service-badge">{row.service}</span></td>
                    <td className="text-right font-mono">{formatCurrency(row.ads_spend)}</td>
                    <td className="text-right font-semibold">{row.leads}</td>
                    <td className="text-right font-mono">{formatCurrency(row.cost_per_lead)}</td>
                    <td className="text-right">{row.showups}</td>
                    <td className="text-right font-mono text-emerald font-semibold">{formatCurrency(row.revenue)}</td>
                    <td className="text-right font-mono">{(row.ads_ratio * 100).toFixed(1)}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="table-empty">
                    Không tìm thấy bản ghi nào khớp bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="table-pagination">
          <div className="pagination-info">
            Trang <strong>{currentPage}</strong> trên <strong>{totalPages}</strong> (Hiển thị {Math.min(sortedData.length, (currentPage - 1) * pageSize + 1)} - {Math.min(sortedData.length, currentPage * pageSize)} trên {sortedData.length} dòng)
          </div>
          <div className="pagination-controls">
            <button 
              type="button" 
              className="btn btn-icon" 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              aria-label="Trang trước"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="pagination-pages">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (currentPage > 3 && totalPages > 5) {
                  pageNum = currentPage - 3 + i;
                  if (pageNum + (4 - i) > totalPages) {
                    pageNum = totalPages - 4 + i;
                  }
                }
                return (
                  <button
                    key={pageNum}
                    type="button"
                    className={`page-num-btn ${currentPage === pageNum ? 'active' : ''}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </span>
            <button 
              type="button" 
              className="btn btn-icon" 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              aria-label="Trang sau"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="dashboard-footer-bar">
        <p>© 2026 Dohyun Group. All rights reserved. Built with React & Vite.</p>
        <div className="footer-links">
          <span>Hệ thống phân tích tự động</span>
          <span>•</span>
          <span>Bảo mật dữ liệu nội bộ</span>
        </div>
      </footer>
    </div>
  );
}
