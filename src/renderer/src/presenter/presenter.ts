import { FORMAT_DESCRIPTORS, formatServer } from '../../../shared/converters';
import { SUPPORTED_LOCALES, translate, type Locale } from '../../../shared/i18n';
import type { McpServer } from '../../../shared/schema';
import {
  selectedServer,
  validateDraft,
  type AppState,
  type ComposeContext,
  type Draft,
} from '../mvp/state';
import type {
  ArgListViewModel,
  ConfirmDialogViewModel,
  DetailViewModel,
  EditorFormViewModel,
  KeyValueListViewModel,
  MainViewModel,
  MetaItemViewModel,
  RootViewModel,
  ServerItemViewModel,
  SidebarViewModel,
  TabsViewModel,
  ToastViewModel,
} from './types';

const EMPTY_STATE_ICON = '📋';

const FIELD_IDS = {
  transport: 'field-transport',
  name: 'field-name',
  scope: 'field-scope',
  description: 'field-description',
  command: 'field-command',
  url: 'field-url',
} as const;

type Translator = (key: string, params?: Record<string, string | number>) => string;

function translatorFor(locale: Locale): Translator {
  return (key, params) => translate(locale, key, params);
}

function transportTagClass(transport: McpServer['transport']): string {
  return `tag ${transport}`;
}

export function presentRoot(state: AppState): RootViewModel {
  const t = translatorFor(state.locale);
  const dialog = presentDialog(state, t);
  return {
    sidebar: presentSidebar(state, t),
    main: presentMain(state, t),
    toast: presentToast(state),
    dialog,
    contentHidden: dialog !== null,
  };
}

function presentSidebar(state: AppState, t: Translator): SidebarViewModel {
  const browsing = state.phase.status !== 'composing' && state.phase.status !== 'submitting';
  return {
    title: t('app.sidebar.title'),
    newServerLabel: t('app.sidebar.newServer'),
    emptyLines:
      state.servers.length === 0
        ? [t('app.sidebar.empty.line1'), t('app.sidebar.empty.line2')]
        : null,
    items: state.servers.map(
      (server): ServerItemViewModel => ({
        id: server.id,
        name: server.name,
        transport: server.transport,
        transportTagClass: transportTagClass(server.transport),
        meta:
          server.transport === 'stdio'
            ? `${server.command}${server.args.length > 0 ? ` ${server.args.join(' ')}` : ''}`
            : server.url,
        selected: browsing && state.selectedId === server.id,
      }),
    ),
    languageLabel: t('app.language.label'),
    languageOptions: SUPPORTED_LOCALES.map((locale) => ({
      value: locale,
      label: t(`app.language.${locale}`),
      active: locale === state.locale,
    })),
    storeLabel: t('app.sidebar.storeLabel'),
    storePath: state.storePath,
  };
}

function presentMain(state: AppState, t: Translator): MainViewModel {
  if (state.phase.status === 'composing' || state.phase.status === 'submitting') {
    const compose = state.phase.compose;
    const submitting = state.phase.status === 'submitting';
    return {
      kind: 'compose',
      heading:
        compose.target.kind === 'create'
          ? t('main.create.heading')
          : t('main.edit.heading', { name: compose.target.originalName }),
      form: presentEditorForm(compose, submitting, t),
    };
  }

  const server = selectedServer(state);
  if (server !== null) {
    return { kind: 'detail', detail: presentDetail(state, server, t) };
  }

  return {
    kind: 'empty',
    icon: EMPTY_STATE_ICON,
    title: t('main.empty.title'),
    body: t('main.empty.body'),
  };
}

function presentEditorForm(
  compose: ComposeContext,
  submitting: boolean,
  t: Translator,
): EditorFormViewModel {
  const draft = compose.draft;
  const validation = validateDraft(draft);
  const transportTabs: TabsViewModel = {
    className: 'transport-tabs',
    ariaLabelledBy: FIELD_IDS.transport,
    items: (['stdio', 'http', 'sse'] as const).map((value) => ({
      value,
      label: value,
      active: draft.transport === value,
    })),
  };

  return {
    transport: {
      labelId: FIELD_IDS.transport,
      label: t('form.transport.label'),
      hint: t('form.transport.hint'),
      tabs: transportTabs,
    },
    name: {
      id: FIELD_IDS.name,
      field: 'name',
      label: t('form.name.label'),
      hint: t('form.name.hint'),
      value: draft.name,
      placeholder: 'chrome-devtools',
      inputType: 'text',
      required: true,
      disabled: submitting,
      modifier: null,
    },
    scope: {
      id: FIELD_IDS.scope,
      field: 'scope',
      label: t('form.scope.label'),
      hint: t('form.scope.hint'),
      value: draft.scope,
      options: (['local', 'project', 'user'] as const).map((value) => ({
        value,
        label: t(`form.scope.${value}`),
      })),
      disabled: submitting,
      modifier: 'field-scope',
    },
    description: {
      id: FIELD_IDS.description,
      field: 'description',
      label: t('form.description.label'),
      value: draft.description,
      placeholder: t('form.description.placeholder'),
      disabled: submitting,
    },
    stdio:
      draft.transport === 'stdio'
        ? {
            command: {
              id: FIELD_IDS.command,
              field: 'command',
              label: t('form.command.label'),
              hint: null,
              value: draft.command,
              placeholder: 'npx',
              inputType: 'text',
              required: true,
              disabled: submitting,
              modifier: 'field-command',
            },
            args: presentArgList(draft, submitting, t),
            env: presentKeyValueList(
              draft.env,
              { id: 'field-env', label: t('form.env.label'), hint: t('form.env.hint') },
              submitting,
              t,
            ),
          }
        : null,
    remote:
      draft.transport === 'stdio'
        ? null
        : {
            url: {
              id: FIELD_IDS.url,
              field: 'url',
              label: t('form.url.label'),
              hint: draft.transport === 'http' ? t('form.url.hint.http') : t('form.url.hint.sse'),
              value: draft.url,
              placeholder: 'https://',
              inputType: 'url',
              required: true,
              disabled: submitting,
              modifier: null,
            },
            headers: presentKeyValueList(
              draft.headers,
              { id: 'field-headers', label: t('form.headers.label'), hint: t('form.headers.hint') },
              submitting,
              t,
            ),
          },
    errorMessage: compose.error,
    validationMessage: validation.ok ? null : t(validation.messageKey),
    submitLabel:
      compose.target.kind === 'create' ? t('form.submit.create') : t('form.submit.update'),
    cancelLabel: t('form.cancel'),
    submitDisabled: !validation.ok || submitting,
    cancelDisabled: submitting,
  };
}

