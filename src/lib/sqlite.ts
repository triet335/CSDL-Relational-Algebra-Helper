import type { Database, SqlJsStatic } from 'sql.js';
import { ColumnInfo, QueryResult, TableSchema } from '../types';

let SQL: SqlJsStatic | null = null;
let dbInstance: Database | null = null;

/**
 * Tải hàm initSqlJs an toàn trong môi trường trình duyệt (tránh lỗi ESM bundler)
 */
async function loadInitSqlJs(): Promise<(config?: any) => Promise<SqlJsStatic>> {
  if (typeof window !== 'undefined' && (window as any).initSqlJs) {
    return (window as any).initSqlJs;
  }

  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      return reject(new Error('Chỉ hỗ trợ môi trường trình duyệt.'));
    }
    const script = document.createElement('script');
    script.src = '/sql-wasm.js';
    script.onload = () => {
      if ((window as any).initSqlJs) {
        resolve((window as any).initSqlJs);
      } else {
        reject(new Error('Không tìm thấy window.initSqlJs'));
      }
    };
    script.onerror = () => {
      // Fallback CDN nếu local không tải được
      const cdnScript = document.createElement('script');
      cdnScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm.js';
      cdnScript.onload = () => {
        if ((window as any).initSqlJs) {
          resolve((window as any).initSqlJs);
        } else {
          reject(new Error('Không tìm thấy window.initSqlJs từ CDN'));
        }
      };
      cdnScript.onerror = () => reject(new Error('Không thể nạp sql-wasm.js'));
      document.head.appendChild(cdnScript);
    };
    document.head.appendChild(script);
  });
}

/**
 * Khởi tạo sql.js WebAssembly engine
 */
export async function getSqlEngine(): Promise<SqlJsStatic> {
  if (SQL) return SQL;
  const init = await loadInitSqlJs();
  try {
    SQL = await init({
      locateFile: (file: string) => {
        return `/${file}`;
      }
    });
    return SQL;
  } catch (error) {
    console.error('Không thể nạp sql-wasm.wasm local, thử CDN:', error);
    SQL = await init({
      locateFile: () => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm.wasm`
    });
    return SQL;
  }
}

/**
 * Lấy hoặc khởi tạo instance SQLite Database trong RAM
 */
export async function getDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;
  const sql = await getSqlEngine();
  dbInstance = new sql.Database();
  return dbInstance;
}

/**
 * Reset database hoàn toàn mới trong RAM
 */
export async function resetDatabase(): Promise<Database> {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // ignore
    }
  }
  const sql = await getSqlEngine();
  dbInstance = new sql.Database();
  return dbInstance;
}

/**
 * Thực thi đoạn script SQL (DDL + DML)
 */
export async function executeSqlScript(script: string): Promise<void> {
  const db = await getDatabase();
  // sqlite exec có thể chạy nhiều câu lệnh ngăn cách bởi dấu chấm phẩy
  db.run(script);
}

/**
 * Thực thi một câu truy vấn SELECT và đo thời gian
 */
export async function executeQuery(sqlQuery: string): Promise<QueryResult> {
  const startTime = performance.now();
  try {
    const db = await getDatabase();
    const results = db.exec(sqlQuery);
    const endTime = performance.now();
    const executionTimeMs = Math.round((endTime - startTime) * 100) / 100;

    if (!results || results.length === 0) {
      return {
        columns: [],
        values: [],
        rowCount: 0,
        executionTimeMs,
        sqlQuery
      };
    }

    const first = results[0];
    return {
      columns: first.columns,
      values: first.values,
      rowCount: first.values.length,
      executionTimeMs,
      sqlQuery
    };
  } catch (err: any) {
    const endTime = performance.now();
    return {
      columns: [],
      values: [],
      rowCount: 0,
      executionTimeMs: Math.round((endTime - startTime) * 100) / 100,
      sqlQuery,
      error: err?.message || String(err)
    };
  }
}

/**
 * Lấy danh sách toàn bộ các bảng trong database (bỏ qua các bảng hệ thống của sqlite)
 */
export async function getAllTableNames(): Promise<string[]> {
  const db = await getDatabase();
  const res = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
  if (!res || res.length === 0) return [];
  return res[0].values.map((row) => String(row[0]));
}

/**
 * Lấy thông tin cấu trúc (columns, primary key, type) của các bảng
 */
export async function getDatabaseSchema(): Promise<TableSchema[]> {
  const db = await getDatabase();
  const tableNames = await getAllTableNames();
  const tables: TableSchema[] = [];

  for (const tableName of tableNames) {
    const res = db.exec(`PRAGMA table_info("${tableName}");`);
    const columns: ColumnInfo[] = [];

    if (res && res.length > 0) {
      // PRAGMA table_info trả về: cid, name, type, notnull, dflt_value, pk
      for (const row of res[0].values) {
        const colName = String(row[1]);
        const colType = String(row[2] || 'TEXT');
        const isPk = Number(row[5]) > 0;
        columns.push({
          name: colName,
          type: colType,
          isPrimaryKey: isPk,
          isForeignKey: colName.startsWith('#') || colName.toLowerCase().startsWith('ma')
        });
      }
    }

    tables.push({
      tableName,
      columns
    });
  }

  return tables;
}

/**
 * Lấy dữ liệu của 1 bảng để preview
 */
export async function getTableData(tableName: string, limit = 50): Promise<QueryResult> {
  return executeQuery(`SELECT * FROM "${tableName}" LIMIT ${limit};`);
}
