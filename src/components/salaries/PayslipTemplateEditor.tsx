import {
  defaultPayslipTemplate,
  PayslipAccent,
  PayslipTemplate,
  resetPayslipTemplate,
  savePayslipTemplate,
  usePayslipTemplate
} from '@components/salaries/payslipTemplate';
import { Input, Select, Switch } from 'antd';
import Button from '@components/common/AppButton';
import { useEffect, useState } from 'react';
import { FaUndo, FaSave } from 'react-icons/fa';

const accentOptions: { label: string; value: PayslipAccent }[] = [
  { label: 'Xanh dương', value: 'blue' },
  { label: 'Xanh lá', value: 'emerald' },
  { label: 'Xám', value: 'slate' },
  { label: 'Hồng', value: 'rose' }
];

const sectionOptions: {
  key: keyof PayslipTemplate['sections'];
  label: string;
}[] = [
  { key: 'header', label: 'Tiêu đề kỳ lương' },
  { key: 'employeeInfo', label: 'Thông tin nhân viên' },
  { key: 'attendanceComparison', label: 'Tổng kết chấm công' },
  { key: 'income', label: 'Các khoản lương' },
  { key: 'deductions', label: 'Các khoản trừ' },
  { key: 'companyCost', label: 'Tổng chi công ty' },
  { key: 'netPay', label: 'Thực nhận' },
  { key: 'notes', label: 'Ghi chú' }
];

export function PayslipTemplateEditor() {
  const savedTemplate = usePayslipTemplate();
  const [draftTemplate, setDraftTemplate] =
    useState<PayslipTemplate>(savedTemplate);

  useEffect(() => {
    setDraftTemplate(savedTemplate);
  }, [savedTemplate]);

  const updateSection = (
    key: keyof PayslipTemplate['sections'],
    checked: boolean
  ) => {
    setDraftTemplate((current) => ({
      ...current,
      sections: {
        ...current.sections,
        [key]: checked
      }
    }));
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white/80 p-4 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_140px]">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Tiêu đề phiếu
          </span>
          <Input
            value={draftTemplate.title}
            onChange={(event) =>
              setDraftTemplate((current) => ({
                ...current,
                title: event.target.value
              }))
            }
            placeholder={defaultPayslipTemplate.title}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Màu nhấn
          </span>
          <Select
            value={draftTemplate.accent}
            options={accentOptions}
            onChange={(accent) =>
              setDraftTemplate((current) => ({ ...current, accent }))
            }
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Kiểu gọn
          </span>
          <Switch
            checked={draftTemplate.compact}
            checkedChildren="Bật"
            unCheckedChildren="Tắt"
            onChange={(compact) =>
              setDraftTemplate((current) => ({ ...current, compact }))
            }
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {sectionOptions.map((section) => (
          <div
            key={section.key}
            className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/40"
          >
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {section.label}
            </span>
            <Switch
              size="small"
              checked={draftTemplate.sections[section.key]}
              onChange={(checked) => updateSection(section.key, checked)}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button tone="inherit" icon={<FaUndo />} onClick={resetPayslipTemplate}>
          Mặc định
        </Button>
        <Button
          tone="inherit"
          type="primary"
          icon={<FaSave />}
          onClick={() => savePayslipTemplate(draftTemplate)}
        >
          Lưu giao diện
        </Button>
      </div>
    </div>
  );
}
