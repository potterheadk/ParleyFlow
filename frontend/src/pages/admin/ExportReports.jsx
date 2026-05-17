import { useEffect, useState } from "react"; import {
    getOperatorsData,
    generatePaymentCollectionExcel
} from "../../api/supabaseApi.js";

export default function ExportReports() {
    const [operators, setOperators] =
        useState([]); const [paymentFilter, setPaymentFilter] = useState({
            operator_id:
                ""
        }); const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        getOperatorsData()
            .then((data) => setOperators(data || []))
            .catch(err => console.error("Failed to load operators:", err));
    }, []);

    const handlePaymentExport = async () => {
        setIsExporting(true);
        try {
            await generatePaymentCollectionExcel({
                operator_id: paymentFilter.operator_id || null
            });
        } catch (err) {
            console.error("Payment export error:", err);
            if (err.message && err.message.includes("No bills found")) {
                alert("No data found or available for this delivery person.");
            } else {
                alert("Failed to export payment data. Please try again.");
            }
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Payment Collection Export</h1>
                <p className="text-slate-500 text-sm mt-1">Download detailed payment collection reports</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-sm text-blue-900">
                        <strong>📋 Payment Collection Report</strong><br />
                        Export detailed payment collection data with columns: Bill No, Date, Retailer, Cash, Online, Cheque, Cash Pending, Cancelled, Remarks, and Difference calculation.
                    </p>
                </div>

                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Filter by Delivery Person (optional)</label>
                    <select
                        value={paymentFilter.operator_id}
                        onChange={(e) => setPaymentFilter({ operator_id: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Delivery Persons</option>
                        {operators.map((o) => (
                            <option key={o.id} value={o.id}>{o.full_name}</option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={handlePaymentExport}
                    disabled={isExporting}
                    className={`w-full text-white font-semibold py-3.5 rounded-xl text-sm transition-colors ${isExporting ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                        }`}
                >
                    {isExporting ? "⏳ Generating Excel..." : "💳 Download Payment Collection Report"}
                </button>
            </div>
        </div>
    );

}
