import { describe, expect, it } from 'vitest';
import type { McpServer } from '../../../shared/schema';
import { makeServer } from '../testing/harness';
import type { Effect } from './effects';
import type { DomainIntent } from './intents';
import { transition } from './machine';
import { createInitialState, type AppState } from './state';

function drive(state: AppState, ...intents: readonly DomainIntent[]): AppState {
  return intents.reduce((acc, intent) => transition(acc, intent).state, state);
}

function booted(servers: readonly McpServer[] = []): AppState {
  return drive(
    createInitialState('en'),
    { scope: 'domain', type: 'boot/requested' },
    { scope: 'domain', type: 'store/listed', servers },
  );
}

function kinds(effects: readonly Effect[]): readonly string[] {
  return effects.map((effect) => effect.kind);
}

describe('boot sequence', () => {
  it('publishes the locale before asking for the store', () => {
    const { effects } = transition(createInitialState('ja'), {
      scope: 'domain',
      type: 'boot/requested',
    });
    expect(kinds(effects)).toEqual([
      'locale/publish',
      'document/lang',
      'document/title',
      'store/list',
      'store/path',
    ]);
    expect(effects[0]).toEqual({ kind: 'locale/publish', locale: 'ja' });
  });

  it('ignores a second boot request', () => {
    const state = booted();
    expect(transition(state, { scope: 'domain', type: 'boot/requested' }).effects).toEqual([]);
  });

  it('leaves booting for browsing once the list arrives', () => {
    expect(booted().phase.status).toBe('browsing');
  });

  it('keeps the previous list and shows the error when loading fails', () => {
    const state = transition(createInitialState('en'), {
      scope: 'domain',
      type: 'store/failed',
      message: 'store is broken',
    }).state;
    expect(state.phase.status).toBe('browsing');
    expect(state.servers).toEqual([]);
    expect(state.toast).toMatchObject({ kind: 'error', message: 'store is broken' });
  });

  it('drops a selection that disappeared from the store', () => {
    const server = makeServer();
    const state = drive(
      booted([server]),
      { scope: 'domain', type: 'server/selected', serverId: server.id },
      { scope: 'domain', type: 'store/listed', servers: [] },
    );
    expect(state.selectedId).toBeNull();
  });
});

describe('composing', () => {
  it('seeds a create draft with the npx -y default', () => {
    const state = drive(booted(), { scope: 'domain', type: 'compose/create-requested' });
    if (state.phase.status !== 'composing') throw new Error('expected composing');
    expect(state.phase.compose.target).toEqual({ kind: 'create' });
    expect(state.phase.compose.draft.args.map((row) => row.value)).toEqual(['-y']);
  });

  it('loads an existing server into the draft', () => {
    const server = makeServer({ name: 'ctx7', command: 'uvx', args: ['ctx7'], env: { KEY: 'v' } });
    const state = drive(booted([server]), {
      scope: 'domain',
      type: 'compose/edit-requested',
      serverId: server.id,
    });
    if (state.phase.status !== 'composing') throw new Error('expected composing');
    expect(state.phase.compose.draft.name).toBe('ctx7');
    expect(state.phase.compose.draft.command).toBe('uvx');
    expect(state.phase.compose.draft.env.map((row) => [row.key, row.value])).toEqual([
      ['KEY', 'v'],
    ]);
  });

  it('updates single-value fields and rejects an unknown scope', () => {
    const base = drive(booted(), { scope: 'domain', type: 'compose/create-requested' });
    const state = drive(
      base,
      { scope: 'domain', type: 'draft/field-changed', field: 'name', value: 'notion' },
      { scope: 'domain', type: 'draft/field-changed', field: 'scope', value: 'nonsense' },
    );
    if (state.phase.status !== 'composing') throw new Error('expected composing');
    expect(state.phase.compose.draft.name).toBe('notion');
    expect(state.phase.compose.draft.scope).toBe('user');
  });

  it('appends, edits and removes key-value rows of the addressed collection', () => {
    let state = drive(
      booted(),
      { scope: 'domain', type: 'compose/create-requested' },
      { scope: 'domain', type: 'draft/row-appended', collection: 'env' },
    );
    if (state.phase.status !== 'composing') throw new Error('expected composing');
    const rowId = state.phase.compose.draft.env[0]?.id ?? '';
    expect(rowId).not.toBe('');

    state = drive(
      state,
      {
        scope: 'domain',
        type: 'draft/row-edited',
        collection: 'env',
        rowId,
        part: 'key',
        value: 'API_KEY',
      },
      {
        scope: 'domain',
        type: 'draft/row-edited',
        collection: 'env',
        rowId,
        part: 'value',
        value: 'secret',
      },
    );
    if (state.phase.status !== 'composing') throw new Error('expected composing');
    expect(state.phase.compose.draft.env[0]).toMatchObject({ key: 'API_KEY', value: 'secret' });
    expect(state.phase.compose.draft.headers).toEqual([]);

    state = drive(state, { scope: 'domain', type: 'draft/row-removed', collection: 'env', rowId });
    if (state.phase.status !== 'composing') throw new Error('expected composing');
    expect(state.phase.compose.draft.env).toEqual([]);
  });

  it('keeps transports apart so switching does not lose what was typed', () => {
    const state = drive(
      booted(),
      { scope: 'domain', type: 'compose/create-requested' },
      { scope: 'domain', type: 'draft/field-changed', field: 'command', value: 'uvx' },
      { scope: 'domain', type: 'draft/transport-selected', transport: 'http' },
      { scope: 'domain', type: 'draft/field-changed', field: 'url', value: 'https://example.test' },
      { scope: 'domain', type: 'draft/transport-selected', transport: 'stdio' },
    );
    if (state.phase.status !== 'composing') throw new Error('expected composing');
    expect(state.phase.compose.draft.command).toBe('uvx');
    expect(state.phase.compose.draft.url).toBe('https://example.test');
  });
});

