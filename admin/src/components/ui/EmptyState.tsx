import React from 'react';
import { PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  message?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  message = 'No items yet',
  action,
}) => (
  <div className="flex flex-col items-center justify-center py-16 gap-4 text-slate-500">
    <PackageOpen size={48} strokeWidth={1} />
    <p className="text-sm">{message}</p>
    {action}
  </div>
);
