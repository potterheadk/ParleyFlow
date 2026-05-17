import { useEffect, useState, useCallback } from "react";

export function useOffline() {
    const [isOffline, setIsOffline] = useState(() => !navigator.onLine);
    const [onReconnect, setOnReconnect] = useState(null);

    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            // Trigger reconnect callback if set
            if (onReconnect) {
                onReconnect();
            }
        };

        const handleOffline = () => {
            setIsOffline(true);
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, [onReconnect]);

    return {
        isOffline,
        setOnReconnect,
    };
}
