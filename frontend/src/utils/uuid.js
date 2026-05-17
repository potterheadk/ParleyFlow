/**
 * Safe UUID generator for mobile/Capacitor contexts.
 * Uses crypto.randomUUID if available and in a secure context,
 * otherwise falls back to a math-based UUIDv4 generator.
 */
export function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        try {
            return crypto.randomUUID();
        } catch (e) {
            // Fallback if it throws an error in an unexpected context
            console.warn("crypto.randomUUID() failed, using fallback.");
        }
    }

    // Fallback UUID v4 generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}