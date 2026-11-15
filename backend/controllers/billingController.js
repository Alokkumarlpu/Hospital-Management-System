import { Invoice, Payment } from '../models/index.js';
import { roundMoney } from '../utils/billing.js';
import { refreshOverdueStatuses } from './invoiceController.js';

export async function billingDashboard(req, res, next) {
  try {
    await refreshOverdueStatuses();
    const [summary] = await Invoice.aggregate([{ $match: { status: { $ne: 'cancelled' } } }, { $group: { _id: null, totalInvoices: { $sum: 1 }, totalBilled: { $sum: '$totalAmount' }, totalCollected: { $sum: '$amountPaid' }, outstanding: { $sum: '$outstandingBalance' } } }]);
    const statusBreakdown = await Invoice.aggregate([{ $match: { status: { $ne: 'cancelled' } } }, { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$totalAmount' } } }, { $sort: { _id: 1 } }]);
    const recentPayments = await Payment.find().sort({ paymentDate: -1 }).limit(10).populate('invoiceId', 'invoiceNumber').populate('patientId', 'patientId name');
    res.json({ success: true, dashboard: { totalInvoices: summary?.totalInvoices || 0, totalBilled: roundMoney(summary?.totalBilled || 0), totalCollected: roundMoney(summary?.totalCollected || 0), outstanding: roundMoney(summary?.outstanding || 0), statusBreakdown, recentPayments } });
  } catch (error) { next(error); }
}
