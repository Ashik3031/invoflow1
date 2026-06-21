import express from 'express';
import { 
  StaffModel, 
  AttendanceModel, 
  AdvanceModel, 
  PayrollRunModel, 
  CashBookModel,
  TenantModel
} from '../db.js';
import { AuthRequest } from '../middleware/auth.js';
import { nanoid } from 'nanoid';
import mongoose from 'mongoose';

const router = express.Router();

// Helper to normalize dates to UTC midnight
function normalizeToUtcMidnight(dateString?: string | Date): Date {
  const date = dateString ? new Date(dateString) : new Date();
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0));
}

// ---------------------------------------------------------------------------
// PAYROLL CALCULATION ENGINE
// ---------------------------------------------------------------------------
export async function calculateStaffSalary(
  staff: any,
  month: number,
  year: number,
  tenantId: string
) {
  const totalDaysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const lastDayOfMonth = new Date(Date.UTC(year, month - 1, totalDaysInMonth, 23, 59, 59, 999));

  // Fetch attendance records for this month
  const records = await AttendanceModel.find({
    staffId: staff._id,
    tenantId,
    date: { $gte: firstDayOfMonth, $lte: lastDayOfMonth }
  });

  let presentDays = 0;
  let absentDays = 0;
  let halfDays = 0;
  let paidLeaveDays = 0;

  records.forEach((r) => {
    if (r.status === 'present') presentDays++;
    else if (r.status === 'absent') absentDays++;
    else if (r.status === 'half_day') halfDays++;
    else if (r.status === 'paid_leave') paidLeaveDays++;
  });

  const daysMarked = presentDays + absentDays + halfDays + paidLeaveDays;
  const daysNotMarked = Math.max(0, totalDaysInMonth - daysMarked);

  // Days not marked default to present (assumed present with warning for review)
  const payableDays = presentDays + (halfDays * 0.5) + paidLeaveDays + daysNotMarked;

  let baseSalary = 0;
  let grossSalary = 0;

  if (staff.salaryType === 'monthly') {
    baseSalary = staff.monthlySalary;
    const perDayRate = baseSalary / totalDaysInMonth;
    grossSalary = perDayRate * payableDays;
  } else {
    baseSalary = staff.dailyWage;
    grossSalary = baseSalary * payableDays;
  }

  // Fetch unsettled advances
  const advances = await AdvanceModel.find({
    staffId: staff._id,
    tenantId,
    deductedInPayrollRun: null
  });

  const totalAdvance = advances.reduce((sum, adv) => sum + adv.amount, 0);

  let netSalary = grossSalary - totalAdvance;
  let carryForwardAdvance = 0;
  let warningMessage = '';

  if (netSalary < 0) {
    carryForwardAdvance = Math.abs(netSalary);
    netSalary = 0;
  }

  if (daysNotMarked > 0) {
    warningMessage = `${daysNotMarked} day${daysNotMarked > 1 ? 's' : ''} unmarked — assumed present. Please verify attendance.`;
  }

  return {
    staffId: staff._id,
    staffName: staff.name,
    role: staff.role,
    salaryType: staff.salaryType,
    baseSalary,
    presentDays,
    absentDays,
    halfDays,
    paidLeaveDays,
    daysNotMarked,
    totalWorkingDays: totalDaysInMonth,
    payableDays,
    grossSalary: Math.round(grossSalary),
    advanceDeducted: totalAdvance,
    netSalary: Math.round(netSalary),
    carryForwardAdvance: Math.round(carryForwardAdvance),
    hasUnmarkedDays: daysNotMarked > 0,
    warning: warningMessage || undefined
  };
}

// ---------------------------------------------------------------------------
// STAFF CRUD
// ---------------------------------------------------------------------------

