import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SchemaInput } from './components/SchemaInput';
import { DataTablePreview } from './components/DataTablePreview';
import { ExpressionEditor } from './components/ExpressionEditor';
import { ResultView } from './components/ResultView';
import { PracticeMode } from './components/PracticeMode';
import { ApiKeyModal } from './components/ApiKeyModal';
import { WorkspaceModal } from './components/WorkspaceModal';
import { TableSchema, QueryResult, PracticeQuestion } from './types';
import { getDatabaseSchema, executeSqlScript, resetDatabase, executeQuery } from './lib/sqlite';
import {
  Workspace,
  getAllWorkspaces,
  getActiveWorkspace,
  saveWorkspace,
  createNewWorkspace,
  duplicateWorkspace,
  deleteWorkspace,
  exportWorkspaceToFile,
  importWorkspaceFromFile,
  setActiveWorkspaceId
} from './lib/workspaceStorage';
import { hasApiKey, transpileRelationalAlgebra } from './lib/gemini';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'editor' | 'practice'>('practice');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState<boolean>(false);
  const [schemaText, setSchemaText] = useState<string>('');
  const [tables, setTables] = useState<TableSchema[]>([]);
  const [hasApi, setHasApi] = useState<boolean>(hasApiKey());
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);

  // Trạng thái của màn hình Soạn thảo tự do (Sandbox)
  const [expression, setExpression] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [transpiledSql, setTranspiledSql] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [transpileError, setTranspileError] = useState<string | null>(null);

  const hasInitializedRef = React.useRef(false);

  // Khởi tạo nạp Workspace bền vững khi mở app
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    const all = getAllWorkspaces();
    setWorkspaces(all);
    const active = getActiveWorkspace();
    setActiveWorkspace(active);
    loadWorkspaceIntoDb(active);
  }, []);

  const refreshSchema = async () => {
    try {
      const dbTables = await getDatabaseSchema();
      setTables(dbTables);
    } catch (e) {
      console.error('Lỗi lấy schema bảng:', e);
    }
  };

  const loadWorkspaceIntoDb = async (ws: Workspace) => {
    try {
      setSchemaText(ws.schemaText);
      setExpression(ws.currentExpression || (ws.questions?.[0]?.sampleRelationalAlgebra || ''));
      await resetDatabase();
      if (ws.mockSql && ws.mockSql.trim()) {
        await executeSqlScript(ws.mockSql);
      }
      await refreshSchema();
      setTranspiledSql(null);
      setQueryResult(null);
      setTranspileError(null);
    } catch (err) {
      console.error('Lỗi nạp database từ workspace:', err);
    }
  };

  const handleSelectWorkspace = async (id: string) => {
    const all = getAllWorkspaces();
    const target = all.find(w => w.id === id);
    if (!target) return;
    setActiveWorkspaceId(id);
    setActiveWorkspace(target);
    await loadWorkspaceIntoDb(target);
    setIsWorkspaceModalOpen(false);
  };

  const handleCreateWorkspace = async (name: string, description?: string) => {
    const newWs = createNewWorkspace(name, description);
    const all = getAllWorkspaces();
    setWorkspaces(all);
    setActiveWorkspace(newWs);
    await loadWorkspaceIntoDb(newWs);
    setIsWorkspaceModalOpen(false);
  };

  const handleDuplicateWorkspace = async (id: string, newName?: string) => {
    const dup = duplicateWorkspace(id, newName);
    if (dup) {
      const all = getAllWorkspaces();
      setWorkspaces(all);
      setActiveWorkspace(dup);
      await loadWorkspaceIntoDb(dup);
      setIsWorkspaceModalOpen(false);
    }
  };

  const handleDeleteWorkspace = async (id: string) => {
    const { remainingWorkspaces, newActiveId } = deleteWorkspace(id);
    setWorkspaces(remainingWorkspaces);
    const newActive = remainingWorkspaces.find(w => w.id === newActiveId) || remainingWorkspaces[0];
    setActiveWorkspace(newActive);
    await loadWorkspaceIntoDb(newActive);
  };

  const handleExportWorkspace = (ws: Workspace) => {
    const toExport = ws.id === activeWorkspace?.id
      ? { ...ws, schemaText, currentExpression: expression }
      : ws;
    exportWorkspaceToFile(toExport);
  };

  const handleImportWorkspace = async (file: File) => {
    const imported = await importWorkspaceFromFile(file);
    const all = getAllWorkspaces();
    setWorkspaces(all);
    setActiveWorkspace(imported);
    await loadWorkspaceIntoDb(imported);
    setIsWorkspaceModalOpen(false);
  };

  const handleSchemaChange = (newText: string) => {
    setSchemaText(newText);
    if (activeWorkspace) {
      const updated = { ...activeWorkspace, schemaText: newText, updatedAt: Date.now() };
      setActiveWorkspace(updated);
      saveWorkspace(updated);
      setWorkspaces(prev => prev.map(w => w.id === updated.id ? updated : w));
    }
  };

  const handleUpdateQuestions = (newQuestions: PracticeQuestion[]) => {
    if (activeWorkspace) {
      const updated = { ...activeWorkspace, questions: newQuestions, updatedAt: Date.now() };
      setActiveWorkspace(updated);
      saveWorkspace(updated);
      setWorkspaces(prev => prev.map(w => w.id === updated.id ? updated : w));
    }
  };

  const handleResetDb = async () => {
    if (!activeWorkspace) return;
    if (window.confirm(`Bạn có chắc muốn nạp lại dữ liệu gốc của không gian "${activeWorkspace.name}" không?`)) {
      await loadWorkspaceIntoDb(activeWorkspace);
    }
  };

  // Thực thi truy vấn ĐSQH ở màn hình Soạn thảo tự do
  const handleExecuteQuery = async () => {
    if (!expression.trim()) return;

    setIsExecuting(true);
    setTranspileError(null);
    setTranspiledSql(null);
    setQueryResult(null);

    try {
      // 1. Dịch ĐSQH -> SQL qua Gemini AI (hoặc local fallback nếu offline)
      const transpileResult = await transpileRelationalAlgebra(schemaText, expression);

      if (transpileResult.status === 'error' || !transpileResult.sql) {
        setTranspileError(transpileResult.error_message || 'Không thể dịch biểu thức này.');
        setIsExecuting(false);
        return;
      }

      setTranspiledSql(transpileResult.sql);

      // 2. Thực thi câu SQL vừa dịch trong sql.js RAM
      const result = await executeQuery(transpileResult.sql);
      setQueryResult(result);
    } catch (err: any) {
      setTranspileError(err?.message || String(err));
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Header Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasApi={hasApi}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        activeWorkspaceName={activeWorkspace?.name || 'Đang tải...'}
        onOpenWorkspaceModal={() => setIsWorkspaceModalOpen(true)}
        onQuickExport={() => activeWorkspace && handleExportWorkspace(activeWorkspace)}
        tableCount={tables.length}
        onResetDb={handleResetDb}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {activeTab === 'editor' ? (
          <>
            {/* Hàng 1: Nhập dữ liệu Schema & Xem dữ liệu các bảng trong RAM */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-5 flex flex-col">
                <SchemaInput
                  currentSchemaText={schemaText}
                  onSchemaChange={handleSchemaChange}
                  onDatabaseUpdated={refreshSchema}
                  hasApi={hasApi}
                  onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
                />
              </div>
              <div className="lg:col-span-7 flex flex-col">
                <DataTablePreview tables={tables} onRefresh={refreshSchema} />
              </div>
            </div>

            {/* Hàng 2: Khung Soạn thảo ĐSQH + Bàn phím ảo + KaTeX Live Preview */}
            <ExpressionEditor
              expression={expression}
              onChange={(expr) => {
                setExpression(expr);
                if (activeWorkspace) {
                  const updated = { ...activeWorkspace, currentExpression: expr };
                  setActiveWorkspace(updated);
                  saveWorkspace(updated);
                }
              }}
              onExecute={handleExecuteQuery}
              isLoading={isExecuting}
              tables={tables}
            />

            {/* Hàng 3: Hiển thị kết quả câu lệnh SQL & Bảng dữ liệu trả về */}
            <ResultView
              transpiledSql={transpiledSql}
              queryResult={queryResult}
              transpileError={transpileError}
            />
          </>
        ) : (
          /* Chế độ Luyện tập & Chấm điểm (Module 4) */
          <PracticeMode
            currentSchemaText={schemaText}
            tables={tables}
            hasApi={hasApi}
            onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
            workspaceQuestions={activeWorkspace?.questions || []}
            onSaveQuestions={handleUpdateQuestions}
            currentPresetId={activeWorkspace?.id}
            onDatabaseUpdated={refreshSchema}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
          <p>
            <strong>CSDL Relational Algebra Helper</strong> • Hệ thống Không gian làm việc Lưu trữ Bền vững • Chuẩn Giáo trình CTU • Chạy 100% Client-side
          </p>
        </div>
      </footer>

      {/* Modal Cấu hình API Key */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onKeySaved={() => setHasApi(hasApiKey())}
      />

      {/* Modal Quản lý Không gian làm việc & Tệp CSDL */}
      <WorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspace?.id || ''}
        onSelectWorkspace={handleSelectWorkspace}
        onCreateWorkspace={handleCreateWorkspace}
        onDuplicateWorkspace={handleDuplicateWorkspace}
        onDeleteWorkspace={handleDeleteWorkspace}
        onExportWorkspace={handleExportWorkspace}
        onImportWorkspace={handleImportWorkspace}
      />
    </div>
  );
};

export default App;
