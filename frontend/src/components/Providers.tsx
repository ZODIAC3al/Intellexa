'use client';

import React, { useState } from 'react';
import { Provider } from 'react-redux';
import { store } from '../redux/store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export default function Providers({ children }: { children: React.ReactNode }) {
  // Use state to avoid sharing query client instance between requests if rendering on server
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: false,
      },
    },
  }));

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </Provider>
  );
}
