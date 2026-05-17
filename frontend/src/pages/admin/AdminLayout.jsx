import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import AppSignature from "../../components/AppSignature.jsx";

const nav = [
    { to: "/admin", label: "Dashboard", icon: "⬛", end: true },
    { to: "/admin/upload", label: "Upload Sheet", icon: "📤" },
    { to: "/admin/users", label: "Delivery Persons", icon: "👤" },
    { to: "/admin/routes", label: "Routes", icon: "🗺" },
    { to: "/admin/export", label: "Export", icon: "📊" },
];

export default function AdminLayout() {
    const navigate = useNavigate();
    const profile = JSON.parse(localStorage.getItem("profile") || "{}");
    const [mobileOpen, setMobileOpen] = useState(false);

    const logout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.error("Supabase logout error:", err);
        }

        // PWA Cache wipe and Local Storage cleanup
        localStorage.clear();
        sessionStorage.clear();
        if ("serviceWorker" in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            regs.forEach((r) => r.unregister());
        }

        // Hard refresh to login to clear all React state
        window.location.href = "/login";
    };

    return (
        <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-40 w-56 bg-slate-900 text-white flex flex-col transform transition-transform duration-200
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:relative lg:translate-x-0`}
            >
                <div className="px-5 py-5 border-b border-slate-700">
                    <div className="text-lg font-bold tracking-tight">🚚 ParleyFlow</div>
                    <div className="text-xs text-slate-400 mt-0.5">Admin Panel</div>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-1">
                    {nav.map((n) => (
                        <NavLink
                            key={n.to}
                            to={n.to}
                            end={n.end}
                            onClick={() => setMobileOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive
                                    ? "bg-blue-600 text-white font-semibold"
                                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                }`
                            }
                        >
                            <span className="text-base">{n.icon}</span>
                            {n.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="px-4 py-4 border-t border-slate-700">
                    <div className="text-xs text-slate-400 mb-1">{profile.full_name || profile.username}</div>
                    <button
                        onClick={logout}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                        Logout →
                    </button>
                    <div className="mt-4">
                        <AppSignature />
                    </div>
                </div>
            </aside>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Main */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top bar */}
                <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 lg:hidden">
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="text-gray-600 text-xl"
                    >
                        ☰
                    </button>
                    <span className="font-semibold text-gray-800">ParleyFlow Admin</span>
                </header>

                <main className="flex-1 overflow-y-auto p-4 lg:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}