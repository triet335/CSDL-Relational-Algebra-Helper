export interface ColumnInfo {
  name: string;
  type: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
}

export interface TableSchema {
  tableName: string;
  columns: ColumnInfo[];
}

export interface DatabaseSchema {
  tables: TableSchema[];
  rawText?: string;
}

export interface QueryResult {
  columns: string[];
  values: any[][];
  rowCount: number;
  executionTimeMs: number;
  sqlQuery: string;
  error?: string;
}

export interface TranspileResult {
  status: 'success' | 'error';
  sql?: string;
  error_message?: string;
}

export interface PracticeQuestion {
  id: string;
  question: string;
  difficulty: 'Dễ' | 'Trung bình' | 'Khó';
  hint?: string;
  expectedSql: string;
  sampleRelationalAlgebra?: string;
}

export interface VerificationResult {
  isCorrect: boolean;
  feedback: string;
  userRowCount: number;
  expectedRowCount: number;
  userColumns: string[];
  expectedColumns: string[];
  comparisonDetail?: string;
}

export interface PresetSchema {
  id: string;
  name: string;
  description: string;
  schemaText: string;
  mockSql: string;
  sampleQuestions: PracticeQuestion[];
}
