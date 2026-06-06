'use client';

import { useEffect, useState } from 'react';

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

import { auth } from '@/lib/firebase/firebase';

export function useAuth() {

  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {

      setUser(firebaseUser);

      setLoading(false);

    });

    return () => unsubscribe();

  }, []);

  const signIn = async (
    email: string,
    password: string
  ) => {

    const result =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    return result.user;
  };

  const signUp = async (
    email: string,
    password: string
  ) => {

    const result =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    return result.user;
  };

  const logout = async () => {

    await signOut(auth);

  };

  return {

    user,
    loading,

    signIn,
    signUp,
    logout,

    profile: null,

    signInWithGoogle: async () => {},

    resetPassword: async () => {},

    updateUserProfile: async () => {},

  };

}