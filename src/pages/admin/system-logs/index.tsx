import AppSearchInput from '@/components/common/AppSearchInput';
import { useState, useEffect, useRef } from 'react';
import {
  Button,
  message,
  Popconfirm,
  Spin,
  Tabs,
  TabsProps,
  Table,
  Tag
} from 'antd';
import { filterSystemLogs } from '@/utils/systemLogs';
import { getApiErrorMessage } from '@/utils/apiError';
import type { TableColumnsType, TableProps } from 'antd';
import {
  DeleteOutlined,
  DatabaseOutlined,
  BugOutlined
} from '@ant-design/icons';
import { systemLogService } from '@/services/SystemLogService';
import RefreshButton from '@components/common/RefreshButton';
import ComponentCard from '@components/common/ComponentCard';
import { customPaginationProps } from '@components/custom/PaginationProps.custom';
import dayjs from 'dayjs';
import { useIsMobile } from '@hooks/useIsMobile';

interface DBLogItem {
  id: number;
  table: string;
  row: string;
  content: string;
  created_at: string;
}

export default function SystemLogsPage() {
  const isMobile = useIsMobile();

  // System Log States
  const [logs, setLogs] = useState<string>('');
  const [search, setSearch] = useState('');
  const [isLoadingSystem, setIsLoadingSystem] = useState<boolean>(true);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'ERROR' | 'INFO'>(
    'ALL'
  );
  const logEndRef = useRef<HTMLDivElement>(null);

  // DB Log States
  const [dbLogs, setDbLogs] = useState<DBLogItem[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState<boolean>(true);
  const [isClearingDb, setIsClearingDb] = useState<boolean>(false);

  const fetchSystemLogs = async () => {
    setIsLoadingSystem(true);
    try {
      const response = await systemLogService.getSystemLogs();
      if (response.success) {
        setLogs(response.data || '');
      } else {
        message.error(response.message || 'Lỗi khi tải log hệ thống');
      }
    } catch (error) {
      console.error(error);
      message.error(getApiErrorMessage(error, 'Lỗi khi tải log hệ thống'));
    } finally {
      setIsLoadingSystem(false);
    }
  };

  const fetchDbLogs = async () => {
    setIsLoadingDb(true);
    try {
      const response = await systemLogService.getLogs();
      if (response.success) {
        setDbLogs((response.data as DBLogItem[]) || []);
      } else {
        message.error(
          response.message || 'Lỗi khi lấy danh sách log nhập/xuất'
        );
      }
    } catch (error) {
      console.error(error);
      message.error('Lỗi khi lấy danh sách log nhập/xuất');
    } finally {
      setIsLoadingDb(false);
    }
  };

  const clearSystemLogs = async () => {
    setIsClearing(true);
    try {
      const response = await systemLogService.clearSystemLogs();
      if (response.success) {
        message.success(response.message || 'Đã xóa log hệ thống');
        setLogs('');
      } else {
        message.error(response.message || 'Lỗi khi xóa log hệ thống');
      }
    } catch (error) {
      console.error(error);
      message.error('Lỗi khi xóa log hệ thống');
    } finally {
      setIsClearing(false);
    }
  };

  const clearDataLogs = async () => {
    setIsClearingDb(true);
    try {
      const response = await systemLogService.clearAllDataLogs();
      if (response.success) {
        message.success(response.message || 'Đã xóa toàn bộ data log');
        setDbLogs([]);
      } else {
        message.error(response.message || 'Lỗi khi xóa data log');
      }
    } catch (error) {
      console.error(error);
      message.error('Lỗi khi xóa data log');
    } finally {
      setIsClearingDb(false);
    }
  };

  useEffect(() => {
    fetchSystemLogs();
    fetchDbLogs();
  }, []);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, filterLevel]);

  const renderLogLine = (line: string, index: number) => {
    const regex =
      /^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]\s(\w+)\.(\w+):\s(.*)/;
    const match = line.match(regex);

    if (!match) {
      return (
        <div
          key={index}
          className="py-0.5 pl-2 text-[13px] break-words whitespace-pre-wrap text-gray-400 sm:pl-[120px]"
        >
          {line}
        </div>
      );
    }

    const [, timestamp, env, level, messageStr] = match;

    let levelColor = 'text-gray-400';
    let levelBg = 'bg-gray-800';

    switch (level.toUpperCase()) {
      case 'ERROR':
      case 'CRITICAL':
      case 'EMERGENCY':
      case 'ALERT':
        levelColor = 'text-red-400';
        levelBg = 'bg-red-500/10 border-red-500/20 border';
        break;
      case 'WARNING':
        levelColor = 'text-yellow-400';
        levelBg = 'bg-yellow-500/10 border-yellow-500/20 border';
        break;
      case 'INFO':
      case 'NOTICE':
        levelColor = 'text-cyan-400';
        levelBg = 'bg-cyan-500/10 border-cyan-500/20 border';
        break;
      case 'DEBUG':
        levelColor = 'text-purple-400';
        levelBg = 'bg-purple-500/10 border-purple-500/20 border';
        break;
    }

    let formattedMessage = messageStr;
    let jsonPart = null;
    const jsonMatch = messageStr.match(/(\s*\{.*\})\s*$/);
    if (jsonMatch) {
      const rawJson = jsonMatch[1];
      try {
        const parsed = JSON.parse(rawJson);
        formattedMessage = messageStr.substring(
          0,
          messageStr.length - rawJson.length
        );
        jsonPart = (
          <div className="mt-2 w-full max-w-full overflow-x-auto rounded-lg border border-white/5 bg-[#0a0a0a] p-3">
            <pre className="m-0 font-mono text-[12.5px] break-words break-all whitespace-pre-wrap text-green-400/90">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          </div>
        );
      } catch {
        // Not valid JSON
      }
    }

    return (
      <div
        key={index}
        className="group relative mb-2 flex flex-col rounded border-b border-white/5 p-2.5 transition-colors last:border-0 hover:bg-white/5 sm:mb-1.5 sm:p-2"
      >
        <div className="flex w-full min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
          <div className="flex shrink-0 items-center gap-2 sm:mt-0.5">
            <span className="text-xs text-gray-500 tabular-nums">
              [{timestamp}]
            </span>
            <span
              className={`w-auto rounded px-1.5 py-0.5 text-center text-[10px] font-bold tracking-widest uppercase sm:w-[100px] ${levelColor} ${levelBg}`}
            >
              {level}
            </span>
          </div>
          <div
            className={`mt-1 min-w-0 flex-1 text-[13.5px] break-words break-all sm:mt-0 sm:break-normal ${level.toUpperCase() === 'ERROR' ? 'text-red-300' : 'text-gray-200'}`}
          >
            <span className="mr-2 rounded bg-gray-800/50 px-1.5 py-0.5 text-[11px] font-semibold text-gray-500 sm:text-xs">
              [{env}]
            </span>
            {formattedMessage}
          </div>
        </div>
        {jsonPart && (
          <div className="mt-1 w-full sm:mt-0 sm:pl-[220px]">{jsonPart}</div>
        )}
      </div>
    );
  };

  /** Helper to format DB Log Content beautifully */
  const formatDbContent = (content: string) => {
    if (!content)
      return <span className="text-gray-400 italic">Không có dữ liệu</span>;
    try {
      const parsed = JSON.parse(content);
      return (
        <div className="max-w-full overflow-x-auto">
          <pre className="m-0 rounded-lg border border-gray-100 bg-gray-50 p-3 font-mono text-xs break-words break-all whitespace-pre-wrap text-blue-600 dark:border-gray-800 dark:bg-[#141414] dark:text-blue-400">
            {JSON.stringify(parsed, null, 2)}
          </pre>
        </div>
      );
    } catch {
      return (
        <div className="w-full min-w-0 text-sm break-words break-all whitespace-pre-wrap text-gray-700 dark:text-gray-300">
          {content}
        </div>
      );
    }
  };

  const dbColumns: TableColumnsType<DBLogItem> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      align: 'center'
    },
    {
      title: 'Bảng/Table',
      dataIndex: 'table',
      key: 'table',
      width: 150,
      render: (text) => (
        <Tag
          color="geekblue"
          className="!m-0 px-2 py-0.5 text-xs font-semibold tracking-wider uppercase"
        >
          {text || 'N/A'}
        </Tag>
      )
    },
    {
      title: 'ROW ID',
      dataIndex: 'row',
      key: 'row',
      width: 120,
      render: (text) => (
        <span className="rounded bg-gray-100 px-2 py-1 font-mono text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          #{text || 'N/A'}
        </span>
      )
    },
    {
      title: 'Dữ liệu phát sinh',
      dataIndex: 'content',
      key: 'content',
      className: 'max-w-md',
      render: (text) => formatDbContent(text)
    },
    {
      title: 'Thời gian',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      align: 'right',
      render: (text) => (
        <div className="flex flex-col text-right">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {dayjs(text).format('DD/MM/YYYY')}
          </span>
          <span className="text-xs text-gray-500">
            {dayjs(text).format('HH:mm:ss')}
          </span>
        </div>
      )
    }
  ];

  const dbTableProps: TableProps<DBLogItem> = {
    dataSource: dbLogs,
    rowKey: 'id',
    columns: dbColumns,
    loading: isLoadingDb,
    pagination: {
      ...customPaginationProps,
      pageSize: 20
    },
    scroll: { x: 800 }
  };

  const tabItems: TabsProps['items'] = [
    {
      key: 'data_logs',
      label: (
        <span className="flex items-center gap-2">
          <DatabaseOutlined /> Nhập/Xuất Bình thường (Data Logs)
        </span>
      ),
      children: (
        <div className="animate-in fade-in slide-in-from-bottom-2 space-y-4 pt-1 duration-300">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white px-4 py-3 shadow-sm sm:p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
            <RefreshButton isLoading={isLoadingDb} refresh={fetchDbLogs} />

            <div className="mt-2 ml-auto w-full sm:mt-0 sm:w-auto">
              <Popconfirm
                title="Xóa toàn bộ Data Logs"
                description="Bạn có chắc chắn muốn xóa tất cả log nhập/xuất trong cơ sở dữ liệu không?"
                onConfirm={clearDataLogs}
                okText="Xóa Tất Cả"
                cancelText="Hủy"
                okButtonProps={{ danger: true, loading: isClearingDb }}
              >
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  className="w-full sm:w-auto"
                >
                  Xóa Tất Cả
                </Button>
              </Popconfirm>
            </div>
          </div>

          {/* Responsive DB Logs Content */}
          <div className="rounded-xl border border-gray-100 bg-white p-2 shadow-sm backdrop-blur sm:p-4 dark:border-gray-700 dark:bg-gray-800/50">
            {isMobile ? (
              <Spin spinning={isLoadingDb}>
                <div className="mt-1 flex flex-col gap-3">
                  {dbLogs.length === 0 ? (
                    <div className="py-10 text-center text-gray-500">
                      Khống có dữ liệu log
                    </div>
                  ) : (
                    dbLogs.map((item) => (
                      <div
                        key={item.id}
                        className="flex w-full max-w-full min-w-0 flex-col gap-3 overflow-hidden rounded-xl border border-blue-50 bg-white p-4 shadow-sm dark:border-gray-700"
                      >
                        <div className="flex w-full items-start justify-between">
                          <div className="flex max-w-[70%] items-center gap-2">
                            <Tag
                              color="geekblue"
                              className="!m-0 max-w-full truncate font-bold tracking-wider uppercase"
                            >
                              {item.table || 'N/A'}
                            </Tag>
                            <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm font-semibold text-gray-600">
                              #{item.row}
                            </span>
                          </div>
                          <div className="ml-1 flex shrink-0 flex-col text-right">
                            <span className="text-[11px] font-semibold text-gray-700">
                              {dayjs(item.created_at).format('DD/MM/YYYY')}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {dayjs(item.created_at).format('HH:mm:ss')}
                            </span>
                          </div>
                        </div>
                        <div className="w-full max-w-full min-w-0 overflow-hidden">
                          {formatDbContent(item.content)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Spin>
            ) : (
              <Table
                {...dbTableProps}
                size="middle"
                className="[&_.ant-table-thead>tr>th]:bg-gray-50 dark:[&_.ant-table-thead>tr>th]:bg-gray-800"
              />
            )}
          </div>
        </div>
      )
    },
    {
      key: 'system_logs',
      label: (
        <span className="flex items-center gap-2">
          <BugOutlined /> Hệ thống báo động (File Lỗi Kỹ Thuật)
        </span>
      ),
      children: (
        <div className="animate-in fade-in slide-in-from-bottom-2 space-y-4 pt-1 duration-300">
          <div className="flex flex-col flex-wrap gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-3 shadow-sm sm:p-4 md:flex-row md:items-center dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
            <div className="flex items-center gap-3">
              <RefreshButton
                isLoading={isLoadingSystem}
                refresh={fetchSystemLogs}
              />
            </div>

            <div className="scrollbar-hide mt-1 flex w-full gap-2 overflow-x-auto pb-1 sm:mt-0 sm:ml-4 sm:w-auto sm:pb-0">
              <Button
                type={filterLevel === 'ALL' ? 'primary' : 'default'}
                onClick={() => setFilterLevel('ALL')}
                className="flex-shrink-0"
              >
                Tất cả
              </Button>
              <Button
                type={filterLevel === 'ERROR' ? 'primary' : 'default'}
                danger={filterLevel === 'ERROR'}
                onClick={() => setFilterLevel('ERROR')}
                className="flex-shrink-0"
              >
                Chỉ Lỗi (Errors)
              </Button>
              <Button
                type={filterLevel === 'INFO' ? 'primary' : 'default'}
                className={`flex-shrink-0 ${filterLevel === 'INFO' ? 'bg-cyan-500 hover:bg-cyan-400' : ''}`}
                onClick={() => setFilterLevel('INFO')}
              >
                Thông tin / Cảnh báo
              </Button>
            </div>

            <div className="mt-2 w-full md:mt-0 md:ml-auto md:w-auto">
              <Popconfirm
                title="Xóa System Logs"
                description="Bạn có chắc chắn muốn xóa toàn bộ laravel.log không?"
                onConfirm={clearSystemLogs}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true, loading: isClearing }}
              >
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  className="w-full sm:w-auto"
                >
                  Làm Sạch Log Kỹ Thuật
                </Button>
              </Popconfirm>
            </div>
          </div>

          <AppSearchInput
            placeholder="Tìm mã lỗi (request_id) hoặc nội dung log"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <p className="text-xs text-gray-500">
            Hiển thị tối đa 1.000 dòng cuối của log BE. Lỗi mạng hoặc lỗi chỉ
            xảy ra trên trình duyệt không có log BE.
          </p>
          <div className="custom-scrollbar h-[65vh] overflow-y-auto rounded-xl border border-[#222] bg-[#0d0d0d] p-2 font-mono shadow-inner sm:h-[70vh] sm:p-3">
            <Spin spinning={isLoadingSystem} tip="Đang tải logs...">
              {logs ? (
                <div className="flex min-h-full flex-col">
                  {filterSystemLogs(logs, filterLevel, search).map(
                    (line, idx) => renderLogLine(line, idx)
                  )}
                  <div ref={logEndRef} className="h-4" />
                </div>
              ) : (
                <div className="flex h-[60vh] items-center justify-center text-sm text-gray-500">
                  Không có dữ liệu file log...
                </div>
              )}
            </Spin>
          </div>
        </div>
      )
    }
  ];

  return (
    <ComponentCard title="Quản lý Ghi Nhận Lỗi & Hệ Thống">
      <Tabs
        items={tabItems}
        defaultActiveKey="data_logs"
        className="font-sans [&_.ant-tabs-nav::before]:border-b-gray-100 dark:[&_.ant-tabs-nav::before]:border-b-gray-800"
        size={isMobile ? 'small' : 'middle'}
      />
    </ComponentCard>
  );
}
