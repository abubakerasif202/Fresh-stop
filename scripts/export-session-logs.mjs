import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const CONV_ID = "8ccffccd-423a-451a-928d-7f10a1f5b8c7";
const BRAIN_DIR = `C:/Users/abuba/.gemini/antigravity-cli/brain/${CONV_ID}`;
const DOWNLOADS_DIR = "C:/Users/abuba/Downloads/fresh-stop-session-logs";
const WORKSPACE_DIR = "C:/Users/abuba/fresh-stop/session-logs";
const ZIP_PATH = "C:/Users/abuba/Downloads/fresh-stop-session-logs.zip";

console.log("Starting session logs export...");

// 1. Ensure target directories exist
mkdirSync(DOWNLOADS_DIR, { recursive: true });
mkdirSync(join(DOWNLOADS_DIR, "tasks"), { recursive: true });
mkdirSync(WORKSPACE_DIR, { recursive: true });
mkdirSync(join(WORKSPACE_DIR, "tasks"), { recursive: true });

// 2. Copy raw transcripts
const fullLogSrc = join(BRAIN_DIR, ".system_generated/logs/transcript_full.jsonl");
const compactLogSrc = join(BRAIN_DIR, ".system_generated/logs/transcript.jsonl");

if (existsSync(fullLogSrc)) {
  copyFileSync(fullLogSrc, join(DOWNLOADS_DIR, "transcript_full.jsonl"));
  copyFileSync(fullLogSrc, join(WORKSPACE_DIR, "transcript_full.jsonl"));
  console.log("✓ Copied transcript_full.jsonl");
}

if (existsSync(compactLogSrc)) {
  copyFileSync(compactLogSrc, join(DOWNLOADS_DIR, "transcript.jsonl"));
  copyFileSync(compactLogSrc, join(WORKSPACE_DIR, "transcript.jsonl"));
  console.log("✓ Copied transcript.jsonl");
}

// 3. Copy plan artifact
const planArtifactSrc = join(BRAIN_DIR, "fresh-stop-ecommerce-upgrade-plan.md");
if (existsSync(planArtifactSrc)) {
  copyFileSync(planArtifactSrc, join(DOWNLOADS_DIR, "fresh-stop-ecommerce-upgrade-plan.md"));
  copyFileSync(planArtifactSrc, join(WORKSPACE_DIR, "fresh-stop-ecommerce-upgrade-plan.md"));
  console.log("✓ Copied fresh-stop-ecommerce-upgrade-plan.md");
}

// 4. Copy background task logs
const tasksDirSrc = join(BRAIN_DIR, ".system_generated/tasks");
if (existsSync(tasksDirSrc)) {
  const taskFiles = readdirSync(tasksDirSrc).filter((f) => f.endsWith(".log"));
  for (const file of taskFiles) {
    copyFileSync(join(tasksDirSrc, file), join(DOWNLOADS_DIR, "tasks", file));
    copyFileSync(join(tasksDirSrc, file), join(WORKSPACE_DIR, "tasks", file));
  }
  console.log(`✓ Copied ${taskFiles.length} task log files`);
}

// 5. Generate human-readable Markdown transcript
if (existsSync(fullLogSrc)) {
  console.log("Generating human-readable markdown transcript...");
  const content = readFileSync(fullLogSrc, "utf8");
  const lines = content.split("\n").filter((l) => l.trim().length > 0);

  let md = `# Fresh Stop E-Commerce Upgrade — Complete Session Log\n\n`;
  md += `- **Conversation ID**: \`${CONV_ID}\`\n`;
  md += `- **Export Date**: ${new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney" })} (Sydney, NSW)\n`;
  md += `- **Total Raw Steps**: ${lines.length}\n`;
  md += `- **Repository**: \`abubakerasif202/Fresh-stop\`\n\n`;
  md += `---\n\n`;

  let stepCount = 0;
  for (const line of lines) {
    try {
      const step = JSON.parse(line);
      stepCount++;

      const timestamp = step.created_at ? new Date(step.created_at).toLocaleTimeString("en-AU") : "";
      const source = step.source || "UNKNOWN";
      const type = step.type || "STEP";

      md += `### Step ${step.step_index ?? stepCount} [${source}] — ${type} (${timestamp})\n\n`;

      if (step.content) {
        if (source === "USER_EXPLICIT" || type === "USER_INPUT") {
          md += `**User Prompt:**\n\n\`\`\`text\n${step.content.trim()}\n\`\`\`\n\n`;
        } else if (source === "MODEL") {
          md += `**Assistant Response:**\n\n${step.content.trim()}\n\n`;
        } else {
          md += `**Message Content:**\n\n${step.content.trim()}\n\n`;
        }
      }

      if (step.tool_calls && Array.isArray(step.tool_calls) && step.tool_calls.length > 0) {
        md += `**Tool Calls:**\n\n`;
        for (const tc of step.tool_calls) {
          md += `- **Tool**: \`${tc.name || tc.tool_name}\`\n`;
          if (tc.summary || tc.toolSummary) {
            md += `  - **Action**: ${tc.summary || tc.toolSummary}\n`;
          }
          if (tc.arguments || tc.args) {
            const args = tc.arguments || tc.args;
            const argStr = typeof args === "string" ? args : JSON.stringify(args, null, 2);
            if (argStr.length > 300) {
              md += `  - **Arguments** (truncated):\n\`\`\`json\n${argStr.slice(0, 300)}...\n\`\`\`\n`;
            } else {
              md += `  - **Arguments**:\n\`\`\`json\n${argStr}\n\`\`\`\n`;
            }
          }
        }
        md += `\n`;
      }

      md += `---\n\n`;
    } catch {
      // ignore json parse error on single line
    }
  }

  const readableMdPath = join(DOWNLOADS_DIR, "session_transcript_readable.md");
  const readableWsPath = join(WORKSPACE_DIR, "session_transcript_readable.md");
  writeFileSync(readableMdPath, md, "utf8");
  writeFileSync(readableWsPath, md, "utf8");
  console.log("✓ Generated session_transcript_readable.md");
}

// 6. Create ZIP archive in Downloads
try {
  if (existsSync(ZIP_PATH)) {
    execSync(`powershell -NoProfile -Command "Remove-Item -Force '${ZIP_PATH}'"`);
  }
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${DOWNLOADS_DIR}/*' -DestinationPath '${ZIP_PATH}' -Force"`
  );
  console.log(`✓ Created zip package at ${ZIP_PATH}`);
} catch (zipErr) {
  console.warn("Could not create zip archive:", zipErr.message);
}

console.log("Export complete!");
