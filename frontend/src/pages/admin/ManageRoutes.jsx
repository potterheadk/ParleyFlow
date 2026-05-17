import { useEffect, useState } from "react";
import { getRoutesData, clearOperatorData, clearAllOperations } from "../../api/supabaseApi.js";

export default function ManageRoutes() {
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(null);

    const load = () => {
        setLoading(true);
        getRoutesData()
            .then((data) => setRoutes(data))
            .catch((err) => {
                console.error("Failed to fetch routes:", err);
                setRoutes([]);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
    }, []);

    // Delete/clear a single route's operator data
    const handleDeleteRoute = async (operatorId, routeName) => {
        if (!window.confirm(`Delete all data for route "${routeName}"? This cannot be undone.`)) {
            return;
        }

        setDeleting(operatorId);
        try {
            await clearOperatorData(operatorId);
            load();
        } catch (err) {
            console.error("Failed to delete route:", err);
            alert("Failed to delete route: " + err.message);
        } finally {
            setDeleting(null);
        }
    };

    // Nuclear option: clear ALL operations
    const handleResetAllOperations = async () => {
        if (!window.confirm(
            "⚠️ WARNING: This will DELETE ALL routes, batches, and bills system-wide.\n" +
            "Delivery person profiles will NOT be deleted.\n\n" +
            "This action CANNOT be undone. Are you absolutely sure?"
        )) {
            return;
        }

        setLoading(true);
        try {
            await clearAllOperations();
            load();
        } catch (err) {
            console.error("Failed to reset operations:", err);
            alert("Failed to reset operations: " + err.message);
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Routes</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        View and manage delivery routes
                    </p>
                </div>
                <button
                    onClick={handleResetAllOperations}
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
                >
                    🔄 Reset All Data
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                {loading ? (
                    <div className="py-12 text-center text-slate-400 text-sm">
                        Loading...
                    </div>
                ) : routes.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-sm">
                        No routes yet. Upload a sheet first.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {routes.map((r) => (
                            <div key={r.id} className="px-5 py-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="font-medium text-slate-800 text-sm">
                                            {r.route_name}
                                        </div>
                                        <div className="text-xs text-slate-400 mt-0.5">
                                            {r.bill_count} bills · Delivery person: {r.operator_name || "Unassigned"}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteRoute(r.operator_id, r.route_name)}
                                        disabled={deleting === r.operator_id}
                                        className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium rounded transition disabled:opacity-50"
                                    >
                                        {deleting === r.operator_id ? "Deleting..." : "Delete"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}