import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
});

// Request interceptor - attach token from localStorage for API clients
api.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('accessToken');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) reject(error);
        else resolve(token);
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return api(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const { data } = await api.post('/auth/refresh');
                const newToken = data.data.accessToken;
                if (typeof window !== 'undefined') {
                    localStorage.setItem('accessToken', newToken);
                }
                api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
                processQueue(null, newToken);
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError as Error);
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('accessToken');
                    window.location.href = '/login';
                }
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;

// API service functions
export const authApi = {
    login: (email: string, password: string) => api.post('/auth/login', { email, password }),
    logout: () => api.post('/auth/logout'),
    me: () => api.get('/auth/me'),
    changePassword: (currentPassword: string, newPassword: string) =>
        api.post('/auth/change-password', { currentPassword, newPassword }),
};

export const patientsApi = {
    list: (params?: Record<string, any>) => api.get('/patients', { params }),
    get: (id: string) => api.get(`/patients/${id}`),
    create: (data: any) => api.post('/patients', data),
    update: (id: string, data: any) => api.put(`/patients/${id}`, data),
    delete: (id: string) => api.delete(`/patients/${id}`),
    exportCsv: () => api.get('/patients/export/csv', { responseType: 'blob' }),
};

export const doctorsApi = {
    list: (params?: Record<string, any>) => api.get('/doctors', { params }),
    get: (id: string) => api.get(`/doctors/${id}`),
};

export const appointmentsApi = {
    list: (params?: Record<string, any>) => api.get('/appointments', { params }),
    get: (id: string) => api.get(`/appointments/${id}`),
    create: (data: any) => api.post('/appointments', data),
    updateStatus: (id: string, status: string, cancellationReason?: string) =>
        api.put(`/appointments/${id}/status`, { status, cancellationReason }),
    getAvailableSlots: (doctorId: string, date: string) =>
        api.get('/appointments/available-slots', { params: { doctorId, date } }),
};

export const medicalRecordsApi = {
    list: (params?: Record<string, any>) => api.get('/medical-records', { params }),
    get: (id: string) => api.get(`/medical-records/${id}`),
    create: (data: any) => api.post('/medical-records', data),
    update: (id: string, data: any) => api.put(`/medical-records/${id}`, data),
    downloadPrescription: (id: string) =>
        api.get(`/medical-records/${id}/prescription/pdf`, { responseType: 'blob' }),
};

export const labTestsApi = {
    list: (params?: Record<string, any>) => api.get('/lab-tests', { params }),
    get: (id: string) => api.get(`/lab-tests/${id}`),
    order: (data: any) => api.post('/lab-tests', data),
    updateStatus: (id: string, status: string) => api.patch(`/lab-tests/${id}/status`, { status }),
    uploadResult: (id: string, formData: FormData) =>
        api.post(`/lab-tests/${id}/upload-result`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    review: (id: string, notes?: string) => api.post(`/lab-tests/${id}/review`, { notes }),
};

export const billingApi = {
    list: (params?: Record<string, any>) => api.get('/billing', { params }),
    get: (id: string) => api.get(`/billing/${id}`),
    create: (data: any) => api.post('/billing', data),
    recordPayment: (id: string, data: any) => api.patch(`/billing/${id}/payment`, data),
    downloadPdf: (id: string) => api.get(`/billing/${id}/pdf`, { responseType: 'blob' }),
    exportCsv: () => api.get('/billing/export/csv', { responseType: 'blob' }),
};

export const adminApi = {
    overview: () => api.get('/admin/analytics/overview'),
    revenueTrend: () => api.get('/admin/analytics/revenue-trend'),
    appointmentsTrend: () => api.get('/admin/analytics/appointments-trend'),
    topDoctors: () => api.get('/admin/analytics/top-doctors'),
};

export const auditApi = {
    list: (params?: Record<string, any>) => api.get('/audit', { params }),
};

export const notificationsApi = {
    list: () => api.get('/notifications'),
    markRead: (id: string) => api.patch(`/notifications/${id}/read`),
    markAllRead: () => api.patch('/notifications/mark-all-read'),
};

export const usersApi = {
    list: (params?: Record<string, any>) => api.get('/users', { params }),
    create: (data: any) => api.post('/users', data),
    toggleActive: (id: string) => api.patch(`/users/${id}/toggle-active`),
};
