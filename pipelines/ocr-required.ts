/**
 * An owner-supplied OCR input that is absent: a local run skips the dictionary (the build runs without the book), the WORKER build must not (ops/worker/env.sh exports BULP_REQUIRE_OCR=1
 * and the OCR dirs of every declared dictionary), so a missing dir stops the build with a message instead of a quiet «skipped» line in a log nobody reads.
 */
export function ocrMissing(what: string): undefined {
  if (process.env['BULP_REQUIRE_OCR'] === '1') throw new Error(`OCR input missing and BULP_REQUIRE_OCR=1: ${what} (set the dir in ops/worker/env.sh, or run ops/worker/ocr-*.sh first)`)
  console.log(`${what}, skipped`)
  return undefined
}
