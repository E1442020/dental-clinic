// Creates a real Supabase Auth login (auth.users) plus the matching public.users profile row in
// one call, so an admin can add a new staff member in a single click from the app instead of
// going through the Supabase Dashboard by hand.
//
// The service role key (which bypasses RLS) never leaves this function — SUPABASE_URL,
// SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are all injected automatically into every
// Supabase Edge Function's environment, no manual secret configuration needed.
//
// Deploy with: supabase functions deploy create-staff-user

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401)

    // Scoped to the CALLER's own JWT so the admin check below goes through normal RLS — a
    // non-admin genuinely cannot read their way into passing this check.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await callerClient.auth.getUser()
    if (userError || !userData.user) return json({ error: 'Invalid session' }, 401)

    const { data: callerProfile, error: profileError } = await callerClient
      .from('users')
      .select('role')
      .eq('id', userData.user.id)
      .single()
    if (profileError || callerProfile?.role !== 'admin') {
      return json({ error: 'غير مصرح لك بإضافة موظفين' }, 403)
    }

    const body = await req.json()
    const { full_name, email, password, role, branch_ids, linked_doctor_id } = body
    if (!full_name || !email || !password || !role) {
      return json({ error: 'بيانات ناقصة' }, 400)
    }
    const branchIds: string[] = Array.isArray(branch_ids) ? branch_ids : []

    // Only place the service role key is used — entirely server-side, never sent to the browser.
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createError || !created.user) {
      return json({ error: createError?.message ?? 'تعذّر إنشاء الحساب' }, 400)
    }

    // branch_id stays the user's default/primary branch (first picked); user_branches is the
    // full set that branch-scoped RLS actually checks — see auth_has_branch() in migration 0011.
    const { error: insertError } = await adminClient.from('users').insert({
      id: created.user.id,
      full_name,
      email,
      role,
      branch_id: branchIds[0] ?? null,
      linked_doctor_id: linked_doctor_id ?? null,
    })
    if (insertError) {
      // Roll back the auth account so we don't leave a login with no profile row behind.
      await adminClient.auth.admin.deleteUser(created.user.id)
      return json({ error: insertError.message }, 400)
    }

    if (branchIds.length > 0) {
      const { error: branchesError } = await adminClient
        .from('user_branches')
        .insert(branchIds.map((branch_id: string) => ({ user_id: created.user.id, branch_id })))
      if (branchesError) {
        await adminClient.auth.admin.deleteUser(created.user.id)
        return json({ error: branchesError.message }, 400)
      }
    }

    return json({ id: created.user.id }, 200)
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})
