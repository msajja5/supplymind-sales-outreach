import { createClient } from '@supabase/supabase-js'

const url: string = (import.meta as any).env.VITE_SUPABASE_URL
const key: string = (import.meta as any).env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(url, key)
