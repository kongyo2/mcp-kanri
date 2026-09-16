import { describe, expect, it } from 'vitest';
import { makeServer, createTestPorts } from '../testing/harness';
import { bubble, defineLink, type ChainLink } from './chain';
import type { DomainIntent, LocalIntent, UiIntent } from './intents';
import {
  dialogLink,
  editorPaneLink,
  modalGuardLink,
  rowsLink,
  serverRowLink,
  sidebarLink,
  tabsLink,
  traceLink,
} from './links';
import { transition } from './machine';
import { Mediator } from './mediator';
import { createInitialState, type AppState } from './state';

function terminal(): { link: ChainLink; seen: UiIntent[] } {
  const seen: UiIntent[] = [];
  const link = defineLink('terminal', (intent, ctx) => {
    seen.push(intent);
    return { status: 'adjudicated', by: 'terminal', intent, path: ctx.path };
  });
  return { link, seen };
}

function drive(state: AppState, ...intents: readonly DomainIntent[]): AppState {
  return intents.reduce((acc, intent) => transition(acc, intent).state, state);
}

function browsing(servers = [makeServer()]): AppState {
  return drive(
    createInitialState('en'),
    { scope: 'domain', type: 'boot/requested' },
    { scope: 'domain', type: 'store/listed', servers },
  );
}

function composing(): AppState {
  return drive(browsing(), { scope: 'domain', type: 'compose/create-requested' });
}

const EDIT_ROW: LocalIntent = {
  scope: 'local',
  type: 'rows/edited',
  rowId: 'kv-1',
  part: 'key',
  value: 'API_KEY',
};

describe('promotion while bubbling', () => {
  it('gives the same generic row editor a different collection per ancestor', () => {
    const env = terminal();
    bubble([rowsLink('env'), editorPaneLink(), env.link], EDIT_ROW, composing());
    expect(env.seen[0]).toMatchObject({ type: 'draft/row-edited', collection: 'env' });

    const headers = terminal();
    bubble([rowsLink('headers'), editorPaneLink(), headers.link], EDIT_ROW, composing());
    expect(headers.seen[0]).toMatchObject({ type: 'draft/row-edited', collection: 'headers' });
  });

  it('gives the same generic tab strip a different meaning per ancestor', () => {
    const transport = terminal();
    bubble(
      [tabsLink('transport'), transport.link],
      { scope: 'local', type: 'tab/selected', value: 'http' },
      composing(),
    );
    expect(transport.seen[0]).toEqual({
      scope: 'domain',
      type: 'draft/transport-selected',
      transport: 'http',
    });

    const format = terminal();
    bubble(
      [tabsLink('format'), format.link],
      { scope: 'local', type: 'tab/selected', value: 'codex-toml' },
      browsing(),
    );
    expect(format.seen[0]).toEqual({
      scope: 'domain',
      type: 'format/selected',
      formatId: 'codex-toml',
    });
  });

  it('attaches the row identity that the clicked list item never knew', () => {
    const server = makeServer();
    const sink = terminal();
    bubble(
      [serverRowLink(server.id), sidebarLink(), sink.link],
      { scope: 'local', type: 'row/activated' },
      browsing([server]),
    );
    expect(sink.seen[0]).toEqual({
      scope: 'domain',
      type: 'server/selected',
      serverId: server.id,
    });
  });

  it('leaves a value it cannot interpret as a local intent', () => {
    const sink = terminal();
    bubble(
      [tabsLink('transport'), sink.link],
      { scope: 'local', type: 'tab/selected', value: 'carrier-pigeon' },
      composing(),
    );
    expect(sink.seen[0]).toMatchObject({ scope: 'local', type: 'tab/selected' });
  });

  it('reports the links it travelled through, innermost first', () => {
    const sink = terminal();
    const outcome = bubble([rowsLink('env'), editorPaneLink(), sink.link], EDIT_ROW, composing());
    expect(outcome.path).toEqual(['rows(env)', 'editor', 'terminal']);
  });
});

describe('links that stop the chain', () => {
  it('freezes the form while a submit is in flight', () => {
    const submitting = drive(
      composing(),
      { scope: 'domain', type: 'draft/field-changed', field: 'name', value: 'notion' },
      { scope: 'domain', type: 'submit/requested' },
    );
    const sink = terminal();
    const outcome = bubble([rowsLink('env'), editorPaneLink(), sink.link], EDIT_ROW, submitting);
    expect(outcome.status).toBe('consumed');
    expect(outcome.status === 'consumed' ? outcome.by : null).toBe('editor');
    expect(sink.seen).toEqual([]);
  });

  it('swallows everything behind the confirm dialog but not the dialog itself', () => {
    const server = makeServer();
    const confirming = drive(browsing([server]), {
      scope: 'domain',
      type: 'removal/requested',
      serverId: server.id,
    });

    const behind = terminal();
    const blocked = bubble(
      [serverRowLink(server.id), sidebarLink(), modalGuardLink(), behind.link],
      { scope: 'local', type: 'row/activated' },
      confirming,
    );
    expect(blocked.status).toBe('consumed');
    expect(behind.seen).toEqual([]);

    const accepted = terminal();
    bubble([dialogLink(), accepted.link], { scope: 'local', type: 'dialog/accepted' }, confirming);
    expect(accepted.seen[0]).toEqual({ scope: 'domain', type: 'removal/confirmed' });
  });
});

describe('cross-cutting links', () => {
  it('records each adjudication without altering it', () => {
    const sink = terminal();
    const trace = traceLink();
    const outcome = bubble(
      [rowsLink('env'), trace, sink.link],
      { scope: 'local', type: 'rows/appended' },
      composing(),
    );
    expect(outcome.status).toBe('adjudicated');
    expect(trace.entries()).toEqual([
      {
        intent: 'draft/row-appended',
        outcome: 'adjudicated',
        path: ['rows(env)', 'trace', 'terminal'],
      },
    ]);
  });
});

describe('the mediator as the terminal link', () => {
  it('adjudicates a promoted intent by moving the state machine', () => {
    const server = makeServer();
    const ports = createTestPorts();
    const mediator = new Mediator(ports, browsing([server]));

    const outcome = bubble(
      [serverRowLink(server.id), mediator],
      { scope: 'local', type: 'row/activated' },
      mediator.getState(),
    );

    expect(outcome.status).toBe('adjudicated');
    expect(mediator.getState().selectedId).toBe(server.id);
  });

  it('refuses a local intent that no link promoted, and says where it came from', () => {
    const ports = createTestPorts();
    const mediator = new Mediator(ports, browsing());
    const before = mediator.getState();

    const outcome = bubble([mediator], { scope: 'local', type: 'row/activated' }, before);

    expect(outcome.status).toBe('unhandled');
    expect(mediator.getState()).toBe(before);
    expect(ports.warnings[0]).toContain('row/activated');
  });

  it('notifies subscribers once the state actually changed', () => {
    const server = makeServer();
    const ports = createTestPorts();
    const mediator = new Mediator(ports, browsing([server]));
    let notifications = 0;
    mediator.subscribe(() => {
      notifications += 1;
    });

    mediator.receive({ scope: 'domain', type: 'server/selected', serverId: server.id });
    expect(notifications).toBe(1);

    mediator.receive({ scope: 'domain', type: 'server/selected', serverId: server.id });
    expect(notifications).toBe(1);
  });
});
