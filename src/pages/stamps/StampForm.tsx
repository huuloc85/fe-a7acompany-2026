import {
  Button,
  DatePicker,
  Form,
  FormProps,
  Input,
  InputNumber,
  Select,
  Tag
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import {
  FaStamp,
  FaCalendarAlt,
  FaExchangeAlt,
  FaBullseye,
  FaHashtag,
  FaPlayCircle,
  FaBoxOpen
} from 'react-icons/fa';
import { FaPrint, FaRotateRight, FaClockRotateLeft } from 'react-icons/fa6';

import { ProductType } from '@/types/productType';
import { Shift } from '@/types/shift';
import AppButton from '@components/common/AppButton';
import ComponentCard from '@components/common/ComponentCard';
import { customFormProps } from '@components/custom/FormProps.custom';
import { PrintBagStamp } from '@components/print/PrintBagStamp';
import { PrintBoxStamp } from '@components/print/PrintBoxStamp';
import { ShiftEnumOptions } from '@constants/shift.enum';
import { useCrudList } from '@hooks/useCrudList';
import { productService } from '@services/ProductService';
import { useNavigate } from '@tanstack/react-router';

interface FormFields {
  date: Dayjs;
  shift: Shift;
  totalStamp: number;
  startStamp: number;
  productCode: ProductType['code'];
  purpose: 'new' | 'additional' | 'reprint';
}

export default function StampForm() {
  const [form] = Form.useForm<FormFields>();
  const [type, setType] = useState<'box' | 'bag'>('bag');
  const [stampData, setStampData] = useState<{
    product: ProductType;
    startStamp: number;
    totalStamp: number;
    shift: Shift;
    date: Dayjs;
    purpose: 'new' | 'additional' | 'reprint';
  }>();
  const [hasComma, setHasComma] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable Ctrl+P / Cmd+P
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        // Không dùng e.stopPropagation() để cho usePrintShortcut phía dưới nhận event
      }

      const tag = (e.target as HTMLElement)?.tagName;

      // Skip if user is typing in an input
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Press 1 → Tem Bịch, Press 2 → Tem Thùng
      if (e.key === '1') {
        setType('bag');
        setStampData(undefined);
        form.resetFields();
      } else if (e.key === '2') {
        setType('box');
        setStampData(undefined);
        form.resetFields();
      }

      // Enter → Submit form or Print
      if (e.key === 'Enter') {
        if (tag === 'BUTTON') return; // Allow natural button click

        e.preventDefault();
        if (stampData) {
          window.dispatchEvent(
            new KeyboardEvent('keydown', {
              key: 'p',
              ctrlKey: true,
              bubbles: true
            })
          );
        } else {
          form.submit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [form, stampData]);

  const { data: productsData } = useCrudList({
    service: productService,
    queryKey: 'products',
    initialFilters: {
      limit: 0
    }
  });

  const productOptions =
    productsData?.map((product) => ({
      value: product.code,
      label: product.name,
      searchText: `${product.code} ${product.name}`.toLowerCase()
    })) || [];

  const watchedProductCode = Form.useWatch('productCode', form);
  const selectedProduct = productsData?.find(
    (product) => product.code === watchedProductCode
  );

  const formProps: FormProps<FormFields> = {
    ...customFormProps,
    form: form,
    onFinish: (values) => {
      // Auto calculate totalStamp if hasComma
      const finalTotalStamp = hasComma
        ? values.startStamp.toString().split(',').length
        : values.totalStamp;

      setStampData({
        product: productsData.find(
          (product) => product.code === values.productCode
        )!,
        startStamp: values.startStamp,
        totalStamp: finalTotalStamp,
        shift: values.shift,
        date: values.date,
        purpose: values.purpose
      });

      // Scroll to preview section after a short delay to ensure it's rendered
      setTimeout(() => {
        if (previewRef.current) {
          previewRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
          previewRef.current.focus({ preventScroll: true });
        }
      }, 100);
    },
    onReset: () => {
      setStampData(undefined);
    }
  };

  return (
    <>
      <ComponentCard
        title={
          <div className="flex items-center gap-3">
            <FaStamp className="text-indigo-500" />
            <span>Tạo Tem</span>
          </div>
        }
      >
        <div className="space-y-5">
          {/* ── Action Bar ─────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
            <AppButton
              tone="warning"
              tabIndex={-1}
              onClick={() => navigate({ to: '/stamps/history' })}
            >
              <FaClockRotateLeft />
              Xem Lịch Sử In Tem
            </AppButton>

            <div className="ml-auto flex min-w-[min(100%,24rem)] items-center gap-2">
              {/* ── Stamp Type Selector ── */}
              <div className="stamp-type-selector grid w-full grid-cols-2 gap-2 rounded-2xl border border-white/70 bg-white/55 p-1.5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-900/45">
                <button
                  tabIndex={-1}
                  type="button"
                  aria-pressed={type === 'bag'}
                  onClick={() => {
                    setType('bag');
                    setStampData(undefined);
                    form.resetFields();
                  }}
                  className={`stamp-type-option stamp-type-option--bag rounded-xl border p-3 text-left transition-all ${
                    type === 'bag' ? 'is-selected' : ''
                  }`}
                >
                  <span className="stamp-type-check" aria-hidden="true" />
                  <span className="stamp-type-icon" aria-hidden="true">
                    <FaStamp />
                  </span>
                  <span className="stamp-type-copy">
                    <span className="stamp-type-title">Tem Bịch</span>
                    <span className="stamp-type-meta">
                      Tem nhỏ, đóng gói bịch
                    </span>
                  </span>
                </button>
                <button
                  tabIndex={-1}
                  type="button"
                  aria-pressed={type === 'box'}
                  onClick={() => {
                    setType('box');
                    setStampData(undefined);
                    form.resetFields();
                  }}
                  className={`stamp-type-option stamp-type-option--box rounded-xl border p-3 text-left transition-all ${
                    type === 'box' ? 'is-selected' : ''
                  }`}
                >
                  <span className="stamp-type-check" aria-hidden="true" />
                  <span className="stamp-type-icon" aria-hidden="true">
                    <FaBoxOpen />
                  </span>
                  <span className="stamp-type-copy">
                    <span className="stamp-type-title">Tem Thùng</span>
                    <span className="stamp-type-meta">Tem lớn, đóng thùng</span>
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Form Section ──────────────────────────────────── */}
          <div className="rounded-xl border border-gray-100 bg-white/80 p-4 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50">
            <Form<FormFields> {...formProps}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Date */}
                <div className="flex flex-col gap-1">
                  <label className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <FaCalendarAlt className="mr-1 inline-block text-blue-500" />
                    Ngày
                  </label>
                  <Form.Item<FormFields>
                    name="date"
                    rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
                    initialValue={dayjs()}
                    className="!mb-0"
                  >
                    <DatePicker
                      style={{ width: '100%' }}
                      className="!rounded-lg"
                      placeholder="Chọn ngày"
                    />
                  </Form.Item>
                  <div className="mt-1 flex gap-1.5">
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => form.setFieldValue('date', dayjs())}
                      className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-600 transition-all hover:bg-blue-100 active:scale-95 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                    >
                      Hôm nay
                    </button>
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() =>
                        form.setFieldValue('date', dayjs().subtract(1, 'day'))
                      }
                      className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[11px] font-medium text-gray-600 transition-all hover:bg-gray-100 active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                    >
                      Hôm qua
                    </button>
                  </div>
                </div>

                {/* Shift */}
                <div className="flex flex-col gap-1">
                  <label className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <FaExchangeAlt className="mr-1 inline-block text-emerald-500" />
                    Ca làm việc
                  </label>
                  <Form.Item<FormFields>
                    name="shift"
                    rules={[{ required: true, message: 'Vui lòng chọn ca' }]}
                    className="!mb-0"
                  >
                    <Select
                      options={ShiftEnumOptions}
                      placeholder="Chọn ca"
                      className="!rounded-lg"
                    />
                  </Form.Item>
                </div>

                {/* Purpose */}
                <div className="flex flex-col gap-1">
                  <label className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <FaBullseye className="mr-1 inline-block text-orange-500" />
                    Mục đích in
                  </label>
                  <Form.Item<FormFields>
                    name="purpose"
                    rules={[
                      { required: true, message: 'Vui lòng chọn mục đích in' }
                    ]}
                    initialValue="new"
                    className="!mb-0"
                  >
                    <Select
                      placeholder="Chọn mục đích in"
                      className="!rounded-lg"
                      options={[
                        { value: 'new', label: 'In mới' },
                        { value: 'additional', label: 'In thêm' },
                        { value: 'reprint', label: 'In lại' }
                      ]}
                    />
                  </Form.Item>
                </div>

                {/* Total stamp (hidden when comma mode) */}
                {!hasComma && (
                  <div className="flex flex-col gap-1">
                    <label className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                      <FaHashtag className="mr-1 inline-block text-cyan-500" />
                      Số lượng tem
                    </label>
                    <Form.Item<FormFields>
                      name="totalStamp"
                      rules={[
                        {
                          required: !hasComma,
                          message: 'Vui lòng nhập số lượng tem'
                        }
                      ]}
                      className="!mb-0"
                    >
                      <InputNumber
                        placeholder="Nhập số lượng tem"
                        style={{ width: '100%' }}
                        className="!rounded-lg"
                        min={1}
                      />
                    </Form.Item>
                  </div>
                )}

                {/* Start stamp */}
                <div className="flex flex-col gap-1">
                  <label className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <FaPlayCircle className="mr-1 inline-block text-purple-500" />
                    Tem bắt đầu
                  </label>
                  <Form.Item<FormFields>
                    name="startStamp"
                    rules={[
                      { required: true, message: 'Vui lòng nhập tem bắt đầu' },
                      {
                        pattern: /^[0-9]+(,[0-9]+)*$/,
                        message:
                          'Vui lòng nhập số tem hợp lệ (ví dụ: 1,2,3 hoặc 5)'
                      }
                    ]}
                    className="!mb-0"
                  >
                    <Input
                      placeholder="Nhập tem bắt đầu"
                      className="!rounded-lg"
                      onChange={(e) => {
                        const value = e.target.value;
                        const hasCommaInValue = value.includes(',');
                        setHasComma(hasCommaInValue);

                        // If hasComma changed, reset totalStamp field
                        if (hasCommaInValue !== hasComma) {
                          form.setFieldValue('totalStamp', undefined);
                        }
                      }}
                    />
                  </Form.Item>
                  {!hasComma && (
                    <p className="mt-1 text-[11px] leading-relaxed text-amber-600 dark:text-amber-400">
                      💡 Nếu cần in lại nhiều tem khác nhau thì nhập cách bằng
                      dấu phẩy, ví dụ: <strong>3,5</strong>
                    </p>
                  )}
                </div>

                {/* Product */}
                <div className="flex flex-col gap-1">
                  <label className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <FaBoxOpen className="mr-1 inline-block text-teal-500" />
                    Sản phẩm
                  </label>
                  <Form.Item<FormFields>
                    name="productCode"
                    rules={[
                      { required: true, message: 'Vui lòng chọn sản phẩm' }
                    ]}
                    className="!mb-0"
                  >
                    <Select
                      options={productOptions}
                      placeholder="Chọn sản phẩm"
                      showSearch
                      className="!rounded-lg"
                      optionFilterProp="searchText"
                      filterOption={(input, option) =>
                        String(option?.searchText ?? option?.label ?? '')
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      onChange={() => {
                        // Nhảy focus sang nút Submit khi chọn xong sản phẩm
                        setTimeout(() => {
                          submitBtnRef.current?.focus();
                        }, 50);
                      }}
                    />
                  </Form.Item>
                  {selectedProduct && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <Tag color="blue" className="!font-mono !text-xs">
                        {selectedProduct.code}
                      </Tag>
                      <Tag color="geekblue" className="!text-xs">
                        PSC: {selectedProduct.quantity_per_package}
                      </Tag>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Submit Actions ──────────────────────────────── */}
              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-5 dark:border-gray-700">
                <button
                  type="submit"
                  ref={submitBtnRef}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-600 hover:shadow-md active:scale-[0.97]"
                >
                  <FaPrint className="text-xs" />
                  Tạo Tem
                </button>
                <Button
                  htmlType="reset"
                  className="!rounded-lg"
                  icon={<FaRotateRight className="text-xs" />}
                >
                  Hủy
                </Button>
              </div>
            </Form>
          </div>
        </div>
      </ComponentCard>

      {/* ── Preview Section ──────────────────────────────────── */}
      {stampData && (
        <div ref={previewRef} tabIndex={-1} className="mt-4 outline-none">
          <ComponentCard title="Xem trước khi in">
            <div className="space-y-5">
              {/* Print Info Header */}
              <div
                className={`flex flex-wrap items-start justify-between gap-4 rounded-xl border p-5 ${
                  type === 'bag'
                    ? 'border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 dark:border-orange-800/60 dark:from-orange-900/20 dark:to-amber-900/10'
                    : 'border-cyan-200 bg-gradient-to-r from-cyan-50 to-sky-50 dark:border-cyan-800/60 dark:from-cyan-900/20 dark:to-sky-900/10'
                }`}
              >
                <div className="space-y-2">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                    {stampData.product.name}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag color="blue" className="!font-mono">
                      {stampData.product.code}
                    </Tag>
                    <Tag color="geekblue">
                      {stampData.date.format('DD/MM/YYYY')}
                    </Tag>
                    <Tag color="purple">Ca {stampData.shift}</Tag>
                    <Tag color="cyan">SL: {stampData.totalStamp}</Tag>
                    <Tag
                      color={type === 'bag' ? 'volcano' : 'cyan'}
                      className="!font-bold"
                    >
                      {type === 'bag' ? 'TEM BỊCH' : 'TEM THÙNG'}
                    </Tag>
                    {(() => {
                      const startStr = String(stampData.startStamp || '');
                      const count = Number(stampData.totalStamp || 1);
                      if (startStr.includes(',')) {
                        return <Tag color="green">Tem số: {startStr}</Tag>;
                      }
                      const startNum = parseInt(startStr);
                      if (!isNaN(startNum)) {
                        if (count > 1) {
                          return (
                            <Tag color="green">
                              Tem: {startNum} ➔ {startNum + count - 1}
                            </Tag>
                          );
                        }
                        return <Tag color="green">Tem số: {startNum}</Tag>;
                      }
                      return null;
                    })()}
                  </div>
                </div>
                <Button
                  color="red"
                  variant="outlined"
                  onClick={() => setStampData(undefined)}
                >
                  Đóng
                </Button>
              </div>

              {/* Stamp Preview */}
              {type === 'bag' ? (
                <PrintBagStamp
                  product={stampData.product}
                  startStamp={stampData.startStamp}
                  totalStamp={stampData.totalStamp}
                  shift={stampData.shift}
                  date={stampData.date}
                  purpose={stampData.purpose}
                />
              ) : (
                <PrintBoxStamp
                  product={stampData.product}
                  startStamp={stampData.startStamp}
                  totalStamp={stampData.totalStamp}
                  shift={stampData.shift}
                  date={stampData.date}
                  purpose={stampData.purpose}
                />
              )}
            </div>
          </ComponentCard>
        </div>
      )}
    </>
  );
}
