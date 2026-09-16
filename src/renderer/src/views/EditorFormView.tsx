import { useEmit } from '../mvp/react';
import type { EditorFormViewModel } from '../presenter/types';
import { ArgListView } from './ArgListView';
import { SelectFieldView, TextAreaFieldView, TextFieldView } from './FieldViews';
import { KeyValueListView } from './KeyValueListView';
import { RowsNode, TabsNode } from './nodes';
import { TabsView } from './TabsView';

interface Props {
  readonly vm: EditorFormViewModel;
}

export function EditorFormView({ vm }: Props): JSX.Element {
  const emit = useEmit();
  return (
    <form
      className="form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        emit({ scope: 'local', type: 'form/submitted' });
      }}
    >
      <div className="field">
        <span id={vm.transport.labelId} className="field-label">
          {vm.transport.label}
        </span>
        <span className="hint">{vm.transport.hint}</span>
        <TabsNode channel="transport">
          <TabsView vm={vm.transport.tabs} />
        </TabsNode>
      </div>

      <div className="field-row">
        <TextFieldView vm={vm.name} />
        <SelectFieldView vm={vm.scope} />
      </div>

      <TextAreaFieldView vm={vm.description} />

      {vm.stdio !== null ? (
        <>
          <div className="field-row">
            <TextFieldView vm={vm.stdio.command} />
          </div>
          <RowsNode collection="args">
            <ArgListView vm={vm.stdio.args} />
          </RowsNode>
          <RowsNode collection="env">
            <KeyValueListView vm={vm.stdio.env} />
          </RowsNode>
        </>
      ) : null}

      {vm.remote !== null ? (
        <>
          <TextFieldView vm={vm.remote.url} />
          <RowsNode collection="headers">
            <KeyValueListView vm={vm.remote.headers} />
          </RowsNode>
        </>
      ) : null}

      {vm.errorMessage !== null ? <div className="hint hint-error">{vm.errorMessage}</div> : null}
      {vm.validationMessage !== null ? (
        <div className="hint hint-warning">{vm.validationMessage}</div>
      ) : null}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={vm.submitDisabled}>
          {vm.submitLabel}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={vm.cancelDisabled}
          onClick={() => {
            emit({ scope: 'local', type: 'form/cancelled' });
          }}
        >
          {vm.cancelLabel}
        </button>
      </div>
    </form>
  );
}
