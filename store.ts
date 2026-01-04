
import React from 'react';
import { 
  AppState, User, Company, UserRole, UserStatus, RequestStatus, 
  WorkLog, FinancialRequest, MonthlySalarySlip, 
  PaymentStatus, Project, Task, LeaveRequest, SalaryType, SubscriptionPlan, Attendance 
} from './types';

const STORAGE_KEY = 'employeemanagement_data_v3';
const STANDARD_SHIFT_HOURS = 8;

// Robust normalization for mobile numbers
const normalizeMobile = (num: string | undefined): string => {
  if (!num) return '';
  // Remove all non-numeric characters
  const cleaned = num.replace(/\D/g, '');
  // Strip Indian 91 prefix if present for consistent local matching
  if (cleaned.length === 12 && cleaned.startsWith('91')) return cleaned.substring(2);
  return cleaned;
};

// Default Master Admin used for system recovery and first-time setup
const MASTER_ADMIN: User = {
  id: 'u-root-001',
  name: 'Pragati Master',
  email: 'admin@pragati.com',
  mobile: '0000000000',
  role: UserRole.SUPER_ADMIN,
  status: UserStatus.ACTIVE,
  companyId: 'SYSTEM',
  password: 'admin',
  pin: '1234'
};

const getInitialState = (): AppState => {
  try {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored) {
      const parsed = JSON.parse(stored);
      
      // Merge logic: Ensure MASTER_ADMIN is always in the users list
      const users = parsed.users || [];
      const hasMaster = users.some((u: User) => u.email === MASTER_ADMIN.email || u.id === MASTER_ADMIN.id);
      
      return {
        ...parsed,
        users: hasMaster ? users : [MASTER_ADMIN, ...users],
        projects: parsed.projects || [],
        tasks: parsed.tasks || [],
        leaves: parsed.leaves || [],
        version: '4.2.1-pragati-master-ops'
      };
    }
  } catch (e) {
    console.error("Store recovery failed, initializing fresh state.");
  }

  return {
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
      { id: 'p-pro', name: 'Enterprise Pro', price: 4999, durationDays: 30, userLimit: 50, features: ['Advanced Payroll', 'Geofencing', 'Task Management', 'Leave Portal', 'AI Audits'] }
    ],
    salarySlips: [], 
    version: '4.2.1-pragati-master-ops'
  };
};

const calculateHours = (start: string, end: string): number => {
  if (!start || !end) return 0;
  try {
    const s = start.split(':').map(Number);
    const e = end.split(':').map(Number);
    const startMins = s[0] * 60 + s[1];
    const endMins = e[0] * 60 + e[1];
    const diff = endMins - startMins;
    return Math.max(0, diff / 60);
  } catch {
    return 0;
  }
};

export const saveState = (state: AppState) => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

