import React, { createContext, useContext, useState } from 'react';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isSignInModalVisible: boolean;
  modalSource: 'checkout' | 'nav' | null;
  showSignInModal: (source: 'checkout' | 'nav') => void;
  hideSignInModal: () => void;
  signIn: (userData?: Partial<UserProfile>) => void;
  signOut: () => void;
}

const defaultUser: UserProfile = {
  id: 'usr-1',
  name: 'Michael Clay',
  initials: 'MC',
  phone: '+254 712 345 678',
  email: 'michaelclay2225@gmail.com',
  dob: '15/06/1998',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isSignInModalVisible, setIsSignInModalVisible] = useState(false);
  const [modalSource, setModalSource] = useState<'checkout' | 'nav' | null>(null);

  const showSignInModal = (source: 'checkout' | 'nav') => {
    setModalSource(source);
    setIsSignInModalVisible(true);
  };

  const hideSignInModal = () => {
    setIsSignInModalVisible(false);
    setModalSource(null);
  };

  const signIn = (userData?: Partial<UserProfile>) => {
    setUser({
      ...defaultUser,
      ...userData,
    });
    setIsSignInModalVisible(false);
  };

  const signOut = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isSignInModalVisible,
        modalSource,
        showSignInModal,
        hideSignInModal,
        signIn,
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
