
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

export enum WorkType {
  CABLE_LAYING = 'Cable Laying',
  SPLICING = 'Splicing/Jointing',
  CIVIL_WORK = 'Civil/Trenching',
  INSTALLATION = 'Equipment Install',
  TESTING = 'Testing/Comms',
  MAINTENANCE = 'Maintenance',
  OTHER = 'Other'
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
  assignedTo: string; // userId
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
  mobile: string; // TEXT UNIQUE NOT NULL
  role: UserRole;
  status: UserStatus; // DEFAULT 'active'
  companyId: string;
  company_name?: string; // Aligned with D1 Final
  address?: string; // Aligned with D1 Final
  password?: string;
  pin_hash: string; // TEXT NOT NULL (SHA-256)
  supervisorId?: string;
  salaryType?: SalaryType;
  salaryAmount?: number;
  overtimeRate?: number;
  pfEnabled?: boolean;
  pfAmount?: number;
  medicalEnabled?: boolean;
  medicalAmount?: number;
}

export interface Company {
  id: string;
  name: string;
  address?: string;
  createdAt: string;
  status: UserStatus; 
  subscriptionPlanId?: string;
  subscriptionExpiry?: string;
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
  id: string; // INTEGER PRIMARY KEY AUTOINCREMENT
  userId: string; // user_id INTEGER
  companyId: string;
  siteId?: string; 
  date: string; // date TEXT
  checkIn: string; // check_in TEXT
  checkOut?: string; // check_out TEXT
  latitude?: number; // latitude REAL
  longitude?: number; // longitude REAL
  isActive: number; // is_active INTEGER DEFAULT 1 (1 = checked in, 0 = checked out)
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

export interface OtpRecord {
  id: string; 
  mobile: string; 
  otp: string; 
  expires_at: number; 
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
  salarySlips: MonthlySalarySlip[];
  systemLogs: ServerEvent[];
  integrations: IntegrationConfig;
  invoices: Invoice[];
  otps: OtpRecord[];
  apkUrl: string;
  version: string;
}
