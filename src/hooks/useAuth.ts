import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type SessionType = "main_app" | "history_summary" | "owner" | "admin";

interface Session {
  token: string;
  type: SessionType;
  expiresAt: string;
}

const STORAGE_KEY = "ph_supplies_session";
const OWNER_STORAGE_KEY = "ph_supplies_owner_session";
const ADMIN_STORAGE_KEY = "ph_supplies_admin_session";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isOwnerAuthenticated, setIsOwnerAuthenticated] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const getStoredSession = useCallback((key: string): Session | null => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }, []);

  const validateSession = useCallback(
    async (session: Session): Promise<boolean> => {
      // 1. Check local expiry first
      if (new Date(session.expiresAt) < new Date()) {
        return false;
      }

      // 2. If offline, trust local validity
      if (!navigator.onLine) {
        return true;
      }

      try {
        const { data, error } = await supabase.functions.invoke(
          "validate-session",
          {
            body: { sessionToken: session.token, sessionType: session.type },
          },
        );

        if (error) {
          console.warn(
            "Session validation network error, falling back to local (resilient mode):",
            error,
          );
          // NETWORK ERROR (or other non-auth error) -> Trust local
          return true;
        }

        // Explicit invalidation from server
        return data?.valid === true;
      } catch (error) {
        console.warn(
          "Session validation failed (exception), falling back to local:",
          error,
        );
        // Exception -> Trust local
        return true;
      }
    },
    [],
  );

  const checkAuth = useCallback(async () => {
    setLoading(true);

    // Check main app session
    const mainSession = getStoredSession(STORAGE_KEY);
    if (mainSession) {
      const isValid = await validateSession(mainSession);
      setIsAuthenticated(isValid);
      if (!isValid) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } else {
      setIsAuthenticated(false);
    }

    // Check owner session
    const ownerSession = getStoredSession(OWNER_STORAGE_KEY);
    if (ownerSession) {
      const isValid = await validateSession(ownerSession);
      setIsOwnerAuthenticated(isValid);
      if (!isValid) {
        localStorage.removeItem(OWNER_STORAGE_KEY);
      }
    } else {
      setIsOwnerAuthenticated(false);
    }

    // Check admin session
    const adminSession = getStoredSession(ADMIN_STORAGE_KEY);
    if (adminSession) {
      const isValid = await validateSession(adminSession);
      setIsAdminAuthenticated(isValid);
      if (!isValid) {
        localStorage.removeItem(ADMIN_STORAGE_KEY);
      }
    } else {
      setIsAdminAuthenticated(false);
    }

    setLoading(false);
  }, [getStoredSession, validateSession]);

  useEffect(() => {
    checkAuth();

    // Check session validity every minute
    const interval = setInterval(checkAuth, 60000);
    return () => clearInterval(interval);
  }, [checkAuth]);

  const verifyPin = async (
    pin: string,
    pinType: SessionType,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke("verify-pin", {
        body: { pin, pinType },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data?.success) {
        return { success: false, error: data?.error || "Invalid PIN" };
      }

      const session: Session = {
        token: data.sessionToken,
        type: pinType,
        expiresAt: data.expiresAt,
      };

      if (pinType === "main_app") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        setIsAuthenticated(true);
      } else if (pinType === "owner") {
        localStorage.setItem(OWNER_STORAGE_KEY, JSON.stringify(session));
        setIsOwnerAuthenticated(true);
      } else if (pinType === "admin") {
        localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(session));
        setIsAdminAuthenticated(true);
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Authentication failed",
      };
    }
  };

  const verifyHistoryPin = async (
    pin: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke("verify-pin", {
        body: { pin, pinType: "history_summary" },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: data?.success === true, error: data?.error };
    } catch (error: any) {
      return { success: false, error: error.message || "Verification failed" };
    }
  };

  const changePin = async (
    pinType: SessionType,
    newPin: string,
  ): Promise<{ success: boolean; error?: string }> => {
    // Check for Owner OR Admin session
    const ownerSession = getStoredSession(OWNER_STORAGE_KEY);
    const adminSession = getStoredSession(ADMIN_STORAGE_KEY);

    const activeSession = ownerSession || adminSession;

    if (!activeSession) {
      return { success: false, error: "Authorization required" };
    }

    try {
      const { data, error } = await supabase.functions.invoke("change-pin", {
        body: {
          ownerSessionToken: activeSession.token,
          pinType,
          newPin,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: data?.success === true, error: data?.error };
    } catch (error: any) {
      return { success: false, error: error.message || "Failed to change PIN" };
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsAuthenticated(false);
  };

  const logoutOwner = () => {
    localStorage.removeItem(OWNER_STORAGE_KEY);
    setIsOwnerAuthenticated(false);
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    setIsAdminAuthenticated(false);
  };

  const logoutAdmin = () => {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    setIsAdminAuthenticated(false);
  };

  const getOwnerSessionToken = (): string | null => {
    const session = getStoredSession(OWNER_STORAGE_KEY);
    return session?.token ?? null;
  };

  const checkAdminStatus = async (): Promise<{
    exists: boolean;
    error?: string;
  }> => {
    try {
      const { data, error } =
        await supabase.functions.invoke("check-admin-status");
      if (error) return { exists: false, error: error.message };
      return { exists: data.exists === true };
    } catch (e: any) {
      return { exists: false, error: e.message };
    }
  };

  const setupAdmin = async (
    newPin: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke("setup-admin", {
        body: { newPin },
      });

      if (error) return { success: false, error: error.message };
      if (!data.success) return { success: false, error: data.error };

      // Auto login
      const session: Session = {
        token: data.sessionToken,
        type: "admin",
        expiresAt: data.expiresAt,
      };
      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(session));
      setIsAdminAuthenticated(true);

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  return {
    isAuthenticated,
    isOwnerAuthenticated,
    isAdminAuthenticated,
    loading,
    verifyPin,
    verifyHistoryPin,
    changePin,
    logout,
    logoutOwner,
    logoutAdmin,
    getOwnerSessionToken,
    checkAuth,
    checkAdminStatus,
    setupAdmin,
  };
}
