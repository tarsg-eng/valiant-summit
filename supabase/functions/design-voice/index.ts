const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SAMPLE_TEXT = "You were born for this moment. Every mile you've run, every rep you've pushed, every morning you got up when you didn't want to — it all led here. The pain you feel right now is the strength you'll carry forever. Get up. Push harder. This is your time."

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { description } = await req.json()
    if (!description?.trim()) {
      return new Response(JSON.stringify({ error: 'description required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resp = await fetch('https://api.elevenlabs.io/v1/text-to-voice/create-previews', {
      method: 'POST',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ voice_description: description, text: SAMPLE_TEXT }),
    })

    if (!resp.ok) throw new Error(`ElevenLabs error: ${await resp.text()}`)

    const { previews } = await resp.json()

    return new Response(JSON.stringify({
      previews: previews.map((p: { generated_voice_id: string; audio_base_64: string; duration_secs: number }) => ({
        generatedVoiceId: p.generated_voice_id,
        audioBase64: p.audio_base_64,
        duration: Math.round(p.duration_secs),
      })),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
