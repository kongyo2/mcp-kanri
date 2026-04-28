import { describe, expect, it } from 'vitest';
import type { McpServer } from './schema.js';
import {
  formatServer,
  quoteShell,
  toClaudeCli,
  toCodexCli,
  toCodexToml,
  toMcpJson,
  toVscodeJson,
} from './converters.js';

const stdioBase: McpServer = {
  id: 'srv-1',
  name: 'chrome-devtools',
  description: '',
  transport: 'stdio',
  command: 'npx',
  args: ['-y', 'chrome-devtools-mcp@latest'],
  env: {},
  scope: 'user',
  createdAt: 0,
  updatedAt: 0,
};

const stdioWithEnv: McpServer = {
  ...stdioBase,
  name: 'airtable',
  command: 'npx',
  args: ['-y', 'airtable-mcp-server'],
  env: { AIRTABLE_API_KEY: 'YOUR_KEY' },
  scope: 'local',
};

const httpServer: McpServer = {
  id: 'srv-2',
  name: 'notion',
  description: '',
  transport: 'http',
  url: 'https://mcp.notion.com/mcp',
  headers: { Authorization: 'Bearer xyz' },
  scope: 'user',
  createdAt: 0,
  updatedAt: 0,
};

describe('quoteShell', () => {
  it('does not quote safe tokens', () => {
    expect(quoteShell('npx')).toBe('npx');
    expect(quoteShell('chrome-devtools-mcp@latest')).toBe('chrome-devtools-mcp@latest');
    expect(quoteShell('KEY=val.ue/path')).toBe('KEY=val.ue/path');
  });

  it('single-quotes tokens with spaces or special chars', () => {
    expect(quoteShell('hello world')).toBe("'hello world'");
    expect(quoteShell("it's")).toBe("'it'\\''s'");
    expect(quoteShell('')).toBe("''");
  });
});

describe('toClaudeCli', () => {
  it('produces stdio claude mcp add command (user scope)', () => {
    expect(toClaudeCli(stdioBase)).toBe(
      'claude mcp add --transport stdio --scope user chrome-devtools -- npx -y chrome-devtools-mcp@latest',
    );
  });

  it('includes --env flags and quotes values when needed', () => {
    expect(toClaudeCli(stdioWithEnv)).toBe(
      'claude mcp add --transport stdio --scope local --env AIRTABLE_API_KEY=YOUR_KEY airtable -- npx -y airtable-mcp-server',
    );
  });

  it('produces http command with --header flag', () => {
    expect(toClaudeCli(httpServer)).toBe(
      "claude mcp add --transport http --scope user --header 'Authorization: Bearer xyz' notion https://mcp.notion.com/mcp",
    );
  });
});

describe('toCodexCli', () => {
  it('produces stdio codex mcp add command', () => {
    expect(toCodexCli(stdioBase)).toBe(
      'codex mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest',
    );
  });

  it('returns guidance comment for non-stdio (Codex CLI does not support remote add yet)', () => {
    expect(toCodexCli(httpServer)).toContain('codex mcp add');
    expect(toCodexCli(httpServer)).toContain('config.toml');
  });
});

describe('toMcpJson', () => {
  it('emits standard mcpServers JSON for stdio', () => {
    const parsed: unknown = JSON.parse(toMcpJson(stdioBase));
    expect(parsed).toEqual({
      mcpServers: {
        'chrome-devtools': {
          command: 'npx',
          args: ['-y', 'chrome-devtools-mcp@latest'],
        },
      },
    });
  });

  it('emits http entry with type/url/headers', () => {
    const parsed: unknown = JSON.parse(toMcpJson(httpServer));
    expect(parsed).toEqual({
      mcpServers: {
        notion: {
          type: 'http',
          url: 'https://mcp.notion.com/mcp',
          headers: { Authorization: 'Bearer xyz' },
        },
      },
    });
  });
});

describe('toVscodeJson', () => {
  it('uses servers (not mcpServers) as the top-level key for VS Code', () => {
    const parsed: unknown = JSON.parse(toVscodeJson(stdioBase));
    expect(parsed).toEqual({
      servers: {
        'chrome-devtools': {
          command: 'npx',
          args: ['-y', 'chrome-devtools-mcp@latest'],
        },
      },
    });
  });
});

describe('toCodexToml', () => {
  it('uses [mcp_servers.<name>] table with snake_case key', () => {
    const text = toCodexToml(stdioBase);
    expect(text).toContain('[mcp_servers.chrome-devtools]');
    expect(text).toContain('command = "npx"');
    expect(text).toContain('args = ["-y", "chrome-devtools-mcp@latest"]');
  });

  it('emits inline table for env', () => {
    const text = toCodexToml(stdioWithEnv);
    expect(text).toContain('env = { AIRTABLE_API_KEY = "YOUR_KEY" }');
  });

  it('emits url for remote server', () => {
    const text = toCodexToml(httpServer);
    expect(text).toContain('[mcp_servers.notion]');
    expect(text).toContain('url = "https://mcp.notion.com/mcp"');
    expect(text).toContain('http_headers = { Authorization = "Bearer xyz" }');
  });
});

describe('formatServer dispatch', () => {
  it('returns correct format for each id', () => {
    expect(formatServer('claude-cli', stdioBase)).toContain('claude mcp add');
    expect(formatServer('codex-cli', stdioBase)).toContain('codex mcp add');
    expect(formatServer('mcp-json', stdioBase)).toContain('"mcpServers"');
    expect(formatServer('vscode-json', stdioBase)).toContain('"servers"');
    expect(formatServer('codex-toml', stdioBase)).toContain('[mcp_servers.');
  });
});
