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

const defaultUser: UserProfile = {
  id: 'usr-1',
  name: 'Michael Clay',
  initials: 'MC',
  phone: '+254 712 345 678',
  email: 'michaelclay2225@gmail.com',
  dob: '15/06/1998',
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
    const mergedUser: UserProfile = {
      ...defaultUser,
      ...(user || {}),
      ...userData,
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
    const optimistic: UserProfile = {
      ...defaultUser,
      ...(user || {}),
      ...updates,
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
