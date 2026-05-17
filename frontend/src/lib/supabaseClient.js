import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function getSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
}

export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
}