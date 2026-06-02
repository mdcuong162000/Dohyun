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

const SPREADSHEET_IDS = {
  BIN: "1EwCPma0-YrmJbbdifJ8MW_LrHiI-D3s4zcG7HRuC2Xg",
  TARGET: "K0nveS0gpHeK0K3hlyWodoR2CI4J48xsMTwKo1wkFYQ",
  HUEHOO: "1l8sZhn2IWbV_f5WSRiOcSV9zU_NRFiIZBZfOd9X5tcU",
  TOTAL: "RcGc7oicDUzSa7-oCX27ZJNOjWllQGZJJeJ5K1Y4zUM"
};

import targetMockData from './data/dohyun_targets.json';

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

const cleanNum = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim().replace(/\s/g, '');
  if (str === '-' || str === 'd' || str === 'đ' || str === 'đ/sđt' || str === 'đ/khách') return 0;
  
  const isPercent = str.includes('%');
  const cleanStr = str.replace(/[^\d.,-]/g, '');
  if (!cleanStr || cleanStr === '-') return 0;
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

const parseTargetsFromSheet = (rows: any[][]) => {
  const monthData: any = { branches: {}, operators: {} };
  if (!rows || rows.length === 0) return monthData;

  // 1. Đà Nẵng branch goals
  let dnRow = -1;
  for (let r = 0; r < rows.length; r++) {
    const rowStr = rows[r].filter(val => val !== null && val !== undefined).join(" ").toUpperCase();
    if (rowStr.includes("MỤC TIÊU ĐÀ NẴNG") && rowStr.includes("THEO ADS")) {
      dnRow = r;
      break;
    }
  }
  if (dnRow !== -1) {
    for (let r = dnRow + 1; r < Math.min(rows.length, dnRow + 8); r++) {
      if (String(rows[r][0]).trim() === "TỔNG") {
        monthData.branches["Đà Nẵng"] = {
          revenue: cleanNum(rows[r][9]),
          adsSpend: cleanNum(rows[r][2]),
          leads: Math.round(cleanNum(rows[r][5])),
          showups: Math.round(cleanNum(rows[r][7]))
        };
        break;
      }
    }
  }

  // 2. Nha Trang branch goals
  let ntRow = -1;
  let ntCol = -1;
  for (let r = 0; r < rows.length; r++) {
    for (let c = 10; c < (rows[r]?.length || 0); c++) {
      const val = String(rows[r][c]).toUpperCase();
      if (val.includes("MỤC TIÊU NHA TRANG") && !val.includes("TELESALE")) {
        ntRow = r;
        ntCol = c;
        break;
      }
    }
    if (ntRow !== -1) break;
  }
  if (ntRow !== -1) {
    for (let r = ntRow + 1; r < Math.min(rows.length, ntRow + 8); r++) {
      if (String(rows[r][ntCol]).trim() === "TỔNG") {
        monthData.branches["Nha Trang"] = {
          revenue: cleanNum(rows[r][ntCol + 9]),
          adsSpend: cleanNum(rows[r][ntCol + 2]),
          leads: Math.round(cleanNum(rows[r][ntCol + 5])),
          showups: Math.round(cleanNum(rows[r][ntCol + 7]))
        };
        break;
      }
    }
  }

  // 3. Đà Nẵng Operators allocation
  let pbRow = -1;
  for (let r = 0; r < rows.length; r++) {
    const rowStr = rows[r].filter(val => val !== null && val !== undefined).join(" ").toUpperCase();
    if (rowStr.includes("PHÂN BỔ NGÂN SÁCH")) {
      pbRow = r;
      break;
    }
  }
  if (pbRow !== -1) {
    const headerRowIdx = pbRow + 3;
    if (headerRowIdx < rows.length) {
      const opsRows: { name: string, rowIdx: number }[] = [];
      let rIdx = headerRowIdx;
      while (rIdx < rows.length) {
        const valCol10 = String(rows[rIdx][10] || '').trim().toUpperCase();
        if (["HUẾ", "BIN", "ĐỨC"].includes(valCol10) && rows[rIdx][11] && cleanNum(rows[rIdx][11]) > 1000000) {
          opsRows.push({ name: valCol10, rowIdx: rIdx });
        }
        rIdx++;
        if (rIdx - headerRowIdx > 12) break;
      }

      opsRows.forEach(({ name, rowIdx }) => {
        const opKey = name.trim().toUpperCase();
        monthData.operators[opKey] = {
          adsSpend: cleanNum(rows[rowIdx][11]),
          leads: Math.round(cleanNum(rows[rowIdx][13])),
          revenue: cleanNum(rows[rowIdx][15]),
          services: {}
        };

        const servicesTargets: Record<string, { adsSpend: number, revenue: number }> = {};
        let rSrv = headerRowIdx + 1;
        let currentSrv = "";
        while (rSrv < rows.length) {
          const rowVals = rows[rSrv];
          const srvVal = String(rowVals[1] || '').trim();
          if (srvVal) {
            currentSrv = srvVal;
          }
          if (currentSrv === "TỔNG" || currentSrv === "") {
            rSrv++;
            continue;
          }
          const indicator = String(rowVals[0] || '').toUpperCase();
          if (indicator.includes("4. SỐ LƯỢNG") || indicator.includes("NGÂN SÁCH")) {
            break;
          }
          const runnerVal = String(rowVals[4] || '').trim().toUpperCase();
          if (runnerVal === opKey) {
            servicesTargets[currentSrv] = {
              adsSpend: cleanNum(rowVals[3]),
              revenue: cleanNum(rowVals[9])
            };
          }
          rSrv++;
        }
        monthData.operators[opKey].services = servicesTargets;
      });
    }
  }

  return monthData;
};

const parseMonthlyReportTargets = (rows: any[][]) => {
  if (!rows || rows.length === 0 || rows[0].length < 28) return null;
  const row0 = rows[0].map(x => String(x || '').trim().toUpperCase());
  const colIdxTotal = row0.findIndex(val => val.includes("TỔNG") || val.includes("TỔNG THÁNG"));
  if (colIdxTotal !== -1) {
    const adsSpend = cleanNum(rows[1][16]);
    const leads = Math.round(cleanNum(rows[1][21]));
    const showups = Math.round(cleanNum(rows[1][24]));
    const revenue = cleanNum(rows[1][27]);
    return { revenue, adsSpend, leads, showups };
  }
  return null;
};

