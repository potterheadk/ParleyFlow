/**
 * Convert username to email format for Supabase Auth
 * 
 * Rules:
 * - If input contains "@", use it as-is (already an email)
 * - Otherwise, append @{LOGIN_EMAIL_DOMAIN}
 * - Default domain: father-parley.local
 */

export function usernameToEmail(username) {
    if (!username) return ''

    // If already an email, return as-is
    if (username.includes('@')) {
        return username
    }

    const domain = import.meta.env.VITE_LOGIN_EMAIL_DOMAIN || 'father-parley.local'
    return `${username}@${domain}`
}

/**
 * Extract username from email
 */
export function emailToUsername(email) {
    if (!email) return ''
    const [username] = email.split('@')
    return username
}
