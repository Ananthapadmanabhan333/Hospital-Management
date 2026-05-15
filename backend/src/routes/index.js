'use strict';

const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const patientRoutes = require('./patient.routes');
const doctorRoutes = require('./doctor.routes');
const appointmentRoutes = require('./appointment.routes');
const medicalRecordRoutes = require('./medicalRecord.routes');
const labTestRoutes = require('./labTest.routes');
const billingRoutes = require('./billing.routes');
const auditRoutes = require('./audit.routes');
const notificationRoutes = require('./notification.routes');
const adminRoutes = require('./admin.routes');
const reportRoutes = require('./report.routes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/patients', patientRoutes);
router.use('/doctors', doctorRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/medical-records', medicalRecordRoutes);
router.use('/lab-tests', labTestRoutes);
router.use('/billing', billingRoutes);
router.use('/audit', auditRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/reports', reportRoutes);

module.exports = router;
