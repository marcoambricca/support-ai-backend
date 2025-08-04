import { createClient } from "@supabase/supabase-js";
import { encrypt } from "../utils/encryption.js";
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.",
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Finds a single row in a table by matching a field with a specific value.
 * 
 * @param {string} table - The name of the table to query.
 * @param {string} field - The field to filter by.
 * @param {any} value - The value to match for the specified field.
 * @returns {Promise<Object|null>} - Returns the matching row or null if not found.
 */
export async function findOneByField(table, field, value) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq(field, value)
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

/**
 * Inserts a new row into a table. Optionally encrypts specified fields before insert.
 * 
 * @param {string} table - The name of the table to insert into.
 * @param {Object} row - The row data to insert.
 * @param {Object} [options={}] - Optional settings.
 * @param {string[]} [options.encryptFields] - List of field names to encrypt before insert.
 * @returns {Promise<Object>} - Returns the inserted row.
 */
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

/**
 * Updates a row in a table based on filter conditions.
 * 
 * @param {string} table - The name of the table to update.
 * @param {Object} filters - Key-value pairs to match the row(s) for updating.
 * @param {Object} updates - Key-value pairs representing fields to update.
 * @returns {Promise<Object>} - Returns the updated row.
 */
export async function updateRowByFields(table, filters, updates) {
  let query = supabase.from(table).update(updates);

  for (const [field, value] of Object.entries(filters)) {
    query = query.eq(field, value);
  }

  const { data, error } = await query.select().single();

  if (error) throw error;
  return data;
}

/**
 * Finds multiple rows in a table matching specific field filters.
 * 
 * @param {string} table - The name of the table to query.
 * @param {Object} filters - Key-value pairs used as filters.
 * @param {Object} [options={}] - Optional query modifiers.
 * @param {string} [options.order] - Field name to order the results by.
 * @param {boolean} [options.ascending=true] - Whether the ordering should be ascending.
 * @param {number} [options.limit] - Maximum number of rows to return.
 * @returns {Promise<Object[]>} - Array of matching rows (empty if none).
 */
export async function findManyByFields(table, filters, options = {}) {
  let query = supabase.from(table).select("*");

  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });

  if (options.order) {
    query = query.order(options.order, {
      ascending: options.ascending ?? true,
    });
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data } = await query;
  return data || [];
}

/**
 * Retrieves all rows from a specified table.
 * 
 * @param {string} table - The name of the table to query.
 * @returns {Promise<Object[]>} - Array of all rows in the table.
 * @throws {Error} - If the query fails.
 */
export async function findAll(table) {
  const { data, error } = await supabase.from(table).select("*");
  if (error) {
    console.error("Supabase findAll error:", error);
    throw error;
  }
  console.log(`findAll from ${table} returned:`, data);
  return data;
}

