# Samarth Shayak

AI assistant for farmers with scheme discovery, RAG-assisted chat, document tools, and crop support.

## Local setup

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env`
3. Fill in:
   `VITE_SUPABASE_PROJECT_ID`
   `VITE_SUPABASE_URL`
   `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Start the app:
   `npm run dev`

## Supabase deployment checklist

This project depends on the linked Supabase project having both the schema and the function secrets in place.

### Database

Apply the SQL in:
- `supabase/migrations/20260320063416_c8864701-b207-4c39-86f1-7290e35d5931.sql`
- `supabase/migrations/20260403173000_seed_more_than_200_schemes.sql`

These create the required tables and policies:
- `schemes`
- `profiles`
- `saved_schemes`
- `chat_sessions`
- `chat_messages`

### Edge function secrets

Set these in Supabase, not in `.env`:

```bash
supabase secrets set GEMINI_API_KEY=...
```

### Required edge functions

Deploy these functions:
- `chat`
- `transcribe-audio`
- `convert-document`
- `verify-document`

## Resilience notes

- Public scheme browsing falls back to the built-in local catalog if Supabase is temporarily unavailable.
- Scheme matching for chat and crop-health suggestions uses the project scheme catalog so the AI can recommend schemes already known to the app.
- The document verifier now uploads files to the verification edge function and renders OCR-based results.