describe('submitting', () => {
  function validDraftState(): AppState {
    return drive(
      booted(),
      { scope: 'domain', type: 'compose/create-requested' },
      { scope: 'domain', type: 'draft/field-changed', field: 'name', value: 'notion' },
    );
  }

  it('refuses to submit an invalid draft', () => {
    const state = drive(booted(), { scope: 'domain', type: 'compose/create-requested' });
    const result = transition(state, { scope: 'domain', type: 'submit/requested' });
    expect(result.effects).toEqual([]);
    expect(result.state.phase.status).toBe('composing');
  });

  it('issues a create effect and blocks a second submit while in flight', () => {
    const result = transition(validDraftState(), { scope: 'domain', type: 'submit/requested' });
    expect(result.state.phase.status).toBe('submitting');
    expect(kinds(result.effects)).toEqual(['store/create']);

    const again = transition(result.state, { scope: 'domain', type: 'submit/requested' });
    expect(again.effects).toEqual([]);
    expect(again.state).toBe(result.state);
  });

  it('issues an update effect when editing', () => {
    const server = makeServer({ name: 'ctx7' });
    const state = drive(booted([server]), {
      scope: 'domain',
      type: 'compose/edit-requested',
      serverId: server.id,
    });
    const result = transition(state, { scope: 'domain', type: 'submit/requested' });
    expect(result.effects[0]).toMatchObject({ kind: 'store/update', id: server.id });
  });

  function ticketOf(state: AppState): number {
    if (state.phase.status !== 'submitting') throw new Error('expected submitting');
    return state.phase.ticket;
  }

  function submitting(): AppState {
    return transition(validDraftState(), { scope: 'domain', type: 'submit/requested' }).state;
  }

  it('selects the saved server, toasts and reloads on success', () => {
    const state = submitting();
    const saved = makeServer({ id: 'new-1', name: 'notion' });
    const result = transition(state, {
      scope: 'domain',
      type: 'submit/succeeded',
      server: saved,
      ticket: ticketOf(state),
      created: true,
    });
    expect(result.state.phase.status).toBe('browsing');
    expect(result.state.selectedId).toBe('new-1');
    expect(result.state.toast?.message).toBe('Created "notion"');
    expect(kinds(result.effects)).toContain('store/list');
  });

  it('reopens the form with the error when saving fails', () => {
    const state = submitting();
    const result = transition(state, {
      scope: 'domain',
      type: 'submit/failed',
      message: 'duplicate name',
      ticket: ticketOf(state),
    });
    if (result.state.phase.status !== 'composing') throw new Error('expected composing');
    expect(result.state.phase.compose.error).toBe('duplicate name');
    expect(result.state.toast).toMatchObject({ kind: 'error', message: 'duplicate name' });
  });

  it('still reloads when the save lands after the user navigated away', () => {
    const state = submitting();
    const ticket = ticketOf(state);
    const navigated = drive(state, { scope: 'domain', type: 'compose/create-requested' });
    const saved = makeServer({ id: 'new-1', name: 'notion' });

    const result = transition(navigated, {
      scope: 'domain',
      type: 'submit/succeeded',
      server: saved,
      ticket,
      created: true,
    });

    expect(kinds(result.effects)).toContain('store/list');
    expect(result.state.toast?.message).toBe('Created "notion"');
    expect(result.state.phase.status).toBe('composing');
    expect(result.state.selectedId).toBeNull();
  });

  it('never applies one submission result to another submission', () => {
    const first = submitting();
    const staleTicket = ticketOf(first);
    const second = transition(
      drive(
        first,
        { scope: 'domain', type: 'compose/create-requested' },
        { scope: 'domain', type: 'draft/field-changed', field: 'name', value: 'linear' },
      ),
      { scope: 'domain', type: 'submit/requested' },
    ).state;
    expect(ticketOf(second)).not.toBe(staleTicket);

    const result = transition(second, {
      scope: 'domain',
      type: 'submit/failed',
      message: 'duplicate name',
      ticket: staleTicket,
    });

    expect(result.state.phase.status).toBe('submitting');
    expect(result.state.toast).toMatchObject({ kind: 'error', message: 'duplicate name' });
  });

  it('labels the toast from the operation that ran, not the current form', () => {
    const state = submitting();
    const result = transition(state, {
      scope: 'domain',
      type: 'submit/succeeded',
      server: makeServer({ id: 'srv-x', name: 'ctx7' }),
      ticket: ticketOf(state),
      created: false,
    });
    expect(result.state.toast?.message).toBe('Updated "ctx7"');
  });
});

