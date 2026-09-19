// Mismo fix que la web (src/utils/getErrorMessage.ts en rb-suite):
// `error instanceof Error` no es una forma confiable de detectar un
// mensaje real — PostgrestError extiende Error en su código fuente, pero
// eso no garantiza que el check sobreviva al cruzar el bridge de RN. Se
// busca un `.message` usable directamente en vez de confiar en la cadena
// de prototipos.
export function getErrorMessage(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string' &&
    (error as { message: string }).message.length > 0
  ) {
    return (error as { message: string }).message
  }
  return fallback
}
