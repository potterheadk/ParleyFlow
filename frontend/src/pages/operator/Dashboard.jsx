
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatCurrency } from "../../utils/formatters.js";
import { REMARK_COLORS } from "../../utils/constants.js";
import { useIndexedDB } from "../../hooks/useIndexedDB.js";
import { useOffline } from "../../hooks/useOffline.js";
import { getOperatorBills } from "../../api/supabaseApi.js";

export default function OperatorDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const idb = useIndexedDB();
    const { isOffline } = useOffline();

    useEffect(() => {
        const loadBills = async () => {
            try {
                setError(null);

                // 1. Fetch from Supabase directly
                const backendData = await getOperatorBills();

                if (!backendData.bills || backendData.bills.length === 0) {
                    setData(null);
                    setLoading(false);
                    return;
                }

                // Save to IndexedDB for offline access
                if (backendData.bills.length > 0) {
                    await idb.saveBills(backendData.bills);
                }

                setData(backendData);
                setLoading(false);
            } catch (err) {
                console.warn("Cloud fetch failed, trying IndexedDB...", err);
                setError(err.message);

                try {
                    const cachedBills = await idb.getBills();
                    if (cachedBills && cachedBills.length > 0) {
                        const done = cachedBills.filter((b) => b.has_update || b.latest_remark).length;
                        const pending = cachedBills.length - done;

                        setData({
                            route_name: "Cached Route",
                            total: cachedBills.length,
                            done,
                            pending,
                            bills: cachedBills,
                        });
                    }
                } catch (idbErr) {
                    console.error("Both Cloud and IndexedDB failed:", idbErr);
                }
                setLoading(false);
            }
        };

        loadBills();
    }, [idb]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="text-slate-400 text-sm">Loading bills...</div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center py-24 px-6 text-center">
                <div>
                    <div className="text-4xl mb-3">⚠️</div>
                    <div className="text-slate-600 font-medium">No route assigned</div>
                    <div className="text-slate-400 text-sm mt-1">Ask your admin to assign you a route.</div>
                </div>
            </div>
        );
    }

    return (
        <div>
            {isOffline && (
                <div className="bg-orange-50 border-b border-orange-200 px-4 py-2">
                    <div className="text-xs text-orange-700 font-medium">📡 Working offline — bills cached locally</div>
                </div>
            )}

            <div className="bg-white border-b border-gray-100 px-4 py-4">
                <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Your Route</div>
                <div className="text-xl font-bold text-slate-900">{data.route_name}</div>
                <div className="flex gap-4 mt-2">
                    <div className="text-sm">
                        <span className="font-bold text-slate-900">{data.total}</span>
                        <span className="text-slate-400 ml-1">total</span>
                    </div>
                    <div className="text-sm">
                        <span className="font-bold text-green-600">{data.done}</span>
                        <span className="text-slate-400 ml-1">visited</span>
                    </div>
                    <div className="text-sm">
                        <span className="font-bold text-orange-500">{data.pending}</span>
                        <span className="text-slate-400 ml-1">remaining</span>
                    </div>
                </div>

                {data.total > 0 && (
                    <div className="mt-3 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                            className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${(data.done / data.total) * 100}%` }}
                        />
                    </div>
                )}
            </div>

            <div className="flex flex-col">
                {data.bills.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 text-sm border-b border-gray-50">No bills in this route.</div>
                ) : (
                    data.bills.map((b) => {
                        // Determine subtle color coding based on status
                        let bgClass = "bg-white hover:bg-gray-50 active:bg-gray-100 border-b border-gray-50";
                        let statusText = "Unpaid";
                        let statusTextClass = "text-slate-400 font-medium";

                        if (b.has_update) {
                            if (b.latest_update?.is_cancelled || b.latest_remark === "Cancelled" || b.latest_remark === "Refused") {
                                bgClass = "bg-red-50/40 hover:bg-red-50/60 active:bg-red-50 border-b border-red-100/50";
                                statusText = "Cancelled";
                                statusTextClass = "text-red-600 font-semibold";
                            } else if (b.latest_update?.cash_pending_amount > 0) {
                                bgClass = "bg-amber-50/40 hover:bg-amber-50/60 active:bg-amber-50 border-b border-amber-100/50";
                                statusText = "Cash Pending";
                                statusTextClass = "text-amber-600 font-semibold";
                            } else {
                                bgClass = "bg-green-50/40 hover:bg-green-50/60 active:bg-green-50 border-b border-green-100/50";
                                statusText = "Collected ✓";
                                statusTextClass = "text-green-600 font-semibold";
                            }
                        }

                        return (
                            <Link
                                key={b.id}
                                to={`/operator/bills/${b.id}`}
                                className={`flex items-center justify-between px-4 py-4 transition-colors ${bgClass}`}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-slate-900 text-sm truncate">{b.retailer_name}</div>
                                    <div className="text-xs text-slate-400 mt-0.5 font-mono">{b.bill_no}</div>
                                    {b.latest_remark && (
                                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded-md mt-1.5 font-medium ${REMARK_COLORS[b.latest_remark] || "bg-gray-200/50 text-gray-600"}`}>
                                            {b.latest_remark}
                                        </span>
                                    )}
                                </div>
                                <div className="text-right ml-4 flex-shrink-0">
                                    <div className="font-bold text-slate-900 text-sm">{formatCurrency(b.original_amount)}</div>
                                    <div className={`text-xs mt-1.5 ${statusTextClass}`}>
                                        {statusText}
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
    );
}
