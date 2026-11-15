import mongoose from 'mongoose';
import { Appointment, Department, Doctor, DoctorSchedule, DiagnosticReport, Invoice, Payment, Patient, AuditLog, User } from '../models/index.js';
import { refreshOverdueStatuses } from './invoiceController.js';
import { roundMoney } from '../utils/billing.js';
import { getPagination, paginatedResponse, escapeRegex } from '../utils/pagination.js';

function dateFilter(query, field) {
  if (!query.from && !query.to) return {};
  if ((query.from && Number.isNaN(Date.parse(`${query.from}T00:00:00.000Z`))) || (query.to && Number.isNaN(Date.parse(`${query.to}T23:59:59.999Z`)))) {
    throw Object.assign(new Error('from and to must be valid dates'), { statusCode: 400 });
  }
  if (query.from && query.to && new Date(`${query.from}T00:00:00.000Z`) > new Date(`${query.to}T23:59:59.999Z`)) {
    throw Object.assign(new Error('from must be before or equal to to'), { statusCode: 400 });
  }
  const filter = {};
  if (query.from) filter.$gte = new Date(`${query.from}T00:00:00.000Z`);
  if (query.to) filter.$lte = new Date(`${query.to}T23:59:59.999Z`);
  return { [field]: filter };
}

async function appointmentScope(req) {
  if (req.user.role !== 'clinician') return {};
  const doctor = await Doctor.findOne({ userId: req.user._id, isActive: true }).select('_id');
  return { doctorId: doctor?._id || null };
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

function sendCsv(res, filename, headers, rows) {
  res.type('text/csv').set('Content-Disposition', `attachment; filename="${filename}"`);
  res.send([headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n'));
}

export async function appointmentReportSummary(req, res, next) {
  try {
    const filter = { ...dateFilter(req.query, 'appointmentDate'), ...(await appointmentScope(req)) };
    const [summary] = await Appointment.aggregate([
      { $match: filter },
      { $group: {
        _id: null,
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        noShow: { $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] } },
      } },
    ]);
    const today = new Date();
    if (req.query.date && !/^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) {
      throw Object.assign(new Error('date must use YYYY-MM-DD format'), { statusCode: 400 });
    }
    const todayStart = req.query.date
      ? new Date(`${req.query.date}T00:00:00.000Z`)
      : new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const tomorrow = new Date(todayStart);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const todayFilter = { ...filter, appointmentDate: todayStart };
    const [todayCount, upcoming, byStatus] = await Promise.all([
      Appointment.countDocuments(todayFilter),
      Appointment.countDocuments({ ...filter, appointmentDate: { $gte: tomorrow }, status: { $nin: ['cancelled', 'completed', 'no_show'] } }),
      Appointment.aggregate([{ $match: todayFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    ]);
    const data = { total: summary?.total || 0, today: todayCount, upcoming, completed: summary?.completed || 0, cancelled: summary?.cancelled || 0, noShow: summary?.noShow || 0, byStatus };
    if (req.query.format === 'csv') return sendCsv(res, 'appointment-summary.csv', ['Metric', 'Value'], Object.entries(data).filter(([, value]) => Number.isFinite(value)).map(([key, value]) => [key, value]));
    res.json({ success: true, summary: data });
  } catch (error) { next(error); }
}

export async function appointmentTrends(req, res, next) {
  try {
    const filter = { ...dateFilter(req.query, 'appointmentDate'), ...(await appointmentScope(req)) };
    const data = await Appointment.aggregate([
      { $match: filter },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$appointmentDate' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ success: true, trends: data.map(({ _id, count }) => ({ date: _id, count })) });
  } catch (error) { next(error); }
}

export async function appointmentsByDepartment(req, res, next) {
  try {
    const filter = { ...dateFilter(req.query, 'appointmentDate'), ...(await appointmentScope(req)) };
    const data = await Appointment.aggregate([
      { $match: filter },
      { $group: { _id: '$departmentId', count: { $sum: 1 } } },
      { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'department' } },
      { $unwind: { path: '$department', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, departmentId: '$_id', department: '$department.departmentName', count: 1 } },
      { $sort: { count: -1 } },
    ]);
    res.json({ success: true, departments: data });
  } catch (error) { next(error); }
}

export async function appointmentsByDoctor(req, res, next) {
  try {
    const filter = { ...dateFilter(req.query, 'appointmentDate'), ...(await appointmentScope(req)) };
    const data = await Appointment.aggregate([
      { $match: filter },
      { $group: { _id: '$doctorId', count: { $sum: 1 } } },
      { $lookup: { from: 'doctors', localField: '_id', foreignField: '_id', as: 'doctor' } },
      { $unwind: { path: '$doctor', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, doctorId: '$_id', doctor: '$doctor.name', count: 1 } },
      { $sort: { count: -1 } },
    ]);
    res.json({ success: true, doctors: data });
  } catch (error) { next(error); }
}

export async function billingReportSummary(req, res, next) {
  try {
    await refreshOverdueStatuses();
    const match = { status: { $ne: 'cancelled' }, ...dateFilter(req.query, 'invoiceDate') };
    const [summary, statuses, paymentCounts] = await Promise.all([
      Invoice.aggregate([{ $match: match }, { $group: { _id: null, totalInvoices: { $sum: 1 }, totalInvoiced: { $sum: '$totalAmount' }, outstanding: { $sum: '$outstandingBalance' }, collected: { $sum: '$amountPaid' } } }]),
      Invoice.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$totalAmount' } } }, { $sort: { _id: 1 } }]),
      Invoice.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
    const result = summary[0] || {};
    const data = {
      totalInvoiced: roundMoney(result.totalInvoiced || 0),
      totalCollected: roundMoney(result.collected || 0),
      outstanding: roundMoney(result.outstanding || 0),
      totalInvoices: result.totalInvoices || 0,
      paidInvoices: paymentCounts.find((item) => item._id === 'paid')?.count || 0,
      unpaidInvoices: paymentCounts.find((item) => item._id === 'unpaid')?.count || 0,
      partiallyPaidInvoices: paymentCounts.find((item) => item._id === 'partially_paid')?.count || 0,
      overdueInvoices: paymentCounts.find((item) => item._id === 'overdue')?.count || 0,
      byStatus: statuses,
    };
    if (req.query.format === 'csv') return sendCsv(res, 'billing-summary.csv', ['Metric', 'Value'], Object.entries(data).filter(([, value]) => Number.isFinite(value)).map(([key, value]) => [key, value]));
    res.json({ success: true, summary: data });
  } catch (error) { next(error); }
}

export async function billingRevenueTrends(req, res, next) {
  try {
    const match = { paymentStatus: 'successful', ...dateFilter(req.query, 'paymentDate') };
    const data = await Payment.aggregate([{ $match: match }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' } }, amount: { $sum: { $subtract: ['$amount', '$refundedAmount'] } } } }, { $sort: { _id: 1 } }]);
    res.json({ success: true, trends: data.map(({ _id, amount }) => ({ date: _id, amount: roundMoney(amount) })) });
  } catch (error) { next(error); }
}

export async function billingInvoiceStatus(req, res, next) {
  try {
    const match = { status: { $ne: 'cancelled' }, ...dateFilter(req.query, 'invoiceDate') };
    const data = await Invoice.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$totalAmount' } } }, { $sort: { _id: 1 } }]);
    res.json({ success: true, statuses: data });
  } catch (error) { next(error); }
}

export async function billingPaymentMethods(req, res, next) {
  try {
    const match = { paymentStatus: 'successful', ...dateFilter(req.query, 'paymentDate') };
    const data = await Payment.aggregate([{ $match: match }, { $group: { _id: '$paymentMethod', count: { $sum: 1 }, amount: { $sum: { $subtract: ['$amount', '$refundedAmount'] } } } }, { $sort: { amount: -1 } }]);
    res.json({ success: true, methods: data.map((item) => ({ ...item, amount: roundMoney(item.amount) })) });
  } catch (error) { next(error); }
}

export async function dashboardSummary(req, res, next) {
  try {
    const appointmentFilter = await appointmentScope(req);
    const [patients, doctors, departments, appointments, billing] = await Promise.all([
      Patient.countDocuments({ isActive: true }),
      Doctor.countDocuments({ isActive: true }),
      Department.countDocuments({ isActive: true }),
      Appointment.countDocuments(appointmentFilter),
      ['admin', 'front_desk'].includes(req.user.role) ? Invoice.aggregate([{ $match: { status: { $ne: 'cancelled' } } }, { $group: { _id: null, invoiced: { $sum: '$totalAmount' }, collected: { $sum: '$amountPaid' }, outstanding: { $sum: '$outstandingBalance' } } }]) : [],
    ]);
    const response = { role: req.user.role, patients, doctors, departments, appointments, billing: billing[0] || null };
    if (req.user.role === 'admin') response.recentAudit = await AuditLog.find().sort({ timestamp: -1 }).limit(10).populate('userId', 'name email role').lean();
    res.json({ success: true, dashboard: response });
  } catch (error) { next(error); }
}

export async function clinicianDashboard(req, res, next) {
  try {
    const doctor = await Doctor.findOne({ userId: req.user._id, isActive: true }).select('_id name specialization departmentId');
    if (!doctor) {
      res.json({ success: true, dashboard: { doctor: null, todayAppointments: [], followUps: [], recentActivity: [], pendingReports: 0, activeQueue: 0, weeklyHours: 0, weeklyTarget: 40 } });
      return;
    }
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrow = new Date(todayStart);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const [todayAppointments, activeQueue, pendingReports, followUps, schedules, recentActivity, completedToday] = await Promise.all([
      Appointment.find({ doctorId: doctor._id, appointmentDate: todayStart, status: { $nin: ['cancelled', 'no_show'] } })
        .populate('patientId', 'patientId name dateOfBirth gender')
        .populate('departmentId', 'departmentName')
        .sort({ startTime: 1 })
        .lean(),
      Appointment.countDocuments({ doctorId: doctor._id, status: { $in: ['checked_in', 'in_progress'] } }),
      DiagnosticReport.countDocuments({ doctorId: doctor._id, status: { $in: ['requested', 'pending'] } }),
      Appointment.find({ doctorId: doctor._id, appointmentType: 'follow_up', appointmentDate: { $gte: tomorrow }, status: { $nin: ['cancelled', 'no_show', 'completed'] } })
        .populate('patientId', 'patientId name')
        .sort({ appointmentDate: 1, startTime: 1 })
        .limit(5)
        .lean(),
      DoctorSchedule.find({ doctorId: doctor._id, isActive: true, isAvailable: true }).sort({ workingDay: 1, startTime: 1 }).lean(),
      AuditLog.find({ userId: req.user._id }).sort({ timestamp: -1 }).limit(5).lean(),
      Appointment.countDocuments({ doctorId: doctor._id, appointmentDate: todayStart, status: 'completed' }),
    ]);
    const weeklyMinutes = schedules.reduce((total, schedule) => {
      const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
      const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
      return total + Math.max(0, (endHour * 60 + endMinute) - (startHour * 60 + startMinute));
    }, 0);
    res.json({
      success: true,
      dashboard: {
        doctor,
        todayAppointments,
        followUps,
        recentActivity,
        pendingReports,
        activeQueue,
        completedToday,
        weeklyHours: Math.round((weeklyMinutes / 60) * 10) / 10,
        weeklyTarget: 40,
        schedules,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function listAuditLogs(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = { ...dateFilter(req.query, 'timestamp') };
    if (req.query.action) filter.action = req.query.action;
    if (req.query.entityType) filter.entityType = req.query.entityType;
    if (req.query.entityId) filter.entityId = req.query.entityId;
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.search) {
      const search = escapeRegex(req.query.search.trim());
      const users = await User.find({ $or: [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] }).select('_id');
      filter.$or = [{ description: { $regex: search, $options: 'i' } }, { userId: { $in: users.map((user) => user._id) } }];
      if (mongoose.Types.ObjectId.isValid(req.query.search)) filter.$or.push({ entityId: req.query.search });
    }
    const query = AuditLog.find(filter).sort({ timestamp: -1 }).populate('userId', 'name email role').lean();
    const [data, total] = await Promise.all([
      req.query.format === 'csv' ? query : query.skip(skip).limit(limit),
      AuditLog.countDocuments(filter),
    ]);
    if (req.query.format === 'csv') return sendCsv(res, 'audit-logs.csv', ['User', 'Action', 'Entity', 'Entity ID', 'Timestamp', 'Description'], data.map((log) => [log.userId?.email, log.action, log.entityType, log.entityId, log.timestamp, log.description]));
    res.json({ success: true, ...paginatedResponse({ page, limit, total, data }) });
  } catch (error) { next(error); }
}
