import type { ToastViewModel } from '../presenter/types';

interface Props {
  readonly vm: ToastViewModel;
}

export function ToastView({ vm }: Props): JSX.Element {
  return (
    <div className={vm.className} role="status">
      {vm.message}
    </div>
  );
}
