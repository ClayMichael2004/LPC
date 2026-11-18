import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import {
  authApi,
  clearAuthStorage,
  getAuthToken,
  getStoredUser,
  setAuthToken,
  setStoredUser,
} from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isSignInModalVisible: boolean;
  modalSource: 'checkout' | 'nav' | null;
  showSignInModal: (source: 'checkout' | 'nav') => void;
  hideSignInModal: () => void;
  signIn: (userData?: Partial<UserProfile>, authToken?: string) => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<UserProfile>;
  signOut: () => void;
}

function computeInitialsFromName(name?: string, email?: string): string {
  const cleaned = (name || '').trim();
  if (cleaned) {
    const parts = cleaned.split(/\s+/);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
  }
  if (email && email.trim()) {
    return email.trim().slice(0, 2).toUpperCase();
  }
  return 'LP';
}

const emptyUserTemplate: UserProfile = {
  id: '',
  name: 'Guest',
  initials: 'LP',
  phone: '-',
  email: '-',
  dob: '-',
  role: 'customer',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isSignInModalVisible, setIsSignInModalVisible] = useState(false);
  const [modalSource, setModalSource] = useState<'checkout' | 'nav' | null>(null);

  // Hydrate persisted user & token on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [storedToken, storedUser] = await Promise.all([
        getAuthToken(),
        getStoredUser(),
      ]);

      if (!mounted) return;
      if (storedToken) setToken(storedToken);
      if (storedUser) setUser(storedUser);

      // Refresh profile from backend if token exists
      if (storedToken) {
        try {
          const freshProfile = await authApi.getProfile();
          if (mounted && freshProfile) {
            setUser(freshProfile);
            await setStoredUser(freshProfile);
          }
        } catch {
          // Keep cached storedUser if offline
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const showSignInModal = (source: 'checkout' | 'nav') => {
    setModalSource(source);
    setIsSignInModalVisible(true);
  };

  const hideSignInModal = () => {
    setIsSignInModalVisible(false);
    setModalSource(null);
  };

  const signIn = (userData?: Partial<UserProfile>, authToken?: string) => {
    const resolvedName = userData?.name || user?.name || 'Guest';
    const resolvedEmail = userData?.email || user?.email || '-';
    const rawDob = userData?.dob;
    const resolvedDob =
      rawDob && rawDob !== '—' && rawDob !== '-' && rawDob !== '15/06/1998'
        ? rawDob
        : '-';
    const mergedUser: UserProfile = {
      ...emptyUserTemplate,
      ...userData,
      name: resolvedName,
      email: resolvedEmail,
      phone: userData?.phone || user?.phone || '-',
      dob: resolvedDob,
      initials:
        userData?.initials || computeInitialsFromName(resolvedName, resolvedEmail),
    };
    setUser(mergedUser);
    setStoredUser(mergedUser);

    if (authToken) {
      setToken(authToken);
      setAuthToken(authToken);
    }

    setIsSignInModalVisible(false);
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<UserProfile> => {
    const baseUser = user || emptyUserTemplate;
    const resolvedName = updates.name ?? baseUser.name;
    const resolvedEmail = updates.email ?? baseUser.email;
    const optimistic: UserProfile = {
      ...baseUser,
      ...updates,
      initials:
        updates.initials || computeInitialsFromName(resolvedName, resolvedEmail),
    };

    try {
      const updatedFromServer = await authApi.updateProfile({
        name: updates.name,
        phone: updates.phone,
        email: updates.email,
        dob: updates.dob,
      });
      const finalUser: UserProfile = {
        ...optimistic,
        ...updatedFromServer,
      };
      setUser(finalUser);
      await setStoredUser(finalUser);
      return finalUser;
    } catch {
      // Offline / local fallback
      setUser(optimistic);
      await setStoredUser(optimistic);
      return optimistic;
    }
  };

  const signOut = () => {
    setUser(null);
    setToken(null);
    clearAuthStorage();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isSignInModalVisible,
        modalSource,
        showSignInModal,
        hideSignInModal,
        signIn,
        updateProfile,
        signOut,
      }}
    >
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