// Create staff
router.post('/create', async (req: AuthRequest, res) => {
  try {
    const { name, phone, role, salaryType, monthlySalary, dailyWage, joiningDate, bankDetails } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ message: 'Name and Phone are required' });
    }

    const staff = await StaffModel.create({
      name,
      phone,
      role: role || 'General Staff',
      salaryType: salaryType || 'monthly',
      monthlySalary: monthlySalary || 0,
      dailyWage: dailyWage || 0,
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      bankDetails: bankDetails || {},
      status: 'active',
      tenantId: req.user!.tenantId
    });

    res.status(201).json(staff);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// List all staff (with optional status filter)
router.get('/list', async (req: AuthRequest, res) => {
  try {
    const { status } = req.query;
    const filter: any = { tenantId: req.user!.tenantId };
    if (status) {
      filter.status = status;
    }
    const staffList = await StaffModel.find(filter).sort({ name: 1 });
    res.json(staffList);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get single staff profile
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const staff = await StaffModel.findOne({ _id: req.params.id, tenantId: req.user!.tenantId });
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    res.json(staff);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update staff details
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { name, phone, role, salaryType, monthlySalary, dailyWage, joiningDate, bankDetails, status } = req.body;
    
    const staff = await StaffModel.findOne({ _id: req.params.id, tenantId: req.user!.tenantId });
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    if (name) staff.name = name;
    if (phone) staff.phone = phone;
    if (role) staff.role = role;
    if (salaryType) staff.salaryType = salaryType;
    if (monthlySalary !== undefined) staff.monthlySalary = monthlySalary;
    if (dailyWage !== undefined) staff.dailyWage = dailyWage;
    if (joiningDate) staff.joiningDate = new Date(joiningDate);
    if (bankDetails) staff.bankDetails = bankDetails;
    if (status) staff.status = status;

    await staff.save();
    res.json(staff);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Soft Delete (set status = 'inactive')
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const staff = await StaffModel.findOne({ _id: req.params.id, tenantId: req.user!.tenantId });
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    staff.status = 'inactive';
    await staff.save();
    res.json({ message: 'Staff marked inactive successfully', staff });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ---------------------------------------------------------------------------
// ATTENDANCE
// ---------------------------------------------------------------------------

// Mark single attendance
router.post('/attendance/mark', async (req: AuthRequest, res) => {
  try {
    const { staffId, date, status, note } = req.body;
    if (!staffId || !date || !status) {
      return res.status(400).json({ message: 'staffId, date, and status are required' });
    }

    // Prevent marking attendance for future date
    const targetDate = normalizeToUtcMidnight(date);
    const todayMidnight = normalizeToUtcMidnight();
    if (targetDate > todayMidnight) {
      return res.status(400).json({ message: 'Cannot mark attendance for a future date.' });
    }

    const attendance = await AttendanceModel.findOneAndUpdate(
      { staffId, date: targetDate, tenantId: req.user!.tenantId },
      { 
        status, 
        note: note || '', 
        markedBy: req.user!.userId 
      },
      { upsert: true, new: true }
    );

    res.json(attendance);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Bulk mark attendance (daily roll call)
router.post('/attendance/bulk-mark', async (req: AuthRequest, res) => {
  try {
    const { date, records } = req.body;
    if (!date || !records || !Array.isArray(records)) {
      return res.status(400).json({ message: 'date and records (array) are required' });
    }

    const targetDate = normalizeToUtcMidnight(date);
    const todayMidnight = normalizeToUtcMidnight();
    if (targetDate > todayMidnight) {
      return res.status(400).json({ message: 'Cannot mark attendance for a future date.' });
    }

    const tenantId = req.user!.tenantId;
    const markedBy = req.user!.userId;

    const promises = records.map((rec: { staffId: string; status: string; note?: string }) => {
      return AttendanceModel.findOneAndUpdate(
        { staffId: rec.staffId, date: targetDate, tenantId },
        { 
          status: rec.status, 
          note: rec.note || '', 
          markedBy 
        },
        { upsert: true, new: true }
      );
    });

    const results = await Promise.all(promises);
    res.json({ message: 'Bulk attendance recorded successfully', count: results.length });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get today's attendance status for all staff
router.get('/attendance/today', async (req: AuthRequest, res) => {
  try {
    const targetDate = normalizeToUtcMidnight();
    const records = await AttendanceModel.find({
      date: targetDate,
      tenantId: req.user!.tenantId
    });
    res.json(records);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get attendance calendar & logs for one staff member
router.get('/attendance/:staffId', async (req: AuthRequest, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ message: 'month and year are required' });
    }

    const m = Number(month);
    const y = Number(year);
    const totalDaysInMonth = new Date(y, m, 0).getDate();
    const firstDay = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
    const lastDay = new Date(Date.UTC(y, m - 1, totalDaysInMonth, 23, 59, 59, 999));

    const records = await AttendanceModel.find({
      staffId: req.params.staffId,
      tenantId: req.user!.tenantId,
      date: { $gte: firstDay, $lte: lastDay }
    }).sort({ date: 1 });

    res.json(records);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update specific attendance record
router.put('/attendance/:id', async (req: AuthRequest, res) => {
  try {
    const { status, note } = req.body;
    const attendance = await AttendanceModel.findOne({ _id: req.params.id, tenantId: req.user!.tenantId });
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    if (status) attendance.status = status;
    if (note !== undefined) attendance.note = note;
    attendance.markedBy = req.user!.userId;

    await attendance.save();
    res.json(attendance);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ---------------------------------------------------------------------------
// ADVANCES
// ---------------------------------------------------------------------------

// Record new advance payment
router.post('/advance/give', async (req: AuthRequest, res) => {
  try {
    const { staffId, amount, date, note } = req.body;
    if (!staffId || !amount) {
      return res.status(400).json({ message: 'staffId and amount are required' });
    }

    const tenantId = req.user!.tenantId;
    const staff = await StaffModel.findOne({ _id: staffId, tenantId });
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    // 1. Create Advance
    const advance = await AdvanceModel.create({
      staffId,
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
      note: note || '',
      deductedInPayrollRun: null,
      tenantId
    });

    // 2. Create CashBook entry (as an expense outflow)
    await CashBookModel.create({
      id: nanoid(),
      date: new Date().toISOString(),
      type: 'out',
      amount: Number(amount),
      note: `Advance to staff: ${staff.name}` + (note ? ` (${note})` : ''),
      referenceType: 'expense',
      referenceId: advance._id.toString(),
      tenantId
    });

    // 3. Current unsettled advance running balance
    const advances = await AdvanceModel.find({
      staffId,
      tenantId,
      deductedInPayrollRun: null
    });
    const balance = advances.reduce((sum, a) => sum + a.amount, 0);

    res.json({
      advance,
      runningBalance: balance
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// List advances
router.get('/advance/list', async (req: AuthRequest, res) => {
  try {
    const { staffId, settled } = req.query;
    const filter: any = { tenantId: req.user!.tenantId };
    
    if (staffId) filter.staffId = staffId;
    if (settled !== undefined) {
      if (settled === 'true') {
        filter.deductedInPayrollRun = { $ne: null };
      } else {
        filter.deductedInPayrollRun = null;
      }
    }

    const advances = await AdvanceModel.find(filter).sort({ date: -1 });
    res.json(advances);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Current unsettled balance
router.get('/advance/balance/:staffId', async (req: AuthRequest, res) => {
  try {
    const advances = await AdvanceModel.find({
      staffId: req.params.staffId,
      tenantId: req.user!.tenantId,
      deductedInPayrollRun: null
    });
    const sum = advances.reduce((total, a) => total + a.amount, 0);
    res.json({ unsettledBalance: sum });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ---------------------------------------------------------------------------
// PAYROLL RUNS
// ---------------------------------------------------------------------------

// Calculate preview (draft, unsaved)
router.post('/payroll/preview', async (req: AuthRequest, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ message: 'month and year are required' });
    }

    const m = Number(month);
    const y = Number(year);
    const tenantId = req.user!.tenantId;

    const activeStaff = await StaffModel.find({ tenantId, status: 'active' });
    
    // Check if attendance is marked at all this month across this tenant's staff
    const totalDaysInMonth = new Date(y, m, 0).getDate();
    const firstDay = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
    const lastDay = new Date(Date.UTC(y, m - 1, totalDaysInMonth, 23, 59, 59, 999));
    
    const anyAttendanceCount = await AttendanceModel.countDocuments({
      tenantId,
      date: { $gte: firstDay, $lte: lastDay }
    });

    const entries = [];
    let totalPayout = 0;

    for (const staff of activeStaff) {
      const entry = await calculateStaffSalary(staff, m, y, tenantId);
      entries.push(entry);
      totalPayout += entry.netSalary;
    }

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    res.json({
      month: m,
      year: y,
      monthLabel: `${monthNames[m - 1]} ${y}`,
      totalDaysInMonth,
      entries,
      totalPayout,
      staffCount: activeStaff.length,
      attendanceWarnings: anyAttendanceCount === 0 ? `No attendance marked for ${monthNames[m - 1]} ${y}. All days will be assumed present. Continue?` : undefined
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Real Finalize and Save Payroll Run
router.post('/payroll/run', async (req: AuthRequest, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) {
      return res.status(400).json({ message: 'month and year are required' });
    }

    const m = Number(month);
    const y = Number(year);
    const tenantId = req.user!.tenantId;

    // Check if finalized payroll run already exists for this tenant, month, and year
    const existingRun = await PayrollRunModel.findOne({
      month: m,
      year: y,
      tenantId,
      status: 'finalized'
    });

    if (existingRun) {
      return res.status(400).json({ message: `Payroll for month ${m}/${y} has already been run and finalized. Check historical records.` });
    }

    // Check if a draft run exists. If so, let's delete it so we can overwrite/regenerate completely.
    await PayrollRunModel.deleteMany({
      month: m,
      year: y,
      tenantId,
      status: 'draft'
    });

    // Regenerate and calculate server-side
    const activeStaff = await StaffModel.find({ tenantId, status: 'active' });
    const entries: any[] = [];
    let totalPayout = 0;

    for (const staff of activeStaff) {
      const result = await calculateStaffSalary(staff, m, y, tenantId);
      entries.push({
        staffId: staff._id,
        staffName: result.staffName,
        role: result.role,
        salaryType: result.salaryType,
        baseSalary: result.baseSalary,
        presentDays: result.presentDays,
        absentDays: result.absentDays,
        halfDays: result.halfDays,
        paidLeaveDays: result.paidLeaveDays,
        totalWorkingDays: result.totalWorkingDays,
        payableDays: result.payableDays,
        grossSalary: result.grossSalary,
        advanceDeducted: result.advanceDeducted,
        netSalary: result.netSalary,
        paymentMode: 'cash',
        paymentStatus: 'pending',
        slipSentAt: null
      });
      totalPayout += result.netSalary;
    }

    const payrollRun = await PayrollRunModel.create({
      month: m,
      year: y,
      runDate: new Date(),
      status: 'draft',
      entries,
      totalPayout,
      tenantId
    });

    // For each staff, associate and mark unsettled advances as deducted under this payroll run ID
    for (const staff of activeStaff) {
      await AdvanceModel.updateMany(
        { staffId: staff._id, tenantId, deductedInPayrollRun: null },
        { deductedInPayrollRun: payrollRun._id }
      );

      // Handle carry forward: if totalAdvance exceeded gross salary, generate carry-forward advance
      const result = await calculateStaffSalary(staff, m, y, tenantId);
      if (result.carryForwardAdvance > 0) {
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        await AdvanceModel.create({
          staffId: staff._id,
          amount: result.carryForwardAdvance,
          date: new Date(),
          note: `Carried forward excess advance from ${monthNames[m - 1]} ${y}`,
          deductedInPayrollRun: null,
          tenantId
        });
      }
    }

    res.json(payrollRun);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// List historical payroll runs
router.get('/payroll/history', async (req: AuthRequest, res) => {
  try {
    const history = await PayrollRunModel.find({ tenantId: req.user!.tenantId }).sort({ year: -1, month: -1 });
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get single payroll run
router.get('/payroll/:id', async (req: AuthRequest, res) => {
  try {
    const run = await PayrollRunModel.findOne({ _id: req.params.id, tenantId: req.user!.tenantId });
    if (!run) {
      return res.status(404).json({ message: 'Payroll run not found' });
    }
    res.json(run);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Mark a specific staff entry as paid
router.post('/payroll/:id/mark-paid', async (req: AuthRequest, res) => {
  try {
    const { staffId, paymentMode } = req.body;
    if (!staffId) {
      return res.status(400).json({ message: 'staffId is required' });
    }

    const run = await PayrollRunModel.findOne({ _id: req.params.id, tenantId: req.user!.tenantId });
    if (!run) {
      return res.status(404).json({ message: 'Payroll run not found' });
    }

    const entry = run.entries.find(e => e.staffId.toString() === staffId);
    if (!entry) {
      return res.status(404).json({ message: 'Staff entry not found in this payroll run' });
    }

    if (entry.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Staff entry is already marked as paid' });
    }

    // 1. Mark entry as paid
    entry.paymentStatus = 'paid';
    if (paymentMode) {
      entry.paymentMode = paymentMode;
    }

    // Check if ALL entries are paid, then finalize the payroll run
    const allPaid = run.entries.every(e => e.paymentStatus === 'paid');
    if (allPaid) {
      run.status = 'finalized';
    }

    await run.save();

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthLabel = `${monthNames[run.month - 1]} ${run.year}`;

    // 2. Create CashBook outflow
    await CashBookModel.create({
      id: nanoid(),
      date: new Date().toISOString(),
      type: 'out',
      amount: entry.netSalary,
      note: `Salary paid to ${entry.staffName} for ${monthLabel}`,
      referenceType: 'expense',
      referenceId: run._id.toString(),
      tenantId: req.user!.tenantId
    });

    res.json({ run, entry, allPaid });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Send single WhatsApp slip (Generate wa.me link)
router.post('/payroll/:id/send-slip/:staffId', async (req: AuthRequest, res) => {
  try {
    const run = await PayrollRunModel.findOne({ _id: req.params.id, tenantId: req.user!.tenantId });
    if (!run) {
      return res.status(404).json({ message: 'Payroll run not found' });
    }

    const entry = run.entries.find(e => e.staffId.toString() === req.params.staffId);
    if (!entry) {
      return res.status(404).json({ message: 'Staff entry not found in this payroll run' });
    }

    const staff = await StaffModel.findOne({ _id: req.params.staffId, tenantId: req.user!.tenantId });
    if (!staff) {
      return res.status(404).json({ message: 'Staff profile not found' });
    }

    if (!staff.phone) {
      return res.status(400).json({ message: 'Add a phone number for this staff member to send salary slips.' });
    }

    const tenant = await TenantModel.findOne({ id: req.user!.tenantId });
    const shopName = tenant ? tenant.shopName : 'Xyraco Business';

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthLabel = `${monthNames[run.month - 1]} ${run.year}`;

    // Format WhatsApp message
    const fmt = (n: number) => '₹' + Number(n).toLocaleString('en-IN');
    const msg = `🧾 *Salary Slip — ${monthLabel}*\n` +
      `*${shopName}*\n` +
      `─────────────────────\n` +
      `👤 *${entry.staffName}* (${entry.role})\n\n` +
      `📅 *Attendance Summary*\n` +
      `• Present: ${entry.presentDays} days\n` +
      `• Absent: ${entry.absentDays} days\n` +
      `• Half-day: ${entry.halfDays} days\n` +
      `• Paid Leave: ${entry.paidLeaveDays} days\n` +
      `• Payable Days: ${entry.payableDays}/${entry.totalWorkingDays}\n\n` +
      `💰 *Salary Breakdown*\n` +
      `• Base Salary: ${fmt(entry.baseSalary)}\n` +
      `• Gross Earned: ${fmt(entry.grossSalary)}\n` +
      `• Less Advance: −${fmt(entry.advanceDeducted)}\n` +
      `─────────────────────\n` +
      `*Net Payable: ${fmt(entry.netSalary)}*\n` +
      `─────────────────────\n\n` +
      `• Payment Mode: ${entry.paymentMode.toUpperCase()}\n` +
      `• Status: ${entry.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'}\n\n` +
      `_Generated by Xyraco Billing Lite_`;

    const encodedMessage = encodeURIComponent(msg);
    // Sanitize phone: remove +, space, dashes
    const cleanPhone = staff.phone.replace(/[^0-9]/g, '');
    const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

    // Note dispatch time
    entry.slipSentAt = new Date();
    await run.save();

    res.json({
      success: true,
      whatsappLink,
      message: 'Tap to open WhatsApp and send the slip'
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Send all WhatsApp slips
router.post('/payroll/:id/send-all-slips', async (req: AuthRequest, res) => {
  try {
    const run = await PayrollRunModel.findOne({ _id: req.params.id, tenantId: req.user!.tenantId });
    if (!run) {
      return res.status(404).json({ message: 'Payroll run not found' });
    }

    const tenant = await TenantModel.findOne({ id: req.user!.tenantId });
    const shopName = tenant ? tenant.shopName : 'Xyraco Business';

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthLabel = `${monthNames[run.month - 1]} ${run.year}`;
    const fmt = (n: number) => '₹' + Number(n).toLocaleString('en-IN');

    const results = [];

    for (const entry of run.entries) {
      const staff = await StaffModel.findOne({ _id: entry.staffId, tenantId: req.user!.tenantId });
      if (staff && staff.phone) {
        const msg = `🧾 *Salary Slip — ${monthLabel}*\n` +
          `*${shopName}*\n` +
          `─────────────────────\n` +
          `👤 *${entry.staffName}* (${entry.role})\n\n` +
          `📅 *Attendance Summary*\n` +
          `• Present: ${entry.presentDays} days\n` +
          `• Absent: ${entry.absentDays} days\n` +
          `• Half-day: ${entry.halfDays} days\n` +
          `• Paid Leave: ${entry.paidLeaveDays} days\n` +
          `• Payable Days: ${entry.payableDays}/${entry.totalWorkingDays}\n\n` +
          `💰 *Salary Breakdown*\n` +
          `• Base Salary: ${fmt(entry.baseSalary)}\n` +
          `• Gross Earned: ${fmt(entry.grossSalary)}\n` +
          `• Less Advance: −${fmt(entry.advanceDeducted)}\n` +
          `─────────────────────\n` +
          `*Net Payable: ${fmt(entry.netSalary)}*\n` +
          `─────────────────────\n\n` +
          `• Payment Mode: ${entry.paymentMode.toUpperCase()}\n` +
          `• Status: ${entry.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'}\n\n` +
          `_Generated by Xyraco Billing Lite_`;

        const encodedMessage = encodeURIComponent(msg);
        const cleanPhone = staff.phone.replace(/[^0-9]/g, '');
        const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

        entry.slipSentAt = new Date();
        results.push({
          staffId: entry.staffId,
          staffName: entry.staffName,
          phone: staff.phone,
          whatsappLink
        });
      }
    }

    await run.save();
    res.json({ success: true, links: results });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
