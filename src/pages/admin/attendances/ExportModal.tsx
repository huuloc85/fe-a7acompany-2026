import { QueryParams } from '@/types/queryParams';
import AppButton from '@components/common/AppButton';
import { IconExport } from '@components/icons';
import { fetchAttendancesCalculated } from '@services/AttendanceService';
import { useMutation } from '@tanstack/react-query';
import { AttendanceResult } from '@utils/attendanceUtil';
import { DatePicker, message, Modal } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useState } from 'react';
import { isOutsideAttendanceWindow } from '@/utils/attendanceWindow';

interface DataType {
  a7a: (string | number)[][];
  vvp: (string | number)[][];
}

export const ExportModal = () => {
  const [open, setOpen] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs(),
    dayjs()
  ]);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const { mutate, isPending } = useMutation({
    mutationKey: ['attendanceData'],
    mutationFn: async (params: QueryParams) => {
      const workbook = new ExcelJS.Workbook();
      const sheetsConfig: { key: keyof DataType; name: string }[] = [
        { key: 'a7a', name: 'A7A' },
        { key: 'vvp', name: 'Vinh Vinh Phát' }
      ];

      // Generate dynamic date headers based on dateRange
      const startDate = dateRange[0];
      const endDate = dateRange[1];
      const dateHeaders: string[] = [];
      let currentDate = startDate;

      while (
        currentDate.isBefore(endDate) ||
        currentDate.isSame(endDate, 'day')
      ) {
        dateHeaders.push(currentDate.format('YYYY-MM-DD'));
        currentDate = currentDate.add(1, 'day');
      }

      const totalColumns = 12 + dateHeaders.length * 3;

      const response = await fetchAttendancesCalculated(params);
      const attendances = response.data;

      // flatten data to each row
      const flattenedData: DataType = {
        a7a: [],
        vvp: []
      };

      const groupByEmployee = attendances.reduce(
        (acc, attendance) => {
          if (!acc[attendance.employee_id]) {
            acc[attendance.employee_id] = [];
          }
          acc[attendance.employee_id].push(attendance);
          return acc;
        },
        {} as Record<string, AttendanceResult[]>
      );
      // console.log('groupByEmployee:', groupByEmployee);

      Object.entries(groupByEmployee).forEach(([employeeId, attendances]) => {
        const company =
          attendances[0].company.toLowerCase() == 'a7a' ? 'a7a' : 'vvp';
        if (!flattenedData[company]) {
          flattenedData[company] = [];
        }
        const totalHours = attendances.reduce(
          (sum, attendance) => sum + attendance.total_hours,
          0
        );
        const totalDayHours = attendances.reduce((sum, attendance) => {
          if (attendance.shift == 1) {
            return sum + attendance.administrative_hours || 0;
          }
          return sum;
        }, 0);
        const totalNightHours = attendances.reduce((sum, attendance) => {
          if (attendance.shift == 2) {
            return sum + attendance.administrative_hours || 0;
          }
          return sum;
        }, 0);

        const totalDayOvertimeHours = attendances.reduce(
          (sum, attendance) =>
            sum + (attendance.shift == 1 ? attendance.overtime_hours || 0 : 0),
          0
        );
        const totalNightOvertimeHours = attendances.reduce(
          (sum, attendance) =>
            sum + (attendance.shift == 2 ? attendance.overtime_hours || 0 : 0),
          0
        );

        const supplyMealDay = attendances.reduce((sum, attendance) => {
          return (
            sum +
            (attendance.shift == 1 && attendance.administrative_hours > 0
              ? 1
              : 0)
          );
        }, 0);
        const supplyMealNight = attendances.reduce((sum, attendance) => {
          return (
            sum +
            (attendance.shift == 2 && attendance.administrative_hours > 0
              ? 1
              : 0)
          );
        }, 0);

        const supplyMealOvertime = attendances.reduce(
          (sum, attendance) =>
            sum + (attendance.administrative_hours >= 8 ? 1 : 0),
          0
        );

        const row: (string | number)[] = [
          flattenedData[company].length + 1,
          attendances[0].name,
          employeeId,
          totalHours,
          totalDayHours,
          totalNightHours,
          totalDayOvertimeHours,
          totalNightOvertimeHours,
          totalDayOvertimeHours + totalNightOvertimeHours,
          supplyMealDay,
          supplyMealNight,
          supplyMealOvertime
        ];
        dateHeaders.forEach((date) => {
          const attendanceForDate = attendances.find((attendance) =>
            dayjs(attendance.date).isSame(dayjs(date), 'day')
          );
          if (attendanceForDate) {
            const day =
              attendanceForDate.shift === 1
                ? ['N', 'LN', 'NN'].includes(attendanceForDate.hnhc ?? '')
                  ? attendanceForDate.administrative_hours || 0
                  : ['D', 'TC', 'X'].includes(attendanceForDate.hnhc ?? '')
                    ? `${attendanceForDate.administrative_hours || 0}\nĐổi lịch`
                    : 0
                : 0;

            const night =
              attendanceForDate.shift === 2
                ? ['D', 'TC'].includes(attendanceForDate.hnhc ?? '')
                  ? attendanceForDate.administrative_hours || 0
                  : ['N', 'LN', 'X', 'NN'].includes(
                        attendanceForDate.hnhc ?? ''
                      )
                    ? `${attendanceForDate.administrative_hours || 0}\nĐổi lịch`
                    : 0
                : 0;

            row.push(
              day, // Ngày
              night, // Đêm
              attendanceForDate.overtime_hours || 0 // Tăng Ca
            );
          } else {
            row.push(0, 0, 0); // No attendance for this date
          }
        });
        flattenedData[company].push(row);
      });

      // console.log('flattenedData:', flattenedData);

      sheetsConfig.forEach(({ key, name }) => {
        const sheet = workbook.addWorksheet(name);

        // Title Row
        sheet.mergeCells(1, 1, 1, totalColumns);
        const titleCell = sheet.getCell(1, 1);
        titleCell.value = `Bảng Chấm Công Từ: ${dayjs(dateRange[0]).format('DD/MM/YYYY')} Đến: ${dayjs(dateRange[1]).format('DD/MM/YYYY')}`;
        titleCell.font = { size: 30, bold: true, color: { argb: 'FFFFFF' } };
        titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
        titleCell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        titleCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '002060' }
        };
        sheet.getRow(1).height = 100;

        sheet.getColumn(1).width = 10; // STT
        sheet.getColumn(2).width = 40; // Tên Nhân Viên
        sheet.getColumn(3).width = 30; // Mã Nhân Viên

        sheet.getRow(2).values = [
          'STT',
          'Tên Nhân Viên',
          'Mã Nhân Viên',
          'Số Công Chính',
          '',
          '',
          'Tổng Giờ Tăng Ca',
          '',
          '',
          'Phụ Cấp Tiền Cơm Ngày',
          'Phụ Cấp Tiền Cơm Đêm',
          'Phụ Cấp Tăng Ca',
          ...dateHeaders.flatMap((date) => [
            dayjs(date).format('DD-MM-YYYY'),
            '',
            ''
          ])
        ];

        sheet.getRow(3).values = [
          '',
          '',
          '',
          'Tổng Giờ Trong Tháng',
          'Tổng Giờ Ngày',
          'Tổng Giờ Đêm',
          'Ngày',
          'Đêm',
          'Tổng',
          '',
          '',
          '',
          ...dateHeaders.flatMap(() => ['Ngày', 'Đêm', 'TC'])
        ];

        const rows = sheet.getRows(2, 2);
        if (rows) {
          rows.forEach((row) => {
            row.eachCell((cell, colNumber) => {
              cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
              };
              cell.alignment = {
                vertical: 'middle',
                horizontal: 'center',
                wrapText: true
              };
              cell.font = {
                size: 16,
                bold: true,
                color: { argb: 'FFFFFF' },
                name: 'Times New Roman'
              };
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'E26B0A' }
              };
              // Apply font color for each date column dynamically based on dateHeaders
              // The first night column starts at colNumber 14
              const dateColStart = 14;
              const dateColsPerDay = 3;
              const dateColEnd =
                dateColStart + dateHeaders.length * dateColsPerDay - 1;

              if (colNumber >= dateColStart && colNumber <= dateColEnd) {
                const subCol = (colNumber - dateColStart) % dateColsPerDay;
                if (subCol === 0) {
                  cell.font.color = {
                    argb: '000000' // Black for Đêm
                  };
                }
                if (subCol === 1) {
                  cell.font.color = {
                    argb: '0000FF' // Blue for TC
                  };
                }
              }
            });
          });
        }

        // Multi-level Headers
        sheet.mergeCells(2, 1, 3, 1); // A2:A3 (STT)
        sheet.mergeCells(2, 2, 3, 2); // B2:B3
        sheet.mergeCells(2, 3, 3, 3); // C2:C3
        sheet.mergeCells(2, 4, 2, 6); // D2:F2 (Số Công Chính)
        sheet.mergeCells(2, 7, 2, 9); // G2:I2 (Tổng Giờ Tăng Ca)
        sheet.mergeCells(2, 10, 3, 10); // J2:J3
        sheet.mergeCells(2, 11, 3, 11); // K2:K3
        sheet.mergeCells(2, 12, 3, 12); // L2:L3

        // Merge cells for each date in the dateHeaders array
        let startCol = 13;
        dateHeaders.forEach(() => {
          sheet.mergeCells(2, startCol, 2, startCol + 2);
          startCol += 3;
        });

        flattenedData[key]?.forEach((row: (string | number)[]) => {
          const newRow = sheet.addRow(row);
          newRow.height = 40;
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
            cell.font = { size: 14, name: 'Times New Roman' };

            if (colNumber >= 4 && colNumber < 10) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '8DB4E2' }
              };
            }
            if (colNumber >= 10 && colNumber < 13) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'DA9694' }
              };
              if (colNumber == 10) {
                cell.font.color = { argb: 'FFFFFF' };
              }
              if (colNumber == 12) {
                cell.font.color = { argb: '0000FF' };
              }
            }

            // Date columns start at colNumber 13, each date takes 3 columns (Ngày, Đêm, TC)
            if (colNumber >= 13) {
              const dateColIndex = colNumber - 13;
              const dateIndex = Math.floor(dateColIndex / 3);
              const subCol = dateColIndex % 3;
              // Alternate background color for each date group
              const isEvenDate = dateIndex % 2 === 0;
              cell.font.size = 12;
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: isEvenDate ? '76933C' : 'FF66FF' }
              };
              // Font color for TC (third column of each date group)
              if (subCol === 2) {
                cell.font.color = { argb: '0000FF' }; // Blue for TC
              } else {
                cell.font.color = { argb: 'FFFFFF' };
              }
            }
          });
        });

        // freeze the row and column
        sheet.views = [
          {
            state: 'frozen',
            xSplit: 12,
            ySplit: 3
          }
        ];
      });

      // Export the File
      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `Bảng tính công từ ${dayjs(dateRange[0]).format('DD-MM-YYYY')} đến ${dayjs(dateRange[1]).format('DD-MM-YYYY')}_${dayjs().unix()}.xlsx`;
      saveAs(new Blob([buffer]), fileName);
    },
    onSuccess: () => {
      message.success({
        key: 'export',
        content: 'Xuất dữ liệu thành công!'
      });
    },
    onMutate: () => {
      message.loading({
        key: 'export',
        content: 'Đang xuất dữ liệu...'
      });
    },
    onError: () => {
      message.error({
        key: 'export',
        content: 'Xuất dữ liệu thất bại!'
      });
    }
  });

  const handleExport = () => {
    if (dateRange.some(isOutsideAttendanceWindow)) {
      message.warning(
        'Chỉ xuất bảng công trong 3 tháng gần nhất. Dữ liệu cũ dùng Tra cứu công lưu trữ.'
      );
      return;
    }
    mutate({
      limit: 0,
      'filter[date_between]': `${dayjs(dateRange[0]).format('YYYY-MM-DD')},${dayjs(dateRange[1]).format('YYYY-MM-DD')}`
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
        <DatePicker.RangePicker
          disabledDate={isOutsideAttendanceWindow}
          style={{ width: '100%' }}
          placeholder={['Từ ngày', 'Đến ngày']}
          format="YYYY-MM-DD"
          inputReadOnly
          value={dateRange}
          onChange={(dateRange) => {
            if (dateRange && dateRange[0] && dateRange[1]) {
              setDateRange([dayjs(dateRange[0]), dayjs(dateRange[1])]);
              return;
            }

            setDateRange([dayjs(), dayjs()]);
          }}
        />
      </Modal>
    </>
  );
};
