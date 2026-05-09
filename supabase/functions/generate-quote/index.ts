import { createClient } from 'jsr:@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify user is authenticated
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

    const { voiceId, voiceName, style } = await req.json()
    if (!voiceId || !voiceName) {
      return new Response(JSON.stringify({ error: 'voiceId and voiceName required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Generate quote text via Claude
    const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: `Generate a single aggressive, locker-room-style motivational quote for a runner.
Style: ${style || 'aggressive, second-person, visceral'}.
Max 2 sentences, max 40 words. No intro text, just the quote itself.`,
        }],
      }),
    })

    if (!claudeResp.ok) {
      const err = await claudeResp.text()
      throw new Error(`Claude error: ${err}`)
    }

    const claudeData = await claudeResp.json()
    const quoteText = claudeData.content[0].text.trim()

    // Convert to audio via ElevenLabs
    const ttsResp = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: quoteText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.2, similarity_boost: 0.6, style: 0.35, use_speaker_boost: true },
        }),
      }
    )

    if (!ttsResp.ok) {
      const err = await ttsResp.text()
      throw new Error(`ElevenLabs error: ${err}`)
    }

    const audioBuffer = await ttsResp.arrayBuffer()

    // Upload audio to Supabase Storage
    const fileName = `${user.id}/${crypto.randomUUID()}.mp3`
    const { error: uploadError } = await supabase.storage
      .from('audio')
      .upload(fileName, audioBuffer, { contentType: 'audio/mpeg', upsert: false })

    if (uploadError) throw new Error(`Storage error: ${uploadError.message}`)

    const { data: { publicUrl } } = supabase.storage
      .from('audio')
      .getPublicUrl(fileName)

    // Save to quotes table
    const { data: quote, error: dbError } = await supabase
      .from('quotes')
      .insert({
        user_id: user.id,
        text: quoteText,
        voice_id: voiceId,
        voice_name: voiceName,
        audio_url: publicUrl,
      })
      .select()
      .single()

    if (dbError) throw new Error(`DB error: ${dbError.message}`)

    return new Response(JSON.stringify({ quote }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
