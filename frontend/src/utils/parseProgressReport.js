/**
 * Parse progress-report.txt-style text from POST /progress-report into UI-friendly blocks.
 * Tolerant of small format variations; falls back to line-based bullets if structure unknown.
 */

const SUMMARY_MARKER = "--- Summary ---";
const RUNS_MARKER = /^--- All quest runs/;
const END_MARKER = "--- End of report ---";

function skipBlanks(lines, start) {
  let i = start;
  while (i < lines.length && lines[i].trim() === "") i += 1;
  return i;
}

/**
 * @param {string} text
 * @returns {{ kind: 'structured', data: object } | { kind: 'lines', lines: string[] }}
 */
export function parseProgressReport(text) {
  if (!text || typeof text !== "string") {
    return { kind: "lines", lines: [] };
  }

  const lines = text.split(/\r?\n/);
  let i = 0;

  let title = "";
  if (lines[0]?.trim().startsWith("===")) {
    title = lines[0].replace(/^===\s*|\s*===\s*$/g, "").trim();
    i = 1;
  }

  let generated = "";
  if (lines[i]?.trim().startsWith("Generated")) {
    generated = lines[i].replace(/^Generated\s*\(UTC\):\s*/i, "").trim();
    i += 1;
  }

  i = skipBlanks(lines, i);

  const intro = [];
  let para = [];
  let foundSummary = false;
  while (i < lines.length) {
    const t = lines[i].trim();
    if (t === SUMMARY_MARKER) {
      foundSummary = true;
      if (para.length) intro.push(para.join(" "));
      i += 1;
      break;
    }
    if (t === "") {
      if (para.length) {
        intro.push(para.join(" "));
        para = [];
      }
    } else {
      para.push(t);
    }
    i += 1;
  }

  if (!foundSummary) {
    if (para.length) intro.push(para.join(" "));
    const flat = [...intro, ...lines.slice(i)].join("\n").trim();
    return {
      kind: "lines",
      lines: flat
        ? flat
            .split(/\n/)
            .map((l) => l.trim())
            .filter(Boolean)
        : [],
    };
  }

  const summary = [];
  let runsMarkerLine = "";
  while (i < lines.length) {
    const t = lines[i].trim();
    if (RUNS_MARKER.test(t)) {
      runsMarkerLine = t;
      i += 1;
      break;
    }
    if (t) summary.push(t);
    i += 1;
  }

  const runs = [];
  let runsEmpty = null;

  while (i < lines.length) {
    const raw = lines[i];
    const t = raw.trim();
    if (t === END_MARKER) break;
    if (t === "") {
      i += 1;
      continue;
    }
    if (/none yet/i.test(t) && t.includes("(")) {
      runsEmpty = t;
      i += 1;
      continue;
    }

    const runMatch = t.match(/^\[(\d+)\]\s+(.+)$/);
    if (!runMatch) {
      i += 1;
      continue;
    }

    const run = {
      index: runMatch[1],
      title: runMatch[2],
      fields: [],
      notes: [],
    };
    i += 1;

    while (i < lines.length) {
      const L = lines[i];
      const trimmed = L.trim();
      if (trimmed === "") {
        i += 1;
        continue;
      }
      if (trimmed === END_MARKER) break;
      if (/^\[\d+\]\s/.test(trimmed)) break;
      if (trimmed.startsWith("(")) {
        run.notes.push(trimmed);
        i += 1;
        continue;
      }
      const goal = trimmed.match(/^Goal:\s*(.*)$/);
      if (goal) {
        run.fields.push({ label: "Goal", value: goal[1] });
        i += 1;
        continue;
      }
      const created = trimmed.match(/^Created:\s*(.*)$/);
      if (created) {
        run.fields.push({ label: "Created", value: created[1] });
        i += 1;
        continue;
      }
      const tasks = trimmed.match(/^Tasks done:\s*(.*)$/);
      if (tasks) {
        run.fields.push({ label: "Tasks done", value: tasks[1] });
        i += 1;
        continue;
      }
      i += 1;
    }

    runs.push(run);
  }

  const hasStructure =
    title ||
    generated ||
    intro.length > 0 ||
    summary.length > 0 ||
    runs.length > 0 ||
    runsEmpty;

  if (hasStructure) {
    return {
      kind: "structured",
      data: {
        title,
        generated,
        intro,
        summary,
        runs,
        runsEmpty,
        runsSectionTitle:
          runsMarkerLine
            .replace(/^\s*---\s*/, "")
            .replace(/\s*---\s*$/, "")
            .trim() || "All quest runs",
      },
    };
  }

  return {
    kind: "lines",
    lines: lines.map((l) => l.trim()).filter(Boolean),
  };
}
