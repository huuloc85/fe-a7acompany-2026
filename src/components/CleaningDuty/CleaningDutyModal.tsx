import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  BellOutlined
} from '@ant-design/icons';
import { IconDelete } from '@components/icons';
import { Checkbox, Modal, Tag, Typography } from 'antd';
import Button from '@components/common/AppButton';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import React, { useState } from 'react';
import { FaBowlFood, FaRestroom } from 'react-icons/fa6';

const { Text } = Typography;

type DutyType = 'eat-room' | 'trash' | 'female-wc' | 'male-wc';

export interface CleaningDuty {
  id: string;
  type: DutyType;
  date: Dayjs;
}

interface CleaningDutyModalProps {
  open: boolean;
  onClose: () => void;
  duties: CleaningDuty[];
  onDontShowAgain?: (checked: boolean) => void;
  forceRender?: boolean;
  mask?: boolean;
  rootClassName?: string;
}

const CleaningDutyModal: React.FC<CleaningDutyModalProps> = ({
  open,
  onClose,
  duties,
  onDontShowAgain,
  forceRender,
  mask,
  rootClassName
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const getTypeMeta = (
    type: DutyType
  ): {
    label: string;
    area: string;
    color: string;
    icon: React.ReactNode;
    iconClass: string;
  } => {
    switch (type) {
      case 'eat-room':
        return {
          label: 'Phòng ăn',
          area: 'khu vực phòng ăn',
          color: 'blue',
          icon: <FaBowlFood />,
          iconClass: 'bg-blue-50 text-blue-600 ring-blue-100'
        };
      case 'trash':
        return {
          label: 'Khu vực đổ rác',
          area: 'khu vực đổ rác',
          color: 'green',
          icon: <IconDelete />,
          iconClass: 'bg-emerald-50 text-emerald-600 ring-emerald-100'
        };
      case 'female-wc':
        return {
          label: 'Nhà vệ sinh nữ',
          area: 'nhà vệ sinh nữ',
          color: 'purple',
          icon: <FaRestroom />,
          iconClass: 'bg-purple-50 text-purple-600 ring-purple-100'
        };
      case 'male-wc':
        return {
          label: 'Nhà vệ sinh nam',
          area: 'nhà vệ sinh nam',
          color: 'cyan',
          icon: <FaRestroom />,
          iconClass: 'bg-cyan-50 text-cyan-600 ring-cyan-100'
        };
      default:
        return {
          label: 'Lịch trực',
          area: 'khu vực được phân công',
          color: 'default',
          icon: <CalendarOutlined />,
          iconClass: 'bg-gray-50 text-gray-600 ring-gray-100'
        };
    }
  };

  const getDutyMessage = (duty: CleaningDuty) => {
    const meta = getTypeMeta(duty.type);
    return `Bạn được phân công trực vệ sinh tại ${meta.area}. Vui lòng hoàn thành đúng thời gian quy định.`;
  };

  const sortedDuties = [...duties].sort(
    (a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf()
  );
  const todayCount = sortedDuties.filter((item) =>
    dayjs().isSame(item.date, 'day')
  ).length;

  return (
    <Modal
      title={
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
            <BellOutlined className="text-lg" />
          </div>
          <div className="min-w-0">
            <div className="text-base font-semibold text-gray-900">
              Lịch trực vệ sinh
            </div>
            <div className="text-xs font-normal text-gray-500">
              {sortedDuties.length} nhiệm vụ cần lưu ý
              {todayCount > 0 ? `, ${todayCount} nhiệm vụ hôm nay` : ''}
            </div>
          </div>
        </div>
      }
      open={open}
      rootClassName={rootClassName}
      forceRender={forceRender}
      mask={mask}
      onCancel={onClose}
      footer={
        <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-left">
            <Checkbox
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="text-gray-600"
            >
              <span className="text-sm text-gray-600">
                Không hiển thị lại trong hôm nay
              </span>
            </Checkbox>
          </div>
          <Button
            tone="inherit"
            type="primary"
            onClick={() => {
              if (onDontShowAgain) {
                onDontShowAgain(dontShowAgain);
              }
              onClose();
            }}
            size="large"
            className="!h-10 !rounded-lg !px-6 !font-semibold"
          >
            <CheckCircleOutlined />
            Đã hiểu
          </Button>
        </div>
      }
      width={560}
      centered
      className="cleaning-duty-modal"
      styles={{
        header: {
          padding: '20px 24px 16px',
          borderBottom: '1px solid #eef2f7'
        },
        body: {
          padding: '18px 24px 20px',
          maxHeight: '60vh',
          overflowY: 'auto',
          background: '#fbfcfe'
        },
        footer: {
          padding: '0 24px 20px',
          borderTop: 'none',
          background: '#fbfcfe'
        },
        content: {
          padding: 0,
          borderRadius: 16,
          overflow: 'hidden'
        }
      }}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            <CalendarOutlined />
            {sortedDuties.length} nhiệm vụ
          </div>
          {todayCount > 0 ? (
            <div className="flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
              <ClockCircleOutlined />
              {todayCount} hôm nay
            </div>
          ) : null}
          <div className="text-xs text-gray-500">
            Vui lòng kiểm tra ngày trực và khu vực được phân công.
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {sortedDuties.map((item) => {
            const meta = getTypeMeta(item.type);
            const isToday = dayjs().isSame(item.date, 'day');

            return (
              <div
                key={item.id}
                className="border-b border-gray-100 p-4 last:border-b-0"
              >
                <div className="flex gap-4">
                  <div className="w-[76px] flex-shrink-0 rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2 text-center">
                    <div className="text-[11px] font-semibold text-gray-500">
                      {dayjs(item.date).format('ddd')}
                    </div>
                    <div className="mt-0.5 text-2xl leading-none font-bold text-gray-900">
                      {dayjs(item.date).format('DD')}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {dayjs(item.date).format('MM/YYYY')}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <div
                          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-base ring-1 ${meta.iconClass}`}
                        >
                          {meta.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900">
                            {meta.label}
                          </div>
                          <div className="text-xs text-gray-500">
                            {dayjs(item.date).format('dddd')}
                          </div>
                        </div>
                      </div>
                      <Tag
                        color={isToday ? 'red' : meta.color}
                        className="!m-0 !rounded-full !px-2.5 !py-0.5 !text-xs !font-semibold"
                      >
                        {isToday ? (
                          <>
                            <ClockCircleOutlined className="mr-1" />
                            HÔM NAY
                          </>
                        ) : (
                          'Sắp tới'
                        )}
                      </Tag>
                    </div>
                    <Text className="mt-2 block text-sm leading-6 text-gray-600">
                      {getDutyMessage(item)}
                    </Text>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};

export default CleaningDutyModal;
