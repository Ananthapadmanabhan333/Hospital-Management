'use client';

import { useState, useEffect, useCallback } from 'react';
import { auditApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { ClipboardList, Search, Filter, Shield, User, Globe, Clock, AlertTriangle, CheckCircle, Info, Database, Eye } from 'lucide-react';

interface AuditLog {
    id: string;
    action: string;
    table_name: string;
    record_id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    role: string;
    ip_address: string;
    user_agent: string;
    status: 'SUCCESS' | 'FAILURE';
    details: any;
    created_at: string;
}

export default function AuditLogsPage() {
    const { user: currentUser } = useAuth();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
    const [actionFilter, setActionFilter] = useState('');
    const [tableFilter, setTableFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');

    const fetchLogs = useCallback(async () => {
        if (currentUser?.role !== 'ADMIN') return;
        setLoading(true);
        try {
            const params: any = { page, limit: 15 };
            if (actionFilter) params.action = actionFilter;
            if (tableFilter) params.table = tableFilter;
            if (statusFilter) params.status = statusFilter;
            if (search) params.search = search;
            const { data } = await auditApi.list(params);
            setLogs(data.data);
            setPagination(data.pagination);
        } catch {
            toast.error('Failed to load activity logs');
        } finally {
            setLoading(false);
        }
    }, [page, actionFilter, tableFilter, statusFilter, search, currentUser]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    if (currentUser?.role !== 'ADMIN') {
        return <div style={{ textAlign: 'center', padding: '10rem' }}><h1 style={{ color: '#ef4444' }}>Access Restricted</h1></div>;
    }

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Activity & Audit Logs</h1>
                    <p className="page-subtitle">Full system audit trail for security compliance</p>
                </div>
                <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Shield size={16} color="#3b82f6" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#60a5fa' }}>GDPR & HIPAA Compliant Logs</span>
                </div>
            </div>

            {/* Advanced Filters */}
            <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'center' }}>
                <div className="search-bar" style={{ minWidth: '240px' }}>
                    <Search size={16} style={{ color: 'var(--text-muted)' }} />
                    <input placeholder="Search by name or ID..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <select className="input" value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}>
                    <option value="">All Actions</option>
                    <option value="LOGIN">Login</option>
                    <option value="LOGOUT">Logout</option>
                    <option value="PATIENT_CREATE">Patient Create</option>
                    <option value="BILL_CREATE">Invoice Create</option>
                    <option value="TRANS_CREATE">Transaction</option>
                    <option value="CLINICAL_UPDATE">Clinical Update</option>
                </select>
                <select className="input" value={tableFilter} onChange={e => { setTableFilter(e.target.value); setPage(1); }}>
                    <option value="">All Tables</option>
                    <option value="users">Users</option>
                    <option value="patients">Patients</option>
                    <option value="appointments">Appointments</option>
                    <option value="billing">Billing</option>
                    <option value="audit_logs">Audit Logs</option>
                </select>
                <select className="input" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                    <option value="">All Status</option>
                    <option value="SUCCESS">Success Only</option>
                    <option value="FAILURE">Failure Only</option>
                </select>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>User / Role</th>
                            <th>Action</th>
                            <th>Resource</th>
                            <th>Status</th>
                            <th>Origin</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            [...Array(10)].map((_, i) => <tr key={i}>{[...Array(7)].map((_, j) => <td key={j}><div className="skeleton" style={{ height: '14px' }} /></td>)}</tr>)
                        ) : logs.length === 0 ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}><Info size={48} style={{ margin: '0 auto 1rem', opacity: 0.1 }} /><p>No logs found for current filters</p></td></tr>
                        ) : logs.map(log => (
                            <tr key={log.id}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                                        <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                                        {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '1.25rem' }}>{new Date(log.created_at).toLocaleDateString()}</div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}><User size={14} /></div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{log.first_name || 'System'}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#60a5fa', fontWeight: 600 }}>{log.role}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-primary)' }}>{log.action}</span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        <Database size={11} />
                                        <span>{log.table_name}</span>
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: '#64748b' }}>#{log.record_id?.substring(0, 12)}...</div>
                                </td>
                                <td>
                                    <span className={`badge ${log.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`} style={{ gap: '4px' }}>
                                        {log.status === 'SUCCESS' ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
                                        {log.status}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{log.ip_address}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.user_agent}>{log.user_agent}</div>
                                </td>
                                <td>
                                    <button className="btn btn-ghost btn-sm"><Eye size={14} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {pagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                    <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', paddingTop: '0.375rem' }}>Page {page} of {pagination.totalPages}</span>
                    <button className="btn btn-secondary btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Next</button>
                </div>
            )}
        </div>
    );
}
