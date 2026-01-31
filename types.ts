export enum EmployeeRole {
  DESIGNER = 'Designer',
  MACHINE_OPERATOR = 'Machine Operator',
  DELIVERY = 'Delivery',
  HELPER = 'Helper',
  INSTALLER = 'Installer',
}

export enum AttendanceStatus {
  PRESENT = 'Present',
  ABSENT = 'Absent',
  HALF_DAY = 'Half Day',
}

export enum WorkType {
  PRINTING = 'Printing',
  DESIGN = 'Design',
  FINISHING = 'Finishing',
  LAMINATION = 'Lamination',
  INSTALL = 'Install',
  OTHER = 'Other'
}

export interface Transaction {
  id: string;
  employeeId: string;
  amount: number;
  type: 'ADVANCE' | 'FOOD_COST' | 'PENALTY' | 'BONUS' | 'PAYMENT';
  date: string; // ISO Date string
  note?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // ISO Date string YYYY-MM-DD
  status: AttendanceStatus;
  workType: string;
  workHours: number;
  overtimeHours: number;
  checkInTime?: string;
}

export interface Employee {
  id: string;
  name: string;
  phone: string;
  role: EmployeeRole;
  salaryType: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  baseSalary: number;
  joiningDate: string;
  photoUrl?: string; // Base64 or URL
  hasFingerprint: boolean;
  isActive: boolean;
}

export interface User {
  phone: string;
  role: 'ADMIN';
  shopName: string;
}