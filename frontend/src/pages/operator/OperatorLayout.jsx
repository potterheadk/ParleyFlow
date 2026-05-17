
import { useState, useEffect, useCallback } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient.js";
import SyncStatus from "../../components/SyncStatus.jsx";
import AppSignature from "../../components/AppSignature.jsx";
import { useOffline } from "../../hooks/useOffline.js";
import { useIndexedDB } from "../../hooks/useIndexedDB.js";
import { syncPendingUpdates } from "../../api/supabaseApi.js";

export default function OperatorLayout() {
    const navigate = useNavigate();
    const profile = JSON.parse(localStorage.getItem("profile") || "{}");
    const [pendingCount, setPendingCount] = useState(0);
    const { isOffline, setOnReconnect } = useOffline();
    const idb = useIndexedDB();

    const updatePendingCount = useCallback(async () => {
        try {
            const pending = await idb.getPendingUpdates();
            setPendingCount(pending?.length || 0);
        } catch (err) {
            console.error("Failed to read pending count:", err);
        }
    }, [idb]);

    useEffect(() => {
        updatePendingCount();
        const interval = setInterval(updatePendingCount, 3000);
        return () => clearInterval(interval);
    }, [updatePendingCount]);

    const handleSync = async () => {
        try {
            const pending = await idb.getPendingUpdates();
            if (!pending || pending.length === 0) {
                alert("Everything is already up to date!");
                return;
            }

            const result = await syncPendingUpdates(pending);

            if (result.count > 0) {
                await idb.clearAllPendingUpdates();
                alert(`✓ Synced ${result.count} offline updates to cloud!`);
                updatePendingCount();
                window.location.reload();
            }
        } catch (err) {
            console.error("Sync failed:", err);
            alert(`Sync Failed:\n${err.message}`);
        }
    };

    useEffect(() => {
        setOnReconnect(() => {
            console.log("Reconnected! Running handleSync...");
            handleSync();
        });
    }, [setOnReconnect]);

    const logout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (err) { }
        localStorage.clear();
        sessionStorage.clear();
        await idb.clearAllBills();
        await idb.clearAllPendingUpdates();
        if ("serviceWorker" in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            regs.forEach((r) => r.unregister());
        }
        window.location.href = "/login";
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-md">
                <div>
                    <div className="font-bold text-sm tracking-wide">🚚 ParleyFlow</div>
                    <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[120px]">{profile.full_name}</div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-3">
                    <SyncStatus
                        pendingCount={pendingCount}
                        isOffline={isOffline}
                        onSync={handleSync}
                    />
                    <NavLink
                        to="/operator"
                        end
                        className={({ isActive }) => `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}
                    >
                        Bills
                    </NavLink>
                    <NavLink
                        to="/operator/search"
                        className={({ isActive }) => `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}
                    >
                        Search
                    </NavLink>
                    <button
                        onClick={logout}
                        className="ml-1 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                    >
                        Out
                    </button>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto">
                <Outlet />
            </main>
            <footer className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-center shrink-0">
                <AppSignature />
            </footer>
        </div>
    );
}