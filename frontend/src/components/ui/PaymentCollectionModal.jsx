import React, { useState, useEffect } from "react";
import { formatCurrency } from "../../utils/formatters.js";

export default function PaymentCollectionModal({ bill, isOpen, onClose, onSubmit, isLoading, initialData }) {
    // State for checkboxes
    const [isCash, setIsCash] = useState(false);
    const [isOnline, setIsOnline] = useState(false);
    const [isCheq, setIsCheq] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [isCancelled, setIsCancelled] = useState(false);

    // State for values
    const [cashAmount, setCashAmount] = useState("");
    const [onlineAmount, setOnlineAmount] = useState("");
    const [cheqAmount, setCheqAmount] = useState("");
    const [pendingAmount, setPendingAmount] = useState("");
    const [cancelRemark, setCancelRemark] = useState("");
    const [notes, setNotes] = useState("");

    // Reset or Prefill state when modal opens
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setIsCash(initialData.cash_amount > 0);
                setCashAmount(initialData.cash_amount > 0 ? String(initialData.cash_amount) : "");
                setIsOnline(initialData.online_amount > 0);
                setOnlineAmount(initialData.online_amount > 0 ? String(initialData.online_amount) : "");
                setIsCheq(initialData.cheq_amount > 0);
                setCheqAmount(initialData.cheq_amount > 0 ? String(initialData.cheq_amount) : "");
                setIsPending(initialData.cash_pending_amount > 0);
                setPendingAmount(initialData.cash_pending_amount > 0 ? String(initialData.cash_pending_amount) : "");
                setIsCancelled(initialData.is_cancelled || false);
                setCancelRemark(initialData.cancel_remark || "");
                setNotes(initialData.notes || "");
            } else {
                setIsCash(false);
                setIsOnline(false);
                setIsCheq(false);
                setIsPending(false);
                setIsCancelled(false);
                setCashAmount("");
                setOnlineAmount("");
                setCheqAmount("");
                setPendingAmount("");
                setCancelRemark("");
                setNotes("");
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen || !bill) return null;

    // Calculations
    const totalCollected =
        (isCash ? parseFloat(cashAmount) || 0 : 0) +
        (isOnline ? parseFloat(onlineAmount) || 0 : 0) +
        (isCheq ? parseFloat(cheqAmount) || 0 : 0) +
        (isPending ? parseFloat(pendingAmount) || 0 : 0);

    const difference = bill.original_amount - totalCollected;

    const handleSubmit = () => {
        // Validation
        if (isCancelled && !cancelRemark.trim()) {
            alert("Please provide a reason for cancellation.");
            return;
        }

        if (!isCancelled && totalCollected === 0) {
            alert("Please select at least one payment method and enter an amount.");
            return;
        }

        // Build payload matching backend schema
        const payload = {
            cash_amount: isCash ? parseFloat(cashAmount) || 0 : 0,
            online_amount: isOnline ? parseFloat(onlineAmount) || 0 : 0,
            cheq_amount: isCheq ? parseFloat(cheqAmount) || 0 : 0,
            cash_pending_amount: isPending ? parseFloat(pendingAmount) || 0 : 0,
            is_cancelled: isCancelled,
            cancel_remark: isCancelled ? cancelRemark.trim() : null,
            notes: notes.trim() || null,
        };

        onSubmit(payload);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 transition-opacity">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-xl animate-slide-up sm:animate-none">

                {/* Sticky Header */}
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center z-10 shrink-0 bg-white sm:rounded-t-2xl rounded-t-2xl">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">{initialData ? "Edit Payment" : "Collect Payment"}</h2>
                        <p className="text-xs text-slate-500 mt-0.5">{bill.retailer_name} • {bill.bill_no}</p>
                    </div>
                    <button onClick={onClose} disabled={isLoading} className="text-slate-400 hover:text-slate-600 text-3xl font-light leading-none mb-1 disabled:opacity-50">&times;</button>
                </div>

                {/* Scrollable Form Content */}
                <div className="p-5 overflow-y-auto flex-1 space-y-5 pb-8">
                    {/* Summary */}
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex justify-between items-center">
                        <span className="text-sm text-blue-800 font-medium">Original Amount:</span>
                        <span className="text-xl font-bold text-blue-900">{formatCurrency(bill.original_amount)}</span>
                    </div>

                    <div className="space-y-3">
                        {/* Cash */}
                        <div className={`border rounded-xl p-3 transition-colors ${isCash ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200'}`}>
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input type="checkbox" checked={isCash} onChange={(e) => setIsCash(e.target.checked)} disabled={isCancelled} className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                                <span className="font-medium text-slate-800">💵 Cash</span>
                            </label>
                            {isCash && (
                                <input type="number" inputMode="decimal" placeholder="Enter Cash Amount" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} className="mt-3 w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                            )}
                        </div>

                        {/* Online */}
                        <div className={`border rounded-xl p-3 transition-colors ${isOnline ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200'}`}>
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input type="checkbox" checked={isOnline} onChange={(e) => setIsOnline(e.target.checked)} disabled={isCancelled} className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                                <span className="font-medium text-slate-800">📱 Online</span>
                            </label>
                            {isOnline && (
                                <input type="number" inputMode="decimal" placeholder="Enter Online Amount" value={onlineAmount} onChange={(e) => setOnlineAmount(e.target.value)} className="mt-3 w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                            )}
                        </div>

                        {/* Cheque */}
                        <div className={`border rounded-xl p-3 transition-colors ${isCheq ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200'}`}>
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input type="checkbox" checked={isCheq} onChange={(e) => setIsCheq(e.target.checked)} disabled={isCancelled} className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                                <span className="font-medium text-slate-800">📄 Cheque</span>
                            </label>
                            {isCheq && (
                                <input type="number" inputMode="decimal" placeholder="Enter Cheque Amount" value={cheqAmount} onChange={(e) => setCheqAmount(e.target.value)} className="mt-3 w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                            )}
                        </div>

                        {/* Cash Pending */}
                        <div className={`border rounded-xl p-3 transition-colors ${isPending ? 'border-orange-300 bg-orange-50/30' : 'border-gray-200'}`}>
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input type="checkbox" checked={isPending} onChange={(e) => setIsPending(e.target.checked)} disabled={isCancelled} className="w-5 h-5 text-orange-500 rounded border-gray-300 focus:ring-orange-500" />
                                <span className="font-medium text-slate-800">⏳ Cash Pending</span>
                            </label>
                            {isPending && (
                                <input type="number" inputMode="decimal" placeholder="Enter Pending Amount" value={pendingAmount} onChange={(e) => setPendingAmount(e.target.value)} className="mt-3 w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none" />
                            )}
                        </div>

                        {/* Cancel */}
                        <div className={`border rounded-xl p-3 transition-colors ${isCancelled ? 'border-red-300 bg-red-50' : 'border-red-100 bg-red-50/50'}`}>
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input type="checkbox" checked={isCancelled} onChange={(e) => {
                                    setIsCancelled(e.target.checked);
                                    if (e.target.checked) {
                                        setIsCash(false); setIsOnline(false); setIsCheq(false); setIsPending(false);
                                    }
                                }} className="w-5 h-5 text-red-600 rounded border-red-300 focus:ring-red-500" />
                                <span className="font-medium text-red-800">❌ Cancel (Refused)</span>
                            </label>
                            {isCancelled && (
                                <textarea placeholder="Reason for cancellation (Required) *" value={cancelRemark} onChange={(e) => setCancelRemark(e.target.value)} rows={2} className="mt-3 w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none" />
                            )}
                        </div>

                        {/* Notes */}
                        <div className="pt-2">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Additional Note <span className="text-slate-400 font-normal">(Optional)</span></label>
                            <textarea placeholder="E.g., Collected 200 for 10 units, refused 10 units..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none" />
                        </div>
                    </div>

                    {/* Integrated Footer (Inside Scroll Container) */}
                    <div className="pt-6 mt-4 border-t border-gray-100">
                        {!isCancelled && (
                            <div className="flex justify-between items-center mb-4 text-sm px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
                                <span className="text-slate-600 font-medium">Total: <span className="font-bold text-slate-900">{formatCurrency(totalCollected)}</span></span>
                                <span className="text-slate-600 font-medium">
                                    {difference < 0 ? "Overpaid:" : "Diff:"} <span className={`font-bold ${difference !== 0 ? (difference < 0 ? 'text-green-600' : 'text-orange-600') : 'text-slate-900'}`}>
                                        {formatCurrency(Math.abs(difference))}
                                    </span>
                                </span>
                            </div>
                        )}
                        <button onClick={handleSubmit} disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-colors shadow-md disabled:opacity-50">
                            {isLoading ? "Saving..." : (initialData ? "Update Payment" : "Save Payment")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}