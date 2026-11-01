import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, VoterProfile } from '../types';
import { apiRequest } from '../api/client';

interface AuthContextType {
  user: User | null;
  voterProfile: VoterProfile | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  setUserState: (user: User | null, profile?: VoterProfile | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [voterProfile, setVoterProfile] = useState<VoterProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const data = await apiRequest('/auth/me/');
      if (data.authenticated && data.user) {
        setUser(data.user);
        setVoterProfile(data.voter_profile || null);
      } else {
        setUser(null);
        setVoterProfile(null);
      }
    } catch {
      setUser(null);
      setVoterProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout/', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    setUser(null);
    setVoterProfile(null);
  };

  const setUserState = (newUser: User | null, newProfile?: VoterProfile | null) => {
    setUser(newUser);
    if (newProfile !== undefined) {
      setVoterProfile(newProfile);
    }
  };

  useEffect(() => {
    apiRequest('/auth/csrf/')
      .catch(() => undefined)
      .finally(() => refreshUser());
  }, []);

  return (
    <AuthContext.Provider value={{ user, voterProfile, loading, refreshUser, logout, setUserState }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
