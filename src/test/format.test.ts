import { describe, expect, it } from 'vitest';
import { formatBytes, truncate } from '../lib/format';

describe('formatBytes', () => {
  it('handles zero and junk', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(-5)).toBe('0 B');
    expect(formatBytes(Number.NaN)).toBe('0 B');
  });

  it('formats bytes, kilobytes and megabytes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(24_100)).toBe('23.5 KB');
    expect(formatBytes(5_242_880)).toBe('5 MB');
  });
});

describe('truncate', () => {
  it('collapses whitespace and leaves short text alone', () => {
    expect(truncate('  hello   world ', 40)).toBe('hello world');
  });

  it('cuts long text and adds an ellipsis', () => {
    const out = truncate('abcdefghij', 5);
    expect(out).toBe('abcd…');
    expect(out).toHaveLength(5);
  });
});
