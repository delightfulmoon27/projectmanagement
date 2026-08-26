import { createClient } from '@/lib/supabase/server';
import Timeline from './components/Timeline';

export default async function TimelinePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: projects }, { data: tasks }, { data: dependencies }] = await Promise.all([
    supabase.from('projects').select('*').order('created_at', { ascending: true }),
    supabase.from('tasks').select('*').order('created_at', { ascending: true }),
    supabase.from('task_dependencies').select('*'),
  ]);

  return (
    <Timeline
      userId={user!.id}
      userEmail={user!.email ?? ''}
      initialProjects={projects ?? []}
      initialTasks={tasks ?? []}
      initialDependencies={dependencies ?? []}
    />
  );
}
