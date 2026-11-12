import { Department, Doctor } from '../models/index.js';
import { writeAuditLog } from '../utils/audit.js';
import { escapeRegex, getPagination, paginatedResponse } from '../utils/pagination.js';

const editableFields = ['departmentName', 'description', 'departmentCode', 'location', 'contactNumber'];

function safeDepartment(department) {
  return department.toObject ? department.toObject() : department;
}

function departmentUpdates(body) {
  return Object.fromEntries(Object.entries(body).filter(([key]) => editableFields.includes(key)));
}

export async function createDepartment(req, res, next) {
  try {
    const department = await Department.create(departmentUpdates(req.body));
    await writeAuditLog({ userId: req.user._id, action: 'create', entityType: 'Department', entityId: department._id });
    res.status(201).json({ success: true, department: safeDepartment(department) });
  } catch (error) {
    if (error.code === 11000) {
      error.statusCode = 409;
      error.message = 'Department name or code already exists';
    }
    next(error);
  }
}

export async function listDepartments(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const search = escapeRegex(req.query.search?.trim() || '');
    const filter = search ? { $or: [{ departmentName: { $regex: search, $options: 'i' } }, { departmentCode: { $regex: search, $options: 'i' } }] } : {};
    if (req.query.isActive === 'true' || req.query.isActive === 'false') filter.isActive = req.query.isActive === 'true';
    const [departments, total] = await Promise.all([
      Department.find(filter).sort({ departmentName: 1 }).skip(skip).limit(limit),
      Department.countDocuments(filter),
    ]);
    res.json({ success: true, ...paginatedResponse({ page, limit, total, data: departments.map(safeDepartment) }) });
  } catch (error) {
    next(error);
  }
}

export async function getDepartment(req, res, next) {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      res.status(404).json({ success: false, message: 'Department not found' });
      return;
    }
    const doctors = await Doctor.find({ departmentId: department._id }).select('doctorId name specialization qualification isActive').sort({ name: 1 });
    res.json({ success: true, department: safeDepartment(department), doctors });
  } catch (error) {
    next(error);
  }
}

export async function updateDepartment(req, res, next) {
  try {
    const updates = departmentUpdates(req.body);
    const department = await Department.findByIdAndUpdate(req.params.id, updates, { returnDocument: 'after', runValidators: true });
    if (!department) {
      res.status(404).json({ success: false, message: 'Department not found' });
      return;
    }
    await writeAuditLog({ userId: req.user._id, action: 'update', entityType: 'Department', entityId: department._id, metadata: { fields: Object.keys(updates) } });
    res.json({ success: true, department: safeDepartment(department) });
  } catch (error) {
    if (error.code === 11000) {
      error.statusCode = 409;
      error.message = 'Department name or code already exists';
    }
    next(error);
  }
}

export async function updateDepartmentStatus(req, res, next) {
  try {
    if (req.body.isActive === false && await Doctor.exists({ departmentId: req.params.id, isActive: true })) {
      res.status(409).json({ success: false, message: 'Cannot deactivate a department with active doctors assigned' });
      return;
    }
    const department = await Department.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { returnDocument: 'after', runValidators: true });
    if (!department) {
      res.status(404).json({ success: false, message: 'Department not found' });
      return;
    }
    await writeAuditLog({ userId: req.user._id, action: req.body.isActive ? 'activate' : 'deactivate', entityType: 'Department', entityId: department._id });
    res.json({ success: true, department: safeDepartment(department) });
  } catch (error) {
    next(error);
  }
}
