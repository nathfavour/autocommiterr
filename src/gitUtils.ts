import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

/**
 * Run git command using Node.js
 */
export function runGitCommand(cmd: string, cwd: string): string {
  try {
    const [command, ...args] = cmd.split(' ');
    const proc = spawnSync(command, args, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (proc.error) {
      throw proc.error;
    }

    if (proc.status !== 0) {
      const stderr = proc.stderr || '';
      throw new Error(stderr || `Git command failed: ${cmd}`);
    }

    return (proc.stdout || '').trim();
  } catch (e) {
    throw e instanceof Error ? e : new Error(String(e));
  }
}

/**
 * Stage all changes
 */
export function stageAllChanges(cwd: string): void {
  runGitCommand('git add .', cwd);
}

/**
 * Get list of staged files
 */
export function getStagedFiles(cwd: string): string {
  return runGitCommand('git diff --staged --name-only', cwd);
}

/**
 * Commit with a message
 */
export async function commit(cwd: string, message: string): Promise<void> {
  // Use spawnSync directly with proper arguments
  const proc = spawnSync('git', ['commit', '-m', message], {
    cwd,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  
  if (proc.error) {
    throw proc.error;
  }
  
  if (proc.status !== 0) {
    const stderr = proc.stderr || '';
    throw new Error(stderr || 'Git commit failed');
  }
}

/**
 * Push changes
 */
export function push(cwd: string): void {
  runGitCommand('git push', cwd);
}

/**
 * Get current git repository root
 */
export function getRepoRoot(): string {
  try {
    return runGitCommand('git rev-parse --show-toplevel', process.cwd());
  } catch (e) {
    throw new Error('Not inside a git repository');
  }
}

/**
 * Ensure .gitignore safety
 */
export async function ensureGitignoreSafety(repoRoot: string): Promise<void> {
  const gitignorePath = path.join(repoRoot, '.gitignore');
  let existing = '';
  
  try {
    existing = fs.readFileSync(gitignorePath, 'utf8');
  } catch (e) {
    existing = '';
  }

  const lines = existing.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#'));

  const patternMatches = (pattern: string, p: string) => {
    const esc = pattern.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&').replace(/\\\*/g, '.*').replace(/\\\?/g, '.');
    const re = new RegExp('^' + esc + '$');
    return re.test(p);
  };

  const isIgnored = (relPath: string) => {
    const p = relPath.split(path.sep).join('/');
    for (const pat of lines) {
      if (pat === p) {
        return true;
      }
      if (pat.endsWith('/')) {
        if (p === pat.slice(0, -1) || p.startsWith(pat)) {
          return true;
        }
      }
      try {
        const esc = pat.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&').replace(/\\\*/g, '.*').replace(/\\\?/g, '.');
        const re = new RegExp('^' + esc + '$');
        if (re.test(p)) {
          return true;
        }
      } catch {
        // ignore bad patterns
      }
    }
    return false;
  };

  const configPatterns = ['*.env*', '.env*', 'docx/', '.docx/'];
  const required = configPatterns;
  const toAppend: string[] = [];
  
  for (const req of required) {
    let found = false;
    for (const l of lines) {
      if (l === req) {
        found = true;
        break;
      }
      try {
        const esc = l.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&').replace(/\\\*/g, '.*').replace(/\\\?/g, '.');
        if (new RegExp('^' + esc + '$').test(req)) {
          found = true;
          break;
        }
      } catch { }
    }
    if (!found) {
      toAppend.push(`# Added by Autocommiter: ensure ${req}`);
      toAppend.push(req);
    }
  }

  // Find nested .git directories
  const nestedGitParents: string[] = [];
  function walk(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        const rel = path.relative(repoRoot, full);
        const relPosix = rel.split(path.sep).join('/');
        
        if (isIgnored(relPosix)) {
          if (e.isDirectory()) {
            continue;
          }
        }
        
        if (e.isDirectory()) {
          if (e.name === '.git') {
            const parent = path.dirname(full);
            const parentRel = path.relative(repoRoot, parent).split(path.sep).join('/');
            if (parentRel !== '' && parentRel !== '.') {
              if (!nestedGitParents.includes(parentRel)) {
                nestedGitParents.push(parentRel);
              }
            }
            continue;
          }
          try {
            walk(full);
          } catch { }
        }
      }
    } catch (e) {
      // ignore walk errors
    }
  }
  
  try {
    walk(repoRoot);
  } catch (e) {
    // ignore
  }

  // Parse .gitmodules if present
  const gitmodulesPath = path.join(repoRoot, '.gitmodules');
  const gitmodulePaths: string[] = [];
  try {
    const gm = fs.readFileSync(gitmodulesPath, 'utf8');
    const pathRe = /^\s*path\s*=\s*(.+)$/gim;
    let m: RegExpExecArray | null;
    while ((m = pathRe.exec(gm)) !== null) {
      gitmodulePaths.push(m[1].trim().split(path.sep).join('/'));
    }
  } catch { }

  // For each nested git parent, ensure it's not ignored or in gitmodules
  for (const p of nestedGitParents) {
    if (gitmodulePaths.includes(p)) {
      continue;
    }
    if (isIgnored(p)) {
      continue;
    }
    try {
      const subGitmodules = path.join(repoRoot, p, '.gitmodules');
      if (fs.existsSync(subGitmodules)) {
        const sub = fs.readFileSync(subGitmodules, 'utf8');
        if (sub.includes(p)) {
          continue;
        }
      }
    } catch { }
    toAppend.push(`# Added by Autocommiter: ignore nested repo ${p}`);
    toAppend.push(p + '/');
  }

  if (toAppend.length > 0) {
    const toWrite = (existing && existing.trim().length > 0 ? existing + '\n' : '') + toAppend.join('\n') + '\n';
    fs.writeFileSync(gitignorePath, toWrite, { encoding: 'utf8' });
    console.log('✓ Updated .gitignore to protect sensitive files and nested repos.');
  }
}

export default {
  runGitCommand,
  stageAllChanges,
  getStagedFiles,
  commit,
  push,
  getRepoRoot,
  ensureGitignoreSafety,
};
