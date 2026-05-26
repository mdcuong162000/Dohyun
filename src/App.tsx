import { useState, useMemo, useEffect, useRef, Fragment } from 'react';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  // ArrowUpDown, 
  Search, 
  Building2, 
  User, 
  Scissors, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  RefreshCw,
  Calendar,
  MousePointerClick,
  Percent,
  Lock,
  LogOut,
  AlertCircle,
  Play,
  FileSpreadsheet,
  Target,
  Zap
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

const BRANCH_TARGETS: Record<string, Record<string, { revenue: number, adsSpend: number, leads: number, showups: number }>> = {
  '2026-05': {
    'Đà Nẵng': { revenue: 2643447692, adsSpend: 700000000, leads: 1444, showups: 389 },
    'Nha Trang': { revenue: 1500000000, adsSpend: 400000000, leads: 800, showups: 200 },
    'Hồ Chí Minh': { revenue: 500000000, adsSpend: 150000000, leads: 300, showups: 80 },
    'BMT': { revenue: 400000000, adsSpend: 120000000, leads: 200, showups: 50 },
    'Long Xuyên': { revenue: 300000000, adsSpend: 90000000, leads: 150, showups: 40 }
  },
  '2026-04': {
    'Đà Nẵng': { revenue: 2500000000, adsSpend: 750000000, leads: 1400, showups: 380 },
    'Nha Trang': { revenue: 1400000000, adsSpend: 380000000, leads: 750, showups: 190 },
    'Hồ Chí Minh': { revenue: 480000000, adsSpend: 140000000, leads: 280, showups: 75 },
    'BMT': { revenue: 380000000, adsSpend: 110000000, leads: 190, showups: 45 },
    'Long Xuyên': { revenue: 280000000, adsSpend: 85000000, leads: 140, showups: 38 }
  }
};

function getDaysList(start: string, end: string): string[] {
  if (!start || !end) return [];
  const days: string[] = [];
  const [startY, startM, startD] = start.split('-').map(Number);
  const [endY, endM, endD] = end.split('-').map(Number);
  
  const curr = new Date(startY, startM - 1, startD);
  const last = new Date(endY, endM - 1, endD);
  
  while (curr <= last) {
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const d = String(curr.getDate()).padStart(2, '0');
    days.push(`${y}-${m}-${d}`);
    curr.setDate(curr.getDate() + 1);
  }
  return days;
}

const getBranchTarget = (branchName: string, dateStr: string, startDate?: string, endDate?: string) => {
  if (startDate && endDate) {
    const days = getDaysList(startDate, endDate);
    let totalRevenue = 0;
    let totalAdsSpend = 0;
    let totalLeads = 0;
    let totalShowups = 0;
    
    days.forEach(day => {
      const monthKey = day.substring(0, 7);
      const [yStr, mStr] = monthKey.split('-');
      const daysCount = new Date(parseInt(yStr), parseInt(mStr), 0).getDate();
      
      let monthTarget = BRANCH_TARGETS[monthKey]?.[branchName];
      if (!monthTarget) {
        const defaults: Record<string, { revenue: number, adsSpend: number, leads: number, showups: number }> = {
          'Đà Nẵng': { revenue: 2000000000, adsSpend: 600000000, leads: 1200, showups: 300 },
          'Nha Trang': { revenue: 700000000, adsSpend: 200000000, leads: 400, showups: 100 },
          'Hồ Chí Minh': { revenue: 400000000, adsSpend: 120000000, leads: 250, showups: 70 },
          'BMT': { revenue: 300000000, adsSpend: 100000000, leads: 180, showups: 40 },
        };
        monthTarget = defaults[branchName] || { revenue: 500000000, adsSpend: 150000000, leads: 300, showups: 80 };
      }
      
      totalRevenue += monthTarget.revenue / daysCount;
      totalAdsSpend += monthTarget.adsSpend / daysCount;
      totalLeads += monthTarget.leads / daysCount;
      totalShowups += monthTarget.showups / daysCount;
    });
    
    return {
      revenue: Math.round(totalRevenue),
      adsSpend: Math.round(totalAdsSpend),
      leads: Math.round(totalLeads),
      showups: Math.round(totalShowups)
    };
  }

  const monthKey = dateStr || '2026-05';
  if (BRANCH_TARGETS[monthKey] && BRANCH_TARGETS[monthKey][branchName]) {
    return BRANCH_TARGETS[monthKey][branchName];
  }
  
  const defaults: Record<string, { revenue: number, adsSpend: number, leads: number, showups: number }> = {
    'Đà Nẵng': { revenue: 2000000000, adsSpend: 600000000, leads: 1200, showups: 300 },
    'Nha Trang': { revenue: 700000000, adsSpend: 200000000, leads: 400, showups: 100 },
    'Hồ Chí Minh': { revenue: 400000000, adsSpend: 120000000, leads: 250, showups: 70 },
    'BMT': { revenue: 300000000, adsSpend: 100000000, leads: 180, showups: 40 },
  };
  return defaults[branchName] || { revenue: 500000000, adsSpend: 150000000, leads: 300, showups: 80 };
};

const OPERATOR_TARGETS: Record<string, Record<string, Record<string, { adsSpend: number, leads: number, revenue: number }>>> = {
  '2026-05': {
    'Đà Nẵng': {
      'HUẾ': { adsSpend: 343000000, leads: 708, revenue: 1295727497 },
      'BIN': { adsSpend: 231000000, leads: 517, revenue: 947313231 },
      'NHI': { adsSpend: 126000000, leads: 219, revenue: 400406965 },
      'THẮNG': { adsSpend: 90322580, leads: 150, revenue: 300000000 },
      'HỒNG': { adsSpend: 10000000, leads: 20, revenue: 40000000 },
      'TÀI': { adsSpend: 10000000, leads: 20, revenue: 40000000 }
    },
    'Nha Trang': {
      'HỒNG': { adsSpend: 168000000, leads: 279, revenue: 510510000 },
      'BIN': { adsSpend: 70000000, leads: 109, revenue: 200000000 },
      'HUẾ': { adsSpend: 94500000, leads: 277, revenue: 507000000 },
      'ĐỨC': { adsSpend: 20000000, leads: 50, revenue: 100000000 }
    }
  },
  '2026-04': {
    'Đà Nẵng': {
      'HUẾ': { adsSpend: 382500000, leads: 700, revenue: 1200000000 },
      'BIN': { adsSpend: 240000000, leads: 500, revenue: 900000000 },
      'NHI': { adsSpend: 127500000, leads: 200, revenue: 380000000 }
    },
    'Nha Trang': {
      'BIN': { adsSpend: 140000000, leads: 250, revenue: 500000000 },
      'HUẾ': { adsSpend: 240000000, leads: 450, revenue: 900000000 },
      'ĐỨC': { adsSpend: 20000000, leads: 40, revenue: 80000000 },
      'HỒNG': { adsSpend: 50000000, leads: 80, revenue: 150000000 }
    }
  }
};

