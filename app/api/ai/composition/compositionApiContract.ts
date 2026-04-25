/**
 * Instrucciones finales para el modelo: esta API solo acepta composición en JSON.
 * Van al final del system prompt para prevalecer sobre cualquier instrucción de entregar .tsx.
 */
export const COMPOSITION_API_JSON_CONTRACT = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 CONTRATO DE SALIDA DE ESTA API (OBLIGATORIO — PREVALECE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tu respuesta debe ser ÚNICAMENTE un objeto JSON válido.

• NO incluyas código TypeScript, TSX ni texto explicativo.
• Si usas fence, que sea un solo bloque \`\`\`json ... \`\`\`.

Estructura raíz obligatoria:
{
  "title": string,
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "sequences": [ ... ]
}

Cada elemento de "sequences":
• "id": string único (ej. "seq-intro", "seq-stats", "seq-outro")
• "order": número entero, 0-based
• "sceneType": uno de:
    sc-intro | stat-hero | stat-grid |
    bar-chart | line-chart | donut-chart |
    comparison | leaderboard | insight | sc-outro |
    image | video | audio | lottie | captions
• "durationInFrames": número > 0
• "sceneData": objeto con los campos según el tipo (ver system prompt)
• "transition": {
    "type": "fade"|"slide"|"wipe"|"flip"|"clock-wipe"|"none",
    "durationInFrames": 20,
    "timing": "spring",
    "direction"?: "from-left"|"from-right"|"from-top"|"from-bottom"
  }
  La última escena visual no necesita transition.
  RECOMENDADO: usa siempre "timing": "spring" para movimiento orgánico.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️ DURACIÓN (PRIORIDAD MÁXIMA)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Si el usuario pide duración explícita (ej. "30 segundos", "1 minuto"), respétala:
  totalFramesObjetivo = segundosPedidos × 30.
• Si no especifica duración, usa 30–45 segundos como default.
• Si faltan datos: añade escenas de insight, comparativas o assets del usuario.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎧 ELEVENLABS — UNA VOZ + MÚSICA DE FONDO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El backend genera el audio real desde sceneData._elevenlabs y rellena "src" con la URL.
Sin _elevenlabs no habrá audio. SIEMPRE incluye música y UNA voz completa.

REGLA DE ORO: UNA sola pista de voz para todo el video (no una por escena).
La voz narra el reel completo de principio a fin — como un documental.

━━━━━ ESTRUCTURA DE SECUENCIAS DE AUDIO ━━━━━

Siempre en este orden al inicio del array "sequences":

  order 0 → música de fondo (loop: true, durationInFrames: totalBrutoFrames)
  order 1 → voz única completa  (loop: false, durationInFrames: totalBrutoFrames)
  order 2 → sc-intro (primera escena visual)
  order 3 → stat-hero
  ...

El sistema ancla cada pista de audio a la primera escena visual cuyo order >= audio.order.
Con order 0 y order 1, ambas pistas arrancan desde el frame 0 del video. ✓

━━━━━ DURACIÓN DE LOS AUDIOS ━━━━━

• totalBrutoFrames = Σ(durationInFrames de TODAS las escenas VISUALES)
  (No resta transiciones — es la suma bruta, para que los audios no se corten)

• música:  durationInFrames = totalBrutoFrames  (y loop: true por si acaso)
• voz:     durationInFrames = totalBrutoFrames  (una sola pista, dura todo el video)
• sfx:     durationInFrames = durationSeconds × 30  (muy cortos, opcionales)

━━━━━ CALIBRACIÓN DEL GUION — CRÍTICO ━━━━━

ElevenLabs narra a ~2.2 palabras/segundo. Escribe EXACTAMENTE este número de palabras:

  totalSegundos = totalBrutoFrames / 30
  max_palabras  = totalSegundos × 2.2   ← NO superes este límite

  Ejemplos:
    totalBrutoFrames = 900  (30s) → máx  66 palabras
    totalBrutoFrames = 1200 (40s) → máx  88 palabras
    totalBrutoFrames = 1350 (45s) → máx  99 palabras
    totalBrutoFrames = 1800 (60s) → máx 132 palabras

  ANTES de finalizar el JSON: cuenta las palabras del guion y ajusta si superas el límite.
  Si el guion es más corto (±10%), mejor — habrá una pausa natural al final.

━━━━━ MARCADORES _elevenlabs ━━━━━

MÚSICA DE FONDO (order 0):
{
  "id": "seq-music",
  "order": 0,
  "sceneType": "audio",
  "durationInFrames": <totalBrutoFrames>,
  "sceneData": {
    "src": "",
    "volume": 0.14,
    "loop": true,
    "_elevenlabs": {
      "type": "music",
      "prompt": "<género, BPM, mood — SIEMPRE instrumental, sin voz ni lírica. Ej: 'upbeat corporate electronic, inspiring, 95 BPM, no vocals, instrumental only'>",
      "durationMs": <totalBrutoFrames / 30 * 1000>
    }
  },
  "transition": { "type": "none", "durationInFrames": 0, "timing": "linear" }
}

VOZ COMPLETA (order 1):
{
  "id": "seq-voice",
  "order": 1,
  "sceneType": "audio",
  "durationInFrames": <totalBrutoFrames>,
  "sceneData": {
    "src": "",
    "volume": 0.9,
    "loop": false,
    "_elevenlabs": {
      "type": "voice",
      "text": "<guion completo del video — narrativo, emocional, ≤ (totalBrutoFrames/30 × 2.2) palabras>"
    }
  },
  "transition": { "type": "none", "durationInFrames": 0, "timing": "linear" }
}

━━━━━ EJEMPLO COMPLETO — REEL DE 30s ━━━━━

totalBrutoFrames = 930 (sc-intro 120 + stat-hero 180 + stat-grid 180 + bar-chart 180 + insight 150 + sc-outro 120)
max_palabras = 930/30 × 2.2 = 68 palabras

"sequences": [
  {
    "id": "seq-music", "order": 0, "sceneType": "audio",
    "durationInFrames": 930,
    "sceneData": {
      "src": "", "volume": 0.07, "loop": true,
      "_elevenlabs": {
        "type": "music",
        "prompt": "upbeat corporate electronic, inspiring and confident, minimal percussion, 95 BPM, no vocals, instrumental only",
        "durationMs": 31000
      }
    },
    "transition": { "type": "none", "durationInFrames": 0, "timing": "linear" }
  },
  {
    "id": "seq-voice", "order": 1, "sceneType": "audio",
    "durationInFrames": 930,
    "sceneData": {
      "src": "", "volume": 0.9, "loop": false,
      "_elevenlabs": {
        "type": "voice",
        "text": "Este mes, algo cambió. Tres millones de personas vieron tu contenido — veinticuatro por ciento más que antes. Instagram lidera con el doble que TikTok. Pero el dato que más importa: tu engagement subió a cuatro punto seis por ciento, mientras el promedio del sector es dos. Estás por encima. SocialCognitive te muestra cómo seguir creciendo."
      }
    },
    "transition": { "type": "none", "durationInFrames": 0, "timing": "linear" }
  },
  { "id": "seq-intro",    "order": 2,  "sceneType": "sc-intro",   "durationInFrames": 120, ... },
  { "id": "seq-hero",     "order": 3,  "sceneType": "stat-hero",   "durationInFrames": 180, ... },
  ...
]

━━━━━ SFX OPCIONALES ━━━━━

Para SFX (ej: impacto al revelar el número hero):
{
  "id": "seq-sfx-impact", "order": 2, "sceneType": "audio",
  "durationInFrames": 60,
  "sceneData": {
    "src": "", "volume": 0.4,
    "_elevenlabs": {
      "type": "sfx",
      "prompt": "deep cinematic impact boom, dramatic number reveal",
      "durationSeconds": 1.5
    }
  },
  "transition": { "type": "none", "durationInFrames": 0, "timing": "linear" }
}
(order 2 = ancla al mismo frame que el sc-intro, order 3 = ancla al stat-hero, etc.)

Paquete mínimo OBLIGATORIO:
  ✓ order 0 — música de fondo, loop true, durationInFrames = totalBrutoFrames
  ✓ order 1 — voz única completa, durationInFrames = totalBrutoFrames, ≤ max_palabras
  Opcional: SFX puntuales en momentos de alto impacto

Responde solo con el JSON (o un único bloque \`\`\`json con ese objeto).
`.trim();
