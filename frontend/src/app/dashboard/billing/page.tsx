'use client';

import { useState, useEffect, useCallback } from 'react';
import { billingApi, patientsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { CreditCard, Download, Search, Plus, CheckCircle, Clock, AlertCircle, X, Receipt, FileText, IndianRupee } from 'lucide-react';

interface Invoice {
    id: string;
    invoice_number: string;
    total_amount: number;
    paid_amount: number;
    balance_due: number;
    payment_status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED';
    patient_name: string;
    uhid: string;
    created_at: string;
}

export default function BillingPage() {
    const { user } = useAuth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [submitting, setSubmitting] = useState(false);

    // New Invoice Form
    const [patients, setPatients] = useState<any[]>([]);
    const [newInvoice, setNewInvoice] = useState({
        patientId: '',
        items: [{ description: '', quantity: 1, unitPrice: 0 }]
    });

    const isReceptionist = user?.role === 'RECEPTIONIST' || user?.role === 'ADMIN';

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await billingApi.list({ page, limit: 12 });
            setInvoices(data.data);
            setPagination(data.pagination);
        } catch {
            toast.error('Failed to load invoices');
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    useEffect(() => {
        if (showInvoiceModal && isReceptionist) {
            patientsApi.list({ limit: 100 }).then(res => setPatients(res.data.data));
        }
    }, [showInvoiceModal, isReceptionist]);

    const handleCreateInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await billingApi.create(newInvoice);
            toast.success('Invoice generated!');
            setShowInvoiceModal(false);
            setNewInvoice({ patientId: '', items: [{ description: '', quantity: 1, unitPrice: 0 }] });
            fetchInvoices();
        } catch {
            toast.error('Failed to create invoice');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeInvoice) return;
        setSubmitting(true);
        try {
            await billingApi.recordPayment(activeInvoice.id, {
                amount: parseFloat(paymentAmount),
                method: paymentMethod
            });
            toast.success('Payment recorded!');
            setShowPaymentModal(false);
            setPaymentAmount('');
            fetchInvoices();
        } catch {
            toast.error('Payment entry failed');
        } finally {
            setSubmitting(false);
        }
    };

    const downloadPdf = async (id: string, invoiceNum: string) => {
        try {
            toast.loading('Preparing PDF...', { id: 'pdf' });
            const { data } = await billingApi.downloadPdf(id);
            const url = window.URL.createObjectURL(new Blob([data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `invoice-${invoiceNum}.pdf`;
            link.click();
            toast.success('Downloaded', { id: 'pdf' });
        } catch {
            toast.error('Failed to download', { id: 'pdf' });
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Billing & Revenue</h1>
                    <p className="page-subtitle">Invoice management and payment processing</p>
                </div>
                {isReceptionist && (
                    <button className="btn btn-primary" onClick={() => setShowInvoiceModal(true)}>
                        <Plus size={16} /> New Invoice
                    </button>
                )}
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Invoice #</th>
                            <th>Date</th>
                            <th>Patient</th>
                            <th>Total Amount</th>
                            <th>Paid</th>
                            <th>Balance</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            [...Array(6)].map((_, i) => (
                                <tr key={i}>{[...Array(8)].map((_, j) => <td key={j}><div className="skeleton" style={{ height: '16px' }} /></td>)}</tr>
                            ))
                        ) : invoices.length === 0 ? (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                                <Receipt size={48} style={{ margin: '0 auto 1rem', opacity: 0.1 }} />
                                No invoices found
                            </td></tr>
                        ) : invoices.map(inv => (
                            <tr key={inv.id}>
                                <td><code style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-primary)' }}>{inv.invoice_number}</code></td>
                                <td style={{ fontSize: '0.8125rem' }}>{new Date(inv.created_at).toLocaleDateString()}</td>
                                <td>
                                    <div style={{ fontWeight: 600 }}>{inv.patient_name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inv.uhid}</div>
                                </td>
                                <td style={{ fontWeight: 700 }}>₹{parseFloat(inv.total_amount as any).toLocaleString()}</td>
                                <td style={{ color: '#22c55e', fontWeight: 600 }}>₹{parseFloat(inv.paid_amount as any).toLocaleString()}</td>
                                <td style={{ color: '#ef4444', fontWeight: 600 }}>₹{parseFloat(inv.balance_due as any).toLocaleString()}</td>
                                <td>
                                    <span className={`badge ${inv.payment_status === 'PAID' ? 'badge-success' : inv.payment_status === 'PARTIAL' ? 'badge-warning' : 'badge-danger'}`}>
                                        {inv.payment_status}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => downloadPdf(inv.id, inv.invoice_number)} title="Download PDF">
                                            <FileText size={16} />
                                        </button>
                                        {isReceptionist && inv.payment_status !== 'PAID' && (
                                            <button className="btn btn-primary btn-sm" onClick={() => { setActiveInvoice(inv); setPaymentAmount(inv.balance_due.toString()); setShowPaymentModal(true); }}>
                                                <CreditCard size={14} /> Pay
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* New Invoice Modal */}
            {showInvoiceModal && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '600px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Create New Invoice</h2>
                            <button onClick={() => setShowInvoiceModal(false)} className="btn btn-ghost"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleCreateInvoice}>
                            <div className="form-group">
                                <label className="label">Patient *</label>
                                <select className="input" required value={newInvoice.patientId} onChange={e => setNewInvoice({ ...newInvoice, patientId: e.target.value })}>
                                    <option value="">Select recipient...</option>
                                    {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.uhid})</option>)}
                                </select>
                            </div>

                            <div style={{ margin: '1.5rem 0', padding: '1rem', border: '1px solid var(--border-default)', borderRadius: '12px' }}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Receipt size={16} /> Line Items
                                </h3>
                                {newInvoice.items.map((item, idx) => (
                                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 2fr auto', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                        <input className="input" placeholder="Consultation / Scan..." value={item.description} onChange={e => {
                                            const items = [...newInvoice.items];
                                            items[idx].description = e.target.value;
                                            setNewInvoice({ ...newInvoice, items });
                                        }} required />
                                        <input type="number" className="input" placeholder="Qty" min="1" value={item.quantity} onChange={e => {
                                            const items = [...newInvoice.items];
                                            items[idx].quantity = parseInt(e.target.value);
                                            setNewInvoice({ ...newInvoice, items });
                                        }} required />
                                        <input type="number" className="input" placeholder="Price" min="0" value={item.unitPrice} onChange={e => {
                                            const items = [...newInvoice.items];
                                            items[idx].unitPrice = parseFloat(e.target.value);
                                            setNewInvoice({ ...newInvoice, items });
                                        }} required />
                                        <button type="button" className="btn btn-ghost btn-danger btn-sm" onClick={() => {
                                            const items = [...newInvoice.items];
                                            items.splice(idx, 1);
                                            setNewInvoice({ ...newInvoice, items });
                                        }} disabled={newInvoice.items.length === 1}>×</button>
                                    </div>
                                ))}
                                <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--color-primary)' }} onClick={() => setNewInvoice({ ...newInvoice, items: [...newInvoice.items, { description: '', quantity: 1, unitPrice: 0 }] })}>
                                    + Add line item
                                </button>
                            </div>

                            <div style={{ textAlign: 'right', marginBottom: '1.5rem', paddingRight: '1rem' }}>
                                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Total Amount</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                    ₹{newInvoice.items.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0).toLocaleString()}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowInvoiceModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
                                    {submitting ? 'Generating...' : 'Finalize & Generate'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && activeInvoice && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '400px' }}>
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ width: '64px', height: '64px', background: 'rgba(34,197,94,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                                <IndianRupee size={32} color="#22c55e" />
                            </div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Record Payment</h2>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Invoice #{activeInvoice.invoice_number}</p>
                        </div>

                        <form onSubmit={handleRecordPayment}>
                            <div className="form-group">
                                <label className="label">Amount to Pay (Balance: ₹{activeInvoice.balance_due.toLocaleString()})</label>
                                <input type="number" className="input" step="0.01" max={activeInvoice.balance_due} required value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="label">Payment Method</label>
                                <select className="input" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                    <option value="CASH">Cash</option>
                                    <option value="CARD">Debit/Credit Card</option>
                                    <option value="UPI">UPI / Digital Transfer</option>
                                    <option value="INSURANCE">Insurance Claim</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowPaymentModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1, background: '#22c55e' }} disabled={submitting}>
                                    {submitting ? 'Processing...' : 'Confirm Receipt'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
