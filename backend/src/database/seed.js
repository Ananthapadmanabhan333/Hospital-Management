'use strict';

require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./connection');
const logger = require('../utils/logger');

async function seed() {
    logger.info('🌱 Seeding database...');

    try {
        // Create admin user
        const adminHash = await bcrypt.hash('Admin@Hospital2024!', 12);
        const { rows: [admin] } = await db.query(
            `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, is_active, is_email_verified)
       VALUES ($1, $2, 'ADMIN', 'System', 'Administrator', '0000000000', true, true)
       ON CONFLICT (email) DO UPDATE SET password_hash = $2 RETURNING id`,
            ['admin@hospitalcms.com', adminHash]
        );

        // Create doctor user
        const doctorHash = await bcrypt.hash('Doctor@Hospital2024!', 12);
        const { rows: [docUser] } = await db.query(
            `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, is_active, is_email_verified)
       VALUES ($1, $2, 'DOCTOR', 'James', 'Wilson', '9876543210', true, true)
       ON CONFLICT (email) DO UPDATE SET password_hash = $2 RETURNING id`,
            ['doctor@hospitalcms.com', doctorHash]
        );

        // Create doctor profile
        await db.query(
            `INSERT INTO doctors (user_id, registration_number, specialization, department, qualification, experience_years, consultation_fee)
       VALUES ($1, 'MCI-2024-001', 'General Medicine', 'Internal Medicine', 'MBBS, MD', 15, 500.00)
       ON CONFLICT (user_id) DO NOTHING`,
            [docUser.id]
        );

        // Create receptionist
        const recepHash = await bcrypt.hash('Recep@Hospital2024!', 12);
        await db.query(
            `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, is_active, is_email_verified)
       VALUES ($1, $2, 'RECEPTIONIST', 'Sarah', 'Connor', '9876543211', true, true)
       ON CONFLICT (email) DO NOTHING`,
            ['receptionist@hospitalcms.com', recepHash]
        );

        // Create lab assistant
        const labHash = await bcrypt.hash('Lab@Hospital2024!', 12);
        await db.query(
            `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, is_active, is_email_verified)
       VALUES ($1, $2, 'LAB_ASSISTANT', 'Mike', 'Johnson', '9876543212', true, true)
       ON CONFLICT (email) DO NOTHING`,
            ['lab@hospitalcms.com', labHash]
        );

        // Create patient user
        const patientHash = await bcrypt.hash('Patient@Hospital2024!', 12);
        const { rows: [patUser] } = await db.query(
            `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, is_active, is_email_verified)
       VALUES ($1, $2, 'PATIENT', 'John', 'Doe', '9876543213', true, true)
       ON CONFLICT (email) DO UPDATE SET password_hash = $2 RETURNING id`,
            ['patient@hospitalcms.com', patientHash]
        );

        // Create patient profile
        await db.query(
            `INSERT INTO patients (user_id, uhid, first_name, last_name, date_of_birth, gender, blood_group, phone, email, address, city, state, created_by)
       VALUES ($1, 'UHID00001', 'John', 'Doe', '1990-05-15', 'MALE', 'O+', '9876543213', 'patient@hospitalcms.com', '123 Main St', 'Mumbai', 'Maharashtra', $2)
       ON CONFLICT (uhid) DO NOTHING`,
            [patUser.id, admin.id]
        );

        logger.info('✅ Database seeded successfully');
        logger.info('📋 Default credentials:');
        logger.info('  Admin:        admin@hospitalcms.com / Admin@Hospital2024!');
        logger.info('  Doctor:       doctor@hospitalcms.com / Doctor@Hospital2024!');
        logger.info('  Receptionist: receptionist@hospitalcms.com / Recep@Hospital2024!');
        logger.info('  Lab:          lab@hospitalcms.com / Lab@Hospital2024!');
        logger.info('  Patient:      patient@hospitalcms.com / Patient@Hospital2024!');

        process.exit(0);
    } catch (err) {
        logger.error('❌ Seeding failed:', err.message);
        process.exit(1);
    }
}

seed();
