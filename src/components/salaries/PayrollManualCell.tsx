import { useRef, useState } from 'react';
import { Input, InputNumber } from 'antd';

export default function PayrollManualCell({
  value,
  inputValue = value,
  label,
  disabled,
  text = false,
  fractional = false,
  max = 1e12,
  save
}: {
  value: string | number;
  label: string;
  disabled: boolean;
  text?: boolean;
  inputValue?: string | number;
  fractional?: boolean;
  max?: number;
  save: (value: string | number) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string | number | null>(value);
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const numericInput = useRef<string | null>(null);
  async function submit() {
    if (pending.current || disabled) return;
    const nextValue: string | number =
      !text && numericInput.current?.trim() === ''
        ? 0
        : draft === null
          ? text
            ? ''
            : 0
          : draft;
    if (nextValue === inputValue || (nextValue === '' && inputValue === null)) {
      setEditing(false);
      return;
    }
    pending.current = true;
    setSaving(true);
    try {
      if (await save(nextValue)) setEditing(false);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }
  const common = {
    autoFocus: true,
    'aria-label': label,
    disabled: disabled || saving,
    className: 'vvp-inline-edit-input',
    style: { width: '100%' },
    onPressEnter: () => void submit(),
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === 'Escape' && !pending.current) setEditing(false);
    },
    onBlur: () => void submit()
  };
  if (editing)
    return text ? (
      <Input
        {...common}
        value={String(draft ?? '')}
        maxLength={2000}
        onChange={(event) => setDraft(event.target.value)}
      />
    ) : (
      <InputNumber<number>
        {...common}
        value={typeof draft === 'number' ? draft : null}
        min={0}
        max={max}
        precision={fractional ? 2 : 0}
        step={fractional ? 0.5 : 1000}
        decimalSeparator=","
        onInput={(input) => {
          numericInput.current = input;
        }}
        onChange={setDraft}
        formatter={(number, info) => {
          if (info.userTyping) {
            const [integer, decimal] = info.input.replace(/\./g, '').split(',');
            const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            return decimal === undefined ? grouped : `${grouped},${decimal}`;
          }
          return number == null || String(number) === ''
            ? ''
            : Number(number).toLocaleString('vi-VN');
        }}
        parser={(input) =>
          input?.trim()
            ? Number(input.replace(/\./g, '').replace(',', '.'))
            : NaN
        }
      />
    );
  return (
    <button
      type="button"
      className="vvp-inline-edit-cell"
      disabled={disabled}
      aria-label={label}
      title="Bấm để sửa · Enter lưu · Esc huỷ"
      onClick={() => {
        numericInput.current = null;
        setDraft(
          text
            ? inputValue
            : Number(inputValue) === 0
              ? null
              : Number(inputValue)
        );
        setEditing(true);
      }}
    >
      {typeof value === 'number'
        ? value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })
        : value || '—'}{' '}
      <span aria-hidden>✎</span>
    </button>
  );
}
