import { useEffect, useState } from "react";
import { openDB } from "idb";

export function useIndexedDB() {
    const [db, setDb] = useState(null);

    useEffect(() => {
        let isMounted = true;

        (async () => {
            try {
                const instance = await openDB("parley-db", 1, {
                    upgrade(db) {
                        // Create object store for bills if doesn't exist
                        // keyPath: "id" (UUID from Supabase)
                        if (!db.objectStoreNames.contains("bills")) {
                            db.createObjectStore("bills", { keyPath: "id" });
                        }
                        // Create object store for pending updates if doesn't exist
                        // keyPath: "client_update_id" (UUID generated locally)
                        if (!db.objectStoreNames.contains("pending_updates")) {
                            db.createObjectStore("pending_updates", { keyPath: "client_update_id" });
                        }
                    },
                });
                if (isMounted) setDb(instance);
            } catch (err) {
                console.error("Failed to open IndexedDB:", err);
            }
        })();

        return () => {
            isMounted = false;
        };
    }, []);

    return {
        /**
         * Save multiple bills to IndexedDB (bulk)
         * @param {Array} bills - Array of bill objects from Supabase (with UUID ids)
         */
        saveBills: async (bills) => {
            if (!db) return;
            try {
                const tx = db.transaction("bills", "readwrite");
                for (const bill of bills) {
                    await tx.store.put(bill);
                }
                await tx.done;
            } catch (err) {
                console.error("Failed to save bills:", err);
            }
        },

        /**
         * Retrieve all bills from IndexedDB
         * @returns {Array} All bills stored
         */
        getBills: async () => {
            if (!db) return [];
            try {
                return await db.getAll("bills");
            } catch (err) {
                console.error("Failed to get bills:", err);
                return [];
            }
        },

        /**
         * Save a pending update to queue (optimistic)
         * @param {Object} update - Update object with client_update_id, bill_id, remark, note, updated_amount, created_at
         */
        savePendingUpdate: async (update) => {
            if (!db) return;
            try {
                await db.put("pending_updates", {
                    ...update,
                    created_at: update.created_at || new Date().toISOString(),
                });
            } catch (err) {
                console.error("Failed to save pending update:", err);
            }
        },

        /**
         * Retrieve all pending updates from queue
         * @returns {Array} All pending updates
         */
        getPendingUpdates: async () => {
            if (!db) return [];
            try {
                return await db.getAll("pending_updates");
            } catch (err) {
                console.error("Failed to get pending updates:", err);
                return [];
            }
        },

        /**
         * Clear a single pending update after successful sync
         * @param {String} client_update_id - UUID of the update (client_update_id)
         */
        clearPendingUpdate: async (client_update_id) => {
            if (!db) return;
            try {
                await db.delete("pending_updates", client_update_id);
            } catch (err) {
                console.error("Failed to clear pending update:", err);
            }
        },

        /**
         * Clear all pending updates (after bulk sync or manual cleanup)
         */
        clearAllPendingUpdates: async () => {
            if (!db) return;
            try {
                await db.clear("pending_updates");
            } catch (err) {
                console.error("Failed to clear all pending updates:", err);
            }
        },

        /**
         * Clear all bills (e.g., on logout or full refresh)
         */
        clearAllBills: async () => {
            if (!db) return;
            try {
                await db.clear("bills");
            } catch (err) {
                console.error("Failed to clear all bills:", err);
            }
        },
    };
}