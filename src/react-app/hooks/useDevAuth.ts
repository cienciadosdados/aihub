// Temporary dev auth hook - replace with real Mocha auth when configured
export const useAuth = () => {
  const devUser = {
    id: "dev-user-123",
    email: "dev@example.com",
    name: "Dev User"
  };

  return {
    user: devUser,
    isPending: false,
    redirectToLogin: () => {
      // In dev mode, redirect directly to dashboard
      window.location.href = '/dashboard';
    },
    exchangeCodeForSessionToken: async () => {
      // Mock implementation
      return Promise.resolve();
    },
    logout: () => {
      window.location.href = '/';
    }
  };
};