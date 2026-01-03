
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
  mobile?: string;
  role: UserRole;
  status: UserStatus;
  companyId: string;
  password?: string;
  pin?: string;
  supervisorId?: string;
  salaryType?: SalaryType;
  salaryAmount?: number;
  overtimeRate?: number;
}

export interface Company {
  id: string;
  name: string;
  createdAt: string;
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
  id: string;
  userId: string;
  companyId: string;
  siteId?: string; // Linked to work site
  date: string;
  checkIn: string;
  checkOut?: string;
  overtimeHours?: number;
  lat?: number;
  lng?: number;
}

export interface WorkLog {
  id: string;
  userId: string;
  companyId: string;
  siteId?: string; // Linked to physical site
  date: string;
  installationDate: string;
  taskId?: string; // Linked to formal tasks
  workType: string; // Dynamic work classification
  subCategory: string; // Size or specific specification
  meters: number;
  description: string;
}

export interface FinancialRequest {
  id: string;
  userId: string;
  companyId: string;
  amount: number;
  type: 'ADVANCE' | 'SALARY';
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
  version: string;
}
