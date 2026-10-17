/** SPEC 63 RS-1: small crash-tolerance helpers shared by the build (kept out of build.ts so they are testable and the build diff stays small). */
import { spawn } from 'node:child_process'
import { closeSync, existsSync, openSync, readFileSync, renameSync, statSync, writeFileSync, readSync, fstatSync } from 'node:fs'

/** JSON read that names the file in the error (a bare «Unexpected end of JSON input» 20 minutes into a build says nothing) */
export function readJson<T>(p: string): T {
  let s: string
  try { s = readFileSync(p, 'utf8') } catch (e) { throw new Error(`cannot read ${p}: ${(e as Error).message}`) }
  try { return JSON.parse(s) as T } catch (e) { throw new Error(`${p} is not valid JSON (truncated by a killed writer?): ${(e as Error).message}`) }
}

/** write tmp, then rename */
export function writeJsonAtomic(p: string, text: string) {
  const tmp = `${p}.${process.pid}.tmp`
  writeFileSync(tmp, text); renameSync(tmp, p)
}

/** the last `n` bytes of a file, as text (the tail of a stage log for an error message) */
function tail(p: string, n = 2000): string {
  try {
    const fd = openSync(p, 'r')
    try { const size = fstatSync(fd).size, len = Math.min(n, size), b = Buffer.alloc(len); readSync(fd, b, 0, len, size - len); return b.toString('utf8') } finally { closeSync(fd) }
  } catch { return '' }
}

/**
 * Run a child process with stdout+stderr streamed to a log file (no maxBuffer to overflow); rejects on a non-zero exit or a spawn error,
 * with the log tail in the message.
 */
export function runLogged(cmd: string, args: string[], o: { cwd: string; log: string; env?: NodeJS.ProcessEnv }): Promise<void> {
  return new Promise((res, rej) => {
    const fd = openSync(o.log, 'w')
    const p = spawn(cmd, args, { cwd: o.cwd, env: o.env ?? process.env, stdio: ['ignore', fd, fd] })
    p.on('error', e => { closeSync(fd); rej(new Error(`${cmd} failed to start: ${e.message}`)) })
    p.on('close', code => { closeSync(fd); code === 0 ? res() : rej(new Error(`${cmd} ${args.join(' ')} exited ${code}; log ${o.log}:\n${tail(o.log)}`)) })
  })
}

/** a Python-stage output is fresh when it exists and is not older than the request file it answers */
export function isFresh(output: string, request: string): boolean {
  if (!existsSync(output)) return false
  if (!existsSync(request)) return true
  return statSync(output).mtimeMs >= statSync(request).mtimeMs
}
