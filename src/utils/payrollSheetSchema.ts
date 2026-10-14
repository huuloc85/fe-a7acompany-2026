// Header structure only, transcribed from the supplied VVP workbook. No employee data.
export interface SheetHeader {
  column: number;
  label: string;
  colSpan: number;
  rowSpan: number;
}
export interface PayrollSheetSchema {
  name: string;
  hidden: boolean;
  headerRow: number;
  dataRow: number;
  columnCount: number;
  headers: SheetHeader[][];
}
export const payrollSheetSchema: PayrollSheetSchema[] = [
  {
    name: 'Kangatang',
    hidden: true,
    headerRow: 1,
    dataRow: 2,
    columnCount: 0,
    headers: [[]]
  },
  {
    name: 'Menu',
    hidden: true,
    headerRow: 1,
    dataRow: 2,
    columnCount: 0,
    headers: [[]]
  },
  {
    name: 'Danh muc',
    hidden: false,
    headerRow: 7,
    dataRow: 8,
    columnCount: 12,
    headers: [
      [
        { column: 1, label: 'Stt', colSpan: 1, rowSpan: 1 },
        { column: 2, label: 'Mã NV', colSpan: 1, rowSpan: 1 },
        { column: 3, label: 'Tên NV', colSpan: 1, rowSpan: 1 },
        { column: 4, label: 'Bộ phận', colSpan: 1, rowSpan: 1 },
        { column: 5, label: 'Số tài khoản', colSpan: 1, rowSpan: 1 },
        { column: 6, label: 'Lương căn bản', colSpan: 1, rowSpan: 1 },
        { column: 7, label: 'Phụ cấp trách nhiệm', colSpan: 1, rowSpan: 1 },
        { column: 8, label: 'Phụ cấp nhà ở/ ngày', colSpan: 1, rowSpan: 1 },
        { column: 9, label: 'Hỗ trợ đi lại/ ngày', colSpan: 1, rowSpan: 1 },
        { column: 10, label: 'Phụ cấp cơm trưa/ ngày', colSpan: 1, rowSpan: 1 },
        { column: 11, label: 'Chuyên cần', colSpan: 1, rowSpan: 1 },
        {
          column: 12,
          label: 'Lương CB chính thức/ 26 ngày',
          colSpan: 1,
          rowSpan: 1
        }
      ]
    ]
  },
  {
    name: 'Tiền lễ 2-9',
    hidden: true,
    headerRow: 7,
    dataRow: 8,
    columnCount: 7,
    headers: [
      [
        { column: 1, label: 'Stt', colSpan: 1, rowSpan: 1 },
        { column: 2, label: 'Mã NV', colSpan: 1, rowSpan: 1 },
        { column: 3, label: 'Họ và tên', colSpan: 1, rowSpan: 1 },
        { column: 4, label: '', colSpan: 1, rowSpan: 1 },
        { column: 5, label: 'Bộ phận', colSpan: 1, rowSpan: 1 },
        { column: 6, label: 'Số ngân hàng', colSpan: 1, rowSpan: 1 },
        { column: 7, label: 'Số tiền lễ', colSpan: 1, rowSpan: 1 }
      ]
    ]
  },
  {
    name: 'Tính lương',
    hidden: false,
    headerRow: 7,
    dataRow: 8,
    columnCount: 47,
    headers: [
      [
        { column: 1, label: 'Stt', colSpan: 1, rowSpan: 1 },
        { column: 2, label: 'Mã NV', colSpan: 1, rowSpan: 1 },
        { column: 3, label: 'Tên NV', colSpan: 1, rowSpan: 1 },
        { column: 4, label: 'Bộ phận', colSpan: 1, rowSpan: 1 },
        { column: 5, label: 'Số công ngày', colSpan: 1, rowSpan: 1 },
        { column: 6, label: 'Lương ca ngày', colSpan: 1, rowSpan: 1 },
        { column: 7, label: 'Số công đêm', colSpan: 1, rowSpan: 1 },
        { column: 8, label: 'Lương ca đêm (130%)', colSpan: 1, rowSpan: 1 },
        { column: 9, label: 'Số giờ tăng ca ngày', colSpan: 1, rowSpan: 1 },
        {
          column: 10,
          label: 'Lương tăng ca ngày (150%)',
          colSpan: 1,
          rowSpan: 1
        },
        { column: 11, label: 'Số giờ tăng ca  đêm', colSpan: 1, rowSpan: 1 },
        {
          column: 12,
          label: 'Lương tăng ca đêm ( 170%)',
          colSpan: 1,
          rowSpan: 1
        },
        { column: 13, label: 'Số ngày phụ cấp', colSpan: 1, rowSpan: 1 },
        { column: 14, label: 'Phụ cấp nhà ở', colSpan: 1, rowSpan: 1 },
        { column: 15, label: 'Phụ cấp đi lại', colSpan: 1, rowSpan: 1 },
        { column: 16, label: 'Phụ cấp cơm', colSpan: 1, rowSpan: 1 },
        { column: 17, label: 'Số ngày ngừng việc', colSpan: 1, rowSpan: 1 },
        {
          column: 18,
          label: 'Tiền ngừng việc (100% )',
          colSpan: 1,
          rowSpan: 1
        },
        { column: 19, label: 'Số ngày lễ/ tết', colSpan: 1, rowSpan: 1 },
        { column: 20, label: 'Tiền lễ/ tết', colSpan: 1, rowSpan: 1 },
        { column: 21, label: 'Số ngày hiếu/ hỷ', colSpan: 1, rowSpan: 1 },
        { column: 22, label: 'Tiền hiếu/ hỷ', colSpan: 1, rowSpan: 1 },
        { column: 23, label: 'Ghi chú', colSpan: 1, rowSpan: 1 },
        { column: 24, label: 'Có phép', colSpan: 1, rowSpan: 1 },
        { column: 25, label: 'Không phép', colSpan: 1, rowSpan: 1 },
        { column: 26, label: 'Chuyên cần', colSpan: 1, rowSpan: 1 },
        { column: 27, label: 'Số giờ hành kinh', colSpan: 1, rowSpan: 1 },
        { column: 28, label: 'Phụ cấp hành kinh', colSpan: 1, rowSpan: 1 },
        { column: 29, label: 'Thưởng chuyên cần quý', colSpan: 1, rowSpan: 1 },
        {
          column: 30,
          label: 'Tiền giới thiệu nhân sự',
          colSpan: 1,
          rowSpan: 1
        },
        { column: 31, label: 'Tổng thu nhập', colSpan: 1, rowSpan: 1 },
        { column: 32, label: 'Đóng đoàn phí (0.5%)', colSpan: 1, rowSpan: 1 },
        { column: 33, label: 'BHXH (8%)', colSpan: 1, rowSpan: 1 },
        { column: 34, label: 'BHYT (1.5%)', colSpan: 1, rowSpan: 1 },
        { column: 35, label: 'BHTN (1%)', colSpan: 1, rowSpan: 1 },
        { column: 36, label: 'Giảm trừ bản thân', colSpan: 1, rowSpan: 1 },
        { column: 37, label: 'Giảm trừ phụ thuộc', colSpan: 1, rowSpan: 1 },
        { column: 38, label: 'Thu nhập miễn thuế', colSpan: 1, rowSpan: 1 },
        { column: 39, label: 'Thu nhập tính thuế', colSpan: 1, rowSpan: 1 },
        { column: 40, label: 'Thuế TNCN', colSpan: 1, rowSpan: 1 },
        { column: 41, label: 'Thực lãnh', colSpan: 1, rowSpan: 1 },
        { column: 42, label: 'NLĐ đóng BHXH 10.5%', colSpan: 1, rowSpan: 1 },
        { column: 43, label: 'CTY đóng BHXH 21.5%', colSpan: 1, rowSpan: 1 },
        { column: 44, label: 'KPCĐ 2%', colSpan: 1, rowSpan: 1 },
        { column: 45, label: 'Thu nhập bổ sung', colSpan: 1, rowSpan: 1 },
        { column: 46, label: 'Tạm ứng', colSpan: 1, rowSpan: 1 },
        { column: 47, label: 'Khấu trừ khác', colSpan: 1, rowSpan: 1 }
      ]
    ]
  },
  {
    name: ' Bảng nhập công',
    hidden: false,
    headerRow: 6,
    dataRow: 8,
    columnCount: 106,
    headers: [
      [
        { column: 1, label: 'Stt', colSpan: 1, rowSpan: 2 },
        { column: 2, label: 'Mã NV', colSpan: 1, rowSpan: 2 },
        { column: 3, label: 'Tên NV', colSpan: 1, rowSpan: 2 },
        { column: 4, label: 'Bộ phận', colSpan: 1, rowSpan: 2 },
        { column: 5, label: 'Số giờ làm ca ngày', colSpan: 1, rowSpan: 2 },
        { column: 6, label: 'Số công ngày', colSpan: 1, rowSpan: 2 },
        { column: 7, label: 'Số giờ làm ca đêm', colSpan: 1, rowSpan: 2 },
        { column: 8, label: 'Số công đêm', colSpan: 1, rowSpan: 2 },
        { column: 9, label: 'Số giờ tăng ca ngày', colSpan: 1, rowSpan: 2 },
        { column: 10, label: 'Số giờ tăng ca  đêm', colSpan: 1, rowSpan: 2 },
        { column: 11, label: '2026-08-16 00:00:00', colSpan: 3, rowSpan: 1 },
        { column: 14, label: '2026-08-17 00:00:00', colSpan: 3, rowSpan: 1 },
        { column: 17, label: '2026-08-18 00:00:00', colSpan: 3, rowSpan: 1 },
        { column: 20, label: '2026-08-19 00:00:00', colSpan: 3, rowSpan: 1 },
        { column: 23, label: '2026-08-20 00:00:00', colSpan: 3, rowSpan: 1 },
        { column: 26, label: '2026-08-21 00:00:00', colSpan: 3, rowSpan: 1 },
        { column: 29, label: '2026-08-22 00:00:00', colSpan: 3, rowSpan: 1 },
        { column: 32, label: '2026-08-23 00:00:00', colSpan: 3, rowSpan: 1 },
        { column: 35, label: '2026-08-24 00:00:00', colSpan: 3, rowSpan: 1 },
        { column: 38, label: '2026-08-25 00:00:00', colSpan: 3, rowSpan: 1 },
        { column: 41, label: '2026-08-26 00:00:00', colSpan: 3, rowSpan: 1 },
        { column: 44, label: '2026-08-27 00:00:00', colSpan: 3, rowSpan: 1 },
        { column: 47, label: '2026-08-28 00:00:00', colSpan: 3, rowSpan: 1 },
        { column: 50, label: '2026-08-29 00:00:00', colSpan: 3, rowSpan: 1 },
        { column: 53, label: '2026-08-30 00:00:00', colSpan: 3, rowSpan: 1 },
        { column: 56, label: '2026-08-31 00:00:00', colSpan: 3, rowSpan: 1 },
        { column: 59, label: '2026-09-01 00:00:00', colSpan: 3, rowSpan: 1 },
        { column: 62, label: '2026-09-02 00:00:00', colSpan: 3, rowSpan: 1 },
        { column: 65, label: '2026-09-03 00:00:00', colSpan: 3, rowSpan: 1 },
        { column: 68, label: '2026-09-04 00:00:00', colSpan: 3, rowSpan: 1 },
        { column: 71, label: '2026-09-05 00:00:00', colSpan: 3, rowSpan: 1 },
        { column: 74, label: '2026-09-06 00:00:00', colSpan: 3, rowSpan: 1 },
        { column: 77, label: '2026-09-07 00:00:00', colSpan: 3, rowSpan: 1 },
        { column: 80, label: '2026-09-08 00:00:00', colSpan: 3, rowSpan: 1 },
        { column: 83, label: '2026-09-09 00:00:00', colSpan: 3, rowSpan: 1 },
        { column: 86, label: '2026-09-10 00:00:00', colSpan: 3, rowSpan: 1 },
        { column: 89, label: '2026-09-11 00:00:00', colSpan: 3, rowSpan: 1 },
        { column: 92, label: '2026-09-12 00:00:00', colSpan: 3, rowSpan: 1 },
        { column: 95, label: '2026-09-13 00:00:00', colSpan: 3, rowSpan: 1 },
        { column: 98, label: '2026-09-14 00:00:00', colSpan: 3, rowSpan: 1 },
        { column: 101, label: '2026-09-15 00:00:00', colSpan: 3, rowSpan: 1 },
        {
          column: 104,
          label: 'Số ngày tăng cường ngày',
          colSpan: 1,
          rowSpan: 2
        },
        { column: 105, label: 'Ghi chú', colSpan: 1, rowSpan: 2 },
        { column: 106, label: 'Ký tên', colSpan: 1, rowSpan: 2 }
      ],
      [
        { column: 11, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 12, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 13, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        { column: 14, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 15, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 16, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        { column: 17, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 18, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 19, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        { column: 20, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 21, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 22, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        { column: 23, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 24, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 25, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        { column: 26, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 27, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 28, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        { column: 29, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 30, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 31, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        { column: 32, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 33, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 34, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        { column: 35, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 36, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 37, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        { column: 38, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 39, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 40, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        { column: 41, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 42, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 43, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        { column: 44, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 45, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 46, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        { column: 47, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 48, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 49, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        { column: 50, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 51, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 52, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        { column: 53, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 54, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 55, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        { column: 56, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 57, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 58, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        { column: 59, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 60, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 61, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        { column: 62, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 63, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 64, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        { column: 65, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 66, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 67, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        { column: 68, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 69, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 70, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        { column: 71, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 72, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 73, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        { column: 74, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 75, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 76, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        { column: 77, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 78, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 79, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        { column: 80, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 81, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 82, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        { column: 83, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 84, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 85, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        { column: 86, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 87, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 88, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        { column: 89, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 90, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 91, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        { column: 92, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 93, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 94, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        { column: 95, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 96, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 97, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        { column: 98, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 99, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 100, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        { column: 101, label: 'Ngày', colSpan: 1, rowSpan: 1 },
        { column: 102, label: 'Đêm', colSpan: 1, rowSpan: 1 },
        { column: 103, label: 'Tăng ca', colSpan: 1, rowSpan: 1 }
      ]
    ]
  },
  {
    name: 'Bảng tính toán',
    hidden: true,
    headerRow: 7,
    dataRow: 8,
    columnCount: 62,
    headers: [
      [
        { column: 1, label: 'Stt', colSpan: 1, rowSpan: 1 },
        { column: 2, label: 'Mã NV', colSpan: 1, rowSpan: 1 },
        { column: 3, label: 'Họ và Tên', colSpan: 1, rowSpan: 1 },
        { column: 4, label: 'Bộ phận', colSpan: 1, rowSpan: 1 },
        { column: 5, label: 'Lương chính cũ', colSpan: 1, rowSpan: 1 },
        { column: 6, label: 'Lương tăng ca cũ', colSpan: 1, rowSpan: 1 },
        { column: 7, label: 'Chuyên cần', colSpan: 1, rowSpan: 1 },
        { column: 8, label: 'Chuyên môn', colSpan: 1, rowSpan: 1 },
        { column: 9, label: 'Trách nhiệm', colSpan: 1, rowSpan: 1 },
        { column: 10, label: 'Phụ cấp đêm', colSpan: 1, rowSpan: 1 },
        { column: 11, label: 'Phụ cấp cơm trưa', colSpan: 1, rowSpan: 1 },
        {
          column: 12,
          label: 'Lương CB chính thức/ 25 ngày',
          colSpan: 1,
          rowSpan: 1
        },
        { column: 13, label: 'Lương CB/ giờ', colSpan: 1, rowSpan: 1 },
        { column: 14, label: 'Phụ cấp nhà ở/ ngày', colSpan: 1, rowSpan: 1 },
        { column: 15, label: 'Trách nhiệm/ 25 ngày', colSpan: 1, rowSpan: 1 },
        { column: 16, label: 'Hỗ trợ đi lại/ ngày', colSpan: 1, rowSpan: 1 },
        { column: 17, label: 'Phụ cấp tăng ca/ ngày', colSpan: 1, rowSpan: 1 },
        { column: 18, label: 'Phụ cấp cơm trưa/ ngày', colSpan: 1, rowSpan: 1 },
        { column: 19, label: 'Phụ cấp ca đêm (30%)', colSpan: 1, rowSpan: 1 },
        { column: 20, label: 'Phép năm', colSpan: 1, rowSpan: 1 },
        { column: 21, label: 'Tiền phép năm', colSpan: 1, rowSpan: 1 },
        { column: 22, label: 'Ghi chú', colSpan: 1, rowSpan: 1 },
        { column: 23, label: 'Số giờ đi công tác', colSpan: 1, rowSpan: 1 },
        {
          column: 24,
          label: 'Đơn giá đi công tác/ giờ',
          colSpan: 1,
          rowSpan: 1
        },
        { column: 25, label: 'Lương đi công tác GCN', colSpan: 1, rowSpan: 1 },
        { column: 26, label: 'Ghi chú', colSpan: 1, rowSpan: 1 },
        { column: 27, label: 'Số lần đi công tác', colSpan: 1, rowSpan: 1 },
        {
          column: 28,
          label: 'Đơn giá xăng công tác/ ngày',
          colSpan: 1,
          rowSpan: 1
        },
        { column: 29, label: 'Phụ cấp xăng đi GCN', colSpan: 1, rowSpan: 1 },
        { column: 30, label: 'Ghi chú', colSpan: 1, rowSpan: 1 },
        { column: 31, label: 'Tiền giới thiệu người', colSpan: 1, rowSpan: 1 },
        { column: 32, label: 'Ghi chú', colSpan: 1, rowSpan: 1 },
        { column: 33, label: 'Phụ cấp khác', colSpan: 1, rowSpan: 1 },
        { column: 34, label: 'Ghi chú', colSpan: 1, rowSpan: 1 },
        {
          column: 35,
          label: 'Tiền thưởng đạt chuyên cần',
          colSpan: 1,
          rowSpan: 1
        },
        { column: 36, label: 'Ghi chú', colSpan: 1, rowSpan: 1 },
        {
          column: 37,
          label: 'Hoàn tiền KPI tháng trước',
          colSpan: 1,
          rowSpan: 1
        },
        { column: 38, label: 'Ghi chú', colSpan: 1, rowSpan: 1 },
        { column: 39, label: 'Tiền sinh nhật', colSpan: 1, rowSpan: 1 },
        { column: 40, label: 'Ghi chú', colSpan: 1, rowSpan: 1 },
        {
          column: 41,
          label: 'Tiền lương tháng trước bị thiếu',
          colSpan: 1,
          rowSpan: 1
        },
        { column: 42, label: 'Ghi chú', colSpan: 1, rowSpan: 1 },
        { column: 43, label: 'Tổng thu nhập', colSpan: 1, rowSpan: 1 },
        { column: 44, label: 'Khấu trừ BHXH 10.5%', colSpan: 1, rowSpan: 1 },
        { column: 45, label: 'Ghi chú', colSpan: 1, rowSpan: 1 },
        { column: 46, label: 'Tạm ứng', colSpan: 1, rowSpan: 1 },
        { column: 47, label: 'Ghi chú', colSpan: 1, rowSpan: 1 },
        { column: 48, label: 'Phí công đoàn 0.5%', colSpan: 1, rowSpan: 1 },
        { column: 49, label: 'Ghi chú', colSpan: 1, rowSpan: 1 },
        { column: 50, label: 'Số nghỉ có phép', colSpan: 1, rowSpan: 1 },
        { column: 51, label: 'Ghi chú', colSpan: 1, rowSpan: 1 },
        { column: 52, label: 'Số nghỉ không có phép', colSpan: 1, rowSpan: 1 },
        { column: 53, label: 'Ghi chú', colSpan: 1, rowSpan: 1 },
        { column: 54, label: 'Số lỗi nặng', colSpan: 1, rowSpan: 1 },
        { column: 55, label: 'Ghi chú', colSpan: 1, rowSpan: 1 },
        { column: 56, label: 'Số lỗi nhẹ', colSpan: 1, rowSpan: 1 },
        { column: 57, label: 'Ghi chú', colSpan: 1, rowSpan: 1 },
        { column: 58, label: 'Bị trừ KPI tháng này', colSpan: 1, rowSpan: 1 },
        { column: 59, label: 'Ghi chú', colSpan: 1, rowSpan: 1 },
        { column: 60, label: 'Thực lãnh', colSpan: 1, rowSpan: 1 },
        { column: 61, label: 'Hình thức thanh toán', colSpan: 1, rowSpan: 1 },
        {
          column: 62,
          label: 'BHXH (21.5%) công ty đóng cho NLĐ',
          colSpan: 1,
          rowSpan: 1
        }
      ]
    ]
  },
  {
    name: 'Data chấm công',
    hidden: true,
    headerRow: 9,
    dataRow: 11,
    columnCount: 22,
    headers: [
      [
        { column: 1, label: '', colSpan: 1, rowSpan: 1 },
        { column: 2, label: 'NGÀY', colSpan: 1, rowSpan: 2 },
        { column: 3, label: 'ID NHÂN VIÊN', colSpan: 1, rowSpan: 2 },
        { column: 4, label: 'TÊN NHÂN VIÊN', colSpan: 1, rowSpan: 2 },
        { column: 5, label: 'CA LÀM', colSpan: 1, rowSpan: 2 },
        { column: 6, label: 'BỘ PHẬN LÀM VIỆC', colSpan: 1, rowSpan: 2 },
        { column: 7, label: 'GIỜ VÀO', colSpan: 1, rowSpan: 2 },
        { column: 8, label: 'GIỜ RA', colSpan: 1, rowSpan: 2 },
        { column: 9, label: 'CÔNG ( THEO GIỜ)', colSpan: 4, rowSpan: 1 },
        { column: 13, label: '', colSpan: 1, rowSpan: 1 },
        { column: 14, label: 'LỊCH LÀM VIỆC', colSpan: 5, rowSpan: 1 },
        { column: 19, label: '', colSpan: 1, rowSpan: 1 },
        { column: 20, label: 'CẢNH BÁO', colSpan: 3, rowSpan: 1 }
      ],
      [
        { column: 1, label: '', colSpan: 1, rowSpan: 1 },
        { column: 9, label: 'NGÀY', colSpan: 1, rowSpan: 1 },
        { column: 10, label: 'ĐÊM', colSpan: 1, rowSpan: 1 },
        { column: 11, label: 'TĂNG CA', colSpan: 1, rowSpan: 1 },
        { column: 12, label: 'TỔNG GIỜ', colSpan: 1, rowSpan: 1 },
        { column: 13, label: '', colSpan: 1, rowSpan: 1 },
        { column: 14, label: 'NGÀY', colSpan: 1, rowSpan: 1 },
        { column: 15, label: 'ID NHÂN VIÊN', colSpan: 1, rowSpan: 1 },
        { column: 16, label: 'TÊN NHÂN VIÊN', colSpan: 1, rowSpan: 1 },
        { column: 17, label: 'BỘ PHẬN', colSpan: 1, rowSpan: 1 },
        { column: 18, label: 'CA', colSpan: 1, rowSpan: 1 },
        { column: 19, label: '', colSpan: 1, rowSpan: 1 },
        { column: 20, label: 'ID NHÂN VIÊN', colSpan: 1, rowSpan: 1 },
        { column: 21, label: 'TÊN NHÂN VIÊN', colSpan: 1, rowSpan: 1 },
        { column: 22, label: 'NGÀY CHƯA CÓ LỊCH', colSpan: 1, rowSpan: 1 }
      ]
    ]
  },
  {
    name: 'Bang Thanh Toan Luong',
    hidden: true,
    headerRow: 6,
    dataRow: 8,
    columnCount: 12,
    headers: [
      [
        { column: 1, label: 'Stt', colSpan: 1, rowSpan: 2 },
        { column: 2, label: 'Mã NV', colSpan: 1, rowSpan: 2 },
        { column: 3, label: 'Tên nhân viên', colSpan: 1, rowSpan: 2 },
        { column: 4, label: 'Bộ phận', colSpan: 1, rowSpan: 2 },
        { column: 5, label: 'Tổng lương', colSpan: 1, rowSpan: 2 },
        { column: 6, label: 'Các khoản giảm trừ', colSpan: 4, rowSpan: 1 },
        { column: 10, label: 'Nợ Kỳ trước', colSpan: 1, rowSpan: 2 },
        { column: 11, label: 'Thực Lãnh', colSpan: 1, rowSpan: 2 },
        { column: 12, label: 'Số tài khoản', colSpan: 1, rowSpan: 2 }
      ],
      [
        {
          column: 6,
          label: 'Khấu trừ bảo hiểm (10.5%)',
          colSpan: 1,
          rowSpan: 1
        },
        {
          column: 7,
          label: 'Khấu trừ phí công đoàn (0.5%)',
          colSpan: 1,
          rowSpan: 1
        },
        { column: 8, label: 'Tạm ứng', colSpan: 1, rowSpan: 1 },
        { column: 9, label: 'KPI', colSpan: 1, rowSpan: 1 }
      ]
    ]
  },
  {
    name: 'Tăng ca-Tăng cường-Phép năm',
    hidden: false,
    headerRow: 7,
    dataRow: 8,
    columnCount: 60,
    headers: [
      [
        { column: 1, label: 'Stt', colSpan: 1, rowSpan: 1 },
        { column: 2, label: 'Mã NV', colSpan: 1, rowSpan: 1 },
        { column: 3, label: 'Tên NV', colSpan: 1, rowSpan: 1 },
        { column: 4, label: 'Bộ phận', colSpan: 1, rowSpan: 1 },
        { column: 5, label: 'Lương căn bản', colSpan: 1, rowSpan: 1 },
        { column: 6, label: 'Số giờ tăng ca ngày', colSpan: 1, rowSpan: 1 },
        {
          column: 7,
          label: 'Lương tăng ca ngày (LCB cũ)',
          colSpan: 1,
          rowSpan: 1
        },
        {
          column: 8,
          label: 'Lương tăng cường tháng 9',
          colSpan: 1,
          rowSpan: 1
        },
        {
          column: 9,
          label: 'Tiền phép năm tháng 8 (lương cũ)',
          colSpan: 1,
          rowSpan: 1
        },
        { column: 10, label: 'Tiền hết việc tháng 8', colSpan: 1, rowSpan: 1 },
        { column: 11, label: 'Tổng cộng', colSpan: 1, rowSpan: 1 },
        { column: 12, label: 'Ký nhận', colSpan: 1, rowSpan: 1 },
        {
          column: 13,
          label: 'tách 1 giờ tăng ca tính vào lương mới',
          colSpan: 1,
          rowSpan: 1
        },
        {
          column: 14,
          label: 'số giờ tăng ca còn lại tính mức lương cũ lãnh TM',
          colSpan: 1,
          rowSpan: 1
        },
        { column: 15, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        {
          column: 16,
          label: 'tách 1 giờ tăng ca tính vào lương mới',
          colSpan: 1,
          rowSpan: 1
        },
        {
          column: 17,
          label: 'số giờ tăng ca còn lại tính mức lương cũ lãnh TM',
          colSpan: 1,
          rowSpan: 1
        },
        { column: 18, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        {
          column: 19,
          label: 'tách 1 giờ tăng ca tính vào lương mới',
          colSpan: 1,
          rowSpan: 1
        },
        {
          column: 20,
          label: 'số giờ tăng ca còn lại tính mức lương cũ lãnh TM',
          colSpan: 1,
          rowSpan: 1
        },
        { column: 21, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        {
          column: 22,
          label: 'tách 1 giờ tăng ca tính vào lương mới',
          colSpan: 1,
          rowSpan: 1
        },
        {
          column: 23,
          label: 'số giờ tăng ca còn lại tính mức lương cũ lãnh TM',
          colSpan: 1,
          rowSpan: 1
        },
        { column: 24, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        {
          column: 25,
          label: 'tách 1 giờ tăng ca tính vào lương mới',
          colSpan: 1,
          rowSpan: 1
        },
        {
          column: 26,
          label: 'số giờ tăng ca còn lại tính mức lương cũ lãnh TM',
          colSpan: 1,
          rowSpan: 1
        },
        { column: 27, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        {
          column: 28,
          label: 'tách 1 giờ tăng ca tính vào lương mới',
          colSpan: 1,
          rowSpan: 1
        },
        {
          column: 29,
          label: 'số giờ tăng ca còn lại tính mức lương cũ lãnh TM',
          colSpan: 1,
          rowSpan: 1
        },
        { column: 30, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        {
          column: 31,
          label: 'tách 1 giờ tăng ca tính vào lương mới',
          colSpan: 1,
          rowSpan: 1
        },
        {
          column: 32,
          label: 'số giờ tăng ca còn lại tính mức lương cũ lãnh TM',
          colSpan: 1,
          rowSpan: 1
        },
        { column: 33, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        {
          column: 34,
          label: 'tách 1 giờ tăng ca tính vào lương mới',
          colSpan: 1,
          rowSpan: 1
        },
        {
          column: 35,
          label: 'số giờ tăng ca còn lại tính mức lương cũ lãnh TM',
          colSpan: 1,
          rowSpan: 1
        },
        { column: 36, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        {
          column: 37,
          label: 'tách 1 giờ tăng ca tính vào lương mới',
          colSpan: 1,
          rowSpan: 1
        },
        {
          column: 38,
          label: 'số giờ tăng ca còn lại tính mức lương cũ lãnh TM',
          colSpan: 1,
          rowSpan: 1
        },
        { column: 39, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        {
          column: 40,
          label: 'tách 1 giờ tăng ca tính vào lương mới',
          colSpan: 1,
          rowSpan: 1
        },
        {
          column: 41,
          label: 'số giờ tăng ca còn lại tính mức lương cũ lãnh TM',
          colSpan: 1,
          rowSpan: 1
        },
        { column: 42, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        {
          column: 43,
          label: 'tách 1 giờ tăng ca tính vào lương mới',
          colSpan: 1,
          rowSpan: 1
        },
        {
          column: 44,
          label: 'số giờ tăng ca còn lại tính mức lương cũ lãnh TM',
          colSpan: 1,
          rowSpan: 1
        },
        { column: 45, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        {
          column: 46,
          label: 'tách 1 giờ tăng ca tính vào lương mới',
          colSpan: 1,
          rowSpan: 1
        },
        {
          column: 47,
          label: 'số giờ tăng ca còn lại tính mức lương cũ lãnh TM',
          colSpan: 1,
          rowSpan: 1
        },
        { column: 48, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        {
          column: 49,
          label: 'tách 1 giờ tăng ca tính vào lương mới',
          colSpan: 1,
          rowSpan: 1
        },
        {
          column: 50,
          label: 'số giờ tăng ca còn lại tính mức lương cũ lãnh TM',
          colSpan: 1,
          rowSpan: 1
        },
        { column: 51, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        {
          column: 52,
          label: 'tách 1 giờ tăng ca tính vào lương mới',
          colSpan: 1,
          rowSpan: 1
        },
        {
          column: 53,
          label: 'số giờ tăng ca còn lại tính mức lương cũ lãnh TM',
          colSpan: 1,
          rowSpan: 1
        },
        { column: 54, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        {
          column: 55,
          label: 'tách 1 giờ tăng ca tính vào lương mới',
          colSpan: 1,
          rowSpan: 1
        },
        {
          column: 56,
          label: 'số giờ tăng ca còn lại tính mức lương cũ lãnh TM',
          colSpan: 1,
          rowSpan: 1
        },
        { column: 57, label: 'Tăng ca', colSpan: 1, rowSpan: 1 },
        {
          column: 58,
          label: 'tách 1 giờ tăng ca tính vào lương mới',
          colSpan: 1,
          rowSpan: 1
        },
        {
          column: 59,
          label: 'số giờ tăng ca còn lại tính mức lương cũ lãnh TM',
          colSpan: 1,
          rowSpan: 1
        },
        { column: 60, label: 'Tăng ca', colSpan: 1, rowSpan: 1 }
      ]
    ]
  },
  {
    name: 'tính tăng cường',
    hidden: false,
    headerRow: 5,
    dataRow: 7,
    columnCount: 19,
    headers: [
      [
        { column: 1, label: 'STT', colSpan: 1, rowSpan: 2 },
        { column: 2, label: 'HỌ VÀ TÊN', colSpan: 1, rowSpan: 2 },
        { column: 3, label: 'BỘ PHẬN', colSpan: 1, rowSpan: 2 },
        { column: 4, label: 'NGÀY TĂNG CƯỜNG', colSpan: 6, rowSpan: 1 },
        { column: 10, label: 'TC số giờ', colSpan: 1, rowSpan: 2 },
        { column: 11, label: 'Lương CB', colSpan: 1, rowSpan: 2 },
        { column: 12, label: 'Phụ cấp TN', colSpan: 1, rowSpan: 2 },
        {
          column: 13,
          label: 'Lương tăng cường/ giờ (x 200%)',
          colSpan: 1,
          rowSpan: 2
        },
        { column: 14, label: 'Phụ cấp cơm/ ngày', colSpan: 1, rowSpan: 2 },
        { column: 15, label: 'Phụ cấp tăng ca/ ngày', colSpan: 1, rowSpan: 2 },
        { column: 16, label: 'Phụ cấp nhà ở/ ngày', colSpan: 1, rowSpan: 2 },
        { column: 17, label: 'Phụ cấp đi lại', colSpan: 1, rowSpan: 2 },
        { column: 18, label: 'Thành tiền\n\n(đồng)', colSpan: 1, rowSpan: 2 },
        { column: 19, label: 'Ký nhận', colSpan: 1, rowSpan: 2 }
      ],
      [
        { column: 4, label: '2026-09-10 00:00:00', colSpan: 1, rowSpan: 1 },
        { column: 5, label: '2026-09-11 00:00:00', colSpan: 1, rowSpan: 1 },
        { column: 6, label: '2026-09-12 00:00:00', colSpan: 1, rowSpan: 1 },
        { column: 7, label: '2026-09-13 00:00:00', colSpan: 1, rowSpan: 1 },
        { column: 8, label: '2026-09-14 00:00:00', colSpan: 1, rowSpan: 1 },
        { column: 9, label: '2026-09-15 00:00:00', colSpan: 1, rowSpan: 1 }
      ]
    ]
  },
  {
    name: 'In phiếu lương',
    hidden: false,
    headerRow: 1,
    dataRow: 2,
    columnCount: 0,
    headers: [[]]
  },
  {
    name: 'Sheet1',
    hidden: true,
    headerRow: 5,
    dataRow: 6,
    columnCount: 4,
    headers: [
      [
        { column: 1, label: 'Stt', colSpan: 1, rowSpan: 1 },
        { column: 2, label: 'Tên NV', colSpan: 1, rowSpan: 1 },
        { column: 3, label: 'Bộ phận', colSpan: 1, rowSpan: 1 },
        { column: 4, label: 'Số điện thoại', colSpan: 1, rowSpan: 1 }
      ]
    ]
  }
];
