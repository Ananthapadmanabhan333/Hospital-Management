'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';

export type UserRole = 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST' | 'LAB_ASSISTANT' | 'PATIENT';

export interface User {
    id: string;
    email: string;
    role: UserRole;
    firstName: string;
    lastName: string;
    phone?: string;
    avatarUrl?: string;
    patientId?: string;
    uhid?: string;
    doctorId?: string;
    specialization?: string;
    department?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        try {
            const { data } = await authApi.me();
            const u = data.data;
            setUser({
                id: u.id,
                email: u.email,
                role: u.role,
                firstName: u.first_name,
                lastName: u.last_name,
                phone: u.phone,
                avatarUrl: u.avatar_url,
                patientId: u.patient_id,
                uhid: u.uhid,
                doctorId: u.doctor_id,
                specialization: u.specialization,
                department: u.department,
            });
        } catch {
            setUser(null);
            if (typeof window !== 'undefined') {
                localStorage.removeItem('accessToken');
            }
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            const token = localStorage.getItem('accessToken');
            if (token) {
                await refreshUser();
            }
            setLoading(false);
        };
        init();
    }, [refreshUser]);

    const login = async (email: string, password: string) => {
        const { data } = await authApi.login(email, password);
        const { user: u, accessToken } = data.data;
        localStorage.setItem('accessToken', accessToken);
        setUser({
            id: u.id,
            email: u.email,
            role: u.role,
            firstName: u.firstName,
            lastName: u.lastName,
        });
    };

    const logout = async () => {
        try {
            await authApi.logout();
        } catch { }
        localStorage.removeItem('accessToken');
        setUser(null);
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
