declare module 'sql.js' {
  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number>) => Database
  }

  interface Database {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    run(sql: string, params?: any[]): void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    exec(sql: string, params?: any[]): QueryExecResult[]
    prepare(sql: string): Statement
    export(): Uint8Array
    close(): void
  }

  interface Statement {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bind(params?: any[]): boolean
    step(): boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getAsObject(): Record<string, any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get(params?: any[]): any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    run(params?: any[]): void
    free(): boolean
    reset(): void
  }

  interface QueryExecResult {
    columns: string[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    values: any[][]
  }

  export default function initSqlJs(): Promise<SqlJsStatic>
  export { Database, Statement, QueryExecResult, SqlJsStatic }
}