describe('removal', () => {
  const server = makeServer({ name: 'doomed' });

  function confirming(): AppState {
    return drive(
      booted([server]),
      { scope: 'domain', type: 'server/selected', serverId: server.id },
      { scope: 'domain', type: 'removal/requested', serverId: server.id },
    );
  }

  it('asks for confirmation before deleting', () => {
    const state = confirming();
    expect(state.phase).toEqual({
      status: 'confirming',
      pending: { serverId: server.id, name: 'doomed' },
    });
  });

  it('ignores a removal request raised while composing', () => {
    const state = drive(booted([server]), { scope: 'domain', type: 'compose/create-requested' });
    const result = transition(state, {
      scope: 'domain',
      type: 'removal/requested',
      serverId: server.id,
    });
    expect(result.state.phase.status).toBe('composing');
  });

  it('runs the delete only after confirmation and clears the selection', () => {
    const removing = transition(confirming(), { scope: 'domain', type: 'removal/confirmed' });
    expect(removing.state.phase.status).toBe('removing');
    expect(removing.effects).toEqual([{ kind: 'store/remove', serverId: server.id }]);

    const done = transition(removing.state, { scope: 'domain', type: 'removal/succeeded' });
    expect(done.state.phase.status).toBe('browsing');
    expect(done.state.selectedId).toBeNull();
    expect(done.state.toast?.message).toBe('Removed "doomed"');
    expect(kinds(done.effects)).toContain('store/list');
  });

  it('goes back to browsing when cancelled', () => {
    const state = transition(confirming(), { scope: 'domain', type: 'removal/cancelled' }).state;
    expect(state.phase.status).toBe('browsing');
    expect(state.selectedId).toBe(server.id);
  });
});

describe('clipboard and toast lifetimes', () => {
  it('marks copied on success and schedules the reset', () => {
    const result = transition(booted(), { scope: 'domain', type: 'clipboard/succeeded' });
    expect(result.state.copied).toBe(true);
    expect(kinds(result.effects)).toEqual(['timer/cancel', 'timer/start']);
  });

  it('clears the copied flag when the shown text changes', () => {
    const server = makeServer();
    const copied = drive(
      booted([server]),
      { scope: 'domain', type: 'server/selected', serverId: server.id },
      { scope: 'domain', type: 'clipboard/succeeded' },
    );
    const result = transition(copied, {
      scope: 'domain',
      type: 'format/selected',
      formatId: 'codex-toml',
    });
    expect(result.state.copied).toBe(false);
    expect(result.effects).toEqual([{ kind: 'timer/cancel', key: 'clipboard' }]);
  });

  it('ignores an expiry that belongs to a replaced toast', () => {
    const first = transition(booted(), {
      scope: 'domain',
      type: 'store/failed',
      message: 'a',
    }).state;
    const staleToken = first.toast?.token ?? -1;
    const second = transition(first, { scope: 'domain', type: 'store/failed', message: 'b' }).state;

    const kept = transition(second, { scope: 'domain', type: 'toast/expired', token: staleToken });
    expect(kept.state.toast?.message).toBe('b');

    const cleared = transition(second, {
      scope: 'domain',
      type: 'toast/expired',
      token: second.toast?.token ?? -1,
    });
    expect(cleared.state.toast).toBeNull();
  });
});

describe('locale', () => {
  it('republishes and persists the new locale', () => {
    const result = transition(booted(), { scope: 'domain', type: 'locale/changed', locale: 'ja' });
    expect(result.state.locale).toBe('ja');
    expect(kinds(result.effects)).toEqual([
      'locale/publish',
      'document/lang',
      'document/title',
      'locale/persist',
    ]);
    expect(result.effects[2]).toEqual({ kind: 'document/title', title: 'MCP管理' });
  });

  it('does nothing when the locale is unchanged', () => {
    const state = booted();
    expect(
      transition(state, { scope: 'domain', type: 'locale/changed', locale: 'en' }).effects,
    ).toEqual([]);
  });
});