export const useStore = () => {
  const [state, setState] = React.useState<AppState>(getInitialState());

  const updateState = (updater: (prev: AppState) => AppState) => {
    setState(prev => {
      const next = updater(prev);
      saveState(next);
      return next;
    });
  };

  const resetSystem = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  return {
    state,
    resetSystem,
    authenticate: (identifier: string, secret: string): User | null => {
      const cleanId = identifier.trim().toLowerCase();
      const cleanMobileId = normalizeMobile(cleanId);
      const cleanSecret = secret.trim();

      if (!cleanId || !cleanSecret) return null;

      return state.users.find(u => {
        const storedEmail = (u.email || '').trim().toLowerCase();
        const storedMobile = normalizeMobile(u.mobile);
        const storedPassword = (u.password || '').trim();
        const storedPin = (u.pin || '').trim();
        
        const isEmailMatch = storedEmail === cleanId;
        const isMobileMatch = cleanMobileId !== '' && storedMobile === cleanMobileId;
        const isSecretMatch = storedPassword === cleanSecret || storedPin === cleanSecret;

        return (isEmailMatch || isMobileMatch) && isSecretMatch;
      }) || null;
    },

    addUser: async (u: any) => {
      const cleanMobile = u.mobile ? u.mobile.trim() : '';
      const normMobile = normalizeMobile(cleanMobile);
      const cleanEmail = (u.email || '').trim().toLowerCase();
      
      const exists = state.users.find(ex => {
        if (cleanEmail && ex.email.toLowerCase() === cleanEmail) return true;
        if (normMobile && normalizeMobile(ex.mobile) === normMobile) return true;
        return false;
      });

      if (exists) throw new Error("ID Conflict: Email or Mobile already registered.");

      const newUser = { 
        status: UserStatus.PENDING, 
        ...u, 
        mobile: cleanMobile,
        email: cleanEmail,
        id: `u-${Date.now()}` 
      };
      updateState(p => ({ ...p, users: [...p.users, newUser] }));
      return newUser;
    },
    updateUser: async (id: string, updates: Partial<User>) => {
      updateState(p => ({ ...p, users: p.users.map(u => u.id === id ? { ...u, ...updates } : u) }));
    },
    removeUser: async (id: string) => {
      updateState(p => ({ ...p, users: p.users.filter(u => u.id !== id) }));
    },
    addCompany: async (name: string) => {
      const c = { id: `c-${Date.now()}`, name, createdAt: new Date().toISOString(), subscriptionPlanId: 'p-free' };
      updateState(p => ({ ...p, companies: [...p.companies, c] }));
      return c;
    },
    addProject: async (proj: Omit<Project, 'id'>) => {
      updateState(p => ({ ...p, projects: [...p.projects, { ...proj, id: `p-${Date.now()}` }] }));
    },
    addTask: async (task: Omit<Task, 'id'>) => {
      updateState(p => ({ ...p, tasks: [...p.tasks, { ...task, id: `t-${Date.now()}`, status: 'TODO' }] }));
    },
    updateTaskStatus: async (id: string, status: 'TODO' | 'IN_PROGRESS' | 'DONE') => {
      updateState(p => ({ ...p, tasks: p.tasks.map(t => t.id === id ? { ...t, status } : t) }));
    },
    addLeaveRequest: async (leave: Omit<LeaveRequest, 'id' | 'status' | 'requestDate'>) => {
      const req = { ...leave, id: `l-${Date.now()}`, status: RequestStatus.PENDING, requestDate: new Date().toISOString() };
      updateState(p => ({ ...p, leaves: [...p.leaves, req] }));
    },
    updateLeaveStatus: async (id: string, status: RequestStatus) => {
      updateState(p => ({ ...p, leaves: p.leaves.map(l => l.id === id ? { ...l, status } : l) }));
    },
    markAttendance: async (uid: string, cid: string, type: 'IN' | 'OUT', coords?: any, ot?: number, manualDate?: string, manualTime?: string, siteId?: string) => {
      const date = manualDate || new Date().toISOString().split('T')[0];
      const time = manualTime || new Date().toLocaleTimeString('en-GB', { hour12: false });
      
      updateState(p => {
        if (type === 'IN') {
          const exists = p.attendance.find(a => a.userId === uid && a.date === date);
          if (exists) return p;
          return { ...p, attendance: [...p.attendance, { id: `a-${Date.now()}`, userId: uid, companyId: cid, siteId, date, checkIn: time, ...coords }] };
        } else {
          return { ...p, attendance: p.attendance.map(a => (a.userId === uid && a.date === date && !a.checkOut) ? { ...a, checkOut: time, overtimeHours: ot } : a) };
        }
      });
    },
    updateAttendance: async (id: string, updates: Partial<Attendance>) => {
      updateState(p => ({ ...p, attendance: p.attendance.map(a => a.id === id ? { ...a, ...updates } : a) }));
    },
    addWorkLog: async (log: any) => updateState(p => ({ ...p, workLogs: [...p.workLogs, { ...log, id: `w-${Date.now()}` }] })),
    updateUserPin: async (id: string, pin: string) => updateState(p => ({ ...p, users: p.users.map(u => u.id === id ? { ...u, pin } : u) })),
    updateUserPassword: async (id: string, password: string) => {
      updateState(p => ({ ...p, users: p.users.map(u => u.id === id ? { ...u, password } : u) }));
    },
    addFinancialRequest: async (req: any) => updateState(p => ({ ...p, requests: [...p.requests, { ...req, id: `r-${Date.now()}` }] })),
    updateRequestStatus: async (id: string, status: RequestStatus) => updateState(p => ({ ...p, requests: p.requests.map(r => r.id === id ? { ...r, status } : r) })),
    addSite: async (s: any) => updateState(p => ({ ...p, sites: [...p.sites, { ...s, id: `s-${Date.now()}` }] })),
    removeSite: async (id: string) => updateState(p => ({ ...p, sites: p.sites.filter(s => s.id !== id) })),
    removeCompany: async (id: string) => updateState(p => ({ ...p, companies: p.companies.filter(c => c.id !== id) })),
    purchaseSubscription: async (cid: string, pid: string, months: number = 1) => {
      updateState(p => ({ 
        ...p, 
        companies: p.companies.map(c => c.id === cid ? { 
          ...c, 
          subscriptionPlanId: pid, 
          subscriptionExpiry: new Date(Date.now() + (months * 30) * 86400000).toISOString() 
        } : c) 
      }));
    },
    updateSubscriptionPlanConfig: async (plan: SubscriptionPlan) => {
      updateState(p => ({ ...p, subscriptionPlans: p.subscriptionPlans.map(sp => sp.id === plan.id ? plan : sp) }));
    },
    addManualSalarySlip: async (slip: Omit<MonthlySalarySlip, 'id' | 'generatedDate'>) => {
      updateState(p => ({ ...p, salarySlips: [...p.salarySlips, { ...slip, id: `slip-${Date.now()}`, generatedDate: new Date().toISOString() }] }));
    },
    generateMonthlySlips: async (cid: string, month: number, year: number) => {
      updateState(p => {
        const companyUsers = p.users.filter(u => u.companyId === cid && u.role !== UserRole.SUPER_ADMIN);
        const newSlips: MonthlySalarySlip[] = companyUsers.map(u => {
          const monthAttendance = p.attendance.filter(a => a.userId === u.id && new Date(a.date).getMonth() === month && new Date(a.date).getFullYear() === year);
          let hourlyRate = u.salaryType === SalaryType.DAILY_WAGE ? (u.salaryAmount || 0) / STANDARD_SHIFT_HOURS : ((u.salaryAmount || 0) / 30) / STANDARD_SHIFT_HOURS;
          let totalCalculatedPay = 0, totalOtPay = 0, totalHoursWorked = 0;
          monthAttendance.forEach(att => {
            if (att.checkIn && att.checkOut) {
              const hours = calculateHours(att.checkIn, att.checkOut);
              totalHoursWorked += hours;
              totalCalculatedPay += Math.min(hours, STANDARD_SHIFT_HOURS) * hourlyRate;
              totalOtPay += (Math.max(0, hours - STANDARD_SHIFT_HOURS) + (att.overtimeHours || 0)) * (u.overtimeRate || hourlyRate);
            }
          });
          const advanceDeduction = p.requests.filter(r => r.userId === u.id && r.type === 'ADVANCE' && r.status === RequestStatus.APPROVED && new Date(r.date).getMonth() === month && new Date(r.date).getFullYear() === year).reduce((sum, r) => sum + r.amount, 0);
          const pfDeduction = u.pfEnabled ? (u.pfAmount || 0) : 0;
          const medicalDeduction = u.medicalEnabled ? (u.medicalAmount || 0) : 0;
          return {
            id: `slip-${u.id}-${month}-${year}-${Date.now()}`, userId: u.id, companyId: cid, month, year,
            baseAmount: Math.round(totalCalculatedPay), overtimeAmount: Math.round(totalOtPay), overtimeHours: Math.round(totalHoursWorked),
            advanceDeduction, pfDeduction, medicalDeduction,
            totalAmount: Math.round((totalCalculatedPay + totalOtPay) - advanceDeduction - pfDeduction - medicalDeduction),
            status: PaymentStatus.UNPAID, generatedDate: new Date().toISOString()
          };
        });
        return { ...p, salarySlips: [...p.salarySlips.filter(s => !(s.companyId === cid && s.month === month && s.year === year)), ...newSlips] };
      });
    },
    updateSalaryStatus: async (slipId: string, status: PaymentStatus) => {
      updateState(p => ({ ...p, salarySlips: p.salarySlips.map(s => s.id === slipId ? { ...s, status } : s) }));
    }
  };
};
