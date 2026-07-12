'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { useMutation } from '@tanstack/react-query';
import { api, API_BASE } from '@/utils/api';
import { clearCredentials } from '@/redux/slices/authSlice';
import { Download, Trash2, ShieldAlert } from 'lucide-react';

export default function SettingsPrivacyPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteAccount(),
    onSuccess: () => {
      dispatch(clearCredentials());
      // Close modal
      const modal = document.getElementById('delete-modal') as any;
      if (modal) modal.checked = false;
      router.push('/signup');
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to delete account.');
      setIsDeleting(false);
    },
  });

  const handleExport = () => {
    // Open standard download link
    window.open(`${API_BASE}/account/export`, '_blank');
  };

  const handleDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirm !== 'DELETE') return;
    setIsDeleting(true);
    deleteMutation.mutate();
  };

  return (
    <div className="p-6 flex flex-col gap-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-base-content flex items-center gap-2">
          🛡️ Privacy & Data Ownership
        </h2>
        <p className="text-xs text-neutral-content mt-1">
          Export your stored workbench data or permanently delete your account according to privacy guidelines.
        </p>
      </div>

      <div className="card bg-base-200 border border-neutral p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-bold text-sm text-base-content flex items-center gap-1.5">
            <Download className="h-4 w-4 text-primary" /> Download Your Stored Workspace Content
          </h3>
          <p className="text-xs text-neutral-content leading-relaxed">
            Obtain a clean JSON bundle containing your uploaded document metadata lists, collections definitions, and conversation message histories. No vector embeddings are included.
          </p>
        </div>
        <button onClick={handleExport} className="btn btn-primary btn-sm self-start flex items-center gap-1.5">
          <Download className="h-4 w-4" /> Download JSON Bundle
        </button>
      </div>

      <div className="card bg-base-200 border border-error/30 p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-bold text-sm text-error flex items-center gap-1.5">
            <Trash2 className="h-4 w-4" /> Delete Account & Clear Databases
          </h3>
          <p className="text-xs text-neutral-content leading-relaxed">
            Deletes all your uploaded documents physically off the server, destroys vector databases indexed, clears all conversation transcripts, and wipes your user profile record.
          </p>
        </div>
        
        {/* Trigger DaisyUI Modal */}
        <label htmlFor="delete-modal" className="btn btn-error btn-sm btn-outline self-start flex items-center gap-1.5">
          <Trash2 className="h-4 w-4" /> Delete Account
        </label>
      </div>

      {/* Delete Modal Checkbox Hook */}
      <input type="checkbox" id="delete-modal" className="modal-toggle" />
      <div className="modal" role="dialog">
        <div className="modal-box bg-base-300 border border-error/40 max-w-md">
          <h3 className="font-bold text-sm text-error flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 animate-pulse" /> Confirm Account Destruction
          </h3>
          <p className="text-xs text-neutral-content mt-2 leading-relaxed">
            This action is irreversible. All vector stores, uploads, logs, and account records will be permanently expunged.
          </p>

          <form onSubmit={handleDelete} className="flex flex-col gap-4 mt-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text text-xs font-bold text-neutral-content">
                  Type <span className="text-error font-mono">DELETE</span> to confirm
                </span>
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className="input input-bordered w-full text-sm font-mono text-center text-error border-error/40 focus:border-error"
                required
              />
            </div>

            <div className="modal-action">
              <label htmlFor="delete-modal" className="btn btn-ghost btn-sm">
                Cancel
              </label>
              <button
                type="submit"
                className="btn btn-error btn-sm"
                disabled={deleteConfirm !== 'DELETE' || isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Wipe All Data & Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
