'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi, appointmentsApi, patientsApi } from '@/lib/api';
import { Users, Calendar, CreditCard, FlaskConical, TrendingUp, Activity, Clock, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ComponentType<any>;
    color: string;
    trend?: number;
}

function StatCard({ title, value, subtitle, icon: Icon, color, trend }: StatCardProps) {
    return (
        <div className="stat-card">
            <div className="stat-icon" style={{ background: `${color}20` }}>
                <Icon size={22} color={color} />
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{title}</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
                {subtitle && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{subtitle}</div>}
                {trend !== undefined && (
                    <div style={{ fontSize: '0.75rem', color: trend >= 0 ? '#4ade80' : '#f87171', marginTop: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <TrendingUp size={12} />
                        {Math.abs(trend)}% this month
                    </div>
                )}
            </div>
        </div>
    );
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
    const [apptTrend, setApptTrend] = useState<any[]>([]);
    const [topDoctors, setTopDoctors] = useState<any[]>([]);
    const [todayAppts, setTodayAppts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                if (user?.role === 'ADMIN') {
                    const [statsRes, revenueRes, apptRes, doctorsRes] = await Promise.all([
                        adminApi.overview(),
                        adminApi.revenueTrend(),
                        adminApi.appointmentsTrend(),
                        adminApi.topDoctors(),
                    ]);
                    setStats(statsRes.data.data);
                    setRevenueTrend(revenueRes.data.data.map((r: any) => ({
                        month: new Date(r.month).toLocaleDateString('en', { month: 'short' }),
                        revenue: parseFloat(r.revenue),
                        collected: parseFloat(r.collected),
                    })));
                    setApptTrend(apptRes.data.data.map((r: any) => ({
                        date: new Date(r.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
                        total: parseInt(r.total),
                        completed: parseInt(r.completed),
                    })));
                    setTopDoctors(doctorsRes.data.data);
                }
                // Today's appointments for all roles
                const today = new Date().toISOString().split('T')[0];
                const appts = await appointmentsApi.list({ date: today, limit: 10 });
                setTodayAppts(appts.data.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user]);

    if (loading) {
        return (
            <div>
                <div className="grid-cols-4" style={{ marginBottom: '1.5rem' }}>
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="skeleton" style={{ height: '100px' }} />
                    ))}
                </div>
            </div>
        );
    }

    const STATUS_COLORS: Record<string, string> = {
        SCHEDULED: '#3b82f6', CONFIRMED: '#22c55e', IN_PROGRESS: '#8b5cf6',
        COMPLETED: '#06b6d4', CANCELLED: '#ef4444', NO_SHOW: '#f59e0b',
    };

    return (
        <div className="animate-fade-in">
            {/* Admin stats */}
            {user?.role === 'ADMIN' && stats && (
                <div className="grid-cols-4" style={{ marginBottom: '1.5rem' }}>
                    <StatCard title="Total Patients" value={stats.patients?.total || 0} subtitle={`+${stats.patients?.new_this_month || 0} this month`} icon={Users} color="#3b82f6" />
                    <StatCard title="Today's Appointments" value={stats.appointments?.today || 0} subtitle={`${stats.appointments?.scheduled || 0} scheduled`} icon={Calendar} color="#22c55e" />
                    <StatCard title="Total Revenue" value={`₹${parseFloat(stats.billing?.total_revenue || 0).toLocaleString()}`} subtitle={`₹${parseFloat(stats.billing?.pending || 0).toLocaleString()} pending`} icon={CreditCard} color="#f59e0b" />
                    <StatCard title="Lab Tests" value={stats.labTests?.total || 0} subtitle={`${stats.labTests?.pending || 0} pending`} icon={FlaskConical} color="#8b5cf6" />
                </div>
            )}

            {/* Doctor stats */}
            {user?.role === 'DOCTOR' && (
                <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))', borderRadius: '20px', border: '1px solid rgba(59,130,246,0.3)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Activity size={28} color="white" />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)' }}>Dr. {user.firstName} {user.lastName}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{user.specialization} · {user.department}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Patient info */}
            {user?.role === 'PATIENT' && user.uhid && (
                <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.15))', borderRadius: '20px', border: '1px solid rgba(139,92,246,0.3)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={28} color="white" />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)' }}>{user.firstName} {user.lastName}</div>
                            <div style={{ color: '#a78bfa', fontWeight: 600 }}>UHID: {user.uhid}</div>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Revenue chart (Admin) */}
                {user?.role === 'ADMIN' && revenueTrend.length > 0 && (
                    <div className="card">
                        <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Revenue Trend (12 months)</div>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={revenueTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', fontSize: '12px' }} formatter={(v: any) => [`₹${parseFloat(v).toLocaleString()}`, '']} />
                                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total" />
                                <Bar dataKey="collected" fill="#22c55e" radius={[4, 4, 0, 0]} name="Collected" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Appointments trend chart (Admin) */}
                {user?.role === 'ADMIN' && apptTrend.length > 0 && (
                    <div className="card">
                        <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Appointments (30 days)</div>
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={apptTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', fontSize: '12px' }} />
                                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={false} name="Total" />
                                <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} dot={false} name="Completed" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Today's appointments */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Today's Appointments</div>
                        <span className="badge badge-info">{todayAppts.length}</span>
                    </div>
                    {todayAppts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            <Calendar size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                            <p>No appointments today</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                            {todayAppts.map(appt => (
                                <div key={appt.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${STATUS_COLORS[appt.status] || '#3b82f6'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Clock size={16} color={STATUS_COLORS[appt.status] || '#3b82f6'} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{appt.patient_name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{appt.appointment_time?.substring(0, 5)} · {appt.doctor_name}</div>
                                    </div>
                                    <span className={`badge badge-${appt.status === 'COMPLETED' ? 'success' : appt.status === 'CANCELLED' ? 'danger' : 'info'}`}>{appt.status}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Top doctors (Admin) / Quick actions */}
                {user?.role === 'ADMIN' && topDoctors.length > 0 ? (
                    <div className="card">
                        <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Top Doctors by Appointments</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                            {topDoctors.slice(0, 6).map((doc, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.75rem', background: 'var(--bg-surface)', borderRadius: '10px' }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: `${COLORS[idx % COLORS.length]}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: COLORS[idx % COLORS.length], flexShrink: 0 }}>
                                        {idx + 1}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.doctor_name}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{doc.specialization}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#60a5fa' }}>{doc.total_appointments}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>total</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="card">
                        <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Quick Actions</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            {[
                                { label: 'New Appointment', href: '/dashboard/appointments', color: '#3b82f6', icon: '📅' },
                                { label: 'Patient Records', href: '/dashboard/medical-records', color: '#22c55e', icon: '📋' },
                                { label: 'Lab Tests', href: '/dashboard/lab-tests', color: '#f59e0b', icon: '🧪' },
                                { label: 'Billing', href: '/dashboard/billing', color: '#8b5cf6', icon: '💳' },
                            ].map(action => (
                                <a key={action.href} href={action.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1.25rem', background: `${action.color}10`, border: `1px solid ${action.color}30`, borderRadius: '12px', textDecoration: 'none', transition: 'all 0.2s', textAlign: 'center' }}>
                                    <span style={{ fontSize: '1.5rem' }}>{action.icon}</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: action.color }}>{action.label}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
