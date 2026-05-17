import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.js";
import AppSignature from "../components/AppSignature.jsx";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Sign in with Supabase Auth using email (not username)
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !data.user) {
        setError(authError?.message || "Login failed. Check email and password.");
        setLoading(false);
        return;
      }

      // Fetch profile from public.profiles table
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setError("Profile not found. Please contact admin.");
        setLoading(false);
        return;
      }

      // Check if user is inactive
      if (profile.active !== true) {
        await supabase.auth.signOut();
        setError("Account is inactive. Contact admin.");
        setLoading(false);
        return;
      }

      // Store profile in localStorage
      localStorage.setItem("profile", JSON.stringify(profile));

      // Navigate based on role
      if (profile.role === "admin") {
        navigate("/admin");
      } else if (profile.role === "operator") {
        navigate("/operator");
      } else {
        setError("Unknown role assigned to profile.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <div className="mb-8 text-center">
          <div className="text-3xl font-bold text-slate-900">🚚 ParleyFlow</div>
          <div className="text-sm text-slate-500 mt-1">Delivery Collection System</div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="operator@parley.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter password"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <div className="mt-6">
          <AppSignature />
        </div>
      </div>
    </div>
  );
}