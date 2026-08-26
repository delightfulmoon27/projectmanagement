import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ToastProvider } from './components/Toast';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-white">{children}</div>
    </ToastProvider>
  );
}
