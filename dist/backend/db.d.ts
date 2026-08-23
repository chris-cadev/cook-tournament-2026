import { Database as SqlJsDatabase } from 'sql.js';
export declare function getDb(): Promise<SqlJsDatabase>;
export declare function saveDb(): void;
export interface QueryResult {
    [key: string]: unknown;
}
export declare function queryAll(sql: string, params?: unknown[]): QueryResult[];
export declare function queryOne(sql: string, params?: unknown[]): QueryResult | undefined;
export declare function run(sql: string, params?: unknown[]): {
    lastInsertRowid: number;
    changes: number;
};
