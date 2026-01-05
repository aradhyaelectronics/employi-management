
import React from 'react';
import { 
  AppState, User, Company, UserRole, UserStatus, RequestStatus, 
  WorkLog, FinancialRequest, MonthlySalarySlip, ServerEvent,
  PaymentStatus, Project, Task, LeaveRequest, SalaryType, SubscriptionPlan, Attendance, IntegrationConfig, Invoice, OtpRecord 
} from './types';

const STORAGE_KEY = 'pragati_cloud_final_v5';
const CURRENT_VERSION = '6.3.0-sub-enforcement';
const STANDARD_SHIFT_HOURS = 8;
const JWT_SECRET = 'pragati_enterprise_node_secret_2025';

const normalizeMobile = (num: string): string => {
  return (num || '').replace(/\D/g, '');
};

export async function hashPIN(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

async function createJWT(payload: any, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const header = { alg: "HS256", typ: "JWT" };
  const base64 = (obj: any) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  const unsigned = `${base64(header)}.${base64(payload)}`;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(unsigned)
  );
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${unsigned}.${sig}`;
}

const HASHED_123456 = "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92"; 

const MASTER_ADMIN: User = {
  id: '100',
  name: 'Pragati Admin',
  email: 'admin@pragati.com',
  mobile: '7709384869',
  role: UserRole.SUPER_ADMIN,
  status: UserStatus.ACTIVE,
  companyId: 'SYSTEM',
  pin_hash: HASHED_123456
};

const DEFAULT_STATE: AppState = {
  users: [MASTER_ADMIN], companies: [], sites: [], projects: [], tasks: [], leaves: [], attendance: [], workLogs: [], requests: [], otps: [],
  subscriptionPlans: [
    { id: 'p-free', name: 'Standard (Free)', price: 0, durationDays: 365, userLimit: 5, features: ['Basic Attendance', 'Work Logs', 'Manual Payroll'] },
    { id: 'p-pro', name: 'Enterprise Pro', price: 4999, durationDays: 30, userLimit: 50, features: ['Advanced Payroll', 'Geofencing', 'Task Management', 'Leave Portal', 'AI Audits'] },
    { id: 'p-ultra', name: 'Elite Infrastructure', price: 12999, durationDays: 30, userLimit: 500, features: ['24/7 Priority Support', 'Dedicated Cloud Node', 'Custom API Access'] }
  ],
  salarySlips: [], invoices: [], apkUrl: 'https://storage.googleapis.com/pragati-cloud/builds/pragati-v5.apk',
  systemLogs: [{ id: 'evt-0', timestamp: new Date().toISOString(), type: 'INFO', message: 'D1 Matrix Initialized', source: 'CORE' }],
  integrations: { razorpayKeyId: 'rzp_test_58Xm92p1Yk87X', razorpayKeySecret: '', razorpayEnabled: true, isSandboxMode: true },
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
  } catch (e) { return DEFAULT_STATE; }
};

export const saveState = (state: AppState) => { if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); };

export const useStore = () => {
  const [state, setState] = React.useState<AppState>(getInitialState());

  const pushCloudUpdate = (updater: (prev: AppState) => AppState, logMsg?: string) => {
    setState(prev => {
      const next = updater(prev);
      if (logMsg) {
        const newLog: ServerEvent = { id: `evt-${Date.now()}`, timestamp: new Date().toISOString(), type: 'SYNC', message: logMsg, source: 'SQL_MASTER' };
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
    resetSystem: () => { if(confirm("ERASE ALL SYSTEM DATA?")) { localStorage.removeItem(STORAGE_KEY); window.location.reload(); } },
    
    authenticate: async (mobile: string, hashedPin: string): Promise<{user?: User, token?: string, error?: string} | null> => {
      const cleanMobile = normalizeMobile(mobile);
      
      const user = state.users.find(u => 
        normalizeMobile(u.mobile) === cleanMobile && 
        u.pin_hash === hashedPin
      );

      if (!user) {
        return { error: "ID or PIN Mismatch. (चेक करें कि PIN सही है)" };
      }

      const status = user.status?.toString().toUpperCase() || 'ACTIVE';
      if (status === 'PENDING') {
        return { error: "Account Pending Approval. (Admin से अप्रूवल मांगें)" };
      }
      if (status === 'BLOCKED') {
        return { error: "Account Blocked. (Security ब्लॉक किया गया है)" };
      }

      const token = await createJWT({ 
        user_id: user.id, 
        role: user.role, 
        iat: Math.floor(Date.now() / 1000) 
      }, JWT_SECRET);

      return { user, token };
    },

    addUser: async (u: any) => {
      const cleanMobile = normalizeMobile(u.mobile);
      if (state.users.some(existing => normalizeMobile(existing.mobile) === cleanMobile)) {
        throw new Error("Mobile number already registered.");
      }

      // Subscription Enforcement Logic
      if (u.companyId !== 'SYSTEM') {
        const company = state.companies.find(c => c.id === u.companyId);
        const plan = state.subscriptionPlans.find(p => p.id === (company?.subscriptionPlanId || 'p-free'));
        const currentUsers = state.users.filter(usr => usr.companyId === u.companyId).length;
        
        if (plan && currentUsers >= plan.userLimit) {
          throw new Error(`LICENSE LIMIT REACHED: Your plan (${plan.name}) allows only ${plan.userLimit} users. Please upgrade to add more personnel.`);
        }
      }

      const prefix = u.role === UserRole.SUPER_ADMIN ? '10' : u.role === UserRole.ADMIN ? '20' : u.role === UserRole.SUPERVISOR ? '30' : '40';
      const newId = u.id || `${prefix}${Math.floor(1000 + Math.random() * 9000)}`;
      
      let hashedPin = HASHED_123456;
      if (u.pin) {
        hashedPin = await hashPIN(u.pin);
      } else if (u.pin_hash) {
        hashedPin = u.pin_hash;
      }
      
      const newUser: User = { 
        ...u, 
        id: newId.toString(), 
        pin_hash: hashedPin, 
        status: u.status || UserStatus.PENDING,
        mobile: cleanMobile,
        company_name: u.company_name || u.companyName,
        address: u.address || 'Operational Site'
      };

      pushCloudUpdate(p => ({ ...p, users: [...p.users, newUser] }), `SQL_EXEC: INSERT INTO users (mobile) VALUES ('${cleanMobile}')`);
      return newUser;
    },

    markAttendance: async (uid: string, cid: string, type: 'IN' | 'OUT', coords?: { lat: number, lng: number }, ot?: number, manualDate?: string, manualTime?: string, siteId?: string) => {
      const date = manualDate || new Date().toISOString().split('T')[0];
      const time = manualTime || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      
      pushCloudUpdate(p => {
        const existing = p.attendance.find(a => a.userId === uid && a.date === date);
        if (type === 'IN') {
          if (existing) return p;
          return { 
            ...p, 
            attendance: [...p.attendance, { 
              id: `att-${Date.now()}`, userId: uid, companyId: cid, siteId, date, checkIn: time, 
              latitude: coords?.lat, longitude: coords?.lng, isActive: 1 
            }] 
          };
        } else {
          if (existing && existing.isActive === 1) {
            let finalOt = ot || 0;
            if (finalOt === 0) {
              const h = calculateHours(existing.checkIn, time);
              finalOt = Math.max(0, h - STANDARD_SHIFT_HOURS);
            }
            return { 
              ...p, 
              attendance: p.attendance.map(a => a.id === existing.id ? { ...a, checkOut: time, overtimeHours: finalOt, isActive: 0 } : a) 
            };
          }
          return p;
        }
      }, `SQL_EXEC: UPDATE attendance SET isActive = ${type === 'IN' ? 1 : 0}`);
    },

    addCompany: async (name: string, address: string = "Not Specified") => { 
      const c: Company = { id: `CORP-${Math.floor(1000 + Math.random() * 9000)}`, name, address, createdAt: new Date().toISOString(), status: UserStatus.ACTIVE, subscriptionPlanId: 'p-free' }; 
      pushCloudUpdate(p => ({ ...p, companies: [...p.companies, c] })); 
      return c; 
    },

    updateUser: async (id: string, updates: Partial<User>) => { 
      if (updates.pin_hash && updates.pin_hash.length < 64) {
        updates.pin_hash = await hashPIN(updates.pin_hash);
      } 
      pushCloudUpdate(p => ({ ...p, users: p.users.map(u => u.id === id ? { ...u, ...updates } : u) })); 
    },

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
          const adv = p.requests.filter(r => r.userId === u.id && r.type === 'ADVANCE' && r.status === RequestStatus.APPROVED && new Date(r.date).getMonth() === month).reduce((s, r) => s + r.amount, 0);
          const penalties = p.requests.filter(r => r.userId === u.id && r.type === 'PENALTY' && new Date(r.date).getMonth() === month).reduce((s, r) => s + r.amount, 0);
          return {
            id: `slip-${u.id}-${month}-${year}`, userId: u.id, companyId: cid, month, year,
            baseAmount: Math.round(pay), overtimeAmount: Math.round(otPay), overtimeHours: totalOtHours,
            advanceDeduction: adv, penaltyDeduction: penalties, pfDeduction: 0, medicalDeduction: 0,
            totalAmount: Math.round((pay + otPay) - adv - penalties),
            status: PaymentStatus.UNPAID, generatedDate: new Date().toISOString()
          };
        });
        return { ...p, salarySlips: [...p.salarySlips.filter(s => !(s.companyId === cid && s.month === month)), ...newSlips] };
      }, `SQL_EXEC: COMMIT PAYROLL FOR ${cid}`);
    },

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
    updateIntegrations: (updates: Partial<IntegrationConfig>) => pushCloudUpdate(p => ({ ...p, integrations: { ...p.integrations, ...updates } })),
    updateApkUrl: (url: string) => pushCloudUpdate(p => ({ ...p, apkUrl: url })),
    updateSubscriptionPlanConfig: async (id: string, updates: Partial<SubscriptionPlan>) => pushCloudUpdate(p => ({ ...p, subscriptionPlans: p.subscriptionPlans.map(sp => sp.id === id ? { ...sp, ...updates } : sp) })),
    addLeaveRequest: async (req: Omit<LeaveRequest, 'id' | 'status' | 'requestDate'>) => { pushCloudUpdate(p => ({ ...p, leaves: [...p.leaves, { ...req, id: `lv-${Date.now()}`, status: RequestStatus.PENDING, requestDate: new Date().toISOString() }] })); },
    updateLeaveStatus: async (id: string, status: RequestStatus) => { pushCloudUpdate(p => ({ ...p, leaves: p.leaves.map(l => l.id === id ? { ...l, status } : l) })); },
    addManualSalarySlip: async (slip: Omit<MonthlySalarySlip, 'id' | 'generatedDate'>) => pushCloudUpdate(p => ({ ...p, salarySlips: [...p.salarySlips, { ...slip, id: `slip-${Date.now()}`, generatedDate: new Date().toISOString() }] })),
    updateSalaryStatus: async (id: string, status: PaymentStatus) => pushCloudUpdate(p => ({ ...p, salarySlips: p.salarySlips.map(s => s.id === id ? { ...s, status } : s) })),
    purchaseSubscription: (cid: string, pid: string, months: number = 1, txId?: string) => {
        const plan = state.subscriptionPlans.find(p => p.id === pid);
        if (!plan) return;
        const expiry = new Date(Date.now() + (months * 30) * 86400000);
        pushCloudUpdate(p => ({ 
          ...p, 
          companies: p.companies.map(c => c.id === cid ? { ...c, subscriptionPlanId: pid, subscriptionExpiry: expiry.toISOString() } : c),
          invoices: [...p.invoices, { id: `INV-${Date.now()}`, companyId: cid, planId: pid, amount: plan.price * months, date: new Date().toISOString(), expiryDate: expiry.toISOString(), transactionId: txId || `TXN-${Date.now()}`, status: 'SUCCESS' }]
        }));
    },
    getAiSystemContext: (companyId?: string) => {
      const users = companyId ? state.users.filter(u => u.companyId === companyId) : state.users;
      const workLogs = companyId ? state.workLogs.filter(l => l.companyId === companyId) : state.workLogs;
      const sites = companyId ? state.sites.filter(s => s.companyId === companyId) : state.sites;
      const requests = companyId ? state.requests.filter(r => r.companyId === companyId) : state.requests;
      const attendance = companyId ? state.attendance.filter(a => a.companyId === companyId) : state.attendance;
      let totalHours = 0, completedShifts = 0;
      attendance.forEach(a => { if (a.checkIn && a.checkOut) { totalHours += calculateHours(a.checkIn, a.checkOut); completedShifts++; } });
      return { totalEmployees: users.length, totalProductionMeters: workLogs.reduce((sum, log) => sum + log.meters, 0), activeSites: sites.length, pendingRequests: requests.filter(r => r.status === RequestStatus.PENDING).length, averageShiftHours: completedShifts > 0 ? totalHours / completedShifts : 0, recentActivity: workLogs.slice(-5).map(l => `${l.workType}: ${l.meters}m on ${l.installationDate}`) };
    }
  };
};
