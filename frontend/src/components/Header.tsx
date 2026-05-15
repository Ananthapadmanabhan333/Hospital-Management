'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Bell, Search, Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';

const PAGE_TITLES: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/dashboard/patients': 'Patient Management',
    '/dashboard/doctors': 'Doctors',
    '/dashboard/appointments': 'Appointments',
    '/dashboard/medical-records': 'Medical Records',
    '/dashboard/lab-tests': 'Lab Tests',
    '/dashboard/billing': 'Billing & Invoices',
    '/dashboard/users': 'User Management',
    '/dashboard/audit': 'Audit Logs',
    '/dashboard/analytics': 'Analytics',
    '/dashboard/notifications': 'Notifications',
};

export default function Header() {
    const { user } = useAuth();
    const pathname = usePathname();
    const title = PAGE_TITLES[pathname] || 'Hospital CMS';

    const now = new Date();
    const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

    return (
        <header className="header">
            <div>
                <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h1>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {greeting}, {user?.firstName}! &nbsp;·&nbsp; {now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button className="btn btn-ghost btn-sm" style={{ position: 'relative', padding: '0.5rem' }}>
                    <Bell size={18} />
                    <span style={{ position: 'absolute', top: '4px', right: '4px', width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', border: '2px solid var(--bg-surface)' }} />
                </button>
                <div style={{ width: '1px', height: '24px', background: 'var(--border-default)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.375rem 0.75rem', borderRadius: '10px', background: 'var(--bg-hover)' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.firstName} {user?.lastName}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{user?.role}</div>
                    </div>
                </div>
            </div>
        </header>
    );
}
