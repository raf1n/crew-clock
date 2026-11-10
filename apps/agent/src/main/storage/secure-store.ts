import { safeStorage } from 'electron';

import { log } from '../lib/logger';

const ENCRYPTED_PREFIX = 'enc:';
const PLAIN_PREFIX = 'plain:';
let warnedAboutPlaintext = false;

export function protectToken(token: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return `${ENCRYPTED_PREFIX}${safeStorage.encryptString(token).toString('base64')}`;
  }
  if (!warnedAboutPlaintext) {
    log.warn('OS encryption unavailable; device token stored with local file permissions only');
    warnedAboutPlaintext = true;
  }
  return `${PLAIN_PREFIX}${token}`;
}

export function revealToken(value: string | null): string | null {
  if (!value) {
    return null;
  }
  if (value.startsWith(ENCRYPTED_PREFIX)) {
    try {
      return safeStorage.decryptString(Buffer.from(value.slice(ENCRYPTED_PREFIX.length), 'base64'));
    } catch {
      return null;
    }
  }
  if (value.startsWith(PLAIN_PREFIX)) {
    return value.slice(PLAIN_PREFIX.length);
  }
  return value;
}
