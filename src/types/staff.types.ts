export interface Staff {
  _id: string;
  name: string;
  phone: string;
  role: string;
  salaryType: 'monthly' | 'daily';
  monthlySalary: number;
  dailyWage: number;
  joiningDate: string;
  status: 'active' | 'inactive';
  bankDetails?: {
    accountNumber?: string;
    ifsc?: string;
    upiId?: string;
  };
  createdAt?: string;
}

export interface Attendance {
  _id?: string;
  staffId: string;
  date: string;
  status: 'present' | 'absent' | 'half_day' | 'paid_leave';
  markedBy?: string;
  note?: string;
}

export interface Advance {
  _id: string;
  staffId: string;
  amount: number;
  date: string;
  note?: string;
  deductedInPayrollRun?: string | null;
}

export interface PayrollEntry {
  staffId: string;
  staffName: string;
  role: string;
  salaryType: 'monthly' | 'daily';
  baseSalary: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  paidLeaveDays: number;
  totalWorkingDays: number;
  payableDays: number;
  grossSalary: number;
  advanceDeducted: number;
  netSalary: number;
  paymentMode: 'cash' | 'bank_transfer' | 'upi';
  paymentStatus: 'pending' | 'paid';
  slipSentAt?: string | null;
}

export interface PayrollRun {
  _id: string;
  month: number;
  year: number;
  runDate: string;
  status: 'draft' | 'finalized';
  entries: PayrollEntry[];
  totalPayout: number;
}

export interface PayrollPreview {
  month: number;
  year: number;
  monthLabel: string;
  totalDaysInMonth: number;
  entries: {
    staffId: string;
    staffName: string;
    role: string;
    salaryType: 'monthly' | 'daily';
    baseSalary: number;
    presentDays: number;
    absentDays: number;
    halfDays: number;
    paidLeaveDays: number;
    daysNotMarked: number;
    payableDays: number;
    grossSalary: number;
    advanceDeducted: number;
    netSalary: number;
    hasUnmarkedDays: boolean;
    warning?: string;
  }[];
  totalPayout: number;
  staffCount: number;
  attendanceWarnings?: string;
}
