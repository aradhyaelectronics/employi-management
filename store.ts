
import React from 'react';
import { 
  AppState, User, Company, UserRole, UserStatus, RequestStatus, 
  WorkLog, FinancialRequest, MonthlySalarySlip, ServerEvent,
  PaymentStatus, Project, Task, LeaveRequest, SalaryType, SubscriptionPlan, Attendance 
} from './types';

const STORAGE_KEY = 'employeemanagement_cloud_v4';
const CURRENT_VERSION = '4.5.0-dynamic-cloud';
const STANDARD_SHIFT_HOURS = 8;

const normalizeMobile = (num: string | undefined): string => {
  if (!num) return '';
  const cleaned = num.replace(/\D/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('91')) return cleaned.substring(2);
  return cleaned;
};

const MASTER_ADMIN: User = {
  id: 'u-root-001',
  name: 'Pragati Master',
  email: 'admin@pragati.com',
  mobile: '7709384869',
  role: UserRole.SUPER_ADMIN,
  status: UserStatus.ACTIVE,
  companyId: 'SYSTEM',
  password: 'admin',
  pin: '1234'
};

const DEFAULT_STATE: AppState = {
  users: [MASTER_ADMIN], 
  companies: [], 
  sites: [], 
  projects: [], 
  tasks: [], 
  leaves: [],
  attendance: [], 
  workLogs: [], 
  requests: [], 
  subscriptionPlans: [
    { id: 'p-free', name: 'Standard (Free)', price: 0, durationDays: 365, userLimit: 5, features: ['Basic Attendance', 'Work Logs', 'Manual Payroll'] },
    { id: 'p-pro', name: 'Enterprise Pro', price: 4999, durationDays: 30, userLimit: 50, features: ['Advanced Payroll', 'Geofencing', 'Task Management', 'Leave Portal', 'AI Audits'] },
    { id: 'p-ultra', name: 'Elite Infrastructure', price: 12999, durationDays: 30, userLimit: 500, features: ['24/7 Priority Support', 'Dedicated Cloud Node', 'Custom API Access'] }
  ],
  salarySlips: [], 
  systemLogs: [{ id: 'evt-0', timestamp: new Date().toISOString(), type: 'INFO', message: 'Cloud Server Initialized', source: 'CORE' }],
  version: CURRENT_VERSION
};

const getInitialState = (): AppState => {
  try {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!stored) return DEFAULT_STATE;

    const parsed = JSON.parse(stored);
    
    // Non-destructive update: Merge existing data with default containers
    const mergedState: AppState = { 
      ...DEFAULT_STATE, 
      ...parsed,
      version: CURRENT_VERSION 
    };

    // Fix array structures if corrupted
    mergedState.users = Array.isArray(parsed.users) ? parsed.users : [MASTER_ADMIN];
    mergedState.companies = Array.isArray(parsed.companies) ? parsed.companies : [];
    mergedState.systemLogs = Array.isArray(parsed.systemLogs) ? parsed.systemLogs : DEFAULT_STATE.systemLogs;

    // Failsafe: Re-inject Master if missing
    if (!mergedState.users.some(u => u.id === MASTER_ADMIN.id)) {
      mergedState.users.unshift(MASTER_ADMIN);
    }

    return mergedState;
  } catch (e) {
    return DEFAULT_STATE;
  }
};

export const saveState = (state: AppState) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
};

