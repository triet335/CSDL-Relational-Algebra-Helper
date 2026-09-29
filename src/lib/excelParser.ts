import * as XLSX from 'xlsx';
import { ColumnInfo, TableSchema } from '../types';
import { executeSqlScript, resetDatabase } from './sqlite';

export interface ExcelImportResult {
  tables: TableSchema[];
  totalRows: number;
  sqlScript: string;
}

/**
 * Phân tích và nạp dữ liệu từ file Excel (.xlsx / .xls) vào SQLite RAM
 */
export async function parseAndLoadExcelFile(file: File): Promise<ExcelImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  // Reset database trước khi nạp dữ liệu mới
  await resetDatabase();

  const tables: TableSchema[] = [];
  let totalRows = 0;
  const sqlStatements: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    // Chuyển sheet sang dạng mảng các dòng (header: 1 để lấy dòng đầu làm mảng mảng)
    const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

    if (!rawData || rawData.length === 0) continue;

    // Chuẩn hóa tên bảng
    const sanitizedTableName = sheetName.trim().replace(/\s+/g, '_');

    // Dòng đầu tiên là tên cột
    const headerRow = rawData[0];
    const columns: ColumnInfo[] = [];
    const validColIndices: number[] = [];

    headerRow.forEach((col: any, idx: number) => {
      if (col !== null && col !== undefined && String(col).trim().length > 0) {
        const colName = String(col).trim().replace(/\s+/g, '_');
        columns.push({
          name: colName,
          type: 'TEXT', // sẽ được suy luận lại ở bước dưới
          isPrimaryKey: idx === 0,
          isForeignKey: colName.startsWith('#') || colName.toLowerCase().startsWith('ma')
        });
        validColIndices.push(idx);
      }
    });

    if (columns.length === 0) continue;

    // Thu thập các dòng dữ liệu (từ dòng 1 trở đi)
    const rows = rawData.slice(1).filter((r: any[]) => r && r.some(cell => cell !== null && cell !== ''));
    totalRows += rows.length;

    // Suy luận kiểu dữ liệu cho từng cột (INTEGER, REAL, TEXT)
    columns.forEach((col, cIdx) => {
      const origIdx = validColIndices[cIdx];
      let hasReal = false;
      let hasInt = false;
      let hasText = false;

      for (const row of rows) {
        const val = row[origIdx];
        if (val === null || val === undefined || val === '') continue;

        if (typeof val === 'number') {
          if (Number.isInteger(val)) {
            hasInt = true;
          } else {
            hasReal = true;
          }
        } else if (typeof val === 'string') {
          const num = Number(val);
          if (!isNaN(num) && val.trim() !== '') {
            if (Number.isInteger(num)) {
              hasInt = true;
            } else {
              hasReal = true;
            }
          } else {
            hasText = true;
          }
        } else {
          hasText = true;
        }
      }

      if (hasText) {
        col.type = 'TEXT';
      } else if (hasReal) {
        col.type = 'REAL';
      } else if (hasInt) {
        col.type = 'INTEGER';
      } else {
        col.type = 'TEXT';
      }
    });

    // Tạo câu lệnh CREATE TABLE
    const colDefs = columns.map(c => `"${c.name}" ${c.type}`).join(', ');
    sqlStatements.push(`CREATE TABLE "${sanitizedTableName}" (${colDefs});`);

    // Tạo các câu lệnh INSERT INTO
    for (const row of rows) {
      const valLiterals = validColIndices.map((origIdx, cIdx) => {
        const val = row[origIdx];
        const colType = columns[cIdx].type;

        if (val === null || val === undefined || val === '') {
          return 'NULL';
        }

        if (colType === 'INTEGER' || colType === 'REAL') {
          const num = Number(val);
          return isNaN(num) ? `'${String(val).replace(/'/g, "''")}'` : String(num);
        }

        // TEXT
        return `'${String(val).replace(/'/g, "''")}'`;
      });

      sqlStatements.push(
        `INSERT INTO "${sanitizedTableName}" (${columns.map(c => `"${c.name}"`).join(', ')}) VALUES (${valLiterals.join(', ')});`
      );
    }

    tables.push({
      tableName: sanitizedTableName,
      columns
    });
  }

  const fullSql = sqlStatements.join('\n');
  if (fullSql.trim()) {
    await executeSqlScript(fullSql);
  }

  return {
    tables,
    totalRows,
    sqlScript: fullSql
  };
}
