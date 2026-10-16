import { QueryParams } from '@/types/queryParams';
import AppButton from '@components/common/AppButton';
import { IconExport } from '@components/icons';
import { productService } from '@services/ProductService';
import { getMonthlyQuantities } from '@services/TotalQuantityService';
import { useMutation } from '@tanstack/react-query';
import { calculateTotalProduct } from '@utils/calculateTotalProduct';
import { DatePicker, Modal } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useState } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { getWeeksInMonth } from '@utils/weeksInMonth';
import {
  errorDataSource,
  produceDataSource,
  weeklyDataSource
} from '@utils/poDataUtil';

export const ExportPoModal = () => {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Dayjs>(dayjs());

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const { mutate, isPending } = useMutation({
    mutationKey: ['exportPo'],
    mutationFn: async (params: QueryParams) => {
      const response = await productService.list(params);
      const { data } = response;
      const [monthlyQuantitiesStatus8, monthlyQuantitiesStatus3] =
        await Promise.all([
          getMonthlyQuantities({ limit: 0, status: 8 }),
          getMonthlyQuantities({ limit: 0, status: 3 })
        ]);
      const summaryData = calculateTotalProduct(
        data,
        [...monthlyQuantitiesStatus8, ...monthlyQuantitiesStatus3],
        month.format('YYYY-MM')
      );

      const dateHeaders: string[] = [];
      const daysInMonth = dayjs(month).daysInMonth();
      const { weeksInMonth, startOfMonth, endOfMonth } = getWeeksInMonth(month);

      dateHeaders.push(
        ...Array.from({ length: daysInMonth }, (_, i) =>
          dayjs(month)
            .date(i + 1)
            .format('DD-MM-YYYY')
        )
      );

      const weekConfig: {
        key: string;
        name: string;
        date: { start: Dayjs; end: Dayjs };
      }[] = Array.from({ length: weeksInMonth }, (_, index) => {
        // Calculate the start and end of the week within the current month
        let weekStart = startOfMonth.startOf('isoWeek').add(index, 'week');
        let weekEnd = weekStart.add(6, 'day');

        // Clamp weekStart and weekEnd to the current month
        if (weekStart.isBefore(startOfMonth)) weekStart = startOfMonth;
        if (weekEnd.isAfter(endOfMonth)) weekEnd = endOfMonth;

        return {
          key: `week_${index + 1}`,
          name: `FAPV Tuần Thứ ${index + 1} - Tháng ${dayjs(month).format('MM-YYYY')}`,
          date: {
            start: weekStart,
            end: weekEnd
          }
        };
      });

      const workbook = new ExcelJS.Workbook();

      const border = {
        top: { style: 'thin' as ExcelJS.BorderStyle },
        right: { style: 'thin' as ExcelJS.BorderStyle },
        bottom: { style: 'thin' as ExcelJS.BorderStyle },
        left: { style: 'thin' as ExcelJS.BorderStyle }
      };

      /**
       * product summary sheet
       */
      const summarySheet = workbook.addWorksheet('TỔNG HỢP');
      summarySheet.views = [
        {
          state: 'frozen',
          xSplit: 2,
          ySplit: 2
        }
      ];
      const titleSummary = summarySheet.getCell(1, 1);
      const headerSummary = summarySheet.getRow(2);

      titleSummary.value = `BẢNG TỔNG HỢP PO THÁNG ${month.format('MM-YYYY')}`;
      titleSummary.font = {
        name: 'Times New Roman',
        size: 9,
        bold: true,
        color: { argb: 'FE0000' }
      };

      headerSummary.values = [
        'STT',
        'TÊN LINH KIỆN',
        'SỐ LƯỢNG CON/THÙNG',
        'SỐ LƯỢNG TỒN ĐẦU KỲ',
        'THỰC TẾ SẢN XUẤT',
        'SỐ LƯỢNG ĐÃ XUẤT',
        'SỐ LƯỢNG ĐÃ KIỂM 200%',
        'SỐ LƯỢNG CHƯA KIỂM 200%',
        'SỐ LƯỢNG TỒN CUỐI KỲ',
        'SỐ NGÀY TỒN KHO'
      ];

      headerSummary.eachCell((cell, colNumber) => {
        cell.font = {
          name: 'Times New Roman',
          size: 9,
          bold: true
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '99CCFF' }
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center'
        };
        cell.border = border;
        summarySheet.getColumn(colNumber).width = 20;

        if (colNumber === 1) {
          summarySheet.getColumn(colNumber).width = 6;
        }
        if (colNumber === 2) {
          summarySheet.getColumn(colNumber).width = 28;
        }
      });

      const summaryFlattenedData: (string | number)[][] = summaryData.map(
        (item, index) => [
          index + 1,
          item.name,
          item.quanEntityBin,
          item.stockStartQuantity,
          item.realityQuantity,
          item.exportQuantity,
          item.checked200,
          item.notCheck200,
          item.stockEndQuantity,
          item.storageTime
        ]
      );

      summaryFlattenedData.forEach((row) => {
        const newRow = summarySheet.addRow(row);
        newRow.eachCell((cell, colNumber) => {
          cell.alignment = {
            vertical: 'middle',
            horizontal: colNumber === 2 ? 'left' : 'center'
          };
          cell.border = border;
          cell.font = {
            name: 'Times New Roman',
            size: 9
          };

          if (colNumber >= 3 && colNumber <= 9) {
            cell.numFmt = '#,##0';
          }
          if (colNumber === 10) {
            cell.numFmt = '#,##0.0';
          }
        });
      });

      /**
       * Product Weekly Sheet
       */
      weekConfig.forEach(({ name, date }) => {
        const sheet = workbook.addWorksheet(name);
        sheet.views = [
          {
            state: 'frozen',
            xSplit: 2,
            ySplit: 2
          }
        ];
        const title = sheet.getCell(1, 1);
        const header = sheet.getRow(2);

        title.value = 'BẢNG KIỂM TRA PO THEO THÁNG';
        title.font = {
          name: 'Times New Roman',
          size: 9,
          bold: true,
          color: { argb: 'FE0000' }
        };

        const daysInRange = date.end.diff(date.start, 'day') + 1;
        header.values = [
          'STT',
          'TÊN LINH KIỆN 部品名称',
          'TỔNG SỐ LƯỢNG TỒN HIỆN TẠI',
          'CÒN LẠI TRONG TUẦN',
          'ĐÃ XUẤT TRONG TUẦN',
          'TỒN ĐẦU TUẦN',
          ...Array.from({ length: daysInRange }, (_, i) =>
            date.start.add(i, 'day').format('DD-MM-YYYY')
          )
        ];

        header.eachCell((cell, colNumber) => {
          cell.font = {
            name: 'Times New Roman',
            size: 9,
            bold: true
          };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '99CCFF' }
          };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = border;
          sheet.getColumn(colNumber).width = 25;

          if (colNumber == 1) {
            sheet.getColumn(colNumber).width = 5;
          }
          if (colNumber == 3) {
            sheet.getColumn(colNumber).width = 30;
          }
        });

        const weeklyData = weeklyDataSource(data, date.start, date.end);
        const weeklyFlattenedData: (string | number)[][] = weeklyData.map(
          (item, index) => [
            index + 1,
            item.name,
            item.totalQuantity,
            item.totalReamingOfWeek,
            item.exportQuantity,
            item.beginOfWeek,
            ...Array.from(
              { length: daysInRange },
              (_, i) =>
                item.times[date.start.add(i, 'day').format('DD-MM-YYYY')]
                  ?.exportQuantity || 0
            )
          ]
        );

        weeklyFlattenedData.forEach((row) => {
          const newRow = sheet.addRow(row);
          newRow.eachCell((cell, colNumber) => {
            cell.alignment = {
              vertical: 'middle',
              horizontal: 'center'
            };
            cell.border = border;
            cell.font = {
              name: 'Times New Roman',
              size: 9
            };

            if (typeof cell.value === 'number') {
              cell.numFmt = '#,##0';
            }
            if (colNumber == 1 || colNumber == 2) {
              cell.font.bold = true;
            }
          });
        });
      });

      /**
       * product daily sheet
       */
      const dailySheet = workbook.addWorksheet('HÀNG NGÀY');

      dailySheet.views = [
        {
          state: 'frozen',
          xSplit: 2,
          ySplit: 3
        }
      ];

      const titleDaily = dailySheet.getCell(1, 1);
      const headerDaily = dailySheet.getRow(2);
      const headerDaily2 = dailySheet.getRow(3);
      const dailyStartCol = 3;

      titleDaily.value = 'NHẬP SẢN LƯỢNG HÀNG NGÀY';
      titleDaily.font = {
        name: 'Times New Roman',
        size: 9,
        bold: true,
        color: { argb: 'FE0000' }
      };

      headerDaily.height = 36;
      headerDaily.values = [
        'TÊN LINH KIỆN',
        'TỔNG CỘNG',
        ...dateHeaders.flatMap((date) => [date, ''])
      ];
      dateHeaders.forEach((_, index) => {
        dailySheet.mergeCells(
          2,
          dailyStartCol + index * 2,
          2,
          dailyStartCol + 1 + index * 2
        );
      });

      headerDaily2.values = [
        '',
        '',
        ...dateHeaders.flatMap(() => ['Ca 1', 'Ca 2'])
      ];

      headerDaily.eachCell((cell, colNumber) => {
        cell.font = {
          name: 'Times New Roman',
          size: 9,
          bold: true
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = border;
        dailySheet.getColumn(colNumber).width = 10;

        if (colNumber == 1 || colNumber == 2) {
          dailySheet.getColumn(colNumber).width = 20;
        }
      });

      headerDaily2.eachCell((cell) => {
        cell.font = {
          name: 'Times New Roman',
          size: 9,
          bold: true
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = border;
      });

      dailySheet.mergeCells(2, 1, 3, 1);
      dailySheet.mergeCells(2, 2, 3, 2);

      const dailyData = produceDataSource(data);
      const dailyFlattenedData: (string | number)[][] = dailyData.map(
        (item) => [
          item.name,
          item.totalQuantity,
          ...dateHeaders.flatMap((date) => [
            item.times[date]?.shift1 || 0,
            item.times[date]?.shift2 || 0
          ])
        ]
      );

      dailyFlattenedData.forEach((row) => {
        const newRow = dailySheet.addRow(row);
        newRow.eachCell((cell, colNumber) => {
          cell.alignment = {
            vertical: 'middle',
            horizontal: 'center'
          };
          cell.border = border;
          cell.font = {
            name: 'Times New Roman',
            size: 9
          };

          if (colNumber >= 2) {
            cell.numFmt = '#,##0';
          }
          if (colNumber == 2) {
            cell.font.bold = true;
          }
          if (colNumber == 1) {
            cell.font.bold = true;
            cell.alignment.horizontal = 'left';
          }
        });
      });

      /**
       * product error sheet
       */
      const errorSheet = workbook.addWorksheet('HÀNG LỖI');

      errorSheet.views = [
        {
          state: 'frozen',
          xSplit: 2,
          ySplit: 2
        }
      ];
      const titleError = errorSheet.getCell(1, 1);
      titleError.value = 'NHẬP LỖI';
      titleError.font = {
        name: 'Times New Roman',
        size: 9,
        bold: true,
        color: { argb: 'FE0000' }
      };

      errorSheet.getRow(2).height = 36;
      errorSheet.getRow(2).values = [
        'TÊN LINH KIỆN',
        'TỔNG CỘNG',
        ...Array.from({ length: daysInMonth }, (_, i) =>
          dayjs(month)
            .date(i + 1)
            .format('DD-MM-YYYY')
        )
      ];
      errorSheet.getRow(2).eachCell((cell, colNumber) => {
        cell.font = {
          name: 'Times New Roman',
          size: 9,
          bold: true
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = border;
        errorSheet.getColumn(colNumber).width = 10;

        if (colNumber == 1 || colNumber == 2) {
          errorSheet.getColumn(colNumber).width = 20;
        }
      });

      const errorData = errorDataSource(data);

      const errorFlattenedData: (string | number)[][] = errorData.map(
        (item) => [
          item.name,
          item.total,
          ...dateHeaders.map((date) => item.times[date]?.quantity || 0)
        ]
      );

      errorFlattenedData.forEach((row) => {
        const newRow = errorSheet.addRow(row);
        newRow.eachCell((cell, colNumber) => {
          cell.alignment = {
            vertical: 'middle',
            horizontal: 'center'
          };
          cell.border = border;
          cell.font = {
            name: 'Times New Roman',
            size: 9
          };

          if (colNumber >= 2) {
            cell.numFmt = '#,##0';
          }
          if (colNumber == 1) {
            cell.alignment.horizontal = 'left';
          }
        });
      });
      // errorData.forEach((item) =>)

      // Generate Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `THEO DÕI PO THÁNG ${dayjs(month).format('MM-YYYY')}_${dayjs().unix()}.xlsx`;
      saveAs(new Blob([buffer]), fileName);
    }
  });

  const handleExport = async () => {
    mutate({
      limit: 0,
      include: [
        'totaldailyquantities',
        'totalmonthquantities',
        'totaldailyquantitiespo',
        'dailyquantities'
      ],
      month: month.format('YYYY-MM')
    });
  };

  return (
    <>
      <AppButton tone="success" icon={<IconExport />} onClick={handleOpen}>
        Export
      </AppButton>
      <Modal
        title={
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-500/20 to-teal-500/20 text-green-600">
              <IconExport />
            </span>
            <div>
              <div className="text-base font-semibold">Xuất PO</div>
              <div className="text-xs font-normal text-gray-400">
                Chọn tháng để xuất file Excel PO
              </div>
            </div>
          </div>
        }
        open={open}
        onOk={handleExport}
        onCancel={handleClose}
        okText="Xuất file"
        cancelText="Hủy"
        loading={isPending}
        styles={{ body: { padding: '16px 24px' } }}
      >
        <div className="space-y-3">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Chọn tháng xuất PO
          </label>
          <DatePicker
            format="DD/MM/YYYY"
            picker="month"
            value={month}
            style={{ width: '100%' }}
            className="!rounded-lg"
            onChange={(date) => (date ? setMonth(date) : setMonth(dayjs()))}
          />
        </div>
      </Modal>
    </>
  );
};
