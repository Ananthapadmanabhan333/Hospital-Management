'use client';

import { useState, useEffect, useCallback } from 'react';
import { patientsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { Search, Plus, Download, Users, RefreshCw, Edit, Trash2, Eye, X } from 'lucide-react';
import Link from 'next/link';

interface Patient {
    id: string;
    uhid: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    blood_group?: string;
    phone: string;
    email?: string;
    city?: string;
    state?: string;
    is_active: boolean;
    created_at: string;
}

export default function PatientsPage() {
    const { user } = useAuth();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        firstName: '', lastName: '', dateOfBirth: '', gender: 'MALE', phone: '',
        email: '', bloodGroup: '', address: '', city: '', state: '', pincode: '',
        emergencyContactName: '', emergencyContactPhone: '',
    });

    const fetchPatients = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await patientsApi.list({ page, limit: 15, search: search || undefined });
            setPatients(data.data);
            setPagination(data.pagination);
        } catch (err: any) {
            toast.error('Failed to load patients');
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        fetchPatients();
    }, [fetchPatients]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setPage(1);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await patientsApi.create(form);
            toast.success('Patient registered successfully!');
            setShowModal(false);
            setForm({ firstName: '', lastName: '', dateOfBirth: '', gender: 'MALE', phone: '', email: '', bloodGroup: '', address: '', city: '', state: '', pincode: '', emergencyContactName: '', emergencyContactPhone: '' });
            fetchPatients();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to register patient');
        } finally {
            setSubmitting(false);
        }
    };

    const handleExport = async () => {
        try {
            const { data } = await patientsApi.exportCsv();
            const url = URL.createObjectURL(new Blob([data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `patients-${Date.now()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('CSV exported!');
        } catch {
            toast.error('Export failed');
        }
    };

    const canCreate = user?.role === 'ADMIN' || user?.role === 'RECEPTIONIST';

    const getAge = (dob: string) => {
        if (!dob) return 'N/A';
        return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) + ' yrs';
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Patients</h1>
                    <p className="page-subtitle">{pagination.total} total patients registered</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {canCreate && (
                        <button className="btn btn-secondary btn-sm" onClick={handleExport}>
                            <Download size={15} /> Export CSV
                        </button>
                    )}
                    {canCreate && (
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                            <Plus size={16} /> Register Patient
                        </button>
                    )}
                </div>
            </div>

            {/* Search */}
            <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
                <div className="search-bar" style={{ maxWidth: '400px' }}>
                    <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <input
                        placeholder="Search by name, UHID, or phone..."
                        value={search}
                        onChange={handleSearch}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>UHID</th>
                            <th>Name</th>
                            <th>Age / Gender</th>
                            <th>Blood Group</th>
                            <th>Phone</th>
                            <th>City</th>
                            <th>Status</th>
                            <th>Registered</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            [...Array(8)].map((_, i) => (
                                <tr key={i}>
                                    {[...Array(9)].map((_, j) => (
                                        <td key={j}><div className="skeleton" style={{ height: '16px', width: '80%' }} /></td>
                                    ))}
                                </tr>
                            ))
                        ) : patients.length === 0 ? (
                            <tr>
                                <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                    <Users size={32} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.3 }} />
                                    No patients found
                                </td>
                            </tr>
                        ) : patients.map(p => (
                            <tr key={p.id}>
                                <td><code style={{ color: '#60a5fa', fontSize: '0.8rem', background: 'rgba(59,130,246,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{p.uhid}</code></td>
                                <td>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.first_name} {p.last_name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.email || '—'}</div>
                                </td>
                                <td>
                                    <div>{getAge(p.date_of_birth)}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.gender}</div>
                                </td>
                                <td>
                                    {p.blood_group ? (
                                        <span className="badge badge-danger">{p.blood_group}</span>
                                    ) : '—'}
                                </td>
                                <td style={{ color: 'var(--text-secondary)' }}>{p.phone}</td>
                                <td style={{ color: 'var(--text-muted)' }}>{p.city || '—'}</td>
                                <td>
                                    <span className={`badge ${p.is_active ? 'badge-success' : 'badge-danger'}`}>
                                        {p.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                    {new Date(p.created_at).toLocaleDateString('en-IN')}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <Link href={`/dashboard/patients/${p.id}`} className="btn btn-ghost btn-sm" style={{ padding: '0.25rem 0.5rem' }}>
                                            <Eye size={14} />
                                        </Link>
                                    </div>
                                </td>
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

            {/* Create patient modal */}
            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: '700px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Register New Patient</h2>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)} style={{ padding: '0.375rem' }}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="label">First Name *</label>
                                    <input className="input" placeholder="John" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required />
                                </div>
                                <div className="form-group">
                                    <label className="label">Last Name *</label>
                                    <input className="input" placeholder="Doe" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="label">Date of Birth *</label>
                                    <input className="input" type="date" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} required />
                                </div>
                                <div className="form-group">
                                    <label className="label">Gender *</label>
                                    <select className="input" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                                        <option value="MALE">Male</option>
                                        <option value="FEMALE">Female</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="label">Phone *</label>
                                    <input className="input" placeholder="9876543210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required />
                                </div>
                                <div className="form-group">
                                    <label className="label">Blood Group</label>
                                    <select className="input" value={form.bloodGroup} onChange={e => setForm(f => ({ ...f, bloodGroup: e.target.value }))}>
                                        <option value="">Select...</option>
                                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="label">Email</label>
                                <input className="input" type="email" placeholder="patient@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="label">Address</label>
                                <input className="input" placeholder="123 Main Street" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="label">City</label>
                                    <input className="input" placeholder="Mumbai" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="label">State</label>
                                    <input className="input" placeholder="Maharashtra" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="label">Emergency Contact Name</label>
                                    <input className="input" placeholder="Jane Doe" value={form.emergencyContactName} onChange={e => setForm(f => ({ ...f, emergencyContactName: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="label">Emergency Contact Phone</label>
                                    <input className="input" placeholder="9876543210" value={form.emergencyContactPhone} onChange={e => setForm(f => ({ ...f, emergencyContactPhone: e.target.value }))} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? 'Registering...' : 'Register Patient'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
