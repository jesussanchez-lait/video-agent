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
    "timing": "linear"|"spring",
    "direction"?: "from-left"|"from-right"|"from-top"|"from-bottom"
  }
  La última escena visual no necesita transition.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️ DURACIÓN (PRIORIDAD MÁXIMA)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Si el usuario pide duración explícita (ej. "30 segundos", "1 minuto"), respétala:
  totalFramesObjetivo = segundosPedidos × 30. Reparte entre escenas.
• Si no especifica duración, elige lo natural para el contenido (típico 25–60 s para un reel de datos).
• Si faltan datos para completar el tiempo: añade más contexto, escena de insight, comparativas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎧 ELEVENLABS — OBLIGATORIO (música + voz)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El backend genera el audio real desde sceneData._elevenlabs y rellena "src" con la URL.
Sin _elevenlabs no habrá audio automático.

Proceso:
1. Diseña todas las escenas visuales con sus duraciones.
2. Calcula totalBrutoFrames ≈ suma de durationInFrames de escenas visuales.
3. Ajusta duraciones de escenas para que coincidan con la narración (~8 s visual = ~240 frames).
4. Añade secuencias sceneType "audio" con _elevenlabs.

Sincronización (el reproductor usa "order"):
• Pista de música: order 0, index 0 del array → arranca con la primera escena visual.
• Voz de una escena: coloca el audio INMEDIATAMENTE ANTES de esa escena visual en el array.
  Ejemplo: [ música(order:0), audio_voz_intro(order:1), sc-intro(order:2), audio_voz_stats(order:3), stat-hero(order:4) ]

sceneType "audio" — sceneData obligatorio:
• "src": ""                   (vacío; backend lo rellena)
• "volume": 0.22–1            (música: ~0.22; voz: ~0.9; sfx: ~0.5)
• "loop": true                (solo para música de fondo)
• "durationInFrames": número
    – música:  totalBrutoFrames (= suma durationInFrames de escenas VISUALES)
    – voz:     durationInFrames de la escena visual que acompaña + 60 (margen 2 s para que el TTS no se corte)
    – sfx:     durationSeconds × 30

⚠️  CRÍTICO — durationInFrames de VOZ:
    La IA de voz (ElevenLabs) genera audio de duración variable. Si pones
    durationInFrames igual a la escena, Remotion CORTARÁ la voz a mitad de frase.
    Siempre añade 60 frames de margen: durationInFrames = escena_acompañada + 60.

Marcador _elevenlabs (dentro de sceneData):

Música:
  "_elevenlabs": {
    "type": "music",
    "prompt": "<género, BPM, instrumentos, mood — específico. SIEMPRE instrumental, sin voces ni canto>",
    "durationMs": <totalBrutoFrames / 30 * 1000>
  }

Voz:
  "_elevenlabs": {
    "type": "voice",
    "text": "<guion hablado — mismo idioma que el video; ajusta la extensión para que quepa en (escena_acompañada/30) segundos>"
  }

SFX (opcional):
  "_elevenlabs": {
    "type": "sfx",
    "prompt": "<descripción del sonido>",
    "durationSeconds": <0.5–8>
  }

Paquete mínimo recomendado:
• 1× música en order 0, loop true.
• 1× voz por cada escena importante (intro, escenas de datos clave, outro).
• La voz debe describir lo que se muestra en pantalla en ese momento.

Responde solo con el JSON (o un único bloque \`\`\`json con ese objeto).
`.trim();
