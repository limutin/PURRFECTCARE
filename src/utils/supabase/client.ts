import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, publicAnonKey } from './info';

export const supabase = createClient(supabaseUrl, publicAnonKey);
