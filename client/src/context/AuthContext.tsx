import type { LoginInput, PublicUser, RegisterInput, UpdateProfileInput } from "@sports-match/shared";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as authApi from "../api/auth";
import { ApiError } from "../api/http";
import * as usersApi from "../api/users";

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  register: (input: RegisterInput) => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi
      .fetchMe()
      .then(setUser)
      .catch((err: unknown) => {
        // 401 just means "not logged in" — anything else is worth surfacing in the console.
        if (!(err instanceof ApiError && err.status === 401)) {
          console.error(err);
        }
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    register: async (input) => {
      setUser(await authApi.register(input));
    },
    login: async (input) => {
      setUser(await authApi.login(input));
    },
    logout: async () => {
      await authApi.logout();
      setUser(null);
    },
    updateProfile: async (input) => {
      setUser(await usersApi.updateProfile(input));
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
