import { TableProps } from 'antd';
import {
  DEFAULT_PAGE_SIZE_OPTIONS,
  defaultPaginationShowTotal
} from './PaginationProps.custom';

export const customTableProps: TableProps = {
  className: 'ui-data-table',
  bordered: true,
  size: 'small',
  scroll: {
    x: 'max-content',
    scrollToFirstRowOnChange: false // Fix lỗi scroll to top khi chuyển trang
  },
  tableLayout: 'auto',
  pagination: {
    size: 'default',
    showSizeChanger: true,
    pageSizeOptions: DEFAULT_PAGE_SIZE_OPTIONS,
    showTotal: defaultPaginationShowTotal,
    position: ['bottomRight']
  }
};
