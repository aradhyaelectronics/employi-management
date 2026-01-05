
import React from 'react';
import { 
  AppState, User, Company, UserRole, UserStatus, RequestStatus, 
  WorkLog, FinancialRequest, MonthlySalarySlip, ServerEvent,
  PaymentStatus, Project, Task, LeaveRequest, SalaryType, SubscriptionPlan, Attendance, IntegrationConfig, Invoice, Offer, Advertisement, Announcement 
} from './types';

const STORAGE_KEY = 'pragati_master_v120_stable';
const CURRENT_VERSION = '1.2.0-locked';

const DEFAULT_WORK_TYPES = ['Cable Laying', 'Splicing', 'Trenching', 'Install Panel', 'Maintenance', 'Testing', 'Civil Work'];

const normalizeMobile = (num: string): string => {
  return (num || '').replace(/\D/g, '').slice(-10);
};

const MASTER_MOBILE = '7709384869';
const MASTER_PIN = '447922';
const HASHED_447922 = "f779e954c2560706596954930364d922f30b912185c7b3f9b88931295982855f"; 

export async function hashPIN(pin: string): Promise<string> {
  // MASTER OVERRIDE: Always return the correct SHA-256 for the Master PIN 
  // to ensure login works on Hostinger even without SSL initially.
  if (pin === MASTER_PIN) return HASHED_447922;

  try {
    if (window.isSecureContext && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(pin);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
    }
  } catch (e) {
    console.warn("Crypto API failed, falling back to basic hash.");
  }
  
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return "fallback_" + Math.abs(hash).toString(16);
}

const MASTER_ADMIN: User = {
  id: '100',
  name: 'Pragati Master Admin',
  email: 'pragatienterprises569@gmail.com',
  mobile: MASTER_MOBILE,
  role: UserRole.SUPER_ADMIN,
  status: UserStatus.ACTIVE,
  companyId: 'SYSTEM',
  pin_hash: HASHED_447922
};

const DEFAULT_STATE: AppState = {
  users: [MASTER_ADMIN], companies: [], sites: [], projects: [], tasks: [], leaves: [], attendance: [], workLogs: [], requests: [], otps: [],
  subscriptionPlans: [
    // Added missing offersEnabled property to comply with SubscriptionPlan interface
    { id: 'p-free', name: 'Standard (Free)', price: 0, durationDays: 365, userLimit: 5, features: ['Basic Attendance', 'Work Logs', 'Manual Payroll'], offersEnabled: false },
    { id: 'p-pro', name: 'Enterprise Pro', price: 4999, durationDays: 30, userLimit: 50, features: ['Advanced Payroll', 'Geofencing', 'Task Management', 'Leave Portal', 'AI Audits'], offersEnabled: true },
    { id: 'p-ultra', name: 'Elite Infrastructure', price: 12999, durationDays: 30, userLimit: 500, features: ['24/7 Priority Support', 'Dedicated Cloud Node', 'Custom API Access'], offersEnabled: true }
  ],
  offers: [],
  ads: [],
  announcement: { id: 'a1', title: 'System Online', message: 'Pragati Cloud is fully operational.', active: true, timestamp: new Date().toISOString() },
  salarySlips: [], invoices: [], apkUrl: 'https://manageremployee.co/app.apk',
  systemLogs: [{ id: 'evt-0', timestamp: new Date().toISOString(), type: 'INFO', message: 'Master Node Sync Complete', source: 'CORE' }],
  integrations: { razorpayKeyId: 'rzp_test_58Xm92p1Yk87X', razorpayKeySecret: '', razorpayEnabled: true, isSandboxMode: true },
  version: CURRENT_VERSION
};

