// Turns database errors into something a user can read.
// Errors raised on purpose by our own database rules (rate limits, reserved names,
// blocked links) use Postgres code P0001 and already carry a human-readable message.
type MaybeDbError = { code?: string; message?: string } | null | undefined;

export const friendlyDbError = (error: MaybeDbError, fallback: string): string => {
  if (error?.code === "P0001" && error.message) return error.message;
  if (error?.code === "23505") return "That username is already taken. Please choose a different one.";
  return fallback;
};
