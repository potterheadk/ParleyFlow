import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { useIndexedDB } from "../../hooks/useIndexedDB.js";
import { getOperatorBills } from "../../api/supabaseApi.js";
import { formatCurrency } from "../../utils/formatters.js";

function debounce(fn, delay) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

export default function Search() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [allBills, setAllBills] = useState([]);

    const idb = useIndexedDB();

    // Load decorated bills on mount
    useEffect(() => {
        const loadBills = async () => {
            try {
                // Supabase fetch which includes has_update, latest_remark
                const data = await getOperatorBills();
                if (data && data.bills) {
                    setAllBills(data.bills);
                } else {
                    const cachedBills = await idb.getBills();
                    setAllBills(cachedBills || []);
                }
            } catch (err) {
                console.warn("Failed to load bills for search via API, trying cache:", err);
                // Fallback to IndexedDB
                const cachedBills = await idb.getBills();
                setAllBills(cachedBills || []);
            }
        };

        loadBills();
    }, [idb]);

    const doSearch = useCallback(
        debounce((q) => {
            if (!q.trim()) {
                setResults([]);
                setSearched(false);
                return;
            }

            const lowerQ = q.toLowerCase();
            const filtered = allBills.filter(
                (b) =>
                    (b.retailer_name && b.retailer_name.toLowerCase().includes(lowerQ)) ||
                    (b.bill_no && b.bill_no.toLowerCase().includes(lowerQ))
            );
            setResults(filtered);
            setSearched(true);
        }, 300),
        [allBills]
    );

    const handleChange = (e) => {
        setQuery(e.target.value);
        doSearch(e.target.value);
    };

    const getStatusStyles = (bill) => {
        if (!bill.has_update) return "bg-white hover:bg-gray-50 border-transparent text-slate-400";

        const remark = (bill.latest_remark || "").toLowerCase();
        if (remark.includes("cancel") || remark.includes("refused")) {
            return "bg-red-50 hover:bg-red-100 border-red-100 text-red-600";
        }
        if (remark.includes("pending")) {
            return "bg-amber-50 hover:bg-amber-100 border-amber-100 text-amber-600";
        }
        return "bg-emerald-50 hover:bg-emerald-100 border-emerald-100 text-emerald-600";
    };

    return (
        <div>
            {/* Search bar */}
            <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-10">
                <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                    <input
                        type="text"
                        value={query}
                        onChange={handleChange}
                        placeholder="Search retailer or bill no..."
                        autoFocus
                        className="w-full pl-9 pr-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors shadow-inner"
                    />
                    {loading && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">...</span>
                    )}
                </div>
            </div>

            {/* Results */}
            <div className="divide-y divide-gray-100">
                {!searched && !loading && (
                    <div className="py-20 text-center px-4">
                        <div className="text-3xl mb-3">🔍</div>
                        <div className="text-slate-500 font-medium">Type to search your bills</div>
                        <div className="text-slate-400 text-xs mt-1">Look up by store name or bill number</div>
                    </div>
                )}

                {searched && results.length === 0 && !loading && (
                    <div className="py-20 text-center px-4">
                        <div className="text-3xl mb-3">🤷</div>
                        <div className="text-slate-600 font-medium">No results found</div>
                        <div className="text-slate-400 text-xs mt-1">Try a different name or bill number</div>
                    </div>
                )}

                {results.map((b) => {
                    const statusClass = getStatusStyles(b);
                    return (
                        <Link
                            key={b.id}
                            to={`/operator/bills/${b.id}`}
                            className={`flex items-center justify-between px-4 py-4 border-l-4 transition-colors ${statusClass}`}
                        >
                            <div>
                                <div className="font-medium text-slate-900 text-sm">{b.retailer_name}</div>
                                <div className="text-xs text-slate-500 font-mono mt-0.5">{b.bill_no}</div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-slate-900 text-sm">{formatCurrency(b.original_amount)}</div>
                                <div className="text-xs font-medium mt-0.5 opacity-80">
                                    {b.has_update ? "Updated ✓" : "Pending"}
                                </div>
                            </div>
                        </Link>
                    )
                })}
            </div>
        </div>
    );
}