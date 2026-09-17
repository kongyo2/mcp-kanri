import type { FormatId } from '../../../shared/converters';
import { DEFAULT_LOCALE, type Locale } from '../../../shared/i18n';
import {
  McpServerInputSchema,
  type McpServer,
  type McpServerInput,
  type Scope,
  type Transport,
} from '../../../shared/schema';

export interface ArgRow {
  readonly id: string;
  readonly value: string;
}

export interface KeyValueRow {
  readonly id: string;
  readonly key: string;
  readonly value: string;
}

export interface Draft {
  readonly transport: Transport;
  readonly name: string;
  readonly description: string;
  readonly scope: Scope;
  readonly command: string;
  readonly args: readonly ArgRow[];
  readonly env: readonly KeyValueRow[];
  readonly url: string;
  readonly headers: readonly KeyValueRow[];
}

type ComposeTarget =
  | { readonly kind: 'create' }
  | { readonly kind: 'edit'; readonly serverId: string; readonly originalName: string };

export interface ComposeContext {
  readonly target: ComposeTarget;
  readonly draft: Draft;
  readonly error: string | null;
}

interface PendingRemoval {
  readonly serverId: string;
  readonly name: string;
}

export interface SubmittingPhase {
  readonly status: 'submitting';
  readonly compose: ComposeContext;
  readonly ticket: number;
}

type Phase =
  | { readonly status: 'booting' }
  | { readonly status: 'browsing' }
  | { readonly status: 'composing'; readonly compose: ComposeContext }
  | SubmittingPhase
  | { readonly status: 'confirming'; readonly pending: PendingRemoval }
  | { readonly status: 'removing'; readonly pending: PendingRemoval };

interface Toast {
  readonly message: string;
  readonly kind: 'success' | 'error';
  readonly token: number;
}

export interface AppState {
  readonly phase: Phase;
  readonly servers: readonly McpServer[];
  readonly selectedId: string | null;
  readonly storePath: string;
  readonly locale: Locale;
  readonly activeFormat: FormatId;
  readonly copied: boolean;
  readonly toast: Toast | null;
  readonly seq: number;
}

const DEFAULT_FORMAT: FormatId = 'claude-cli';

export function createInitialState(locale: Locale = DEFAULT_LOCALE): AppState {
  return {
    phase: { status: 'booting' },
    servers: [],
    selectedId: null,
    storePath: '',
    locale,
    activeFormat: DEFAULT_FORMAT,
    copied: false,
    toast: null,
    seq: 0,
  };
}

export function findServer(state: AppState, serverId: string): McpServer | null {
  return state.servers.find((s) => s.id === serverId) ?? null;
}

export function selectedServer(state: AppState): McpServer | null {
  return state.selectedId === null ? null : findServer(state, state.selectedId);
}

export interface DraftSeed {
  readonly draft: Draft;
  readonly seq: number;
}

const EMPTY_DRAFT: Omit<Draft, 'transport'> = {
  name: '',
  description: '',
  scope: 'user',
  command: 'npx',
  args: [],
  env: [],
  url: '',
  headers: [],
};

export function buildDraft(server: McpServer | null, seq: number): DraftSeed {
  if (server === null) {
    const args = stringsToRows(['-y'], seq);
    return {
      draft: { ...EMPTY_DRAFT, transport: 'stdio', args: args.rows },
      seq: args.seq,
    };
  }
  const common = {
    name: server.name,
    description: server.description,
    scope: server.scope,
  };
  if (server.transport === 'stdio') {
    const args = stringsToRows(server.args, seq);
    const env = recordToRows(server.env, args.seq);
    return {
      draft: {
        ...EMPTY_DRAFT,
        ...common,
        transport: 'stdio',
        command: server.command,
        args: args.rows,
        env: env.rows,
      },
      seq: env.seq,
    };
  }
  const headers = recordToRows(server.headers, seq);
  return {
    draft: {
      ...EMPTY_DRAFT,
      ...common,
      transport: server.transport,
      url: server.url,
      headers: headers.rows,
    },
    seq: headers.seq,
  };
}

function stringsToRows(
  values: readonly string[],
  seq: number,
): { readonly rows: readonly ArgRow[]; readonly seq: number } {
  let next = seq;
  const rows = values.map((value) => {
    next += 1;
    return { id: `arg-${next}`, value };
  });
  return { rows, seq: next };
}

function recordToRows(
  record: Record<string, string>,
  seq: number,
): { readonly rows: readonly KeyValueRow[]; readonly seq: number } {
  let next = seq;
  const rows = Object.entries(record).map(([key, value]) => {
    next += 1;
    return { id: `kv-${next}`, key, value };
  });
  return { rows, seq: next };
}

export function newArgRow(seq: number): ArgRow {
  return { id: `arg-${seq}`, value: '' };
}

export function newKeyValueRow(seq: number): KeyValueRow {
  return { id: `kv-${seq}`, key: '', value: '' };
}

function rowsToRecord(rows: readonly KeyValueRow[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const row of rows) {
    if (row.key.length > 0) result[row.key] = row.value;
  }
  return result;
}

export function draftToInput(draft: Draft): McpServerInput {
  const base = {
    name: draft.name.trim(),
    description: draft.description,
    scope: draft.scope,
  };
  if (draft.transport === 'stdio') {
    return {
      ...base,
      transport: 'stdio',
      command: draft.command.trim(),
      args: draft.args.map((row) => row.value).filter((value) => value.length > 0),
      env: rowsToRecord(draft.env),
    };
  }
  return {
    ...base,
    transport: draft.transport,
    url: draft.url.trim(),
    headers: rowsToRecord(draft.headers),
  };
}

export type DraftValidation =
  | { readonly ok: true }
  | { readonly ok: false; readonly messageKey: string };

export function validateDraft(draft: Draft): DraftValidation {
  const parsed = McpServerInputSchema.safeParse(draftToInput(draft));
  if (parsed.success) return { ok: true };
  const first = parsed.error.issues[0];
  return { ok: false, messageKey: first === undefined ? 'validation.nameRequired' : first.message };
}
