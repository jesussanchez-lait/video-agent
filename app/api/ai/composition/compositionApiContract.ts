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
🎧 ELEVENLABS — AUDIO OBLIGATORIO (música + voz)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El backend genera el audio real desde sceneData._elevenlabs y rellena "src" con la URL.
Sin _elevenlabs no habrá audio. SIEMPRE incluye al menos música y voz.

Flujo de diseño:
1. Diseña todas las escenas visuales con sus duraciones.
2. Calcula totalBrutoFrames = Σ(durationInFrames escenas visuales).
3. Añade secuencias sceneType "audio" con _elevenlabs.

Orden de secuencias (el reproductor usa "order"):
• Música de fondo: order 0 (la primera), arranca desde el inicio.
• Voz de una escena: colócala INMEDIATAMENTE ANTES de la escena visual en el array.
  Ejemplo completo:
  [
    { order: 0, sceneType: "audio", sceneData: { _elevenlabs: { type: "music", ... }, volume: 0.14, loop: true, src: "" } },
    { order: 1, sceneType: "audio", sceneData: { _elevenlabs: { type: "voice", text: "..." }, volume: 0.9, src: "" } },
    { order: 2, sceneType: "sc-intro", ... },
    { order: 3, sceneType: "audio", sceneData: { _elevenlabs: { type: "voice", text: "..." }, volume: 0.9, src: "" } },
    { order: 4, sceneType: "stat-hero", ... },
    ...
  ]

sceneType "audio" — sceneData obligatorio:
• "src": ""                  (vacío; backend lo rellena con la URL real)
• "volume":
    – música:  0.12–0.18     (SIEMPRE menor que la voz — música es fondo)
    – voz:     0.9           (siempre)
    – sfx:     0.35–0.5
• "loop": true               (SOLO para música de fondo)
• "durationInFrames":
    – música:  totalBrutoFrames (= Σ durationInFrames escenas VISUALES)
    – voz:     durationInFrames de la escena acompañada + 60 (margen 2s anti-corte)
    – sfx:     durationSeconds × 30

⚠️ CRÍTICO — VOZ Y CORTE:
    ElevenLabs genera audio de duración variable según el texto.
    Si pones durationInFrames = duración exacta de la escena, Remotion CORTARÁ la voz a mitad.
    SIEMPRE añade 60 frames de margen: voz.durationInFrames = escena + 60.
    Si la escena es corta (120f), escribe un guion corto (1-2 frases) para que quepa.

Marcador _elevenlabs (dentro de sceneData):

MÚSICA DE FONDO:
  "_elevenlabs": {
    "type": "music",
    "prompt": "<describir género, BPM, instrumentos, mood — SIEMPRE instrumental, sin voz ni lírica>",
    "durationMs": <totalBrutoFrames / 30 * 1000>
  }
  Ejemplos de prompts de música:
  • "upbeat corporate electronic, inspiring, minimal percussion, 95 BPM, no vocals, no lyrics, instrumental only"
  • "modern cinematic ambient, tense but hopeful, synthesizer pads, 80 BPM, instrumental"
  • "hip-hop lo-fi beats, motivational, clean piano chords, 90 BPM, no vocals, instrumental"

VOZ NARRATIVA:
  "_elevenlabs": {
    "type": "voice",
    "text": "<guion hablado — emocional, narrativo, en el idioma del usuario. Ajusta la extensión para que quepa en (escena/30) segundos. Máx 2 frases por escena corta.>"
  }
  Principios del guion:
  • Escribe como si le hablaras a un amigo, no como informe corporativo.
  • El guion describe la EMOCIÓN del dato, no solo el número.
  • Ejemplo malo:  "Las impresiones totales alcanzaron 3.2 millones con un incremento del 24%."
  • Ejemplo bueno: "3.2 millones de personas vieron tu marca. Y crecimos 24% más que antes."
  • Para escenas de 4s (120f): máx 15-20 palabras.
  • Para escenas de 6s (180f): máx 25-35 palabras.
  • Para escenas de 7s (210f): máx 35-45 palabras.

SFX (opcional — solo si agrega valor):
  "_elevenlabs": {
    "type": "sfx",
    "prompt": "<descripción del sonido, ej: 'whoosh transition sound effect, brief' o 'impact boom when number reveals'>",
    "durationSeconds": <0.5–3.0>
  }

Paquete mínimo OBLIGATORIO:
  ✓ 1× música en order 0, loop true.
  ✓ 1× voz para sc-intro.
  ✓ 1× voz para stat-hero (el momento más impactante).
  ✓ 1× voz para insight.
  ✓ 1× voz para sc-outro.
  Opcionales: voz para cada escena de datos, SFX en momentos clave.

Responde solo con el JSON (o un único bloque \`\`\`json con ese objeto).
`.trim();
