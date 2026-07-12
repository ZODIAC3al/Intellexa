import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { api } from '../../utils/api';
import { AlertTriangle, Sparkles } from 'lucide-react';

export default function UsageMeter() {
  const user = useSelector((state: RootState) => state.auth.user);

  const { data: usage = { cloudCallsCount: 0, tokenCount: 0 } } = useQuery({
    queryKey: ['usageMeter'],
    queryFn: api.getUsageMeter,
    enabled: !!user,
  });

  if (!user) return null;

  const planMax = user.plan === 'standard-pro' ? 500 : user.plan === 'enterprise' ? Infinity : 0;
  const isUncapped = planMax === Infinity;
  const usageCount = usage.cloudCallsCount;
  
  const percentage = isUncapped ? 0 : planMax > 0 ? (usageCount / planMax) * 100 : 100;
  const isHighUsage = percentage >= 80;

  return (
    <div className="card bg-base-200 border border-neutral p-5 gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-sm text-base-content">Monthly Usage Quota</h3>
          <p className="text-xs text-neutral-content capitalize mt-0.5">Plan: {user.plan.replace('-', ' ')}</p>
        </div>
        <span className="text-xs font-mono font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-lg">
          {isUncapped ? 'Uncapped' : `${usageCount} / ${planMax} queries`}
        </span>
      </div>

      {!isUncapped && (
        <div className="flex flex-col gap-1.5">
          <progress
            className={`progress w-full ${isHighUsage ? 'progress-error' : 'progress-primary'}`}
            value={usageCount}
            max={planMax || 1}
          />
          <div className="flex justify-between text-[10px] font-mono text-neutral-content">
            <span>0%</span>
            <span>{Math.round(percentage)}% used</span>
            <span>100%</span>
          </div>
        </div>
      )}

      {user.plan === 'local-core' && (
        <div className="alert bg-base-300 border border-neutral text-xs text-neutral-content p-3 flex gap-2">
          <AlertTriangle className="h-4 w-4 text-accent shrink-0" />
          <span>Local Core is restricted to local Ollama execution. Upgrade to Standard Pro to trigger Cloud models.</span>
        </div>
      )}

      {isHighUsage && user.plan === 'standard-pro' && (
        <div className="alert alert-error text-xs p-3 flex gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>You have consumed {Math.round(percentage)}% of your cloud query limits. Upgrade to Enterprise to prevent disruption.</span>
        </div>
      )}

      {user.plan !== 'enterprise' && (
        <button className="btn btn-primary btn-sm mt-1 flex items-center justify-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> Upgrade Plan
        </button>
      )}
    </div>
  );
}