function presentArgList(draft: Draft, submitting: boolean, t: Translator): ArgListViewModel {
  return {
    labelId: 'field-args',
    label: t('form.args.label'),
    hint: t('form.args.hint'),
    addLabel: t('form.args.add'),
    removeLabel: t('form.kv.remove'),
    disabled: submitting,
    rows: draft.args.map((row, index) => {
      const name = t('form.args.placeholder', { index: index + 1 });
      return { id: row.id, value: row.value, placeholder: name, ariaLabel: name };
    }),
  };
}

function presentKeyValueList(
  rows: readonly { id: string; key: string; value: string }[],
  labels: { id: string; label: string; hint: string },
  submitting: boolean,
  t: Translator,
): KeyValueListViewModel {
  return {
    labelId: labels.id,
    label: labels.label,
    hint: labels.hint,
    addLabel: t('form.kv.add'),
    removeLabel: t('form.kv.remove'),
    keyPlaceholder: 'KEY',
    valuePlaceholder: 'VALUE',
    disabled: submitting,
    rows: rows.map((row, index) => ({
      id: row.id,
      key: row.key,
      value: row.value,
      keyLabel: t('form.kv.keyLabel', { group: labels.label, index: index + 1 }),
      valueLabel: t('form.kv.valueLabel', { group: labels.label, index: index + 1 }),
    })),
  };
}

function presentDetail(state: AppState, server: McpServer, t: Translator): DetailViewModel {
  const descriptor = FORMAT_DESCRIPTORS.find((d) => d.id === state.activeFormat);
  return {
    serverId: server.id,
    name: server.name,
    transport: server.transport,
    transportTagClass: transportTagClass(server.transport),
    scopeLabel: t('detail.scope', { scope: server.scope }),
    meta: presentMeta(server, t),
    description: server.description.length > 0 ? server.description : null,
    editLabel: t('detail.button.edit'),
    removeLabel: t('detail.button.remove'),
    tabs: {
      className: 'format-tabs',
      ariaLabelledBy: null,
      items: FORMAT_DESCRIPTORS.map((d) => ({
        value: d.id,
        label: t(d.titleKey),
        active: d.id === state.activeFormat,
      })),
    },
    subtitle: descriptor === undefined ? null : t(descriptor.subtitleKey),
    code: {
      text: formatServer(state.activeFormat, server, state.locale),
      copyLabel: state.copied ? t('copy.copied') : t('copy.button'),
      copied: state.copied,
    },
  };
}

function presentMeta(server: McpServer, t: Translator): readonly MetaItemViewModel[] {
  if (server.transport === 'stdio') {
    const items: MetaItemViewModel[] = [
      { id: 'command', label: t('detail.command'), code: server.command },
    ];
    if (server.args.length > 0) {
      items.push({ id: 'args', label: t('detail.args'), code: server.args.join(' ') });
    }
    const envCount = Object.keys(server.env).length;
    if (envCount > 0) {
      items.push({ id: 'env', label: t('detail.envCount', { count: envCount }), code: null });
    }
    return items;
  }
  const items: MetaItemViewModel[] = [{ id: 'url', label: t('detail.url'), code: server.url }];
  const headerCount = Object.keys(server.headers).length;
  if (headerCount > 0) {
    items.push({
      id: 'headers',
      label: t('detail.headersCount', { count: headerCount }),
      code: null,
    });
  }
  return items;
}

function presentToast(state: AppState): ToastViewModel | null {
  if (state.toast === null) return null;
  return { message: state.toast.message, className: `toast ${state.toast.kind}` };
}

function presentDialog(state: AppState, t: Translator): ConfirmDialogViewModel | null {
  if (state.phase.status !== 'confirming' && state.phase.status !== 'removing') return null;
  return {
    title: t('dialog.remove.title'),
    message: t('app.confirm.remove', { name: state.phase.pending.name }),
    acceptLabel: t('detail.button.remove'),
    cancelLabel: t('form.cancel'),
    busy: state.phase.status === 'removing',
  };
}
