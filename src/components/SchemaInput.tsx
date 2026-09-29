import React, { useState, useRef } from 'react';
import { FileSpreadsheet, Sparkles, FileText, Upload, HelpCircle, Check, Loader2, AlertCircle } from 'lucide-react';
import { generateMockSqlData } from '../lib/gemini';
import { executeSqlScript, resetDatabase } from '../lib/sqlite';
import { parseAndLoadExcelFile } from '../lib/excelParser';
import { PRESET_SCHEMAS } from '../lib/schemaParser';

interface SchemaInputProps {
  currentSchemaText: string;
  onSchemaChange: (text: string) => void;
  onDatabaseUpdated: () => void;
  hasApi: boolean;
  onOpenApiKeyModal: () => void;
}

export const SchemaInput: React.FC<SchemaInputProps> = ({
  currentSchemaText,
  onSchemaChange,
  onDatabaseUpdated,
  hasApi,
  onOpenApiKeyModal
}) => {
  const [activeTab, setActiveTab] = useState<'text' | 'excel'>('text');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Xử lý tạo dữ liệu mẫu với AI
  const handleGenerateAiMockData = async () => {
    if (!currentSchemaText.trim()) {
      setStatusMessage({ type: 'error', text: 'Vui lòng nhập cấu trúc Schema trước khi sinh dữ liệu.' });
      return;
    }
    if (!hasApi) {
      onOpenApiKeyModal();
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);
    try {
      const generatedSql = await generateMockSqlData(currentSchemaText);
      await resetDatabase();
      await executeSqlScript(generatedSql);
      setStatusMessage({
        type: 'success',
        text: 'Đã sinh dữ liệu mô phỏng thành công và nạp vào SQLite RAM!'
      });
      onDatabaseUpdated();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Có lỗi xảy ra khi tạo dữ liệu mẫu với AI.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Nạp dữ liệu từ file Excel
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setStatusMessage(null);
    try {
      const result = await parseAndLoadExcelFile(file);
      // Tự động tạo lại chuỗi text schema từ các sheet của Excel
      const textSchema = result.tables
        .map(t => `${t.tableName} (${t.columns.map(c => (c.isForeignKey ? '#' : '') + c.name).join(', ')})`)
        .join('\n');

      onSchemaChange(textSchema);
      setStatusMessage({
        type: 'success',
        text: `Đã nạp ${result.tables.length} bảng với ${result.totalRows} bản ghi từ file Excel!`
      });
      onDatabaseUpdated();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Lỗi đọc file Excel: ${err?.message || err}`
      });
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Nạp nhanh preset mẫu offline
  const handleLoadPresetQuick = async (presetId: string) => {
    const preset = PRESET_SCHEMAS.find(p => p.id === presetId);
    if (!preset) return;

    setIsLoading(true);
    setStatusMessage(null);
    try {
      onSchemaChange(preset.schemaText);
      await resetDatabase();
      await executeSqlScript(preset.mockSql);
      setStatusMessage({
        type: 'success',
        text: `Đã nạp mẫu: "${preset.name}" thành công!`
      });
      onDatabaseUpdated();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Lỗi nạp preset.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden h-full flex flex-col">
      {/* Tab Switcher & Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 bg-slate-50/70">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'text'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Nhập Text Schema (CTU)</span>
          </button>
          <button
            onClick={() => setActiveTab('excel')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'excel'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Upload file Excel (.xlsx)</span>
          </button>
        </div>

        {/* Quick Presets */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
          <span className="text-[11px] font-medium text-slate-400">Nạp nhanh:</span>
          <button
            onClick={() => handleLoadPresetQuick('ctu-student')}
            className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium text-[11px] transition-colors"
          >
            QL Sinh viên
          </button>
          <button
            onClick={() => handleLoadPresetQuick('company-projects')}
            className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium text-[11px] transition-colors"
          >
            QL Đề án
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 space-y-4">
        {activeTab === 'text' ? (
          <div className="space-y-3">
            <div className="relative">
              <textarea
                value={currentSchemaText}
                onChange={(e) => onSchemaChange(e.target.value)}
                rows={5}
                placeholder={`SINHVIEN (MASV, hoten, namsinh, diachi, SDT, #ML)\nLOP (ML, tenlop)\nMONHOC (MM, tenmon, TC, LT, TH)\nKETQUA (#MASV, #MM, diem)`}
                className="w-full font-mono text-xs sm:text-sm bg-slate-900 text-emerald-300 rounded-xl p-3.5 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-y leading-relaxed shadow-inner"
              />
            </div>

            {/* Quick Syntax Helper */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
              <div className="flex items-center gap-1.5 text-slate-500">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>Quy ước CTU:</span>
                <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono text-[11px]">
                  TEN_BANG (KhoaChinh, ThuocTinh, #KhoaNgoai)
                </code>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateAiMockData}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-xs"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang sinh dữ liệu...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>AI Sinh Mock Data vào SQLite</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/80 transition-colors rounded-2xl p-8 text-center cursor-pointer"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">
                Kéo thả hoặc bấm để chọn file Excel (.xlsx / .xls)
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Mỗi <strong>Sheet</strong> tương ứng 1 bảng quan hệ. Dòng 1 chứa tên thuộc tính. Các dòng tiếp theo là các bản ghi dữ liệu.
              </p>
            </div>
          </div>
        )}

        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`flex items-start gap-2 p-3 rounded-xl text-xs font-medium animate-in fade-in duration-150 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>
    </div>
  );
};
