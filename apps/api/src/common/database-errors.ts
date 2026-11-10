export function driverErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'driverError' in error) {
    const driverError = (error as { driverError?: { code?: unknown } }).driverError;
    if (typeof driverError?.code === 'string') {
      return driverError.code;
    }
  }
  return undefined;
}

export function isOverlapViolation(error: unknown): boolean {
  return driverErrorCode(error) === '23P01';
}

export function isUniqueViolation(error: unknown): boolean {
  return driverErrorCode(error) === '23505';
}
