import React, { useState, useRef } from 'react';
import {
  FolderKanban,
  PlusCircle,
  Copy,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  X,
  FileText,
  Clock,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { Workspace } from '../lib/workspaceStorage';

interface WorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspace: (name: string, description?: string) => void;
  onDuplicateWorkspace: (id: string, newName?: string) => void;
  onDeleteWorkspace: (id: string) => void;
  onExportWorkspace: (ws: Workspace) => void;
  onImportWorkspace: (file: File) => Promise<void>;
}

export const WorkspaceModal: React.FC<WorkspaceModalProps> = ({
  isOpen,
  onClose,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onDuplicateWorkspace,
  onDeleteWorkspace,
  onExportWorkspace,
  onImportWorkspace
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setErrorMsg('Vui lòng nhập tên cho Không gian bài tập.');
      return;
    }
    onCreateWorkspace(newName.trim(), newDesc.trim());
    setNewName('');
    setNewDesc('');
    setShowCreateForm(false);
    setErrorMsg(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setErrorMsg(null);
    try {
      await onImportWorkspace(file);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể nhập tệp này.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Quản lý Không gian làm việc &amp; Tệp dữ liệu</h3>
            <p className="text-xs text-slate-500">
              Lưu trữ bền vững nhiều bài tập CSDL độc lập, xuất/nhập tệp .csdl mà không sợ mất dữ liệu
            </p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Tạo không gian mới</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all border border-slate-300"
            >
              <Upload className="w-3.5 h-3.5 text-slate-600" />
              <span>{isImporting ? 'Đang đọc tệp...' : 'Nhập tệp (.csdl)'}</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csdl,.json"
              className="hidden"
            />
          </div>

          <span className="text-xs text-slate-400 font-medium">
            Tổng cộng: {workspaces.length} không gian
          </span>
        </div>

        {/* Create Workspace Form */}
        {showCreateForm && (
          <form onSubmit={handleCreate} className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl my-3 space-y-2.5 animate-in fade-in">
            <div className="text-xs font-bold text-indigo-900">Tạo không gian bài tập mới:</div>
            <div className="space-y-1">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ví dụ: Bài tập CSDL Quản lý Bán hàng..."
                className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Mô tả ngắn (tùy chọn)..."
                className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-3.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Xác nhận tạo
              </button>
            </div>
          </form>
        )}

        {errorMsg && (
          <div className="p-3 my-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Workspaces List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1">
          {workspaces.map((ws) => {
            const isActive = ws.id === activeWorkspaceId;
            const updatedDate = new Date(ws.updatedAt).toLocaleString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={ws.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-indigo-50/90 border-indigo-300 shadow-xs ring-1 ring-indigo-200'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 cursor-pointer" onClick={() => onSelectWorkspace(ws.id)}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{ws.name}</span>
                      {isActive && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Đang mở
                        </span>
                      )}
                    </div>
                    {ws.description && (
                      <p className="text-xs text-slate-600 line-clamp-1">{ws.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Cập nhật: {updatedDate}
                      </span>
                      <span>•</span>
                      <span>{ws.questions?.length || 0} bài tập</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    {!isActive && (
                      <button
                        onClick={() => onSelectWorkspace(ws.id)}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors border border-indigo-200"
                        title="Chuyển sang không gian này"
                      >
                        Mở
                      </button>
                    )}

                    {/* Duplicate */}
                    <button
                      onClick={() => onDuplicateWorkspace(ws.id)}
                      title="Nhân bản (Lưu thành không gian khác)"
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {/* Export */}
                    <button
                      onClick={() => onExportWorkspace(ws)}
                      title="Tải về tệp .csdl để lưu trữ trên máy"
                      className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    {workspaces.length > 1 && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Bạn có chắc muốn xóa không gian "${ws.name}" không?`)) {
                            onDeleteWorkspace(ws.id);
                          }
                        }}
                        title="Xóa không gian này"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-200 mt-2 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
            <span>Mỗi không gian lưu trữ riêng biệt Schema, Dữ liệu bảng SQLite và danh sách bài tập.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
