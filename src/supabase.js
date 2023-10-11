import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://lvsbvjweppdlhmjuqqvt.supabase.co";
const supabaseKey = import.meta.env.VITE_APP_SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, supabaseKey);

export default supabase;
