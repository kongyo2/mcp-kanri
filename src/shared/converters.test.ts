import { describe, expect, it } from 'vitest';
import type { McpServer } from './schema.js';
import {
  formatServer,
  mcpProxyBridge,
  quoteShell,
  toClaudeCli,
  toClaudeDesktop,
  toCodexCli,
  toCodexToml,
  toGeminiCli,
  toMcpJson,
  toQwenCli,
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

  it('produces streamable HTTP `codex mcp add --url` command', () => {
    const minimalHttp: McpServer = {
      ...httpServer,
      headers: {},
    };
    expect(toCodexCli(minimalHttp)).toBe('codex mcp add notion --url https://mcp.notion.com/mcp');
  });

  it('detects Authorization: Bearer ${ENV} headers and emits --bearer-token-env-var', () => {
    const tokenServer: McpServer = {
      ...httpServer,
      headers: { Authorization: 'Bearer ${NOTION_TOKEN}' },
    };
    expect(toCodexCli(tokenServer)).toBe(
      'codex mcp add notion --url https://mcp.notion.com/mcp --bearer-token-env-var NOTION_TOKEN',
    );
  });

  it('falls back to a follow-up note when arbitrary HTTP headers are present', () => {
    const customHeader: McpServer = {
      ...httpServer,
      headers: { 'X-Custom': 'foo' },
    };
    const out = toCodexCli(customHeader);
    expect(out).toContain('codex mcp add notion --url https://mcp.notion.com/mcp');
    expect(out).toContain('http_headers');
    expect(out).toContain('config.toml');
  });

  it('bridges SSE servers via npx mcp-remote (Codex has no native SSE support)', () => {
    const sseServer: McpServer = {
      id: 'srv-3',
      name: 'notion',
      description: '',
      transport: 'sse',
      url: 'https://mcp.notion.com/sse',
      headers: {},
      scope: 'user',
      createdAt: 0,
      updatedAt: 0,
    };
    expect(toCodexCli(sseServer)).toBe(
      'codex mcp add notion -- npx -y mcp-remote https://mcp.notion.com/sse',
    );
  });

  it('passes SSE headers through to mcp-remote --header flags', () => {
    const sseServer: McpServer = {
      id: 'srv-4',
      name: 'notion',
      description: '',
      transport: 'sse',
      url: 'https://mcp.notion.com/sse',
      headers: { Authorization: 'Bearer xyz' },
      scope: 'user',
      createdAt: 0,
      updatedAt: 0,
    };
    expect(toCodexCli(sseServer)).toBe(
      "codex mcp add notion -- npx -y mcp-remote https://mcp.notion.com/sse --header 'Authorization: Bearer xyz'",
    );
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

  it('emits literal Authorization headers in http_headers', () => {
    const text = toCodexToml(httpServer);
    expect(text).toContain('[mcp_servers.notion]');
    expect(text).toContain('url = "https://mcp.notion.com/mcp"');
    // `Authorization: Bearer xyz` はリテラル値なので bearer_token_env_var ではなく http_headers
    expect(text).toContain('http_headers = { Authorization = "Bearer xyz" }');
    expect(text).not.toContain('bearer_token_env_var');
  });

  it('maps Authorization: Bearer ${ENV_VAR} to bearer_token_env_var (Codex env-backed auth)', () => {
    const tokenServer: McpServer = {
      ...httpServer,
      headers: { Authorization: 'Bearer ${NOTION_TOKEN}' },
    };
    const text = toCodexToml(tokenServer);
    expect(text).toContain('bearer_token_env_var = "NOTION_TOKEN"');
    // `${NOTION_TOKEN}` がリテラルとして http_headers に書き出されないこと
    expect(text).not.toContain('http_headers');
    expect(text).not.toContain('${NOTION_TOKEN}');
  });

  it('maps non-Authorization ${ENV_VAR} headers to env_http_headers', () => {
    const envHeaderServer: McpServer = {
      ...httpServer,
      headers: { 'X-API-Token': '${MY_TOKEN}', 'X-Static': 'literal' },
    };
    const text = toCodexToml(envHeaderServer);
    expect(text).toContain('env_http_headers = { X-API-Token = "MY_TOKEN" }');
    expect(text).toContain('http_headers = { X-Static = "literal" }');
  });

  it('bridges SSE servers via npx mcp-remote in TOML', () => {
    const sseServer: McpServer = {
      id: 'srv-3',
      name: 'notion',
      description: '',
      transport: 'sse',
      url: 'https://mcp.notion.com/sse',
      headers: {},
      scope: 'user',
      createdAt: 0,
      updatedAt: 0,
    };
    expect(toCodexToml(sseServer)).toBe(
      '[mcp_servers.notion]\n' +
        'command = "npx"\n' +
        'args = ["-y", "mcp-remote", "https://mcp.notion.com/sse"]\n',
    );
  });

  it('passes SSE headers as additional --header args in TOML bridge', () => {
    const sseServer: McpServer = {
      id: 'srv-4',
      name: 'notion',
      description: '',
      transport: 'sse',
      url: 'https://mcp.notion.com/sse',
      headers: { Authorization: 'Bearer xyz' },
      scope: 'user',
      createdAt: 0,
      updatedAt: 0,
    };
    expect(toCodexToml(sseServer)).toBe(
      '[mcp_servers.notion]\n' +
        'command = "npx"\n' +
        'args = ["-y", "mcp-remote", "https://mcp.notion.com/sse", "--header", "Authorization: Bearer xyz"]\n',
    );
  });
});

describe('toGeminiCli', () => {
  it('matches the chrome-devtools-mcp README pattern (project scope, stdio default, -- separator before args)', () => {
    // chrome-devtools-mcp README: gemini mcp add chrome-devtools npx chrome-devtools-mcp@latest
    // 既定 scope を project / 既定 transport を stdio として `--transport` は省略する。
    // ただし server 側 args (`-y` 等) は `--` で区切らないと yargs の既知フラグ
    // (`-e` `-H` `--scope` 等) と衝突する場合があるので、args が 1 つでもあれば常に `--` を挟む。
    expect(toGeminiCli({ ...stdioBase, scope: 'project' })).toBe(
      'gemini mcp add --scope project chrome-devtools npx -- -y chrome-devtools-mcp@latest',
    );
  });

  it('uses --scope user for user scope', () => {
    expect(toGeminiCli(stdioBase)).toBe(
      'gemini mcp add --scope user chrome-devtools npx -- -y chrome-devtools-mcp@latest',
    );
  });

  it('maps local scope to project (gemini only supports user/project) and inserts -- before args', () => {
    expect(toGeminiCli(stdioWithEnv)).toBe(
      'gemini mcp add --scope project -e AIRTABLE_API_KEY=YOUR_KEY airtable npx -- -y airtable-mcp-server',
    );
  });

  it('omits -- when there are no server-side args', () => {
    const noArgs: McpServer = { ...stdioBase, args: [] };
    expect(toGeminiCli(noArgs)).toBe('gemini mcp add --scope user chrome-devtools npx');
  });

  it('keeps server args that look like flags intact via -- (e.g. docker -e ENV=val)', () => {
    // 例: docker run で動かすサーバを想定。`-e` は gemini-cli の env フラグと衝突するので
    // `--` を挟まないと server args が `mcp add` 側の `-e` として誤って消費される。
    const docker: McpServer = {
      ...stdioBase,
      name: 'pg',
      command: 'docker',
      args: ['run', '-i', '--rm', '-e', 'POSTGRES_URL', 'mcp/postgres'],
    };
    expect(toGeminiCli(docker)).toBe(
      'gemini mcp add --scope user pg docker -- run -i --rm -e POSTGRES_URL mcp/postgres',
    );
  });

  it('emits --transport http with -H header flags for http servers', () => {
    expect(toGeminiCli(httpServer)).toBe(
      "gemini mcp add --scope user --transport http -H 'Authorization: Bearer xyz' notion https://mcp.notion.com/mcp",
    );
  });

  it('emits --transport sse for sse servers', () => {
    const sseServer: McpServer = {
      id: 'srv-3',
      name: 'notion',
      description: '',
      transport: 'sse',
      url: 'https://mcp.notion.com/sse',
      headers: {},
      scope: 'user',
      createdAt: 0,
      updatedAt: 0,
    };
    expect(toGeminiCli(sseServer)).toBe(
      'gemini mcp add --scope user --transport sse notion https://mcp.notion.com/sse',
    );
  });
});

describe('toQwenCli', () => {
  it('mirrors gemini CLI with the qwen binary name (qwen-code is a fork)', () => {
    expect(toQwenCli({ ...stdioBase, scope: 'project' })).toBe(
      'qwen mcp add --scope project chrome-devtools npx -- -y chrome-devtools-mcp@latest',
    );
  });

  it('handles env and remote transports identically to gemini', () => {
    expect(toQwenCli(stdioWithEnv)).toBe(
      'qwen mcp add --scope project -e AIRTABLE_API_KEY=YOUR_KEY airtable npx -- -y airtable-mcp-server',
    );
    expect(toQwenCli(httpServer)).toBe(
      "qwen mcp add --scope user --transport http -H 'Authorization: Bearer xyz' notion https://mcp.notion.com/mcp",
    );
  });
});

describe('toClaudeDesktop', () => {
  it('emits standard mcpServers JSON for stdio (no type field)', () => {
    const parsed: unknown = JSON.parse(toClaudeDesktop(stdioBase));
    expect(parsed).toEqual({
      mcpServers: {
        'chrome-devtools': {
          command: 'npx',
          args: ['-y', 'chrome-devtools-mcp@latest'],
        },
      },
    });
  });

  it('includes env when provided', () => {
    const parsed: unknown = JSON.parse(toClaudeDesktop(stdioWithEnv));
    expect(parsed).toEqual({
      mcpServers: {
        airtable: {
          command: 'npx',
          args: ['-y', 'airtable-mcp-server'],
          env: { AIRTABLE_API_KEY: 'YOUR_KEY' },
        },
      },
    });
  });

  it('bridges http (Streamable HTTP) servers with --transport streamablehttp', () => {
    // mcp-proxy のクライアント側 transport 既定は SSE のため、ソースが
    // `transport: "http"` の場合は `--transport streamablehttp` を明示する必要がある。
    const parsed: unknown = JSON.parse(toClaudeDesktop(httpServer));
    expect(parsed).toEqual({
      mcpServers: {
        notion: {
          command: 'uvx',
          args: [
            'mcp-proxy',
            '--transport',
            'streamablehttp',
            '--headers',
            'Authorization',
            'Bearer xyz',
            'https://mcp.notion.com/mcp',
          ],
        },
      },
    });
  });

  it('bridges sse servers via uvx mcp-proxy with no headers (default transport=sse)', () => {
    const sseServer: McpServer = {
      id: 'srv-3',
      name: 'notion',
      description: '',
      transport: 'sse',
      url: 'https://mcp.notion.com/sse',
      headers: {},
      scope: 'user',
      createdAt: 0,
      updatedAt: 0,
    };
    const parsed: unknown = JSON.parse(toClaudeDesktop(sseServer));
    expect(parsed).toEqual({
      mcpServers: {
        notion: {
          command: 'uvx',
          args: ['mcp-proxy', 'https://mcp.notion.com/sse'],
        },
      },
    });
  });

  it('repeats --headers KEY VALUE for each header (mcp-proxy syntax is repeatable)', () => {
    const multiHeaderServer: McpServer = {
      ...httpServer,
      headers: { Authorization: 'Bearer xyz', 'X-Custom': 'foo' },
    };
    const parsed = JSON.parse(toClaudeDesktop(multiHeaderServer)) as {
      mcpServers: { notion: { args: string[] } };
    };
    expect(parsed.mcpServers.notion.args).toEqual([
      'mcp-proxy',
      '--transport',
      'streamablehttp',
      '--headers',
      'Authorization',
      'Bearer xyz',
      '--headers',
      'X-Custom',
      'foo',
      'https://mcp.notion.com/mcp',
    ]);
  });
});

describe('mcpProxyBridge', () => {
  it('emits sse client transport (default) with no headers', () => {
    expect(mcpProxyBridge('sse', 'https://example.com/sse', {})).toEqual({
      command: 'uvx',
      args: ['mcp-proxy', 'https://example.com/sse'],
    });
  });

  it('adds --transport streamablehttp for http source and repeats --headers', () => {
    expect(
      mcpProxyBridge('http', 'https://example.com/mcp', {
        Authorization: 'Bearer t',
        'X-Foo': 'bar',
      }),
    ).toEqual({
      command: 'uvx',
      args: [
        'mcp-proxy',
        '--transport',
        'streamablehttp',
        '--headers',
        'Authorization',
        'Bearer t',
        '--headers',
        'X-Foo',
        'bar',
        'https://example.com/mcp',
      ],
    });
  });
});

describe('formatServer dispatch', () => {
  it('returns correct format for each id', () => {
    expect(formatServer('claude-cli', stdioBase)).toContain('claude mcp add');
    expect(formatServer('codex-cli', stdioBase)).toContain('codex mcp add');
    expect(formatServer('gemini-cli', stdioBase)).toContain('gemini mcp add');
    expect(formatServer('qwen-cli', stdioBase)).toContain('qwen mcp add');
    expect(formatServer('claude-desktop', stdioBase)).toContain('"mcpServers"');
    expect(formatServer('mcp-json', stdioBase)).toContain('"mcpServers"');
    expect(formatServer('vscode-json', stdioBase)).toContain('"servers"');
    expect(formatServer('codex-toml', stdioBase)).toContain('[mcp_servers.');
  });
});
