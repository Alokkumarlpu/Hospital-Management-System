import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { AuditLog, Department, Doctor, DoctorSchedule, Patient, User } from '../models/index.js';

const departments = [
  ['Cardiology', 'Heart and vascular care', 'CARD'],
  ['Pediatrics', 'Care for children and adolescents', 'PEDS'],
  ['Orthopedics', 'Musculoskeletal care', 'ORTH'],
  ['Dermatology', 'Skin and hair care', 'DERM'],
  ['General Medicine', 'Primary and internal medicine', 'GEN'],
];

const scheduleDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

async function seed() {
  await connectDatabase();
  await Promise.all([AuditLog.deleteMany({}), DoctorSchedule.deleteMany({}), Doctor.deleteMany({}), Patient.deleteMany({}), Department.deleteMany({}), User.deleteMany({})]);

  const password = await bcrypt.hash('DevelopmentOnly123!', 12);
  const users = await User.insertMany([
    { name: 'System Administrator', email: 'admin@example.test', password, role: 'admin', phone: '555-0100' },
    { name: 'Front Desk One', email: 'frontdesk1@example.test', password, role: 'front_desk', phone: '555-0101' },
    { name: 'Front Desk Two', email: 'frontdesk2@example.test', password, role: 'front_desk', phone: '555-0102' },
    ...Array.from({ length: 5 }, (_, index) => ({
      name: `Clinician ${index + 1}`,
      email: `clinician${index + 1}@example.test`,
      password,
      role: 'clinician',
      phone: `555-02${String(index).padStart(2, '0')}`,
    })),
  ]);
  const createdDepartments = await Department.insertMany(
    departments.map(([departmentName, description, departmentCode]) => ({ departmentName, description, departmentCode })),
  );
  const doctors = await Doctor.insertMany(
    users.filter((user) => user.role === 'clinician').map((user, index) => ({
      doctorId: `DOC-${String(index + 1).padStart(3, '0')}`,
      userId: user._id,
      name: user.name,
      specialization: departments[index][0],
      departmentId: createdDepartments[index]._id,
      qualification: 'MD',
      experience: 5 + index,
      consultationFee: 75 + index * 10,
      phone: user.phone,
      email: user.email,
    })),
  );
  await Patient.insertMany(
    Array.from({ length: 10 }, (_, index) => ({
      patientId: `PAT-${String(index + 1).padStart(4, '0')}`,
      name: `Test Patient ${index + 1}`,
      dateOfBirth: new Date(1980 + index, index % 12, 1),
      gender: index % 2 ? 'female' : 'male',
      phone: `555-10${String(index).padStart(2, '0')}`,
      email: `patient${index + 1}@example.test`,
      address: '100 Example Street',
      emergencyContact: { name: 'Emergency Contact', relationship: 'friend', phone: '555-9999' },
    })),
  );
  await DoctorSchedule.insertMany(
    doctors.flatMap((doctor) =>
      scheduleDays.map((workingDay) => ({
        doctorId: doctor._id,
        workingDay,
        startTime: '09:00',
        endTime: '17:00',
        slotDuration: 30,
      })),
    ),
  );
  console.log('Seed complete: 8 users, 5 departments, 5 doctors, 10 patients, and 25 schedules.');
}

try {
  await seed();
} finally {
  await disconnectDatabase();
  await mongoose.connection.close();
}