export const useStore = () => {
  const [state, setState] = React.useState<AppState>(getInitialState());

  // Cloud Simulation Layer: All updates logged as server events
  const pushCloudUpdate = (updater: (prev: AppState) => AppState, logMsg?: string) => {
    setState(prev => {
      const next = updater(prev);
      if (logMsg) {
        const newLog: ServerEvent = {
          id: `evt-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'SYNC',
          message: logMsg,
          source: 'REMOTE_SYNC'
        };
        next.systemLogs = [newLog, ...next.systemLogs].slice(0, 100);
      }
      saveState(next);
      return next;
    });
  };

  const calculateHours = (start: string, end: string): number => {
    if (!start || !end) return 0;
    try {
      const s = start.split(':').map(Number);
      const e = end.split(':').map(Number);
      return Math.max(0, ((e[0] * 60 + e[1]) - (s[0] * 60 + s[1])) / 60);
    } catch { return 0; }
  };

  return {
    state,
    resetSystem: () => {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    },
    authenticate: (identifier: string, secret: string): User | null => {
      const cleanId = identifier.trim().toLowerCase();
      const cleanMobileId = normalizeMobile(cleanId);
      const cleanSecret = secret.trim();

      const user = state.users.find(u => {
        const storedEmail = (u.email || '').trim().toLowerCase();
        const storedMobile = normalizeMobile(u.mobile);
        return (storedEmail === cleanId || (cleanMobileId !== '' && storedMobile === cleanMobileId)) 
               && (u.password === cleanSecret || u.pin === cleanSecret);
      });

      if (user && user.role !== UserRole.SUPER_ADMIN) {
        const comp = state.companies.find(c => c.id === user.companyId);
        if (comp?.status === UserStatus.BLOCKED) throw new Error("Enterprise Suspended.");
      }
      return user || null;
    },

    // Dynamic Entity Management
    addUser: async (u: any) => {
      const normMobile = normalizeMobile(u.mobile);
      if (state.users.some(ex => (u.email && ex.email.toLowerCase() === u.email.toLowerCase()) || (normMobile && normalizeMobile(ex.mobile) === normMobile))) {
        throw new Error("Conflict: Identity already in registry.");
      }
      const newUser = { ...u, id: `u-${Date.now()}`, status: u.status || UserStatus.ACTIVE };
      pushCloudUpdate(p => ({ ...p, users: [...p.users, newUser] }), `POST /api/v1/users/${newUser.id} - Created`);
      return newUser;
    },

    addCompany: async (name: string) => {
      const c: Company = { 
        id: `c-${Date.now()}`, 
        name, 
        createdAt: new Date().toISOString(), 
        status: UserStatus.ACTIVE,
        subscriptionPlanId: 'p-free' 
      };
      pushCloudUpdate(p => ({ ...p, companies: [...p.companies, c] }), `POST /api/v1/enterprises - New Org: ${name}`);
      return c;
    },

    updateCompanyStatus: async (id: string, status: UserStatus) => {
      pushCloudUpdate(p => ({ ...p, companies: p.companies.map(c => c.id === id ? { ...c, status } : c) }), `PATCH /api/v1/enterprises/${id}/status - ${status}`);
    },

    purchaseSubscription: async (cid: string, pid: string, months: number = 1) => {
      pushCloudUpdate(p => ({ 
        ...p, 
        companies: p.companies.map(c => c.id === cid ? { 
          ...c, 
          subscriptionPlanId: pid, 
          subscriptionExpiry: new Date(Date.now() + (months * 30) * 86400000).toISOString() 
        } : c) 
      }), `PUT /api/v1/subscriptions/${cid} - Tier Shift to ${pid}`);
    },

    removeCompany: async (id: string) => {
      pushCloudUpdate(p => ({ 
        ...p, 
        companies: p.companies.filter(c => c.id !== id),
        users: p.users.filter(u => u.companyId !== id)
      }), `DELETE /api/v1/enterprises/${id} - Purged from Cluster`);
    },

    // Standard Operations (Passed to components)
    updateUser: async (id: string, updates: Partial<User>) => pushCloudUpdate(p => ({ ...p, users: p.users.map(u => u.id === id ? { ...u, ...updates } : u) })),
    removeUser: async (id: string) => pushCloudUpdate(p => ({ ...p, users: p.users.filter(u => u.id !== id) })),
    markAttendance: async (uid: string, cid: string, type: 'IN' | 'OUT', coords?: any, ot?: number, manualDate?: string, manualTime?: string, siteId?: string) => {
      const date = manualDate || new Date().toISOString().split('T')[0];
      const time = manualTime || new Date().toLocaleTimeString('en-GB', { hour12: false });
      pushCloudUpdate(p => {
        if (type === 'IN') {
          if (p.attendance.some(a => a.userId === uid && a.date === date)) return p;
          return { ...p, attendance: [...p.attendance, { id: `a-${Date.now()}`, userId: uid, companyId: cid, siteId, date, checkIn: time, ...coords }] };
        } else {
          return { ...p, attendance: p.attendance.map(a => (a.userId === uid && a.date === date && !a.checkOut) ? { ...a, checkOut: time, overtimeHours: ot } : a) };
        }
      }, `LOG /api/v1/telemetry/attendance - User ${uid} ${type}`);
    },
    updateAttendance: async (id: string, updates: Partial<Attendance>) => pushCloudUpdate(p => ({ ...p, attendance: p.attendance.map(a => a.id === id ? { ...a, ...updates } : a) })),
    addWorkLog: async (log: any) => pushCloudUpdate(p => ({ ...p, workLogs: [...p.workLogs, { ...log, id: `w-${Date.now()}` }] })),
    addFinancialRequest: async (req: any) => pushCloudUpdate(p => ({ ...p, requests: [...p.requests, { ...req, id: `r-${Date.now()}` }] })),
    updateRequestStatus: async (id: string, status: RequestStatus) => pushCloudUpdate(p => ({ ...p, requests: p.requests.map(r => r.id === id ? { ...r, status } : r) })),
    addSite: async (s: any) => pushCloudUpdate(p => ({ ...p, sites: [...p.sites, { ...s, id: `s-${Date.now()}` }] })),
    removeSite: async (id: string) => pushCloudUpdate(p => ({ ...p, sites: p.sites.filter(s => s.id !== id) })),
    addManualSalarySlip: async (slip: Omit<MonthlySalarySlip, 'id' | 'generatedDate'>) => pushCloudUpdate(p => ({ ...p, salarySlips: [...p.salarySlips, { ...slip, id: `slip-${Date.now()}`, generatedDate: new Date().toISOString() }] })),
    generateMonthlySlips: async (cid: string, month: number, year: number) => {
      pushCloudUpdate(p => {
        const users = p.users.filter(u => u.companyId === cid && u.role !== UserRole.SUPER_ADMIN);
        const newSlips: MonthlySalarySlip[] = users.map(u => {
          const monthAtt = p.attendance.filter(a => a.userId === u.id && new Date(a.date).getMonth() === month && new Date(a.date).getFullYear() === year);
          let hourlyRate = u.salaryType === SalaryType.DAILY_WAGE ? (u.salaryAmount || 0) / STANDARD_SHIFT_HOURS : ((u.salaryAmount || 0) / 30) / STANDARD_SHIFT_HOURS;
          let pay = 0, otPay = 0, hours = 0;
          monthAtt.forEach(att => {
            if (att.checkIn && att.checkOut) {
              const h = calculateHours(att.checkIn, att.checkOut);
              hours += h;
              pay += Math.min(h, STANDARD_SHIFT_HOURS) * hourlyRate;
              otPay += (Math.max(0, h - STANDARD_SHIFT_HOURS) + (att.overtimeHours || 0)) * (u.overtimeRate || hourlyRate);
            }
          });
          const adv = p.requests.filter(r => r.userId === u.id && r.type === 'ADVANCE' && r.status === RequestStatus.APPROVED && new Date(r.date).getMonth() === month).reduce((s, r) => s + r.amount, 0);
          return {
            id: `slip-${u.id}-${month}-${year}-${Date.now()}`, userId: u.id, companyId: cid, month, year,
            baseAmount: Math.round(pay), overtimeAmount: Math.round(otPay), overtimeHours: Math.round(hours),
            advanceDeduction: adv, pfDeduction: u.pfEnabled ? (u.pfAmount || 0) : 0, medicalDeduction: u.medicalEnabled ? (u.medicalAmount || 0) : 0,
            totalAmount: Math.round((pay + otPay) - adv - (u.pfAmount || 0) - (u.medicalAmount || 0)),
            status: PaymentStatus.UNPAID, generatedDate: new Date().toISOString()
          };
        });
        return { ...p, salarySlips: [...p.salarySlips.filter(s => !(s.companyId === cid && s.month === month)), ...newSlips] };
      }, `BATCH /api/v1/payroll/generate - Enterprise ${cid}`);
    },
    updateSalaryStatus: async (id: string, status: PaymentStatus) => pushCloudUpdate(p => ({ ...p, salarySlips: p.salarySlips.map(s => s.id === id ? { ...s, status } : s) })),
    updateSubscriptionPlanConfig: async (plan: SubscriptionPlan) => pushCloudUpdate(p => ({ ...p, subscriptionPlans: p.subscriptionPlans.map(sp => sp.id === plan.id ? plan : sp) })),
    addProject: async (proj: any) => pushCloudUpdate(p => ({ ...p, projects: [...p.projects, { ...proj, id: `p-${Date.now()}` }] })),
    addTask: async (task: any) => pushCloudUpdate(p => ({ ...p, tasks: [...p.tasks, { ...task, id: `t-${Date.now()}`, status: 'TODO' }] })),
    updateTaskStatus: async (id: string, status: any) => pushCloudUpdate(p => ({ ...p, tasks: p.tasks.map(t => t.id === id ? { ...t, status } : t) })),
    addLeaveRequest: async (leave: any) => pushCloudUpdate(p => ({ ...p, leaves: [...p.leaves, { ...leave, id: `l-${Date.now()}`, status: RequestStatus.PENDING, requestDate: new Date().toISOString() }] })),
    updateLeaveStatus: async (id: string, status: RequestStatus) => pushCloudUpdate(p => ({ ...p, leaves: p.leaves.map(l => l.id === id ? { ...l, status } : l) })),
    updateUserPin: async (id: string, pin: string) => pushCloudUpdate(p => ({ ...p, users: p.users.map(u => u.id === id ? { ...u, pin } : u) })),
    updateUserPassword: async (id: string, password: string) => pushCloudUpdate(p => ({ ...p, users: p.users.map(u => u.id === id ? { ...u, password } : u) }))
  };
};
