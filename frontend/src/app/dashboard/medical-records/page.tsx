'use client';

import { useState, useEffect, useCallback } from 'react';
import { medicalRecordsApi, patientsApi, appointmentsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { FileText, Plus, Search, Download, Eye, FileDigit, Calendar, User, Clipboard, X, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface MedicalRecord {
    id: string;
    visit_date: string;
    diagnosis: string;
    chief_complaint: string;
    uhid: string;
    patient_name: string;
    doctor_name: string;
    specialization: string;
    is_confidential: boolean;
}

export default function MedicalRecordsPage() {
    const { user } = useAuth();
    const [records, setRecords] = useState<MedicalRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Create Record Form
    const [patients, setPatients] = useState<any[]>([]);
    const [appts, setAppts] = useState<any[]>([]);
    const [form, setForm] = useState({
        patientId: '',
        appointmentId: '',
        chiefComplaint: '',
        historyOfIllness: '',
        examinationNotes: '',
        diagnosis: '',
        treatmentPlan: '',
        prescription: [{ name: '', dosage: '', duration: '', instructions: '' }],
        followUpDate: '',
        isConfidential: false
    });

    const isDoctor = user?.role === 'DOCTOR';
    const isAdmin = user?.role === 'ADMIN';

    const fetchRecords = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await medicalRecordsApi.list({ page, limit: 12, search: search || undefined });
            setRecords(data.data);
            setPagination(data.pagination);
        } catch (err: any) {
            toast.error('Failed to load medical records');
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    useEffect(() => {
        if (showModal && isDoctor) {
            patientsApi.list({ limit: 100 }).then(res => setPatients(res.data.data));
            appointmentsApi.list({ status: 'IN_PROGRESS', limit: 50 }).then(res => setAppts(res.data.data));
        }
    }, [showModal, isDoctor]);

    const handleDownloadPrescription = async (id: string) => {
        try {
            toast.loading('Generating PDF...', { id: 'pdf' });
            const { data } = await medicalRecordsApi.downloadPrescription(id);
            const url = window.URL.createObjectURL(new Blob([data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `prescription-${id}.pdf`);
            document.body.appendChild(link);
            link.click();
            toast.success('Downloaded successfully', { id: 'pdf' });
        } catch {
            toast.error('Download failed', { id: 'pdf' });
        }
    };

    const addMedication = () => {
        setForm({
            ...form,
            prescription: [...form.prescription, { name: '', dosage: '', duration: '', instructions: '' }]
        });
    };

    const removeMedication = (index: number) => {
        const list = [...form.prescription];
        list.splice(index, 1);
        setForm({ ...form, prescription: list });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await medicalRecordsApi.create(form);
            toast.success('Clinical record created!');
            setShowModal(false);
            setForm({
                patientId: '', appointmentId: '', chiefComplaint: '', historyOfIllness: '',
                examinationNotes: '', diagnosis: '', treatmentPlan: '',
                prescription: [{ name: '', dosage: '', duration: '', instructions: '' }],
                followUpDate: '', isConfidential: false
            });
            fetchRecords();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to save record');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Medical Records</h1>
                    <p className="page-subtitle">Clinical history and diagnostic reports</p>
                </div>
                {isDoctor && (
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={16} /> New Clinical Entry
                    </button>
                )}
            </div>

            {/* Grid of records */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {loading ? (
                    [...Array(6)].map((_, i) => (
                        <div key={i} className="skeleton" style={{ height: '220px' }} />
                    ))
                ) : records.length === 0 ? (
                    <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem' }}>
                        <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                        <h3 style={{ color: 'var(--text-secondary)' }}>No records found</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Try adjusting your search or role-based filters</p>
                    </div>
                ) : records.map(record => (
                    <div key={record.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: record.is_confidential ? '4px solid var(--color-danger)' : '1px solid var(--border-default)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                    <Calendar size={13} /> {new Date(record.visit_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </div>
                                <div style={{ fontWeight: 700, fontSize: '1.125rem', marginTop: '0.25rem' }}>{record.patient_name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}>UHID: {record.uhid}</div>
                            </div>
                            {record.is_confidential && <span className="badge badge-danger">Confidential</span>}
                        </div>

                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Diagnosis:</div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineClamp: '2', display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {record.diagnosis}
                            </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Attending Doctor</div>
                                <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{record.doctor_name}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => handleDownloadPrescription(record.id)} title="Download Prescription">
                                    <Download size={14} />
                                </button>
                                <Link href={`/dashboard/medical-records/${record.id}`} className="btn btn-primary btn-sm">
                                    View Full
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                    <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                    <span style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Page {page} of {pagination.totalPages}</span>
                    <button className="btn btn-secondary btn-sm" disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
                </div>
            )}

            {/* New Record Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '800px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Create Clinical Record</h2>
                            <button onClick={() => setShowModal(false)} className="btn btn-ghost"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="label">Patient *</label>
                                    <select className="input" required value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value })}>
                                        <option value="">Select Patient</option>
                                        {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.uhid})</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="label">Appointment (Optional)</label>
                                    <select className="input" value={form.appointmentId} onChange={e => setForm({ ...form, appointmentId: e.target.value })}>
                                        <option value="">Select active session</option>
                                        {appts.map(a => <option key={a.id} value={a.id}>{a.appointment_time} - {a.patient_name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="label">Chief Complaint *</label>
                                <textarea className="input" rows={2} required value={form.chiefComplaint} onChange={e => setForm({ ...form, chiefComplaint: e.target.value })} placeholder="What is the patient's primary concern?" />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="label">Diagnosis *</label>
                                    <textarea className="input" rows={3} required value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} placeholder="Final diagnosis..." />
                                </div>
                                <div className="form-group">
                                    <label className="label">Treatment Plan</label>
                                    <textarea className="input" rows={3} value={form.treatmentPlan} onChange={e => setForm({ ...form, treatmentPlan: e.target.value })} placeholder="Steps to be taken..." />
                                </div>
                            </div>

                            {/* Prescription Section */}
                            <div style={{ marginBottom: '1.5rem', padding: '1.25rem', background: 'rgba(59,130,246,0.05)', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.2)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>℞ Prescription</h3>
                                    <button type="button" className="btn btn-primary btn-sm" onClick={addMedication}><Plus size={14} /> Add Medicine</button>
                                </div>
                                {form.prescription.map((med, idx) => (
                                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr auto', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'flex-start' }}>
                                        <input className="input" placeholder="Medicine Name" value={med.name} onChange={e => {
                                            const list = [...form.prescription];
                                            list[idx].name = e.target.value;
                                            setForm({ ...form, prescription: list });
                                        }} required />
                                        <input className="input" placeholder="Dosage (e.g. 1-0-1)" value={med.dosage} onChange={e => {
                                            const list = [...form.prescription];
                                            list[idx].dosage = e.target.value;
                                            setForm({ ...form, prescription: list });
                                        }} />
                                        <input className="input" placeholder="Duration (e.g. 5 days)" value={med.duration} onChange={e => {
                                            const list = [...form.prescription];
                                            list[idx].duration = e.target.value;
                                            setForm({ ...form, prescription: list });
                                        }} />
                                        <input className="input" placeholder="Instructions" value={med.instructions} onChange={e => {
                                            const list = [...form.prescription];
                                            list[idx].instructions = e.target.value;
                                            setForm({ ...form, prescription: list });
                                        }} />
                                        <button type="button" className="btn btn-danger btn-sm" onClick={() => removeMedication(idx)} disabled={form.prescription.length === 1}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="label">Follow-up Date</label>
                                    <input className="input" type="date" value={form.followUpDate} onChange={e => setForm({ ...form, followUpDate: e.target.value })} />
                                </div>
                                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.625rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', userSelect: 'none' }}>
                                        <input type="checkbox" checked={form.isConfidential} onChange={e => setForm({ ...form, isConfidential: e.target.checked })} style={{ width: '20px', height: '20px' }} />
                                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Mark as Confidential (Only visible to doctors)</span>
                                    </label>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? 'Saving Record...' : 'Finalize Record'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