let tokenClient: any = null;

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
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal);
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
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
  const [targets, setTargets] = useState<any>(targetMockData);
  const [selectedOperator, setSelectedOperator] = useState<any | null>(null);

  // --- FILTER STATE ---
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const [selectedTeam, setSelectedTeam] = useState<string>('All');
  const [selectedService, setSelectedService] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  // @ts-ignore
  const [currentPage, setCurrentPage] = useState<number>(1);

  // --- DERIVED METADATA ---
  const uniqueBranches = useMemo(() => {
    const branches = new Set(records.map(r => r.branch).filter(Boolean));
    return ['All', ...Array.from(branches)];
  }, [records]);

  const activeBranches = useMemo(() => {
    const activeSet = new Set<string>();
    records.forEach(r => {
      if (startDate && r.date < startDate) return;
      if (endDate && r.date > endDate) return;
      if (r.ads_spend > 0 && r.branch) {
        activeSet.add(r.branch);
      }
    });
    if (activeSet.size === 0) {
      records.forEach(r => {
        if (startDate && r.date < startDate) return;
        if (endDate && r.date > endDate) return;
        if (r.branch) {
          activeSet.add(r.branch);
        }
      });
    }
    if (activeSet.size === 0) {
      return uniqueBranches.filter(b => b !== 'All');
    }
    return Array.from(activeSet);
  }, [records, startDate, endDate, uniqueBranches]);

  const visibleBranches = useMemo(() => {
    return ['All', ...activeBranches];
  }, [activeBranches]);

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

  // --- TARGET LOOKUP HELPERS ---
  const getBranchTarget = (branchName: string, dateStr: string, startDateVal?: string, endDateVal?: string) => {
    const activeStart = startDateVal || startDate || minDate;
    const activeEnd = endDateVal || endDate || maxDate;
    if (activeStart && activeEnd) {
      const days = getDaysList(activeStart, activeEnd);
      let totalRevenue = 0;
      let totalAdsSpend = 0;
      let totalLeads = 0;
      let totalShowups = 0;
      
      days.forEach(day => {
        const monthKey = day.substring(0, 7);
        const [yStr, mStr] = monthKey.split('-');
        const daysCount = new Date(parseInt(yStr), parseInt(mStr), 0).getDate();
        
        let monthTarget = targets[monthKey]?.branches?.[branchName];
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
    if (targets[monthKey]?.branches?.[branchName]) {
      return targets[monthKey].branches[branchName];
    }
    
    const defaults: Record<string, { revenue: number, adsSpend: number, leads: number, showups: number }> = {
      'Đà Nẵng': { revenue: 2000000000, adsSpend: 600000000, leads: 1200, showups: 300 },
      'Nha Trang': { revenue: 700000000, adsSpend: 200000000, leads: 400, showups: 100 },
      'Hồ Chí Minh': { revenue: 400000000, adsSpend: 120000000, leads: 250, showups: 70 },
      'BMT': { revenue: 300000000, adsSpend: 100000000, leads: 180, showups: 40 },
    };
    return defaults[branchName] || { revenue: 500000000, adsSpend: 150000000, leads: 300, showups: 80 };
  };

  const getOperatorTarget = (opName: string, dateStr: string, startDateVal?: string, endDateVal?: string) => {
    const activeStart = startDateVal || startDate || minDate;
    const activeEnd = endDateVal || endDate || maxDate;
    const opKeyClean = opName.trim().toUpperCase();

    if (activeStart && activeEnd) {
      const days = getDaysList(activeStart, activeEnd);
      let totalRevenue = 0;
      let totalAdsSpend = 0;
      let totalLeads = 0;
      
      days.forEach(day => {
        const monthKey = day.substring(0, 7);
        const [yStr, mStr] = monthKey.split('-');
        const daysCount = new Date(parseInt(yStr), parseInt(mStr), 0).getDate();
        
        const monthMap = targets[monthKey] || {};
        const opTarget = monthMap.operators?.[opKeyClean];
        
        if (opTarget) {
          totalRevenue += opTarget.revenue / daysCount;
          totalAdsSpend += opTarget.adsSpend / daysCount;
          totalLeads += opTarget.leads / daysCount;
        }
      });
      
      return {
        revenue: Math.round(totalRevenue),
        adsSpend: Math.round(totalAdsSpend),
        leads: Math.round(totalLeads),
        services: targets[activeStart?.substring(0, 7) || '2026-05']?.operators?.[opKeyClean]?.services || {}
      };
    }

    const monthKey = dateStr || '2026-05';
    const monthMap = targets[monthKey] || {};
    const opTarget = monthMap.operators?.[opKeyClean];
    
    if (opTarget) {
      return {
        revenue: opTarget.revenue,
        adsSpend: opTarget.adsSpend,
        leads: opTarget.leads,
        services: opTarget.services || {}
      };
    }
    
    return { adsSpend: 0, leads: 0, revenue: 0, services: {} };
  };

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

  // --- HELPERS FOR ONLINE DATA SYNCING ---
  const fetchSheetData = async (sheetId: string) => {
    try {
      const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`;
      const metadataRes = await fetch(metadataUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!metadataRes.ok) return [];
      const metadata = await metadataRes.json();
      const sheets = metadata.sheets || [];
      const sheetTitles = sheets.map((s: any) => s.properties?.title || '');
      
      let targetSheetName = '';
      const exactDaily = sheetTitles.find((t: string) => t === 'Daily');
      const exactDataimp = sheetTitles.find((t: string) => t === 'Dataimp');
      const containsDaily = sheetTitles.find((t: string) => t.toLowerCase().includes('daily'));
      const containsData = sheetTitles.find((t: string) => t.toLowerCase().includes('data'));
      
      if (exactDaily) targetSheetName = exactDaily;
      else if (exactDataimp) targetSheetName = exactDataimp;
      else if (containsDaily) targetSheetName = containsDaily;
      else if (containsData) targetSheetName = containsData;
      else targetSheetName = sheetTitles[0];
      
      const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(targetSheetName)}`;
      const apiRes = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!apiRes.ok) return [];
      const data = await apiRes.json();
      return parseSheetsData(data.values);
    } catch (e) {
      console.error(`Error fetching sheet ${sheetId}:`, e);
      return [];
    }
  };

  const fetchTargetsOnline = async (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const monthNum = parseInt(month);
    const targetSheetName = `MỤC TIÊU ADS T${monthNum}${year}`;
    
    try {
      const targetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_IDS.TARGET}/values/${encodeURIComponent(targetSheetName)}`;
      const targetRes = await fetch(targetUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!targetRes.ok) return null;
      const targetData = await targetRes.json();
      const parsed = parseTargetsFromSheet(targetData.values);
      
      const ntReportSheetName = `NHA TRANG THÁNG ${monthNum}`;
      const ntUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_IDS.HUEHOO}/values/${encodeURIComponent(ntReportSheetName)}`;
      const ntRes = await fetch(ntUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (ntRes.ok) {
        const ntData = await ntRes.json();
        const ntTarget = parseMonthlyReportTargets(ntData.values);
        parsed.branches["Nha Trang"] = ntTarget;
      }
      
      const dnReportSheetName = `ĐÀ NẴNG THÁNG ${monthNum}`;
      const dnUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_IDS.BIN}/values/${encodeURIComponent(dnReportSheetName)}`;
      const dnRes = await fetch(dnUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (dnRes.ok) {
        const dnData = await dnRes.json();
        const dnTarget = parseMonthlyReportTargets(dnData.values);
        if (dnTarget && (!parsed.branches["Đà Nẵng"] || parsed.branches["Đà Nẵng"].revenue === 0)) {
          parsed.branches["Đà Nẵng"] = dnTarget;
        }
      }
      
      return parsed;
    } catch (e) {
      console.error("Error fetching online targets:", e);
      return null;
    }
  };

  // --- INITIAL DATA LOAD & MERGING OF 4 SHEETS ---
  useEffect(() => {
    const syncAllData = async () => {
      setIsLoading(true);
      setAuthError('');
      
      const fetchPublicCSV = async (sheetId: string) => {
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&sheet=Daily`;
        try {
          let res = await fetch(url);
          if (!res.ok) {
            const url2 = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&sheet=Dataimp`;
            res = await fetch(url2);
            if (!res.ok) return [];
          }
          const csvText = await res.text();
          if (csvText.includes('google-site-verification') || csvText.includes('<!DOCTYPE html>') || csvText.includes('login')) {
            const url2 = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&sheet=Dataimp`;
            const res2 = await fetch(url2);
            if (!res2.ok) return [];
            const csvText2 = await res2.text();
            if (csvText2.includes('google-site-verification') || csvText2.includes('<!DOCTYPE html>') || csvText2.includes('login')) {
              return [];
            }
            return parseCSV(csvText2);
          }
          return parseCSV(csvText);
        } catch (e) {
          return [];
        }
      };

      try {
        const [binCSV, targetCSV, huehooCSV, totalCSV] = await Promise.all([
          fetchPublicCSV(SPREADSHEET_IDS.BIN),
          fetchPublicCSV(SPREADSHEET_IDS.TARGET),
          fetchPublicCSV(SPREADSHEET_IDS.HUEHOO),
          fetchPublicCSV(SPREADSHEET_IDS.TOTAL)
        ]);
        
        const binParsed = parseSheetsData(binCSV);
        const targetParsed = parseSheetsData(targetCSV);
        const huehooParsed = parseSheetsData(huehooCSV);
        const totalParsed = parseSheetsData(totalCSV);
        
        const allRecords = [...binParsed, ...targetParsed, ...huehooParsed, ...totalParsed];
        if (allRecords.length > 0) {
          const mergedMap = new Map<string, DailyRecord>();
          allRecords.forEach(r => {
            const key = `${r.date}_${r.team.toUpperCase()}_${r.branch.toUpperCase()}_${r.operator.toUpperCase()}_${r.service.toUpperCase()}_${r.bm.toUpperCase()}`;
            const existing = mergedMap.get(key);
            if (!existing || r.ads_spend > existing.ads_spend) {
              mergedMap.set(key, r);
            }
          });
          setRecords(Array.from(mergedMap.values()));
          setIsDemoMode(false);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.log('[Sync] Public sync failed or private. Switching to Google OAuth.');
      }

      if (accessToken) {
        try {
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
            } catch (e) {}
          }

          const [binData, targetData, huehooData, totalData] = await Promise.all([
            fetchSheetData(SPREADSHEET_IDS.BIN),
            fetchSheetData(SPREADSHEET_IDS.TARGET),
            fetchSheetData(SPREADSHEET_IDS.HUEHOO),
            fetchSheetData(SPREADSHEET_IDS.TOTAL)
          ]);

          const allRecords = [...binData, ...targetData, ...huehooData, ...totalData];
          if (allRecords.length === 0) {
            throw new Error('Không thể lấy dữ liệu từ 4 sheet online. Hãy đảm bảo tài khoản Gmail đã có quyền truy cập.');
          }

          const mergedMap = new Map<string, DailyRecord>();
          allRecords.forEach(r => {
            const key = `${r.date}_${r.team.toUpperCase()}_${r.branch.toUpperCase()}_${r.operator.toUpperCase()}_${r.service.toUpperCase()}_${r.bm.toUpperCase()}`;
            const existing = mergedMap.get(key);
            if (!existing || r.ads_spend > existing.ads_spend) {
              mergedMap.set(key, r);
            }
          });
          setRecords(Array.from(mergedMap.values()));
          setIsDemoMode(false);
        } catch (err: any) {
          console.error('[Sync] Lỗi OAuth fetch:', err);
          setAuthError(err.message || 'Lỗi khi đồng bộ dữ liệu qua tài khoản Google.');
          setRecords([]);
        }
      } else {
        setRecords([]);
      }
      setIsLoading(false);
    };

    syncAllData();
  }, [accessToken]);

  // Load online targets dynamically on date range / selected month change
  useEffect(() => {
    if (!accessToken) return;
    const activeStart = startDate || minDate;
    if (!activeStart) return;
    const monthKey = activeStart.substring(0, 7);
    
    const loadOnlineTargets = async () => {
      const onlineTargets = await fetchTargetsOnline(monthKey);
      if (onlineTargets) {
        setTargets((prev: any) => ({
          ...prev,
          [monthKey]: onlineTargets
        }));
      }
    };
    loadOnlineTargets();
  }, [accessToken, startDate, minDate]);

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

  // Reset selected branch if it becomes inactive in the current date range filter
  useEffect(() => {
    if (selectedBranch !== 'All' && !visibleBranches.includes(selectedBranch)) {
      setSelectedBranch('All');
    }
  }, [selectedBranch, visibleBranches]);

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

  // --- PREVIOUS PERIOD METRICS FOR COMPARISON ---
  const previousPeriodMetrics = useMemo(() => {
    if (!startDate || !endDate) return null;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    const prevEnd = new Date(start);
    prevEnd.setDate(start.getDate() - 1);
    
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevEnd.getDate() - diffDays + 1);
    
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const prevStartStr = formatDate(prevStart);
    const prevEndStr = formatDate(prevEnd);
    
    const prevData = records.filter(r => {
      if (r.date < prevStartStr || r.date > prevEndStr) return false;
      if (selectedBranch !== 'All' && r.branch !== selectedBranch) return false;
      if (selectedTeam !== 'All' && r.team !== selectedTeam) return false;
      if (selectedService !== 'All' && r.service !== selectedService) return false;
      return true;
    });
    
    let adsSpend = 0, revenue = 0, leads = 0, showups = 0;
    prevData.forEach(r => {
      adsSpend += r.ads_spend;
      revenue += r.revenue;
      leads += r.leads;
      showups += r.showups;
    });

    const costPerLead = leads > 0 ? adsSpend / leads : 0;
    const roas = adsSpend > 0 ? revenue / adsSpend : 0;
    const avgAdsRatio = revenue > 0 ? (adsSpend / revenue) * 100 : 0;
    
    return { adsSpend, revenue, leads, showups, costPerLead, roas, avgAdsRatio };
  }, [records, startDate, endDate, selectedBranch, selectedTeam, selectedService]);

  const getComparisonTag = (current: number, previous: number | undefined, isLowerBetter: boolean = false) => {
    if (previous === undefined || previous === null || previous === 0) return null;
    const pct = ((current - previous) / previous) * 100;
    if (Math.abs(pct) < 0.05) return null;
    const isIncrease = pct >= 0;
    const displayPct = `${isIncrease ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%`;
    
    let isGood = isIncrease;
    if (isLowerBetter) isGood = !isIncrease;
    
    const className = isGood ? 'comp-tag-good' : 'comp-tag-bad';
    return (
      <span className={`kpi-comparison-tag ${className}`}>
        {displayPct} so với kỳ trước
      </span>
    );
  };

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

  const formatDateDMY = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };



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

  // --- RENDER BRANCH BOX FOR MAIN VIEW ---
  const renderBranchBox = (branchName: string) => {
    const branchRecords = records.filter(r => {
      if (r.branch !== branchName) return false;
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

    const activeStart = startDate || minDate;
    const activeEnd = endDate || maxDate;
    const targetMonthStr = startDate ? startDate.substring(0, 7) : '2026-05';
    const target = getBranchTarget(branchName, targetMonthStr, activeStart, activeEnd);

    const completionRate = target.revenue > 0 ? (revenue / target.revenue) * 100 : 0;
    const remaining = Math.max(0, target.revenue - revenue);

    let completionColor = '#ef4444'; // đỏ
    if (completionRate >= 89) {
      completionColor = '#3b82f6'; // xanh dương
    } else if (completionRate >= 72) {
      completionColor = '#f97316'; // cam
    }

    const adsRatio = revenue > 0 ? (adsSpend / revenue) * 100 : 0;
    const targetAdsRatio = target.revenue > 0 ? (target.adsSpend / target.revenue) * 100 : 0;

    // Service breakdown
    const serviceMap: Record<string, { service: string, adsSpend: number, revenue: number, leads: number, showups: number }> = {};
    branchRecords.forEach(r => {
      const srv = r.service || 'Khác';
      if (!serviceMap[srv]) {
        serviceMap[srv] = { service: srv, adsSpend: 0, revenue: 0, leads: 0, showups: 0 };
      }
      serviceMap[srv].adsSpend += r.ads_spend;
      serviceMap[srv].revenue += r.revenue;
      serviceMap[srv].leads += r.leads;
      serviceMap[srv].showups += r.showups;
    });
    const services = Object.values(serviceMap).sort((a, b) => b.revenue - a.revenue);

    // Staff breakdown
    const staffMap: Record<string, { name: string, team: string, adsSpend: number, leads: number, revenue: number }> = {};
    branchRecords.forEach(r => {
      const op = r.operator || 'Chưa rõ';
      if (!staffMap[op]) {
        staffMap[op] = { name: op, team: r.team || 'Chưa rõ', adsSpend: 0, leads: 0, revenue: 0 };
      }
      staffMap[op].adsSpend += r.ads_spend;
      staffMap[op].leads += r.leads;
      staffMap[op].revenue += r.revenue;
    });
    const staffList = Object.values(staffMap).sort((a, b) => b.revenue - a.revenue);

    return (
      <div className="branch-card" key={branchName}>
        <div className="branch-card-header">
          <h2 className="branch-title">🏢 CHI NHÁNH: {branchName.toUpperCase()}</h2>
          <div className="completion-badge-wrap">
            <span className="completion-label">Hoàn thành:</span>
            <span className="completion-value" style={{ color: completionColor }}>
              {completionRate.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="branch-summary-table-wrapper">
          <table className="branch-summary-table">
            <thead>
              <tr>
                <th></th>
                <th>NGÂN SÁCH</th>
                <th>KHÁCH ĐẾN</th>
                <th>DOANH SỐ</th>
                <th>%ADS/DS</th>
              </tr>
            </thead>
            <tbody>
              <tr className="row-target">
                <td className="row-type"><span className="emoji-icon">🎯</span> Mục Tiêu</td>
                <td>{target.adsSpend > 0 ? formatCurrency(target.adsSpend) : '—'}</td>
                <td>{target.showups > 0 ? formatNumber(target.showups) : '—'}</td>
                <td className="font-semibold">{target.revenue > 0 ? formatCurrency(target.revenue) : '—'}</td>
                <td>{targetAdsRatio > 0 ? `${targetAdsRatio.toFixed(1)}%` : '—'}</td>
              </tr>
              <tr className="row-actual">
                <td className="row-type"><span className="emoji-icon">✅</span> Thực Đạt</td>
                <td>{formatCurrency(adsSpend)}</td>
                <td>{formatNumber(showups)}</td>
                <td className="font-bold c-emerald">{formatCurrency(revenue)}</td>
                <td className={`font-semibold ${adsRatio > (targetAdsRatio || 25) ? 'c-rose' : 'c-emerald'}`}>{adsRatio.toFixed(2)}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="branch-progress-detail">
          <span>Còn thiếu: <strong className="c-rose">{formatCurrency(remaining)}</strong></span>
        </div>

        <div className="branch-service-breakdown">
          <h4 className="breakdown-title">📊 Chi Tiết Theo Dịch Vụ — {branchName}</h4>
          <table className="breakdown-table">
            <thead>
              <tr>
                <th>Dịch Vụ</th>
                <th className="text-right">Chi Phí ADS</th>
                <th className="text-right">Doanh Số</th>
                <th className="text-right">%ADS/DS</th>
                <th className="text-right">Số Khách</th>
                <th className="text-right">CP/Khách</th>
              </tr>
            </thead>
            <tbody>
              {services.map(srv => {
                const srvAdsRatio = srv.revenue > 0 ? (srv.adsSpend / srv.revenue) * 100 : 0;
                const cpKhach = srv.showups > 0 ? srv.adsSpend / srv.showups : 0;
                return (
                  <tr key={srv.service}>
                    <td className="srv-name">{srv.service}</td>
                    <td className="text-right font-mono">{formatCurrency(srv.adsSpend)}</td>
                    <td className="text-right font-mono">{formatCurrency(srv.revenue)}</td>
                    <td className="text-right font-semibold">{srvAdsRatio > 0 ? `${srvAdsRatio.toFixed(1)}%` : '—'}</td>
                    <td className="text-right">{formatNumber(srv.showups)}</td>
                    <td className="text-right font-mono">{cpKhach > 0 ? formatCurrency(cpKhach) : '—'}</td>
                  </tr>
                );
              })}
              {services.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-gray-500">Không có dữ liệu dịch vụ</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="branch-staff-breakdown">
          <h4 className="breakdown-title">👥 Hiệu Suất Từng Nhân Sự — {branchName}</h4>
          <table className="staff-table">
            <thead>
              <tr>
                <th>Nhân Viên</th>
                <th>Team</th>
                <th className="text-right">
                  <div>Chi Ads</div>
                  <div className="header-sub-info">Thực / Mục tiêu</div>
                </th>
                <th className="text-right">
                  <div>Leads</div>
                  <div className="header-sub-info">Thực / Mục tiêu</div>
                </th>
                <th className="text-right">
                  <div>Doanh Số</div>
                  <div className="header-sub-info">Thực / Mục tiêu</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {staffList.map(staff => {
                const opTarget = getOperatorTarget(staff.name, targetMonthStr, activeStart, activeEnd);
                const formatProgress = (val: number, tgt: number) => {
                  if (!tgt) return '';
                  return ` (${((val / tgt) * 100).toFixed(0)}%)`;
                };
                return (
                  <tr key={staff.name}>
                    <td className="text-left">
                      <span 
                        className="staff-clickable-name"
                        onClick={() => setSelectedOperator({ name: staff.name, branch: branchName, team: staff.team })}
                      >
                        {staff.name}
                      </span>
                    </td>
                    <td>{staff.team}</td>
                    <td className="text-right">
                      <div className="font-mono font-semibold">{formatCurrency(staff.adsSpend)}</div>
                      {opTarget.adsSpend > 0 ? (
                        <div className="table-sub-info font-mono" style={{ opacity: 0.75 }}>
                          {formatCurrency(opTarget.adsSpend)}
                          <span className={staff.adsSpend > opTarget.adsSpend ? 'c-rose' : 'c-emerald'} style={{ marginLeft: 4, fontWeight: 700 }}>
                            {formatProgress(staff.adsSpend, opTarget.adsSpend)}
                          </span>
                        </div>
                      ) : (
                        <div className="table-sub-info font-mono" style={{ opacity: 0.4 }}>—</div>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="font-semibold c-blue">{formatNumber(staff.leads)}</div>
                      {opTarget.leads > 0 ? (
                        <div className="table-sub-info" style={{ opacity: 0.75 }}>
                          {formatNumber(opTarget.leads)}
                          <span className={staff.leads >= opTarget.leads ? 'c-emerald' : 'c-rose'} style={{ marginLeft: 4, fontWeight: 700 }}>
                            {formatProgress(staff.leads, opTarget.leads)}
                          </span>
                        </div>
                      ) : (
                        <div className="table-sub-info" style={{ opacity: 0.4 }}>—</div>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="font-mono font-semibold c-emerald">{formatCurrency(staff.revenue)}</div>
                      {opTarget.revenue > 0 ? (
                        <div className="table-sub-info font-mono" style={{ opacity: 0.75 }}>
                          {formatCurrency(opTarget.revenue)}
                          <span className={staff.revenue >= opTarget.revenue ? 'c-emerald' : 'c-rose'} style={{ marginLeft: 4, fontWeight: 700 }}>
                            {formatProgress(staff.revenue, opTarget.revenue)}
                          </span>
                        </div>
                      ) : (
                        <div className="table-sub-info font-mono" style={{ opacity: 0.4 }}>—</div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {staffList.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-gray-500">Không có dữ liệu nhân sự</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

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
            {visibleBranches.map(b => (
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
            {getComparisonTag(metrics.revenue, previousPeriodMetrics?.revenue)}
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
            {getComparisonTag(metrics.adsSpend, previousPeriodMetrics?.adsSpend, true)}
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
            {getComparisonTag(metrics.roas, previousPeriodMetrics?.roas)}
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
            {getComparisonTag(avgAdsRatio, previousPeriodMetrics?.avgAdsRatio, true)}
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
            <span className="kpi-funnel-sub">
              Chi phí/Lead: {formatCurrency(metrics.costPerLead)}
              {getComparisonTag(metrics.leads, previousPeriodMetrics?.leads)}
            </span>
          </div>
        </div>
        <div className="kpi-funnel">
          <div className="kpi-funnel-icon icon-violet"><MousePointerClick size={20} /></div>
          <div className="kpi-funnel-body">
            <span className="kpi-funnel-label">Khách Đến (Show-up)</span>
            <span className="kpi-funnel-value c-violet">{formatNumber(metrics.showups)}</span>
            <span className="kpi-funnel-sub">
              Tỷ lệ: {metrics.leadToShowupRate.toFixed(1)}% · Cost: {formatCurrency(metrics.costPerShowup)}
              {getComparisonTag(metrics.showups, previousPeriodMetrics?.showups)}
            </span>
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
           CEO VIEW — ROW 3: Branch Grid Direct Layout
      ══════════════════════════════════════════ */}
      {records.length > 0 && (
        <>
          <p className="section-title">Hiệu Suất Chi Nhánh</p>
          <div className="branch-grid">
            {(selectedBranch !== 'All' 
              ? [selectedBranch] 
              : visibleBranches.filter(b => b !== 'All')
            ).map(b => renderBranchBox(b))}
          </div>

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
      {/* ══════════════════════════════════════════
           OPERATOR DETAIL MODAL (Ảnh 3)
      ══════════════════════════════════════════ */}
      {selectedOperator && (() => {
        const opRecords = records.filter(r => {
          if (r.operator !== selectedOperator.name) return false;
          if (r.branch !== selectedOperator.branch) return false;
          if (startDate && r.date < startDate) return false;
          if (endDate && r.date > endDate) return false;
          return true;
        });

        const serviceMap: Record<string, {
          service: string;
          adsSpend: number;
          contacts: number;
          leads: number;
          showups: number;
          revenue: number;
        }> = {};

        opRecords.forEach(r => {
          const srv = r.service || 'Khác';
          if (!serviceMap[srv]) {
            serviceMap[srv] = {
              service: srv,
              adsSpend: 0,
              contacts: 0,
              leads: 0,
              showups: 0,
              revenue: 0
            };
          }
          serviceMap[srv].adsSpend += r.ads_spend;
          serviceMap[srv].contacts += r.contacts;
          serviceMap[srv].leads += r.leads;
          serviceMap[srv].showups += r.showups;
          serviceMap[srv].revenue += r.revenue;
        });

        const servicesList = Object.values(serviceMap).sort((a, b) => b.revenue - a.revenue);

        let totalSpend = 0;
        let totalContacts = 0;
        let totalLeads = 0;
        let totalShowups = 0;
        let totalRevenue = 0;

        servicesList.forEach(srv => {
          totalSpend += srv.adsSpend;
          totalContacts += srv.contacts;
          totalLeads += srv.leads;
          totalShowups += srv.showups;
          totalRevenue += srv.revenue;
        });

        const activeStart = startDate || minDate;
        const activeEnd = endDate || maxDate;
        const targetMonthStr = startDate ? startDate.substring(0, 7) : '2026-05';
        const opTarget = getOperatorTarget(selectedOperator.name, targetMonthStr, activeStart, activeEnd);

        const adsRatio = totalRevenue > 0 ? (totalSpend / totalRevenue) * 100 : 0;
        const targetAdsRatio = opTarget.revenue > 0 ? (opTarget.adsSpend / opTarget.revenue) * 100 : 0;

        const getInitials = (name: string) => {
          if (!name) return "";
          const parts = name.trim().split(/\s+/);
          if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
          }
          return name.substring(0, 2).toUpperCase();
        };

        const initials = getInitials(selectedOperator.name);

        // Logic tính toán dailyBreakdown gom nhóm theo ngày
        const uniqueDates = Array.from(new Set(opRecords.map(r => r.date))).sort();
        const isMultiDay = uniqueDates.length > 1;

        const dailyBreakdown = uniqueDates.map(date => {
          const dayRecords = opRecords.filter(r => r.date === date);
          const dayServiceMap: Record<string, {
            service: string;
            adsSpend: number;
            contacts: number;
            leads: number;
            showups: number;
            revenue: number;
          }> = {};
          
          let dayTotalSpend = 0;
          let dayTotalContacts = 0;
          let dayTotalLeads = 0;
          let dayTotalShowups = 0;
          let dayTotalRevenue = 0;

          dayRecords.forEach(r => {
            const srv = r.service || 'Khác';
            if (!dayServiceMap[srv]) {
              dayServiceMap[srv] = {
                service: srv,
                adsSpend: 0,
                contacts: 0,
                leads: 0,
                showups: 0,
                revenue: 0
              };
            }
            dayServiceMap[srv].adsSpend += r.ads_spend;
            dayServiceMap[srv].contacts += r.contacts;
            dayServiceMap[srv].leads += r.leads;
            dayServiceMap[srv].showups += r.showups;
            dayServiceMap[srv].revenue += r.revenue;

            dayTotalSpend += r.ads_spend;
            dayTotalContacts += r.contacts;
            dayTotalLeads += r.leads;
            dayTotalShowups += r.showups;
            dayTotalRevenue += r.revenue;
          });

          const dayServices = Object.values(dayServiceMap).sort((a, b) => b.revenue - a.revenue);

          return {
            date,
            services: dayServices,
            total: {
              adsSpend: dayTotalSpend,
              contacts: dayTotalContacts,
              leads: dayTotalLeads,
              showups: dayTotalShowups,
              revenue: dayTotalRevenue
            }
          };
        });

        return (
          <div className="operator-modal-overlay" onClick={() => setSelectedOperator(null)}>
            <div className="operator-modal" onClick={e => e.stopPropagation()}>
              <div className="operator-modal-header">
                <div className="operator-profile-header">
                  <div className="operator-avatar-circle">
                    {initials}
                  </div>
                  <div className="operator-header-info">
                    <h2 className="operator-name">{selectedOperator.name}</h2>
                    <span className="operator-branch-tag">Chi nhánh: {selectedOperator.branch} · Team: {selectedOperator.team}</span>
                  </div>
                </div>
                <button type="button" className="btn-close-operator-modal" onClick={() => setSelectedOperator(null)}>×</button>
              </div>

              <div className="operator-kpi-grid">
                <div className="operator-kpi-card">
                  <span className="operator-kpi-label">Ngân Sách</span>
                  <div className="kpi-detail-row">
                    <span className="kpi-detail-label">Thực đạt</span>
                    <span className="kpi-detail-val c-emerald">{formatCurrency(totalSpend)}</span>
                  </div>
                  <div className="kpi-detail-row line-top">
                    <span className="kpi-detail-label">Mục tiêu</span>
                    <span className="kpi-detail-val font-normal" style={{ opacity: 0.7 }}>{opTarget.adsSpend > 0 ? formatCurrency(opTarget.adsSpend) : '—'}</span>
                  </div>
                </div>
                <div className="operator-kpi-card">
                  <span className="operator-kpi-label">Tương Tác</span>
                  <div className="kpi-detail-row">
                    <span className="kpi-detail-label">Thực đạt</span>
                    <span className="kpi-detail-val c-blue">{formatNumber(totalContacts)}</span>
                  </div>
                  <div className="kpi-detail-row line-top">
                    <span className="kpi-detail-label">Mục tiêu</span>
                    <span className="kpi-detail-val font-normal" style={{ opacity: 0.7 }}>—</span>
                  </div>
                </div>
                <div className="operator-kpi-card">
                  <span className="operator-kpi-label">SĐT</span>
                  <div className="kpi-detail-row">
                    <span className="kpi-detail-label">Thực đạt</span>
                    <span className="kpi-detail-val c-blue">{formatNumber(totalLeads)}</span>
                  </div>
                  <div className="kpi-detail-row line-top">
                    <span className="kpi-detail-label">Mục tiêu</span>
                    <span className="kpi-detail-val font-normal" style={{ opacity: 0.7 }}>{opTarget.leads > 0 ? formatNumber(opTarget.leads) : '—'}</span>
                  </div>
                </div>
                <div className="operator-kpi-card">
                  <span className="operator-kpi-label">Khách Đến</span>
                  <div className="kpi-detail-row">
                    <span className="kpi-detail-label">Thực đạt</span>
                    <span className="kpi-detail-val c-emerald">{formatNumber(totalShowups)}</span>
                  </div>
                  <div className="kpi-detail-row line-top">
                    <span className="kpi-detail-label">Mục tiêu</span>
                    <span className="kpi-detail-val font-normal" style={{ opacity: 0.7 }}>—</span>
                  </div>
                </div>
                <div className="operator-kpi-card">
                  <span className="operator-kpi-label">Doanh Số</span>
                  <div className="kpi-detail-row">
                    <span className="kpi-detail-label">Thực đạt</span>
                    <span className="kpi-detail-val c-emerald">{formatCurrency(totalRevenue)}</span>
                  </div>
                  <div className="kpi-detail-row line-top">
                    <span className="kpi-detail-label">Mục tiêu</span>
                    <span className="kpi-detail-val font-normal" style={{ opacity: 0.7 }}>{opTarget.revenue > 0 ? formatCurrency(opTarget.revenue) : '—'}</span>
                  </div>
                </div>
                <div className="operator-kpi-card">
                  <span className="operator-kpi-label">% ADS</span>
                  <div className="kpi-detail-row">
                    <span className="kpi-detail-label">Thực đạt</span>
                    <span className={`kpi-detail-val ${adsRatio > (targetAdsRatio || 25) ? 'c-rose' : 'c-emerald'}`}>
                      {adsRatio > 0 ? `${adsRatio.toFixed(2)}%` : '—'}
                    </span>
                  </div>
                  <div className="kpi-detail-row line-top">
                    <span className="kpi-detail-label">Mục tiêu</span>
                    <span className="kpi-detail-val font-normal" style={{ opacity: 0.7 }}>{targetAdsRatio > 0 ? `${targetAdsRatio.toFixed(1)}%` : '—'}</span>
                  </div>
                </div>
              </div>

              <div className="operator-modal-body">
                <h4 className="operator-table-title">📊 Đo Lường Lũy Kế Theo Dịch Vụ</h4>
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Dịch Vụ</th>
                        <th className="text-right">Ngân Sách</th>
                        <th className="text-right">Tương Tác</th>
                        <th className="text-right">Giá TT</th>
                        <th className="text-right">SĐT</th>
                        <th className="text-right">Giá SĐT</th>
                        <th className="text-right">%SĐT/TT</th>
                        <th className="text-right">Khách Đến</th>
                        <th className="text-right">Giá Khách Đến</th>
                        <th className="text-right">%Khách/TT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {servicesList.map(srv => {
                        const costPerEngagement = srv.contacts > 0 ? srv.adsSpend / srv.contacts : 0;
                        const costPerLead = srv.leads > 0 ? srv.adsSpend / srv.leads : 0;
                        const leadsToEngagement = srv.contacts > 0 ? (srv.leads / srv.contacts) * 100 : 0;
                        const costPerShowup = srv.showups > 0 ? srv.adsSpend / srv.showups : 0;
                        const showupsToEngagement = srv.contacts > 0 ? (srv.showups / srv.contacts) * 100 : 0;

                        return (
                          <tr key={srv.service}>
                            <td className="font-semibold">{srv.service}</td>
                            <td className="text-right font-mono">{formatCurrency(srv.adsSpend)}</td>
                            <td className="text-right">{formatNumber(srv.contacts)}</td>
                            <td className="text-right font-mono text-gray-400">{costPerEngagement > 0 ? formatCurrency(costPerEngagement) : '—'}</td>
                            <td className="text-right font-semibold c-blue">{formatNumber(srv.leads)}</td>
                            <td className="text-right font-mono text-gray-400">{costPerLead > 0 ? formatCurrency(costPerLead) : '—'}</td>
                            <td className="text-right font-semibold c-blue">{leadsToEngagement > 0 ? `${leadsToEngagement.toFixed(1)}%` : '—'}</td>
                            <td className="text-right font-semibold c-emerald">{formatNumber(srv.showups)}</td>
                            <td className="text-right font-mono text-gray-400">{costPerShowup > 0 ? formatCurrency(costPerShowup) : '—'}</td>
                            <td className="text-right font-semibold c-emerald">{showupsToEngagement > 0 ? `${showupsToEngagement.toFixed(1)}%` : '—'}</td>
                          </tr>
                        );
                      })}

                      {/* Dòng TỔNG */}
                      {servicesList.length > 0 && (() => {
                        const totalCostPerEngagement = totalContacts > 0 ? totalSpend / totalContacts : 0;
                        const totalCostPerLead = totalLeads > 0 ? totalSpend / totalLeads : 0;
                        const totalLeadsToEngagement = totalContacts > 0 ? (totalLeads / totalContacts) * 100 : 0;
                        const totalCostPerShowup = totalShowups > 0 ? totalSpend / totalShowups : 0;
                        const totalShowupsToEngagement = totalContacts > 0 ? (totalShowups / totalContacts) * 100 : 0;

                        return (
                          <tr style={{ background: 'rgba(255, 255, 255, 0.05)', fontWeight: 'bold' }}>
                            <td>TỔNG</td>
                            <td className="text-right font-mono">{formatCurrency(totalSpend)}</td>
                            <td className="text-right">{formatNumber(totalContacts)}</td>
                            <td className="text-right font-mono">{totalCostPerEngagement > 0 ? formatCurrency(totalCostPerEngagement) : '—'}</td>
                            <td className="text-right c-blue">{formatNumber(totalLeads)}</td>
                            <td className="text-right font-mono">{totalCostPerLead > 0 ? formatCurrency(totalCostPerLead) : '—'}</td>
                            <td className="text-right c-blue">{totalLeadsToEngagement > 0 ? `${totalLeadsToEngagement.toFixed(1)}%` : '—'}</td>
                            <td className="text-right c-emerald">{formatNumber(totalShowups)}</td>
                            <td className="text-right font-mono">{totalCostPerShowup > 0 ? formatCurrency(totalCostPerShowup) : '—'}</td>
                            <td className="text-right c-emerald">{totalShowupsToEngagement > 0 ? `${totalShowupsToEngagement.toFixed(1)}%` : '—'}</td>
                          </tr>
                        );
                      })()}

                      {servicesList.length === 0 && (
                        <tr>
                          <td colSpan={10} className="text-center py-4 text-gray-500">Không có dữ liệu dịch vụ</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* BẢNG CHI TIẾT THEO NGÀY (breakdown) - chỉ hiện khi khoảng lọc có nhiều hơn 1 ngày */}
                {isMultiDay && (
                  <>
                    <h4 className="operator-table-title" style={{ marginTop: '32px' }}>📅 Chi Tiết Đo Lường Theo Ngày</h4>
                    <div className="table-responsive">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Ngày</th>
                            <th>Dịch Vụ</th>
                            <th className="text-right">Ngân Sách</th>
                            <th className="text-right">Tương Tác</th>
                            <th className="text-right">Giá TT</th>
                            <th className="text-right">SĐT</th>
                            <th className="text-right">Giá SĐT</th>
                            <th className="text-right">%SĐT/TT</th>
                            <th className="text-right">Khách Đến</th>
                            <th className="text-right">Giá Khách Đến</th>
                            <th className="text-right">%Khách/TT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dailyBreakdown.map(day => {
                            const daySubtotal = day.total;
                            const dayCostPerEngagement = daySubtotal.contacts > 0 ? daySubtotal.adsSpend / daySubtotal.contacts : 0;
                            const dayCostPerLead = daySubtotal.leads > 0 ? daySubtotal.adsSpend / daySubtotal.leads : 0;
                            const dayLeadsToEngagement = daySubtotal.contacts > 0 ? (daySubtotal.leads / daySubtotal.contacts) * 100 : 0;
                            const dayCostPerShowup = daySubtotal.showups > 0 ? daySubtotal.adsSpend / daySubtotal.showups : 0;
                            const dayShowupsToEngagement = daySubtotal.contacts > 0 ? (daySubtotal.showups / daySubtotal.contacts) * 100 : 0;

                            return (
                              <Fragment key={day.date}>
                                {/* Dòng subtotal của ngày */}
                                <tr className="day-subtotal-row" style={{ background: 'rgba(52, 211, 153, 0.12)', fontWeight: 'bold' }}>
                                  <td>{formatDateDMY(day.date)}</td>
                                  <td>TỔNG NGÀY</td>
                                  <td className="text-right font-mono">{formatCurrency(daySubtotal.adsSpend)}</td>
                                  <td className="text-right">{formatNumber(daySubtotal.contacts)}</td>
                                  <td className="text-right font-mono">{dayCostPerEngagement > 0 ? formatCurrency(dayCostPerEngagement) : '—'}</td>
                                  <td className="text-right c-blue">{formatNumber(daySubtotal.leads)}</td>
                                  <td className="text-right font-mono">{dayCostPerLead > 0 ? formatCurrency(dayCostPerLead) : '—'}</td>
                                  <td className="text-right c-blue">{dayLeadsToEngagement > 0 ? `${dayLeadsToEngagement.toFixed(1)}%` : '—'}</td>
                                  <td className="text-right c-emerald">{formatNumber(daySubtotal.showups)}</td>
                                  <td className="text-right font-mono">{dayCostPerShowup > 0 ? formatCurrency(dayCostPerShowup) : '—'}</td>
                                  <td className="text-right c-emerald">{dayShowupsToEngagement > 0 ? `${dayShowupsToEngagement.toFixed(1)}%` : '—'}</td>
                                </tr>

                                {/* Dòng dịch vụ con */}
                                {day.services.map(srv => {
                                  const costPerEngagement = srv.contacts > 0 ? srv.adsSpend / srv.contacts : 0;
                                  const costPerLead = srv.leads > 0 ? srv.adsSpend / srv.leads : 0;
                                  const leadsToEngagement = srv.contacts > 0 ? (srv.leads / srv.contacts) * 100 : 0;
                                  const costPerShowup = srv.showups > 0 ? srv.adsSpend / srv.showups : 0;
                                  const showupsToEngagement = srv.contacts > 0 ? (srv.showups / srv.contacts) * 100 : 0;

                                  return (
                                    <tr key={`${day.date}_${srv.service}`} className="day-service-row">
                                      <td style={{ opacity: 0.5 }}>{formatDateDMY(day.date)}</td>
                                      <td>{srv.service}</td>
                                      <td className="text-right font-mono">{formatCurrency(srv.adsSpend)}</td>
                                      <td className="text-right">{formatNumber(srv.contacts)}</td>
                                      <td className="text-right font-mono text-gray-400">{costPerEngagement > 0 ? formatCurrency(costPerEngagement) : '—'}</td>
                                      <td className="text-right font-semibold c-blue">{formatNumber(srv.leads)}</td>
                                      <td className="text-right font-mono text-gray-400">{costPerLead > 0 ? formatCurrency(costPerLead) : '—'}</td>
                                      <td className="text-right font-semibold c-blue">{leadsToEngagement > 0 ? `${leadsToEngagement.toFixed(1)}%` : '—'}</td>
                                      <td className="text-right font-semibold c-emerald">{formatNumber(srv.showups)}</td>
                                      <td className="text-right font-mono text-gray-400">{costPerShowup > 0 ? formatCurrency(costPerShowup) : '—'}</td>
                                      <td className="text-right font-semibold c-emerald">{showupsToEngagement > 0 ? `${showupsToEngagement.toFixed(1)}%` : '—'}</td>
                                    </tr>
                                  );
                                })}
                              </Fragment>
                            );
                          })}

                          {/* Dòng TỔNG CỘNG chung cuối bảng */}
                          {dailyBreakdown.length > 0 && (() => {
                            const totalCostPerEngagement = totalContacts > 0 ? totalSpend / totalContacts : 0;
                            const totalCostPerLead = totalLeads > 0 ? totalSpend / totalLeads : 0;
                            const totalLeadsToEngagement = totalContacts > 0 ? (totalLeads / totalContacts) * 100 : 0;
                            const totalCostPerShowup = totalShowups > 0 ? totalSpend / totalShowups : 0;
                            const totalShowupsToEngagement = totalContacts > 0 ? (totalShowups / totalContacts) * 100 : 0;

                            return (
                              <tr style={{ background: 'rgba(255, 255, 255, 0.08)', fontWeight: 'bold' }}>
                                <td colSpan={2}>TỔNG CỘNG</td>
                                <td className="text-right font-mono">{formatCurrency(totalSpend)}</td>
                                <td className="text-right">{formatNumber(totalContacts)}</td>
                                <td className="text-right font-mono">{totalCostPerEngagement > 0 ? formatCurrency(totalCostPerEngagement) : '—'}</td>
                                <td className="text-right c-blue">{formatNumber(totalLeads)}</td>
                                <td className="text-right font-mono">{totalCostPerLead > 0 ? formatCurrency(totalCostPerLead) : '—'}</td>
                                <td className="text-right c-blue">{totalLeadsToEngagement > 0 ? `${totalLeadsToEngagement.toFixed(1)}%` : '—'}</td>
                                <td className="text-right c-emerald">{formatNumber(totalShowups)}</td>
                                <td className="text-right font-mono">{totalCostPerShowup > 0 ? formatCurrency(totalCostPerShowup) : '—'}</td>
                                <td className="text-right c-emerald">{totalShowupsToEngagement > 0 ? `${totalShowupsToEngagement.toFixed(1)}%` : '—'}</td>
                              </tr>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
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
