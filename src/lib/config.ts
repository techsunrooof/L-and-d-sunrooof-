/*
  Runtime config flags.

  SEQUENTIAL_LOCKING — the day/module/video sequential lock. Default OFF (open):
  every day, module and item opens, and URLs open directly. Progress is still
  recorded exactly as before; the lock rules and completion logic are all still
  computed — they just don't gate access while this is off. Set the env var to
  "on" (or "true"/"1") to restore the original sequential locking with no other
  change.
*/
export function sequentialLockingOn(): boolean {
  const v = (process.env.SEQUENTIAL_LOCKING ?? "").trim().toLowerCase();
  return v === "on" || v === "true" || v === "1";
}