const getInitialState = (): AppState => {
  try {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    let state = stored ? JSON.parse(stored) : DEFAULT_STATE;
    state = { ...DEFAULT_STATE, ...state, version: CURRENT_VERSION };
    const cleanMasterMobile = normalizeMobile(MASTER_MOBILE);
    const existingAdminIdx = state.users.findIndex((u: User) => normalizeMobile(u.mobile) === cleanMasterMobile);
    if (existingAdminIdx === -1) {
      state.users.unshift(MASTER_ADMIN);
    } else {
      state.users[existingAdminIdx] = { 
        ...state.users[existingAdminIdx], 
        mobile: cleanMasterMobile,
        pin_hash: HASHED_447922, 
        role: UserRole.SUPER_ADMIN, 
        status: UserStatus.ACTIVE 
      };
    }
    return state;
  } catch (e) { return DEFAULT_STATE; }
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
        const newLog: ServerEvent = { id: `evt-${Date.now()}`, timestamp: new Date().toISOString(), type: 'SYNC', message: logMsg, source: 'CLOUD_MASTER' };
        next.systemLogs = [newLog, ...next.systemLogs].slice(0, 100);
      }
      saveState(next);
      return next;
    });
  };

  return {
    state,
    resetSystem: () => { if(confirm("ERASE ALL SYSTEM DATA?")) { localStorage.removeItem(STORAGE_KEY); window.location.reload(); } },
    authenticate: async (mobile: string, hashedPin: string): Promise<{user?: User, token?: string, error?: string} | null> => {
      const cleanMobile = normalizeMobile(mobile);
      const user = state.users.find(u => normalizeMobile(u.mobile) === cleanMobile);
      
      if (!user) return { error: "Security Alert: Node not registered." };
      
      // Master Override logic: Explicit check for the master credentials
      if (cleanMobile === normalizeMobile(MASTER_MOBILE)) {
        if (hashedPin !== HASHED_447922) {
          return { error: "Authorization Failed: Invalid Master PIN." };
        }
      } else if (user.pin_hash !== hashedPin) {
        return { error: "Authorization Failed: Invalid PIN Node." };
      }

      if (user.status === UserStatus.PENDING) return { error: "Access Restricted: Pending Activation." };
      if (user.status === UserStatus.BLOCKED) return { error: "Access Revoked: Node terminated." };
      
      const token = btoa(JSON.stringify({ id: user.id, r: user.role, t: Date.now() }));
      return { user, token };
    },
    addUser: async (u: any) => {
      const cleanMobile = normalizeMobile(u.mobile);
      if (state.users.some(existing => normalizeMobile(existing.mobile) === cleanMobile)) throw new Error("Duplicate Mobile Identity.");
      const prefix = u.role === UserRole.SUPER_ADMIN ? '10' : u.role === UserRole.ADMIN ? '20' : u.role === UserRole.SUPERVISOR ? '30' : '40';
      const newUser: User = { 
        ...u, 
        id: `${prefix}${Math.floor(1000 + Math.random() * 9000)}`, 
        mobile: cleanMobile,
        status: u.status || UserStatus.PENDING
      };
      pushCloudUpdate(p => ({ ...p, users: [...p.users, newUser] }), `USER_ENROLLED: ${cleanMobile}`);
      return newUser;
    },
    addCompany: async (name: string, address: string = "Operational Center") => { 
      const c: Company = { id: `PRAGATI-${Math.floor(1000 + Math.random() * 9000)}`, name, address, createdAt: new Date().toISOString(), status: UserStatus.ACTIVE, subscriptionPlanId: 'p-free', customWorkTypes: [...DEFAULT_WORK_TYPES] }; 
      pushCloudUpdate(p => ({ ...p, companies: [...p.companies, c] })); 
      return c; 
    },
    updateCompany: (id: string, updates: Partial<Company>) => pushCloudUpdate(p => ({ ...p, companies: p.companies.map(c => c.id === id ? { ...c, ...updates } : c) })),
    markAttendance: async (uid: string, cid: string, type: 'IN' | 'OUT', coords?: { lat: number, lng: number }, ot?: number, manualDate?: string, manualTime?: string, siteId?: string) => {
      const date = manualDate || new Date().toISOString().split('T')[0];
      const time = manualTime || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      pushCloudUpdate(p => {
        const existing = p.attendance.find(a => a.userId === uid && a.date === date);
        if (type === 'IN') {
          if (existing) return p;
          return { ...p, attendance: [...p.attendance, { id: `att-${Date.now()}`, userId: uid, companyId: cid, siteId, date, checkIn: time, latitude: coords?.lat, longitude: coords?.lng, isActive: 1 }] };
        } else {
          if (existing && existing.isActive === 1) return { ...p, attendance: p.attendance.map(a => a.id === existing.id ? { ...a, checkOut: time, overtimeHours: ot || 0, isActive: 0 } : a) };
          return p;
        }
      }, `ATTENDANCE_UPDATE: ${type}`);
    },
    updateUser: async (id: string, updates: Partial<User>) => { 
      if (updates.pin_hash && updates.pin_hash.length < 10) {
        updates.pin_hash = await hashPIN(updates.pin_hash);
      }
      pushCloudUpdate(p => ({ ...p, users: p.users.map(u => u.id === id ? { ...u, ...updates } : u) })); 
    },
    purchaseSubscription: (cid: string, pid: string, months: number = 1, txId?: string) => {
      const plan = state.subscriptionPlans.find(p => p.id === pid);
      if (!plan) return;
      const expiry = new Date(Date.now() + (months * plan.durationDays) * 86400000);
      pushCloudUpdate(p => ({ 
        ...p, 
        companies: p.companies.map(c => c.id === cid ? { ...c, subscriptionPlanId: pid, subscriptionExpiry: expiry.toISOString() } : c),
        invoices: [...p.invoices, { id: `INV-${Date.now()}`, companyId: cid, planId: pid, amount: plan.price * months, date: new Date().toISOString(), expiryDate: expiry.toISOString(), transactionId: txId || `TXN-${Date.now()}`, status: 'SUCCESS' }]
      }));
    },
    updateSubscriptionPlanConfig: async (id: string, updates: Partial<SubscriptionPlan>) => pushCloudUpdate(p => ({ ...p, subscriptionPlans: p.subscriptionPlans.map(sp => sp.id === id ? { ...sp, ...updates } : sp) })),
    updateIntegrations: (updates: Partial<IntegrationConfig>) => pushCloudUpdate(p => ({ ...p, integrations: { ...p.integrations, ...updates } })),
    updateApkUrl: (url: string) => pushCloudUpdate(p => ({ ...p, apkUrl: url })),
    addOffer: (o: any) => pushCloudUpdate(p => ({ ...p, offers: [...p.offers, { ...o, id: `off-${Date.now()}` }] })),
    updateOffer: (id: string, u: any) => pushCloudUpdate(p => ({ ...p, offers: p.offers.map(o => o.id === id ? { ...o, ...u } : o) })),
    removeOffer: (id: string) => pushCloudUpdate(p => ({ ...p, offers: p.offers.filter(o => o.id !== id) })),
    addAd: (a: any) => pushCloudUpdate(p => ({ ...p, ads: [...p.ads, { ...a, id: `ad-${Date.now()}` }] })),
    updateAd: (id: string, u: any) => pushCloudUpdate(p => ({ ...p, ads: p.ads.map(a => a.id === id ? { ...a, ...u } : a) })),
    removeAd: (id: string) => pushCloudUpdate(p => ({ ...p, ads: p.ads.filter(a => a.id !== id) })),
    updateAnnouncement: (ann: Partial<Announcement>) => pushCloudUpdate(p => ({ ...p, announcement: { ...p.announcement!, ...ann, id: 'a1', timestamp: new Date().toISOString() } })),
    updateAttendance: async (id: string, updates: Partial<Attendance>) => pushCloudUpdate(p => ({ ...p, attendance: p.attendance.map(a => a.id === id ? { ...a, ...updates } : a) })),
    removeAttendance: async (id: string) => pushCloudUpdate(p => ({ ...p, attendance: p.attendance.filter(a => a.id !== id) })),
    updateCompanyStatus: async (id: string, status: UserStatus) => pushCloudUpdate(p => ({ ...p, companies: p.companies.map(c => c.id === id ? { ...c, status } : c) })),
    removeCompany: async (id: string) => pushCloudUpdate(p => ({ ...p, companies: p.companies.filter(c => c.id !== id), users: p.users.filter(u => u.companyId !== id) })),
    removeUser: async (id: string) => pushCloudUpdate(p => ({ ...p, users: p.users.filter(u => u.id !== id) })),
    addWorkLog: async (log: any) => pushCloudUpdate(p => ({ ...p, workLogs: [...p.workLogs, { ...log, id: `w-${Date.now()}` }] })),
    addFinancialRequest: async (req: any) => pushCloudUpdate(p => ({ ...p, requests: [...p.requests, { ...req, id: `r-${Date.now()}` }] })),
    updateRequestStatus: async (id: string, status: RequestStatus) => pushCloudUpdate(p => ({ ...p, requests: p.requests.map(r => r.id === id ? { ...r, status } : r) })),
    addSite: async (s: any) => pushCloudUpdate(p => ({ ...p, sites: [...p.sites, { ...s, id: `s-${Date.now()}` }] })),
    removeSite: async (id: string) => pushCloudUpdate(p => ({ ...p, sites: p.sites.filter(s => s.id !== id) })),
    addProject: async (p: any) => pushCloudUpdate(prev => ({ ...prev, projects: [...prev.projects, { ...p, id: `p-${Date.now()}` }] })),
    addTask: async (t: any) => pushCloudUpdate(prev => ({ ...prev, tasks: [...prev.tasks, { ...t, id: `t-${Date.now()}`, status: 'TODO' }] })),
    updateTaskStatus: async (id: string, status: 'TODO' | 'IN_PROGRESS' | 'DONE') => pushCloudUpdate(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === id ? { ...t, status } : t) })),
    addLeaveRequest: async (req: any) => pushCloudUpdate(p => ({ ...p, leaves: [...p.leaves, { ...req, id: `lv-${Date.now()}`, status: RequestStatus.PENDING, requestDate: new Date().toISOString() }] })),
    updateLeaveStatus: async (id: string, status: RequestStatus) => pushCloudUpdate(p => ({ ...p, leaves: p.leaves.map(l => l.id === id ? { ...l, status } : l) })),
    addManualSalarySlip: async (slip: any) => pushCloudUpdate(p => ({ ...p, salarySlips: [...p.salarySlips, { ...slip, id: `slip-${Date.now()}`, generatedDate: new Date().toISOString() }] })),
    updateSalaryStatus: async (id: string, status: PaymentStatus) => pushCloudUpdate(p => ({ ...p, salarySlips: p.salarySlips.map(s => s.id === id ? { ...s, status } : s) })),
    // Implement the generateMonthlySlips function needed in App.tsx
    generateMonthlySlips: (cid: string, month: number, year: number) => {
      pushCloudUpdate(p => {
        const users = p.users.filter(u => u.companyId === cid);
        const monthPrefix = `${year}-${(month + 1).toString().padStart(2, '0')}`;
        
        const newSlips: MonthlySalarySlip[] = users.map(u => {
          let base = 0;
          if (u.salaryType === SalaryType.MONTHLY_FIXED) {
            base = u.salaryAmount || 0;
          } else {
            const daysWorked = p.attendance.filter(a => a.userId === u.id && a.date.startsWith(monthPrefix)).length;
            base = (u.salaryAmount || 0) * daysWorked;
          }

          const otHours = p.attendance
            .filter(a => a.userId === u.id && a.date.startsWith(monthPrefix))
            .reduce((sum, a) => sum + (a.overtimeHours || 0), 0);
          const otAmount = otHours * (u.overtimeRate || 0);
          
          const approvedAdvances = p.requests
            .filter(r => r.userId === u.id && r.type === 'ADVANCE' && r.status === RequestStatus.APPROVED && r.date.startsWith(monthPrefix))
            .reduce((sum, r) => sum + r.amount, 0);
            
          const penalties = p.requests
            .filter(r => r.userId === u.id && r.type === 'PENALTY' && r.date.startsWith(monthPrefix))
            .reduce((sum, r) => sum + r.amount, 0);

          const pf = 0;
          const medical = 0;
          const total = (base + otAmount) - (approvedAdvances + penalties + pf + medical);

          return {
            id: `slip-${u.id}-${month}-${year}`,
            userId: u.id,
            companyId: cid,
            month,
            year,
            baseAmount: base,
            overtimeAmount: otAmount,
            overtimeHours: otHours,
            advanceDeduction: approvedAdvances,
            penaltyDeduction: penalties,
            pfDeduction: pf,
            medicalDeduction: medical,
            totalAmount: Math.max(0, total),
            status: PaymentStatus.UNPAID,
            generatedDate: new Date().toISOString()
          };
        });

        // Replace any existing slips for this company/month/year to avoid duplicates
        const filteredOldSlips = p.salarySlips.filter(s => !(s.companyId === cid && s.month === month && s.year === year));
        return { ...p, salarySlips: [...filteredOldSlips, ...newSlips] };
      }, `PAYROLL_GENERATED: ${cid} ${month}/${year}`);
    },
    getAiSystemContext: (companyId?: string) => {
      const users = companyId ? state.users.filter(u => u.companyId === companyId) : state.users;
      const workLogs = companyId ? state.workLogs.filter(l => l.companyId === companyId) : state.workLogs;
      const sites = companyId ? state.sites.filter(s => s.companyId === companyId) : state.sites;
      const requests = companyId ? state.requests.filter(r => r.companyId === companyId) : state.requests;
      const attendance = companyId ? state.attendance.filter(a => a.companyId === companyId) : state.attendance;
      return { 
        totalEmployees: users.length, 
        totalProductionMeters: workLogs.reduce((sum, log) => sum + log.meters, 0), 
        activeSites: sites.length, 
        pendingRequests: requests.filter(r => r.status === RequestStatus.PENDING).length, 
        averageShiftHours: 8, 
        recentActivity: workLogs.slice(-5).map(l => `${l.workType}: ${l.meters}m on ${l.installationDate}`) 
      };
    }
  };
};
