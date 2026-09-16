import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
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

  it('surfaces a rejected clipboard write as an error toast', async () => {
    const { user } = await mount({ clipboardFails: 'reject' });
    await user.click(screen.getByRole('button', { name: /alpha/ }));
    await user.click(await screen.findByRole('button', { name: 'Copy' }));
    expect(await screen.findByText('clipboard denied')).toBeDefined();
  });

  it('surfaces a clipboard port that throws synchronously', async () => {
    const { user } = await mount({ clipboardFails: 'throw' });
    await user.click(screen.getByRole('button', { name: /alpha/ }));
    await user.click(await screen.findByRole('button', { name: 'Copy' }));
    expect(await screen.findByText('clipboard unavailable')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDefined();
  });
});

describe('removal', () => {
  it('confirms first, ignores the screen behind the dialog, then deletes', async () => {
    const { ports, user } = await mount();

    await user.click(screen.getByRole('button', { name: /alpha/ }));
    await user.click(await screen.findByRole('button', { name: 'Delete' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain('Delete "alpha". Are you sure?');

    expect(screen.queryByRole('button', { name: /beta/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: /beta/, hidden: true }));
    expect(screen.getByRole('heading', { name: 'alpha', hidden: true })).toBeDefined();
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

  it('opens with focus inside the dialog, wraps Tab and closes on Escape', async () => {
    const { user } = await mount();
    await user.click(screen.getByRole('button', { name: /alpha/ }));
    await user.click(await screen.findByRole('button', { name: 'Delete' }));

    const dialog = await screen.findByRole('dialog');
    const accept = within(dialog).getByRole('button', { name: 'Delete' });
    const cancel = within(dialog).getByRole('button', { name: 'Cancel' });
    expect(document.activeElement).toBe(cancel);

    await user.tab();
    expect(document.activeElement).toBe(accept);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('heading', { name: 'alpha' })).toBeDefined();
  });

  it('hands focus back to the button that opened the dialog', async () => {
    const { ports, user } = await mount();
    await user.click(screen.getByRole('button', { name: /alpha/ }));

    const trigger = await screen.findByRole('button', { name: 'Delete' });
    await user.click(trigger);
    expect(document.activeElement).not.toBe(trigger);

    await user.keyboard('{Escape}');
    expect(document.activeElement).toBe(trigger);
    expect(ports.focusCalls).toEqual(['capture', 'restore']);
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
    await user.type(screen.getByLabelText('env key 1'), 'API_KEY');
    await user.type(screen.getByLabelText('env value 1'), 'secret');

    expect(screen.getByRole('button', { name: 'Create' }).hasAttribute('disabled')).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByText('Created "notion"')).toBeDefined();
    const created = ports.api.store.find((server) => server.name === 'notion');
    expect(created).toMatchObject({ transport: 'stdio', command: 'npx', args: ['-y'] });
    expect(created?.transport === 'stdio' ? created.env : null).toEqual({ API_KEY: 'secret' });
  });

  it('keeps the sidebar fresh when a save lands after the user clicked away', async () => {
    const { ports, user } = await mount();
    const release = ports.api.holdNextWrite();

    await user.click(screen.getByRole('button', { name: '＋ New server' }));
    await user.type(screen.getByLabelText('Name (server-name)'), 'notion');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await user.click(screen.getByRole('button', { name: /alpha/ }));
    expect(await screen.findByRole('heading', { name: 'alpha' })).toBeDefined();

    await act(async () => {
      release();
    });

    expect(await screen.findByRole('button', { name: /notion/ })).toBeDefined();
    expect(await screen.findByText('Created "notion"')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'alpha' })).toBeDefined();
  });

  it('gives every list control an accessible name', async () => {
    const { user } = await mount();
    await user.click(screen.getByRole('button', { name: '＋ New server' }));

    expect(screen.getByRole('group', { name: 'args' })).toBeDefined();
    expect(screen.getByRole('group', { name: 'env' })).toBeDefined();
    expect(screen.getByLabelText('Arg 1')).toBeDefined();

    await user.click(screen.getByRole('button', { name: '＋ Add' }));
    expect(screen.getByLabelText('env key 1')).toBeDefined();
    expect(screen.getByLabelText('env value 1')).toBeDefined();
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
