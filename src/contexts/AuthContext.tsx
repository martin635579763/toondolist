
"use client";

import type { User } from '@/types/user';
import type { Task } from '@/types/task'; // Assuming tasks are tied to users
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { generateId } from '@/lib/utils';

interface AuthContextType {
  currentUser: User | null;
  login: (usernameInput: string, passwordInput: string) => Promise<boolean>;
  logout: () => void;
  register: (usernameInput: string, passwordInput: string, displayNameInput: string, avatarUrlInput?: string) => Promise<boolean>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_STORAGE_KEY = 'toondo-users';
const CURRENT_USER_STORAGE_KEY = 'toondo-current-user';

// WARNING: THIS IS A VERY INSECURE WAY TO HANDLE PASSWORDS.
// FOR PROTOTYPING ONLY. DO NOT USE IN PRODUCTION.
const simpleHash = (password: string) => `hashed_${password}`; 

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const getUsersFromStorage = useCallback((): User[] => {
    if (typeof window !== 'undefined') {
      const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
      return storedUsers ? JSON.parse(storedUsers) : [];
    }
    return [];
  }, []);

  const saveUsersToStorage = useCallback((users: User[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
      if (storedUser) {
        try {
          setCurrentUser(JSON.parse(storedUser));
        } catch (e) {
          console.error("Error parsing current user from localStorage", e);
          localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
        }
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (usernameInput: string, passwordInput: string): Promise<boolean> => {
    setIsLoading(true);
    const users = getUsersFromStorage();
    const foundUser = users.find(user => user.username === usernameInput && user.password === simpleHash(passwordInput));

    if (foundUser) {
      setCurrentUser(foundUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(foundUser));
      }
      toast({ title: "Login Successful", description: `Welcome back, ${foundUser.displayName}!` });
      router.push('/');
      setIsLoading(false);
      return true;
    } else {
      toast({ title: "Login Failed", description: "Invalid username or password.", variant: "destructive" });
      setIsLoading(false);
      return false;
    }
  }, [getUsersFromStorage, router, toast]);

  const register = useCallback(async (usernameInput: string, passwordInput: string, displayNameInput: string, avatarUrlInput?: string): Promise<boolean> => {
    setIsLoading(true);
    const users = getUsersFromStorage();
    if (users.find(user => user.username === usernameInput)) {
      toast({ title: "Registration Failed", description: "Username already exists.", variant: "destructive" });
      setIsLoading(false);
      return false;
    }

    const newUser: User = {
      id: generateId(),
      username: usernameInput,
      password: simpleHash(passwordInput), // Insecure hashing for demo
      displayName: displayNameInput,
      avatarUrl: avatarUrlInput || `https://placehold.co/100x100.png?text=${displayNameInput.charAt(0).toUpperCase()}`,
    };

    saveUsersToStorage([...users, newUser]);
    toast({ title: "Registration Successful", description: "You can now log in." });
    router.push('/login');
    setIsLoading(false);
    return true;
  }, [getUsersFromStorage, saveUsersToStorage, router, toast]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
       // Optional: Clear tasks associated with the logged-out user if desired, or handle globally
       // localStorage.removeItem('toondo-tasks'); 
    }
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    router.push('/login');
  }, [router, toast]);
  

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, register, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
