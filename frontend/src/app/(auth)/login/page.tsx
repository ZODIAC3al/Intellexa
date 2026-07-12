'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { setCredentials } from '@/redux/slices/authSlice';
import { loginSchema, LoginInput } from '@/lib/validation/auth';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useMutation({
    mutationFn: (data: LoginInput) => api.login(data.email, data.password),
    onSuccess: (user) => {
      dispatch(setCredentials(user));
      router.push('/dashboard');
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'The email or password does not match an account.');
    },
  });

  const onSubmit = (data: LoginInput) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-base-content">Welcome back</h2>
        <p className="text-xs text-neutral-content mt-1">
          Enter your workspace email and password to log in.
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
          <div className="flex justify-between items-center">
            <label className="label">
              <span className="label-text text-xs font-bold text-neutral-content">Password</span>
            </label>
            <Link href="/forgot-password" className="text-[10px] text-primary hover:underline font-semibold">
              Forgot password?
            </Link>
          </div>
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

        <button
          type="submit"
          className="btn btn-primary w-full mt-2"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? 'Logging in...' : 'Log In'}
        </button>
      </form>

      <div className="text-center text-xs text-neutral-content mt-2">
        Don't have an account?{' '}
        <Link href="/signup" className="text-primary font-bold hover:underline">
          Sign Up
        </Link>
      </div>
    </div>
  );
}
