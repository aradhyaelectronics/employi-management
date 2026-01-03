
import React from 'react';
import { 
  AppState, User, Company, UserRole, UserStatus, RequestStatus, 
  WorkLog, FinancialRequest, MonthlySalarySlip, 
  PaymentStatus, Project, Task, LeaveRequest, SalaryType, SubscriptionPlan, Attendance 
} from './types';

const STORAGE_KEY = 'pragati_data_v2';

const getInitialState = (): AppState => {
  try {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        projects: parsed.projects || [],
        tasks: parsed.tasks || [],
        leaves: parsed.leaves || [],
        version: '3.1.0-geofence'
      };
    }
  } catch (e) {}
  return {
    users: [], companies: [], sites: [], projects: [], tasks: [], leaves: [],
    attendance: [], workLogs: [], requests: [], subscriptionPlans: [
      { id: 'p-free', name: 'Standard (Free)', price: 0, durationDays: 365, userLimit: 5, features: ['Basic Attendance', 'Work Logs', 'Manual Payroll'] },
      { id: 'p-pro', name: 'Enterprise Pro', price: 4999, durationDays: 30, userLimit: 50, features: ['Advanced Payroll', 'Geofencing', 'Task Management', 'Leave Portal', 'AI Audits'] }
    ],
    salarySlips: [], version: '3.1.0-geofence'
  };
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

  return {
    state,
    addUser: async (u: any) => {
      const newUser = { 
        status: UserStatus.PENDING, 
        ...u, 
        id: `u-${Date.now()}` 
      };
      updateState(p => ({ ...p, users: [...p.users, newUser] }));
      return newUser;
    },
    updateUser: async (id: string, updates: Partial<User>) => {
      updateState(p => ({
        ...p,
        users: p.users.map(u => u.id === id ? { ...u, ...updates } : u)
      }));
    },
    removeUser: async (id: string) => {
      updateState(p => ({
        ...p,
        users: p.users.filter(u => u.id !== id)
      }));
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
      const time = manualTime || new Date().toLocaleTimeString();
      
      const onLeave = state.leaves.some(l => 
        l.userId === uid && 
        l.status === RequestStatus.APPROVED && 
        date >= l.fromDate && date <= l.toDate
      );
      if (onLeave && type === 'IN' && !manualDate) throw new Error("Attendance blocked: User is on approved leave.");

      const existingRecord = state.attendance.find(a => a.userId === uid && a.date === date);
      if (type === 'IN' && existingRecord) {
        throw new Error(`Duplicate Entry: Attendance for ${date} already exists in the system.`);
      }

      updateState(p => {
        if (type === 'IN') {
          return { ...p, attendance: [...p.attendance, { id: `a-${Date.now()}`, userId: uid, companyId: cid, siteId, date: date, checkIn: time, ...coords }] };
        } else {
          return { ...p, attendance: p.attendance.map(a => (a.userId === uid && a.date === date && !a.checkOut) ? { ...a, checkOut: time, overtimeHours: ot } : a) };
        }
      });
    },
    updateAttendance: async (id: string, updates: Partial<Attendance>) => {
      updateState(p => ({
        ...p,
        attendance: p.attendance.map(a => a.id === id ? { ...a, ...updates } : a)
      }));
    },
    addWorkLog: async (log: any) => updateState(p => ({ ...p, workLogs: [...p.workLogs, { ...log, id: `w-${Date.now()}` }] })),
    updateUserPin: async (id: string, pin: string) => updateState(p => ({ ...p, users: p.users.map(u => u.id === id ? { ...u, pin } : u) })),
    updateUserPassword: async (id: string, password: string) => {
      updateState(p => ({ ...p, users: p.users.map(u => u.id === id ? { ...u, password } : u) }));
    },
    updateUserSalary: async (id: string, salaryAmount: number, salaryType: SalaryType, overtimeRate: number) => {
      updateState(p => ({
        ...p,
        users: p.users.map(u => u.id === id ? { ...u, salaryAmount, salaryType, overtimeRate } : u)
      }));
    },
    addFinancialRequest: async (req: any) => updateState(p => ({ ...p, requests: [...p.requests, { ...req, id: `r-${Date.now()}` }] })),
    updateRequestStatus: async (id: string, status: RequestStatus) => updateState(p => ({ ...p, requests: p.requests.map(r => r.id === id ? { ...r, status } : r) })),
    addSite: async (s: any) => updateState(p => ({ ...p, sites: [...p.sites, { ...s, id: `s-${Date.now()}` }] })),
    removeSite: async (id: string) => updateState(p => ({ ...p, sites: p.sites.filter(s => s.id !== id) })),
    removeCompany: async (id: string) => updateState(p => ({ ...p, companies: p.companies.filter(c => c.id !== id) })),
    purchaseSubscription: async (cid: string, pid: string) => updateState(p => ({ ...p, companies: p.companies.map(c => c.id === cid ? { ...c, subscriptionPlanId: pid, subscriptionExpiry: new Date(Date.now() + 30 * 86400000).toISOString() } : c) })),
    updateSubscriptionPlanConfig: async (plan: SubscriptionPlan) => {
      updateState(p => ({ ...p, subscriptionPlans: p.subscriptionPlans.map(sp => sp.id === plan.id ? plan : sp) }));
    },
    
    addManualSalarySlip: async (slip: Omit<MonthlySalarySlip, 'id' | 'generatedDate'>) => {
      const exists = state.salarySlips.some(s => s.userId === slip.userId && s.month === slip.month && s.year === slip.year);
      if (exists) throw new Error("A salary slip already exists for this personnel in the selected period.");

      updateState(p => ({
        ...p,
        salarySlips: [...p.salarySlips, {
          ...slip,
          id: `slip-${slip.userId}-${Date.now()}`,
          generatedDate: new Date().toISOString()
        }]
      }));
    },

    generateMonthlySlips: async (cid: string, month: number, year: number) => {
      updateState(p => {
        const companyUsers = p.users.filter(u => u.companyId === cid && u.role !== UserRole.SUPER_ADMIN);
        const newSlips: MonthlySalarySlip[] = companyUsers.map(u => {
          const monthAttendance = p.attendance.filter(a => 
            a.userId === u.id && 
            new Date(a.date).getMonth() === month && 
            new Date(a.date).getFullYear() === year
          );
          const totalOtHours = monthAttendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);
          const otPay = totalOtHours * (u.overtimeRate || 0);

          let basePay = u.salaryAmount || 0;
          if (u.salaryType === SalaryType.DAILY_WAGE) {
            basePay = (u.salaryAmount || 0) * monthAttendance.length;
          }

          const approvedAdvances = p.requests.filter(r => 
            r.userId === u.id && 
            r.type === 'ADVANCE' && 
            r.status === RequestStatus.APPROVED &&
            new Date(r.date).getMonth() === month &&
            new Date(r.date).getFullYear() === year
          );
          const advanceDeduction = approvedAdvances.reduce((sum, r) => sum + r.amount, 0);

          return {
            id: `slip-${u.id}-${month}-${year}`,
            userId: u.id,
            companyId: cid,
            month,
            year,
            baseAmount: basePay,
            overtimeAmount: otPay,
            overtimeHours: totalOtHours,
            advanceDeduction: advanceDeduction,
            totalAmount: (basePay + otPay) - advanceDeduction,
            status: PaymentStatus.UNPAID,
            generatedDate: new Date().toISOString()
          };
        });

        const filteredOld = p.salarySlips.filter(s => !(s.companyId === cid && s.month === month && s.year === year));
        return { ...p, salarySlips: [...filteredOld, ...newSlips] };
      });
    },
    updateSalaryStatus: async (slipId: string, status: PaymentStatus) => {
      updateState(p => ({ ...p, salarySlips: p.salarySlips.map(s => s.id === slipId ? { ...s, status } : s) }));
    }
  };
};
