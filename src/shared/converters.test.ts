import { describe, expect, it } from 'vitest';
import type { McpServer } from './schema.js';
import {
  codexConfigPath,
  codexEnvKeyIssues,
  codexPlaintextAuthHeaders,
  codexUnexpandedHeaders,
  formatServer,
  grokNameIssues,
  grokTreatsAsSse,
  isClaudeReservedName,
  mcpProxyBridge,
  partitionCodexStdioEnv,
  quoteShell,
  toAntigravityJson,
  toClaudeCli,
  toClaudeDesktop,
  toClineJson,
  toCodexCli,
  toCodexConfigTarget,
  toCodexToml,
  toGeminiCli,
  toGrokCli,
  toGrokScope,
  toGrokToml,
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

const claudeSse: McpServer = {
  ...httpServer,
  transport: 'sse',
  url: 'https://api.example.com/sse',
  headers: { 'X-A': '1', 'X-B': "it's" },
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

  it('puts --env before --transport so the name is not swallowed by the variadic flag', () => {
    expect(toClaudeCli(stdioWithEnv)).toBe(
      'claude mcp add --env AIRTABLE_API_KEY=YOUR_KEY --transport stdio --scope local airtable -- npx -y airtable-mcp-server',
    );
  });

  it('keeps every --env flag ahead of the name and quotes values when needed', () => {
    const multiEnv: McpServer = {
      ...stdioWithEnv,
      command: 'python',
      args: ['server.py', '--port', '8080'],
      env: { A: '1', B: 'hello world', C: "it's valid" },
    };
    expect(toClaudeCli(multiEnv)).toBe(
      "claude mcp add --env A=1 --env 'B=hello world' --env 'C=it'\\''s valid' --transport stdio --scope local airtable -- python server.py --port 8080",
    );
  });

  it('produces http command with --header ahead of --transport', () => {
    expect(toClaudeCli(httpServer)).toBe(
      "claude mcp add --header 'Authorization: Bearer xyz' --transport http --scope user notion https://mcp.notion.com/mcp",
    );
  });

  it('keeps every --header flag ahead of the name for sse servers', () => {
    const [command] = toClaudeCli(claudeSse).split('\n');
    expect(command).toBe(
      "claude mcp add --header 'X-A: 1' --header 'X-B: it'\\''s' --transport sse --scope user notion https://api.example.com/sse",
    );
  });

  it('flags the deprecated sse transport and the http fallback', () => {
    const lines = toClaudeCli(claudeSse).split('\n').slice(1);
    expect(lines.every((line) => line.startsWith('#'))).toBe(true);
    expect(lines.join(' ')).toContain('the SSE transport is deprecated in Claude Code');
    expect(lines.join(' ')).toContain('`--transport http`');
  });

  it('localises the sse deprecation note', () => {
    expect(toClaudeCli(claudeSse, 'ja')).toContain('SSE トランスポートは非推奨');
  });

  it('adds no note for stdio or http servers', () => {
    expect(toClaudeCli(stdioBase)).not.toContain('#');
    expect(toClaudeCli(httpServer)).not.toContain('#');
  });

  it('warns that claude mcp add rejects a reserved server name', () => {
    const reserved: McpServer = { ...stdioBase, name: 'workspace' };
    const lines = toClaudeCli(reserved).split('\n');
    expect(lines[0]).toContain('claude mcp add --transport stdio --scope user workspace --');
    expect(lines.slice(1).join(' ')).toContain('"workspace" is a name Claude Code reserves');
  });

  it('matches reserved names without regard to case', () => {
    for (const name of ['workspace', 'Workspace', 'claude-in-chrome', 'Computer-Use']) {
      expect(isClaudeReservedName(name)).toBe(true);
    }
    expect(isClaudeReservedName('my-workspace')).toBe(false);
  });

  it('names the fields Claude Code flags for hidden whitespace, without echoing values', () => {
    const padded: McpServer = {
      ...stdioBase,
      command: ' npx',
      args: ['-y', 'chrome-devtools-mcp@latest ', 'ok'],
      env: { CLEAN: 'value', TOKEN: 'secret\n' },
    };
    const note = toClaudeCli(padded).split('\n').slice(1).join(' ');
    expect(note).toContain('leading or trailing whitespace in: command, args[1], env.TOKEN');
    expect(note).not.toContain('secret');
  });

  it('keeps a key with an embedded newline inside the shell comment', () => {
    const injected: McpServer = {
      ...httpServer,
      headers: { ' X-A\nrm -rf /': 'value' },
    };
    const lines = toClaudeCli(injected).split('\n');
    const notes = lines.slice(lines.findIndex((line) => line.startsWith('#')));
    expect(notes.every((line) => line.startsWith('#'))).toBe(true);
    expect(notes.join(' ')).toContain('headers.X-A rm -rf /');
  });

  it('flags whitespace in remote url and header keys', () => {
    const padded: McpServer = {
      ...httpServer,
      url: 'https://mcp.notion.com/mcp ',
      headers: { ' Authorization': 'Bearer xyz' },
    };
    const note = toClaudeCli(padded).split('\n').slice(1).join(' ');
    expect(note).toContain('leading or trailing whitespace in: url, headers.Authorization');
  });
});

