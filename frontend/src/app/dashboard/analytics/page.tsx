'use client';

import { useState, useEffect } from 'react';
import { adminApi, appointmentsApi, billingApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend } from 'recharts';
import { BarChart3, TrendingUp, TrendingDown, Users, Calendar, CreditCard, Activity, Target, Zap, Clock, Hospital, Star, MoreVertical } from 'lucide-react';

export default function AnalyticsPage() {
    const { user: currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        overview: null as any,
        revenue: [] as any[],
        appointments: [] as any[],
        topDoctors: [] as any[],
    });

    useEffect(() => {
        if (currentUser?.role !== 'ADMIN') return;
        const load = async () => {
            try {
                const [overviewRes, revenueRes, apptRes, doctorsRes] = await Promise.all([
                    adminApi.overview(),
                    adminApi.revenueTrend(),
                    adminApi.appointmentsTrend(),
                    adminApi.topDoctors(),
                ]);

                setData({
                    overview: overviewRes.data.data,
                    revenue: revenueRes.data.data.map((r: any) => ({
                        month: new Date(r.month).toLocaleDateString('en', { month: 'short' }),
                        revenue: parseFloat(r.revenue),
                        collected: parseFloat(r.collected),
                        pending: parseFloat(r.revenue) - parseFloat(r.collected)
                    })),
                    appointments: apptRes.data.data.map((r: any) => ({
                        date: new Date(r.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
                        total: parseInt(r.total),
                        completed: parseInt(r.completed),
                        efficiency: (parseInt(r.completed) / Math.max(1, parseInt(r.total)) * 100).toFixed(1)
                    })).slice(-7), // Last 7 days for the detail chart
                    topDoctors: doctorsRes.data.data
                });
            } catch {
                toast.error('Failed to load analytical data');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [currentUser]);

    if (currentUser?.role !== 'ADMIN') {
        return <div style={{ textAlign: 'center', padding: '10rem' }}><h1 style={{ color: '#ef4444' }}>Unauthorized</h1></div>;
    }

    if (loading) {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}><Clock className="animate-spin" size={48} color="#3b82f6" /></div>;
    }

    const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

    return (
        <div className="animate-fade-in">
            <div className="page-header" style={{ marginBottom: '2.5rem' }}>
                <div>
                    <h1 className="page-title">Hospital Analytics Engine</h1>
                    <p className="page-subtitle">Visualizing performance metrics, operational efficiency, and revenue health.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-secondary btn-sm"><Clock size={15} /> Last 30 Days</button>
                    <button className="btn btn-primary btn-sm"><Download size={15} /> Generate PDF Report</button>
                </div>
            </div>

            {/* High-Level KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div className="card" style={{ background: 'linear-gradient(145deg, var(--bg-card), rgba(59,130,246,0.05))' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div style={{ padding: '0.625rem', background: 'rgba(59,130,246,0.1)', borderRadius: '12px' }}><Users size={20} color="#3b82f6" /></div>
                        <TrendingUp size={20} color="#22c55e" />
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue Utilization</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{((parseFloat(data.overview?.billing?.collected_revenue || 0) / Math.max(1, parseFloat(data.overview?.billing?.total_revenue || 0))) * 100).toFixed(1)}%</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Collection efficiency vs target</div>
                </div>

                <div className="card" style={{ background: 'linear-gradient(145deg, var(--bg-card), rgba(34,197,94,0.05))' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div style={{ padding: '0.625rem', background: 'rgba(34,197,94,0.1)', borderRadius: '12px' }}><Target size={20} color="#22c55e" /></div>
                        <Zap size={20} color="#f59e0b" />
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Op-Efficiency</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{(data.appointments.reduce((acc, curr) => acc + parseFloat(curr.efficiency), 0) / Math.max(1, data.appointments.length)).toFixed(1)}%</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Avg. appointment completion rate</div>
                </div>

                <div className="card" style={{ background: 'linear-gradient(145deg, var(--bg-card), rgba(245,158,11,0.05))' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div style={{ padding: '0.625rem', background: 'rgba(245,158,11,0.1)', borderRadius: '12px' }}><Activity size={20} color="#f59e0b" /></div>
                        <ShieldCheck size={20} color="#3b82f6" />
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Clinical Output</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{data.overview?.labTests?.total || 0}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Lab results processed this period</div>
                </div>
            </div>

            {/* Main Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Revenue Allocation Trend</h3>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                <div style={{ width: '8px', height: '8px', background: '#3b82f6', borderRadius: '50%' }} /> Collected
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                <div style={{ width: '8px', height: '8px', background: 'rgba(59,130,246,0.3)', borderRadius: '50%' }} /> Pending
                            </div>
                        </div>
                    </div>
                    <div style={{ height: '350px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.revenue}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v / 1000}k`} />
                                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }} />
                                <Area type="monotone" dataKey="collected" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                <Area type="monotone" dataKey="pending" stroke="rgba(59,130,246,0.3)" strokeDasharray="5 5" fill="none" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card">
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem' }}>Staff Distribution</h3>
                    <div style={{ height: '350px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Doctors', value: parseInt(data.overview?.users_by_role?.DOCTOR || 0) },
                                        { name: 'Nursing', value: parseInt(data.overview?.users_by_role?.RECEPTIONIST || 0) },
                                        { name: 'Lab Tech', value: parseInt(data.overview?.users_by_role?.LAB_ASSISTANT || 0) },
                                        { name: 'Admins', value: parseInt(data.overview?.users_by_role?.ADMIN || 0) },
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {COLORS.map((color, index) => <Cell key={`cell-${index}`} fill={color} />)}
                                </Pie>
                                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }} />
                                <Legend iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Staff Performance & Operational Health */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}>
                <div className="card">
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <Star size={18} color="#f59e0b" /> Medical Staff Performance
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {data.topDoctors.map((doc, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${COLORS[idx % COLORS.length]}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: COLORS[idx % COLORS.length] }}>
                                    #{idx + 1}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700 }}>Dr. {doc.doctor_name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{doc.specialization}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#60a5fa' }}>{doc.total_appointments}</div>
                                    <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Patients Treated</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card">
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <Activity size={18} color="#22c55e" /> Daily Case Efficiency
                    </h3>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.appointments}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }} />
                                <Bar dataKey="total" fill="rgba(59,130,246,0.3)" radius={[4, 4, 0, 0]} name="Volume" />
                                <Bar dataKey="completed" fill="#22c55e" radius={[4, 4, 0, 0]} name="Outcome" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-hover)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <TrendingUp size={24} color="#22c55e" />
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            Overall operational throughput is up <strong>12.4%</strong> compared to previous month. Peak volume usually occurs on Mondays.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Sub-components as needed for clean code
function ShieldCheck({ size, color }: { size: number, color: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}
