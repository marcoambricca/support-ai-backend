import { createClient } from '@supabase/supabase-js';
import { encrypt } from '../utils/encryption.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Generic SELECT by field
export async function findOneByField(table, field, value) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq(field, value)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// Generic INSERT (supports encryption on specified fields)
export async function insertRow(table, row, options = {}) {
  const encryptedRow = { ...row };

  if (options.encryptFields) {
    for (const field of options.encryptFields) {
      if (row[field]) {
        encryptedRow[field] = encrypt(row[field]);
      }
    }
  }

  const { data, error } = await supabase
    .from(table)
    .insert([encryptedRow])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Generic UPDATE by field
export async function updateRowByFields(table, filters, updates) {
  let query = supabase.from(table).update(updates);

  for (const [field, value] of Object.entries(filters)) {
    query = query.eq(field, value);
  }

  const { data, error } = await query.select().single();

  if (error) throw error;
  return data;
}

export async function findManyByFields(table, filters, options = {}) {
  let query = supabase.from(table).select('*');

  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });

  if (options.order) {
    query = query.order(options.order, { ascending: options.ascending ?? true });
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data } = await query;
  return data || [];
}

export async function findAll(table) {
  const { data, error } = await supabase.from(table).select('*');
  if (error) {
    console.error('Supabase findAll error:', error);
    throw error;
  }
  console.log(`findAll from ${table} returned:`, data);
  return data;
}
