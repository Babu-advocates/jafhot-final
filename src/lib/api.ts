/**
 * src/lib/api.ts
 * Central data-access layer for Neon DB.
 * All raw SQL lives here; components import typed functions only.
 *
 * Uses @neondatabase/serverless neon() HTTP driver.
 * Tagged-template queries: sql`SELECT ...`
 * Parameterised dynamic queries: sql.query('SELECT ...', [params])
 */
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = import.meta.env.VITE_DATABASE_URL;
if (!DATABASE_URL) throw new Error('VITE_DATABASE_URL is not set');

const sql = neon(DATABASE_URL);

// Helper for dynamic parameterised queries that returns .rows
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const query = async (text: string, params?: unknown[]): Promise<any[]> => {
  const result = await (sql as any).query(text, params);
  // neon().query returns a QueryResult object with .rows
  return result?.rows ?? result ?? [];
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  role: 'biller' | 'kitchen_manager';
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillItem {
  id: string;
  food_item_id: string;
  food_item_name: string;
  price: number;
  quantity: number;
  total: number;
}

export interface Bill {
  id: string;
  customer_name: string | null;
  mobile_last_digit: string;
  total: number;
  status: 'draft' | 'active' | 'completed';
  payment_mode: string | null;
  created_at: string;
  updated_at: string;
  bill_items: BillItem[];
}

export interface FoodCategory {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface FoodItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string;
  status: 'available' | 'unavailable';
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function verifyUserPassword(
  email: string,
  password: string
): Promise<Pick<Profile, 'id' | 'email' | 'role' | 'full_name'> | null> {
  const rows = await sql`
    SELECT user_id AS id, email, role, full_name
    FROM verify_user_password(${email}, ${password})
  `;
  if (!rows || rows.length === 0) return null;
  const r = rows[0];
  return { id: r.id, email: r.email, role: r.role as Profile['role'], full_name: r.full_name };
}

export async function signUpUser(
  email: string,
  password: string,
  fullName: string,
  role: string
): Promise<Pick<Profile, 'id' | 'email' | 'role' | 'full_name'>> {
  const rows = await sql`
    INSERT INTO public.profiles (email, password_hash, full_name, role)
    VALUES (${email}, public.crypt(${password}, public.gen_salt('bf')), ${fullName}, ${role})
    RETURNING id, email, role, full_name
  `;
  const r = rows[0];
  return { id: r.id, email: r.email, role: r.role as Profile['role'], full_name: r.full_name };
}

// ─── Bills – helpers ──────────────────────────────────────────────────────────

function mapBillItem(i: any): BillItem {
  return {
    id: i.id,
    food_item_id: i.food_item_id,
    food_item_name: i.food_item_name,
    price: Number(i.price),
    quantity: Number(i.quantity),
    total: Number(i.total),
  };
}

function mapBill(b: any, items: BillItem[] = []): Bill {
  return {
    id: b.id,
    customer_name: b.customer_name,
    mobile_last_digit: b.mobile_last_digit,
    total: Number(b.total),
    status: b.status as Bill['status'],
    payment_mode: b.payment_mode,
    created_at: b.created_at,
    updated_at: b.updated_at,
    bill_items: items,
  };
}

async function getItemsForBills(billIds: string[]): Promise<Record<string, BillItem[]>> {
  if (billIds.length === 0) return {};
  const rows = await sql`
    SELECT id, bill_id, food_item_id, food_item_name, price, quantity, total
    FROM public.bill_items
    WHERE bill_id = ANY(${billIds}::uuid[])
  `;
  const map: Record<string, BillItem[]> = {};
  for (const i of rows as any[]) {
    if (!map[i.bill_id]) map[i.bill_id] = [];
    map[i.bill_id].push(mapBillItem(i));
  }
  return map;
}

// ─── Bills – fetch ────────────────────────────────────────────────────────────

export async function fetchDraftBills(): Promise<Bill[]> {
  const rows = await sql`
    SELECT * FROM public.bills WHERE status = 'draft' ORDER BY updated_at DESC
  `;
  const ids = (rows as any[]).map((b) => b.id);
  const itemMap = await getItemsForBills(ids);
  return (rows as any[]).map((b) => mapBill(b, itemMap[b.id] || []));
}

export async function fetchActiveBills(): Promise<Bill[]> {
  const rows = await sql`
    SELECT * FROM public.bills WHERE status = 'active' ORDER BY created_at ASC
  `;
  const ids = (rows as any[]).map((b) => b.id);
  const itemMap = await getItemsForBills(ids);
  return (rows as any[]).map((b) => mapBill(b, itemMap[b.id] || []));
}

export interface FetchCompletedBillsArgs {
  search?: string;
  dateStart?: string;
  dateEnd?: string;
  page?: number;
  pageSize?: number;
}

export interface FetchCompletedBillsResult {
  bills: Bill[];
  total: number;
  totalSales: number;
}

export async function fetchCompletedBills({
  search = '',
  dateStart,
  dateEnd,
  page = 1,
  pageSize = 20,
}: FetchCompletedBillsArgs = {}): Promise<FetchCompletedBillsResult> {
  const conditions: string[] = ["status = 'completed'"];
  const params: unknown[] = [];
  let idx = 1;

  if (search.trim()) {
    conditions.push(`(mobile_last_digit ILIKE $${idx} OR customer_name ILIKE $${idx})`);
    params.push(`%${search.trim()}%`);
    idx++;
  }
  if (dateStart) { conditions.push(`created_at >= $${idx++}`); params.push(dateStart); }
  if (dateEnd)   { conditions.push(`created_at <= $${idx++}`); params.push(dateEnd); }

  const where = conditions.join(' AND ');

  const countRows = await query(
    `SELECT COUNT(*) AS total, COALESCE(SUM(total), 0) AS total_sales
     FROM public.bills WHERE ${where}`,
    params
  );
  const totalCount = Number(countRows[0].total);
  const totalSales = Number(countRows[0].total_sales);
  if (totalCount === 0) return { bills: [], total: 0, totalSales: 0 };

  const offset = (page - 1) * pageSize;
  const billRowsResult = await query(
    `SELECT * FROM public.bills WHERE ${where}
     ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, pageSize, offset]
  );

  const bills = billRowsResult as any[];
  const ids = bills.map((b) => b.id);
  const itemMap = await getItemsForBills(ids);

  return {
    bills: bills.map((b) => mapBill(b, itemMap[b.id] || [])),
    total: totalCount,
    totalSales,
  };
}

export async function getBillById(id: string): Promise<Bill | null> {
  const rows = await sql`SELECT * FROM public.bills WHERE id = ${id}`;
  if (!rows || rows.length === 0) return null;
  const items = await sql`SELECT * FROM public.bill_items WHERE bill_id = ${id}`;
  return mapBill(rows[0], (items as any[]).map(mapBillItem));
}

export async function getBillsByStatusAndMobile(
  status: string,
  mobileLastDigit: string
): Promise<Bill[]> {
  const rows = await sql`
    SELECT * FROM public.bills
    WHERE status = ${status} AND mobile_last_digit = ${mobileLastDigit}
  `;
  return (rows as any[]).map((b) => mapBill(b));
}

export async function getBillItemsByBillId(billId: string): Promise<BillItem[]> {
  const rows = await sql`SELECT * FROM public.bill_items WHERE bill_id = ${billId}`;
  return (rows as any[]).map(mapBillItem);
}

// ─── Bills – write ────────────────────────────────────────────────────────────

export interface NewBillItemInput {
  food_item_id: string;
  food_item_name: string;
  price: number;
  quantity: number;
  total: number;
}

export async function createBill(
  data: {
    customer_name: string | null;
    mobile_last_digit: string;
    total: number;
    status: 'draft' | 'active' | 'completed';
    payment_mode?: string | null;
  },
  items: NewBillItemInput[]
): Promise<Bill> {
  const rows = await sql`
    INSERT INTO public.bills (customer_name, mobile_last_digit, total, status, payment_mode)
    VALUES (${data.customer_name}, ${data.mobile_last_digit}, ${data.total}, ${data.status}, ${data.payment_mode ?? null})
    RETURNING *
  `;
  const bill = rows[0] as any;
  await insertBillItems(bill.id, items);
  const savedItems = await sql`SELECT * FROM public.bill_items WHERE bill_id = ${bill.id}`;
  return mapBill(bill, (savedItems as any[]).map(mapBillItem));
}

export async function updateBill(
  id: string,
  data: Partial<{
    customer_name: string | null;
    mobile_last_digit: string;
    total: number;
    status: 'draft' | 'active' | 'completed';
    payment_mode: string | null;
  }>
): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if ('customer_name' in data)    { sets.push(`customer_name = $${idx++}`);    params.push(data.customer_name); }
  if ('mobile_last_digit' in data){ sets.push(`mobile_last_digit = $${idx++}`); params.push(data.mobile_last_digit); }
  if ('total' in data)            { sets.push(`total = $${idx++}`);            params.push(data.total); }
  if ('status' in data)           { sets.push(`status = $${idx++}`);           params.push(data.status); }
  if ('payment_mode' in data)     { sets.push(`payment_mode = $${idx++}`);     params.push(data.payment_mode); }

  if (sets.length === 0) return;
  params.push(id);
  await query(`UPDATE public.bills SET ${sets.join(', ')} WHERE id = $${idx}`, params);
}

export async function deleteBill(id: string): Promise<void> {
  await sql`DELETE FROM public.bills WHERE id = ${id}`;
}

export async function replaceBillItems(billId: string, items: NewBillItemInput[]): Promise<void> {
  await sql`DELETE FROM public.bill_items WHERE bill_id = ${billId}`;
  await insertBillItems(billId, items);
}

export async function insertBillItems(billId: string, items: NewBillItemInput[]): Promise<void> {
  for (const item of items) {
    await sql`
      INSERT INTO public.bill_items (bill_id, food_item_id, food_item_name, price, quantity, total)
      VALUES (${billId}, ${item.food_item_id}, ${item.food_item_name}, ${item.price}, ${item.quantity}, ${item.total})
    `;
  }
}

export async function deleteBillItems(billId: string): Promise<void> {
  await sql`DELETE FROM public.bill_items WHERE bill_id = ${billId}`;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export interface DashboardStats {
  todaySales: number;
  weeklySales: number;
  monthlySales: number;
  todayOrders: number;
  weeklyOrders: number;
  monthlyOrders: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(now); weekStart.setDate(now.getDate() + diffToMonday); weekStart.setHours(0,0,0,0);
  const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6); weekEnd.setHours(23,59,59,999);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

  const rows = await sql`
    SELECT
      COALESCE(SUM(CASE WHEN created_at >= ${todayStart}::timestamptz AND created_at <= ${todayEnd}::timestamptz THEN total ELSE 0 END), 0)          AS today_sales,
      COUNT(CASE WHEN created_at >= ${todayStart}::timestamptz AND created_at <= ${todayEnd}::timestamptz THEN 1 END)::int                             AS today_orders,
      COALESCE(SUM(CASE WHEN created_at >= ${weekStart.toISOString()}::timestamptz AND created_at <= ${weekEnd.toISOString()}::timestamptz THEN total ELSE 0 END), 0) AS weekly_sales,
      COUNT(CASE WHEN created_at >= ${weekStart.toISOString()}::timestamptz AND created_at <= ${weekEnd.toISOString()}::timestamptz THEN 1 END)::int    AS weekly_orders,
      COALESCE(SUM(CASE WHEN created_at >= ${monthStart}::timestamptz AND created_at <= ${monthEnd}::timestamptz THEN total ELSE 0 END), 0)             AS monthly_sales,
      COUNT(CASE WHEN created_at >= ${monthStart}::timestamptz AND created_at <= ${monthEnd}::timestamptz THEN 1 END)::int                              AS monthly_orders
    FROM public.bills
    WHERE status = 'completed'
  `;

  const r = rows[0] as any;
  return {
    todaySales:    Number(r.today_sales),
    weeklySales:   Number(r.weekly_sales),
    monthlySales:  Number(r.monthly_sales),
    todayOrders:   Number(r.today_orders),
    weeklyOrders:  Number(r.weekly_orders),
    monthlyOrders: Number(r.monthly_orders),
  };
}

// ─── Food Categories ──────────────────────────────────────────────────────────

export async function fetchCategories(): Promise<FoodCategory[]> {
  const rows = await sql`SELECT * FROM public.food_categories ORDER BY name`;
  return rows as FoodCategory[];
}

export async function createCategory(name: string, description?: string): Promise<FoodCategory> {
  const rows = await sql`
    INSERT INTO public.food_categories (name, description)
    VALUES (${name}, ${description ?? null})
    RETURNING *
  `;
  return rows[0] as FoodCategory;
}

export async function updateCategory(id: string, data: { name?: string; description?: string | null }): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if ('name' in data)        { sets.push(`name = $${idx++}`);        params.push(data.name); }
  if ('description' in data) { sets.push(`description = $${idx++}`); params.push(data.description); }
  if (sets.length === 0) return;
  params.push(id);
  await query(`UPDATE public.food_categories SET ${sets.join(', ')} WHERE id = $${idx}`, params);
}

export async function deleteCategory(id: string): Promise<void> {
  await sql`DELETE FROM public.food_categories WHERE id = ${id}`;
}

// ─── Food Items ───────────────────────────────────────────────────────────────

export async function fetchFoodItems(): Promise<FoodItem[]> {
  const rows = await sql`SELECT * FROM public.food_items ORDER BY name`;
  return (rows as any[]).map((r) => ({ ...r, price: Number(r.price) }));
}

export async function createFoodItem(data: {
  name: string;
  description?: string | null;
  price: number;
  category_id: string;
  status?: 'available' | 'unavailable';
  image_url?: string | null;
}): Promise<FoodItem> {
  const rows = await sql`
    INSERT INTO public.food_items (name, description, price, category_id, status, image_url)
    VALUES (${data.name}, ${data.description ?? null}, ${data.price}, ${data.category_id}, ${data.status ?? 'available'}, ${data.image_url ?? null})
    RETURNING *
  `;
  const r = rows[0] as any;
  return { ...r, price: Number(r.price) };
}

export async function updateFoodItem(
  id: string,
  data: Partial<{ name: string; description: string | null; price: number; category_id: string; status: 'available' | 'unavailable'; image_url: string | null }>
): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if ('name' in data)        { sets.push(`name = $${idx++}`);        params.push(data.name); }
  if ('description' in data) { sets.push(`description = $${idx++}`); params.push(data.description); }
  if ('price' in data)       { sets.push(`price = $${idx++}`);       params.push(data.price); }
  if ('category_id' in data) { sets.push(`category_id = $${idx++}`); params.push(data.category_id); }
  if ('status' in data)      { sets.push(`status = $${idx++}`);      params.push(data.status); }
  if ('image_url' in data)   { sets.push(`image_url = $${idx++}`);   params.push(data.image_url); }
  if (sets.length === 0) return;
  params.push(id);
  await query(`UPDATE public.food_items SET ${sets.join(', ')} WHERE id = $${idx}`, params);
}

export async function deleteFoodItem(id: string): Promise<void> {
  await sql`DELETE FROM public.food_items WHERE id = ${id}`;
}
