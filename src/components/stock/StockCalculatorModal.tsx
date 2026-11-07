import React, { useState, useEffect } from 'react';
import {
  Modal,
  Typography,
  DatePicker,
  Spin,
  Divider,
  InputNumber
} from 'antd';
import Button from '@components/common/AppButton';
import { CalculatorOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { StockTransactionService } from '@/services/StockTransactionService';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

interface Props {
  open: boolean;
  onClose: () => void;
  systemCurrent: number;
}

const StockCalculatorModal: React.FC<Props> = ({
  open,
  onClose,
  systemCurrent
}) => {
  const [openingStock, setOpeningStock] = useState<number>(0);
  const [customIn, setCustomIn] = useState<number>(0);
  const [customOut, setCustomOut] = useState<number>(0);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs()
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchStatsForRange(dateRange[0], dateRange[1]);
    }
  }, [open, dateRange]);

  const fetchStatsForRange = async (start: Dayjs, end: Dayjs) => {
    setLoading(true);
    try {
      const fromD = start.format('YYYY-MM-DD');
      const toD = end.format('YYYY-MM-DD');
      const req = await StockTransactionService.getStatistics(fromD, toD);
      let tIn = 0;
      let tOut = 0;
      if (req && 'success' in req && req.success) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sum = (req as any).data?.summary;
        tIn = Number(sum?.total_in || 0);
        tOut = Number(sum?.total_out || 0);
      }
      setCustomIn(tIn);
      setCustomOut(tOut);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([dates[0], dates[1]]);
      fetchStatsForRange(dates[0], dates[1]);
    }
  };

  const calcExpected = openingStock + customIn - customOut;
  const diff = calcExpected - systemCurrent;

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-blue-700">
          <CalculatorOutlined />
          <span>Hệ thống Máy tính Kiểm kho</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button tone="inherit" key="close" type="primary" onClick={onClose}>
          Đã hiểu
        </Button>
      ]}
      destroyOnClose
    >
      <div className="space-y-4 pt-2">
        <AlertBox />

        <div className="flex flex-col gap-2">
          <Text strong>Chọn khoảng thời gian đối soát:</Text>
          <RangePicker
            value={dateRange}
            onChange={handleDateChange}
            format="DD/MM/YYYY"
            allowClear={false}
          />
        </div>

        <Spin spinning={loading}>
          <div className="mt-2 rounded border border-gray-200 bg-gray-50 p-5 shadow-inner">
            <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
              <Text className="font-medium text-gray-600">1. Tồn Đầu Kỳ:</Text>
              <InputNumber
                value={openingStock}
                onChange={(v) => setOpeningStock(v || 0)}
                className="w-32"
                formatter={(value) =>
                  `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                }
                // @ts-expect-error - antd types for parser are tricky
                parser={(value) => value?.replace(/\./g, '')}
              />
            </div>

            <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
              <Text className="text-gray-600">2. Đã Nhập trong kỳ:</Text>
              <Text className="text-lg font-bold text-green-600">
                +{customIn.toLocaleString('vi-VN')}
              </Text>
            </div>

            <div className="flex items-center justify-between pb-1">
              <Text className="text-gray-600">3. Đã Xuất trong kỳ:</Text>
              <Text className="text-lg font-bold text-red-500">
                -{customOut.toLocaleString('vi-VN')}
              </Text>
            </div>
          </div>

          <div className="rounded-lg border-2 border-blue-100 bg-blue-50/50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <Text className="text-gray-600">
                Tồn kho Dự kiến (Tính toán):
              </Text>
              <Title level={4} className="!m-0 text-blue-600">
                {calcExpected.toLocaleString('vi-VN')}
              </Title>
            </div>
            <div className="mb-4 flex items-center justify-between">
              <Text className="text-gray-600">Tồn kho Thực tế (Hệ thống):</Text>
              <Title level={4} className="!m-0 text-gray-800">
                {systemCurrent.toLocaleString('vi-VN')}
              </Title>
            </div>

            <Divider className="my-3" />

            <div className="flex items-center justify-between rounded bg-white p-3 shadow-sm">
              <Text strong className="text-base text-gray-700">
                CHÊNH LỆCH:
              </Text>
              <div className="text-right">
                <span
                  className={`text-xl font-bold ${diff === 0 ? 'text-green-500' : 'text-red-500'}`}
                >
                  {diff > 0 ? '+' : ''}
                  {diff.toLocaleString('vi-VN')}
                </span>
                {diff !== 0 && (
                  <div className="mt-1 text-xs font-normal text-gray-400">
                    {diff > 0
                      ? '(Thiếu hàng trong kho thực tế)'
                      : '(Thừa hàng so với sổ sách)'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Spin>
      </div>
    </Modal>
  );
};

const AlertBox = () => (
  <div className="mb-4 rounded border-l-4 border-blue-500 bg-blue-50 p-3 text-sm text-blue-800">
    <p>
      Hãy chọn Mốc lịch, sau đó <b>Tự nhập số Tồn đầu kỳ</b> vào ô bên dưới. Hệ
      thống sẽ cộng với <b>Nhập/Xuất trong kỳ</b> để đối soát thật chuẩn với Kho
      hiện tại.
    </p>
  </div>
);

export default StockCalculatorModal;
