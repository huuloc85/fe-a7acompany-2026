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
  async function submit() {
    if (pending.current || disabled || draft === null) return;
    if (draft === inputValue) {
      setEditing(false);
      return;
    }
    pending.current = true;
    setSaving(true);
    try {
      if (await save(draft)) setEditing(false);
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
    onBlur: () => {
      if (!pending.current) setEditing(false);
    }
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
        onChange={setDraft}
        formatter={(number, info) =>
          info.userTyping
            ? info.input
            : number == null
              ? ''
              : Number(number).toLocaleString('vi-VN')
        }
        parser={(input) =>
          Number((input ?? '').replace(/\./g, '').replace(',', '.'))
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
        setDraft(inputValue);
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
