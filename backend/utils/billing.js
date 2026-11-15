import mongoose from 'mongoose';

export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function calculateInvoiceTotals(lineItems, discount = 0, tax = 0) {
  const normalizedItems = lineItems.map((item) => {
    const quantity = Number(item.quantity);
    const unitPrice = roundMoney(item.unitPrice);
    if (!Number.isInteger(quantity) || quantity < 1 || !Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw Object.assign(new Error('Line item quantity and unit price must be positive values'), { statusCode: 400 });
    }
    return { description: item.description, category: item.category, quantity, unitPrice, amount: roundMoney(quantity * unitPrice) };
  });
  const subtotal = roundMoney(normalizedItems.reduce((sum, item) => sum + item.amount, 0));
  const normalizedDiscount = roundMoney(discount);
  const normalizedTax = roundMoney(tax);
  if (!Number.isFinite(normalizedDiscount) || normalizedDiscount < 0 || normalizedDiscount > subtotal) {
    throw Object.assign(new Error('Discount must be between zero and the subtotal'), { statusCode: 400 });
  }
  if (!Number.isFinite(normalizedTax) || normalizedTax < 0) {
    throw Object.assign(new Error('Tax cannot be negative'), { statusCode: 400 });
  }
  const totalAmount = roundMoney(subtotal - normalizedDiscount + normalizedTax);
  if (totalAmount <= 0) throw Object.assign(new Error('Invoice total must be greater than zero'), { statusCode: 400 });
  return { lineItems: normalizedItems, subtotal, discount: normalizedDiscount, tax: normalizedTax, totalAmount };
}

export function invoiceStatus({ amountPaid, totalAmount, dueDate }) {
  const paid = roundMoney(amountPaid);
  if (paid >= roundMoney(totalAmount)) return 'paid';
  if (paid > 0) return 'partially_paid';
  if (new Date(dueDate) < new Date()) return 'overdue';
  return 'unpaid';
}

export function transactionUnsupported(error) {
  return error?.code === 20
    || error?.code === 251
    || /Transaction numbers are only allowed|replica set|mongos|transaction|retryable writes|does not support/i.test(error?.message || '');
}

export async function withOptionalTransaction(operation) {
  const session = await mongoose.startSession();
  try {
    let result;
    try {
      await session.withTransaction(async () => {
        result = await operation(session);
      });
      return result;
    } catch (error) {
      if (!transactionUnsupported(error)) throw error;
      return operation(null);
    }
  } finally {
    await session.endSession();
  }
}
