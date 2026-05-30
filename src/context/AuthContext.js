import React, { createContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebaseConfig';
import { getUserData, loginUser, registerUser, logoutUser, signInWithGoogle } from '../services/auth';

export const AuthContext = createContext();

const AUTH_SESSION_KEY = '@bunbun/auth-session';

const buildSessionPayload = (user, profile) => ({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName || '',
  userData: profile || null,
});

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        // Fetch user document from Firestore to get role/fullName
        const result = await getUserData(user.uid);
        if (result.success) {
          setUserData(result.data);
          await AsyncStorage.setItem(
            AUTH_SESSION_KEY,
            JSON.stringify(buildSessionPayload(user, result.data))
          );
        } else {
          setUserData(null);
          await AsyncStorage.setItem(
            AUTH_SESSION_KEY,
            JSON.stringify(buildSessionPayload(user, null))
          );
        }
      } else {
        setCurrentUser(null);
        setUserData(null);
        await AsyncStorage.removeItem(AUTH_SESSION_KEY);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return undefined;
    }

    const intervalId = setInterval(async () => {
      const storedSession = await AsyncStorage.getItem(AUTH_SESSION_KEY);
      if (!storedSession) {
        await logoutUser();
        setCurrentUser(null);
        setUserData(null);
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [currentUser]);

  const login = async (email, password) => {
    return await loginUser(email, password);
  };

  const register = async (email, password, fullName) => {
    return await registerUser(email, password, fullName);
  };

  const loginWithGoogle = async () => {
    return await signInWithGoogle();
  };

  const logout = async () => {
    await AsyncStorage.removeItem(AUTH_SESSION_KEY);
    return await logoutUser();
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userData,
        isLoading,
        login,
        register,
        loginWithGoogle,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
