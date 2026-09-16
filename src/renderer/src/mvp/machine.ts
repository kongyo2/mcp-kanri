import { produce, type WritableDraft } from 'immer';
import { translate } from '../../../shared/i18n';
import type { Effect } from './effects';
import type { DomainIntent, RowCollection } from './intents';
import { isScope } from './intents';
import {
  buildDraft,
  draftToInput,
  findServer,
  newArgRow,
  newKeyValueRow,
  validateDraft,
  type AppState,
  type ComposeContext,
  type KeyValueRow,
  type SubmittingPhase,
} from './state';

export interface Transition {
  readonly state: AppState;
  readonly effects: readonly Effect[];
}

const TOAST_MS = 2200;
const COPIED_MS = 1500;

function idle(state: AppState): Transition {
  return { state, effects: [] };
}

function withToast(
  state: AppState,
  kind: 'success' | 'error',
  key: string,
  params?: Record<string, string | number>,
): Transition {
  const token = state.seq + 1;
  return {
    state: {
      ...state,
      seq: token,
      toast: { message: translate(state.locale, key, params), kind, token },
    },
    effects: [
      { kind: 'timer/cancel', key: 'toast' },
      {
        kind: 'timer/start',
        key: 'toast',
        ms: TOAST_MS,
        intent: { scope: 'domain', type: 'toast/expired', token },
      },
    ],
  };
}

function withErrorToast(state: AppState, message: string): Transition {
  const token = state.seq + 1;
  return {
    state: { ...state, seq: token, toast: { message, kind: 'error', token } },
    effects: [
      { kind: 'timer/cancel', key: 'toast' },
      {
        kind: 'timer/start',
        key: 'toast',
        ms: TOAST_MS,
        intent: { scope: 'domain', type: 'toast/expired', token },
      },
    ],
  };
}

function resetCopied(state: AppState): Transition {
  if (!state.copied) return idle(state);
  return {
    state: { ...state, copied: false },
    effects: [{ kind: 'timer/cancel', key: 'clipboard' }],
  };
}

function merge(base: Transition, extra: readonly Effect[]): Transition {
  return { state: base.state, effects: [...base.effects, ...extra] };
}

function editCompose(
  state: AppState,
  mutate: (compose: WritableDraft<ComposeContext>) => void,
): AppState {
  if (state.phase.status !== 'composing') return state;
  return produce(state, (next) => {
    if (next.phase.status === 'composing') mutate(next.phase.compose);
  });
}

function keyValueRowsOf(
  compose: WritableDraft<ComposeContext>,
  collection: Exclude<RowCollection, 'args'>,
): WritableDraft<KeyValueRow>[] {
  return collection === 'env' ? compose.draft.env : compose.draft.headers;
}

function ownsSubmission(
  state: AppState,
  ticket: number,
): state is AppState & { readonly phase: SubmittingPhase } {
  return state.phase.status === 'submitting' && state.phase.ticket === ticket;
}

function localeEffects(state: AppState): readonly Effect[] {
  return [
    { kind: 'locale/publish', locale: state.locale },
    { kind: 'document/lang', lang: state.locale },
    { kind: 'document/title', title: translate(state.locale, 'app.title') },
  ];
}

