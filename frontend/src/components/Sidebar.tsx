'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import {
    LayoutDashboard, Users, UserCog, Calendar, FileText, FlaskConical,
    CreditCard, Shield, Bell, Settings, LogOut, Hospital, ChevronRight,
    ClipboardList, BarChart3, Activity
} from 'lucide-react';

interface NavItem {
    href: string;
    label: string;
    icon: React.ComponentType<any>;
    roles: UserRole[];
    section?: string;
}

const NAV_ITEMS: NavItem[] = [
    // Core
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'DOCTOR', 'RECEPTIONIST', 'LAB_ASSISTANT', 'PATIENT'], section: 'CORE' },

    // Patient management
    { href: '/dashboard/patients', label: 'Patients', icon: Users, roles: ['ADMIN', 'DOCTOR', 'RECEPTIONIST'], section: 'CLINICAL' },
    { href: '/dashboard/doctors', label: 'Doctors', icon: UserCog, roles: ['ADMIN', 'RECEPTIONIST'], section: 'CLINICAL' },
    { href: '/dashboard/appointments', label: 'Appointments', icon: Calendar, roles: ['ADMIN', 'DOCTOR', 'RECEPTIONIST', 'PATIENT'], section: 'CLINICAL' },

    // Clinical
    { href: '/dashboard/medical-records', label: 'Medical Records', icon: FileText, roles: ['ADMIN', 'DOCTOR', 'PATIENT'], section: 'CLINICAL' },
    { href: '/dashboard/lab-tests', label: 'Lab Tests', icon: FlaskConical, roles: ['ADMIN', 'DOCTOR', 'LAB_ASSISTANT', 'PATIENT'], section: 'CLINICAL' },

    // Financial
    { href: '/dashboard/billing', label: 'Billing', icon: CreditCard, roles: ['ADMIN', 'RECEPTIONIST', 'PATIENT'], section: 'FINANCIAL' },

    // Admin
    { href: '/dashboard/users', label: 'User Management', icon: Shield, roles: ['ADMIN'], section: 'ADMIN' },
    { href: '/dashboard/audit', label: 'Audit Logs', icon: ClipboardList, roles: ['ADMIN'], section: 'ADMIN' },
    { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, roles: ['ADMIN'], section: 'ADMIN' },

    // Personal
    { href: '/dashboard/notifications', label: 'Notifications', icon: Bell, roles: ['ADMIN', 'DOCTOR', 'RECEPTIONIST', 'LAB_ASSISTANT', 'PATIENT'], section: 'PERSONAL' },
];

const ROLE_COLORS: Record<UserRole, string> = {
    ADMIN: '#ef4444',
    DOCTOR: '#3b82f6',
    RECEPTIONIST: '#22c55e',
    LAB_ASSISTANT: '#f59e0b',
    PATIENT: '#8b5cf6',
};

const ROLE_LABELS: Record<UserRole, string> = {
    ADMIN: 'Administrator',
    DOCTOR: 'Doctor',
    RECEPTIONIST: 'Receptionist',
    LAB_ASSISTANT: 'Lab Assistant',
    PATIENT: 'Patient',
};

export default function Sidebar() {
    const { user, logout } = useAuth();
    const pathname = usePathname();

    if (!user) return null;

    const allowed = NAV_ITEMS.filter(item => item.roles.includes(user.role));

    // Group by section
    const sections = ['CORE', 'CLINICAL', 'FINANCIAL', 'ADMIN', 'PERSONAL'];
    const sectionLabels: Record<string, string> = {
        CORE: '',
        CLINICAL: 'Clinical',
        FINANCIAL: 'Financial',
        ADMIN: 'Administration',
        PERSONAL: 'Personal',
    };

    const roleColor = ROLE_COLORS[user.role] || '#3b82f6';

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div className="sidebar-logo">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Hospital size={22} color="white" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '1.0625rem', color: 'var(--text-primary)' }}>Hospital CMS</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 500 }}>Clinical Management</div>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav className="sidebar-nav">
                {sections.map(section => {
                    const items = allowed.filter(i => i.section === section);
                    if (!items.length) return null;
                    return (
                        <div key={section}>
                            {sectionLabels[section] && (
                                <div className="sidebar-section-label">{sectionLabels[section]}</div>
                            )}
                            {items.map(item => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                                return (
                                    <Link key={item.href} href={item.href} className={`sidebar-link ${isActive ? 'active' : ''}`}>
                                        <Icon size={18} />
                                        <span style={{ flex: 1 }}>{item.label}</span>
                                        {isActive && <ChevronRight size={14} style={{ opacity: 0.6 }} />}
                                    </Link>
                                );
                            })}
                        </div>
                    );
                })}
            </nav>

            {/* User profile */}
            <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border-default)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '12px', background: 'var(--bg-hover)', marginBottom: '0.5rem' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${roleColor}20`, border: `2px solid ${roleColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, color: roleColor, fontSize: '0.875rem' }}>
                        {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.firstName} {user.lastName}</div>
                        <div style={{ fontSize: '0.7rem', color: roleColor, fontWeight: 600 }}>{ROLE_LABELS[user.role]}</div>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="sidebar-link"
                    style={{ color: '#ef4444', width: '100%' }}
                >
                    <LogOut size={16} />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
