'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { Mail, Plus, ShieldCheck, UserCheck, Trash2 } from 'lucide-react';

export default function WorkspaceMembersPage() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { data: members = [], isLoading } = useQuery<any[]>({
    queryKey: ['workspaceMembers'],
    queryFn: api.getMembers,
  });

  const inviteMutation = useMutation({
    mutationFn: (email: string) => api.inviteMember(email),
    onSuccess: () => {
      setSuccessMsg('Successfully added user to workspace.');
      setEmail('');
      setErrorMsg('');
      queryClient.invalidateQueries({ queryKey: ['workspaceMembers'] });
      // close modal
      const modal = document.getElementById('invite-modal') as any;
      if (modal) modal.checked = false;
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to send invite.');
      setSuccessMsg('');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.updateWorkspaceMemberRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaceMembers'] });
    },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    inviteMutation.mutate(email);
  };

  return (
    <div className="p-6 flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-base-content">Workspace Teammates</h2>
          <p className="text-xs text-neutral-content mt-1">
            Manage who has access to this workspace and define their workspace permissions.
          </p>
        </div>

        {/* Modal trigger using DaisyUI checkbox hack */}
        <label htmlFor="invite-modal" className="btn btn-primary btn-sm flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Add Teammate
        </label>
      </div>

      {successMsg && (
        <div className="alert alert-success text-xs p-3">
          <span>{successMsg}</span>
        </div>
      )}

      <div className="card bg-base-200 border border-neutral overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <span className="loading loading-spinner text-primary"></span>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="table table-md w-full">
              <thead>
                <tr className="border-b border-neutral">
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member._id} className="border-b border-neutral/60 hover:bg-base-300/40">
                    <td className="font-semibold text-base-content flex items-center gap-2">
                      <div className="avatar placeholder">
                        <div className="bg-primary text-primary-content rounded-full w-8 h-8 font-bold text-xs uppercase flex items-center justify-center">
                          {member.userId?.name?.slice(0, 2) || 'U'}
                        </div>
                      </div>
                      {member.userId?.name || 'Pending Invite'}
                    </td>
                    <td className="text-neutral-content">{member.userId?.email}</td>
                    <td>
                      <select
                        value={member.role}
                        onChange={(e) =>
                          updateRoleMutation.mutate({ userId: member.userId?._id, role: e.target.value })
                        }
                        className="select select-bordered select-xs text-xs font-semibold"
                        disabled={member.role === 'owner'}
                      >
                        <option value="owner" disabled>
                          Owner
                        </option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </td>
                    <td className="text-right">
                      {member.role !== 'owner' ? (
                        <button className="btn btn-ghost btn-circle btn-xs text-error">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <span className="text-[10px] font-mono text-neutral-content/60">Owner Restricted</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Modal Checkbox Hook */}
      <input type="checkbox" id="invite-modal" className="modal-toggle" />
      <div className="modal" role="dialog">
        <div className="modal-box bg-base-300 border border-neutral">
          <h3 className="font-bold text-sm text-base-content flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" /> Invite Teammate
          </h3>
          <p className="text-xs text-neutral-content mt-1.5">
            Enter the email address of the person you would like to invite. They must already have an Intellexa account.
          </p>

          <form onSubmit={handleInvite} className="flex flex-col gap-4 mt-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text text-xs font-bold text-neutral-content">Email Address</span>
              </label>
              <input
                type="email"
                placeholder="teammate@intellexa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input input-bordered w-full text-sm"
                required
              />
            </div>

            {errorMsg && (
              <div className="text-xs text-error font-medium">{errorMsg}</div>
            )}

            <div className="modal-action">
              <label htmlFor="invite-modal" className="btn btn-ghost btn-sm">
                Cancel
              </label>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={inviteMutation.isPending}
              >
                {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
