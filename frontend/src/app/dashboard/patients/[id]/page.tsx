'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { patientsApi, appointmentsApi, medicalRecordsApi, billingApi, labTestsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { User, Phone, Mail, MapPin, Calendar, Clock, CreditCard, FlaskConical, FileText, ArrowLeft, RefreshCw, Activity, Heart, Shield, Plus, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function PatientDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [patient, setPatient] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('summary');

    // Related data
    const [appointments, setAppointments] = useState<any[]>([]);
    const [records, setRecords] = useState<any[]>([]);
    const [bills, setBills] = useState<any[]>([]);
    const [labs, setLabs] = useState<any[]>([]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [pRes, aRes, rRes, bRes, lRes] = await Promise.all([
                    patientsApi.get(id as string),
                    appointmentsApi.list({ patientId: id, limit: 5 }),
                    medicalRecordsApi.list({ patientId: id, limit: 10 }),
                    billingApi.list({ patientId: id, limit: 5 }),
                    labTestsApi.list({ patientId: id, limit: 5 })
                ]);

                setPatient(pRes.data.data);
                setAppointments(aRes.data.data);
                setRecords(rRes.data.data);
                setBills(bRes.data.data);
                setLabs(lRes.data.data);
            } catch {
                toast.error('Failed to load patient profile');
                router.push('/dashboard/patients');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, router]);

    if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}><RefreshCw className="animate-spin" /></div>;
    if (!patient) return null;

    return (
        <div className="animate-fade-in">
            {/* Header & Bio */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <button onClick={() => router.back()} className="btn btn-ghost btn-sm" style={{ padding: '0.375rem' }}><ArrowLeft size={18} /></button>
                <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>
                    {patient.first_name[0]}{patient.last_name[0]}
                </div>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{patient.first_name} {patient.last_name}</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '0.25rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#a78bfa' }}>UHID: {patient.uhid}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            <Activity size={12} color="#f87171" /> Blood Group: {patient.blood_group || 'Not set'}
                        </span>
                        <span className={`badge ${patient.is_active ? 'badge-success' : 'badge-danger'}`}>{patient.is_active ? 'In-Care' : 'Inactive'}</span>
                    </div>
                </div>
                <div style={{ flex: 1 }} />
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-secondary btn-sm"><Edit size={14} /> Edit Profile</button>
                    <button className="btn btn-danger btn-sm"><Trash2 size={14} /></button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '2rem' }}>
                {/* Sidebar Info */}
                <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card">
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem' }}>Personal Info</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
                                <Calendar size={16} color="var(--text-muted)" />
                                <div>
                                    <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Date of Birth</div>
                                    <div style={{ fontWeight: 600 }}>{new Date(patient.date_of_birth).toLocaleDateString()}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
                                <User size={16} color="var(--text-muted)" />
                                <div>
                                    <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Gender</div>
                                    <div style={{ fontWeight: 600 }}>{patient.gender}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
                                <Phone size={16} color="var(--text-muted)" />
                                <div>
                                    <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Contact</div>
                                    <div style={{ fontWeight: 600 }}>{patient.phone}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
                                <Mail size={16} color="var(--text-muted)" />
                                <div>
                                    <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Email</div>
                                    <div style={{ fontWeight: 600, wordBreak: 'break-all' }}>{patient.email || 'None'}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.875rem' }}>
                                <MapPin size={16} color="var(--text-muted)" style={{ marginTop: '0.125rem' }} />
                                <div>
                                    <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Location</div>
                                    <div style={{ fontWeight: 600 }}>{patient.city}, {patient.state}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#ef4444' }}>
                            <Heart size={18} fill="#ef4444" />
                            <h3 style={{ fontSize: '0.875rem', fontWeight: 800, textTransform: 'uppercase' }}>Medical Alerts</h3>
                        </div>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>No severe allergies or alerts documented for this patient yet.</p>
                    </div>
                </aside>

                {/* Dynamic Content Area */}
                <section>
                    <div className="tabs">
                        <button className={`tab ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>Clinical Summary</button>
                        <button className={`tab ${activeTab === 'records' ? 'active' : ''}`} onClick={() => setActiveTab('records')}>Medical Records ({records.length})</button>
                        <button className={`tab ${activeTab === 'labs' ? 'active' : ''}`} onClick={() => setActiveTab('labs')}>Lab Reports</button>
                        <button className={`tab ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => setActiveTab('billing')}>Invoices</button>
                    </div>

                    {activeTab === 'summary' && (
                        <div className="animate-fade-in">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
                                <div className="card" style={{ padding: '1.25rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                        <h4 style={{ fontWeight: 700, fontSize: '0.875rem' }}>Latest Vitality</h4>
                                        <Activity size={16} color="#3b82f6" />
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', textAlign: 'center', padding: '1rem' }}>Vitals history not imported yet.</div>
                                </div>
                                <div className="card" style={{ padding: '1.25rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                        <h4 style={{ fontWeight: 700, fontSize: '0.875rem' }}>Last Consultation</h4>
                                        <Shield size={16} color="#8b5cf6" />
                                    </div>
                                    {records[0] ? (
                                        <>
                                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{records[0].diagnosis}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Dr. {records[0].doctor_name} · {new Date(records[0].visit_date).toLocaleDateString()}</div>
                                        </>
                                    ) : (
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', textAlign: 'center', padding: '1rem' }}>No visits recorded.</div>
                                    )}
                                </div>
                            </div>

                            <div className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                    <h3 style={{ fontWeight: 700 }}>Upcoming Sessions</h3>
                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-primary)' }} onClick={() => router.push('/dashboard/appointments')}>View Schedule</button>
                                </div>
                                {appointments.filter(a => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No pending appointments for this patient.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {appointments.filter(a => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').map(a => (
                                            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                                                <Clock size={16} color="#3b82f6" />
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{a.doctor_name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.type} consult</div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{new Date(a.appointment_date).toLocaleDateString()}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{a.appointment_time.substring(0, 5)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'records' && (
                        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {records.map(r => (
                                <div key={r.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', gap: '1.25rem' }}>
                                        <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', height: 'fit-content' }}><FileText size={20} color="var(--text-muted)" /></div>
                                        <div>
                                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>{new Date(r.visit_date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</div>
                                            <h4 style={{ fontSize: '1.125rem', fontWeight: 800, margin: '0.25rem 0' }}>{r.diagnosis}</h4>
                                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: '500px' }}>{r.chief_complaint}</p>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '0.75rem', color: 'var(--text-secondary)' }}>Consulting: Dr. {r.doctor_name}</div>
                                        </div>
                                    </div>
                                    <button className="btn btn-secondary btn-sm" onClick={() => medicalRecordsApi.downloadPrescription(r.id).then(res => {
                                        const url = URL.createObjectURL(new Blob([res.data]));
                                        const a = document.createElement('a'); a.href = url; a.download = `Prescription-${r.uhid}.pdf`; a.click();
                                    })}>Prescription PDF</button>
                                </div>
                            ))}
                            {records.length === 0 && <p style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>No medical history available.</p>}
                        </div>
                    )}

                    {activeTab === 'labs' && (
                        <div className="animate-fade-in table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Test Name</th>
                                        <th>Status</th>
                                        <th>Doctor</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {labs.map(l => (
                                        <tr key={l.id}>
                                            <td>{new Date(l.ordered_date).toLocaleDateString()}</td>
                                            <td><div style={{ fontWeight: 600 }}>{l.test_name}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{l.category}</div></td>
                                            <td><span className={`badge ${l.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>{l.status}</span></td>
                                            <td>Dr. {l.doctor_name}</td>
                                            <td>{l.report_url ? <button className="btn btn-ghost btn-sm" onClick={() => window.open(`http://localhost:5000/${l.report_url}`)}><FileText size={16} /></button> : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {labs.length === 0 && <p style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>No lab test history found.</p>}
                        </div>
                    )}

                    {activeTab === 'billing' && (
                        <div className="animate-fade-in table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Invoice #</th>
                                        <th>Date</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bills.map(b => (
                                        <tr key={b.id}>
                                            <td><code>{b.invoice_number}</code></td>
                                            <td>{new Date(b.created_at).toLocaleDateString()}</td>
                                            <td style={{ fontWeight: 700 }}>₹{parseFloat(b.total_amount).toLocaleString()}</td>
                                            <td><span className={`badge ${b.payment_status === 'PAID' ? 'badge-success' : 'badge-danger'}`}>{b.payment_status}</span></td>
                                            <td><button className="btn btn-ghost btn-sm" onClick={() => billingApi.downloadPdf(b.id).then(res => {
                                                const url = URL.createObjectURL(new Blob([res.data]));
                                                const a = document.createElement('a'); a.href = url; a.download = `Invoice-${b.invoice_number}.pdf`; a.click();
                                            })}><Download size={14} /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {bills.length === 0 && <p style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>No financial records found.</p>}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
