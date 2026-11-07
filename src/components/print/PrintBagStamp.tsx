import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message, Modal, Radio } from 'antd';
import Button from '@components/common/AppButton';
import type { Dayjs } from 'dayjs';
import { useCallback, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';

import { ProductType } from '@/types/productType';
import { Shift } from '@/types/shift';
import { saveStamp, checkDuplicateStamps } from '@services/StampService';
import { EmployeeType } from '@/types/employeeType';
import { useStampNotification } from '@hooks/useStampNotification';
import { usePrintShortcut } from '@hooks/usePrintShortcut';

interface PrintBagStampProps {
  product: ProductType;
  startStamp: string | number;
  totalStamp: number;
  date: Dayjs;
  shift: Shift;
  employee_id?: EmployeeType['id'];
  stamp_id?: string;
  purpose?: 'new' | 'additional' | 'reprint';
  onPrintSuccess?: () => void;
}

export const PrintBagStamp = ({
  product,
  startStamp,
  totalStamp,
  date,
  shift,
  employee_id,
  stamp_id,
  purpose,
  onPrintSuccess
}: PrintBagStampProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: contentRef });

  // State for print layout mode
  const [printMode, setPrintMode] = useState<'grid' | 'single'>('single');

  // Parse and arrange stamps based on comma separation
  const originalStampList = (startStamp as string).split(',');

  const stampList =
    originalStampList.length > 1
      ? (() => {
          // Process comma-separated stamps - arrange odd/even for entire list
          const stamps = originalStampList.map((stamp) =>
            parseInt(stamp.trim())
          );

          // Separate all odd and even numbers first
          const oddNumbers = stamps
            .filter((num) => num % 2 === 1)
            .sort((a, b) => a - b);
          const evenNumbers = stamps
            .filter((num) => num % 2 === 0)
            .sort((a, b) => a - b);

          // Arrange with odd numbers first, then even numbers
          const arrangedStamps = [
            ...oddNumbers.map((n) => n.toString()),
            ...evenNumbers.map((n) => n.toString())
          ];

          return arrangedStamps;
        })()
      : originalStampList;

  const queryClient = useQueryClient();
  const { handleRemoveNotification } = useStampNotification();

  const { mutate } = useMutation({
    mutationKey: ['savePrintLog'],
    mutationFn: saveStamp,
    onSuccess: () => {
      message.success('In thành công');
      queryClient.invalidateQueries();
      if (stamp_id) handleRemoveNotification(stamp_id);
      if (onPrintSuccess) onPrintSuccess();
    },
    onError: () => {
      console.error('Error saving print log');
      message.error('Lỗi khi lưu nhật ký in');
    }
  });

  const { mutate: checkDuplicate } = useMutation({
    mutationKey: ['checkDuplicateStamps'],
    mutationFn: checkDuplicateStamps,
    onSuccess: (data) => {
      if (!data) {
        performPrint();
        return;
      }

      if (data.isDuplicate && data.duplicates && data.duplicates.length > 0) {
        const duplicateInfo = data.duplicates
          .map(
            (dup: { overlappingStamps: number[] }) =>
              `Tem số: ${dup.overlappingStamps.join(', ')}`
          )
          .join('\n');

        Modal.confirm({
          title: 'Cảnh báo: Phát hiện tem trùng lặp',
          content: (
            <div>
              <pre className="mt-2 rounded border border-yellow-200 bg-yellow-50 p-2 text-sm">
                {duplicateInfo}
              </pre>
              <p className="mt-2 font-semibold text-red-600">
                Bạn có chắc chắn muốn tiếp tục in các tem này không?
              </p>
            </div>
          ),
          okText: 'Tiếp tục in',
          cancelText: 'Hủy',
          okButtonProps: { danger: true },
          onOk: () => {
            performPrint();
          }
        });
      } else {
        performPrint();
      }
    },
    onError: (error) => {
      console.error('Error checking duplicates:', error);
      Modal.confirm({
        title: 'Lỗi kiểm tra trùng lặp',
        content: (
          <p>
            Không thể kiểm tra tem trùng lặp cho sản phẩm này.
            <br />
            <span className="font-semibold text-amber-600">
              Bạn có muốn tiếp tục in không?
            </span>
          </p>
        ),
        okText: 'Tiếp tục in',
        cancelText: 'Hủy',
        okButtonProps: { danger: true },
        onOk: () => performPrint()
      });
    }
  });

  const performPrint = useCallback(() => {
    handlePrint();
    mutate({
      productId: product.id,
      date: date.format('YYYY-MM-DD'),
      shift,
      binCount: totalStamp,
      binStart:
        originalStampList.length > 1
          ? originalStampList.slice(0, totalStamp).join(',')
          : stampList.slice(0, totalStamp).join(','),
      type: 'bag',
      employee_id: employee_id,
      stamp_id: stamp_id,
      purpose: purpose
    });
  }, [
    originalStampList,
    stampList,
    date,
    handlePrint,
    mutate,
    product,
    shift,
    totalStamp,
    employee_id,
    stamp_id,
    purpose
  ]);

  const handleSavePrintLog = useCallback(() => {
    // Only check duplicates if no stamp_id (self-created stamp)
    if (!stamp_id) {
      checkDuplicate({
        product_id: String(product.id),
        date: date.format('YYYY-MM-DD'),
        shift: shift,
        binStart:
          originalStampList.length > 1
            ? originalStampList.slice(0, totalStamp).join(',')
            : stampList.slice(0, totalStamp).join(','),
        binCount: totalStamp,
        type: 'bag'
      });
    } else {
      // If from history page, print directly
      performPrint();
    }
  }, [
    originalStampList,
    stampList,
    date,
    checkDuplicate,
    product,
    shift,
    totalStamp,
    stamp_id,
    performPrint
  ]);

  // Use the custom hook for print shortcut
  usePrintShortcut(handleSavePrintLog);

  return (
    <>
      <style>
        {`
          .bag-print-container td {
            border: 1px solid #232d42 !important;
            padding: 2px !important;
          }
          .bag-print-container table {
            border-collapse: collapse !important;
            table-layout: fixed !important;
            ${printMode === 'single' ? 'width: 98mm !important; height: 78mm !important;' : ''}
          }

          @media print {
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
            }
            .bag-print-container {
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
            }
            @page {
              size: ${printMode === 'single' ? '100mm 80mm' : 'A4 portrait'} !important;
              margin: 0 !important;
            }
            ${
              printMode === 'single'
                ? `
            .bag-print-container .stamp-item {
              width: 100mm !important;
              height: 80mm !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              position: relative !important;
              overflow: hidden !important;
            }
            .bag-print-container .stamp-item:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
            .bag-print-container .stamp-item table {
              width: 98mm !important;
              height: 78mm !important;
              transform: scale(0.96) !important;
              transform-origin: center center !important;
              margin: 0 auto !important;
            }
            `
                : ''
            }
          }
        `}
      </style>
      <div className="mb-4 space-y-3 rounded-2xl border border-orange-200 bg-orange-50/70 p-4 dark:border-orange-800/60 dark:bg-orange-900/15">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-bold tracking-wide text-orange-500 uppercase">
              Đang xem
            </div>
            <div className="text-base font-bold text-orange-700 dark:text-orange-300">
              Tem Bịch
            </div>
          </div>
          <span className="rounded-full border border-orange-300 bg-white/70 px-3 py-1 text-xs font-bold text-orange-700 dark:border-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
            Nhãn túi/bịch
          </span>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-orange-900 dark:text-orange-100">
            Chế độ in tem bịch:
          </label>
          <Radio.Group
            value={printMode}
            onChange={(e) => setPrintMode(e.target.value)}
            className="flex flex-wrap gap-4"
          >
            <Radio value="single">Tem bịch lẻ (100 x 80)</Radio>
            <Radio value="grid">Tem bịch A4</Radio>
          </Radio.Group>
        </div>
        <div>
          <Button
            tone="inherit"
            color="orange"
            variant="solid"
            className="stamp-print-action stamp-print-action--bag"
            onClick={handleSavePrintLog}
          >
            In tem bịch
          </Button>
        </div>
      </div>

      <div
        ref={contentRef}
        className="bag-print-container print:m-0 print:p-0 print:shadow-none"
      >
        {product && printMode === 'grid'
          ? // Grid layout: 8 stamps per page
            Array.from(
              {
                length:
                  stampList.length > 1
                    ? stampList.slice(0, totalStamp).length
                    : totalStamp
              },
              () => product
            )
              .reduce(
                (
                  pages: { item: ProductType; index: number }[][],
                  item,
                  index
                ) => {
                  const pageIndex = Math.floor(index / 8);
                  if (!pages[pageIndex]) pages[pageIndex] = [];
                  pages[pageIndex].push({ item, index });
                  return pages;
                },
                []
              )
              .map((page, pageIndex) => (
                <div
                  key={`page-${pageIndex}`}
                  className="print-grid print:page-break-after-always mr-2 grid grid-cols-2 grid-rows-4 gap-4 not-print:mx-auto not-print:mb-8 not-print:max-w-7xl not-print:grid-cols-1 not-print:border not-print:border-orange-400 not-print:p-4 not-print:lg:grid-cols-2 print:min-h-screen"
                >
                  {page.map(({ item, index }) => (
                    <div
                      key={`${index}-${item.code}`}
                      className="stamp-item w-auto break-inside-avoid-page not-print:flex not-print:justify-center"
                    >
                      <table className="text-center">
                        <colgroup>
                          <col className="w-[14%]" />
                          <col className="w-[21.5%]" />
                          <col className="w-[21.5%]" />
                          <col className="w-[21.5%]" />
                          <col className="w-[21.5%]" />
                        </colgroup>
                        <tbody>
                          <tr>
                            <td className="text-start text-[7.2px]">
                              Tên sản phẩm
                              <br />
                              品名
                            </td>
                            <td colSpan={2} className="text-sm font-bold">
                              {item.name}
                            </td>
                            <td>CODE</td>
                            <td className="text-sm font-bold">{item.code}</td>
                          </tr>
                          <tr>
                            <td className="text-start text-[7.2px]">
                              Nguyên liệu
                              <br />
                              原材料
                            </td>
                            <td colSpan={2} className="text-sm">
                              {product.material}
                            </td>
                            <td className="text-[7.2px]">
                              Màu sắc
                              <br />色
                            </td>
                            <td className="text-sm">{product.color}</td>
                          </tr>
                          <tr>
                            <td className="text-start text-[7.2px]">
                              Số lượng
                              <br />
                              数量
                            </td>
                            <td colSpan={4} className="text-sm font-bold">
                              {item.quantity_per_package} PCS
                            </td>
                          </tr>
                          <tr>
                            <td className="text-start text-[7.2px]">
                              Lotno
                              <br />
                              ロット No
                            </td>
                            <td colSpan={4} className="text-sm font-bold">
                              <div className="mx-6 flex items-center justify-between">
                                <p>A</p>
                                <p>-</p>
                                <p>{date.format('DDMMYYYY')}</p>
                                <p>-</p>
                                <p>{shift}</p>
                                <p>-</p>
                                <p>
                                  {(stampList.length > 1
                                    ? stampList[index]
                                    : index + parseInt(startStamp as string)
                                  )
                                    .toString()
                                    .padStart(3, '0')}
                                </p>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td className="text-start text-[7.2px]">
                              Kiểm tra
                              <br />
                              検査
                            </td>
                            <td colSpan={2} className="text-[7.2px]">
                              Kiểm tra 100%
                              <br />
                              檢查(100%)
                            </td>
                            <td colSpan={2} className="text-[7.2px]">
                              Kiểm tra 200%
                              <br />
                              檢查(200%)
                            </td>
                          </tr>
                          <tr className="h-18">
                            <td className="text-start text-[7.2px]">
                              Mộc
                              <br />
                              合格印
                            </td>
                            <td colSpan={2}></td>
                            <td colSpan={2}></td>
                          </tr>
                          <tr>
                            <td className="text-start text-[7.2px]">
                              Người kiểm
                              <br />
                              検査
                            </td>
                            <td colSpan={2}></td>
                            <td colSpan={2}></td>
                          </tr>
                          <tr>
                            <td
                              colSpan={3}
                              className="text-center text-[7.2px]"
                            >
                              Thời gian 時間
                            </td>
                            <td colSpan={2} className="text-[7.2px]">
                              {date.format('DD/MM/YYYY')}{' '}
                              {shift == 1 ? '07:30' : '19:30'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              ))
          : product
            ? // Single layout: 1 stamp per page for all stamps
              (() => {
                // Generate all stamps based on the input
                let allStamps: (string | number)[];

                if (stampList.length > 1) {
                  // For comma-separated stamps
                  allStamps = stampList.slice(0, totalStamp);
                } else {
                  // For sequential stamps
                  allStamps = Array.from(
                    { length: totalStamp },
                    (_, i) => parseInt(startStamp as string) + i
                  );
                }

                // Render each stamp on its own page
                return allStamps.map((stamp, index) => (
                  <div
                    key={`stamp-${index}-${product.code}-${stamp}`}
                    className="stamp-item not-print:mx-auto not-print:mb-8 not-print:max-w-fit not-print:border not-print:border-orange-400 not-print:p-4 print:flex print:items-center print:justify-center"
                  >
                    <table className="text-center">
                      <colgroup>
                        <col className="w-[14%]" />
                        <col className="w-[21.5%]" />
                        <col className="w-[21.5%]" />
                        <col className="w-[21.5%]" />
                        <col className="w-[21.5%]" />
                      </colgroup>
                      <tbody>
                        <tr>
                          <td className="text-start text-[7.2px]">
                            Tên sản phẩm
                            <br />
                            品名
                          </td>
                          <td colSpan={2} className="text-sm font-bold">
                            {product.name}
                          </td>
                          <td>CODE</td>
                          <td className="text-sm font-bold">{product.code}</td>
                        </tr>
                        <tr>
                          <td className="text-start text-[7.2px]">
                            Nguyên liệu
                            <br />
                            原材料
                          </td>
                          <td colSpan={2} className="text-sm">
                            {product.material}
                          </td>
                          <td className="text-[7.2px]">
                            Màu sắc
                            <br />色
                          </td>
                          <td className="text-sm">{product.color}</td>
                        </tr>
                        <tr>
                          <td className="text-start text-[7.2px]">
                            Số lượng
                            <br />
                            数量
                          </td>
                          <td colSpan={4} className="text-sm font-bold">
                            {product.quantity_per_package} PCS
                          </td>
                        </tr>
                        <tr>
                          <td className="text-start text-[7.2px]">
                            Lotno
                            <br />
                            ロット No
                          </td>
                          <td colSpan={4} className="text-sm font-bold">
                            <div className="mx-6 flex items-center justify-between">
                              <p>A</p>
                              <p>-</p>
                              <p>{date.format('DDMMYYYY')}</p>
                              <p>-</p>
                              <p>{shift}</p>
                              <p>-</p>
                              <p>
                                {(typeof stamp === 'string'
                                  ? parseInt(stamp)
                                  : stamp
                                )
                                  .toString()
                                  .padStart(3, '0')}
                              </p>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td className="text-start text-[7.2px]">
                            Kiểm tra
                            <br />
                            検査
                          </td>
                          <td colSpan={2} className="text-[7.2px]">
                            Kiểm tra 100%
                            <br />
                            檢查(100%)
                          </td>
                          <td colSpan={2} className="text-[7.2px]">
                            Kiểm tra 200%
                            <br />
                            檢查(200%)
                          </td>
                        </tr>
                        <tr className="h-18">
                          <td className="text-start text-[7.2px]">
                            Mộc
                            <br />
                            合格印
                          </td>
                          <td colSpan={2}></td>
                          <td colSpan={2}></td>
                        </tr>
                        <tr>
                          <td className="text-start text-[7.2px]">
                            Người kiểm
                            <br />
                            検査
                          </td>
                          <td colSpan={2}></td>
                          <td colSpan={2}></td>
                        </tr>
                        <tr>
                          <td colSpan={3} className="text-center text-[7.2px]">
                            Thời gian 時間
                          </td>
                          <td colSpan={2} className="text-[7.2px]">
                            {date.format('DD/MM/YYYY')}{' '}
                            {shift == 1 ? '07:30' : '19:30'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ));
              })()
            : null}
      </div>
    </>
  );
};
