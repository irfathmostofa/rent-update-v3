import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null); // row from `owners` table (role_id, status_id)
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId) {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase
      .from("owners")
      .select(
        `
        *,
        roles!inner (
          id,
          name
        ),
        account_status!inner (
          id,
          name
        )
      `,
      )
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Failed to load owner profile:", error.message);
      setProfile(null);
    } else {
      console.log("Profile loaded:", data); // Debug log
      setProfile(data);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      loadProfile(session?.user?.id).finally(() => setLoading(false));
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        loadProfile(session?.user?.id);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // Debug what's in the profile
  console.log("Auth Context - Profile:", profile);
  console.log(
    "Auth Context - isSuperAdmin:",
    profile?.roles?.name === "super_admin",
  );

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    // Option 1: Check by role name (if you have the roles joined)
    isSuperAdmin: profile?.roles?.name === "super_admin",
    // Option 2: Check by role_id (more reliable)
    // isSuperAdmin: profile?.role_id === 1,
    // Option 3: Check both (most robust)
    // isSuperAdmin: profile?.role_id === 1 || profile?.roles?.name === 'super_admin',
    accountStatus: profile?.account_status?.name,
    loading,
    refreshProfile: () => loadProfile(session?.user?.id),
    signOut: () => supabase.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
