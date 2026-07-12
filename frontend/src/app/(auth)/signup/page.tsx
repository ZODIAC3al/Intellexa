'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { signupSchema, SignupInput } from '@/lib/validation/auth';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  });

  const signupMutation = useMutation({
    mutationFn: (data: SignupInput) => api.signup(data.email, data.password, data.name),
    onSuccess: () => {
      router.push('/login?registered=true');
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to register account.');
    },
  });

  const onSubmit = (data: SignupInput) => {
    signupMutation.mutate(data);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-base-content">Create an account</h2>
        <p className="text-xs text-neutral-content mt-1">
          Set up your private dual-mode RAG workbench.
        </p>
      </div>

      {errorMsg && (
        <div className="alert alert-error text-xs p-3">
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text text-xs font-bold text-neutral-content">Full Name</span>
          </label>
          <input
            type="text"
            placeholder="Ahmed Farouk"
            className={`input input-bordered w-full text-sm ${errors.name ? 'input-error' : ''}`}
            {...register('name')}
          />
          {errors.name && (
            <span className="text-error text-xs mt-1">{errors.name.message}</span>
          )}
        </div>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text text-xs font-bold text-neutral-content">Email</span>
          </label>
          <input
            type="email"
            placeholder="name@company.com"
            className={`input input-bordered w-full text-sm ${errors.email ? 'input-error' : ''}`}
            {...register('email')}
          />
          {errors.email && (
            <span className="text-error text-xs mt-1">{errors.email.message}</span>
          )}
        </div>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text text-xs font-bold text-neutral-content">Password</span>
          </label>
          <input
            type="password"
            placeholder="••••••••"
            className={`input input-bordered w-full text-sm ${errors.password ? 'input-error' : ''}`}
            {...register('password')}
          />
          {errors.password && (
            <span className="text-error text-xs mt-1">{errors.password.message}</span>
          )}
        </div>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text text-xs font-bold text-neutral-content">Confirm Password</span>
          </label>
          <input
            type="password"
            placeholder="••••••••"
            className={`input input-bordered w-full text-sm ${errors.confirmPassword ? 'input-error' : ''}`}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <span className="text-error text-xs mt-1">{errors.confirmPassword.message}</span>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary w-full mt-2"
          disabled={signupMutation.isPending}
        >
          {signupMutation.isPending ? 'Registering...' : 'Sign Up'}
        </button>
      </form>

      <div className="text-center text-xs text-neutral-content mt-2">
        Already have an account?{' '}
        <Link href="/login" className="text-primary font-bold hover:underline">
          Log In
        </Link>
      </div>
    </div>
  );
}
