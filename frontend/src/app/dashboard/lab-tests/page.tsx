'use client';

import { useState, useEffect, useCallback } from 'react';
import { labTestsApi, patientsApi, doctorsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { FlaskConical, Plus, Search, Eye, Filter, Upload, CheckCircle, Clock, FileText, AlertTriangle, X, MoreVertical } from 'lucide-react';

interface LabTest {
    id: string;
    test_name: string;
    category: string;
    status: 'ORDERED' | 'SAMPLE_COLLECTED' | 'PROCESSING' | 'COMPLETED';
    patient_name: string;
    doctor_name: string;
    ordered_date: string;
    result_date?: string;
    report_url?: string;
    reviewer_notes?: string;
}

const STATUS_CONFIG: Record<string, { label: string, color: string, badge: string }> = {
    ORDERED: { label: 'Ordered', color: '#3b82f6', badge: 'badge-info' },
    SAMPLE_COLLECTED: { label: 'Sample Taken', color: '#8b5cf6', badge: 'badge-purple' },
    PROCESSING: { label: 'Processing', color: '#f59e0b', badge: 'badge-warning' },
    COMPLETED: { label: 'Completed', color: '#22c55e', badge: 'badge-success' },
};

export default function LabTestsPage() {
    const { user } = useAuth();
    const [tests, setTests] = useState<LabTest[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
    const [statusFilter, setStatusFilter] = useState('');
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [activeTestId, setActiveTestId] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchTests = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = { page, limit: 12 };
            if (statusFilter) params.status = statusFilter;
            const { data } = await labTestsApi.list(params);
            setTests(data.data);
            setPagination(data.pagination);
        } catch {
            toast.error('Failed to load lab tests');
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter]);

    useEffect(() => {
        fetchTests();
    }, [fetchTests]);

    const updateStatus = async (id: string, currentStatus: string) => {
        const nextStatusMap: Record<string, string> = {
            ORDERED: 'SAMPLE_COLLECTED',
            SAMPLE_COLLECTED: 'PROCESSING',
            PROCESSING: 'COMPLETED'
        };
        const nextStatus = nextStatusMap[currentStatus];
        if (!nextStatus) return;

        try {
            if (nextStatus === 'COMPLETED' && user?.role !== 'LAB_ASSISTANT' && user?.role !== 'ADMIN') {
                toast.error('Only lab staff can complete tests');
                return;
            }
            await labTestsApi.updateStatus(id, nextStatus);
            toast.success(`Moved to ${STATUS_CONFIG[nextStatus].label}`);
            fetchTests();
        } catch {
            toast.error('Failed to update status');
        }
    };

    const handleFileUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !activeTestId) return;

        setSubmitting(true);
        const formData = new FormData();
        formData.append('report', file);

        try {
            await labTestsApi.uploadResult(activeTestId, formData);
            toast.success('Report uploaded and test completed!');
            setShowUploadModal(false);
            setFile(null);
            fetchTests();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Upload failed');
        } finally {
            setSubmitting(false);
        }
    };

    const viewReport = (url: string) => {
        if (!url) return;
        window.open(`http://localhost:5000/${url}`, '_blank');
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Laboratory Management</h1>
                    <p className="page-subtitle">Diagnostic tests, specimen tracking, and reports</p>
                </div>
                {(user?.role === 'DOCTOR' || user?.role === 'ADMIN') && (
                    <button className="btn btn-primary" onClick={() => setShowOrderModal(true)}>
                        <Plus size={16} /> New Test Request
                    </button>
                )}
            </div>

            {/* Filters & Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <div key={key} className="card" style={{ padding: '1rem', borderTop: `4px solid ${config.color}`, cursor: 'pointer', background: statusFilter === key ? 'rgba(59,130,246,0.1)' : 'var(--bg-card)' }} onClick={() => setStatusFilter(statusFilter === key ? '' : key)}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>{config.label}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{tests.filter(t => t.status === key).length}</span>
                            {statusFilter === key ? <CheckCircle size={16} color={config.color} /> : <div style={{ width: '16px' }} />}
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Table View */}
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Test ID</th>
                            <th>Patient</th>
                            <th>Test Name / Category</th>
                            <th>Requested By</th>
                            <th>Status</th>
                            <th>Timeline</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            [...Array(6)].map((_, i) => (
                                <tr key={i}>{[...Array(7)].map((_, j) => <td key={j}><div className="skeleton" style={{ height: '16px' }} /></td>)}</tr>
                            ))
                        ) : tests.length === 0 ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                                <FlaskConical size={48} style={{ margin: '0 auto 1rem', opacity: 0.1 }} />
                                No lab tests found
                            </td></tr>
                        ) : tests.map(test => (
                            <tr key={test.id}>
                                <td><code style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '2px 4px', borderRadius: '4px' }}>#{test.id.substring(0, 8)}</code></td>
                                <td>
                                    <div style={{ fontWeight: 600 }}>{test.patient_name}</div>
                                </td>
                                <td>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{test.test_name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{test.category}</div>
                                </td>
                                <td><div style={{ fontSize: '0.8125rem' }}>Dr. {test.doctor_name}</div></td>
                                <td>
                                    <span className={`badge ${STATUS_CONFIG[test.status].badge}`} style={{ display: 'flex', gap: '4px', width: 'fit-content' }}>
                                        {test.status === 'PROCESSING' && <Clock size={12} className="animate-pulse" />}
                                        {test.status}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        Ordered: {new Date(test.ordered_date).toLocaleDateString()}
                                        {test.result_date && <div>Result: {new Date(test.result_date).toLocaleDateString()}</div>}
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {test.status !== 'COMPLETED' && (user?.role === 'LAB_ASSISTANT' || user?.role === 'ADMIN') && (
                                            <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(test.id, test.status)}>
                                                Next Step
                                            </button>
                                        )}
                                        {test.status === 'PROCESSING' && (user?.role === 'LAB_ASSISTANT' || user?.role === 'ADMIN') && (
                                            <button className="btn btn-primary btn-sm" title="Upload Final Report" onClick={() => { setActiveTestId(test.id); setShowUploadModal(true); }}>
                                                <Upload size={14} />
                                            </button>
                                        )}
                                        {test.status === 'COMPLETED' && test.report_url && (
                                            <button className="btn btn-ghost btn-sm" style={{ color: '#60a5fa' }} onClick={() => viewReport(test.report_url!)}>
                                                <FileText size={16} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '400px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Upload Lab Report</h2>
                            <button onClick={() => setShowUploadModal(false)} className="btn btn-ghost"><X size={20} /></button>
                        </div>

                        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                            <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
                            <p style={{ fontSize: '0.75rem', color: '#fbbf24' }}>Reports must be in PDF format. Uploading will mark the test as COMPLETED and alert the doctor.</p>
                        </div>

                        <form onSubmit={handleFileUpload}>
                            <div style={{ border: '2px dashed var(--border-default)', borderRadius: '12px', padding: '2rem', textAlign: 'center', marginBottom: '1.5rem', transition: 'all 0.2s', background: file ? 'rgba(59,130,246,0.05)' : 'transparent' }}>
                                <Upload size={32} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                                <input type="file" accept=".pdf" onChange={e => setFile(e.target.files?.[0] || null)} style={{ fontSize: '0.8125rem', width: '100%' }} required />
                                {file && <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#60a5fa', fontWeight: 600 }}>{file.name}</div>}
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowUploadModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting || !file}>
                                    {submitting ? 'Uploading...' : 'Confirm Upload'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
