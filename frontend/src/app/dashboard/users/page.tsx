'use client';

import { useState, useEffect, useCallback } from 'react';
import { usersApi } from '@/lib/api';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { Shield, Plus, Search, User, Mail, Phone, ShieldAlert, ShieldCheck, Clock, Lock, UserMinus, UserPlus, X } from 'lucide-react';

interface SystemUser {
    id: string;
    email: string;
    role: UserRole;
    first_name: string;
    last_name: string;
    phone?: string;
    is_active: boolean;
    last_login_at?: string;
    created_at: string;
}

const ROLE_CONFIG: Record<UserRole, { label: string, color: string, icon: any }> = {
    ADMIN: { label: 'Administrator', color: '#ef4444', icon: ShieldAlert },
    DOCTOR: { label: 'Medical Doctor', color: '#3b82f6', icon: User },
    RECEPTIONIST: { label: 'Front Desk', color: '#22c55e', icon: Phone },
    LAB_ASSISTANT: { label: 'Lab Tech', color: '#f59e0b', icon: Clock },
    PATIENT: { label: 'Patient', color: '#8b5cf6', icon: User },
};

export default function UsersPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<SystemUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
    const [roleFilter, setRoleFilter] = useState('');
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        email: '',
        password: '',
        role: 'DOCTOR' as UserRole,
        firstName: '',
        lastName: '',
        phone: '',
    });

    const fetchUsers = useCallback(async () => {
        if (currentUser?.role !== 'ADMIN') return;
        setLoading(true);
        try {
            const params: any = { page, limit: 12 };
            if (roleFilter) params.role = roleFilter;
            if (search) params.search = search;
            const { data } = await usersApi.list(params);
            setUsers(data.data);
            setPagination(data.pagination);
        } catch {
            toast.error('Access denied or system error');
        } finally {
            setLoading(false);
        }
    }, [page, roleFilter, search, currentUser]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const toggleStatus = async (id: string, currentlyActive: boolean) => {
        try {
            await usersApi.toggleActive(id);
            toast.success(`User ${currentlyActive ? 'deactivated' : 'activated'} successfully`);
            fetchUsers();
        } catch {
            toast.error('Failed to update status');
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await usersApi.create(form);
            toast.success('System user created!');
            setShowAddModal(false);
            setForm({ email: '', password: '', role: 'DOCTOR', firstName: '', lastName: '', phone: '' });
            fetchUsers();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Creation failed');
        } finally {
            setSubmitting(false);
        }
    };

    if (currentUser?.role !== 'ADMIN') {
        return <div style={{ textAlign: 'center', padding: '10rem' }}><h1 style={{ color: '#ef4444' }}>Unauthorized Access</h1></div>;
    }

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">User Management</h1>
                    <p className="page-subtitle">Configure system users, roles, and security</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                    <Plus size={16} /> Add System User
                </button>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="search-bar" style={{ flex: 1, minWidth: '300px' }}>
                    <Search size={16} style={{ color: 'var(--text-muted)' }} />
                    <input placeholder="Search users by name or email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <select className="input" style={{ width: '200px' }} value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
                    <option value="">All Roles</option>
                    {Object.keys(ROLE_CONFIG).map(role => (
                        <option key={role} value={role}>{ROLE_CONFIG[role as UserRole].label}</option>
                    ))}
                </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {loading ? (
                    [...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: '180px' }} />)
                ) : users.length === 0 ? (
                    <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem' }}>
                        <User size={48} style={{ margin: '0 auto 1rem', opacity: 0.1 }} />
                        <p style={{ color: 'var(--text-muted)' }}>No matching users found</p>
                    </div>
                ) : users.map(u => {
                    const Config = ROLE_CONFIG[u.role] || ROLE_CONFIG.PATIENT;
                    const Icon = Config.icon;
                    return (
                        <div key={u.id} className="card" style={{ transition: 'all 0.2s', borderLeft: `4px solid ${Config.color}`, opacity: u.is_active ? 1 : 0.6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <div style={{ padding: '0.5rem', background: `${Config.color}15`, borderRadius: '10px' }}>
                                    <Icon size={20} color={Config.color} />
                                </div>
                                {u.id === currentUser?.id ? (
                                    <span className="badge badge-info">Current Account</span>
                                ) : (
                                    <button className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleStatus(u.id, u.is_active)} title={u.is_active ? 'Deactivate' : 'Activate'}>
                                        {u.is_active ? <UserMinus size={14} /> : <UserPlus size={14} />}
                                    </button>
                                )}
                            </div>

                            <div>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.first_name} {u.last_name}</h3>
                                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: Config.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>{Config.label}</p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                        <Mail size={12} /> {u.email}
                                    </div>
                                    {u.phone && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                            <Phone size={12} /> {u.phone}
                                        </div>
                                    )}
                                    {u.last_login_at && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                            <Clock size={12} /> Last active: {new Date(u.last_login_at).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '450px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Add System User</h2>
                            <button onClick={() => setShowAddModal(false)} className="btn btn-ghost"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleAddUser}>
                            <div className="form-group">
                                <label className="label">System Role *</label>
                                <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value as UserRole })} required>
                                    {Object.keys(ROLE_CONFIG).map(r => <option key={r} value={r}>{ROLE_CONFIG[r as UserRole].label}</option>)}
                                </select>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="label">First Name *</label>
                                    <input className="input" required value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="label">Last Name *</label>
                                    <input className="input" required value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="label">Email Address *</label>
                                <input className="input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="username@hospitalcms.com" />
                            </div>

                            <div className="form-group">
                                <label className="label">Initial Password *</label>
                                <input className="input" type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Choose a secure pass (min 8 chars)" />
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>User will be prompted to change on first login.</p>
                            </div>

                            <div className="form-group">
                                <label className="label">Phone Number</label>
                                <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
                                    {submitting ? 'Creating...' : 'Grant Access'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
