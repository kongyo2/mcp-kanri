import { useEmit } from '../mvp/react';
import type {
  SelectFieldViewModel,
  TextAreaFieldViewModel,
  TextFieldViewModel,
} from '../presenter/types';

function fieldClassName(modifier: string | null): string {
  return modifier === null ? 'field' : `field ${modifier}`;
}

export function TextFieldView({ vm }: { readonly vm: TextFieldViewModel }): JSX.Element {
  const emit = useEmit();
  return (
    <div className={fieldClassName(vm.modifier)}>
      <label htmlFor={vm.id}>{vm.label}</label>
      {vm.hint !== null ? <span className="hint">{vm.hint}</span> : null}
      <input
        id={vm.id}
        type={vm.inputType}
        value={vm.value}
        placeholder={vm.placeholder}
        required={vm.required}
        disabled={vm.disabled}
        onChange={(event) => {
          emit({
            scope: 'local',
            type: 'field/changed',
            field: vm.field,
            value: event.target.value,
          });
        }}
      />
    </div>
  );
}

export function TextAreaFieldView({ vm }: { readonly vm: TextAreaFieldViewModel }): JSX.Element {
  const emit = useEmit();
  return (
    <div className="field">
      <label htmlFor={vm.id}>{vm.label}</label>
      <textarea
        id={vm.id}
        value={vm.value}
        placeholder={vm.placeholder}
        disabled={vm.disabled}
        onChange={(event) => {
          emit({
            scope: 'local',
            type: 'field/changed',
            field: vm.field,
            value: event.target.value,
          });
        }}
      />
    </div>
  );
}

export function SelectFieldView({ vm }: { readonly vm: SelectFieldViewModel }): JSX.Element {
  const emit = useEmit();
  return (
    <div className={fieldClassName(vm.modifier)}>
      <label htmlFor={vm.id}>{vm.label}</label>
      {vm.hint !== null ? <span className="hint">{vm.hint}</span> : null}
      <select
        id={vm.id}
        value={vm.value}
        disabled={vm.disabled}
        onChange={(event) => {
          emit({
            scope: 'local',
            type: 'field/changed',
            field: vm.field,
            value: event.target.value,
          });
        }}
      >
        {vm.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
