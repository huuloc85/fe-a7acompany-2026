import { Modal } from 'antd';
import { SizeType } from 'antd/es/config-provider/SizeContext';
import { useState } from 'react';

import { useDynamicCrudForm } from '@hooks/useDynamicCrudForm';
import { CrudServiceType } from '@utils/crudService';

import { DeleteButton, RestoreButton } from '@components/common/ActionButtons';

interface DeleteProps<TData, TCreateDto, TUpdateDto> {
  id: string;
  service: CrudServiceType<TData, TCreateDto, TUpdateDto>;
  content?: React.ReactNode;
  isRestore?: boolean;
  isForceDelete?: boolean;
  size?: SizeType;
}

export function ConfirmButton<
  TData extends object,
  TCreateDto extends object,
  TUpdateDto extends object
>({
  id,
  service,
  content,
  isRestore,
  isForceDelete,
  size = 'middle'
}: DeleteProps<TData, TCreateDto, TUpdateDto>) {
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const {
    deleteItem,
    isDeleting,
    restoreItem,
    isRestoring,
    forceDeleteItem,
    isForceDeleting
  } = useDynamicCrudForm({
    id,
    service,
    onSuccess: handleClose
  });

  // Determine mode
  const mode = isForceDelete ? 'forceDelete' : isRestore ? 'restore' : 'delete';
  const labels = {
    delete: {
      btn: 'Xóa',
      title: 'Xác nhận xóa',
      default: 'Bạn có chắc chắn muốn xóa?'
    },
    restore: {
      btn: 'Khôi phục',
      title: 'Xác nhận khôi phục',
      default: 'Bạn có chắc chắn muốn khôi phục?'
    },
    forceDelete: {
      btn: 'Xoá vĩnh viễn',
      title: 'Xác nhận xoá vĩnh viễn',
      default: 'Hành động này không thể hoàn tác!'
    }
  };
  const label = labels[mode];
  const isPending =
    mode === 'forceDelete'
      ? isForceDeleting
      : mode === 'restore'
        ? isRestoring
        : isDeleting;

  return (
    <>
      {isRestore ? (
        <RestoreButton size={size} onClick={handleOpen} loading={isPending}>
          {label.btn}
        </RestoreButton>
      ) : mode === 'forceDelete' ? (
        <DeleteButton size={size} onClick={handleOpen} loading={isPending}>
          {label.btn}
        </DeleteButton>
      ) : (
        <DeleteButton size={size} onClick={handleOpen} loading={isPending}>
          {label.btn}
        </DeleteButton>
      )}

      <Modal
        title={
          <>
            <span className="text-xl font-semibold text-gray-800">
              {label.title}
            </span>
          </>
        }
        confirmLoading={isPending}
        closable={!isPending}
        maskClosable={!isPending}
        keyboard={!isPending}
        open={open}
        centered
        okButtonProps={{
          loading: isPending,
          danger: mode !== 'restore',
          size,
          variant: 'solid',
          color: mode === 'restore' ? 'gold' : 'danger'
        }}
        okText={label.btn}
        onOk={() => {
          if (isPending) return;
          if (mode === 'restore') restoreItem();
          else if (mode === 'forceDelete') forceDeleteItem();
          else deleteItem();
        }}
        cancelButtonProps={{
          disabled: isPending,
          size
        }}
        onCancel={handleClose}
        cancelText="Hủy"
      >
        {content || label.default}
      </Modal>
    </>
  );
}
