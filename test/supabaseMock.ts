/**
 * A chainable stand-in for the Supabase client.
 *
 * Built once rather than per test file. Without it every screen test rebuilds
 * `.select().eq().eq().single()` by hand, and those hand-rolled chains are where
 * screen suites rot: they encode the exact call shape, so any harmless
 * refactor of a query breaks a dozen unrelated tests.
 *
 * This mock resolves on the *table*, not on the call shape. A test says what
 * rows a table holds; how the code reaches them is the code's business.
 *
 *   setSession("user-1");
 *   setTable("profiles", [{ id: "user-1", level: 3 }]);
 *   setTableError("user_inventory", new Error("offline"));
 *
 *   expect(writesTo("profiles")).toEqual([{ level: 4 }]);
 */

import { supabase } from "@/utils/supabase";

type Row = Record<string, unknown>;

type Write = { op: "update" | "upsert" | "insert" | "delete"; payload?: Row };

let tables: Record<string, Row[]> = {};
let errors: Record<string, Error> = {};
let writes: Record<string, Write[]> = {};
let sessionUserId: string | null = null;

/** Rows a table returns for any read. */
export const setTable = (table: string, rows: Row[]) => {
  tables[table] = rows;
};

/** Makes every read of a table reject, simulating an offline or denied query. */
export const setTableError = (table: string, error: Error) => {
  errors[table] = error;
};

/** The signed-in user, or null for a signed-out client. */
export const setSession = (userId: string | null) => {
  sessionUserId = userId;
};

/** Payloads written to a table, in order. */
export const writesTo = (table: string): Write[] => writes[table] ?? [];

/** Clears all rows, errors, writes and the session. Call in beforeEach. */
export const resetSupabaseMock = () => {
  tables = {};
  errors = {};
  writes = {};
  sessionUserId = null;
};

const recordWrite = (table: string, write: Write) => {
  (writes[table] ??= []).push(write);
};

/**
 * One builder per `.from(table)` call.
 *
 * Every filter method returns the same object, so any chain length works, and
 * the object is thenable so a chain can be awaited at any point. `.single()`
 * narrows to the first row the way PostgREST does.
 */
const builder = (table: string) => {
  let single = false;

  const result = () => {
    const error = errors[table];
    if (error) return { data: null, error };
    const rows = tables[table] ?? [];
    return { data: single ? (rows[0] ?? null) : rows, error: null };
  };

  const chain: Record<string, unknown> = {
    // Reads. All no-ops that keep the chain going, because this mock resolves
    // on the table rather than on which filters were applied.
    select: () => chain,
    eq: () => chain,
    neq: () => chain,
    in: () => chain,
    gt: () => chain,
    gte: () => chain,
    lt: () => chain,
    lte: () => chain,
    like: () => chain,
    ilike: () => chain,
    is: () => chain,
    order: () => chain,
    limit: () => chain,
    range: () => chain,

    single: () => {
      single = true;
      return chain;
    },
    maybeSingle: () => {
      single = true;
      return chain;
    },

    // Writes. Recorded, then the chain continues so `.eq(...)` still resolves.
    update: (payload: Row) => {
      recordWrite(table, { op: "update", payload });
      return chain;
    },
    upsert: (payload: Row) => {
      recordWrite(table, { op: "upsert", payload });
      return chain;
    },
    insert: (payload: Row) => {
      recordWrite(table, { op: "insert", payload });
      return chain;
    },
    delete: () => {
      recordWrite(table, { op: "delete" });
      return chain;
    },

    // Awaiting the chain at any point resolves it, matching PostgREST.
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result()).then(resolve, reject),
  };

  return chain;
};

/** Wires the mocked client up to this state. Call once in beforeEach. */
export const installSupabaseMock = () => {
  resetSupabaseMock();

  (supabase.from as jest.Mock).mockImplementation((table: string) => builder(table));

  const auth = supabase.auth as unknown as Record<string, jest.Mock>;
  auth.getSession = jest.fn(async () => ({
    data: { session: sessionUserId ? { user: { id: sessionUserId } } : null },
    error: null,
  }));
  auth.getUser = jest.fn(async () => ({
    data: { user: sessionUserId ? { id: sessionUserId } : null },
    error: null,
  }));
  auth.signOut = jest.fn(async () => ({ error: null }));
  auth.onAuthStateChange = jest.fn(() => ({
    data: { subscription: { unsubscribe: jest.fn() } },
  }));
};
