import dayjs from 'dayjs';

import { useCrudList } from '@hooks/useCrudList';

import { scheduleDetailService } from '@services/ScheduleDetailService';
import { Button, DatePicker, Modal, Spin, Typography } from 'antd';
import { useState } from 'react';
import { FaUsers } from 'react-icons/fa6';

export const EmployeeListModal = () => {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<string>(dayjs().format('YYYY-MM-DD'));

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const { data: scheduleDetails, queryResult } = useCrudList({
    service: scheduleDetailService,
    queryKey: 'scheduleDetails',
    initialFilters: {
      limit: 0,
      include: ['employees'],
      'filter[date]': date,
      'filter[hnhc]': 'D,TC,N,LN'
    }
  });

  return (
    <>
      <Button
        onClick={handleOpen}
        color="cyan"
        variant="solid"
        icon={<FaUsers />}
      >
        Danh sách nhân viên
      </Button>

      <Modal
        open={open}
        onCancel={handleClose}
        footer={null}
        title={`Danh sách nhân viên làm việc ngày ${dayjs(date).format('DD/MM/YYYY')}`}
        width={800}
      >
        <div className="mb-2">Chọn ngày:</div>
        <DatePicker
          format="DD/MM/YYYY"
          inputReadOnly={false}
          value={dayjs(date)}
          onChange={(date) =>
            setDate(
              date
                ? dayjs(date).format('YYYY-MM-DD')
                : dayjs().format('YYYY-MM-DD')
            )
          }
        />
        <div className="text-center">
          <Spin spinning={queryResult.isLoading} />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {scheduleDetails?.length > 0 && (
            <>
              <div className="mt-4">
                <Typography.Title level={5}>
                  Danh sách nhân viên Ca 1:
                </Typography.Title>
                <ul className="grid gap-2">
                  {scheduleDetails
                    .filter((item) => item.hnhc === 'N' || item.hnhc === 'LN')
                    .map((item) => (
                      <li
                        key={`shift-1-${item.employee_id}-${item.date}-${item.hnhc}`}
                        className="rounded-lg border p-2"
                      >
                        <Typography.Title level={5}>
                          {item.employees?.name}
                        </Typography.Title>
                        <Typography.Text>{item.employee_id}</Typography.Text>
                      </li>
                    ))}
                </ul>
              </div>
              <div className="mt-4">
                <Typography.Title level={5}>
                  Danh sách nhân viên Ca 2:
                </Typography.Title>
                <ul className="grid gap-2">
                  {scheduleDetails
                    .filter((item) => item.hnhc === 'D' || item.hnhc === 'TC')
                    .map((item) => (
                      <li
                        key={`shift-2-${item.employee_id}-${item.date}-${item.hnhc}`}
                        className="rounded-lg border p-2"
                      >
                        <Typography.Title level={5}>
                          {item.employees?.name}
                        </Typography.Title>
                        <Typography.Text>{item.employee_id}</Typography.Text>
                      </li>
                    ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
};
