# Supabase rebuild analysis
## Tables used by code
- schemes
- saved_schemes
- chat_sessions
- chat_messages
- profiles (present in generated Supabase types and supported by signup trigger)
## Query patterns found
- src/hooks/useSchemes.ts: .from('schemes').select('*').eq('status', 'active').order('title'), with optional .eq('category', ...), .eq('state', ...), .eq('benefit_type', ...), .ilike('title', ...)
- src/hooks/useSavedSchemes.ts: .from('saved_schemes').select('*, schemes(*)').eq('user_id', user.id).order('created_at', { ascending: false })
- src/hooks/useSavedSchemes.ts: .from('saved_schemes').insert({ user_id, scheme_id })
- src/hooks/useSavedSchemes.ts: .from('saved_schemes').delete().eq('user_id', user.id).eq('scheme_id', schemeId)
- src/hooks/useChat.ts: .from('chat_sessions').select('*').eq('user_id', user.id).order('updated_at', { ascending: false })
- src/hooks/useChat.ts: .from('chat_sessions').insert({ user_id, title }).select().single()
- src/hooks/useChat.ts: .from('chat_messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true })
- src/hooks/useChat.ts: .from('chat_messages').insert({ session_id, user_id, content, role, sources }).select().single()
## Why schema matches
- UUID primary keys are required because every table row id is treated as a string UUID in src/integrations/supabase/types.ts.
- schemes.benefits must be text[] because the UI maps over it as an array in src/pages/SchemeDetails.tsx and src/pages/SchemeExplorer.tsx.
- saved_schemes.scheme_id -> schemes.id is required because the app selects schemes(*) from saved_schemes.
- chat_messages.sources must be jsonb because useSendMessage stores arbitrary sources objects.
- updated_at exists on schemes, profiles, and chat_sessions because the generated types expect it and sessions are ordered by it.
- profiles is included because it exists in the generated database typings and signup metadata already supplies full_name.
## Seed catalog size
- 348 rows total
- 12 scheme templates x 29 state scopes
