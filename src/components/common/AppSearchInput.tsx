import { SearchOutlined } from '@ant-design/icons';
import { Input, type InputProps } from 'antd';

export default function AppSearchInput({
  className = '',
  placeholder = 'Tìm kiếm...',
  ...props
}: InputProps) {
  return (
    <Input
      aria-label={placeholder}
      {...props}
      placeholder={placeholder}
      className={`app-search-input ${className}`}
      size="middle"
      prefix={<SearchOutlined aria-hidden className="text-gray-400" />}
      suffix={null}
      allowClear
    />
  );
}
