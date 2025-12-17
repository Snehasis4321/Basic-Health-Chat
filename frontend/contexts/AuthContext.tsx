'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
}

interface Doctor {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  doctor: Doctor | null;
  userToken: string | null;
  doctorToken: string | null;
  isAuthenticated: boolean;
  isDoctor: boolean;
  isUser: boolean;
  loginUser: (token: string, user: User) => void;
  loginDoctor: (token: string, doctor: Doctor) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [doctorToken, setDoctorToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load tokens from localStorage on mount
  useEffect(() => {
    const storedUserToken = localStorage.getItem('userToken');
    const storedDoctorToken = localStorage.getItem('doctorToken');
    const storedUser = localStorage.getItem('user');
    const storedDoctor = localStorage.getItem('doctor');

    if (storedUserToken && storedUser) {
      setUserToken(storedUserToken);
      setUser(JSON.parse(storedUser));
      validateUserToken(storedUserToken);
    }

    if (storedDoctorToken && storedDoctor) {
      setDoctorToken(storedDoctorToken);
      setDoctor(JSON.parse(storedDoctor));
      validateDoctorToken(storedDoctorToken);
    }

    setLoading(false);
  }, []);

  // Validate user token
  const validateUserToken = async (token: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/user/validate`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Token is invalid or expired
        localStorage.removeItem('userToken');
        localStorage.removeItem('user');
        setUserToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Token validation error:', error);
      localStorage.removeItem('userToken');
      localStorage.removeItem('user');
      setUserToken(null);
      setUser(null);
    }
  };

  // Validate doctor token
  const validateDoctorToken = async (token: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/doctor/validate`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Token is invalid or expired
        localStorage.removeItem('doctorToken');
        localStorage.removeItem('doctor');
        setDoctorToken(null);
        setDoctor(null);
      }
    } catch (error) {
      console.error('Token validation error:', error);
      localStorage.removeItem('doctorToken');
      localStorage.removeItem('doctor');
      setDoctorToken(null);
      setDoctor(null);
    }
  };

  const loginUser = (token: string, userData: User) => {
    setUserToken(token);
    setUser(userData);
    localStorage.setItem('userToken', token);
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Clear doctor auth if exists
    setDoctorToken(null);
    setDoctor(null);
    localStorage.removeItem('doctorToken');
    localStorage.removeItem('doctor');
  };

  const loginDoctor = (token: string, doctorData: Doctor) => {
    setDoctorToken(token);
    setDoctor(doctorData);
    localStorage.setItem('doctorToken', token);
    localStorage.setItem('doctor', JSON.stringify(doctorData));
    
    // Clear user auth if exists
    setUserToken(null);
    setUser(null);
    localStorage.removeItem('userToken');
    localStorage.removeItem('user');
  };

  const logout = () => {
    setUserToken(null);
    setUser(null);
    setDoctorToken(null);
    setDoctor(null);
    localStorage.removeItem('userToken');
    localStorage.removeItem('user');
    localStorage.removeItem('doctorToken');
    localStorage.removeItem('doctor');
  };

  const value: AuthContextType = {
    user,
    doctor,
    userToken,
    doctorToken,
    isAuthenticated: !!(userToken || doctorToken),
    isDoctor: !!doctorToken,
    isUser: !!userToken,
    loginUser,
    loginDoctor,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
