import AppSearchInput from '@/components/common/AppSearchInput';
import React, { useId } from 'react';
import { Row, Col, Select } from 'antd';
import Button from '@components/common/AppButton';
import { ClearOutlined } from '@ant-design/icons';
import {
  type RequestFormFilters as RequestFormFiltersType,
  REQUEST_FORM_TYPES,
  REQUEST_FORM_STATUSES
} from '@/types/requestFormType';

const { Option } = Select;

interface RequestFormFiltersProps {
  filters: RequestFormFiltersType;
  onFiltersChange: (filters: RequestFormFiltersType) => void;
  onClearFilters: () => void;
  isAdmin?: boolean;
  searchText?: string;
  onSearchTextChange?: (value: string) => void;
}

export const FilterPanel: React.FC<RequestFormFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  searchText = '',
  onSearchTextChange
}) => {
  const filterId = useId();
  const handleFilterChange = (
    key: keyof RequestFormFiltersType,
    value: unknown
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value,
      page: 1
    });
  };

  const handleClearAll = () => {
    onSearchTextChange?.('');
    onClearFilters();
  };

  return (
    <div>
      <Row gutter={[12, 12]} align="middle" justify="start">
        {onSearchTextChange && (
          <Col xs={12} sm={8} md={6}>
            <div className="space-y-1">
              <label
                htmlFor={`${filterId}-search`}
                className="text-xs font-medium text-gray-700 sm:text-sm dark:text-gray-300"
              >
                Tìm nhân viên
              </label>
              <AppSearchInput
                id={`${filterId}-search`}
                placeholder="Nhập tên hoặc MSNV"
                value={searchText}
                onChange={(e) => onSearchTextChange(e.target.value)}
                className="w-full"
              />
            </div>
          </Col>
        )}

        <Col xs={12} sm={8} md={5}>
          <div className="space-y-1">
            <label
              htmlFor={`${filterId}-type`}
              className="text-xs font-medium text-gray-700 sm:text-sm dark:text-gray-300"
            >
              Loại đơn
            </label>
            <Select
              id={`${filterId}-type`}
              placeholder="Chọn loại đơn"
              allowClear
              value={filters.type}
              onChange={(value) => handleFilterChange('type', value)}
              className="w-full"
              size="middle"
            >
              {Object.entries(REQUEST_FORM_TYPES).map(([key, label]) => (
                <Option key={key} value={key}>
                  {label}
                </Option>
              ))}
            </Select>
          </div>
        </Col>

        <Col xs={12} sm={8} md={6}>
          <div className="space-y-1">
            <label
              htmlFor={`${filterId}-status`}
              className="text-xs font-medium text-gray-700 sm:text-sm dark:text-gray-300"
            >
              Trạng thái
            </label>
            <Select
              placeholder="Chọn trạng thái"
              id={`${filterId}-status`}
              allowClear
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              className="w-full"
              size="middle"
            >
              {Object.entries(REQUEST_FORM_STATUSES).map(([key, label]) => (
                <Option key={key} value={key}>
                  {label}
                </Option>
              ))}
            </Select>
          </div>
        </Col>

        <Col xs={24} sm={8} md={4}>
          <Button
            tone="inherit"
            type="default"
            icon={<ClearOutlined />}
            onClick={handleClearAll}
            className="w-full sm:mt-5"
            size="middle"
          >
            Xóa lọc
          </Button>
        </Col>
      </Row>
    </div>
  );
};
