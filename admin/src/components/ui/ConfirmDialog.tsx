import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title = 'Confirm Delete',
  message,
  onConfirm,
  onCancel,
  loading,
}) => (
  <Modal open={open} title="" onClose={onCancel} size="sm">
    <div className="flex flex-col items-center gap-4 py-2">
      <div className="p-3 rounded-full bg-rose-500/15 text-rose-400">
        <AlertTriangle size={28} />
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="text-sm text-slate-400 text-center">{message}</p>
      <div className="flex gap-3 w-full mt-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 text-sm transition"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium transition disabled:opacity-50"
        >
          {loading ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  </Modal>
);
