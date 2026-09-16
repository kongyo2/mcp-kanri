import { isLocale } from '../../../shared/i18n';
import {
  defineGuard,
  defineLink,
  definePromoter,
  type ChainLink,
  type DispatchOutcome,
} from './chain';
import { isFormatId } from '../../../shared/converters';
import { isTransport, type RowCollection, type TabChannel } from './intents';

export function serverRowLink(serverId: string): ChainLink {
  return definePromoter(`row(${serverId})`, (intent) =>
    intent.type === 'row/activated' ? { scope: 'domain', type: 'server/selected', serverId } : null,
  );
}

export function sidebarLink(): ChainLink {
  return definePromoter('sidebar', (intent) => {
    if (intent.type === 'action/create')
      return { scope: 'domain', type: 'compose/create-requested' };
    if (intent.type === 'locale/selected' && isLocale(intent.value)) {
      return { scope: 'domain', type: 'locale/changed', locale: intent.value };
    }
    return null;
  });
}

export function detailPaneLink(serverId: string, copyText: string): ChainLink {
  return definePromoter(`detail(${serverId})`, (intent) => {
    switch (intent.type) {
      case 'action/edit':
        return { scope: 'domain', type: 'compose/edit-requested', serverId };
      case 'action/remove':
        return { scope: 'domain', type: 'removal/requested', serverId };
      case 'clipboard/requested':
        return { scope: 'domain', type: 'clipboard/requested', text: copyText };
      default:
        return null;
    }
  });
}

export function tabsLink(channel: TabChannel): ChainLink {
  return definePromoter(`tabs(${channel})`, (intent) => {
    if (intent.type !== 'tab/selected') return null;
    if (channel === 'transport') {
      return isTransport(intent.value)
        ? { scope: 'domain', type: 'draft/transport-selected', transport: intent.value }
        : null;
    }
    return isFormatId(intent.value)
      ? { scope: 'domain', type: 'format/selected', formatId: intent.value }
      : null;
  });
}

export function rowsLink(collection: RowCollection): ChainLink {
  return definePromoter(`rows(${collection})`, (intent) => {
    switch (intent.type) {
      case 'rows/appended':
        return { scope: 'domain', type: 'draft/row-appended', collection };
      case 'rows/removed':
        return { scope: 'domain', type: 'draft/row-removed', collection, rowId: intent.rowId };
      case 'rows/edited':
        return {
          scope: 'domain',
          type: 'draft/row-edited',
          collection,
          rowId: intent.rowId,
          part: intent.part,
          value: intent.value,
        };
      default:
        return null;
    }
  });
}

export function editorPaneLink(): ChainLink {
  return defineLink('editor', (intent, ctx, next) => {
    if (ctx.state.phase.status === 'submitting') {
      return { status: 'consumed', by: 'editor', intent, path: ctx.path };
    }
    if (intent.scope !== 'local') return next(intent);
    switch (intent.type) {
      case 'field/changed':
        return next({
          scope: 'domain',
          type: 'draft/field-changed',
          field: intent.field,
          value: intent.value,
        });
      case 'form/submitted':
        return next({ scope: 'domain', type: 'submit/requested' });
      case 'form/cancelled':
        return next({ scope: 'domain', type: 'compose/cancelled' });
      default:
        return next(intent);
    }
  });
}

export function dialogLink(): ChainLink {
  return definePromoter('dialog', (intent) => {
    if (intent.type === 'dialog/accepted') return { scope: 'domain', type: 'removal/confirmed' };
    if (intent.type === 'dialog/dismissed') return { scope: 'domain', type: 'removal/cancelled' };
    return null;
  });
}

export function modalGuardLink(): ChainLink {
  return defineGuard('modal-guard', (_intent, ctx) => {
    const status = ctx.state.phase.status;
    return status === 'confirming' || status === 'removing';
  });
}

export interface TraceEntry {
  readonly intent: string;
  readonly outcome: DispatchOutcome['status'];
  readonly path: readonly string[];
}

export interface TraceLink extends ChainLink {
  entries: () => readonly TraceEntry[];
}

const TRACE_LIMIT = 50;

export function traceLink(): TraceLink {
  const buffer: TraceEntry[] = [];
  const base = defineLink('trace', (intent, _ctx, next) => {
    const outcome = next(intent);
    buffer.push({ intent: outcome.intent.type, outcome: outcome.status, path: outcome.path });
    if (buffer.length > TRACE_LIMIT) buffer.shift();
    return outcome;
  });
  return { ...base, entries: () => buffer };
}
