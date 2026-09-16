import { describe, expect, it } from 'vitest';
import type { DomainIntent } from '../mvp/intents';
import { transition } from '../mvp/machine';
import { createInitialState, type AppState } from '../mvp/state';
import { makeServer } from '../testing/harness';
import { presentRoot } from './presenter';
import type { EditorFormViewModel } from './types';

function drive(state: AppState, ...intents: readonly DomainIntent[]): AppState {
  return intents.reduce((acc, intent) => transition(acc, intent).state, state);
}

const stdioServer = makeServer({
  name: 'chrome-devtools',
  command: 'npx',
  args: ['-y', 'chrome-devtools-mcp@latest'],
  env: { API_KEY: 'x' },
  description: 'browser tooling',
});

function browsing(locale: 'ja' | 'en' = 'en', servers = [stdioServer]): AppState {
  return drive(
    createInitialState(locale),
    { scope: 'domain', type: 'boot/requested' },
    { scope: 'domain', type: 'store/listed', servers },
    { scope: 'domain', type: 'store/path-resolved', path: 'C:\\store.json' },
  );
}

function formOf(state: AppState): EditorFormViewModel {
  const main = presentRoot(state).main;
  if (main.kind !== 'compose') throw new Error('expected the compose pane');
  return main.form;
}

describe('sidebar', () => {
  it('summarises a stdio server as its command line', () => {
    const vm = presentRoot(browsing()).sidebar;
    expect(vm.items).toEqual([
      {
        id: stdioServer.id,
        name: 'chrome-devtools',
        transport: 'stdio',
        transportTagClass: 'tag stdio',
        meta: 'npx -y chrome-devtools-mcp@latest',
        selected: false,
      },
    ]);
    expect(vm.emptyLines).toBeNull();
  });

  it('offers the empty-state copy when nothing is registered', () => {
    const vm = presentRoot(browsing('en', [])).sidebar;
    expect(vm.emptyLines).toEqual([
      'No MCP servers registered yet.',
      'Click "＋ New server" at the top right to add one.',
    ]);
  });

  it('translates every label for the active locale', () => {
    expect(presentRoot(browsing('ja')).sidebar.title).toBe('MCP管理');
    expect(presentRoot(browsing('en')).sidebar.title).toBe('MCP Kanri');
  });

  it('marks the selected row only while browsing', () => {
    const selected = drive(browsing(), {
      scope: 'domain',
      type: 'server/selected',
      serverId: stdioServer.id,
    });
    expect(presentRoot(selected).sidebar.items[0]?.selected).toBe(true);

    const editing = drive(selected, {
      scope: 'domain',
      type: 'compose/edit-requested',
      serverId: stdioServer.id,
    });
    expect(presentRoot(editing).sidebar.items[0]?.selected).toBe(false);
  });
});

describe('main pane', () => {
  it('shows the empty state when no server is selected', () => {
    const main = presentRoot(browsing()).main;
    expect(main.kind).toBe('empty');
  });

  it('renders the detail of the selected server with the active format', () => {
    const state = drive(
      browsing(),
      { scope: 'domain', type: 'server/selected', serverId: stdioServer.id },
      { scope: 'domain', type: 'format/selected', formatId: 'codex-toml' },
    );
    const main = presentRoot(state).main;
    if (main.kind !== 'detail') throw new Error('expected the detail pane');

    expect(main.detail.name).toBe('chrome-devtools');
    expect(main.detail.transportTagClass).toBe('tag stdio');
    expect(main.detail.scopeLabel).toBe('scope: user');
    expect(main.detail.meta.map((item) => item.id)).toEqual(['command', 'args', 'env']);
    expect(main.detail.meta[2]?.label).toBe('env: 1 entries');
    expect(main.detail.description).toBe('browser tooling');
    expect(main.detail.subtitle).toBe('TOML excerpt for `~/.codex/config.toml`');
    expect(main.detail.code.text).toContain('[mcp_servers.chrome-devtools]');
    expect(main.detail.code.copyLabel).toBe('Copy');
    expect(main.detail.tabs.items.filter((tab) => tab.active).map((tab) => tab.value)).toEqual([
      'codex-toml',
    ]);
  });

  it('swaps the copy label once the clipboard write succeeded', () => {
    const state = drive(
      browsing(),
      { scope: 'domain', type: 'server/selected', serverId: stdioServer.id },
      { scope: 'domain', type: 'clipboard/succeeded' },
    );
    const main = presentRoot(state).main;
    if (main.kind !== 'detail') throw new Error('expected the detail pane');
    expect(main.detail.code.copied).toBe(true);
    expect(main.detail.code.copyLabel).toBe('Copied!');
  });
});

