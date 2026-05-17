import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { formatCurrency, formatDate } from "../../utils/formatters.js";
import { useIndexedDB } from "../../hooks/useIndexedDB.js";
import { useOffline } from "../../hooks/useOffline.js";
import { getOperatorBillDetail, submitOperatorBillUpdate } from "../../api/supabaseApi.js";
import PaymentCollectionModal from "../../components/ui/PaymentCollectionModal.jsx";
import { generateUUID } from "../../utils/uuid.js";

export default function BillDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [bill, setBill] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updates, setUpdates] = useState([]);

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentSaving, setPaymentSaving] = useState(false);

    const idb = useIndexedDB();
    const { isOffline } = useOffline();

    const load = async () => {
        try {
            const data = await getOperatorBillDetail(id);
            setBill(data);

            const pendingUpdates = await idb.getPendingUpdates();
            const localUpdatesForBill = pendingUpdates
                .filter(u => u.bill_id === id)
                .map(u => ({ ...u, synced: false }));

            // Sort desc so latest is always index 0
            const combined = [...localUpdatesForBill, ...(data.updates || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setUpdates(combined);

        } catch (err) {
            console.warn("Cloud fetch failed, trying IndexedDB...", err);
            try {
                const cachedBills = await idb.getBills();
                const localBill = cachedBills.find((b) => b.id === id);
                if (localBill) {
                    setBill(localBill);
                    const pendingUpdates = await idb.getPendingUpdates();
                    const localUpdates = pendingUpdates
                        .filter(u => u.bill_id === id)
                        .map(u => ({ ...u, synced: false }))
                        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    setUpdates(localUpdates);
                } else {
                    console.error("Bill not found in cache");
                }
            } catch (idbErr) {
                console.error("Both Cloud and IndexedDB failed:", idbErr);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const latestUpdate = updates.length > 0 ? updates[0] : null;

    const handlePaymentSubmit = async (paymentData) => {
        setPaymentSaving(true);
        try {
            // ALWAYS generate a new UUID for edits.
            // Because the backend acts as an append-only ledger (ON CONFLICT DO NOTHING),
            // passing an old ID results in a silent failure. A new ID successfully appends the correction.
            const clientUpdateId = generateUUID();

            const payload = {
                ...paymentData,
                bill_id: id,
                created_at: new Date().toISOString()
            };

            if (isOffline) {
                await idb.savePendingUpdate({ ...payload, client_update_id: clientUpdateId });
                alert("📡 Offline Mode: Payment saved successfully!\nIt will sync when connection is restored.");
                await load();
            } else {
                const result = await submitOperatorBillUpdate(id, payload, clientUpdateId);
                alert(`✓ Payment saved successfully!\nCollected: ${formatCurrency(result.total_collected)}\nDifference: ${formatCurrency(result.difference)}`);
                await load();
            }

            setIsPaymentModalOpen(false);
        } catch (err) {
            console.error("Failed to save payment:", err);
            alert(err.message || "Failed to save payment");
        } finally {
            setPaymentSaving(false);
        }
    };

    if (loading) return <div className="py-24 text-center text-slate-400 text-sm">Loading...</div>;
    if (!bill) return <div className="py-24 text-center text-slate-400 text-sm">Bill not found.</div>;

    // Visual Status Evaluation for Top Card
    let cardBgClass = "bg-white border-gray-100 shadow-sm";
    if (latestUpdate) {
        if (latestUpdate.is_cancelled) cardBgClass = "bg-red-50 border-red-100 shadow-sm";
        else if (latestUpdate.cash_pending_amount > 0) cardBgClass = "bg-amber-50 border-amber-200 shadow-sm";
        else cardBgClass = "bg-emerald-50 border-emerald-200 shadow-sm";
    }

    const accountedTotal = latestUpdate ? (latestUpdate.cash_amount || 0) + (latestUpdate.online_amount || 0) + (latestUpdate.cheq_amount || 0) + (latestUpdate.cash_pending_amount || 0) : 0;
    const currentDifference = bill.original_amount - accountedTotal;

    return (
        <div className="pb-8">
            <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
                <button onClick={() => navigate(-1)} className="text-blue-600 text-sm font-medium px-2 py-1 rounded-md hover:bg-blue-50 transition-colors">← Back</button>
                <div className="font-semibold text-slate-800 text-sm truncate">{bill.retailer_name}</div>
            </div>

            <div className={`mx-4 mt-4 rounded-2xl border p-5 transition-colors duration-300 ${cardBgClass}`}>
                <div className="flex items-start justify-between border-b border-slate-200/50 pb-4 mb-4">
                    <div>
                        <div className="text-lg font-bold text-slate-900">{bill.retailer_name}</div>
                        <div className="text-xs text-slate-500 font-mono mt-1">{bill.bill_no}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{formatDate(bill.bill_date)}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-slate-900">{formatCurrency(bill.original_amount)}</div>
                        <div className="text-xs text-slate-500 mt-1 font-medium">Bill Amount</div>
                    </div>
                </div>

                {/* Display Live Calculated Totals if an update exists */}
                {latestUpdate && !latestUpdate.is_cancelled && (
                    <div className="flex justify-between items-center text-sm">
                        <div>
                            <div className="text-slate-500 mb-0.5">Accounted</div>
                            <div className="font-bold text-slate-800 text-base">{formatCurrency(accountedTotal)}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-slate-500 mb-0.5">{currentDifference < 0 ? "Overpaid" : "Difference"}</div>
                            <div className={`font-bold text-base ${currentDifference !== 0 ? (currentDifference < 0 ? 'text-green-600' : 'text-orange-600') : 'text-slate-800'}`}>
                                {formatCurrency(Math.abs(currentDifference))}
                            </div>
                        </div>
                    </div>
                )}
                {latestUpdate && latestUpdate.is_cancelled && (
                    <div className="text-sm font-bold text-red-700 text-center bg-red-100/50 py-2 rounded-lg">
                        Bill Cancelled / Refused
                    </div>
                )}
            </div>

            <div className="mx-4 mt-4">
                <button
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3.5 rounded-xl transition-all shadow-md"
                >
                    {latestUpdate ? "✏️ Edit Payment" : "💳 Collect Payment"}
                </button>
            </div>

            {updates.length > 0 && (
                <div className="mx-4 mt-8">
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 px-1">
                        Update History
                    </div>
                    <div className="space-y-3">
                        {updates.map((u, index) => {
                            const isActive = index === 0; // Index 0 is the true current state

                            let badgeClass = "text-green-700 bg-green-100";
                            let badgeText = "✅ Collected";

                            if (u.is_cancelled) {
                                badgeClass = "text-red-700 bg-red-100";
                                badgeText = "🚫 Cancelled";
                            } else if (u.cash_pending_amount > 0) {
                                badgeClass = "text-amber-800 bg-amber-100";
                                badgeText = "⏳ Pending";
                            }

                            return (
                                <div key={u.update_id || u.client_update_id} className={`rounded-xl border p-4 transition-all duration-300 ${isActive ? 'bg-white border-gray-100 shadow-sm' : 'bg-gray-50 border-gray-200 opacity-70 grayscale-[0.3]'}`}>
                                    <div className="flex items-center justify-between mb-3 border-b border-gray-100/80 pb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold px-2 py-1 rounded-md ${badgeClass}`}>
                                                {badgeText}
                                            </span>
                                            {!isActive && (
                                                <span className="text-[10px] font-bold text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                    Superseded
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs font-medium text-slate-400">{u.synced ? "☁️ Synced" : "⏳ Pending"}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-y-2 text-sm mt-1">
                                        {u.cash_amount > 0 && <div>Cash: <span className="font-semibold text-slate-800">{formatCurrency(u.cash_amount)}</span></div>}
                                        {u.online_amount > 0 && <div>Online: <span className="font-semibold text-slate-800">{formatCurrency(u.online_amount)}</span></div>}
                                        {u.cheq_amount > 0 && <div>Cheque: <span className="font-semibold text-slate-800">{formatCurrency(u.cheq_amount)}</span></div>}
                                        {u.cash_pending_amount > 0 && <div className="col-span-2">Pending: <span className="font-semibold text-amber-700">{formatCurrency(u.cash_pending_amount)}</span></div>}
                                    </div>

                                    {u.cancel_remark && (
                                        <div className={`mt-3 text-xs p-2.5 rounded-lg border ${isActive ? 'bg-red-50 text-red-700 border-red-100' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                            <span className="font-bold">Reason:</span> {u.cancel_remark}
                                        </div>
                                    )}

                                    {u.notes && (
                                        <div className={`mt-3 text-xs p-2.5 rounded-lg border ${isActive ? 'bg-slate-50 text-slate-600 border-slate-100' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                            <span className="font-bold">Note:</span> {u.notes}
                                        </div>
                                    )}

                                    <div className="text-xs text-slate-400 mt-3 text-right">
                                        {new Date(u.created_at).toLocaleString("en-IN", { dateStyle: 'medium', timeStyle: 'short' })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <PaymentCollectionModal
                bill={bill}
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onSubmit={handlePaymentSubmit}
                isLoading={paymentSaving}
                initialData={latestUpdate}
            />
        </div>
    );
}