import { BrowserRouter as Router, Routes, Route } from "react-router";
// Custom Auth Provider
import { createContext, useContext, useState, useEffect } from "react";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isPending: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  redirectToLogin: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    // Check if user is logged in from localStorage
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsPending(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
        localStorage.setItem('auth_user', JSON.stringify(userData.user));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsPending(false);
    }
  };

  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    setIsPending(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
        localStorage.setItem('auth_user', JSON.stringify(userData.user));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Signup error:', error);
      return false;
    } finally {
      setIsPending(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
  };

  const redirectToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, isPending, login, signup, logout, redirectToLogin }}>
      {children}
    </AuthContext.Provider>
  );
};
import HomePage from "@/react-app/pages/Home";
import LoginPage from "@/react-app/pages/Login";
import SignUpPage from "@/react-app/pages/SignUp";
import AuthCallbackPage from "@/react-app/pages/AuthCallback";
import DashboardPage from "@/react-app/pages/Dashboard";
import WorkspacePage from "@/react-app/pages/Workspace";
import AgentPage from "@/react-app/pages/Agent";
import WidgetPage from "@/react-app/pages/Widget";
import AnalyticsPage from "@/react-app/pages/Analytics";
import SettingsPage from "@/react-app/pages/Settings";

// Custom useAuth hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/workspace/:workspaceId" element={<WorkspacePage />} />
          <Route path="/agent/:agentId" element={<AgentPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/widget" element={<WidgetPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
