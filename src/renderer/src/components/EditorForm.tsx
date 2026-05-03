import { useEffect, useId, useMemo, useState } from 'react';
import {
  McpServerInputSchema,
  type McpServer,
  type McpServerInput,
  type Scope,
  type Transport,
} from '../../../shared/schema';
import { KeyValueEditor, recordToRows, rowsToRecord, type KeyValueRow } from './KeyValueEditor';
import { ArgListEditor, stringsToArgRows, argRowsToStrings, type ArgRow } from './ArgListEditor';
import { useI18n } from '../i18n';

interface Props {
  readonly initial?: McpServer;
  readonly onCancel: () => void;
  readonly onSubmit: (input: McpServerInput) => Promise<void>;
}

interface DraftState {
  transport: Transport;
  name: string;
  description: string;
  scope: Scope;
  command: string;
  args: ArgRow[];
  envRows: KeyValueRow[];
  url: string;
  headerRows: KeyValueRow[];
}

function buildInitialDraft(initial?: McpServer): DraftState {
  if (initial === undefined) {
    return {
      transport: 'stdio',
      name: '',
      description: '',
      scope: 'user',
      command: 'npx',
      args: stringsToArgRows(['-y']),
      envRows: [],
      url: '',
      headerRows: [],
    };
  }
  if (initial.transport === 'stdio') {
    return {
      transport: 'stdio',
      name: initial.name,
      description: initial.description ?? '',
      scope: initial.scope,
      command: initial.command,
      args: stringsToArgRows(initial.args),
      envRows: recordToRows(initial.env),
      url: '',
      headerRows: [],
    };
  }
  return {
    transport: initial.transport,
    name: initial.name,
    description: initial.description ?? '',
    scope: initial.scope,
    command: 'npx',
    args: [],
    envRows: [],
    url: initial.url,
    headerRows: recordToRows(initial.headers),
  };
}

function buildInput(draft: DraftState): McpServerInput {
  const base = {
    name: draft.name.trim(),
    description: draft.description,
    scope: draft.scope,
  };
  if (draft.transport === 'stdio') {
    return {
      ...base,
      transport: 'stdio' as const,
      command: draft.command.trim(),
      args: argRowsToStrings(draft.args).filter((a) => a.length > 0),
      env: rowsToRecord(draft.envRows),
    };
  }
  return {
    ...base,
    transport: draft.transport,
    url: draft.url.trim(),
    headers: rowsToRecord(draft.headerRows),
  };
}

export function EditorForm({ initial, onCancel, onSubmit }: Props): JSX.Element {
  const { t } = useI18n();
  const [draft, setDraft] = useState<DraftState>(() => buildInitialDraft(initial));
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const transportId = useId();
  const nameId = useId();
  const scopeId = useId();
  const descriptionId = useId();
  const commandId = useId();
  const urlId = useId();

  useEffect(() => {
    setDraft(buildInitialDraft(initial));
  }, [initial]);

  const validation = useMemo(() => McpServerInputSchema.safeParse(buildInput(draft)), [draft]);
  const isValid = validation.success;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(buildInput(draft));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  // schema.ts は message に i18n キー (例: `validation.nameRequired`) を埋め込んでいる。
  // 対応するキーがあれば翻訳し、無ければそのまま表示する。
  const validationMessage =
    !isValid && validation.error.issues[0] !== undefined
      ? t(validation.error.issues[0].message)
      : null;

  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
    >
      <div className="field">
        <span id={transportId} className="field-label">
          {t('form.transport.label')}
        </span>
        <span className="hint">{t('form.transport.hint')}</span>
        <div className="transport-tabs" role="tablist" aria-labelledby={transportId}>
          {(['stdio', 'http', 'sse'] as const).map((tr) => (
            <button
              key={tr}
              type="button"
              role="tab"
              aria-selected={draft.transport === tr}
              className={draft.transport === tr ? 'is-active' : ''}
              onClick={() => setDraft({ ...draft, transport: tr })}
            >
              {tr}
            </button>
          ))}
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor={nameId}>{t('form.name.label')}</label>
          <span className="hint">{t('form.name.hint')}</span>
          <input
            id={nameId}
            type="text"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="chrome-devtools"
            required
          />
        </div>
        <div className="field" style={{ maxWidth: 220 }}>
          <label htmlFor={scopeId}>{t('form.scope.label')}</label>
          <span className="hint">{t('form.scope.hint')}</span>
          <select
            id={scopeId}
            value={draft.scope}
            onChange={(e) => setDraft({ ...draft, scope: e.target.value as Scope })}
          >
            <option value="local">{t('form.scope.local')}</option>
            <option value="project">{t('form.scope.project')}</option>
            <option value="user">{t('form.scope.user')}</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor={descriptionId}>{t('form.description.label')}</label>
        <textarea
          id={descriptionId}
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          placeholder={t('form.description.placeholder')}
        />
      </div>

      {draft.transport === 'stdio' ? (
        <>
          <div className="field-row">
            <div className="field" style={{ flex: '0 0 220px' }}>
              <label htmlFor={commandId}>{t('form.command.label')}</label>
              <input
                id={commandId}
                type="text"
                value={draft.command}
                onChange={(e) => setDraft({ ...draft, command: e.target.value })}
                placeholder="npx"
                required
              />
            </div>
          </div>
          <ArgListEditor
            label={t('form.args.label')}
            hint={t('form.args.hint')}
            value={draft.args}
            onChange={(next) => setDraft({ ...draft, args: next })}
          />
          <KeyValueEditor
            label={t('form.env.label')}
            hint={t('form.env.hint')}
            rows={draft.envRows}
            onChange={(next) => setDraft({ ...draft, envRows: next })}
          />
        </>
      ) : (
        <>
          <div className="field">
            <label htmlFor={urlId}>{t('form.url.label')}</label>
            <span className="hint">
              {draft.transport === 'http' ? t('form.url.hint.http') : t('form.url.hint.sse')}
            </span>
            <input
              id={urlId}
              type="url"
              value={draft.url}
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
              placeholder="https://"
              required
            />
          </div>
          <KeyValueEditor
            label={t('form.headers.label')}
            hint={t('form.headers.hint')}
            rows={draft.headerRows}
            onChange={(next) => setDraft({ ...draft, headerRows: next })}
          />
        </>
      )}

      {error !== null ? (
        <div className="hint" style={{ color: 'var(--danger)' }}>
          {error}
        </div>
      ) : null}
      {validationMessage !== null ? (
        <div className="hint" style={{ color: 'var(--warning)' }}>
          {validationMessage}
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="btn btn-primary" disabled={!isValid || submitting}>
          {initial !== undefined ? t('form.submit.update') : t('form.submit.create')}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={submitting}>
          {t('form.cancel')}
        </button>
      </div>
    </form>
  );
}