const getOperatorTarget = (opName: string, branchName: string, dateStr: string, startDate?: string, endDate?: string) => {
  if (startDate && endDate) {
    const days = getDaysList(startDate, endDate);
    let totalRevenue = 0;
    let totalAdsSpend = 0;
    let totalLeads = 0;
    
    days.forEach(day => {
      const monthKey = day.substring(0, 7);
      const [yStr, mStr] = monthKey.split('-');
      const daysCount = new Date(parseInt(yStr), parseInt(mStr), 0).getDate();
      
      const monthMap = OPERATOR_TARGETS[monthKey] || OPERATOR_TARGETS['2026-05'];
      const branchMap = monthMap[branchName] || {};
      const opTarget = branchMap[opName.trim().toUpperCase()];
      
      if (opTarget) {
        totalRevenue += opTarget.revenue / daysCount;
        totalAdsSpend += opTarget.adsSpend / daysCount;
        totalLeads += opTarget.leads / daysCount;
      }
    });
    
    return {
      revenue: Math.round(totalRevenue),
      adsSpend: Math.round(totalAdsSpend),
      leads: Math.round(totalLeads)
    };
  }

  const monthKey = dateStr || '2026-05';
  const monthMap = OPERATOR_TARGETS[monthKey] || OPERATOR_TARGETS['2026-05'];
  const branchMap = monthMap[branchName] || {};
  const opTarget = branchMap[opName.trim().toUpperCase()];
  
  if (opTarget) {
    return opTarget;
  }
  
  return { adsSpend: 0, leads: 0, revenue: 0 };
};



let tokenClient: any = null;

// Helper: Custom CSV Parser to handle commas inside double quotes correctly
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentVal = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal);
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      row.push(currentVal);
      lines.push(row);
      row = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (row.length > 0 || currentVal !== '') {
    row.push(currentVal);
    lines.push(row);
  }
  return lines;
}