const codexSseBase: McpServer = {
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

function firstLine(text: string): string {
  return text.split('\n')[0] ?? '';
}

function noteBody(text: string): string {
  return text.split('\n').slice(1).join(' ');
}

describe('toCodexCli', () => {
  it('produces stdio codex mcp add command', () => {
    expect(toCodexCli(stdioBase)).toBe(
      'codex mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest',
    );
  });

  it('emits --env KEY=VALUE flags for stdio env (Codex uses the long --env flag only)', () => {
    expect(toCodexCli({ ...stdioWithEnv, scope: 'user' })).toBe(
      'codex mcp add --env AIRTABLE_API_KEY=YOUR_KEY airtable -- npx -y airtable-mcp-server',
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
    expect(firstLine(out)).toBe('codex mcp add notion --url https://mcp.notion.com/mcp');
    expect(noteBody(out)).toContain('http_headers');
    expect(noteBody(out)).toContain('$CODEX_HOME/config.toml');
  });

  it('warns that a literal Authorization token lands in config.toml in plain text', () => {
    const note = noteBody(toCodexCli(httpServer));
    expect(note).toContain('plain text');
    expect(note).toContain('bearer_token_env_var');
    expect(note).toContain('codex mcp login');
  });

  it('keeps `Bearer ${ENV}` headers free of the plaintext-token warning', () => {
    const tokenServer: McpServer = {
      ...httpServer,
      headers: { Authorization: 'Bearer ${NOTION_TOKEN}' },
    };
    expect(toCodexCli(tokenServer)).not.toContain('plain text');
  });

  it('does not tell a non-Bearer scheme to become a Bearer token', () => {
    const basicServer: McpServer = {
      ...httpServer,
      headers: { Authorization: 'Basic dXNlcjpwdw==' },
    };
    const note = noteBody(toCodexCli(basicServer));
    expect(note).toContain('plain text');
    expect(note).toContain('non-Bearer scheme');
    expect(note).toContain('env_http_headers');
    expect(note).not.toContain('bearer_token_env_var');
  });

  it('names the $CODEX_HOME config, not a hard-coded ~/.codex path, in header instructions', () => {
    const customHeader: McpServer = { ...httpServer, headers: { 'X-Custom': 'foo' } };
    const note = noteBody(toCodexCli(customHeader));
    expect(note).toContain('$CODEX_HOME/config.toml');
    expect(note).not.toContain('~/.codex/config.toml');
  });

  it('bridges SSE servers via npx mcp-remote (Codex has no native SSE support)', () => {
    expect(firstLine(toCodexCli(codexSseBase))).toBe(
      'codex mcp add notion -- npx -y mcp-remote https://mcp.notion.com/sse',
    );
    expect(noteBody(toCodexCli(codexSseBase))).toContain('stdio and streamable_http');
  });

  it('passes SSE headers through to mcp-remote --header flags', () => {
    const sseServer: McpServer = {
      ...codexSseBase,
      id: 'srv-4',
      headers: { Authorization: 'Bearer xyz' },
    };
    expect(firstLine(toCodexCli(sseServer))).toBe(
      "codex mcp add notion -- npx -y mcp-remote https://mcp.notion.com/sse --header 'Authorization: Bearer xyz'",
    );
    expect(noteBody(toCodexCli(sseServer))).toContain('mcp-remote arguments stored in plain text');
  });

  it('comments out the global add for a non-user scope so pasting cannot register globally', () => {
    const out = toCodexCli({ ...stdioBase, scope: 'project' });
    expect(out.split('\n').every((line) => line.startsWith('#'))).toBe(true);
    expect(out).toContain('# codex mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest');
    expect(out).toContain('scope="project" cannot be expressed');
    expect(out).toContain('commented out');
    expect(out).toContain('$CODEX_HOME/config.toml');
    expect(out).toContain('trust_level = "trusted"');
  });

  it('keeps the command executable for user scope', () => {
    expect(firstLine(toCodexCli({ ...stdioBase, scope: 'user' }))).not.toContain('#');
  });

  it('comments every physical line so a multiline value cannot escape the disabled block', () => {
    const injected: McpServer = {
      ...stdioBase,
      scope: 'project',
      env: { K: 'foo\necho PWNED' },
    };
    const lines = toCodexCli(injected).split('\n');
    expect(lines.every((line) => line.startsWith('#'))).toBe(true);
    expect(lines).toContain("# echo PWNED' chrome-devtools -- npx -y chrome-devtools-mcp@latest");
  });

  it('adds the shared-checkout caveat for local scope only', () => {
    expect(noteBody(toCodexCli({ ...stdioBase, scope: 'local' }))).toContain(
      'Codex has no local (private to you) layer',
    );
    expect(toCodexCli({ ...stdioBase, scope: 'project' })).not.toContain(
      'no local (private to you)',
    );
  });

  it('stays note-free for a user-scope registration', () => {
    expect(toCodexCli({ ...stdioBase, scope: 'user' })).not.toContain('#');
  });

  it('warns when an env key would be silently trimmed by --env', () => {
    const padded: McpServer = { ...stdioBase, env: { ' TOKEN ': 'v' } };
    const note = noteBody(toCodexCli(padded));
    expect(note).toContain('leading or trailing whitespace');
    expect(note).toContain('" TOKEN "');
  });

  it('tells the user to rename an env key that is empty or contains =', () => {
    const malformed: McpServer = { ...stdioBase, env: { 'A=B': 'c', '  ': 'd' } };
    const note = noteBody(toCodexCli(malformed));
    expect(note).toContain('cannot be used as environment variable names');
    expect(note).toContain('Rename the key');
    expect(note).toContain('"A=B"');
    expect(note).toContain('"  "');
  });

  it('repeats the malformed-key warning in the TOML tab, which cannot fix it either', () => {
    const malformed: McpServer = { ...stdioBase, env: { 'A=B': 'c' } };
    expect(toCodexToml(malformed)).toContain('Rename the key');
  });

  it('keeps an env key with an embedded newline inside a single comment line', () => {
    const injected: McpServer = { ...stdioBase, env: { ' A\nrm -rf /': 'v' } };
    const lines = toCodexCli(injected).split('\n');
    const notes = lines.slice(lines.findIndex((line) => line.startsWith('#')));
    expect(notes.every((line) => line.startsWith('#'))).toBe(true);
    expect(notes.join(' ')).toContain('" A\\nrm -rf /"');
  });

  it('warns that ${VAR} env values are passed through verbatim', () => {
    const envRef: McpServer = { ...stdioBase, env: { NOTION_TOKEN: '${NOTION_TOKEN}' } };
    const out = toCodexCli(envRef);
    expect(firstLine(out)).toContain("--env 'NOTION_TOKEN=${NOTION_TOKEN}'");
    expect(noteBody(out)).toContain('verbatim');
    expect(noteBody(out)).toContain('env_vars');
  });

  it('says env_vars belongs in the parent table, not the generated env sub-table', () => {
    const envRef: McpServer = { ...stdioBase, env: { NOTION_TOKEN: '${NOTION_TOKEN}' } };
    const note = noteBody(toCodexCli(envRef));
    expect(note).toContain('[mcp_servers.<name>.env] sub-table');
    expect(note).toContain('parent [mcp_servers.<name>] table');
    expect(note).toContain('invalid type: sequence, expected a string');
  });

  it('warns about a ${VAR} env value whose key differs, which env_vars cannot express', () => {
    const envRef: McpServer = { ...stdioBase, env: { API_KEY: '${MY_TOKEN}' } };
    const out = toCodexCli(envRef);
    expect(firstLine(out)).toContain("--env 'API_KEY=${MY_TOKEN}'");
    expect(noteBody(out)).toContain('"API_KEY"');
    expect(noteBody(out)).toContain('without expanding them');
  });

  it('warns about a ${VAR:-default} env value, which Codex never expands', () => {
    const envRef: McpServer = { ...stdioBase, env: { TOKEN: '${TOKEN:-fallback}' } };
    const out = toCodexCli(envRef);
    expect(firstLine(out)).toContain("--env 'TOKEN=${TOKEN:-fallback}'");
    expect(noteBody(out)).toContain('"TOKEN"');
    expect(noteBody(out)).toContain('carries a default');
  });

  it('never tells the user to rename a key the server expects', () => {
    const envRef: McpServer = { ...stdioBase, env: { API_KEY: '${MY_TOKEN}' } };
    const note = noteBody(toCodexCli(envRef));
    expect(note).toContain('Do not rename the key');
    expect(note).toContain("export the value under the key's own name");
    expect(note).not.toContain('rename the key to match');
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

function tomlBody(text: string): string {
  return text
    .split('\n')
    .filter((line) => !line.startsWith('#'))
    .join('\n');
}

describe('toCodexToml', () => {
  it('uses [mcp_servers.<name>] table with snake_case key', () => {
    const text = toCodexToml(stdioBase);
    expect(text).toContain('[mcp_servers.chrome-devtools]');
    expect(text).toContain('command = "npx"');
    expect(text).toContain('args = ["-y", "chrome-devtools-mcp@latest"]');
  });

  it('names $CODEX_HOME as the paste target for user scope, with ~/.codex as its default', () => {
    expect(firstLine(toCodexToml(stdioBase))).toBe(
      '# Paste into: $CODEX_HOME/config.toml (default: ~/.codex/config.toml)',
    );
  });

  it('names the project-root file and the trust requirement for project scope', () => {
    const text = toCodexToml({ ...stdioBase, scope: 'project' });
    expect(firstLine(text)).toBe(
      '# Paste into: .codex/config.toml at the project root (scope: project)',
    );
    expect(text).toContain('trust_level = "trusted"');
    expect(text).toContain("[projects.'<absolute project path>']");
    expect(text).not.toContain('[projects."<absolute project path>"]');
    expect(text).toContain('TOML literal string');
  });

  it('covers the apostrophe path, which cannot be a TOML literal string', () => {
    const text = toCodexToml({ ...stdioBase, scope: 'project' });
    expect(text).toContain("contains `'` can it not be a literal string");
    expect(text).toContain('double every `\\`');
  });

  it('adds the shared-checkout caveat for local scope', () => {
    const text = toCodexToml({ ...stdioBase, scope: 'local' });
    expect(firstLine(text)).toBe(
      '# Paste into: .codex/config.toml at the project root (scope: local)',
    );
    expect(text).toContain('Codex has no local (private to you) layer');
  });

  it('emits inline table for env', () => {
    const text = toCodexToml(stdioWithEnv);
    expect(text).toContain('env = { AIRTABLE_API_KEY = "YOUR_KEY" }');
    expect(text).not.toContain('env_vars');
  });

  it('moves ${VAR} env values naming their own key into env_vars', () => {
    const envRef: McpServer = {
      ...stdioBase,
      env: { NOTION_TOKEN: '${NOTION_TOKEN}', PLAIN: 'value' },
    };
    const text = toCodexToml(envRef);
    expect(text).toContain('env = { PLAIN = "value" }');
    expect(text).toContain('env_vars = ["NOTION_TOKEN"]');
    expect(text).not.toContain('"${NOTION_TOKEN}"');
    expect(text).toContain('moved to `env_vars`');
  });

  it('keeps a ${VAR} env value whose key differs and explains it is not expanded', () => {
    const envRef: McpServer = { ...stdioBase, env: { API_KEY: '${MY_TOKEN}' } };
    const text = toCodexToml(envRef);
    expect(text).toContain('env = { API_KEY = "${MY_TOKEN}" }');
    expect(text).not.toContain('env_vars =');
    expect(text).toContain('without expanding them');
  });

  it('emits literal Authorization headers in http_headers', () => {
    const text = toCodexToml(httpServer);
    expect(text).toContain('[mcp_servers.notion]');
    expect(text).toContain('url = "https://mcp.notion.com/mcp"');
    expect(text).toContain('http_headers = { Authorization = "Bearer xyz" }');
    expect(tomlBody(text)).not.toContain('bearer_token_env_var');
    expect(text).toContain('stored in plain text');
  });

  it('maps Authorization: Bearer ${ENV_VAR} to bearer_token_env_var (Codex env-backed auth)', () => {
    const tokenServer: McpServer = {
      ...httpServer,
      headers: { Authorization: 'Bearer ${NOTION_TOKEN}' },
    };
    const text = toCodexToml(tokenServer);
    expect(text).toContain('bearer_token_env_var = "NOTION_TOKEN"');
    expect(text).not.toContain('http_headers');
    expect(text).not.toContain('${NOTION_TOKEN}');
    expect(text).not.toContain('plain text');
  });

  it('warns that a ${VAR:-default} header is sent verbatim, in both tabs', () => {
    const defaulted: McpServer = {
      ...httpServer,
      headers: { 'X-Token': '${TOKEN:-fallback}' },
    };
    const toml = toCodexToml(defaulted);
    expect(toml).toContain('http_headers = { X-Token = "${TOKEN:-fallback}" }');
    expect(toml).toContain('cannot be mapped to `env_http_headers`');
    expect(toml).toContain('"X-Token"');
    expect(noteBody(toCodexCli(defaulted))).toContain('cannot be mapped to `env_http_headers`');
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
    expect(tomlBody(toCodexToml(codexSseBase))).toBe(
      '[mcp_servers.notion]\n' +
        'command = "npx"\n' +
        'args = ["-y", "mcp-remote", "https://mcp.notion.com/sse"]\n',
    );
    expect(toCodexToml(codexSseBase)).toContain('there is no SSE transport');
  });

  it('passes SSE headers as additional --header args in TOML bridge', () => {
    const sseServer: McpServer = {
      ...codexSseBase,
      id: 'srv-4',
      headers: { Authorization: 'Bearer xyz' },
    };
    const text = toCodexToml(sseServer);
    expect(tomlBody(text)).toBe(
      '[mcp_servers.notion]\n' +
        'command = "npx"\n' +
        'args = ["-y", "mcp-remote", "https://mcp.notion.com/sse", "--header", "Authorization: Bearer xyz"]\n',
    );
    expect(text).toContain('mcp-remote arguments stored in plain text');
  });

  it('localizes notes through the locale argument', () => {
    expect(toCodexToml(stdioBase, 'ja')).toContain('貼り付け先');
    expect(formatServer('codex-toml', { ...stdioBase, scope: 'project' }, 'ja')).toContain(
      'trust_level = "trusted"',
    );
  });
});

describe('codex helpers', () => {
  it('rounds local to the project config target', () => {
    expect(toCodexConfigTarget('user')).toBe('user');
    expect(toCodexConfigTarget('project')).toBe('project');
    expect(toCodexConfigTarget('local')).toBe('project');
    expect(codexConfigPath('user')).toBe('$CODEX_HOME/config.toml');
    expect(codexConfigPath('local')).toBe('.codex/config.toml');
  });

  it('classifies env keys the way codex mcp add parses them', () => {
    expect(codexEnvKeyIssues({ OK: 'v', ' PAD ': 'v', 'A=B': 'v', '': 'v' })).toEqual({
      trimmed: [' PAD '],
      malformed: ['A=B', ''],
    });
  });

  it('splits stdio env into literal env, env_vars, and unexpandable refs', () => {
    expect(
      partitionCodexStdioEnv({ SAME: '${SAME}', OTHER: '${RENAMED}', PLAIN: 'literal' }),
    ).toEqual({
      env: { OTHER: '${RENAMED}', PLAIN: 'literal' },
      envVars: ['SAME'],
      unexpanded: ['OTHER'],
    });
  });

  it('treats ${VAR:-default} and embedded refs as unexpandable, not as plain literals', () => {
    expect(
      partitionCodexStdioEnv({
        A: '${TOKEN:-fallback}',
        B: 'prefix-${TOKEN}',
        C: '${TOKEN}-suffix',
        D: 'no refs here',
      }),
    ).toEqual({
      env: {
        A: '${TOKEN:-fallback}',
        B: 'prefix-${TOKEN}',
        C: '${TOKEN}-suffix',
        D: 'no refs here',
      },
      envVars: [],
      unexpanded: ['A', 'B', 'C'],
    });
  });

  it('reports headers whose ${...} reference cannot become env_http_headers', () => {
    expect(
      codexUnexpandedHeaders({
        Exact: '${TOKEN}',
        Defaulted: '${TOKEN:-fallback}',
        Embedded: 'Bearer ${TOKEN}',
        Plain: 'literal',
      }),
    ).toEqual(['Defaulted', 'Embedded']);
  });

  it('does not report an Authorization header already mapped to bearer_token_env_var', () => {
    expect(codexUnexpandedHeaders({ Authorization: 'Bearer ${TOKEN}' })).toEqual([]);
  });

  it('splits literal Authorization values by scheme so the advice matches', () => {
    expect(codexPlaintextAuthHeaders({ Authorization: 'Bearer xyz' })).toEqual({
      bearer: ['Authorization'],
      other: [],
    });
    expect(codexPlaintextAuthHeaders({ Authorization: 'Basic dXNlcjpwdw==' })).toEqual({
      bearer: [],
      other: ['Authorization'],
    });
    expect(codexPlaintextAuthHeaders({ Authorization: 'bare-token' })).toEqual({
      bearer: [],
      other: ['Authorization'],
    });
    expect(codexPlaintextAuthHeaders({ authorization: 'Bearer ${T}' })).toEqual({
      bearer: [],
      other: [],
    });
    expect(codexPlaintextAuthHeaders({ Authorization: '${T}' })).toEqual({
      bearer: [],
      other: [],
    });
    expect(codexPlaintextAuthHeaders({ 'X-Token': 'xyz' })).toEqual({ bearer: [], other: [] });
  });
});

describe('toGeminiCli', () => {
  it('matches the chrome-devtools-mcp README pattern (project scope, stdio default, -- separator before args)', () => {
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

describe('toGrokCli', () => {
  it('passes the stdio command after -- so server flags are not parsed by grok', () => {
    expect(toGrokCli(stdioBase)).toBe(
      'grok mcp add --transport stdio --scope user chrome-devtools -- npx -y chrome-devtools-mcp@latest',
    );
  });

  it('emits one -e flag per environment variable', () => {
    expect(toGrokCli({ ...stdioWithEnv, scope: 'project' })).toBe(
      'grok mcp add --transport stdio --scope project -e AIRTABLE_API_KEY=YOUR_KEY airtable -- npx -y airtable-mcp-server',
    );
  });

  it('puts the URL before repeatable --header flags for remote transports', () => {
    expect(toGrokCli(httpServer)).toBe(
      "grok mcp add --transport http --scope user notion https://mcp.notion.com/mcp --header 'Authorization: Bearer xyz'",
    );
    expect(toGrokCli({ ...claudeSse, name: 'example' })).toBe(
      "grok mcp add --transport sse --scope user example https://api.example.com/sse --header 'X-A: 1' --header 'X-B: it'\\''s'",
    );
  });

  it('rounds the local scope to project and says so', () => {
    const text = toGrokCli(stdioWithEnv, 'en');
    expect(text).toContain('--scope project');
    expect(text).toContain('# Note: Grok only has the user and project scopes');
  });

  it('warns that a name not starting with a letter or underscore never enters the catalog', () => {
    const text = toGrokCli({ ...stdioBase, name: '2fa-tools' }, 'en');
    expect(text).toContain('grok mcp add --transport stdio --scope user 2fa-tools --');
    expect(text).toContain('# Note: "2fa-tools" does not start with a letter or `_`');
  });

  it('warns about an ambiguous server__tool delimiter', () => {
    expect(toGrokCli({ ...stdioBase, name: 'tools_' }, 'en')).toContain(
      '# Note: "tools_" ends with `_` or contains `__`',
    );
    expect(toGrokCli({ ...stdioBase, name: 'a__b' }, 'en')).toContain(
      '# Note: "a__b" ends with `_` or contains `__`',
    );
  });

  it('warns that an http URL ending in /sse is connected over SSE anyway', () => {
    const text = toGrokCli({ ...httpServer, url: 'https://mcp.example.com/sse' }, 'en');
    expect(text).toContain('--transport http');
    expect(text).toContain('# Note: the URL ends with `/sse`');
  });

  it('keeps the notes out of the way for a clean registration', () => {
    expect(toGrokCli(httpServer, 'en').split('\n')).toHaveLength(1);
    expect(toGrokCli({ ...claudeSse, name: 'example' }, 'en').split('\n')).toHaveLength(1);
  });

  it('localises the notes', () => {
    expect(toGrokCli({ ...stdioBase, name: 'tools_' }, 'ja')).toContain(
      '# 注: "tools_" は末尾が `_` か `__` を含むため',
    );
  });
});

describe('toGrokToml', () => {
  it('uses the [mcp_servers.<name>] table with an explicit enabled flag', () => {
    expect(toGrokToml(stdioBase)).toBe(
      '[mcp_servers.chrome-devtools]\n' +
        'command = "npx"\n' +
        'args = ["-y", "chrome-devtools-mcp@latest"]\n' +
        'enabled = true\n',
    );
  });

  it('emits an inline table for env', () => {
    expect(toGrokToml(stdioWithEnv)).toContain('env = { AIRTABLE_API_KEY = "YOUR_KEY" }');
  });

  it('keeps remote servers native instead of bridging them through a stdio proxy', () => {
    expect(toGrokToml(httpServer)).toBe(
      '[mcp_servers.notion]\n' +
        'url = "https://mcp.notion.com/mcp"\n' +
        'headers = { Authorization = "Bearer xyz" }\n' +
        'enabled = true\n',
    );
    expect(toGrokToml(httpServer)).not.toContain('mcp-remote');
  });

  it('marks SSE servers with type = "sse"', () => {
    expect(toGrokToml({ ...claudeSse, name: 'example', headers: {} })).toBe(
      '[mcp_servers.example]\n' +
        'url = "https://api.example.com/sse"\n' +
        'type = "sse"\n' +
        'enabled = true\n',
    );
  });

  it('keeps ${VAR} header references verbatim (grok expands them at load time)', () => {
    const text = toGrokToml({ ...httpServer, headers: { Authorization: 'Bearer ${TOKEN}' } });
    expect(text).toContain('headers = { Authorization = "Bearer ${TOKEN}" }');
    expect(text).not.toContain('bearer_token_env_var');
  });

  it('repeats the catalog and /sse notes as TOML comments', () => {
    expect(toGrokToml({ ...stdioBase, name: 'tools_' }, 'en')).toContain(
      '# Note: "tools_" ends with `_` or contains `__`',
    );
    expect(toGrokToml({ ...httpServer, url: 'https://mcp.example.com/sse' }, 'en')).toContain(
      '# Note: the URL ends with `/sse`',
    );
  });

  it('leaves the scope note to the CLI tab (a snippet is pasted into a chosen file)', () => {
    expect(toGrokToml(stdioWithEnv, 'en')).not.toContain('user and project scopes');
  });
});

describe('grok catalog helpers', () => {
  it('reports every reason a name is rejected by grok tool-name admission', () => {
    expect(grokNameIssues('chrome-devtools')).toEqual([]);
    expect(grokNameIssues('_private')).toEqual([]);
    expect(grokNameIssues('2fa')).toEqual(['start']);
    expect(grokNameIssues('-lead')).toEqual(['start']);
    expect(grokNameIssues('tools_')).toEqual(['ambiguous']);
    expect(grokNameIssues('a__b')).toEqual(['ambiguous']);
    expect(grokNameIssues('2fa_tools_')).toEqual(['start', 'ambiguous']);
  });

  it('mirrors the is_sse rule: type = "sse" or a URL ending in /sse', () => {
    expect(grokTreatsAsSse(stdioBase)).toBe(false);
    expect(grokTreatsAsSse(httpServer)).toBe(false);
    expect(grokTreatsAsSse(claudeSse)).toBe(true);
    expect(grokTreatsAsSse({ ...httpServer, url: 'https://mcp.example.com/sse' })).toBe(true);
    expect(grokTreatsAsSse({ ...httpServer, url: 'https://mcp.example.com/sse?v=1' })).toBe(false);
  });

  it('maps the mcp-kanri scopes onto the two grok scopes', () => {
    expect(toGrokScope('user')).toBe('user');
    expect(toGrokScope('project')).toBe('project');
    expect(toGrokScope('local')).toBe('project');
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

describe('toAntigravityJson', () => {
  it('emits stdio entry with command/args/env (no type field)', () => {
    const parsed: unknown = JSON.parse(toAntigravityJson(stdioWithEnv));
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

  it('omits args/env when empty for stdio', () => {
    const minimal: McpServer = { ...stdioBase, args: [], env: {} };
    const parsed: unknown = JSON.parse(toAntigravityJson(minimal));
    expect(parsed).toEqual({
      mcpServers: {
        'chrome-devtools': { command: 'npx' },
      },
    });
  });

  it('uses serverUrl (camelCase) — not url — for http (Streamable HTTP) servers', () => {
    const parsed: unknown = JSON.parse(toAntigravityJson(httpServer));
    expect(parsed).toEqual({
      mcpServers: {
        notion: {
          serverUrl: 'https://mcp.notion.com/mcp',
          headers: { Authorization: 'Bearer xyz' },
        },
      },
    });
  });

  it('omits headers when empty for http servers', () => {
    const noHeaders: McpServer = { ...httpServer, headers: {} };
    const parsed: unknown = JSON.parse(toAntigravityJson(noHeaders));
    expect(parsed).toEqual({
      mcpServers: {
        notion: { serverUrl: 'https://mcp.notion.com/mcp' },
      },
    });
  });

  it('does NOT emit a type field for http (transport is inferred from serverUrl presence)', () => {
    const text = toAntigravityJson(httpServer);
    expect(text).not.toContain('"type"');
  });

  it('bridges SSE servers via npx -y mcp-remote (Antigravity does not support SSE natively)', () => {
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
    const parsed: unknown = JSON.parse(toAntigravityJson(sseServer));
    expect(parsed).toEqual({
      mcpServers: {
        notion: {
          command: 'npx',
          args: ['-y', 'mcp-remote', 'https://mcp.notion.com/sse'],
        },
      },
    });
  });

  it('passes SSE headers through to mcp-remote --header args in the bridge', () => {
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
    const parsed: unknown = JSON.parse(toAntigravityJson(sseServer));
    expect(parsed).toEqual({
      mcpServers: {
        notion: {
          command: 'npx',
          args: [
            '-y',
            'mcp-remote',
            'https://mcp.notion.com/sse',
            '--header',
            'Authorization: Bearer xyz',
          ],
        },
      },
    });
  });

  it('emits literal Authorization: Bearer ${ENV_VAR} headers as-is (Antigravity does not interpolate)', () => {
    const tokenServer: McpServer = {
      ...httpServer,
      headers: { Authorization: 'Bearer ${NOTION_TOKEN}' },
    };
    const parsed = JSON.parse(toAntigravityJson(tokenServer)) as {
      mcpServers: { notion: { headers: Record<string, string> } };
    };
    expect(parsed.mcpServers.notion.headers).toEqual({
      Authorization: 'Bearer ${NOTION_TOKEN}',
    });
  });

  it('produces valid JSON for every server type', () => {
    expect(() => JSON.parse(toAntigravityJson(stdioBase))).not.toThrow();
    expect(() => JSON.parse(toAntigravityJson(stdioWithEnv))).not.toThrow();
    expect(() => JSON.parse(toAntigravityJson(httpServer))).not.toThrow();
  });
});

describe('toClineJson', () => {
  it('emits stdio entry with explicit type:"stdio"', () => {
    const parsed: unknown = JSON.parse(toClineJson(stdioBase));
    expect(parsed).toEqual({
      mcpServers: {
        'chrome-devtools': {
          type: 'stdio',
          command: 'npx',
          args: ['-y', 'chrome-devtools-mcp@latest'],
        },
      },
    });
  });

  it('includes env when provided for stdio', () => {
    const parsed: unknown = JSON.parse(toClineJson(stdioWithEnv));
    expect(parsed).toEqual({
      mcpServers: {
        airtable: {
          type: 'stdio',
          command: 'npx',
          args: ['-y', 'airtable-mcp-server'],
          env: { AIRTABLE_API_KEY: 'YOUR_KEY' },
        },
      },
    });
  });

  it('omits args/env when empty for stdio', () => {
    const minimal: McpServer = { ...stdioBase, args: [], env: {} };
    const parsed: unknown = JSON.parse(toClineJson(minimal));
    expect(parsed).toEqual({
      mcpServers: {
        'chrome-devtools': { type: 'stdio', command: 'npx' },
      },
    });
  });

  it('uses type:"streamableHttp" — NOT "http" — for Streamable HTTP transport', () => {
    const parsed: unknown = JSON.parse(toClineJson(httpServer));
    expect(parsed).toEqual({
      mcpServers: {
        notion: {
          type: 'streamableHttp',
          url: 'https://mcp.notion.com/mcp',
          headers: { Authorization: 'Bearer xyz' },
        },
      },
    });
  });

  it('does NOT use the bare "http" type literal for Streamable HTTP', () => {
    const text = toClineJson(httpServer);
    expect(text).toContain('"streamableHttp"');
    expect(text).not.toMatch(/"type":\s*"http"/);
  });

  it('uses type:"sse" for SSE transport (with url + headers)', () => {
    const sseServer: McpServer = {
      id: 'srv-3',
      name: 'notion',
      description: '',
      transport: 'sse',
      url: 'https://mcp.notion.com/sse',
      headers: { Authorization: 'Bearer xyz' },
      scope: 'user',
      createdAt: 0,
      updatedAt: 0,
    };
    const parsed: unknown = JSON.parse(toClineJson(sseServer));
    expect(parsed).toEqual({
      mcpServers: {
        notion: {
          type: 'sse',
          url: 'https://mcp.notion.com/sse',
          headers: { Authorization: 'Bearer xyz' },
        },
      },
    });
  });

  it('omits headers when empty for remote transports', () => {
    const noHeaders: McpServer = { ...httpServer, headers: {} };
    const parsed: unknown = JSON.parse(toClineJson(noHeaders));
    expect(parsed).toEqual({
      mcpServers: {
        notion: {
          type: 'streamableHttp',
          url: 'https://mcp.notion.com/mcp',
        },
      },
    });
  });

  it('produces JSON validatable by the Cline schema discriminated union (stdio)', () => {
    const parsed = JSON.parse(toClineJson(stdioBase)) as {
      mcpServers: Record<string, { type: string; command?: string; url?: string }>;
    };
    const entry = parsed.mcpServers['chrome-devtools'];
    expect(entry).toBeDefined();
    expect(entry?.type).toBe('stdio');
    expect(entry?.command).toBe('npx');
    expect(entry?.url).toBeUndefined();
  });

  it('produces JSON validatable by the Cline schema discriminated union (streamableHttp)', () => {
    const parsed = JSON.parse(toClineJson(httpServer)) as {
      mcpServers: Record<string, { type: string; command?: string; url?: string }>;
    };
    const entry = parsed.mcpServers.notion;
    expect(entry?.type).toBe('streamableHttp');
    expect(entry?.url).toBe('https://mcp.notion.com/mcp');
    expect(entry?.command).toBeUndefined();
  });
});

describe('formatServer dispatch', () => {
  it('returns correct format for each id', () => {
    expect(formatServer('claude-cli', stdioBase)).toContain('claude mcp add');
    expect(formatServer('codex-cli', stdioBase)).toContain('codex mcp add');
    expect(formatServer('gemini-cli', stdioBase)).toContain('gemini mcp add');
    expect(formatServer('qwen-cli', stdioBase)).toContain('qwen mcp add');
    expect(formatServer('grok-cli', stdioBase)).toContain('grok mcp add');
    expect(formatServer('grok-toml', stdioBase)).toContain('[mcp_servers.');
    expect(formatServer('grok-toml', claudeSse)).toContain('type = "sse"');
    expect(formatServer('claude-desktop', stdioBase)).toContain('"mcpServers"');
    expect(formatServer('mcp-json', stdioBase)).toContain('"mcpServers"');
    expect(formatServer('vscode-json', stdioBase)).toContain('"servers"');
    expect(formatServer('codex-toml', stdioBase)).toContain('[mcp_servers.');
    expect(formatServer('antigravity-json', stdioBase)).toContain('"mcpServers"');
    expect(formatServer('antigravity-json', httpServer)).toContain('"serverUrl"');
    expect(formatServer('cline-json', stdioBase)).toContain('"mcpServers"');
    expect(formatServer('cline-json', httpServer)).toContain('"streamableHttp"');
  });
});
