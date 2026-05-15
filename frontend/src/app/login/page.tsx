'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Hospital, Lock, Mail, AlertCircle } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            toast.success('Welcome back!');
            router.push('/dashboard');
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Login failed. Please try again.';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const demoAccounts = [
        { role: 'ADMIN', email: 'admin@hospitalcms.com', password: 'Admin@Hospital2024!', color: '#ef4444' },
        { role: 'DOCTOR', email: 'doctor@hospitalcms.com', password: 'Doctor@Hospital2024!', color: '#3b82f6' },
        { role: 'RECEPTIONIST', email: 'receptionist@hospitalcms.com', password: 'Recep@Hospital2024!', color: '#22c55e' },
        { role: 'LAB', email: 'lab@hospitalcms.com', password: 'Lab@Hospital2024!', color: '#f59e0b' },
        { role: 'PATIENT', email: 'patient@hospitalcms.com', password: 'Patient@Hospital2024!', color: '#8b5cf6' },
    ];

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', position: 'relative', overflow: 'hidden' }}>
            {/* Background gradient orbs */}
            <div style={{ position: 'absolute', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)', top: '-100px', left: '-100px', borderRadius: '50%', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', bottom: '-50px', right: '-50px', borderRadius: '50%', pointerEvents: 'none' }} />

            <div style={{ width: '100%', maxWidth: '480px', position: 'relative', zIndex: 1 }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ width: '72px', height: '72px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', boxShadow: '0 20px 40px rgba(59,130,246,0.3)' }}>
                        <Hospital size={36} color="white" />
                    </div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                        Hospital CMS
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Clinical Management System</p>
                </div>

                {/* Login form */}
                <div className="card" style={{ padding: '2rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Sign in to your account</h2>

                    {error && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', marginBottom: '1.25rem', color: '#f87171', fontSize: '0.875rem' }}>
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="label" htmlFor="email">Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    id="email"
                                    type="email"
                                    className="input"
                                    style={{ paddingLeft: '2.25rem' }}
                                    placeholder="doctor@hospitalcms.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="label" htmlFor="password">Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="input"
                                    style={{ paddingLeft: '2.25rem', paddingRight: '2.75rem' }}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.9375rem', fontWeight: 600, marginTop: '0.5rem', background: loading ? '#64748b' : 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
                        >
                            {loading ? (
                                <><div style={{ width: '18px', height: '18px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Signing in...</>
                            ) : 'Sign In'}
                        </button>
                    </form>
                </div>

                {/* Demo accounts */}
                <div className="card" style={{ marginTop: '1.25rem', padding: '1.25rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Demo Accounts (click to fill)</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {demoAccounts.map(acc => (
                            <button
                                key={acc.role}
                                className="btn btn-sm"
                                onClick={() => { setEmail(acc.email); setPassword(acc.password); }}
                                style={{ background: `rgba(${acc.color === '#ef4444' ? '239,68,68' : acc.color === '#3b82f6' ? '59,130,246' : acc.color === '#22c55e' ? '34,197,94' : acc.color === '#f59e0b' ? '245,158,11' : '139,92,246'},0.1)`, color: acc.color, border: `1px solid ${acc.color}40` }}
                            >
                                {acc.role}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
