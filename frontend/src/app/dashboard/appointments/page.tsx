'use client';

import { useState, useEffect, useCallback } from 'react';
import { appointmentsApi, doctorsApi, patientsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { Calendar, Plus, X, Clock, CheckCircle, XCircle, Filter } from 'lucide-react';

interface Appointment {
    id: string;
    appointment_date: string;
    appointment_time: string;
    status: string;
    type: string;
    patient_name: string;
    patient_phone: string;
    uhid: string;
    doctor_name: string;
    specialization: string;
    chief_complaint?: string;
}

const STATUS_BADGE: Record<string, string> = {
    SCHEDULED: 'badge-info',
    CONFIRMED: 'badge-success',
    IN_PROGRESS: 'badge-purple',
    COMPLETED: 'badge-secondary',
    CANCELLED: 'badge-danger',
    NO_SHOW: 'badge-warning',
};

export default function AppointmentsPage() {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [patients, setPatients] = useState<any[]>([]);
    const [slots, setSlots] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        patientId: '', doctorId: '', appointmentDate: '', appointmentTime: '',
        type: 'CONSULTATION', chiefComplaint: '',
    });

    const canCreate = ['ADMIN', 'RECEPTIONIST', 'PATIENT'].includes(user?.role || '');
    const canUpdateStatus = ['ADMIN', 'DOCTOR', 'RECEPTIONIST'].includes(user?.role || '');

    const fetchAppointments = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = { page, limit: 15 };
            if (statusFilter) params.status = statusFilter;
            if (dateFilter) params.date = dateFilter;
            const { data } = await appointmentsApi.list(params);
            setAppointments(data.data);
            setPagination(data.pagination);
        } catch {
            toast.error('Failed to load appointments');
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, dateFilter]);

    useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

    useEffect(() => {
        if (showModal) {
            doctorsApi.list({ limit: 100 }).then(({ data }) => setDoctors(data.data)).catch(() => { });
            if (user?.role !== 'PATIENT') {
                patientsApi.list({ limit: 200 }).then(({ data }) => setPatients(data.data)).catch(() => { });
            }
        }
    }, [showModal, user?.role]);

    useEffect(() => {
        if (form.doctorId && form.appointmentDate) {
            appointmentsApi.getAvailableSlots(form.doctorId, form.appointmentDate)
                .then(({ data }) => setSlots(data.data.slots || []))
                .catch(() => setSlots([]));
        } else {
            setSlots([]);
        }
    }, [form.doctorId, form.appointmentDate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = { ...form };
            if (user?.role === 'PATIENT') {
                // Auto-fill patient ID from user's profile
                // This would be set by the UI - for now use form
            }
            await appointmentsApi.create(payload);
            toast.success('Appointment booked successfully!');
            setShowModal(false);
            setForm({ patientId: '', doctorId: '', appointmentDate: '', appointmentTime: '', type: 'CONSULTATION', chiefComplaint: '' });
            fetchAppointments();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to book appointment');
        } finally {
            setSubmitting(false);
        }
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            await appointmentsApi.updateStatus(id, status);
            toast.success(`Appointment ${status.toLowerCase()}`);
            fetchAppointments();
        } catch {
            toast.error('Failed to update status');
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Appointments</h1>
                    <p className="page-subtitle">{pagination.total} total appointments</p>
                </div>
                {canCreate && (
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={16} /> Book Appointment
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>Filters:</span>
                </div>
                <select className="input" style={{ width: 'auto', fontSize: '0.8125rem' }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                    <option value="">All Status</option>
                    {['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input type="date" className="input" style={{ width: 'auto' }} value={dateFilter} onChange={e => { setDateFilter(e.target.value); setPage(1); }} />
                {(statusFilter || dateFilter) && (
                    <button className="btn btn-ghost btn-sm" onClick={() => { setStatusFilter(''); setDateFilter(''); }}>
                        <X size={14} /> Clear
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Date & Time</th>
                            <th>Patient</th>
                            <th>Doctor</th>
                            <th>Type</th>
                            <th>Chief Complaint</th>
                            <th>Status</th>
                            {canUpdateStatus && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            [...Array(6)].map((_, i) => (
                                <tr key={i}>{[...Array(7)].map((_, j) => <td key={j}><div className="skeleton" style={{ height: '16px' }} /></td>)}</tr>
                            ))
                        ) : appointments.length === 0 ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                <Calendar size={32} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.3 }} />
                                No appointments found
                            </td></tr>
                        ) : appointments.map(a => (
                            <tr key={a.id}>
                                <td>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{new Date(a.appointment_date).toLocaleDateString('en-IN')}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Clock size={11} />{a.appointment_time?.substring(0, 5)}
                                    </div>
                                </td>
                                <td>
                                    <div style={{ fontWeight: 600 }}>{a.patient_name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.uhid}</div>
                                </td>
                                <td>
                                    <div>{a.doctor_name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.specialization}</div>
                                </td>
                                <td><span className="badge badge-secondary">{a.type}</span></td>
                                <td style={{ color: 'var(--text-muted)', maxWidth: '200px' }}>
                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.chief_complaint || '—'}</div>
                                </td>
                                <td><span className={`badge ${STATUS_BADGE[a.status] || 'badge-secondary'}`}>{a.status}</span></td>
                                {canUpdateStatus && (
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                                            {a.status === 'SCHEDULED' && (
                                                <button className="btn btn-success btn-sm" onClick={() => updateStatus(a.id, 'CONFIRMED')} title="Confirm">
                                                    <CheckCircle size={13} />
                                                </button>
                                            )}
                                            {(a.status === 'CONFIRMED' || a.status === 'SCHEDULED') && (
                                                <button className="btn btn-danger btn-sm" onClick={() => updateStatus(a.id, 'CANCELLED')} title="Cancel">
                                                    <XCircle size={13} />
                                                </button>
                                            )}
                                            {a.status === 'CONFIRMED' && (
                                                <button className="btn btn-primary btn-sm" onClick={() => updateStatus(a.id, 'IN_PROGRESS')} title="Start">
                                                    ▶
                                                </button>
                                            )}
                                            {a.status === 'IN_PROGRESS' && (
                                                <button className="btn btn-success btn-sm" onClick={() => updateStatus(a.id, 'COMPLETED')} title="Complete">
                                                    ✓
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.25rem' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
                    <span style={{ padding: '0.375rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Page {page} of {pagination.totalPages}</span>
                    <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}>Next →</button>
                </div>
            )}

            {/* Book appointment modal */}
            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Book Appointment</h2>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            {user?.role !== 'PATIENT' && (
                                <div className="form-group">
                                    <label className="label">Patient *</label>
                                    <select className="input" value={form.patientId} onChange={e => setForm(f => ({ ...f, patientId: e.target.value }))} required>
                                        <option value="">Select patient...</option>
                                        {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.uhid})</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="form-group">
                                <label className="label">Doctor *</label>
                                <select className="input" value={form.doctorId} onChange={e => setForm(f => ({ ...f, doctorId: e.target.value, appointmentTime: '' }))} required>
                                    <option value="">Select doctor...</option>
                                    {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.first_name} {d.last_name} – {d.specialization}</option>)}
                                </select>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="label">Date *</label>
                                    <input className="input" type="date" min={new Date().toISOString().split('T')[0]} value={form.appointmentDate} onChange={e => setForm(f => ({ ...f, appointmentDate: e.target.value, appointmentTime: '' }))} required />
                                </div>
                                <div className="form-group">
                                    <label className="label">Time Slot *</label>
                                    <select className="input" value={form.appointmentTime} onChange={e => setForm(f => ({ ...f, appointmentTime: e.target.value }))} required disabled={!slots.length}>
                                        <option value="">{slots.length ? 'Select slot...' : 'Pick doctor & date first'}</option>
                                        {slots.filter(s => s.available).map(s => <option key={s.time} value={s.time}>{s.time}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="label">Appointment Type</label>
                                <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                                    <option value="CONSULTATION">Consultation</option>
                                    <option value="FOLLOW_UP">Follow-up</option>
                                    <option value="EMERGENCY">Emergency</option>
                                    <option value="LAB_REVIEW">Lab Review</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="label">Chief Complaint</label>
                                <textarea className="input" placeholder="Describe the primary reason for visit..." value={form.chiefComplaint} onChange={e => setForm(f => ({ ...f, chiefComplaint: e.target.value }))} rows={3} style={{ resize: 'vertical' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? 'Booking...' : 'Book Appointment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
