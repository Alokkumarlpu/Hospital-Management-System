import { BillableService } from '../models/index.js';

export async function listServices(req, res, next) {
  try {
    const filter = req.user.role === 'admin' ? {} : { active: true };
    res.json({ success: true, services: await BillableService.find(filter).sort({ name: 1 }) });
  } catch (error) { next(error); }
}

export async function createService(req, res, next) {
  try {
    const service = await BillableService.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, service });
  } catch (error) { next(error); }
}
