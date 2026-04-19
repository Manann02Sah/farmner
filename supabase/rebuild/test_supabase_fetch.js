import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY before running this test.');
}
const supabase = createClient(supabaseUrl, supabaseAnonKey);
async function verifySupabaseCompatibility() {
  const { data: schemes, error: schemesError } = await supabase
    .from('schemes')
    .select('*')
    .eq('status', 'active')
    .ilike('title', '%support%')
    .order('title')
    .limit(5);
  if (schemesError) {
    console.error('Schemes query failed:', schemesError.message, schemesError.details ?? '');
    return;
  }
  console.log('Loaded schemes:', schemes?.length ?? 0);
  console.log(schemes);
  const { data: authData, error: authError } = await supabase.auth.getSession();
  if (authError) {
    console.error('Session lookup failed:', authError.message);
    return;
  }
  const userId = authData.session?.user?.id;
  if (!userId) {
    console.log('No signed-in user, so saved_schemes/chat insert tests were skipped.');
    return;
  }
  const firstSchemeId = schemes?.[0]?.id;
  if (!firstSchemeId) {
    console.error('No scheme row available for saved_schemes test.');
    return;
  }
  const { error: saveError } = await supabase
    .from('saved_schemes')
    .insert({ user_id: userId, scheme_id: firstSchemeId });
  if (saveError && saveError.code !== '23505') {
    console.error('saved_schemes insert failed:', saveError.message, saveError.details ?? '');
    return;
  }
  console.log('saved_schemes insert path looks compatible.');
}
verifySupabaseCompatibility().catch((error) => {
  console.error('Verification script crashed:', error);
  process.exitCode = 1;
});
