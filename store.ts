
import React from 'react';
import { 
  AppState, User, Company, UserRole, UserStatus, RequestStatus, 
  WorkLog, FinancialRequest, MonthlySalarySlip, ServerEvent,
  PaymentStatus, Project, Task, LeaveRequest, SalaryType, SubscriptionPlan, Attendance 
} from './types';

const STORAGE_KEY = 'employeemanagement_cloud_v4';
const CURRENT_VERSION = '4.7.6-payroll-loss-recovery';
const STANDARD_SHIFT_HOURS = 8;

const normalizeMobile = (num: string | undefined): string => {
  if (!num) return '';
  const cleaned = num.replace(/\D/g, '');
  return cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;
};

const MASTER_ADMIN: User = {
  id: 'PR-MASTER-001',
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
    const mergedState: AppState = { ...DEFAULT_STATE, ...parsed, version: CURRENT_VERSION };
    if (!mergedState.users.some(u => u.id === MASTER_ADMIN.id)) mergedState.users.unshift(MASTER_ADMIN);
    return mergedState;
  } catch (e) {
    return DEFAULT_STATE;
  }
};

export const saveState = (state: AppState) => {
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const useStore = () => {
  const [state, setState] = React.useState<AppState>(getInitialState());

  const pushCloudUpdate = (updater: (prev: AppState) => AppState, logMsg?: string) => {
    setState(prev => {
      const next = updater(prev);
      if (logMsg) {
        const newLog: ServerEvent = { id: `evt-${Date.now()}`, timestamp: new Date().toISOString(), type: 'SYNC', message: logMsg, source: 'REMOTE_SYNC' };
        next.systemLogs = [newLog, ...next.systemLogs].slice(0, 100);
      }
      saveState(next);
      return next;
    });
  };

  const calculateHours = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const s = start.split(':').map(Number);
    const e = end.split(':').map(Number);
    const startMins = s[0] * 60 + s[1];
    const endMins = e[0] * 60 + e[1];
    return Math.max(0, (endMins - startMins) / 60);
  };

  return {
    state,
    resetSystem: () => { if(confirm("This will erase all enterprise data. Continue?")) { localStorage.removeItem(STORAGE_KEY); window.location.reload(); } },
    
    getAiSystemContext: (companyId?: string) => {
      const users = state.users.filter(u => companyId ? u.companyId === companyId : true);
      const logs = state.workLogs.filter(l => companyId ? l.companyId === companyId : true);
      const attendance = state.attendance.filter(a => companyId ? a.companyId === companyId : true);
      
      return {
        totalEmployees: users.length,
        totalProductionMeters: logs.reduce((s, l) => s + l.meters, 0),
        activeSites: state.sites.filter(s => companyId ? s.companyId === companyId : true).length,
        pendingRequests: state.requests.filter(r => (companyId ? r.companyId === companyId : true) && r.status === 'PENDING').length,
        averageShiftHours: attendance.length > 0 ? (attendance.filter(a => a.checkOut).reduce((s, a) => s + calculateHours(a.checkIn, a.checkOut!), 0) / attendance.filter(a => a.checkOut).length) : 0,
        recentActivity: logs.slice(-5).map(l => `${l.date}: ${l.workType} - ${l.meters}m`),
        version: CURRENT_VERSION
      };
    },

    authenticate: (identifier: string, secret: string): User | null => {
      const cleanId = identifier.trim().toUpperCase();
      const cleanMobile = normalizeMobile(identifier);
      const cleanSecret = secret.trim();
      
      const user = state.users.find(u => {
        const idMatch = u.id.toUpperCase() === cleanId;
        const emailMatch = u.email.toUpperCase() === cleanId;
        const mobileMatch = u.mobile && normalizeMobile(u.mobile) === cleanMobile;
        const secretMatch = u.pin === cleanSecret || u.password === cleanSecret;
        return (idMatch || emailMatch || mobileMatch) && secretMatch;
      });

      if (user && user.role !== UserRole.SUPER_ADMIN) {
        const comp = state.companies.find(c => c.id === user.companyId);
        if (comp?.status === UserStatus.BLOCKED) throw new Error("This enterprise is blocked by Master Root.");
      }
      return user || null;
    },

    addUser: async (u: any) => {
      const prefix = u.role === UserRole.SUPER_ADMIN ? 'PR-ROOT' : u.role === UserRole.ADMIN ? 'PR-ADM' : u.role === UserRole.SUPERVISOR ? 'PR-SUP' : 'PR-EMP';
      const newId = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
      const newUser = { ...u, id: newId, status: u.status || UserStatus.ACTIVE };
      pushCloudUpdate(p => ({ ...p, users: [...p.users, newUser] }), `USER_ENROLLED: ${newId}`);
      return newUser;
    },

    addCompany: async (name: string) => {
      const c: Company = { id: `CORP-${Math.floor(1000 + Math.random() * 9000)}`, name, createdAt: new Date().toISOString(), status: UserStatus.ACTIVE, subscriptionPlanId: 'p-free' };
      pushCloudUpdate(p => ({ ...p, companies: [...p.companies, c] }), `ENTERPRISE_CREATED: ${name}`);
      return c;
    },

    updateCompanyStatus: async (id: string, status: UserStatus) => pushCloudUpdate(p => ({ ...p, companies: p.companies.map(c => c.id === id ? { ...c, status } : c) })),
    purchaseSubscription: async (cid: string, pid: string, months: number = 1) => pushCloudUpdate(p => ({ ...p, companies: p.companies.map(c => c.id === cid ? { ...c, subscriptionPlanId: pid, subscriptionExpiry: new Date(Date.now() + (months * 30) * 86400000).toISOString() } : c) })),
    removeCompany: async (id: string) => pushCloudUpdate(p => ({ ...p, companies: p.companies.filter(c => c.id !== id), users: p.users.filter(u => u.companyId !== id) })),
    updateUser: async (id: string, updates: Partial<User>) => pushCloudUpdate(p => ({ ...p, users: p.users.map(u => u.id === id ? { ...u, ...updates } : u) })),
    removeUser: async (id: string) => pushCloudUpdate(p => ({ ...p, users: p.users.filter(u => u.id !== id) })),
    
    markAttendance: async (uid: string, cid: string, type: 'IN' | 'OUT', coords?: any, ot?: number, manualDate?: string, manualTime?: string, siteId?: string) => {
      const date = manualDate || new Date().toISOString().split('T')[0];
      const time = manualTime || new Date().toLocaleTimeString('en-GB', { hour12: false });
      
      pushCloudUpdate(p => {
        const existing = p.attendance.find(a => a.userId === uid && a.date === date);

        if (type === 'IN') {
          if (existing) return p;
          return { ...p, attendance: [...p.attendance, { id: `att-${Date.now()}`, userId: uid, companyId: cid, siteId, date, checkIn: time, ...coords }] };
        } else {
          if (existing && !existing.checkOut) {
            let finalOt = ot;
            if (finalOt === undefined || finalOt === 0) {
              const h = calculateHours(existing.checkIn, time);
              finalOt = Math.max(0, h - STANDARD_SHIFT_HOURS);
            }
            return { ...p, attendance: p.attendance.map(a => a.id === existing.id ? { ...a, checkOut: time, overtimeHours: finalOt } : a) };
          }
          return p;
        }
      }, `ATTENDANCE_LOG: ${uid} ${type} on ${date}`);
    },

    updateAttendance: async (id: string, updates: Partial<Attendance>) => pushCloudUpdate(p => ({ ...p, attendance: p.attendance.map(a => a.id === id ? { ...a, ...updates } : a) })),
    removeAttendance: async (id: string) => pushCloudUpdate(p => ({ ...p, attendance: p.attendance.filter(a => a.id !== id) }), `ATTENDANCE_REMOVED: ${id}`),

    generateMonthlySlips: async (cid: string, month: number, year: number) => {
      pushCloudUpdate(p => {
        const users = p.users.filter(u => u.companyId === cid && u.role !== UserRole.SUPER_ADMIN);
        const newSlips: MonthlySalarySlip[] = users.map(u => {
          const monthAtt = p.attendance.filter(a => a.userId === u.id && new Date(a.date).getMonth() === month && new Date(a.date).getFullYear() === year);
          let hourlyRate = u.salaryType === SalaryType.DAILY_WAGE ? (u.salaryAmount || 0) / STANDARD_SHIFT_HOURS : ((u.salaryAmount || 0) / 30) / STANDARD_SHIFT_HOURS;
          let pay = 0, otPay = 0, totalOtHours = 0;
          
          monthAtt.forEach(att => {
            if (att.checkIn && att.checkOut) {
              const h = calculateHours(att.checkIn, att.checkOut);
              pay += Math.min(h, STANDARD_SHIFT_HOURS) * hourlyRate;
              const otHours = att.overtimeHours || Math.max(0, h - STANDARD_SHIFT_HOURS);
              totalOtHours += otHours;
              otPay += otHours * (u.overtimeRate || (hourlyRate * 1.5));
            }
          });

          // Advances and Penalties (Damages)
          const adv = p.requests.filter(r => r.userId === u.id && r.type === 'ADVANCE' && r.status === RequestStatus.APPROVED && new Date(r.date).getMonth() === month).reduce((s, r) => s + r.amount, 0);
          const penalties = p.requests.filter(r => r.userId === u.id && r.type === 'PENALTY' && new Date(r.date).getMonth() === month).reduce((s, r) => s + r.amount, 0);
          
          const deductions = (u.pfAmount || 0) + (u.medicalAmount || 0);

          return {
            id: `slip-${u.id}-${month}-${year}`, userId: u.id, companyId: cid, month, year,
            baseAmount: Math.round(pay), overtimeAmount: Math.round(otPay), overtimeHours: totalOtHours,
            advanceDeduction: adv, penaltyDeduction: penalties,
            pfDeduction: u.pfEnabled ? (u.pfAmount || 0) : 0, medicalDeduction: u.medicalEnabled ? (u.medicalAmount || 0) : 0,
            totalAmount: Math.round((pay + otPay) - adv - penalties - deductions),
            status: PaymentStatus.UNPAID, generatedDate: new Date().toISOString()
          };
        });
        return { ...p, salarySlips: [...p.salarySlips.filter(s => !(s.companyId === cid && s.month === month)), ...newSlips] };
      }, `PAYROLL_GENERATED: ${cid}`);
    },

    addWorkLog: async (log: any) => pushCloudUpdate(p => ({ ...p, workLogs: [...p.workLogs, { ...log, id: `w-${Date.now()}` }] })),
    addFinancialRequest: async (req: any) => pushCloudUpdate(p => ({ ...p, requests: [...p.requests, { ...req, id: `r-${Date.now()}` }] })),
    updateRequestStatus: async (id: string, status: RequestStatus) => pushCloudUpdate(p => ({ ...p, requests: p.requests.map(r => r.id === id ? { ...r, status } : r) })),
    addSite: async (s: any) => pushCloudUpdate(p => ({ ...p, sites: [...p.sites, { ...s, id: `s-${Date.now()}` }] })),
    removeSite: async (id: string) => pushCloudUpdate(p => ({ ...p, sites: p.sites.filter(s => s.id !== id) })),
    updateSubscriptionPlanConfig: async (plan: SubscriptionPlan) => pushCloudUpdate(p => ({ ...p, subscriptionPlans: p.subscriptionPlans.map(sp => sp.id === plan.id ? plan : sp) })),
    addManualSalarySlip: async (slip: any) => pushCloudUpdate(p => ({ ...p, salarySlips: [...p.salarySlips, { ...slip, id: `slip-m-${Date.now()}`, generatedDate: new Date().toISOString() }] })),
    updateSalaryStatus: async (id: string, status: PaymentStatus) => pushCloudUpdate(p => ({ ...p, salarySlips: p.salarySlips.map(s => s.id === id ? { ...s, status } : s) })),
    updateUserPin: async (id: string, pin: string) => pushCloudUpdate(p => ({ ...p, users: p.users.map(u => u.id === id ? { ...u, pin } : u) })),
    updateUserPassword: async (id: string, password: string) => pushCloudUpdate(p => ({ ...p, users: p.users.map(u => u.id === id ? { ...u, password } : u) })),

    // Project and Task Management Functions
    addProject: async (p: any) => pushCloudUpdate(prev => ({ ...prev, projects: [...prev.projects, { ...p, id: `p-${Date.now()}` }] }), `PROJECT_CREATED: ${p.name}`),
    addTask: async (t: any) => pushCloudUpdate(prev => ({ ...prev, tasks: [...prev.tasks, { ...t, id: `t-${Date.now()}`, status: 'TODO' }] }), `TASK_CREATED: ${t.name}`),
    updateTaskStatus: async (id: string, status: 'TODO' | 'IN_PROGRESS' | 'DONE') => pushCloudUpdate(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === id ? { ...t, status } : t) }), `TASK_STATUS_SYNC: ${id} -> ${status}`)
  };
};
