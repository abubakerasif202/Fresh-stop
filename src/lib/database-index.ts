/** Metadata only: no row data or credentials belong in this schema comparison. */
export interface DatabaseIndex {
  table_name: string;
  index_name: string;
  columns: string[];
  is_unique: boolean;
  is_primary: boolean;
  is_valid: boolean;
  is_ready: boolean;
  is_partial: boolean;
  access_method: string;
  key_count: number;
}
export interface DeclaredIndex { columns: string[]; unique: boolean; primary?: boolean }

export function matchesDeclaredIndex(actual: DatabaseIndex, expected: DeclaredIndex): boolean {
  return actual.is_valid && actual.is_ready && !actual.is_partial && actual.access_method === "btree"
    && actual.key_count === expected.columns.length
    && JSON.stringify(actual.columns) === JSON.stringify(expected.columns)
    && (!expected.unique || actual.is_unique) && (!expected.primary || actual.is_primary);
}
