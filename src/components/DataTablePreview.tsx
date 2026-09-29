import React, { useState, useEffect } from 'react';
import { Table, Key, Link2, Database, RefreshCw, Layers } from 'lucide-react';
import { TableSchema, QueryResult } from '../types';
import { getTableData } from '../lib/sqlite';

interface DataTablePreviewProps {
  tables: TableSchema[];
  onRefresh: () => void;
}

export const DataTablePreview: React.FC<DataTablePreviewProps> = ({ tables, onRefresh }) => {
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableData, setTableData] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tables.length > 0) {
      if (!selectedTable || !tables.find(t => t.tableName === selectedTable)) {
        setSelectedTable(tables[0].tableName);
      }
    } else {
      setSelectedTable('');
      setTableData(null);
    }
  }, [tables]);

  useEffect(() => {
    if (selectedTable) {
      loadData(selectedTable);
    }
  }, [selectedTable]);

  const loadData = async (tableName: string) => {
    setLoading(true);
    try {
      const data = await getTableData(tableName);
      setTableData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const currentSchema = tables.find(t => t.tableName === selectedTable);

  if (tables.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <Database className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-700 mb-1">Chưa có bảng nào trong SQLite RAM</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Hãy nạp lược đồ mẫu, nhập text schema và bấm &quot;AI Sinh Mock Data&quot; hoặc upload file Excel để bắt đầu.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden h-full flex flex-col">
      {/* Header & Tabs */}
      <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Các bảng trong DB ({tables.length})</span>
          </div>

          <div className="flex flex-wrap items-center gap-1 ml-2">
            {tables.map(t => (
              <button
                key={t.tableName}
                onClick={() => setSelectedTable(t.tableName)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedTable === t.tableName
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {t.tableName}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            onRefresh();
            if (selectedTable) loadData(selectedTable);
          }}
          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
          title="Tải lại dữ liệu"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Schema Attributes Description Pills */}
      {currentSchema && (
        <div className="px-4 py-2.5 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase mr-1">Thuộc tính:</span>
          {currentSchema.columns.map(col => (
            <div
              key={col.name}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono border ${
                col.isPrimaryKey
                  ? 'bg-amber-50 text-amber-900 border-amber-300 font-semibold'
                  : col.isForeignKey
                  ? 'bg-purple-50 text-purple-900 border-purple-300'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              {col.isPrimaryKey && <Key className="w-3 h-3 text-amber-600 shrink-0" />}
              {col.isForeignKey && <Link2 className="w-3 h-3 text-purple-600 shrink-0" />}
              <span>{col.name}</span>
              <span className="text-[9px] text-slate-400 font-sans">({col.type})</span>
            </div>
          ))}
        </div>
      )}

      {/* Table Content View */}
      <div className="overflow-x-auto max-h-72">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Đang nạp dữ liệu bảng...</div>
        ) : tableData && tableData.columns.length > 0 ? (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10 backdrop-blur-sm">
                <th className="py-2 px-3 text-slate-400 w-10 text-center font-mono">#</th>
                {tableData.columns.map(colName => {
                  const colInfo = currentSchema?.columns.find(c => c.name === colName);
                  return (
                    <th key={colName} className="py-2.5 px-3 whitespace-nowrap font-mono">
                      <div className="flex items-center gap-1">
                        {colInfo?.isPrimaryKey && <Key className="w-3 h-3 text-amber-500" />}
                        {colInfo?.isForeignKey && <Link2 className="w-3 h-3 text-purple-500" />}
                        <span>{colName}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableData.values.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-blue-50/40 transition-colors">
                  <td className="py-1.5 px-3 text-slate-400 text-center font-mono text-[11px]">
                    {rIdx + 1}
                  </td>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="py-1.5 px-3 text-slate-800 whitespace-nowrap font-sans">
                      {cell === null || cell === undefined ? (
                        <span className="text-slate-300 italic text-[11px]">NULL</span>
                      ) : (
                        String(cell)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">Bảng này hiện chưa có bản ghi nào.</div>
        )}
      </div>

      {/* Footer Info */}
      {tableData && (
        <div className="px-4 py-2 bg-slate-50/70 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Bảng: <strong>{selectedTable}</strong></span>
          <span>Tổng cộng: <strong>{tableData.rowCount}</strong> bản ghi hiển thị</span>
        </div>
      )}
    </div>
  );
};