export function transition(state: AppState, intent: DomainIntent): Transition {
  switch (intent.type) {
    case 'boot/requested': {
      if (state.phase.status !== 'booting') return idle(state);
      return {
        state,
        effects: [...localeEffects(state), { kind: 'store/list' }, { kind: 'store/path' }],
      };
    }

    case 'store/listed': {
      const servers = intent.servers;
      const selectedId =
        state.selectedId !== null && servers.some((s) => s.id === state.selectedId)
          ? state.selectedId
          : null;
      return resetCopied({
        ...state,
        servers,
        selectedId,
        phase: state.phase.status === 'booting' ? { status: 'browsing' } : state.phase,
      });
    }

    case 'store/path-resolved':
      return idle({ ...state, storePath: intent.path });

    case 'store/failed': {
      const base: AppState =
        state.phase.status === 'booting' ? { ...state, phase: { status: 'browsing' } } : state;
      return withErrorToast(base, intent.message);
    }

    case 'server/selected': {
      if (state.selectedId === intent.serverId && state.phase.status === 'browsing') {
        return idle(state);
      }
      return resetCopied({
        ...state,
        selectedId: intent.serverId,
        phase: { status: 'browsing' },
      });
    }

    case 'compose/create-requested': {
      const seed = buildDraft(null, state.seq);
      return resetCopied({
        ...state,
        seq: seed.seq,
        selectedId: null,
        phase: {
          status: 'composing',
          compose: { target: { kind: 'create' }, draft: seed.draft, error: null },
        },
      });
    }

    case 'compose/edit-requested': {
      const server = findServer(state, intent.serverId);
      if (server === null) return idle(state);
      const seed = buildDraft(server, state.seq);
      return resetCopied({
        ...state,
        seq: seed.seq,
        selectedId: server.id,
        phase: {
          status: 'composing',
          compose: {
            target: { kind: 'edit', serverId: server.id, originalName: server.name },
            draft: seed.draft,
            error: null,
          },
        },
      });
    }

    case 'compose/cancelled': {
      if (state.phase.status !== 'composing') return idle(state);
      return idle({ ...state, phase: { status: 'browsing' } });
    }

    case 'draft/transport-selected':
      return idle(
        editCompose(state, (compose) => {
          compose.draft.transport = intent.transport;
        }),
      );

    case 'draft/field-changed':
      return idle(
        editCompose(state, (compose) => {
          if (intent.field === 'scope') {
            if (isScope(intent.value)) compose.draft.scope = intent.value;
            return;
          }
          compose.draft[intent.field] = intent.value;
        }),
      );

    case 'draft/row-appended': {
      const seq = state.seq + 1;
      const appended = editCompose(state, (compose) => {
        if (intent.collection === 'args') {
          compose.draft.args.push(newArgRow(seq));
          return;
        }
        keyValueRowsOf(compose, intent.collection).push(newKeyValueRow(seq));
      });
      return idle(appended === state ? state : { ...appended, seq });
    }

    case 'draft/row-removed':
      return idle(
        editCompose(state, (compose) => {
          const rows =
            intent.collection === 'args'
              ? compose.draft.args
              : keyValueRowsOf(compose, intent.collection);
          const index = rows.findIndex((row) => row.id === intent.rowId);
          if (index >= 0) rows.splice(index, 1);
        }),
      );

    case 'draft/row-edited':
      return idle(
        editCompose(state, (compose) => {
          if (intent.collection === 'args') {
            if (intent.part !== 'value') return;
            const row = compose.draft.args.find((r) => r.id === intent.rowId);
            if (row !== undefined) row.value = intent.value;
            return;
          }
          const row = keyValueRowsOf(compose, intent.collection).find((r) => r.id === intent.rowId);
          if (row === undefined) return;
          if (intent.part === 'key') {
            row.key = intent.value;
          } else {
            row.value = intent.value;
          }
        }),
      );

    case 'submit/requested': {
      if (state.phase.status !== 'composing') return idle(state);
      const compose = state.phase.compose;
      if (!validateDraft(compose.draft).ok) return idle(state);
      const input = draftToInput(compose.draft);
      const ticket = state.seq + 1;
      return {
        state: {
          ...state,
          seq: ticket,
          phase: { status: 'submitting', compose: { ...compose, error: null }, ticket },
        },
        effects: [
          compose.target.kind === 'create'
            ? { kind: 'store/create', input, ticket }
            : { kind: 'store/update', id: compose.target.serverId, input, ticket },
        ],
      };
    }

    case 'submit/succeeded': {
      const key = intent.created ? 'app.toast.created' : 'app.toast.updated';
      const params = { name: intent.server.name };
      if (!ownsSubmission(state, intent.ticket)) {
        return merge(withToast(state, 'success', key, params), [{ kind: 'store/list' }]);
      }
      const base: AppState = {
        ...state,
        phase: { status: 'browsing' },
        selectedId: intent.server.id,
      };
      return merge(withToast(base, 'success', key, params), [{ kind: 'store/list' }]);
    }

    case 'submit/failed': {
      if (!ownsSubmission(state, intent.ticket)) return withErrorToast(state, intent.message);
      const reopened: AppState = {
        ...state,
        phase: { status: 'composing', compose: { ...state.phase.compose, error: intent.message } },
      };
      return withErrorToast(reopened, intent.message);
    }

    case 'removal/requested': {
      if (state.phase.status !== 'browsing') return idle(state);
      const server = findServer(state, intent.serverId);
      if (server === null) return idle(state);
      return idle({
        ...state,
        phase: { status: 'confirming', pending: { serverId: server.id, name: server.name } },
      });
    }

    case 'removal/confirmed': {
      if (state.phase.status !== 'confirming') return idle(state);
      const pending = state.phase.pending;
      return {
        state: { ...state, phase: { status: 'removing', pending } },
        effects: [{ kind: 'store/remove', serverId: pending.serverId }],
      };
    }

    case 'removal/cancelled': {
      if (state.phase.status !== 'confirming') return idle(state);
      return idle({ ...state, phase: { status: 'browsing' } });
    }

    case 'removal/succeeded': {
      if (state.phase.status !== 'removing') return idle(state);
      const pending = state.phase.pending;
      const cleared = resetCopied({
        ...state,
        phase: { status: 'browsing' },
        selectedId: state.selectedId === pending.serverId ? null : state.selectedId,
      });
      const toast = withToast(cleared.state, 'success', 'app.toast.removed', {
        name: pending.name,
      });
      return merge(toast, [...cleared.effects, { kind: 'store/list' }]);
    }

    case 'removal/failed': {
      const base: AppState =
        state.phase.status === 'removing' ? { ...state, phase: { status: 'browsing' } } : state;
      return withErrorToast(base, intent.message);
    }

    case 'format/selected': {
      if (state.activeFormat === intent.formatId) return idle(state);
      return resetCopied({ ...state, activeFormat: intent.formatId });
    }

    case 'clipboard/requested':
      return { state, effects: [{ kind: 'clipboard/write', text: intent.text }] };

    case 'clipboard/succeeded':
      return {
        state: { ...state, copied: true },
        effects: [
          { kind: 'timer/cancel', key: 'clipboard' },
          {
            kind: 'timer/start',
            key: 'clipboard',
            ms: COPIED_MS,
            intent: { scope: 'domain', type: 'clipboard/expired' },
          },
        ],
      };

    case 'clipboard/failed':
      return withErrorToast(state, intent.message);

    case 'clipboard/expired':
      return idle(state.copied ? { ...state, copied: false } : state);

    case 'locale/changed': {
      if (state.locale === intent.locale) return idle(state);
      const next: AppState = { ...state, locale: intent.locale };
      return {
        state: next,
        effects: [...localeEffects(next), { kind: 'locale/persist', locale: intent.locale }],
      };
    }

    case 'toast/expired':
      if (state.toast === null || state.toast.token !== intent.token) return idle(state);
      return idle({ ...state, toast: null });

    default:
      return idle(state);
  }
}
