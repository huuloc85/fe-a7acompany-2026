import React from 'react';
import { Select, Tag } from 'antd';
import Button from '@components/common/AppButton';
import { SearchOutlined } from '@ant-design/icons';

export interface ResearchStockResult {
  productName: string;
  productCode: string;
  lot: string;
  quantity: number;
  bins: number[];
}

interface ResearchStockPanelProps {
  productOptions: Array<{ value: number; label: string }>;
  lotOptions: Array<{ value: string; label: string }>;
  productId?: number;
  lotValue?: string;
  loading: boolean;
  lotLoading?: boolean;
  result: ResearchStockResult | null;
  onProductChange: (value: number) => void;
  onLotChange: (value: string) => void;
  onSubmit: () => void;
}

const ResearchStockPanel: React.FC<ResearchStockPanelProps> = ({
  productOptions,
  lotOptions,
  productId,
  lotValue,
  loading,
  lotLoading = false,
  result,
  onProductChange,
  onLotChange,
  onSubmit
}) => {
  const formatNumber = (value: number) =>
    Number(value || 0).toLocaleString('vi-VN');

  const productName =
    result?.productName && result?.productCode
      ? result.productName.replace(
          new RegExp(`\\s*\\(${result.productCode}\\)\\s*$`),
          ''
        )
      : result?.productName || '';

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-2.5 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
          <SearchOutlined />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-800">
            Tìm kiếm số liệu kho theo Mã + Lot
          </h4>
          <p className="text-xs text-slate-500">
            Chọn lot trong danh sách đang có để tìm nhanh hơn
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
        <Select
          placeholder="Chọn sản phẩm"
          size="large"
          className="sm:col-span-4"
          value={productId}
          options={productOptions}
          onChange={onProductChange}
          showSearch
          filterOption={(input, option) =>
            String(option?.label || '')
              .toLowerCase()
              .includes(input.toLowerCase())
          }
        />
        <Select
          size="large"
          placeholder={
            productId
              ? 'Chọn LOT đang có (có thể gõ để lọc)'
              : 'Chọn sản phẩm trước'
          }
          className="sm:col-span-6"
          value={lotValue}
          options={lotOptions}
          onChange={onLotChange}
          loading={lotLoading}
          disabled={!productId}
          showSearch
          filterOption={(input, option) =>
            String(option?.label || '')
              .toLowerCase()
              .includes(input.toLowerCase())
          }
        />
        <Button
          tone="inherit"
          type="primary"
          size="large"
          loading={loading}
          onClick={onSubmit}
          className="sm:col-span-2"
        >
          Tìm kiếm
        </Button>
      </div>

      {result && (
        <div className="mt-3 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-slate-50 p-3">
          <div className="text-sm font-semibold text-slate-800">
            {productName}
            {result.productCode ? ` (${result.productCode})` : ''}
          </div>
          <div className="mt-0.5 text-xs text-slate-600">
            Lot <strong>{result.lot}</strong>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
              <div className="text-[11px] text-slate-500">Tồn hiện tại</div>
              <div className="text-base font-semibold text-slate-800">
                {formatNumber(result.quantity)}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
              <div className="text-[11px] text-slate-500">Thùng còn</div>
              <div className="text-base font-semibold text-slate-800">
                {formatNumber(result.bins.length)}
              </div>
            </div>
          </div>
          <div className="mt-2 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
            {result.bins.length > 0 ? (
              result.bins.map((bin) => (
                <Tag key={bin} color="blue">
                  Thùng {bin}
                </Tag>
              ))
            ) : (
              <span className="text-xs font-medium text-emerald-600">
                Không còn thùng tồn cho lot này.
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default ResearchStockPanel;
