import axiosPrivate from '@/api/axiosInstance';
import { QueryParams } from '@/types/queryParams';
import AppButton from '@components/common/AppButton';
import { IconExport } from '@components/icons';
import { productModelEnum } from '@schemas/product/productModelEnum.enum';
import { productService } from '@services/ProductService';
import { getMonthlyQuantities } from '@services/TotalQuantityService';
import { useMutation, useQuery } from '@tanstack/react-query';
import { calculateCheck200Product } from '@utils/calculateCheck200Product';
import { calculateError200Product } from '@utils/calculateError200Product';
import { calculateExportProduct } from '@utils/calculateExportProduct';
import { calculateProduceProduct } from '@utils/calculateProduceProduct';
import { calculateTotalProduct } from '@utils/calculateTotalProduct';
import { DatePicker, Modal } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useMemo, useState } from 'react';

export const ExportModal = () => {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Dayjs>(dayjs().startOf('month'));

  const handleOpen = () => {
    setOpen(true);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  // fetch data for export
  const { data: monthList } = useQuery<{ months: string[] }>({
    queryKey: ['months'],
    queryFn: () => {
      return axiosPrivate.get('/api/products/month-list');
    }
  });
  const months = useMemo(
    () => (monthList?.months || []).slice().reverse(),
    [monthList]
  );

  const { data: monthlyQuantities } = useQuery({
    queryKey: ['month-quantities', 'po-export'],
    queryFn: () => {
      return getMonthlyQuantities({ limit: 0, status: 8 });
    }
  });

  const { mutate, isPending } = useMutation({
    mutationKey: ['products'],
    mutationFn: async (params: QueryParams) => {
      const response = await productService.list(params);

      const { data: products } = response;

      // Process data for export
      const fapvData = calculateTotalProduct(
        products,
        monthlyQuantities ?? [],
        dayjs(month).format('YYYY-MM')
      );
      const produceData = calculateProduceProduct(products);
      const exportData = calculateExportProduct(products);
      const check200Data = calculateCheck200Product(products);
      const error200Data = calculateError200Product(products);

      const workbook = new ExcelJS.Workbook();
      const fapvSheet = workbook.addWorksheet('FAPV');
      const produceSheet = workbook.addWorksheet('HÀNG SẢN XUẤT');
      const check200Sheet = workbook.addWorksheet('HÀNG KIỂM 200%');
      const exportSheet = workbook.addWorksheet('XUẤT HÀNG');
      const error200Sheet = workbook.addWorksheet('HÀNG LỖI');

      /**
       * FAPV Sheet
       */
      const numberOfModelEnum = productModelEnum.options.length;
      const totalColumnsFapvSheet = 12 + numberOfModelEnum + 7 + months.length;

      fapvSheet.views = [
        {
          state: 'frozen',
          xSplit: 2,
          ySplit: 1
        }
      ];

      fapvSheet.getRow(1).height = 90;
      fapvSheet.getRow(1).values = [
        'MÃ LINH KIỆN',
        'TÊN LINH KIỆN\n部品名称',
        'SẢN LƯỢNG\n(MOQ)',
        'THUNG CATON/THANG\n(MOQ)',
        'Kích thước khuôn\n金型サイズ',
        'Số CAV(cái/ shot)\n取り数（個/ショット）',
        'Chu kì(s/shot)\nサイクル時間（秒/ショット）',
        'Dự định Thời gian hoạt đông thiết bị(ngày/tháng)\n計画 設備負荷（日/月）',
        'Thực tế Thời gian hoạt đông thiết bị(ngày/tháng)\n実績 設備負荷（日/月）',
        'FAPV出荷（対象品 〇表示）',
        'FASV出荷（対象品 〇表示）',
        'FAVV出荷（対象品 〇表示）',
        ...productModelEnum.options.map((option) => option),
        // box types
        'SỐ LƯỢNG HÀNG ĐÃ KIỂM 200%',
        'TỔNG THỰC TẾ SẢN XUẤT(cái/tháng)\n総計製造実績（個/月）',
        'TỔNG SỐ LƯỢNG ĐÃ XUẤT',
        'SỐ LƯỢNG HÀNG ĐÃ KIỂM 200%',
        'SỐ LƯỢNG HÀNG CHƯA KIỂM 200%',
        'TỔNG SỐ LƯỢNG TỒN CUỐI KỲ',
        'SỐ NGÀY TỒN KHO',
        // months
        ...(months.map(
          (month) =>
            `SỐ LƯỢNG\n\nĐÃ XUẤT\n${dayjs(month, 'MM-YYYY').format('MM-YYYY')}`
        ) || [])
      ];
      fapvSheet.getRow(1).eachCell((cell, colNumber) => {
        cell.font = { name: 'VNI-Times', size: 9, bold: true };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF00' }
        };

        fapvSheet.getColumn(colNumber).width = 20;

        if (colNumber == 5 || colNumber == 6) {
          cell.fill.fgColor = { argb: '00B050' };
        }
        if (colNumber >= 13 && colNumber <= 12 + numberOfModelEnum) {
          cell.fill.fgColor = { argb: '00B050' };
          cell.alignment.textRotation = 90;
          fapvSheet.getColumn(colNumber).width = 11;
        }
        if (
          colNumber >= 13 + numberOfModelEnum &&
          colNumber <= 12 + numberOfModelEnum + 7
        ) {
          cell.fill.fgColor = { argb: 'D9E1F2' };
          cell.alignment.vertical = 'bottom';
          cell.alignment.textRotation = 90;
          fapvSheet.getColumn(colNumber).width = 11;
        }
        if (
          colNumber >= 13 + numberOfModelEnum + 7 &&
          colNumber <= 12 + numberOfModelEnum + 7 + months.length
        ) {
          cell.fill.fgColor = { argb: 'FFF2CC' };
          fapvSheet.getColumn(colNumber).width = 11;
        }
      });

      const fapvFlattenedData: (string | number)[][] = fapvData.map((item) => [
        item.code,
        item.name,
        item.stockMOQ,
        item.catonQuantity,
        item.moldSize,
        item.CAV,
        item.cycle,
        item.planTime,
        item.realTime,
        item.FAPV ? '〇' : '',
        item.FASV ? '〇' : '',
        item.FAVV ? '〇' : '',
        ...productModelEnum.options.map((option) =>
          item.binCode === option ? item.quanEntityBin : ''
        ),
        item.stockStartQuantity,
        item.realityQuantity,
        item.exportQuantity,
        item.checked200,
        item.notCheck200,
        item.stockEndQuantity,
        item.storageTime,
        ...(months.map(
          (month) =>
            item.times[dayjs(month, 'MM-YYYY').format('MM-YYYY')]?.quantity || 0
        ) || [])
      ]);

      fapvFlattenedData.forEach((row) => {
        const newRow = fapvSheet.addRow(row);
        newRow.height = 15;
        newRow.eachCell((cell, colNumber) => {
          cell.alignment = {
            vertical: 'middle',
            wrapText: true
          };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          cell.font = { name: 'Times New Roman', size: 9 };
          if (colNumber >= 10 && colNumber <= 12) {
            cell.alignment.horizontal = 'center';
          }
          if (colNumber >= 5 && colNumber <= 7) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF2CC' }
            };
          }
          if (colNumber == 8 || colNumber == 9) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'CCFFFF' }
            };
          }
          if (
            colNumber == 3 ||
            colNumber == 4 ||
            (colNumber >= 6 && colNumber <= 9) ||
            colNumber >= 13
          ) {
            cell.numFmt = '#,##0';
          }
          if (
            (colNumber >= 7 && colNumber <= 9) ||
            colNumber == totalColumnsFapvSheet - months.length
          ) {
            cell.numFmt = '#,##0.0';
          }
        });
      });

      /**
       * check 200 Sheet
       */

      const totalColumnsCheck200Sheet = 3 + dayjs(month).daysInMonth();

      check200Sheet.views = [
        {
          state: 'frozen',
          xSplit: 3,
          ySplit: 2
        }
      ];

      // Title row
      check200Sheet.mergeCells(1, 1, 1, totalColumnsCheck200Sheet);
      const titleCellCheck200Sheet = check200Sheet.getCell(1, 1);
      titleCellCheck200Sheet.value = 'NHẬP HÀNG 200%';
      titleCellCheck200Sheet.font = {
        name: 'Times New Roman',
        size: 9,
        bold: true,
        color: { argb: 'FE0000' }
      };
      titleCellCheck200Sheet.alignment = {
        horizontal: 'left',
        vertical: 'middle'
      };
      titleCellCheck200Sheet.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Header row
      const headRowCheck200Sheet = check200Sheet.getRow(2);
      headRowCheck200Sheet.height = 40;
      headRowCheck200Sheet.values = [
        'Tên linh kiện',
        'Tồn đầu kỳ hàng 200%',
        'Phát sinh kiểm hàng 200%',
        ...Array.from({ length: dayjs(month).daysInMonth() }, (_, i) =>
          dayjs(month)
            .date(i + 1)
            .format('DD-MM-YYYY')
        )
      ];
      headRowCheck200Sheet.eachCell((cell, colNumber) => {
        cell.font = { name: 'Times New Roman', size: 9, bold: true };
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        check200Sheet.getColumn(colNumber).width = 10;
        if (colNumber === 1) {
          check200Sheet.getColumn(colNumber).width = 20;
          cell.alignment.horizontal = 'left';
        }
      });

      const check200FlattenedData: (string | number)[][] = check200Data.map(
        (item) => [
          item.name,
          item.startStock,
          item.incurred,
          ...Array.from(
            { length: dayjs(month).daysInMonth() },
            (_, i) =>
              item.times[
                dayjs(month)
                  .date(i + 1)
                  .format('DD-MM-YYYY')
              ]?.quantity ?? 0
          )
        ]
      );

      check200FlattenedData.forEach((row) => {
        const newRow = check200Sheet.addRow(row);
        newRow.height = 15;
        newRow.eachCell((cell, colNumber) => {
          cell.alignment = {
            vertical: 'middle',
            horizontal: 'center',
            wrapText: true
          };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          cell.font = { name: 'Times New Roman', size: 9 };
          if (colNumber === 1) {
            cell.alignment.horizontal = 'left';
          }
          if (colNumber >= 2) {
            cell.numFmt = '#,##0';
          }
        });
      });

      /**
       *  Produce Sheet
       */
      const totalColumnsProduceSheet = 2 + dayjs(month).daysInMonth();

      produceSheet.views = [
        {
          state: 'frozen',
          xSplit: 2,
          ySplit: 2
        }
      ];

      // Title row
      produceSheet.mergeCells(1, 1, 1, totalColumnsProduceSheet);
      const titleCellProduceSheet = produceSheet.getCell(1, 1);
      titleCellProduceSheet.value = 'NHẬP HÀNG CHƯA KIỂM 200%';
      titleCellProduceSheet.font = {
        name: 'Times New Roman',
        size: 9,
        bold: true,
        color: { argb: 'FE0000' }
      };
      titleCellProduceSheet.alignment = {
        horizontal: 'left',
        vertical: 'middle'
      };
      titleCellProduceSheet.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Header row
      const headRowProduceSheet = produceSheet.getRow(2);
      headRowProduceSheet.height = 40;
      headRowProduceSheet.values = [
        'Tên linh kiện',
        'Tổng cộng',
        ...Array.from({ length: dayjs(month).daysInMonth() }, (_, i) =>
          dayjs(month)
            .date(i + 1)
            .format('DD-MM-YYYY')
        )
      ];
      headRowProduceSheet.eachCell((cell, colNumber) => {
        cell.font = { name: 'Times New Roman', size: 9, bold: true };
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        produceSheet.getColumn(colNumber).width = 10;
        if (colNumber === 1) {
          produceSheet.getColumn(colNumber).width = 20;
          cell.alignment.horizontal = 'left';
        }
      });

      const produceFlattenedData: (string | number)[][] = produceData.map(
        (item) => [
          item.name,
          item.total,
          ...Array.from({ length: dayjs(month).daysInMonth() }, (_, i) => {
            return (
              (item.times[
                dayjs(month)
                  .date(i + 1)
                  .format('DD-MM-YYYY')
              ]?.shift1 || 0) +
              (item.times[
                dayjs(month)
                  .date(i + 1)
                  .format('DD-MM-YYYY')
              ]?.shift2 || 0)
            );
          })
        ]
      );

      produceFlattenedData.forEach((row) => {
        const newRow = produceSheet.addRow(row);
        newRow.height = 15;
        newRow.eachCell((cell, colNumber) => {
          cell.alignment = {
            vertical: 'middle',
            wrapText: true
          };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          cell.font = { name: 'Times New Roman', size: 9 };
          if (colNumber === 1) {
            cell.alignment.horizontal = 'left';
          }
          if (colNumber >= 2) {
            cell.numFmt = '#,##0';
          }
        });
      });

      /**
       * Export Sheet
       */

      const totalColumnsExport = 2 + dayjs(month).daysInMonth();

      exportSheet.views = [
        {
          state: 'frozen',
          xSplit: 2,
          ySplit: 2
        }
      ];

      // Title row
      exportSheet.mergeCells(1, 1, 1, totalColumnsExport);
      const titleCellExportSheet = exportSheet.getCell(1, 1);
      titleCellExportSheet.value = 'NHẬP LỖI';
      titleCellExportSheet.font = {
        name: 'Times New Roman',
        size: 9,
        bold: true,
        color: { argb: 'FE0000' }
      };
      titleCellExportSheet.alignment = {
        horizontal: 'left',
        vertical: 'middle'
      };
      titleCellExportSheet.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Header row
      const headRowExportSheet = exportSheet.getRow(2);
      headRowExportSheet.height = 40;
      headRowExportSheet.values = [
        'Tên linh kiện',
        'Tổng cộng',
        ...Array.from({ length: dayjs(month).daysInMonth() }, (_, i) =>
          dayjs(month)
            .date(i + 1)
            .format('DD-MM-YYYY')
        )
      ];
      headRowExportSheet.eachCell((cell, colNumber) => {
        cell.font = { name: 'Times New Roman', size: 9, bold: true };
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        exportSheet.getColumn(colNumber).width = 10;
        if (colNumber === 1) {
          exportSheet.getColumn(colNumber).width = 20;
          cell.alignment.horizontal = 'left';
        }
      });

      const exportFlattenedData: (string | number)[][] = exportData.map(
        (item) => [
          item.name,
          item.total,
          ...Array.from(
            { length: dayjs(month).daysInMonth() },
            (_, i) =>
              item.times[
                dayjs(month)
                  .date(i + 1)
                  .format('DD-MM-YYYY')
              ]?.quantity || 0
          )
        ]
      );
      exportFlattenedData.forEach((row) => {
        const newRow = exportSheet.addRow(row);
        newRow.height = 15;
        newRow.eachCell((cell, colNumber) => {
          cell.alignment = {
            vertical: 'middle',
            wrapText: true
          };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          cell.font = { name: 'Times New Roman', size: 9 };
          if (colNumber === 1) {
            cell.alignment.horizontal = 'left';
          }
          if (colNumber >= 2) {
            cell.numFmt = '#,##0';
          }
        });
      });

      /**
       * Error Sheet
       */

      const totalColumnsError200 = 2 + dayjs(month).daysInMonth();

      error200Sheet.views = [
        {
          state: 'frozen',
          xSplit: 2,
          ySplit: 2
        }
      ];

      // Title row
      error200Sheet.mergeCells(1, 1, 1, totalColumnsError200);
      const titleCellError200Sheet = error200Sheet.getCell(1, 1);
      titleCellError200Sheet.value = 'NHẬP LỖI';
      titleCellError200Sheet.font = {
        name: 'Times New Roman',
        size: 9,
        bold: true,
        color: { argb: 'FE0000' }
      };
      titleCellError200Sheet.alignment = {
        horizontal: 'left',
        vertical: 'middle'
      };
      titleCellError200Sheet.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Header row
      const headRowError200Sheet = error200Sheet.getRow(2);
      headRowError200Sheet.height = 40;
      headRowError200Sheet.values = [
        'Tên linh kiện',
        'Tổng cộng',
        ...Array.from({ length: dayjs(month).daysInMonth() }, (_, i) =>
          dayjs(month)
            .date(i + 1)
            .format('DD-MM-YYYY')
        )
      ];
      headRowError200Sheet.eachCell((cell, colNumber) => {
        cell.font = { name: 'Times New Roman', size: 9, bold: true };
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        error200Sheet.getColumn(colNumber).width = 10;
        if (colNumber === 1) {
          error200Sheet.getColumn(colNumber).width = 20;
          cell.alignment.horizontal = 'left';
        }
      });

      const error200FlattenedData: (string | number)[][] = error200Data.map(
        (item) => [
          item.name,
          item.total,
          ...Array.from(
            { length: dayjs(month).daysInMonth() },
            (_, i) =>
              item.times[
                dayjs(month)
                  .date(i + 1)
                  .format('DD-MM-YYYY')
              ]?.quantity || 0
          )
        ]
      );
      error200FlattenedData.forEach((row) => {
        const newRow = error200Sheet.addRow(row);
        newRow.height = 15;
        newRow.eachCell((cell, colNumber) => {
          cell.alignment = {
            vertical: 'middle',
            wrapText: true
          };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          cell.font = { name: 'Times New Roman', size: 9 };
          if (colNumber === 1) {
            cell.alignment.horizontal = 'left';
          }
          if (colNumber >= 2) {
            cell.numFmt = '#,##0';
          }
        });
      });

      // Export File
      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `コピーFAVV_REQ_-TON-KHO-THANG-${dayjs(month).format('MM-YYYY')}_${dayjs().unix()}.xlsx`;
      saveAs(new Blob([buffer]), fileName);
    }
  });
  // end fetch data for export

  const handleExport = async () => {
    mutate({
      page: 1,
      limit: 0,
      include: [
        'totaldailyquantities',
        'totalmonthquantities',
        'dailyquantities',
        'totaldailyquantitiespo'
      ],
      month: dayjs(month).format('YYYY-MM')
    });
  };

  return (
    <>
      <AppButton tone="success" icon={<IconExport />} onClick={handleOpen}>
        Xuất excel
      </AppButton>
      <Modal
        title="Xuất Data"
        open={open}
        onOk={handleExport}
        onCancel={handleCancel}
        okText="Xuất"
        loading={isPending}
        maskClosable={false}
        closable={false}
      >
        <DatePicker
          style={{ width: '100%' }}
          placeholder={'Chọn tháng'}
          picker="month"
          format="MM/YYYY"
          value={month}
          onChange={(value) => {
            setMonth(value ? value.startOf('month') : dayjs().startOf('month'));
          }}
        />
      </Modal>
    </>
  );
};
