export const HEYGEN_PLAN_API_JSON_CONTRACT = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 CONTRATO HEYGEN + HYPERFRAMES (JSON ÚNICO)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Responde SOLO con un objeto JSON válido (un bloque \`\`\`json opcional).

Estructura raíz:
{
  "title": string,
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "durationMs": number,
  "avatarStyle": string,
  "suggestedAvatarId": string opcional,
  "audioTracks": [ ... ],
  "segments": [ ... ]
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎬 VIRAL / IMPACTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Hook visual+narrativo en 0–3s (pattern interrupt).
• Cambia layout cada 4–8s — NUNCA avatar estático todo el video.
• Mínimo 5 segmentos en 30–45s.
• CTA final en últimos 3–5s.
• Ritmo TikTok/Reels: datos → emoción → prueba social → CTA.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎧 AUDIO (ELEVENLABS) — RELOJ MAESTRO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

audioTracks SIEMPRE incluye:
1) música loop (volume ~0.12–0.16, instrumental)
2) UNA voz con guion completo (volume ~0.9)

Opcional: sfx en hits (volume ~0.5, startMs alineado al momento visual).

Cada track:
{
  "id": "track-music",
  "type": "music" | "voice" | "sfx",
  "volume": number,
  "loop": boolean opcional,
  "startMs": number opcional (sfx),
  "_elevenlabs": {
    "type": "music" | "voice" | "sfx",
    "text": string (solo voice),
    "prompt": string (music/sfx),
    "durationMs": number (music),
    "durationSeconds": number (sfx)
  }
}

Guion voz: ~2.2 palabras/segundo. durationMs del plan ≈ duración objetivo.
total segundos = durationMs/1000 → max palabras = segundos × 2.2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 SEGMENTOS (startMs/endMs cubren 0..durationMs sin huecos)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

layoutMode: avatar_full | avatar_pip | graphics_only | avatar_with_overlays | news_ticker | split_screen

Cada segmento:
{
  "id": "seg-hook",
  "startMs": 0,
  "endMs": 4000,
  "layoutMode": "...",
  "avatar": { "script": "frase de este tramo" }  // si incluye avatar
  "layers": [
    { "type": "text_bubble", "text": "...", "position": "center" },
    { "type": "image", "src": "URL exacta del asset", "position": "pip-bottom-right" },
    { "type": "chart", "title": "...", "chartData": { "labels": [], "values": [] } },
    { "type": "news_frame", "headline": "...", "subtitle": "..." },
    { "type": "lower_third", "title": "...", "subtitle": "..." },
    { "type": "social_card", "title": "@handle", "text": "..." },
    { "type": "infographic", ... },
    { "type": "shader_transition" }
  ]
}

Alterna modos: hook graphics_only o avatar_pip → datos chart/infographic → avatar_full insight → overlays avatar_with_overlays → CTA.

Usa URLs EXACTAS de assets del usuario cuando existan.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 AVATAR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Interpreta avatarDescription del usuario en avatarStyle.
Incluye avatar.script por segmento con avatar (frase que coincide con el guion global en ese tramo).
`;
