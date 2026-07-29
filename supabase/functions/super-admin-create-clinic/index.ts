// Lets the developer's own super-admin account create a clinic + admin login directly from the
// "إدارة العيادات" dashboard, without the clinic owner going through the public /signup form
// themselves — e.g. to set someone up with a longer trial or a permanent account from the start.
//
// Same shape as create-staff-user/reset-staff-password: the caller-JWT check goes through normal
// RLS (so only the real super-admin account can call this), then the service-role client does the
// privileged, cross-clinic writes.
//
// Deploy with: supabase functions deploy super-admin-create-clinic

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

    // Scoped to the CALLER's own JWT so the super-admin check below goes through normal RLS.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await callerClient.auth.getUser()
    if (userError || !userData.user) return json({ error: 'Invalid session' }, 401)

    const { data: callerProfile, error: profileError } = await callerClient
      .from('users')
      .select('is_super_admin')
      .eq('id', userData.user.id)
      .single()
    if (profileError || !callerProfile?.is_super_admin) {
      return json({ error: 'غير مصرح لك بإنشاء عيادات' }, 403)
    }

    const body = await req.json()
    const { full_name, email, password, trial_days, subscription_ends_at } = body
    if (!full_name || !email || !password) {
      return json({ error: 'بيانات ناقصة' }, 400)
    }
    if (typeof password !== 'string' || password.length < 6) {
      return json({ error: 'كلمة المرور لازم تكون 6 أحرف على الأقل' }, 400)
    }

    // Only place the service role key is used — entirely server-side, never sent to the browser.
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createError || !created.user) {
      return json({ error: createError?.message ?? 'تعذّر إنشاء الحساب — البريد الإلكتروني مستخدم بالفعل؟' }, 400)
    }

    const trialEndsAt =
      typeof trial_days === 'number' && trial_days > 0
        ? new Date(Date.now() + trial_days * 24 * 60 * 60 * 1000).toISOString()
        : null

    const { data: clinic, error: clinicError } = await adminClient
      .from('clinics')
      .insert({
        name: full_name,
        is_active: true,
        trial_ends_at: trialEndsAt,
        subscription_ends_at: subscription_ends_at || null,
      })
      .select('id')
      .single()
    if (clinicError || !clinic) {
      await adminClient.auth.admin.deleteUser(created.user.id)
      return json({ error: clinicError?.message ?? 'تعذّر إنشاء العيادة' }, 400)
    }

    const { error: insertError } = await adminClient.from('users').insert({
      id: created.user.id,
      clinic_id: clinic.id,
      full_name,
      email,
      role: 'admin',
    })
    if (insertError) {
      await adminClient.auth.admin.deleteUser(created.user.id)
      await adminClient.from('clinics').delete().eq('id', clinic.id)
      return json({ error: insertError.message }, 400)
    }

    return json({ success: true }, 200)
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})
