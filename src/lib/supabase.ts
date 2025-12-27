import { createClient, SupabaseClient } from '@supabase/supabase-js';

// These should be in your .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isValidSupabaseConfig = () => {
    return supabaseUrl !== '' && supabaseAnonKey !== '' && supabaseUrl.startsWith('http');
};

// Only create Supabase client if valid credentials are provided
// Otherwise, export null (app will use localStorage instead)
let supabaseClient: SupabaseClient | null = null;

if (isValidSupabaseConfig()) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = supabaseClient;
