import { createHash } from 'node:crypto';

import { hashToken, tokenHashMatches } from './token-hash';

describe('token hashing', () => {
  it('produces the sha256 hex digest of the token', () => {
    expect(hashToken('abc')).toBe(createHash('sha256').update('abc').digest('hex'));
  });

  it('matches only the token that produced the hash', () => {
    const hash = hashToken('refresh-token-one');

    expect(tokenHashMatches(hash, 'refresh-token-one')).toBe(true);
    expect(tokenHashMatches(hash, 'refresh-token-two')).toBe(false);
  });

  it('rejects malformed hashes without throwing', () => {
    expect(tokenHashMatches('not-a-hex-digest', 'anything')).toBe(false);
  });
});