describe('editor form', () => {
  it('blocks submitting and explains why while the draft is invalid', () => {
    const form = formOf(drive(browsing(), { scope: 'domain', type: 'compose/create-requested' }));
    expect(form.submitDisabled).toBe(true);
    expect(form.validationMessage).toBe('Name is required');
    expect(form.submitLabel).toBe('Create');
  });

  it('allows submitting once the draft validates', () => {
    const form = formOf(
      drive(
        browsing(),
        { scope: 'domain', type: 'compose/create-requested' },
        { scope: 'domain', type: 'draft/field-changed', field: 'name', value: 'notion' },
      ),
    );
    expect(form.validationMessage).toBeNull();
    expect(form.submitDisabled).toBe(false);
  });

  it('exposes only the fields of the chosen transport', () => {
    const stdio = formOf(drive(browsing(), { scope: 'domain', type: 'compose/create-requested' }));
    expect(stdio.stdio).not.toBeNull();
    expect(stdio.remote).toBeNull();

    const remote = formOf(
      drive(
        browsing(),
        { scope: 'domain', type: 'compose/create-requested' },
        { scope: 'domain', type: 'draft/transport-selected', transport: 'sse' },
      ),
    );
    expect(remote.stdio).toBeNull();
    expect(remote.remote?.url.hint).toBe('e.g. https://mcp.asana.com/sse');
  });

  it('keeps the heading on the original name while the draft name is edited', () => {
    const state = drive(
      browsing(),
      { scope: 'domain', type: 'compose/edit-requested', serverId: stdioServer.id },
      { scope: 'domain', type: 'draft/field-changed', field: 'name', value: 'renamed' },
    );
    const main = presentRoot(state).main;
    if (main.kind !== 'compose') throw new Error('expected the compose pane');
    expect(main.heading).toBe('Edit "chrome-devtools"');
    expect(main.form.name.value).toBe('renamed');
    expect(main.form.submitLabel).toBe('Update');
  });

  it('disables the whole form while the submit is in flight', () => {
    const form = formOf(
      drive(
        browsing(),
        { scope: 'domain', type: 'compose/create-requested' },
        { scope: 'domain', type: 'draft/field-changed', field: 'name', value: 'notion' },
        { scope: 'domain', type: 'submit/requested' },
      ),
    );
    expect(form.submitDisabled).toBe(true);
    expect(form.cancelDisabled).toBe(true);
    expect(form.name.disabled).toBe(true);
    expect(form.stdio?.args.disabled).toBe(true);
  });
});

describe('overlays', () => {
  it('presents the confirm dialog straight from the confirming phase', () => {
    const state = drive(browsing(), {
      scope: 'domain',
      type: 'removal/requested',
      serverId: stdioServer.id,
    });
    expect(presentRoot(state).dialog).toEqual({
      title: 'Confirm deletion',
      message: 'Delete "chrome-devtools". Are you sure?',
      acceptLabel: 'Delete',
      cancelLabel: 'Cancel',
      busy: false,
    });
  });

  it('marks the dialog busy while the delete is running', () => {
    const state = drive(
      browsing(),
      { scope: 'domain', type: 'removal/requested', serverId: stdioServer.id },
      { scope: 'domain', type: 'removal/confirmed' },
    );
    expect(presentRoot(state).dialog?.busy).toBe(true);
  });

  it('carries the toast kind into a class name', () => {
    const state = drive(browsing(), { scope: 'domain', type: 'store/failed', message: 'boom' });
    expect(presentRoot(state).toast).toEqual({ message: 'boom', className: 'toast error' });
  });
});
