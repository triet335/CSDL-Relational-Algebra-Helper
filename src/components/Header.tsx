import React from 'react';
import { Database, Key, Sparkles, BookOpen, Code2, RotateCcw, FolderKanban, Download } from 'lucide-react';

interface HeaderProps {
  activeTab: 'editor' | 'practice';
  setActiveTab: (tab: 'editor' | 'practice') => void;
  hasApi: boolean;
  onOpenApiKeyModal: () => void;
  activeWorkspaceName: string;
  onOpenWorkspaceModal: () => void;
  onQuickExport: () => void;
  tableCount: number;
  onResetDb: () => void;
  isSavedToast?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  hasApi,
  onOpenApiKeyModal,
  activeWorkspaceName,
  onOpenWorkspaceModal,
  onQuickExport,
  tableCount,
  onResetDb,
  isSavedToast
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-sm font-bold text-base sm:text-lg select-none">
              π
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight whitespace-nowrap">
                  CSDL Relational Algebra
                </h1>
                <span className="hidden xl:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
                  Local-first
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden md:block truncate max-w-[280px]">
                Học &amp; Thực thi ĐSQH trực tiếp trên SQLite
              </p>
            </div>
          </div>

          {/* Navigation Mode Tabs */}
          <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shrink-0">
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'editor'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
              <span>Soạn thảo tự do</span>
            </button>
            <button
              onClick={() => setActiveTab('practice')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'practice'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
              <span>Luyện tập &amp; Chấm điểm</span>
            </button>
          </div>

          {/* Actions & Settings */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Workspace Selector Button */}
            <button
              onClick={onOpenWorkspaceModal}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 text-slate-800 hover:text-indigo-800 border border-slate-200 transition-all text-xs font-semibold shadow-2xs group"
              title="Quản lý và chuyển đổi Không gian làm việc / Tệp CSDL"
            >
              <FolderKanban className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 shrink-0 group-hover:scale-105 transition-transform" />
              <span className="max-w-[90px] sm:max-w-[140px] lg:max-w-[180px] truncate font-bold text-slate-800 text-xs">
                {activeWorkspaceName}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-slate-500 border border-slate-200 hidden lg:inline">
                Tệp
              </span>
            </button>

            {/* Quick Export .csdl */}
            <button
              onClick={onQuickExport}
              title="Xuất tệp .csdl về máy tính để lưu trữ"
              className="p-1.5 sm:px-2 sm:py-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-slate-200 flex items-center gap-1 text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden xl:inline text-[11px] font-medium">Xuất tệp</span>
            </button>

            {/* DB Status Badge */}
            <div
              title={`${tableCount} bảng trong CSDL SQLite`}
              className="hidden lg:flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{tableCount} bảng</span>
            </div>

            {/* Reset Database Button */}
            <button
              onClick={onResetDb}
              title="Làm mới Database SQLite theo không gian hiện tại"
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* API Key Modal Button */}
            <button
              onClick={onOpenApiKeyModal}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                hasApi
                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
              }`}
            >
              {hasApi ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden sm:inline">AI Đã kết nối</span>
                </>
              ) : (
                <>
                  <Key className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">API Key</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
