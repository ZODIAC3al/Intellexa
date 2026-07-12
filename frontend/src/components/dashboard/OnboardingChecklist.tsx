import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Circle, X, Check } from 'lucide-react';
import { api } from '../../utils/api';

export default function OnboardingChecklist() {
  const [isDismissed, setIsDismissed] = useState(false);

  // Fetch stats and workspace members to check completion
  const { data: stats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: api.getStats,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['workspaceMembers'],
    queryFn: api.getMembers,
  });

  if (isDismissed || !stats) return null;

  // Checklist items completion evaluation
  const steps = [
    {
      id: 'collection',
      label: 'Create a knowledge collection',
      completed: stats.collectionsCount > 1 || (stats.collectionsCount === 1 && stats.documentsCount > 0),
    },
    {
      id: 'upload',
      label: 'Upload a document (PDF, DOCX, or MD)',
      completed: stats.documentsCount > 0,
    },
    {
      id: 'query',
      label: 'Ask a question in local or cloud chat',
      completed: stats.conversationsCount > 0,
    },
    {
      id: 'invite',
      label: 'Invite a team member to collaborate',
      completed: members.length > 1,
    },
  ];

  const completedSteps = steps.filter((s) => s.completed).length;
  if (completedSteps === steps.length) return null; // Hide if fully completed

  return (
    <div className="card bg-base-200 border border-neutral relative p-5 flex flex-col gap-4">
      <button
        onClick={() => setIsDismissed(true)}
        className="absolute top-4 right-4 btn btn-ghost btn-circle btn-xs text-neutral-content hover:text-base-content"
      >
        <X className="h-4 w-4" />
      </button>

      <div>
        <h3 className="font-bold text-sm text-base-content flex items-center gap-2">
          🚀 Quick Start Checklist
        </h3>
        <p className="text-xs text-neutral-content mt-1">
          Complete these steps to get familiar with your Intellexa AI Workbench.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-3">
            {step.completed ? (
              <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center text-success-content shrink-0">
                <Check className="h-3 w-3 stroke-[3]" />
              </div>
            ) : (
              <Circle className="w-5 h-5 text-neutral-content shrink-0" />
            )}
            <span
              className={`text-xs ${
                step.completed ? 'line-through text-neutral-content' : 'text-base-content font-medium'
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
