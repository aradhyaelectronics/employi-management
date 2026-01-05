
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  EMPLOYEE = 'EMPLOYEE'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  BLOCKED = 'BLOCKED'
}

export enum SalaryType {
  MONTHLY_FIXED = 'MONTHLY_FIXED',
  DAILY_WAGE = 'DAILY_WAGE'
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID'
}

export enum LeaveType {
  CASUAL = 'CASUAL',
  SICK = 'SICK',
  PAID = 'PAID',
  UNPAID = 'UNPAID'
}

export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface ServerEvent {
  id: string;
  timestamp: string;
  type: 'INFO' | 'WARNING' | 'CRITICAL' | 'AUTH' | 'SYNC';
  message: string;
  source: string;
}

export interface Project {
  id: string;
  companyId: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';
}

export interface Task {
  id: string;
  projectId: string;
  assignedTo: string; 
  name: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
}

export interface LeaveRequest {
  id: string;
  userId: string;
  companyId: string;
  type: LeaveType;
  fromDate: string;
  toDate: string;
  reason: string;
  status: RequestStatus;
  requestDate: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string; 
  role: UserRole;
  status: UserStatus; 
  companyId: string;
  company_name?: string; 
  address?: string; 
  password?: string;
  pin_hash: string; 
  supervisorId?: string;
  salaryType?: SalaryType;
  salaryAmount?: number;
  overtimeRate?: number;
}

export interface Company {
  id: string;
  name: string;
  address?: string;
  createdAt: string;
  status: UserStatus; 
  subscriptionPlanId?: string;
  subscriptionExpiry?: string;
  customWorkTypes: string[]; // NEW: Per-enterprise work classifications
}

export interface Site {
  id: string;
  companyId: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
}

export interface Attendance {
  id: string;
  userId: string;
  companyId: string;
  siteId?: string; 
  date: string;
  checkIn: string;
  checkOut?: string;
  latitude?: number;
  longitude?: number;
  isActive: number;
  overtimeHours?: number;
}

export interface WorkLog {
  id: string;
  userId: string;
  companyId: string;
  siteId?: string; 
  date: string;
  installationDate: string;
  taskId?: string; 
  workType: string; 
  subCategory: string; 
  meters: number;
  description: string;
}

export interface FinancialRequest {
  id: string;
  userId: string;
  companyId: string;
  amount: number;
  type: 'ADVANCE' | 'SALARY' | 'PENALTY';
  status: RequestStatus;
  date: string;
  description: string;
}

export interface MonthlySalarySlip {
  id: string;
  userId: string;
  companyId: string;
  month: number;
  year: number;
  baseAmount: number;
  overtimeAmount: number;
  overtimeHours: number;
  advanceDeduction: number;
  penaltyDeduction: number; 
  pfDeduction: number;
  medicalDeduction: number;
  totalAmount: number; 
  status: PaymentStatus;
  generatedDate: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  userLimit: number;
  features: string[];
  offersEnabled: boolean; // NEW: Field to toggle offers for a specific plan
  updatedAt?: string; // Track when the plan was last modified
}

export interface IntegrationConfig {
  razorpayKeyId: string;
  razorpayKeySecret: string;
  razorpayEnabled: boolean;
  isSandboxMode: boolean;
}

export interface Invoice {
  id: string;
  companyId: string;
  planId: string;
  amount: number;
  date: string;
  expiryDate: string;
  transactionId: string;
  status: 'SUCCESS' | 'REFUNDED';
}

export interface Offer {
  id: string;
  name: string;
  code: string;
  discountPercent: number;
  active: boolean;
}

export interface Advertisement {
  id: string;
  imageUrl: string;
  link: string;
  active: boolean;
  position: 'DASHBOARD_BANNER' | 'POPUP';
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  active: boolean;
  timestamp: string;
}

export interface AppState {
  users: User[];
  companies: Company[];
  sites: Site[];
  projects: Project[];
  tasks: Task[];
  leaves: LeaveRequest[];
  attendance: Attendance[];
  workLogs: WorkLog[];
  requests: FinancialRequest[];
  subscriptionPlans: SubscriptionPlan[];
  offers: Offer[];
  ads: Advertisement[];
  announcement?: Announcement;
  salarySlips: MonthlySalarySlip[];
  systemLogs: ServerEvent[];
  integrations: IntegrationConfig;
  invoices: Invoice[];
  otps: any[];
  apkUrl: string;
  version: string;
}
