import {
  NotificationType,
  NotificationUpdateType
} from '@/types/notificationType';
import { PaginatedResponse } from '@/types/responseTypes';
import { QueryParams } from '@/types/queryParams';
import { customTableProps } from '@components/custom/TableProps.custom';
import {
  deleteNotification,
  fetchNotifications,
  updateNotification
} from '@services/NotificationService';
import {
  ActionGroup,
  EditButton,
  DeleteButton
} from '@components/common/ActionButtons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Checkbox, Form, Input, message, Popconfirm, Table, Tag } from 'antd';
import Button from '@components/common/AppButton';
import type { ColumnsType, TableProps } from 'antd/es/table';
import { useState } from 'react';

type TableColumns = NotificationType & { key: string };

interface EditableCellProps {
  title: React.ReactNode;
  children: React.ReactNode;
  dataIndex: keyof TableColumns;
  record: TableColumns;
  editing: boolean;
}

export const NotificationTable = () => {
  const [form] = Form.useForm();
  const [params, setParams] = useState<QueryParams>({
    limit: 10,
    page: 1
  });
  const [editingKey, setEditingKey] = useState('');
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', params],
    queryFn: () => fetchNotifications(params)
  });

  const dataSource: TableColumns[] = (notifications?.data || []).map(
    (item: NotificationType) => ({ ...item, key: String(item.id) })
  );

  const total = notifications?.total || 0;

  const isEditing = (record: TableColumns) => record.key === editingKey;

  const edit = (record: TableColumns) => {
    form.setFieldsValue({ ...record });
    setEditingKey(record.key);
  };

  const cancel = () => {
    setEditingKey('');
  };

  const queryClient = useQueryClient();

  const { mutate: save } = useMutation({
    mutationKey: ['updateNotification'],
    mutationFn: async ({
      id,
      updatedNotification
    }: {
      id: string;
      updatedNotification: NotificationUpdateType;
    }) => {
      await updateNotification(id, updatedNotification);
    },
    onMutate: () => {
      message.loading({ content: 'Đang cập nhật...', key: 'updating' });
    },
    onSuccess: (_data, variables) => {
      message.success({
        content: 'Cập nhật thông báo thành công!',
        key: 'updating'
      });
      queryClient.setQueryData(
        ['notifications', params],
        (oldData: PaginatedResponse<NotificationType>) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: oldData.data.map((item: NotificationType) =>
              String(item.id) === String(variables.id)
                ? { ...item, ...variables.updatedNotification }
                : item
            )
          };
        }
      );
      form.resetFields();
      setEditingKey('');
      queryClient.invalidateQueries();
    },
    onError: () => {
      message.error({
        content: 'Cập nhật thông báo thất bại.',
        key: 'updating'
      });
    }
  });

  const { mutate: remove } = useMutation({
    mutationKey: ['deleteNotification'],
    mutationFn: async (id: string) => {
      await deleteNotification(id);
    },
    onMutate: () => {
      message.loading({ content: 'Đang xóa...', key: 'deleting' });
    },
    onSuccess: (_data, id) => {
      message.success({
        content: 'Xóa thông báo thành công!',
        key: 'deleting'
      });
      queryClient.setQueryData(
        ['notifications', params],
        (oldData: PaginatedResponse<NotificationType> | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: oldData.data.filter(
              (item: NotificationType) => String(item.id) !== String(id)
            )
          };
        }
      );
      queryClient.invalidateQueries();
    },
    onError: () => {
      message.error({
        content: 'Xóa thông báo thất bại.',
        key: 'deleting'
      });
    }
  });

  const EditableCell: React.FC<EditableCellProps> = ({
    editing,
    dataIndex,
    title,
    record,
    children,
    ...restProps
  }) => {
    return (
      <td {...restProps}>
        {editing ? (
          dataIndex === 'is_show' ? (
            <Form.Item
              name={dataIndex}
              valuePropName="checked"
              style={{ margin: 0 }}
            >
              <Checkbox />
            </Form.Item>
          ) : (
            <Form.Item
              name={dataIndex}
              style={{ margin: 0 }}
              rules={[{ required: true, message: `Vui lòng nhập ${title}!` }]}
              initialValue={record[dataIndex]}
            >
              <Input />
            </Form.Item>
          )
        ) : (
          children
        )}
      </td>
    );
  };

  const columns: ColumnsType<TableColumns> = [
    {
      title: 'STT',
      align: 'center' as const,
      width: 60,
      render: (_value, _record, index) => (
        <span className="font-mono text-xs text-gray-500">
          {index + 1 + (params.limit ?? 10) * ((params.page ?? 1) - 1)}
        </span>
      )
    },
    {
      title: 'Nội dung',
      key: 'message',
      dataIndex: 'message',
      render: (value: string) => (
        <span className="text-sm text-gray-800 dark:text-white/90">
          {value}
        </span>
      ),
      onCell: (record: TableColumns) => ({
        record,
        dataIndex: 'message',
        title: 'Nội dung',
        editing: isEditing(record)
      })
    },
    {
      title: 'Hiển thị',
      key: 'is_show',
      dataIndex: 'is_show',
      align: 'center',
      filters: [
        { text: 'Có', value: true },
        { text: 'Không', value: false }
      ],
      render: (value: boolean) => {
        return value ? (
          <Tag color="green">Có</Tag>
        ) : (
          <Tag color="red">Không</Tag>
        );
      },
      onCell: (record: TableColumns) => ({
        record,
        dataIndex: 'is_show',
        title: 'Hiển thị',
        editing: isEditing(record)
      })
    },
    {
      title: 'Hành động',
      key: 'action',
      align: 'center',
      width: 200,
      dataIndex: 'id',
      render: (_, record) => {
        const editable = isEditing(record);
        return editable ? (
          <ActionGroup>
            <Button
              tone="inherit"
              type="primary"
              onClick={() =>
                save({
                  id: record.id,
                  updatedNotification: form.getFieldsValue()
                })
              }
            >
              Lưu
            </Button>
            <Popconfirm title="Hủy thay đổi?" onConfirm={cancel}>
              <Button tone="inherit" type="default">
                Hủy
              </Button>
            </Popconfirm>
          </ActionGroup>
        ) : (
          <ActionGroup>
            <EditButton
              onClick={() => edit(record)}
              disabled={editingKey !== ''}
            />
            <Popconfirm
              title="Xóa thông báo?"
              onConfirm={() => remove(record.id)}
            >
              <DeleteButton disabled={editingKey !== ''} />
            </Popconfirm>
          </ActionGroup>
        );
      }
    }
  ];

  const tableProps: TableProps<TableColumns> = {
    ...(customTableProps as unknown as TableProps<TableColumns>),
    dataSource,
    rowKey: 'id',
    loading: isLoading,
    columns,
    components: {
      body: {
        cell: EditableCell
      }
    },
    pagination: {
      ...customTableProps.pagination,
      total,
      current: params.page,
      pageSize: params.limit,
      onChange: (page, pageSize) => {
        setParams((prev) => ({ ...prev, page, limit: pageSize }));
      }
    },
    onChange: (_pagination, filters) => {
      const newFilters: QueryParams = {};

      if (Array.isArray(filters.is_show) && filters.is_show.length == 1) {
        newFilters['filter[is_show]'] =
          filters.is_show[0] == true ? 'true' : 'false';
      } else if (!filters.is_show) {
        newFilters['filter[is_show]'] = undefined;
      }
      setParams((prev) => ({
        ...prev,
        ...newFilters
      }));
    }
  };

  return (
    <Form form={form} component={false}>
      <Table {...tableProps} />
    </Form>
  );
};
