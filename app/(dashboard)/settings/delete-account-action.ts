'use server';

import { createClient } from '@supabase/supabase-js';
import { createClient as createUserClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function deleteAccountAction(): Promise<{ error: string } | void> {
  const userSupabase = await createUserClient();
  const { data: { user } } = await userSupabase.auth.getUser();
  if (!user) return { error: 'Nicht authentifiziert' };

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) return { error: 'Serverkonfiguration fehlt' };

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: error.message };

  await userSupabase.auth.signOut();
  redirect('/login');
}
