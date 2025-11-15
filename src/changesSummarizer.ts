import { spawnSync } from 'bun';

type FileChange = { file: string; change: string };

/**
 * Run git command using Bun's spawnSync
 */
function runGit(cwd: string, cmd: string): string {
  const [gitCmd, ...args] = cmd.split(' ');
  const result = spawnSync([gitCmd, ...args], {
    cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  if (!result.success) {
    return '';
  }

  const output = result.stdout?.toString().trim() || '';
  return output;
}

/**
 * Get list of staged files (names only)
 */
export async function getStagedFiles(cwd: string): Promise<string[]> {
  const out = runGit(cwd, 'git diff --staged --name-only');
  if (!out) {
    return [];
  }
  return out.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

/**
 * Produce a very short analysis of a file's staged diff.
 */
export async function analyzeFileChange(cwd: string, file: string): Promise<string> {
  try {
    const diff = runGit(cwd, `git diff --staged --numstat -- "${file.replace(/"/g, '\\"')}"`);
    if (!diff) {
      return 'unchanged';
    }

    // numstat: added\tremoved\tfile
    const parts = diff.split(/\r?\n/)[0].split(/\t/);
    if (parts.length >= 3) {
      const a = parts[0] === '-' ? 0 : parseInt(parts[0], 10) || 0;
      const r = parts[1] === '-' ? 0 : parseInt(parts[1], 10) || 0;
      return `${a}+/${r}-`;
    }

    // fallback - take small sample of diff hunks
    const hunks = runGit(cwd, `git diff --staged --unified=0 -- "${file.replace(/"/g, '\\"')}"`);
    if (!hunks) {
      return 'mod';
    }
    // pick first non-empty line, trimmed and collapsed
    const first = hunks.split(/\r?\n/).map(l => l.trim()).find(Boolean) || 'mod';
    return first.slice(0, 40).replace(/\s+/g, ' ');
  } catch (e) {
    return 'err';
  }
}

/**
 * Build an array of per-file compact summaries: {file, change}
 */
export async function buildFileChanges(cwd: string): Promise<FileChange[]> {
  const files = await getStagedFiles(cwd);
  const out: FileChange[] = [];
  for (const f of files) {
    const change = await analyzeFileChange(cwd, f);
    out.push({ file: f, change });
  }
  return out;
}

/**
 * Compress file changes to JSON string <= maxLen
 * Strategy:
 *  - Start with file:change for each entry joined by ',' inside an object {files:[...]}.
 *  - If too long, progressively shorten each change to smaller tokens.
 *  - If still too long, drop lower-priority files from the end.
 *  - Always keep at least 1 file entry.
 */
export function compressToJson(fileChanges: FileChange[], maxLen = 400): string {
  if (!fileChanges || fileChanges.length === 0) {
    return JSON.stringify({ files: [] });
  }

  const serialize = (arr: FileChange[], mapFn: (c: string, f: string) => string) => {
    const items = arr.map(fc => `{"f":"${escapeStr(fc.file)}","c":"${escapeStr(mapFn(fc.change, fc.file))}"}`);
    return `{"files": [${items.join(',')}]}`;
  };

  const escapeStr = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');

  const maps: Array<(c: string, f: string) => string> = [];
  maps.push((c) => c); // full
  maps.push((c) => c.slice(0, 12)); // short
  maps.push((c) => c.slice(0, 6));
  maps.push((c) => c.slice(0, 3));
  maps.push((c) => c.slice(0, 1));

  for (let m = 0; m < maps.length; m++) {
    for (let keep = fileChanges.length; keep > 0; keep--) {
      const arr = fileChanges.slice(0, keep);
      const s = serialize(arr, maps[m]);
      if (s.length <= maxLen) {
        return s;
      }
    }
  }

  // Last resort: minimal representation with at least ONE file
  const minimal = fileChanges.slice(0, 1).map(fc => ({
    f: fc.file.split('/').pop() || fc.file,
    c: 'mod'
  }));
  return JSON.stringify({ files: minimal });
}

export default {
  getStagedFiles,
  analyzeFileChange,
  buildFileChanges,
  compressToJson,
};
