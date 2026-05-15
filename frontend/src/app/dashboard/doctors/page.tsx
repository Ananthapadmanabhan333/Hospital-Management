'use client';

import { useState, useEffect, useCallback } from 'react';
import { doctorsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { Search, UserCog, Mail, Phone, MapPin, Star, Calendar, Clock, Plus, Filter, Info, ChevronRight, GraduationCap } from 'lucide-react';
import Link from 'next/link';

interface Doctor {
    id: string;
    registration_number: string;
    specialization: string;
    department: string;
    qualification: string;
    experience_years: number;
    consultation_fee: number;
    is_available: boolean;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    avatar_url?: string;
}

export default function DoctorsPage() {
    const { user: currentUser } = useAuth();
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
    const [specialization, setSpecialization] = useState('');
    const [department, setDepartment] = useState('');

    const fetchDocs = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = { page, limit: 12 };
            if (specialization) params.specialization = specialization;
            if (department) params.department = department;
            const { data } = await doctorsApi.list(params);
            setDoctors(data.data);
            setPagination(data.pagination);
        } catch {
            toast.error('Failed to sync medical staff data');
        } finally {
            setLoading(false);
        }
    }, [page, specialization, department]);

    useEffect(() => {
        fetchDocs();
    }, [fetchDocs]);

    const isAdmin = currentUser?.role === 'ADMIN';

    return (
        <div className="animate-fade-in">
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 className="page-title">Medical Staff Directory</h1>
                    <p className="page-subtitle">Managing specialized practitioners and consulting doctors</p>
                </div>
                {isAdmin && (
                    <button className="btn btn-primary">
                        <Plus size={16} /> Onboard Practitioner
                    </button>
                )}
            </div>

            <div className="card" style={{ marginBottom: '2rem', display: 'flex', gap: '1.25rem', padding: '1.25rem' }}>
                <div className="search-bar" style={{ flex: 1 }}>
                    <Search size={16} color="var(--text-muted)" />
                    <input placeholder="Search by name or specialization..." value={specialization} onChange={e => { setSpecialization(e.target.value); setPage(1); }} />
                </div>
                <select className="input" style={{ width: '240px' }} value={department} onChange={e => { setDepartment(e.target.value); setPage(1); }}>
                    <option value="">All Departments</option>
                    <option value="CARDIOLOGY">Cardiology</option>
                    <option value="ORTHOPEDICS">Orthopedics</option>
                    <option value="PEDIATRICS">Pediatrics</option>
                    <option value="NEUROLOGY">Neurology</option>
                    <option value="DERMATOLOGY">Dermatology</option>
                    <option value="GYNECOLOGY">Gynecology</option>
                    <option value="GENERAL_PHYSICIAN">General Physician</option>
                </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
                {loading ? (
                    [...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: '260px' }} />)
                ) : doctors.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '5rem' }}>
                        <UserCog size={48} style={{ opacity: 0.1, margin: '0 auto 1.5rem' }} />
                        <p style={{ color: 'var(--text-muted)' }}>No medical practitioners matching these criteria.</p>
                    </div>
                ) : doctors.map(doc => (
                    <div key={doc.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'all 0.2s', borderTop: `4px solid ${doc.is_available ? '#22c55e' : '#64748b'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#3b82f6', fontSize: '1.25rem' }}>
                                    {doc.first_name[0]}{doc.last_name[0]}
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: 800 }}>Dr. {doc.first_name} {doc.last_name}</h3>
                                    <p style={{ fontSize: '0.8125rem', color: '#60a5fa', fontWeight: 700 }}>{doc.specialization} · {doc.department}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Star size={14} fill="#f59e0b" color="#f59e0b" />
                                <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>4.8</span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '0.75rem 0', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                <Clock size={13} /> {doc.experience_years}+ years exp.
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                <GraduationCap size={13} /> {doc.qualification}
                            </div>
                        </div>

                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: doc.is_available ? '#22c55e' : '#ef4444' }} />
                                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: doc.is_available ? '#22c55e' : '#f87171' }}>{doc.is_available ? 'Available' : 'Currently Away'}</span>
                            </div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Mail size={12} /> {doc.email}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                            <div style={{ fontSize: '1rem', fontWeight: 800 }}>₹{doc.consultation_fee} <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>per visit</span></div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <Link href={`/dashboard/appointments?doctorId=${doc.id}`} className="btn btn-primary btn-sm">Schedule Session</Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {pagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
                    <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', paddingTop: '0.375rem' }}>Page {page} of {pagination.totalPages}</span>
                    <button className="btn btn-secondary btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Next</button>
                </div>
            )}
        </div>
    );
}
