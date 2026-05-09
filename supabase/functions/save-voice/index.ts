import { createClient } from 'jsr:@supabase/supabase-js@2'

const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { generatedVoiceId, name, description, notSelectedIds = [] } = await req.json()
    if (!generatedVoiceId || !name || !description) {
      return new Response(JSON.stringify({ error: 'generatedVoiceId, name, description required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Save the selected preview as a permanent voice
    const resp = await fetch('https://api.elevenlabs.io/v1/text-to-voice/create-voice-from-preview', {
      method: 'POST',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voice_name: name,
        voice_description: description,
        generated_voice_id: generatedVoiceId,
        played_not_selected_voice_ids: notSelectedIds,
      }),
    })

    if (!resp.ok) throw new Error(`ElevenLabs error: ${await resp.text()}`)

    const { voice_id } = await resp.json()

    // Persist to DB
    const { data: voice, error: dbError } = await supabase
      .from('custom_voices')
      .insert({ user_id: user.id, voice_id, name, description })
      .select()
      .single()

    if (dbError) throw new Error(`DB error: ${dbError.message}`)

    return new Response(JSON.stringify({ voice }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
