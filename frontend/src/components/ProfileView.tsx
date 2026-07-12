'use client';

import React, { useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../redux/store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Camera, User, Mail, Save, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';

export default function ProfileView() {
  const queryClient = useQueryClient();
  const { user } = useSelector((state: RootState) => state.auth);

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateProfileMutation = useMutation({
    mutationFn: (data: { name: string; email: string; avatar?: string }) =>
      api.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Profile updated successfully');
    },
    onError: (err: any) => {
      toast.error(`Failed to update profile: ${err.message || 'Unknown error'}`);
    },
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please use JPEG, PNG, or WebP.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be under 5MB.');
      return;
    }

    setUploading(true);
    try {
      const result = await api.uploadAvatar(file);
      setAvatarUrl(result.avatarUrl);
      toast.success('Avatar uploaded successfully');
    } catch (err: any) {
      toast.error(`Avatar upload failed: ${err.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    updateProfileMutation.mutate({
      name: name.trim(),
      email: email.trim(),
      avatar: avatarUrl || undefined,
    });
  };

  const avatarPreview = avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || user?.name || 'U')}&background=6E5BFF&color=fff`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-1 overflow-y-auto bg-surface-0 p-5 lg:p-8 space-y-6 scrollbar-thin"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-accent-violet-soft border border-accent-violet/20 flex items-center justify-center text-accent-violet shadow-sm">
          <User className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">Profile Settings</h1>
          <p className="text-xs text-text-muted">Manage your account information and preferences.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
        <div className="rounded-xl border border-border-hairline bg-surface-1 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-border-hairline bg-surface-2">
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=6E5BFF&color=fff`;
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-content hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md"
                title="Upload avatar"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />
            </div>

            <div className="flex-1 space-y-4 w-full">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-text-muted" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-surface-2 border border-border-hairline rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-text-muted" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-surface-2 border border-border-hairline rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
          </div>

<div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Plan</label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-3 py-1 bg-primary/10 text-primary rounded-full">
                  {(user?.plan || 'local-core').replace('-', ' ')}
                </span>
              </div>
            </div>
        </div>

        <button
          type="submit"
          disabled={updateProfileMutation.isPending || uploading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-content text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md"
        >
          {updateProfileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </button>
      </form>
    </motion.div>
  );
}