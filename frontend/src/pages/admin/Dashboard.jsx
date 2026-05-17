import { useEffect, useState } from "react";
import { getAdminDashboardData } from "../../api/supabaseApi.js";

export default function AdminDashboard() {
    const [dashboard, setDashboard] = useState({
        total_routes: 0,
        active_operators: 0,
        total_bills: 0,
        active_routes: [],
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getAdminDashboardData()
            .then((data) => setDashboard(data))
            .catch((err) => {
                console.error("Failed to fetch dashboard data:", err);
                setDashboard({
                    total_routes: 0,
                    active_operators: 0,
                    total_bills: 0,
                    active_routes: [],
                });
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading)
        return (
            <div className="text-slate-400 py-12 text-center">Loading...</div>
        );

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                <p className="text-slate-500 text-sm mt-1">
                    Overview of today's delivery operations
                </p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                    {
                        label: "Total Routes",
                        value: dashboard.total_routes,
                        icon: "🗺",
                    },
                    {
                        label: "Active Delivery Persons",
                        value: dashboard.active_operators,
                        icon: "👤",
                    },
                    {
                        label: "Total Bills",
                        value: dashboard.total_bills,
                        icon: "🧾",
                    },
                ].map((s) => (
                    <div
                        key={s.label}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
                    >
                        <div className="text-2xl mb-1">{s.icon}</div>
                        <div className="text-3xl font-bold text-slate-900">
                            {s.value}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                            {s.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* Routes table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-slate-800">Active Routes</h2>
                </div>
                {dashboard.active_routes.length === 0 ? (
                    <div className="px-5 py-8 text-center text-slate-400 text-sm">
                        No routes yet. Upload a sheet to get started.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {dashboard.active_routes.map((r) => (
                            <div
                                key={r.id}
                                className="px-5 py-3.5 flex items-center justify-between"
                            >
                                <div>
                                    <div className="font-medium text-slate-800 text-sm">
                                        {r.route_name}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        Delivery person: {r.operator_name || "Unassigned"}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-semibold text-blue-600">
                                        {r.bill_count}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        bills
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}