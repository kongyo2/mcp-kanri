import { useEmit } from '../mvp/react';
import type { ConfirmDialogViewModel } from '../presenter/types';

interface Props {
  readonly vm: ConfirmDialogViewModel;
}

const TITLE_ID = 'confirm-dialog-title';

export function ConfirmDialogView({ vm }: Props): JSX.Element {
  const emit = useEmit();
  return (
    <div className="modal-overlay">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={TITLE_ID}>
        <h2 id={TITLE_ID} className="modal-title">
          {vm.title}
        </h2>
        <p className="modal-message">{vm.message}</p>
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-danger"
            disabled={vm.busy}
            onClick={() => {
              emit({ scope: 'local', type: 'dialog/accepted' });
            }}
          >
            {vm.acceptLabel}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={vm.busy}
            onClick={() => {
              emit({ scope: 'local', type: 'dialog/dismissed' });
            }}
          >
            {vm.cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
