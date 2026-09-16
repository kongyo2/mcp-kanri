import { useEmit } from '../mvp/react';
import type { ConfirmDialogViewModel } from '../presenter/types';

interface Props {
  readonly vm: ConfirmDialogViewModel;
}

const TITLE_ID = 'confirm-dialog-title';

function containFocus(event: React.KeyboardEvent<HTMLDivElement>): void {
  const focusable = event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled])');
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (first === undefined || last === undefined) {
    event.preventDefault();
    return;
  }
  const active = event.currentTarget.ownerDocument.activeElement;
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

export function ConfirmDialogView({ vm }: Props): JSX.Element {
  const emit = useEmit();
  return (
    <div className="modal-overlay">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            emit({ scope: 'local', type: 'dialog/dismissed' });
            return;
          }
          if (event.key === 'Tab') containFocus(event);
        }}
      >
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
            autoFocus
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
