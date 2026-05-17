export default function SyncStatus({ pendingCount = 0, isOffline = false, onSync = null }) {
    const handleSync = async () => {
        if (onSync) {
            await onSync();
        }
    };

    return (
        <div className="flex items-center gap-2">
            {/* Connection Indicator */}
            <div className="flex items-center gap-1.5">
                <span
                    className={`inline-block w-2 h-2 rounded-full ${isOffline ? "bg-orange-400" : "bg-green-400"
                        }`}
                ></span>
                <span className="text-xs font-medium text-slate-400">
                    {isOffline ? "Offline" : "Online"}
                </span>
            </div>

            {/* Pending Updates Badge + Sync Button */}
            {pendingCount > 0 && (
                <div className="flex items-center gap-1.5 ml-1 pl-1 border-l border-slate-700">
                    <span className="text-xs font-semibold text-orange-400">
                        {pendingCount} {pendingCount === 1 ? "update" : "updates"} pending
                    </span>
                    {!isOffline && onSync && (
                        <button
                            onClick={handleSync}
                            className="text-xs font-semibold px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        >
                            Sync
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
