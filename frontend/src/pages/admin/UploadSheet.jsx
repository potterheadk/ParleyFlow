import { useEffect, useState } from "react";
import { getOperatorsData, checkOperatorHasActiveData, clearOperatorData, uploadSheetToSupabase } from "../../api/supabaseApi.js";

export default function UploadSheet() {
    const [operators, setOperators] = useState([]);
    const [file, setFile] = useState(null);
    const [operatorId, setOperatorId] = useState("");
    const [routeName, setRouteName] = useState("");
    const [batchDate, setBatchDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [loading, setLoading] = useState(false);
    const [clearingData, setClearingData] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");
    const [operatorSearch, setOperatorSearch] = useState("");
    const [operatorHasData, setOperatorHasData] = useState(false);
    const [show409ClearPrompt, setShow409ClearPrompt] = useState(false);

    useEffect(() => {
        getOperatorsData().then((data) => setOperators(data || []));
    }, []);

    useEffect(() => {
        if (!operatorId) {
            setOperatorHasData(false);
            return;
        }
        checkOperatorHasActiveData(operatorId)
            .then((data) => setOperatorHasData(data.has_data))
            .catch(() => setOperatorHasData(false));
    }, [operatorId]);

    const filtered = operators.filter((o) =>
        o.full_name.toLowerCase().includes(operatorSearch.toLowerCase())
    );

    const selectedOperator = operators.find((o) => o.id === operatorId);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file || !operatorId || !routeName.trim() || !batchDate) {
            setError("All fields required.");
            return;
        }
        setLoading(true);
        setError("");
        setResult(null);
        setShow409ClearPrompt(false);

        try {
            const res = await uploadSheetToSupabase(file, operatorId, routeName.trim(), batchDate, false);
            setResult(res);
            setFile(null);
            setRouteName("");
            setOperatorId("");
            setOperatorSearch("");
            setShow409ClearPrompt(false);
        } catch (err) {
            const detail = err.message || "Import failed.";
            if (detail.includes("CONFLICT_ROUTE")) {
                setError(detail.replace("CONFLICT_ROUTE: ", ""));
                setShow409ClearPrompt(true);
            } else {
                setError(detail);
                setShow409ClearPrompt(false);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClearData = async () => {
        if (!window.confirm(`Clear all data for ${selectedOperator?.full_name}? This cannot be undone.`)) {
            return;
        }

        setClearingData(true);
        try {
            await clearOperatorData(operatorId);
            setError("");
            setResult({
                message: `Data cleared for ${selectedOperator?.full_name}. You can now assign them a new route.`,
                cleared: true,
            });
            setShow409ClearPrompt(false);
            setOperatorId("");
            setOperatorSearch("");
            setRouteName("");
            setOperatorHasData(false);
        } catch (err) {
            setError(err.message || "Failed to clear operator data.");
        } finally {
            setClearingData(false);
        }
    };

    return (
        <div className="max-w-lg mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Upload Sheet</h1>
                <p className="text-slate-500 text-sm mt-1">Import XLSX from Parley and assign to a delivery person</p>
            </div>

            {result && !result.cleared && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                    <div className="text-green-800 font-semibold text-sm">✅ Import Successful</div>
                    <div className="mt-2 space-y-1 text-sm text-green-700">
                        <div>Bills imported: <strong>{result.inserted_count}</strong></div>
                        {result.skipped_duplicates > 0 && (
                            <div className="text-green-600">Duplicates skipped: <strong>{result.skipped_duplicates}</strong></div>
                        )}
                        <div>Route Name: <strong>{result.route_name}</strong></div>
                        <div className="font-mono text-xs text-green-600 mt-1">Batch: {result.batch_code}</div>
                    </div>
                </div>
            )}

            {result?.cleared && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
                    <div className="text-yellow-800 font-semibold text-sm">✓ Data Cleared</div>
                    <div className="mt-2 text-sm text-yellow-700">{result.message}</div>
                </div>
            )}

            {error && show409ClearPrompt && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-3">
                    <div className="text-red-800 font-semibold text-sm">⚠️ Route Assignment Conflict</div>
                    <div className="text-red-700 text-sm">{error}</div>
                    <button
                        type="button"
                        onClick={handleClearData}
                        disabled={clearingData}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm disabled:opacity-50"
                    >
                        {clearingData ? "Clearing..." : "🗑️ Clear All Data & Retry"}
                    </button>
                    <p className="text-xs text-red-600">This will deactivate all current deliveries for <strong>{selectedOperator?.full_name}</strong>.</p>
                </div>
            )}

            {error && !show409ClearPrompt && (
                <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-2xl border border-red-200">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">1. Upload XLSX File</label>
                    <div
                        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${file ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
                        onClick={() => document.getElementById("xlsx-input").click()}
                    >
                        {file ? (
                            <div>
                                <div className="text-blue-700 font-medium text-sm">{file.name}</div>
                                <div className="text-xs text-blue-500 mt-1">{(file.size / 1024).toFixed(1)} KB</div>
                            </div>
                        ) : (
                            <div>
                                <div className="text-3xl mb-2">📄</div>
                                <div className="text-sm text-slate-500">Click to choose XLSX file</div>
                            </div>
                        )}
                        <input id="xlsx-input" type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">2. Select Delivery Person</label>
                    <input
                        type="text"
                        value={operatorSearch}
                        onChange={(e) => {
                            setOperatorSearch(e.target.value);
                            setOperatorId("");
                        }}
                        placeholder="Search delivery person name..."
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                    />
                    {operatorSearch && !operatorId && (
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            {filtered.length === 0 ? (
                                <div className="px-4 py-3 text-sm text-slate-400">No delivery persons found</div>
                            ) : (
                                filtered.map((o) => (
                                    <button
                                        type="button"
                                        key={o.id}
                                        onClick={() => {
                                            setOperatorId(o.id);
                                            setOperatorSearch(o.full_name);
                                        }}
                                        className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                                    >
                                        <span className="font-medium">{o.full_name}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                    {operatorId && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl text-sm text-blue-700">
                            <span>✓</span>
                            <span>{operators.find((o) => o.id === operatorId)?.full_name}</span>
                            {operatorHasData && <span className="ml-auto text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Has active data</span>}
                            <button type="button" onClick={() => { setOperatorId(""); setOperatorSearch(""); setShow409ClearPrompt(false); }} className="ml-auto text-blue-400 hover:text-blue-700">✕</button>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">3. Route Name</label>
                    <input type="text" value={routeName} onChange={(e) => setRouteName(e.target.value)} placeholder="e.g. Ganesh Colony" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">4. Batch Date</label>
                    <input type="date" value={batchDate} onChange={(e) => setBatchDate(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>

                <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
                    {loading ? "Importing..." : "Assign Route & Import Bills"}
                </button>
            </form>
        </div>
    );
}