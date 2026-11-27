// supabase.js — Supabase client for Qari (Auth + cloud user data).
// The anon key below is a PUBLIC client key: it is meant to be embedded in
// frontend code (it only works with the Row Level Security policies in the
// database). Never put the service_role key or the database password here.
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://edjwwljujcttvfoouyru.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkand3bGp1amN0dHZmb291eXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU4MDg0NTUsImV4cCI6MjExMTM4NDQ1NX0.Ak8g932_syIXdeOrW_1nWQPBjy_-K66S4PcXiQltiR8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
