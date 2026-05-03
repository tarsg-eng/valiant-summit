#!/usr/bin/env python3
"""
Generates 20 aggressive motivational quotes via Claude,
then converts each to MP3 via ElevenLabs and saves to assets/audio/.

Usage:
  export ANTHROPIC_API_KEY=...
  export ELEVENLABS_API_KEY=...
  pip install -r scripts/requirements.txt
  python scripts/generate_content.py
"""

import os
import json
import requests
import anthropic

AUDIO_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'audio')
QUOTES_JSON = os.path.join(os.path.dirname(__file__), '..', 'assets', 'quotes.json')

# ElevenLabs "Adam" — deep, authoritative male voice
ELEVENLABS_VOICE_ID = 'pNInz6obpgDQGcFmaJgB'
ELEVENLABS_MODEL = 'eleven_monolingual_v1'

QUOTE_PROMPT = """Generate exactly 20 short, aggressive, locker-room-style motivational quotes for a runner.

Rules:
- Second-person ("You", "Your", "Don't")
- Each quote is 1–2 punchy sentences max
- Aggressive, raw, urgent — like a coach getting in your face before a championship game
- No clichés like "believe in yourself" — make them visceral and specific to pushing through pain
- Varied: some about pain, some about identity, some about legacy, some about fear

Return ONLY a JSON array of 20 strings, nothing else. Example format:
["Quote one here.", "Quote two here."]"""


def generate_quotes(client: anthropic.Anthropic) -> list[str]:
    print('Generating quotes with Claude...')
    message = client.messages.create(
        model='claude-sonnet-4-6',
        max_tokens=1024,
        messages=[{'role': 'user', 'content': QUOTE_PROMPT}],
    )
    raw = message.content[0].text.strip()
    quotes = json.loads(raw)
    assert isinstance(quotes, list) and len(quotes) == 20, f'Expected 20 quotes, got: {quotes}'
    print(f'  Got {len(quotes)} quotes.')
    return quotes


def text_to_speech(quote: str, index: int, api_key: str) -> None:
    filename = f'quote_{index:02d}.mp3'
    out_path = os.path.join(AUDIO_DIR, filename)

    url = f'https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}'
    headers = {
        'xi-api-key': api_key,
        'Content-Type': 'application/json',
    }
    payload = {
        'text': quote,
        'model_id': ELEVENLABS_MODEL,
        'voice_settings': {
            'stability': 0.3,
            'similarity_boost': 0.8,
            'style': 0.6,
            'use_speaker_boost': True,
        },
    }

    resp = requests.post(url, headers=headers, json=payload, timeout=30)
    resp.raise_for_status()

    with open(out_path, 'wb') as f:
        f.write(resp.content)
    print(f'  [{index:02d}/20] {filename} — "{quote[:60]}..."')


def main() -> None:
    anthropic_key = os.environ.get('ANTHROPIC_API_KEY')
    elevenlabs_key = os.environ.get('ELEVENLABS_API_KEY')

    if not anthropic_key:
        raise SystemExit('ERROR: ANTHROPIC_API_KEY not set.')
    if not elevenlabs_key:
        raise SystemExit('ERROR: ELEVENLABS_API_KEY not set.')

    os.makedirs(AUDIO_DIR, exist_ok=True)

    client = anthropic.Anthropic(api_key=anthropic_key)
    quotes = generate_quotes(client)

    with open(QUOTES_JSON, 'w') as f:
        json.dump(quotes, f, indent=2, ensure_ascii=False)
    print(f'  Saved quotes.json')

    print('Converting to audio with ElevenLabs...')
    for i, quote in enumerate(quotes, start=1):
        text_to_speech(quote, i, elevenlabs_key)

    print(f'\nDone. {len(quotes)} MP3s saved to assets/audio/')
    print('\nQuotes generated:')
    for i, q in enumerate(quotes, 1):
        print(f'  {i:02d}. {q}')


if __name__ == '__main__':
    main()
