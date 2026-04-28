import { describe, expect, it } from 'vitest';
import { McpServerInputSchema } from './schema.js';

const baseStdio = {
  transport: 'stdio' as const,
  description: '',
  scope: 'user' as const,
  command: 'npx',
  args: ['-y'],
  env: {},
};

describe('McpServerInputSchema name validation', () => {
  it('accepts alphanumerics, underscore, and hyphen', () => {
    for (const name of ['chrome-devtools', 'context7', 'foo_bar', 'A1', '0abc']) {
      const result = McpServerInputSchema.safeParse({ ...baseStdio, name });
      expect(result.success, `name="${name}" should be valid`).toBe(true);
    }
  });

  it('rejects names containing "." (Codex CLI rejects them at runtime)', () => {
    const result = McpServerInputSchema.safeParse({ ...baseStdio, name: 'foo.bar' });
    expect(result.success).toBe(false);
  });

  it('rejects names containing other special characters', () => {
    for (const name of ['foo bar', 'foo/bar', 'foo@bar', 'foo:bar', '']) {
      const result = McpServerInputSchema.safeParse({ ...baseStdio, name });
      expect(result.success, `name="${name}" should be invalid`).toBe(false);
    }
  });
});
