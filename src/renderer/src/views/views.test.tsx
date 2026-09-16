import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { Root } from '../Root';
import { createTestPorts, makeServer, type TestPorts } from '../testing/harness';

afterEach(() => {
  cleanup();
});

const alpha = makeServer({ name: 'alpha', command: 'npx', args: ['-y', 'alpha-mcp'] });
const beta = makeServer({ name: 'beta', transport: 'http', url: 'https://beta.test/mcp' });

async function mount(
  overrides: Parameters<typeof createTestPorts>[0] = {},
): Promise<{ ports: TestPorts; user: ReturnType<typeof userEvent.setup> }> {
  const ports = createTestPorts({ servers: [alpha, beta], ...overrides });
  const user = userEvent.setup();
  render(<Root ports={ports} />);
  await screen.findByRole('button', { name: /alpha/ });
  return { ports, user };
}

describe('startup', () => {
  it('lists the stored servers and waits for a selection', async () => {
    const { ports } = await mount();
    expect(screen.getByRole('button', { name: /beta/ })).toBeDefined();
    expect(screen.getByText('Select an MCP server')).toBeDefined();
    expect(await screen.findByText('C:\\Users\\test\\mcp-kanri\\servers.json')).toBeDefined();
    expect(ports.titles).toEqual(['MCP Kanri']);
    expect(ports.langs).toEqual(['en']);
  });

  it('shows the store error without wiping the sidebar', async () => {
    const ports = createTestPorts({ servers: [alpha] });
    ports.api.failNextWith('store is broken');
    render(<Root ports={ports} />);
    expect(await screen.findByText('store is broken')).toBeDefined();
  });
});

describe('detail pane', () => {
  it('switches format tabs and copies the shown text through the ports', async () => {
    const { ports, user } = await mount();

    await user.click(screen.getByRole('button', { name: /alpha/ }));
    expect(await screen.findByRole('heading', { name: 'alpha' })).toBeDefined();
    expect(screen.getByText(/claude mcp add --transport stdio/)).toBeDefined();

    await user.click(screen.getByRole('tab', { name: 'Codex config.toml' }));
    expect(await screen.findByText(/\[mcp_servers\.alpha\]/)).toBeDefined();

    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(await screen.findByRole('button', { name: 'Copied!' })).toBeDefined();
    expect(ports.copied[0]).toContain('[mcp_servers.alpha]');

    await user.click(screen.getByRole('tab', { name: 'VS Code mcp.json' }));
    expect(await screen.findByRole('button', { name: 'Copy' })).toBeDefined();
  });

  it('surfaces a clipboard failure as an error toast', async () => {
    const { user } = await mount({ clipboardFails: true });
    await user.click(screen.getByRole('button', { name: /alpha/ }));
    await user.click(await screen.findByRole('button', { name: 'Copy' }));
    expect(await screen.findByText('clipboard denied')).toBeDefined();
  });
});

describe('removal', () => {
  it('confirms first, ignores the screen behind the dialog, then deletes', async () => {
    const { ports, user } = await mount();

    await user.click(screen.getByRole('button', { name: /alpha/ }));
    await user.click(await screen.findByRole('button', { name: 'Delete' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain('Delete "alpha". Are you sure?');

    await user.click(screen.getByRole('button', { name: /beta/ }));
    expect(screen.getByRole('heading', { name: 'alpha' })).toBeDefined();
    expect(screen.getByRole('dialog')).toBeDefined();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(await screen.findByRole('dialog').then((d) => d.querySelector('button')!));

    expect(await screen.findByText('Removed "alpha"')).toBeDefined();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /alpha/ })).toBeNull();
    });
    expect(ports.api.store.map((server) => server.name)).toEqual(['beta']);
  });

  it('lets the scheduled timer clear the toast', async () => {
    const { ports, user } = await mount();
    await user.click(screen.getByRole('button', { name: /alpha/ }));
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await user.click((await screen.findByRole('dialog')).querySelectorAll('button')[0]!);
    await screen.findByText('Removed "alpha"');

    act(() => {
      ports.timerControl.runAll();
    });
    expect(screen.queryByText('Removed "alpha"')).toBeNull();
  });
});

describe('editor form', () => {
  it('creates a server, including rows typed into the generic key-value editor', async () => {
    const { ports, user } = await mount();

    await user.click(screen.getByRole('button', { name: '＋ New server' }));
    const submit = screen.getByRole('button', { name: 'Create' });
    expect(submit.hasAttribute('disabled')).toBe(true);

    await user.type(screen.getByLabelText('Name (server-name)'), 'notion');
    await user.click(screen.getByRole('button', { name: '＋ Add' }));
    await user.type(screen.getByPlaceholderText('KEY'), 'API_KEY');
    await user.type(screen.getByPlaceholderText('VALUE'), 'secret');

    expect(screen.getByRole('button', { name: 'Create' }).hasAttribute('disabled')).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByText('Created "notion"')).toBeDefined();
    const created = ports.api.store.find((server) => server.name === 'notion');
    expect(created).toMatchObject({ transport: 'stdio', command: 'npx', args: ['-y'] });
    expect(created?.transport === 'stdio' ? created.env : null).toEqual({ API_KEY: 'secret' });
  });

  it('swaps the fields when the transport tab changes', async () => {
    const { user } = await mount();

    await user.click(screen.getByRole('button', { name: '＋ New server' }));
    expect(screen.getByLabelText('command')).toBeDefined();

    await user.click(screen.getByRole('tab', { name: 'sse' }));
    expect(await screen.findByLabelText('URL')).toBeDefined();
    expect(screen.queryByLabelText('command')).toBeNull();
    expect(screen.getByText('e.g. https://mcp.asana.com/sse')).toBeDefined();
  });

  it('reports a rejected save and keeps the draft on screen', async () => {
    const { ports, user } = await mount();

    await user.click(screen.getByRole('button', { name: /alpha/ }));
    await user.click(await screen.findByRole('button', { name: 'Edit' }));
    ports.api.failNextWith('A server named "alpha" is already registered');
    await user.click(screen.getByRole('button', { name: 'Update' }));

    expect(await screen.findAllByText('A server named "alpha" is already registered')).toHaveLength(
      2,
    );
    expect(screen.getByLabelText('Name (server-name)')).toBeDefined();
  });

  it('returns to the detail pane on cancel', async () => {
    const { user } = await mount();
    await user.click(screen.getByRole('button', { name: /alpha/ }));
    await user.click(await screen.findByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByRole('heading', { name: 'alpha' })).toBeDefined();
  });
});

describe('language switch', () => {
  it('retranslates the whole tree and remembers the choice', async () => {
    const { ports, user } = await mount();

    await user.click(screen.getByRole('button', { name: '日本語' }));

    expect(await screen.findByText('MCP を選択してください')).toBeDefined();
    expect(screen.getByRole('button', { name: '＋ 新規登録' })).toBeDefined();
    expect(ports.persistedLocales).toEqual(['ja']);
    expect(ports.langs).toEqual(['en', 'ja']);
    expect(ports.titles).toEqual(['MCP Kanri', 'MCP管理']);
  });
});
