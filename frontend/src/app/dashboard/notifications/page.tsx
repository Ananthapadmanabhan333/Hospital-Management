'use client';

import { useState, useEffect, useCallback } from 'react';
import { notificationsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Bell, Check, CheckCircle2, Clock, Trash2, Shield, Info, Calendar, CreditCard, FlaskConical, AlertTriangle, RefreshCw } from 'lucide-react';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

const TYPE_ICONS: Record<string, any> = {
    APPOINTMENT: { icon: Calendar, color: '#3b82f6' },
    BILLING: { icon: CreditCard, color: '#22c55e' },
    LAB: { icon: FlaskConical, color: '#f59e0b' },
    SYSTEM: { icon: Shield, color: '#f87171' },
    MEDICAL: { icon: Info, color: '#8b5cf6' },
};

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotes = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await notificationsApi.list();
            setNotifications(data.data);
        } catch {
            toast.error('Failed to sync notifications');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    const markRead = async (id: string) => {
        try {
            await notificationsApi.markRead(id);
            setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch {
            toast.error('Action failed');
        }
    };

    const markAllRead = async () => {
        try {
            await notificationsApi.markAllRead();
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
            toast.success('All marked as read');
        } catch {
            toast.error('Batch action failed');
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 className="page-title">Personal Notifications</h1>
                    <p className="page-subtitle">Personalized system alerts and clinical updates.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-secondary btn-sm" onClick={fetchNotes}><RefreshCw size={14} /> Sync</button>
                    <button className="btn btn-primary btn-sm" onClick={markAllRead} disabled={!notifications.some(n => !n.is_read)}><CheckCircle2 size={16} /> Mark all read</button>
                </div>
            </div>

            <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {loading ? (
                    [...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: '80px' }} />)
                ) : notifications.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '5rem' }}>
                        <Bell size={48} style={{ margin: '0 auto 1.5rem', opacity: 0.2 }} />
                        <h3 style={{ color: 'var(--text-secondary)' }}>No new notifications</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>You're all caught up with your updates.</p>
                    </div>
                ) : (
                    notifications.map(note => {
                        const config = TYPE_ICONS[note.type] || { icon: Info, color: '#64748b' };
                        const Icon = config.icon;
                        return (
                            <div key={note.id} className="card" style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', opacity: note.is_read ? 0.6 : 1, borderLeft: note.is_read ? '1px solid var(--border-default)' : `4px solid ${config.color}`, background: note.is_read ? 'var(--bg-card)' : 'rgba(59,130,246,0.05)' }}>
                                <div style={{ padding: '0.75rem', background: `${config.color}20`, borderRadius: '12px' }}>
                                    <Icon size={24} color={config.color} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{note.title}</h3>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                            <Clock size={12} /> {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(note.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{note.message}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {!note.is_read && (
                                        <button className="btn btn-ghost btn-sm" onClick={() => markRead(note.id)} style={{ color: '#22c55e', padding: '0.5rem' }} title="Mark Read">
                                            <Check size={18} />
                                        </button>
                                    )}
                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-muted)', padding: '0.5rem' }} title="Delete">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
