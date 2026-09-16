import { useEmit } from '../mvp/react';
import type { TabsViewModel } from '../presenter/types';

interface Props {
  readonly vm: TabsViewModel;
}

export function TabsView({ vm }: Props): JSX.Element {
  const emit = useEmit();
  return (
    <div className={vm.className} role="tablist" aria-labelledby={vm.ariaLabelledBy ?? undefined}>
      {vm.items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={item.active}
          className={item.active ? 'is-active' : ''}
          onClick={() => {
            emit({ scope: 'local', type: 'tab/selected', value: item.value });
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
