'use strict';

const db = require('../database/connection');
const AppError = require('../utils/AppError');
const { generateUHID } = require('../utils/helpers');

/**
 * GET /patients
 */
const listPatients = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = (page - 1) * limit;
        const { search, gender, bloodGroup } = req.query;

        let whereClause = 'WHERE p.deleted_at IS NULL';
        const params = [];
        let paramIdx = 1;

        if (search) {
            whereClause += ` AND (p.first_name ILIKE $${paramIdx} OR p.last_name ILIKE $${paramIdx} OR p.uhid ILIKE $${paramIdx} OR p.phone ILIKE $${paramIdx})`;
            params.push(`%${search}%`);
            paramIdx++;
        }
        if (gender) {
            whereClause += ` AND p.gender = $${paramIdx}`;
            params.push(gender);
            paramIdx++;
        }
        if (bloodGroup) {
            whereClause += ` AND p.blood_group = $${paramIdx}`;
            params.push(bloodGroup);
            paramIdx++;
        }

        const countQuery = `SELECT COUNT(*) FROM patients p ${whereClause}`;
        const dataQuery = `
      SELECT p.id, p.uhid, p.first_name, p.last_name, p.date_of_birth, p.gender, 
             p.blood_group, p.phone, p.email, p.city, p.state, p.is_active, p.created_at,
             u.email as user_email
      FROM patients p
      LEFT JOIN users u ON u.id = p.user_id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;

        const [countResult, dataResult] = await Promise.all([
            db.query(countQuery, params),
            db.query(dataQuery, [...params, limit, offset]),
        ]);

        const total = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(total / limit);

        res.set('X-Total-Count', total);
        res.json({
            status: 'success',
            data: dataResult.rows,
            pagination: { page, limit, total, totalPages },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /patients/:id
 */
const getPatient = async (req, res, next) => {
    try {
        const { id } = req.params;

        // RBAC: patients can only view their own record
        if (req.user.role === 'PATIENT') {
            const { rows: own } = await db.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
            if (!own[0] || own[0].id !== id) {
                throw AppError.forbidden('You can only access your own patient record');
            }
        }

        const { rows } = await db.query(
            `SELECT p.*, u.email as account_email,
              cb.first_name || ' ' || cb.last_name as created_by_name
       FROM patients p
       LEFT JOIN users u ON u.id = p.user_id
       LEFT JOIN users cb ON cb.id = p.created_by
       WHERE p.id = $1 AND p.deleted_at IS NULL`,
            [id]
        );

        if (!rows[0]) throw AppError.notFound('Patient not found');

        res.json({ status: 'success', data: rows[0] });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /patients
 */
const createPatient = async (req, res, next) => {
    try {
        const {
            firstName, lastName, dateOfBirth, gender, bloodGroup, phone, email,
            address, city, state, pincode, emergencyContactName, emergencyContactPhone,
            allergies, chronicConditions, insuranceProvider, insurancePolicyNumber,
        } = req.body;

        // Check duplicate phone
        const { rows: existing } = await db.query(
            'SELECT id FROM patients WHERE phone = $1 AND deleted_at IS NULL',
            [phone]
        );
        if (existing[0]) throw AppError.conflict('A patient with this phone number already exists');

        const uhid = await generateUHID();

        const { rows } = await db.query(
            `INSERT INTO patients (
        uhid, first_name, last_name, date_of_birth, gender, blood_group,
        phone, email, address, city, state, pincode,
        emergency_contact_name, emergency_contact_phone,
        allergies, chronic_conditions, insurance_provider, insurance_policy_number,
        created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING *`,
            [
                uhid, firstName, lastName, dateOfBirth, gender, bloodGroup || null,
                phone, email || null, address || null, city || null, state || null, pincode || null,
                emergencyContactName || null, emergencyContactPhone || null,
                allergies || [], chronicConditions || [],
                insuranceProvider || null, insurancePolicyNumber || null,
                req.user.id,
            ]
        );

        res.status(201).json({ status: 'success', data: rows[0] });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /patients/:id
 */
const updatePatient = async (req, res, next) => {
    try {
        const { id } = req.params;

        const { rows: existing } = await db.query(
            'SELECT * FROM patients WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );
        if (!existing[0]) throw AppError.notFound('Patient not found');

        const {
            firstName, lastName, phone, email, address, city, state, pincode,
            emergencyContactName, emergencyContactPhone, allergies, chronicConditions,
            insuranceProvider, insurancePolicyNumber, bloodGroup,
        } = req.body;

        const { rows } = await db.query(
            `UPDATE patients SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        phone = COALESCE($3, phone),
        email = COALESCE($4, email),
        address = COALESCE($5, address),
        city = COALESCE($6, city),
        state = COALESCE($7, state),
        pincode = COALESCE($8, pincode),
        emergency_contact_name = COALESCE($9, emergency_contact_name),
        emergency_contact_phone = COALESCE($10, emergency_contact_phone),
        allergies = COALESCE($11, allergies),
        chronic_conditions = COALESCE($12, chronic_conditions),
        insurance_provider = COALESCE($13, insurance_provider),
        insurance_policy_number = COALESCE($14, insurance_policy_number),
        blood_group = COALESCE($15, blood_group)
      WHERE id = $16 RETURNING *`,
            [
                firstName, lastName, phone, email, address, city, state, pincode,
                emergencyContactName, emergencyContactPhone,
                allergies, chronicConditions, insuranceProvider, insurancePolicyNumber, bloodGroup,
                id,
            ]
        );

        res.json({ status: 'success', data: rows[0] });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /patients/:id
 */
const deletePatient = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rows } = await db.query(
            'UPDATE patients SET deleted_at = NOW(), is_active = false WHERE id = $1 AND deleted_at IS NULL RETURNING id',
            [id]
        );
        if (!rows[0]) throw AppError.notFound('Patient not found');
        res.json({ status: 'success', message: 'Patient deactivated successfully' });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /patients/export/csv
 */
const exportCsv = async (req, res, next) => {
    try {
        const { rows } = await db.query(
            `SELECT uhid, first_name, last_name, date_of_birth, gender, blood_group, 
              phone, email, city, state, created_at
       FROM patients WHERE deleted_at IS NULL ORDER BY created_at DESC`
        );

        const header = ['UHID', 'First Name', 'Last Name', 'DOB', 'Gender', 'Blood Group', 'Phone', 'Email', 'City', 'State', 'Registered'];
        const csvRows = rows.map(r => [
            r.uhid, r.first_name, r.last_name, r.date_of_birth?.toISOString().split('T')[0],
            r.gender, r.blood_group || '', r.phone, r.email || '', r.city || '', r.state || '',
            r.created_at?.toISOString(),
        ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','));

        const csv = [header.join(','), ...csvRows].join('\n');

        res.set({
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="patients-${Date.now()}.csv"`,
        });
        res.send(csv);
    } catch (err) {
        next(err);
    }
};

module.exports = { listPatients, getPatient, createPatient, updatePatient, deletePatient, exportCsv };