export default function App() {
  // --- AUTH & DATA STATES ---
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('dohyun_access_token');
  });
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return localStorage.getItem('dohyun_user_email');
  });
  const [authError, setAuthError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [records, setRecords] = useState<DailyRecord[]>([]);

  // Env variables
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const defaultSpreadsheetId = import.meta.env.VITE_SPREADSHEET_ID;
  const isClientIdPlaceholder = !clientId || clientId.includes('PLACEHOLDER');

  // --- DYNAMIC SPREADSHEET ID FROM URL QUERY PARAM (?sheetId=...) ---
  const spreadsheetId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSheetId = params.get('sheetId');
    if (urlSheetId && urlSheetId.trim().length > 10) {
      return urlSheetId.trim();
    }
    return defaultSpreadsheetId;
  }, [defaultSpreadsheetId]);

  // --- PARSE GOOGLE SHEETS ROWS ---
  const parseSheetsData = (rows: any[][]): DailyRecord[] => {
    if (!rows || rows.length <= 1) return [];
    
    const headers = rows[0].map(h => String(h).trim());
    const colIndex = (name: string, excludeName?: string) => {
      const target = name.toLowerCase().replace(/\s/g, '');
      const exclude = excludeName ? excludeName.toLowerCase().replace(/\s/g, '') : null;
      return headers.findIndex(h => {
        const val = h.toLowerCase().replace(/\s/g, '');
        if (exclude && val.includes(exclude)) return false;
        return val.includes(target);
      });
    };
    
    const idxDate = colIndex('ngày tháng') !== -1 ? colIndex('ngày tháng') : 0;
    const idxTeam = colIndex('team');
    const idxOperator = colIndex('người thực hiện');
    const idxBranch = colIndex('chi nhánh', 'ngày tháng');
    const idxBm = colIndex('bm');
    const idxService = colIndex('dịch vụ');
    const idxAdsSpend = colIndex('chi tiêu ads');
    const idxContacts = colIndex('người liên hệ');
    const idxComments = colIndex('bình luận');
    const idxEngagement = colIndex('tương tác');
    const idxLeads = colIndex('sđt');
    const idxCostLead = colIndex('giá cost \nsđt') !== -1 ? colIndex('giá cost \nsđt') : (colIndex('cost\nsđt') !== -1 ? colIndex('cost\nsđt') : colIndex('cost sđt'));
    const idxShowups = colIndex('khách đến');
    const idxCostShowup = colIndex('giá cost\n khách đến') !== -1 ? colIndex('giá cost\n khách đến') : colIndex('cost khách đến');
    const idxRevenue = colIndex('doanh số');
    const idxAdsRatio = colIndex('%ads');
    
    const parsedRecords: DailyRecord[] = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[idxDate] || !row[idxBranch]) continue;
      
      let dateStr = String(row[idxDate]).trim();
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
        if (str === '-' || str === 'd' || str === 'đ' || str === 'đ/sđt' || str === 'đ/khách') return 0;
        
        const isPercent = str.includes('%');
        const cleanStr = str.replace(/[^\d.,-]/g, '');
        let num = 0;
        if (cleanStr.includes('.') && !cleanStr.includes(',')) {
          const parts = cleanStr.split('.');
          if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
            num = parseFloat(cleanStr.replace(/\./g, ''));
          } else {
            num = parseFloat(cleanStr);
          }
        } else {
          num = parseFloat(cleanStr.replace(/,/g, ''));
        }
        
        if (isNaN(num)) return 0;
        return isPercent ? num / 100 : num;
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

  // --- INITIAL DATA LOAD (Direct Public CSV Fetch on mount) ---
  useEffect(() => {
    const tryPublicSync = async () => {
      setIsLoading(true);
      setAuthError('');
      try {
        // Try fetching Google Sheet CSV directly (works if the link sharing is set to "Anyone with link can view")
        const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&sheet=Daily`;
        const res = await fetch(url);
        
        if (!res.ok) {
          throw new Error('Tệp chưa được bật chia sẻ công khai.');
        }

        const csvText = await res.text();
        if (csvText.includes('google-site-verification') || csvText.includes('<!DOCTYPE html>') || csvText.includes('login')) {
          throw new Error('Tệp đang ở chế độ Riêng tư (Private). Yêu cầu đăng nhập Google.');
        }

        const rows = parseCSV(csvText);
        const parsed = parseSheetsData(rows);
        if (parsed.length > 0) {
          setRecords(parsed);
          setIsDemoMode(false);
          setIsLoading(false);
          return; // Success! Skip auth flow entirely.
        }
      } catch (err) {
        console.log('[Sync] Bảng tính Google Sheet ở chế độ riêng tư hoặc link lỗi. Chuyển sang xác thực Google.');
      }

      // If direct CSV fetch failed:
      // Try Google Sheets API OAuth fetch if we have an active access token
      if (accessToken) {
        try {
          // Fetch user info first to show which Gmail is logged in
          let email = userEmail;
          if (!email) {
            try {
              const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` }
              });
              if (infoRes.ok) {
                const info = await infoRes.json();
                email = info.email;
                if (email) {
                  localStorage.setItem('dohyun_user_email', email);
                  setUserEmail(email);
                }
              }
            } catch (e) {
              console.log('Không thể lấy thông tin email user:', e);
            }
          }

          // Step 1: Get spreadsheet metadata to find available sheet names
          const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
          const metadataRes = await fetch(metadataUrl, {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          });

          if (metadataRes.status === 401) {
            handleLogout();
            throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          }

          if (metadataRes.status === 403) {
            throw new Error('Bạn không có quyền truy cập vào Google Sheet này. Hãy chắc chắn tài khoản Gmail này đã được phân quyền xem trên Google Drive.');
          }

          if (!metadataRes.ok) {
            throw new Error(`Không thể đọc thông tin cấu trúc Google Sheet. Mã lỗi: ${metadataRes.status}`);
          }

          const metadata = await metadataRes.json();
          const sheets = metadata.sheets || [];
          if (sheets.length === 0) {
            throw new Error('Tệp Google Sheet này không chứa trang tính (tab) nào.');
          }

          // Step 2: Determine target sheet name (prefer 'Daily', then 'Dataimp', then any containing 'daily'/'data', fallback to first sheet)
          let targetSheetName = '';
          const sheetTitles = sheets.map((s: any) => s.properties?.title || '');
          
          const exactDaily = sheetTitles.find((t: string) => t === 'Daily');
          const exactDataimp = sheetTitles.find((t: string) => t === 'Dataimp');
          const containsDaily = sheetTitles.find((t: string) => t.toLowerCase().includes('daily'));
          const containsData = sheetTitles.find((t: string) => t.toLowerCase().includes('data'));
          
          if (exactDaily) {
            targetSheetName = exactDaily;
          } else if (exactDataimp) {
            targetSheetName = exactDataimp;
          } else if (containsDaily) {
            targetSheetName = containsDaily;
          } else if (containsData) {
            targetSheetName = containsData;
          } else {
            targetSheetName = sheetTitles[0]; // fallback to first sheet
          }

          // Step 3: Fetch values from the chosen sheet
          const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(targetSheetName)}`;
          const apiRes = await fetch(apiUrl, {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          });

          if (!apiRes.ok) {
            throw new Error(`Không thể lấy dữ liệu từ tab '${targetSheetName}'. Mã lỗi: ${apiRes.status}`);
          }

          const data = await apiRes.json();
          const parsed = parseSheetsData(data.values);
          setRecords(parsed);
          setIsDemoMode(false);
        } catch (err: any) {
          console.error('[Sync] Lỗi OAuth fetch:', err);
          setAuthError(err.message || 'Lỗi khi đồng bộ dữ liệu qua tài khoản Google.');
          setRecords([]);
        }
      } else {
        // No token, no public access -> default to demo mode or prompt login screen
        setRecords([]);
      }
      setIsLoading(false);
    };

    tryPublicSync();
  }, [accessToken, spreadsheetId]);

  // --- INITIALIZE GOOGLE OAUTH CLIENT SDK ---
  useEffect(() => {
    if (isClientIdPlaceholder) return;

    const initGsi = () => {
      if ((window as any).google && (window as any).google.accounts) {
        tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/userinfo.email openid',
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
    localStorage.removeItem('dohyun_user_email');
    setAccessToken(null);
    setUserEmail(null);
    setIsDemoMode(false);
  };

  const handleEnterDemo = () => {
    setRecords(localMockData as DailyRecord[]);
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
  // const [sortBy, setSortBy] = useState<keyof DailyRecord>('date');
  // const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  // @ts-ignore
  const [currentPage, setCurrentPage] = useState<number>(1);
  // const [pageSize, setPageSize] = useState<number>(10);

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

  const availableMonths = useMemo(() => {
    if (!records.length) return [];
    const monthsSet = new Set<string>(); // "2026-05", "2026-04", etc.
    records.forEach(r => {
      if (r.date && r.date.length >= 7) {
        monthsSet.add(r.date.substring(0, 7));
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [records]);

  // --- CUSTOM DATE RANGE PICKER STATES (Facebook Ads Manager Style) ---
  const [isDatePickerOpen, setIsDatePickerOpen] = useState<boolean>(false);
  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [selectedDetailBranch, setSelectedDetailBranch] = useState<string | null>(null);
  const [expandedOperator, setExpandedOperator] = useState<string | null>(null);

  useEffect(() => {
    setExpandedOperator(null);
  }, [selectedDetailBranch]);
  
  // Left calendar month state (Date object pointing to the first day of that month)
  const [leftCalendarMonth, setLeftCalendarMonth] = useState<Date>(() => {
    return new Date(2026, 4, 1); // Default to May 2026 since data is in 2026
  });

  // Jump to the latest available data month on load
  useEffect(() => {
    if (maxDate) {
      const maxDateObj = new Date(maxDate);
      setLeftCalendarMonth(new Date(maxDateObj.getFullYear(), maxDateObj.getMonth(), 1));
    }
  }, [maxDate]);

  const rightCalendarMonth = useMemo(() => {
    return new Date(leftCalendarMonth.getFullYear(), leftCalendarMonth.getMonth() + 1, 1);
  }, [leftCalendarMonth]);

  const handlePrevMonth = () => {
    setLeftCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setLeftCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDayClick = (dateStr: string) => {
    if (!tempStartDate || (tempStartDate && tempEndDate)) {
      setTempStartDate(dateStr);
      setTempEndDate('');
    } else {
      if (dateStr < tempStartDate) {
        setTempStartDate(dateStr);
      } else {
        setTempEndDate(dateStr);
      }
    }
  };

  const applyPreset = (preset: string) => {
    const today = new Date(); // Systems says today is 2026-05-26
    let start = '';
    let end = '';
    
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (preset.startsWith('month:')) {
      const cleaned = preset.replace('-', ':'); // support "month:2026-05" -> "month:2026:05"
      const parts = cleaned.split(':'); // ["month", "2026", "05"]
      const year = parseInt(parts[1]);
      const month = parseInt(parts[2]);
      
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      
      start = formatDate(firstDay);
      end = formatDate(lastDay);
    } else {
      switch (preset) {
        case 'today':
          start = formatDate(today);
          end = formatDate(today);
          break;
        case 'yesterday': {
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          start = formatDate(yesterday);
          end = formatDate(yesterday);
          break;
        }
        case 'todayAndYesterday': {
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          start = formatDate(yesterday);
          end = formatDate(today);
          break;
        }
        case 'last7': {
          const startD = new Date(today);
          startD.setDate(today.getDate() - 6);
          start = formatDate(startD);
          end = formatDate(today);
          break;
        }
        case 'last14': {
          const startD = new Date(today);
          startD.setDate(today.getDate() - 13);
          start = formatDate(startD);
          end = formatDate(today);
          break;
        }
        case 'last28': {
          const startD = new Date(today);
          startD.setDate(today.getDate() - 27);
          start = formatDate(startD);
          end = formatDate(today);
          break;
        }
        case 'last30': {
          const startD = new Date(today);
          startD.setDate(today.getDate() - 29);
          start = formatDate(startD);
          end = formatDate(today);
          break;
        }
        case 'thisWeek': {
          const currentDay = today.getDay();
          const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
          const monday = new Date(today);
          monday.setDate(today.getDate() - distanceToMonday);
          start = formatDate(monday);
          end = formatDate(today);
          break;
        }
        case 'lastWeek': {
          const currentDay = today.getDay();
          const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
          const lastMonday = new Date(today);
          lastMonday.setDate(today.getDate() - distanceToMonday - 7);
          const lastSunday = new Date(lastMonday);
          lastSunday.setDate(lastMonday.getDate() + 6);
          start = formatDate(lastMonday);
          end = formatDate(lastSunday);
          break;
        }
        case 'thisMonth': {
          const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
          start = formatDate(firstDay);
          end = formatDate(today);
          break;
        }
        case 'lastMonth': {
          const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
          start = formatDate(firstDay);
          end = formatDate(lastDay);
          break;
        }
        case 'allTime':
          start = minDate || '';
          end = maxDate || '';
          break;
        default:
          break;
      }
    }
    
    setTempStartDate(start);
    setTempEndDate(end);
    
    if (end) {
      const endDateObj = new Date(end);
      setLeftCalendarMonth(new Date(endDateObj.getFullYear(), endDateObj.getMonth(), 1));
    }
  };

  const getDateRangeLabel = () => {
    if (!startDate && !endDate) return 'Tối đa';
    
    const formatDisplay = (str: string) => {
      if (!str) return '';
      const parts = str.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    if (startDate === endDate) {
      return `Ngày: ${formatDisplay(startDate)}`;
    }
    return `${formatDisplay(startDate)} - ${formatDisplay(endDate)}`;
  };

  const handleUpdateDateRange = () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate || tempStartDate);
    setIsDatePickerOpen(false);
    setCurrentPage(1);
  };

  const handleCancelDateRange = () => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    setIsDatePickerOpen(false);
  };

  const getActivePreset = () => {
    const today = new Date();
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = formatDate(today);
    
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    const firstThisMonth = formatDate(new Date(today.getFullYear(), today.getMonth(), 1));

    if (tempStartDate === yesterdayStr && tempEndDate === yesterdayStr) return 'yesterday';
    if (tempStartDate === firstThisMonth && tempEndDate === todayStr) return 'thisMonth';
    if (tempStartDate === minDate && tempEndDate === maxDate) return 'allTime';

    // Check dynamic months
    for (const m of availableMonths) {
      const [y, mm] = m.split('-');
      const year = parseInt(y);
      const month = parseInt(mm);
      const firstDayStr = `${y}-${mm}-01`;
      const lastDay = new Date(year, month, 0);
      const lastDayStr = `${y}-${mm}-${String(lastDay.getDate()).padStart(2, '0')}`;
      
      if (tempStartDate === firstDayStr && tempEndDate === lastDayStr) {
        return `month:${m}`;
      }
    }

    return '';
  };

  // Sync temp state with actual state when actual state changes
  useEffect(() => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
  }, [startDate, endDate]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const renderCalendarMonth = (monthDate: Date, isLeft: boolean) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth(); // 0-indexed
    
    // Get first day of the month (0: Sunday, 1: Monday, ...)
    const firstDayIndex = new Date(year, month, 1).getDay();
    
    // Get number of days in the month
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    
    // Empty cells before the first day of the month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day-cell empty" />);
    }
    
    // Render days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isSelectedStart = tempStartDate === dateStr;
      const isSelectedEnd = tempEndDate === dateStr;
      const isInRange = tempStartDate && tempEndDate && dateStr > tempStartDate && dateStr < tempEndDate;
      const isInHoverRange = tempStartDate && !tempEndDate && hoveredDate && dateStr > tempStartDate && dateStr <= hoveredDate;
      const isDayDisabled = (minDate && dateStr < minDate) || (maxDate && dateStr > maxDate);
      
      let cellClass = 'calendar-day-cell';
      if (isSelectedStart) cellClass += ' selected-start';
      if (isSelectedEnd) cellClass += ' selected-end';
      if (isInRange) cellClass += ' in-range';
      if (isInHoverRange) cellClass += ' in-hover-range';
      if (isDayDisabled) cellClass += ' disabled';
      
      days.push(
        <div
          key={`day-${d}`}
          className={cellClass}
          onClick={() => !isDayDisabled && handleDayClick(dateStr)}
          onMouseEnter={() => !isDayDisabled && !tempEndDate && setHoveredDate(dateStr)}
        >
          {d}
        </div>
      );
    }
    
    const monthName = `Tháng ${month + 1}`;
    
    return (
      <div className="calendar-month">
        <div className="calendar-header">
          {isLeft ? (
            <button type="button" className="calendar-nav-btn" onClick={handlePrevMonth} aria-label="Tháng trước">
              <ChevronLeft size={16} />
            </button>
          ) : <div />}
          <span>{monthName} {year}</span>
          {!isLeft ? (
            <button type="button" className="calendar-nav-btn" onClick={handleNextMonth} aria-label="Tháng sau">
              <ChevronRight size={16} />
            </button>
          ) : <div />}
        </div>
        <div className="calendar-weekdays">
          {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(wd => (
            <div key={wd}>{wd}</div>
          ))}
        </div>
        <div className="calendar-grid" onMouseLeave={() => setHoveredDate(null)}>
          {days}
        </div>
      </div>
    );
  };

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
  /*
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
  */

  /* Comment out unused pagination logic
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
  */

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

  // --- BRANCH RANKING ---
  const branchRanking = useMemo(() => {
    const grouped: { [b: string]: { name: string; revenue: number; adsSpend: number; leads: number } } = {};
    filteredData.forEach(r => {
      const b = r.branch || 'Khác';
      if (!grouped[b]) grouped[b] = { name: b, revenue: 0, adsSpend: 0, leads: 0 };
      grouped[b].revenue += r.revenue;
      grouped[b].adsSpend += r.ads_spend;
      grouped[b].leads += r.leads;
    });
    return Object.values(grouped).sort((a, b) => b.revenue - a.revenue);
  }, [filteredData]);

  const serviceRanking = useMemo(() => {
    const grouped: { [s: string]: { name: string; revenue: number; leads: number } } = {};
    filteredData.forEach(r => {
      const s = r.service || 'Khác';
      if (!grouped[s]) grouped[s] = { name: s, revenue: 0, leads: 0 };
      grouped[s].revenue += r.revenue;
      grouped[s].leads += r.leads;
    });
    return Object.values(grouped).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [filteredData]);

  const maxServiceRevenue = serviceRanking[0]?.revenue || 1;

  // avg ads ratio
  const avgAdsRatio = useMemo(() => {
    return metrics.revenue > 0 ? (metrics.adsSpend / metrics.revenue) * 100 : 0;
  }, [metrics]);

  // --- RENDER LOADER ---
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Đang tải dữ liệu từ Google Sheets...</p>
      </div>
    );
  }

  // --- RENDER LOGIN SCREEN IF NOT AUTHENTICATED & NO PUBLIC DATA ---
  if (records.length === 0 && !isDemoMode) {
    return (
      <div className="login-screen-container">
        <div className="login-box">
          <div className="login-header">
            <div className="login-logo-icon">DH</div>
            <h1 className="login-title">DOHYUN GROUP</h1>
            <p className="login-subtitle">Hệ thống phân tích dữ liệu Marketing & Doanh số nội bộ</p>
          </div>

          <div className="login-card-body">
            {authError && (
              <div className="alert alert-danger" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                  <AlertCircle size={16} />
                  <span>Không thể tải dữ liệu</span>
                </div>
                <p style={{ fontSize: '12px', marginTop: '6px', lineHeight: 1.4 }}>{authError}</p>
                <p style={{ fontSize: '10px', marginTop: '6px', opacity: 0.7, wordBreak: 'break-all' }}>
                  ID bảng tính đang gọi: <code style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '4px' }}>{spreadsheetId}</code>
                </p>
              </div>
            )}

            {accessToken && userEmail && (
              <div className="alert alert-info">
                <span style={{ opacity: 0.8 }}>Gmail đang kết nối:</span>
                <strong>{userEmail}</strong>
              </div>
            )}

            <div className="alert alert-warning" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                <AlertCircle size={16} />
                <span>Báo cáo bảo mật nội bộ</span>
              </div>
              <p style={{ fontSize: '12px', marginTop: '6px', opacity: 0.85, lineHeight: 1.5 }}>
                Chỉ những tài khoản Gmail đã được phân quyền mới xem được báo cáo này.
              </p>
            </div>

            {isClientIdPlaceholder ? (
              <div className="config-warning-box">
                <div className="warning-header">
                  <AlertCircle size={18} />
                  <h3>Chưa cấu hình Google Client ID</h3>
                </div>
                <p className="warning-desc">
                  Vui lòng thêm mã <code>VITE_GOOGLE_CLIENT_ID</code> vào Settings Secrets trên GitHub.
                </p>
              </div>
            ) : null}

            <div className="login-actions">
              <button type="button" className="btn btn-primary btn-login" onClick={handleLogin} disabled={isClientIdPlaceholder}>
                <Lock size={16} /> Đăng Nhập Với Google
              </button>
              {accessToken && (
                <button type="button" className="btn btn-secondary btn-logout-switch" onClick={handleLogout}>
                  <LogOut size={16} /> Đăng Xuất / Đổi Tài Khoản
                </button>
              )}
              <button type="button" className="btn btn-secondary btn-demo" onClick={handleEnterDemo}>
                <Play size={16} /> Xem Dữ Liệu Mẫu (Demo)
              </button>
            </div>
          </div>
          <div className="login-footer">
            <p>© 2026 Dohyun Group · Hệ thống nội bộ bảo mật</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">

      {/* ── HEADER ────────────────────────────────────────── */}
      <header className="dashboard-header">
        <div className="header-title-container">
          <div className="logo-badge">DOHYUN</div>
          <div>
            <h1 className="header-title">DOHYUN GROUP</h1>
            <p className="header-subtitle">
              {isDemoMode ? '⚠️ Chế độ dữ liệu mẫu (Demo)' : '🟢 Live — Đồng bộ Google Sheets'}
              {!isDemoMode && userEmail && <span style={{ marginLeft: 8, opacity: 0.6 }}>· {userEmail}</span>}
            </p>
          </div>
        </div>
        <div className="header-meta">
          {records.length > 0 && (
            <span className="meta-badge"><Calendar size={13} />{minDate} → {maxDate}</span>
          )}
          {!isDemoMode && <span className="meta-badge pulse-badge">Live Secured</span>}
          {(accessToken || isDemoMode) && (
            <button type="button" className="btn btn-secondary btn-logout" onClick={handleLogout}>
              <LogOut size={13} /> {isDemoMode ? 'Đăng nhập' : 'Đăng xuất'}
            </button>
          )}
        </div>
      </header>



      <section className="filter-panel" id="filters">
        {/* Row 1: Chi Nhánh Chips */}
        <div className="filter-chips-group">
          <span className="chips-label"><Building2 size={14} /> Chi Nhánh:</span>
          <div className="chips-container">
            {uniqueBranches.map(b => (
              <button
                key={b}
                type="button"
                className={`filter-chip ${selectedBranch === b ? 'active' : ''}`}
                onClick={() => { setSelectedBranch(b); setCurrentPage(1); }}
              >
                {b === 'All' ? 'Tất cả Chi Nhánh' : b}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Team Chips */}
        <div className="filter-chips-group" style={{ marginTop: '12px' }}>
          <span className="chips-label"><User size={14} /> Team:</span>
          <div className="chips-container">
            {uniqueTeams.map(t => (
              <button
                key={t}
                type="button"
                className={`filter-chip ${selectedTeam === t ? 'active' : ''}`}
                onClick={() => { setSelectedTeam(t); setCurrentPage(1); }}
              >
                {t === 'All' ? 'Tất cả Team' : t}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-divider" />

        <div className="filter-grid" style={{ marginTop: '12px' }}>
          <div className="filter-group">
            <label htmlFor="service-select">Dịch Vụ</label>
            <div className="select-wrapper">
              <Scissors size={15} className="select-icon" />
              <select id="service-select" value={selectedService} onChange={e => { setSelectedService(e.target.value); setCurrentPage(1); }}>
                {uniqueServices.map(s => <option key={s} value={s}>{s === 'All' ? 'Tất cả Dịch Vụ' : s}</option>)}
              </select>
            </div>
          </div>
          <div className="filter-group date-picker-group" ref={datePickerRef}>
            <label>Khoảng ngày</label>
            <div className="datepicker-trigger" onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}>
              <Calendar size={15} className="select-icon" />
              <span className="datepicker-trigger-text">{getDateRangeLabel()}</span>
              <ChevronDown size={15} className="chevron-icon" />
            </div>

            {isDatePickerOpen && (
              <div className="datepicker-popover glassmorphic-panel">
                <div className="datepicker-popover-body">
                  {/* Cột trái: presets */}
                  <div className="datepicker-sidebar">
                    <div className="sidebar-section-title">Đã dùng mới đây</div>
                    <button type="button" className={`preset-btn ${getActivePreset() === 'yesterday' ? 'active' : ''}`} onClick={() => applyPreset('yesterday')}>Hôm qua</button>
                    <button type="button" className={`preset-btn ${getActivePreset() === 'thisMonth' ? 'active' : ''}`} onClick={() => applyPreset('thisMonth')}>Tháng này</button>
                    <button type="button" className={`preset-btn ${getActivePreset() === 'allTime' ? 'active' : ''}`} onClick={() => applyPreset('allTime')}>Tối đa</button>
                    
                    <div className="sidebar-divider" />
                    <div className="sidebar-section-title">Chọn theo tháng</div>
                    
                    {availableMonths.map(m => {
                      const parts = m.split('-'); // ["2026", "05"]
                      const label = `Tháng ${parseInt(parts[1])} / ${parts[0]}`;
                      const activeKey = `month:${m}`;
                      return (
                        <button
                          key={m}
                          type="button"
                          className={`preset-btn ${getActivePreset() === activeKey ? 'active' : ''}`}
                          onClick={() => applyPreset(`month:${m}`)}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Cột phải: calendars */}
                  <div className="datepicker-main">
                    <div className="calendars-container">
                      {renderCalendarMonth(leftCalendarMonth, true)}
                      {renderCalendarMonth(rightCalendarMonth, false)}
                    </div>

                    <div className="datepicker-footer">
                      <div className="timezone-text">Ngày hiển thị theo Asia/Ho_Chi_Minh</div>
                      <div className="datepicker-actions-row">
                        <div className="date-inputs-preview">
                          <input 
                            type="text" 
                            className="preview-date-input" 
                            value={tempStartDate ? tempStartDate.split('-').reverse().join('/') : ''} 
                            placeholder="Từ ngày"
                            readOnly 
                          />
                          <span className="separator">-</span>
                          <input 
                            type="text" 
                            className="preview-date-input" 
                            value={tempEndDate ? tempEndDate.split('-').reverse().join('/') : ''} 
                            placeholder="Đến ngày"
                            readOnly 
                          />
                        </div>
                        <div className="btn-actions-group">
                          <button type="button" className="btn btn-secondary btn-cancel" onClick={handleCancelDateRange}>Hủy</button>
                          <button type="button" className="btn btn-primary btn-apply" onClick={handleUpdateDateRange}>Cập nhật</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="filter-group">
            <label htmlFor="search-input">Tìm kiếm</label>
            <div className="search-wrapper">
              <Search size={15} className="search-icon" />
              <input type="text" id="search-input" placeholder="Operator, BM, dịch vụ..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
            </div>
          </div>
        </div>
        <div className="filter-actions">
          <span className="results-count">Hiển thị <strong>{filteredData.length}</strong> bản ghi</span>
          <div className="action-buttons-group">
            <a href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`} target="_blank" rel="noreferrer" className="btn btn-secondary">
              <FileSpreadsheet size={14} /> Mở Sheet
            </a>
            <button type="button" id="clear-filters-btn" className="btn btn-secondary" onClick={handleResetFilters}>
              <RefreshCw size={14} /> Xóa Lọc
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
           CEO VIEW
      ══════════════════════════════════════════ */}
      <>
      <p className="section-title">Tổng Quan Tài Chính</p>
      <section className="kpi-grid-top">

        {/* 1. Doanh số */}
        <div className="kpi-hero kpi-hero-revenue">
          <div className="kpi-hero-top">
            <span className="kpi-hero-label">Tổng Doanh Số</span>
            <div className="kpi-hero-icon icon-emerald"><TrendingUp size={18} /></div>
          </div>
          <div className="kpi-hero-value c-emerald">{formatCurrency(metrics.revenue)}</div>
          <div className="kpi-hero-sub">
            Lợi nhuận từ Ads
            <span className={`sub-tag ${metrics.roas >= 2 ? 'sub-tag-good' : metrics.roas >= 1 ? 'sub-tag-warn' : 'sub-tag-bad'}`}>
              ROAS {metrics.roas.toFixed(1)}x
            </span>
          </div>
        </div>

        {/* 2. Chi tiêu Ads */}
        <div className="kpi-hero kpi-hero-ads">
          <div className="kpi-hero-top">
            <span className="kpi-hero-label">Chi Tiêu Ads</span>
            <div className="kpi-hero-icon icon-blue"><DollarSign size={18} /></div>
          </div>
          <div className="kpi-hero-value c-blue">{formatCurrency(metrics.adsSpend)}</div>
          <div className="kpi-hero-sub">
            Ngân sách quảng cáo
            <span className={`sub-tag ${avgAdsRatio <= 15 ? 'sub-tag-good' : avgAdsRatio <= 25 ? 'sub-tag-warn' : 'sub-tag-bad'}`}>
              {avgAdsRatio.toFixed(1)}% DS
            </span>
          </div>
        </div>

        {/* 3. ROAS */}
        <div className="kpi-hero kpi-hero-roas">
          <div className="kpi-hero-top">
            <span className="kpi-hero-label">ROAS</span>
            <div className="kpi-hero-icon icon-violet"><Zap size={18} /></div>
          </div>
          <div className={`kpi-hero-value ${metrics.roas >= 2 ? 'c-good' : metrics.roas >= 1 ? 'c-warn' : 'c-bad'}`}>
            {metrics.roas.toFixed(2)}x
          </div>
          <div className="kpi-hero-sub">
            Doanh số / Chi phí Ads
            <span className={`sub-tag ${metrics.roas >= 2 ? 'sub-tag-good' : metrics.roas >= 1 ? 'sub-tag-warn' : 'sub-tag-bad'}`}>
              {metrics.roas >= 2 ? 'Tốt' : metrics.roas >= 1 ? 'Trung bình' : 'Cần cải thiện'}
            </span>
          </div>
        </div>

        {/* 4. %Ads/Doanh số */}
        <div className="kpi-hero kpi-hero-ads-pct">
          <div className="kpi-hero-top">
            <span className="kpi-hero-label">%Ads / Doanh Số</span>
            <div className="kpi-hero-icon icon-amber"><Percent size={18} /></div>
          </div>
          <div className={`kpi-hero-value ${avgAdsRatio <= 15 ? 'c-good' : avgAdsRatio <= 25 ? 'c-warn' : 'c-bad'}`}>
            {avgAdsRatio.toFixed(1)}%
          </div>
          <div className="kpi-hero-sub">
            Benchmark ngành &lt;15%
            <span className={`sub-tag ${avgAdsRatio <= 15 ? 'sub-tag-good' : avgAdsRatio <= 25 ? 'sub-tag-warn' : 'sub-tag-bad'}`}>
              {avgAdsRatio <= 15 ? 'Hiệu quả' : avgAdsRatio <= 25 ? 'Cần tối ưu' : 'Cao'}
            </span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
           CEO VIEW — ROW 2: Marketing Funnel KPIs
      ══════════════════════════════════════════ */}
      <p className="section-title">Phễu Marketing</p>
      <section className="kpi-grid-funnel">
        <div className="kpi-funnel">
          <div className="kpi-funnel-icon icon-blue"><Users size={20} /></div>
          <div className="kpi-funnel-body">
            <span className="kpi-funnel-label">Tổng Leads (SĐT)</span>
            <span className="kpi-funnel-value c-blue">{formatNumber(metrics.leads)}</span>
            <span className="kpi-funnel-sub">Chi phí/Lead: {formatCurrency(metrics.costPerLead)}</span>
          </div>
        </div>
        <div className="kpi-funnel">
          <div className="kpi-funnel-icon icon-violet"><MousePointerClick size={20} /></div>
          <div className="kpi-funnel-body">
            <span className="kpi-funnel-label">Khách Đến (Show-up)</span>
            <span className="kpi-funnel-value c-violet">{formatNumber(metrics.showups)}</span>
            <span className="kpi-funnel-sub">Tỷ lệ: {metrics.leadToShowupRate.toFixed(1)}% · Cost: {formatCurrency(metrics.costPerShowup)}</span>
          </div>
        </div>
        <div className="kpi-funnel">
          <div className="kpi-funnel-icon icon-emerald"><Target size={20} /></div>
          <div className="kpi-funnel-body">
            <span className="kpi-funnel-label">Doanh Số / Khách Đến</span>
            <span className="kpi-funnel-value c-emerald">
              {metrics.showups > 0 ? formatCurrency(metrics.revenue / metrics.showups) : '—'}
            </span>
            <span className="kpi-funnel-sub">Revenue per show-up</span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
           CEO VIEW — ROW 3: Trend + Branch Ranking
      ══════════════════════════════════════════ */}
      {records.length > 0 && (
        <>
          <p className="section-title">Hiệu Suất Chi Nhánh</p>
          <section className="kpi-grid-funnel" style={{ marginTop: '8px', marginBottom: '24px' }}>
            {branchRanking.map((item, i) => (
              <div 
                key={item.name} 
                className={`kpi-funnel clickable-branch-row ${selectedDetailBranch === item.name ? 'active-branch' : ''}`}
                onClick={() => setSelectedDetailBranch(selectedDetailBranch === item.name ? null : item.name)}
                style={{ cursor: 'pointer' }}
              >
                <div className={`kpi-funnel-icon ${i === 0 ? 'icon-amber' : i === 1 ? 'icon-blue' : i === 2 ? 'icon-violet' : 'icon-cyan'}`}>
                  <span style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 16 }}>{i + 1}</span>
                </div>
                <div className="kpi-funnel-body">
                  <span className="kpi-funnel-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{item.name}</strong>
                    <span className="view-detail-link">chi tiết →</span>
                  </span>
                  <span className="kpi-funnel-value c-emerald">{formatCurrency(item.revenue)}</span>
                  <span className="kpi-funnel-sub">
                    Ads: <strong>{formatCurrency(item.adsSpend)}</strong> · SĐT: <strong>{formatNumber(item.leads)}</strong>
                  </span>
                </div>
              </div>
            ))}
          </section>

          <p className="section-title">Xu Hướng Doanh Số & Chi Phí</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
            {/* Trend Chart */}
            <div className="chart-card">
              <div className="chart-header">
                <h2 className="chart-title">Doanh Số & Chi Phí Ads Theo Ngày</h2>
                <span className="chart-tag">Trend</span>
              </div>
              <div className="chart-body">
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gAds" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f9cf9" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#4f9cf9" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="date" stroke="#4a5568" fontSize={11} tickLine={false} />
                    <YAxis stroke="#4a5568" fontSize={11} tickLine={false} tickFormatter={v => `${(v/1e6).toFixed(0)}M`} />
                    <Tooltip contentStyle={{ backgroundColor: '#0d1428', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }} labelStyle={{ color: '#f0f4ff', fontWeight: '700' }} formatter={(v: number) => [formatCurrency(v), '']} />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />
                    <Area name="Doanh Số" type="monotone" dataKey="revenue" stroke="#34d399" strokeWidth={2} fill="url(#gRevenue)" />
                    <Area name="Chi Tiêu Ads" type="monotone" dataKey="adsSpend" stroke="#4f9cf9" strokeWidth={2} fill="url(#gAds)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════
               CEO VIEW — ROW 4: Service + Team + Pie
          ══════════════════════════════════════════ */}
          <p className="section-title">Phân Tích Dịch Vụ & Team</p>
          <div className="charts-row-3">
            {/* Service Ranking */}
            <div className="chart-card">
              <div className="chart-header">
                <h2 className="chart-title">Top Dịch Vụ</h2>
                <span className="chart-tag">Doanh số</span>
              </div>
              <div className="chart-body" style={{ minHeight: 'auto' }}>
                <div className="ranking-list">
                  {serviceRanking.map((item, i) => (
                    <div key={item.name} className="ranking-item">
                      <div className={`rank-num ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-other'}`}>{i + 1}</div>
                      <div className="rank-bar-wrap">
                        <div className="rank-label">
                          <span className="rank-name">{item.name || 'Khác'}</span>
                          <span className="rank-value" style={{ color: 'var(--violet)' }}>{formatCurrency(item.revenue)}</span>
                        </div>
                        <div className="rank-bar-bg">
                          <div className="rank-bar-fill" style={{ width: `${(item.revenue / maxServiceRevenue) * 100}%`, background: 'var(--violet)' }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Team Chart */}
            <div className="chart-card">
              <div className="chart-header">
                <h2 className="chart-title">Hiệu Suất Team</h2>
                <span className="chart-tag">Doanh số vs Ads</span>
              </div>
              <div className="chart-body">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={teamChartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="#4a5568" fontSize={11} tickLine={false} />
                    <YAxis stroke="#4a5568" fontSize={11} tickLine={false} tickFormatter={v => `${(v/1e6).toFixed(0)}M`} />
                    <Tooltip contentStyle={{ backgroundColor: '#0d1428', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }} formatter={(v: number) => [formatCurrency(v), '']} />
                    <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: 12 }} />
                    <Bar name="Doanh Số" dataKey="revenue" fill="#34d399" radius={[4,4,0,0]} />
                    <Bar name="Chi Tiêu Ads" dataKey="adsSpend" fill="#fbbf24" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Branch Pie */}
            <div className="chart-card">
              <div className="chart-header">
                <h2 className="chart-title">Cơ Cấu Doanh Số</h2>
                <span className="chart-tag">Chi nhánh %</span>
              </div>
              <div className="chart-body flex-center">
                {branchChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={branchChartData} cx="50%" cy="44%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                        {branchChartData.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0d1428', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }} formatter={(v: number) => [formatCurrency(v), 'Doanh Số']} />
                      <Legend verticalAlign="bottom" height={36} layout="horizontal" wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="no-data">Không có dữ liệu</div>}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bảng Nhật Ký Chi Tiết đã được ẩn theo yêu cầu */}
      </>

      {/* ══════════════════════════════════════════
           ACCORDION DRAWER FOR BRANCH DETAILS (Layer 2 & Layer 3)
      ══════════════════════════════════════════ */}
      {selectedDetailBranch && (() => {
        const real = (() => {
          const branchRecords = records.filter(r => {
            if (r.branch !== selectedDetailBranch) return false;
            if (startDate && r.date < startDate) return false;
            if (endDate && r.date > endDate) return false;
            return true;
          });

          let adsSpend = 0, leads = 0, showups = 0, revenue = 0;
          branchRecords.forEach(r => {
            adsSpend += r.ads_spend;
            leads += r.leads;
            showups += r.showups;
            revenue += r.revenue;
          });

          return { adsSpend, leads, showups, revenue, records: branchRecords };
        })();

        const actualStart = startDate || minDate;
        const actualEnd = endDate || maxDate;
        const targetMonthStr = startDate ? startDate.substring(0, 7) : '2026-05';
        const target = getBranchTarget(selectedDetailBranch, targetMonthStr, actualStart, actualEnd);

        const formatPercent = (val: number, base: number) => {
          if (!base) return '0.0%';
          return `${((val / base) * 100).toFixed(1)}%`;
        };

        const getProgressWidth = (val: number, base: number) => {
          if (!base) return '0%';
          return `${Math.min(100, (val / base) * 100)}%`;
        };

        const staffData = (() => {
          const operatorMap: Record<string, { name: string, team: string, service: string, adsSpend: number, leads: number, showups: number, revenue: number }> = {};
          
          real.records.forEach(r => {
            const op = r.operator || 'Chưa rõ';
            if (!operatorMap[op]) {
              operatorMap[op] = {
                name: op,
                team: r.team || 'Chưa rõ',
                service: r.service || 'Chưa rõ',
                adsSpend: 0,
                leads: 0,
                showups: 0,
                revenue: 0
              };
            }
            operatorMap[op].adsSpend += r.ads_spend;
            operatorMap[op].leads += r.leads;
            operatorMap[op].showups += r.showups;
            operatorMap[op].revenue += r.revenue;
          });

          return Object.values(operatorMap).sort((a, b) => b.revenue - a.revenue);
        })();

        return (
          <div className="branch-drawer-overlay" onClick={() => setSelectedDetailBranch(null)}>
            <div className="branch-drawer" onClick={e => e.stopPropagation()}>
              <div className="drawer-header">
                <div>
                  <h2 className="drawer-title">Chi Tiết Chi Nhánh: {selectedDetailBranch}</h2>
                  <p className="drawer-subtitle">
                    Tháng mục tiêu: {targetMonthStr.split('-').reverse().join('/')} &nbsp;·&nbsp;&nbsp;
                    {startDate ? startDate.split('-').reverse().join('/') : ''} - {endDate ? endDate.split('-').reverse().join('/') : ''}
                  </p>
                </div>
                <button type="button" className="btn-close-drawer" onClick={() => setSelectedDetailBranch(null)}>×</button>
              </div>

              <div className="drawer-body">
                {/* Layer 2: Targets & Progress */}
                <div className="drawer-section">
                  <h3 className="section-subtitle">Lớp 2: Tiến Độ Mục Tiêu Chi Nhánh</h3>
                  <div className="progress-grid">
                    {/* Doanh số */}
                    <div className="progress-card">
                      <div className="progress-card-header">
                        <span className="card-lbl">Doanh Số</span>
                        <span className={`card-pct ${real.revenue >= target.revenue ? 'c-emerald' : 'c-rose'}`}>{formatPercent(real.revenue, target.revenue)}</span>
                      </div>
                      <div className="progress-card-bar">
                        <div className={`progress-bar-fill ${real.revenue >= target.revenue ? 'fill-emerald' : 'fill-rose'}`} style={{ width: getProgressWidth(real.revenue, target.revenue) }} />
                      </div>
                      <div className="progress-card-info">
                        <span>Thực tế: <strong>{formatCurrency(real.revenue)}</strong></span>
                        <span>Mục tiêu: {formatCurrency(target.revenue)}</span>
                      </div>
                    </div>

                    {/* Ngân sách ads */}
                    <div className="progress-card">
                      <div className="progress-card-header">
                        <span className="card-lbl">Chi Ads / Ngân Sách</span>
                        <span className={`card-pct ${real.adsSpend > target.adsSpend ? 'c-rose' : 'c-emerald'}`}>{formatPercent(real.adsSpend, target.adsSpend)}</span>
                      </div>
                      <div className="progress-card-bar">
                        <div className={`progress-bar-fill ${real.adsSpend > target.adsSpend ? 'fill-rose' : 'fill-emerald'}`} style={{ width: getProgressWidth(real.adsSpend, target.adsSpend) }} />
                      </div>
                      <div className="progress-card-info">
                        <span>Thực tế: <strong>{formatCurrency(real.adsSpend)}</strong></span>
                        <span>Hạn mức: {formatCurrency(target.adsSpend)}</span>
                      </div>
                    </div>

                    {/* Leads */}
                    <div className="progress-card">
                      <div className="progress-card-header">
                        <span className="card-lbl">SĐT (Leads)</span>
                        <span className={`card-pct ${real.leads >= target.leads ? 'c-emerald' : 'c-rose'}`}>{formatPercent(real.leads, target.leads)}</span>
                      </div>
                      <div className="progress-card-bar">
                        <div className={`progress-bar-fill ${real.leads >= target.leads ? 'fill-emerald' : 'fill-rose'}`} style={{ width: getProgressWidth(real.leads, target.leads) }} />
                      </div>
                      <div className="progress-card-info">
                        <span>Thực tế: <strong>{real.leads}</strong></span>
                        <span>Mục tiêu: {target.leads}</span>
                      </div>
                    </div>

                    {/* Show-up */}
                    <div className="progress-card">
                      <div className="progress-card-header">
                        <span className="card-lbl">Khách Đến (Showup)</span>
                        <span className={`card-pct ${real.showups >= target.showups ? 'c-emerald' : 'c-rose'}`}>{formatPercent(real.showups, target.showups)}</span>
                      </div>
                      <div className="progress-card-bar">
                        <div className={`progress-bar-fill ${real.showups >= target.showups ? 'fill-emerald' : 'fill-rose'}`} style={{ width: getProgressWidth(real.showups, target.showups) }} />
                      </div>
                      <div className="progress-card-info">
                        <span>Thực tế: <strong>{real.showups}</strong></span>
                        <span>Mục tiêu: {target.showups}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Layer 3: Staff details */}
                <div className="drawer-section staff-section">
                  <h3 className="section-subtitle">Lớp 3: Hiệu Suất Từng Nhân Sự</h3>
                  <div className="table-responsive">
                    <table className="custom-table staff-table">
                      <thead>
                        <tr>
                          <th>Nhân sự</th>
                          <th>Team</th>
                          <th className="text-right">Chi Ads</th>
                          <th className="text-right">Leads</th>
                          <th className="text-right">Doanh số</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffData.length > 0 ? staffData.map((staff, idx) => {
                          const actualStart = startDate || minDate;
                          const actualEnd = endDate || maxDate;
                          const target = getOperatorTarget(staff.name, selectedDetailBranch || '', targetMonthStr, actualStart, actualEnd);
                          const formatProgress = (val: number, tgt: number) => {
                            if (!tgt) return '';
                            return ` (${((val / tgt) * 100).toFixed(0)}%)`;
                          };
                          const isExpanded = expandedOperator === staff.name;
                          return (
                            <Fragment key={idx}>
                              <tr 
                                onClick={() => setExpandedOperator(isExpanded ? null : staff.name)}
                                style={{ cursor: 'pointer' }}
                                className={isExpanded ? 'expanded-row-active' : ''}
                              >
                                <td>
                                  <span className="operator-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    {staff.name}
                                    <span style={{ fontSize: '10px', opacity: 0.5 }}>
                                      {isExpanded ? '▼' : '▶'}
                                    </span>
                                  </span>
                                </td>
                                <td>{staff.team}</td>
                                <td className="text-right">
                                  <div className="font-mono font-semibold">{formatCurrency(staff.adsSpend)}</div>
                                  {target.adsSpend > 0 ? (
                                    <div className="table-sub-info">
                                      Hạn mức: {formatCurrency(target.adsSpend)}
                                      <span className={`${staff.adsSpend > target.adsSpend ? 'c-rose' : 'c-emerald'} font-semibold`} style={{ marginLeft: 4 }}>{formatProgress(staff.adsSpend, target.adsSpend)}</span>
                                    </div>
                                  ) : (
                                    <div className="table-sub-info" style={{ opacity: 0.5 }}>Không có hạn mức</div>
                                  )}
                                </td>
                                <td className="text-right">
                                  <div className="font-semibold" style={{ color: 'var(--blue)' }}>{staff.leads}</div>
                                  {target.leads > 0 ? (
                                    <div className="table-sub-info">
                                      Mục tiêu: {target.leads}
                                      <span className={`${staff.leads >= target.leads ? 'c-emerald' : 'c-rose'} font-semibold`} style={{ marginLeft: 4 }}>{formatProgress(staff.leads, target.leads)}</span>
                                    </div>
                                  ) : (
                                    <div className="table-sub-info" style={{ opacity: 0.5 }}>Không có mục tiêu</div>
                                  )}
                                </td>
                                <td className="text-right">
                                  <div className="font-mono font-semibold" style={{ color: 'var(--emerald)' }}>{formatCurrency(staff.revenue)}</div>
                                  {target.revenue > 0 ? (
                                    <div className="table-sub-info">
                                      Mục tiêu: {formatCurrency(target.revenue)}
                                      <span className={`${staff.revenue >= target.revenue ? 'c-emerald' : 'c-rose'} font-semibold`} style={{ marginLeft: 4 }}>{formatProgress(staff.revenue, target.revenue)}</span>
                                    </div>
                                  ) : (
                                    <div className="table-sub-info" style={{ opacity: 0.5 }}>Không có mục tiêu</div>
                                  )}
                                </td>
                              </tr>
                              {isExpanded && (() => {
                                const opRecords = real.records.filter(r => (r.operator || 'Chưa rõ') === staff.name);
                                const serviceBreakdown: Record<string, { service: string, adsSpend: number, leads: number, revenue: number }> = {};
                                opRecords.forEach(r => {
                                  const srv = r.service || 'Khác';
                                  if (!serviceBreakdown[srv]) {
                                    serviceBreakdown[srv] = { service: srv, adsSpend: 0, leads: 0, revenue: 0 };
                                  }
                                  serviceBreakdown[srv].adsSpend += r.ads_spend;
                                  serviceBreakdown[srv].leads += r.leads;
                                  serviceBreakdown[srv].revenue += r.revenue;
                                });
                                const breakdownList = Object.values(serviceBreakdown).sort((a, b) => b.revenue - a.revenue);
                                return (
                                  <tr className="service-breakdown-row" onClick={e => e.stopPropagation()}>
                                    <td colSpan={5}>
                                      <div className="service-breakdown-wrapper">
                                        <div className="service-breakdown-header">
                                          Chi tiết từng dịch vụ của <strong>{staff.name}</strong>:
                                        </div>
                                        <table className="service-breakdown-subtable">
                                          <thead>
                                            <tr>
                                              <th>Dịch vụ</th>
                                              <th className="text-right">Chi Ads</th>
                                              <th className="text-right">Leads</th>
                                              <th className="text-right">Doanh số</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {breakdownList.map((srv, sIdx) => (
                                              <tr key={sIdx}>
                                                <td><span className="service-badge">{srv.service}</span></td>
                                                <td className="text-right font-mono">{formatCurrency(srv.adsSpend)}</td>
                                                <td className="text-right font-semibold" style={{ color: 'var(--blue)' }}>{srv.leads}</td>
                                                <td className="text-right font-mono font-semibold" style={{ color: 'var(--emerald)' }}>{formatCurrency(srv.revenue)}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })()}
                            </Fragment>
                          );
                        }) : (
                          <tr><td colSpan={5} className="table-empty">Không có nhân sự nào.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <footer className="dashboard-footer-bar">
        <p>© 2026 Dohyun Group · Hệ thống phân tích nội bộ</p>
        <div className="footer-links">
          <span>Marketing Analytics Dashboard</span>
          <span>·</span>
          <span>Bảo mật dữ liệu</span>
        </div>
      </footer>
    </div>
  );
}
