import React, { createContext, useContext, useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'https://fundtracer.xyz';

interface AdminUser {
    uid: string;
    username: string;
    email: string;
    role: 'superadmin' | 'admin' | 'moderator';
}

interface AuthContextType {
    user: AdminUser | null;
    loading: boolean;
    isAdmin: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    token: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AdminUser | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('adminToken'));
    const [loading, setLoading] = useState(true);

    // Verify token on mount
    useEffect(() => {
        const verifyToken = async () => {
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(`${API_URL}/api/admin/auth/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const adminData = await response.json();
                    setUser(adminData);
                } else {
                    // Token invalid, clear it
                    localStorage.removeItem('adminToken');
                    setToken(null);
                }
            } catch (error) {
                console.error('Token verification error:', error);
                localStorage.removeItem('adminToken');
                setToken(null);
            }
            
            setLoading(false);
        };

        verifyToken();
    }, [token]);

    const login = async (username: string, password: string) => {
        try {
            const response = await fetch(`${API_URL}/api/admin/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Login failed');
            }

            const data = await response.json();
            
            // Store token
            localStorage.setItem('adminToken', data.token);
            setToken(data.token);
            setUser(data.admin);
            
        } catch (error: any) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('adminToken');
        setToken(null);
        setUser(null);
    };

    const isAdmin = !!user;

    return (
        <AuthContext.Provider value={{ user, loading, isAdmin, login, logout, token }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
