// Resets another staff member's password to an admin-chosen value — this is the practical
// "forgot password" path for staff accounts: since there's no paid SMS/WhatsApp Business API
// account to deliver a verification code to a phone (see create-staff-user's notes on the same
// constraint), an employee who's locked out asks the admin, who resets it here in one click and
// shares the new password directly. Self-service changes (when someone already knows their
// current password) go through supabase.auth.updateUser() straight from ProfilePage instead.
//
// Deploy with: supabase functions deploy reset-staff-password

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

    // Scoped to the CALLER's own JWT so the admin check below goes through normal RLS.
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
      return json({ error: 'غير مصرح لك بإعادة تعيين كلمات المرور' }, 403)
    }

    const body = await req.json()
    const { user_id, new_password } = body
    if (!user_id || !new_password) {
      return json({ error: 'بيانات ناقصة' }, 400)
    }
    if (typeof new_password !== 'string' || new_password.length < 6) {
      return json({ error: 'كلمة المرور لازم تكون 6 أحرف على الأقل' }, 400)
    }

    // Only place the service role key is used — entirely server-side, never sent to the browser.
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { error: updateError } = await adminClient.auth.admin.updateUserById(user_id, { password: new_password })
    if (updateError) {
      return json({ error: updateError.message }, 400)
    }

    return json({ success: true }, 200)
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})
