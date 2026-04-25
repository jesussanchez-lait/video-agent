import fs from "node:fs";
import path from "node:path";

const SKILL_DIR = path.join(process.cwd(), ".claude/skills/remotion-best-practices");

/** Reglas alineadas con SKILL.md; contenido efectivo para el modelo (no solo el índice). */
const RULE_FILES = [
  "rules/animations.md",
  "rules/timing.md",
  "rules/sequencing.md",
  "rules/compositions.md",
  "rules/transitions.md",
  "rules/text-animations.md",
  "rules/charts.md",
  "rules/assets.md",
  "rules/fonts.md",
  "rules/audio.md",
  "rules/subtitles.md",
] as const;

function stripYamlFrontmatter(markdown: string): string {
  if (!markdown.startsWith("---\n")) return markdown;
  const close = markdown.indexOf("\n---\n", 4);
  if (close === -1) return markdown;
  return markdown.slice(close + 5).trimStart();
}

let cached: string | null = null;

/**
 * Texto de la skill remotion-best-practices del repo (SKILL + reglas clave) para el system prompt de Claude.
 */
export function getRemotionBestPracticesForSystemPrompt(): string {
  if (cached !== null) return cached;

  const chunks: string[] = [
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "REMOTION BEST PRACTICES (skill del proyecto)",
    "Siguientes secciones provienen de .agents/skills/remotion-best-practices/.",
    "Aplícalas junto con el system prompt principal al diseñar animaciones, timing, composiciones y assets.",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
  ];

  try {
    const skillPath = path.join(SKILL_DIR, "SKILL.md");
    const skillRaw = fs.readFileSync(skillPath, "utf8");
    chunks.push(stripYamlFrontmatter(skillRaw));

    for (const rel of RULE_FILES) {
      const filePath = path.join(SKILL_DIR, rel);
      if (!fs.existsSync(filePath)) continue;
      chunks.push("\n\n---\n", `# ${rel}\n\n`, fs.readFileSync(filePath, "utf8"));
    }

    cached = chunks.join("");
  } catch (err) {
    console.error("[ai/composition] No se pudo cargar remotion-best-practices:", err);
    cached =
      "\n\n(Nota interna: no se encontró la skill en .agents/skills/remotion-best-practices; despliega esa carpeta o revisa process.cwd().)\n";
  }

  return cached;
}
