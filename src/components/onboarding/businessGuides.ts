// Employee business guides are filtered through the same RBAC gate as core guides.
export const businessGuides = [
  {
    id: 'choose-product',
    title: 'Chọn sản phẩm hoạt động',
    route: '/employee/todo/add-product',
    steps: [
      {
        id: 'product',
        title: 'Chọn đúng sản phẩm',
        description:
          'Nhập mã hoặc tên để tìm sản phẩm cần sản xuất hoặc kiểm hàng, rồi chọn sản phẩm trong danh sách.',
        target: 'choose-product-select'
      },
      {
        id: 'shift',
        title: 'Chọn ca và lưu',
        description:
          'Chọn Ca 1 hoặc Ca 2, rồi bấm “Cập nhật”. Chờ thông báo thành công. Nếu sản phẩm đã được chọn cho ca này, không cần thêm lại.',
        target: 'choose-product-shift'
      }
    ]
  },
  {
    id: 'production-quantity',
    title: 'Cập nhật sản lượng',
    route: '/employee/todo/update-quantity',
    steps: [
      {
        id: 'product',
        title: 'Chọn sản phẩm và ca',
        description:
          'Chọn sản phẩm và ca cần nhập sản lượng. Nếu chưa có trong danh sách, vào mục “Chọn sản phẩm hoạt động” để chọn trước.',
        target: 'quantity-product'
      },
      {
        id: 'quantity',
        title: 'Nhập sản lượng thực tế',
        description:
          'Nhập số lượng sản phẩm, kiểm tra lại rồi bấm “Cập nhật”. Số lượng phải lớn hơn 0. Có thể xem lại các lần đã nhập trong lịch sử sản lượng.',
        target: 'quantity-value'
      }
    ]
  },
  {
    id: 'production-errors',
    title: 'Cập nhật sản phẩm lỗi',
    route: '/employee/todo/update-quantity-error',
    steps: [
      {
        id: 'product',
        title: 'Chọn sản phẩm lỗi',
        description:
          'Chọn sản phẩm cần nhập số lượng lỗi. Phần này dùng để ghi nhận sản phẩm lỗi, không phải sản lượng đạt.',
        target: 'error-product'
      },
      {
        id: 'quantity',
        title: 'Ghi nhận số lượng lỗi',
        description:
          'Nhập số lượng sản phẩm lỗi rồi bấm “Cập nhật”. Kiểm tra thông báo để biết đã lưu thành công.',
        target: 'error-quantity'
      }
    ]
  },
  {
    id: 'production-history',
    title: 'Lịch sử sản lượng',
    route: '/employee/todo/history',
    steps: [
      {
        id: 'filters',
        title: 'Chọn tháng và sản phẩm',
        description:
          'Chọn tháng cần xem. Có thể chọn thêm sản phẩm để tìm nhanh các lần đã nhập.',
        target: 'production-history-filters'
      },
      {
        id: 'records',
        title: 'Kiểm tra các lần đã nhập',
        description:
          'Xem lại ngày, ca, loại và số lượng đã nhập. Nếu nhập nhầm hoặc nhập trùng, báo người phụ trách để kiểm tra.',
        target: 'production-history-records'
      }
    ]
  },
  {
    id: 'employee-activity',
    title: 'Sản phẩm hoạt động của tôi',
    route: '/employee/activity-schedule',
    steps: [
      {
        id: 'date',
        title: 'Chọn ngày hoạt động',
        description:
          'Chọn ngày để xem sản phẩm và ca làm đã chọn. Bấm làm mới nếu vừa cập nhật nhưng danh sách chưa thay đổi.',
        target: 'employee-activity-date'
      },
      {
        id: 'records',
        title: 'Kiểm tra sản lượng theo ca',
        description:
          'Kiểm tra sản phẩm, ca làm và trạng thái đã nhập sản lượng. Phần chi tiết cho biết số lượng và thời gian của từng lần nhập.',
        target: 'employee-activity-records'
      }
    ]
  },
  {
    id: 'stamp-request',
    title: 'Gửi yêu cầu in tem',
    route: '/employee/stamps/request',
    steps: [
      {
        id: 'details',
        title: 'Điền thông tin tem',
        description:
          'Chọn sản phẩm, ngày, ca, loại tem và mục đích in đúng với lô hàng cần dùng.',
        target: 'stamp-request-details'
      },
      {
        id: 'numbers',
        title: 'Kiểm tra số tem',
        description:
          'Nhập số tem bắt đầu và số lượng cần in. Nếu in từng số riêng lẻ, nhập dạng 7,10,11; lúc này không cần điền số lượng. Bấm “Thêm tem” nếu cần gửi thêm loại tem khác.',
        target: 'stamp-request-numbers'
      },
      {
        id: 'submit',
        title: 'Gửi và theo dõi',
        description:
          'Kiểm tra lại thông tin rồi bấm “Gửi yêu cầu”. Sau khi gửi thành công, vào lịch sử yêu cầu in tem để xem yêu cầu đang chờ in, đã in hay đã hủy.',
        target: 'stamp-request-submit'
      }
    ]
  },
  {
    id: 'stamp-requests-history',
    title: 'Lịch sử yêu cầu in tem',
    route: '/employee/stamps/history',
    steps: [
      {
        id: 'date',
        title: 'Tìm theo ngày gửi',
        description: 'Chọn ngày để xem các yêu cầu in tem trong ngày đó.',
        target: 'stamp-requests-date'
      },
      {
        id: 'status',
        title: 'Theo dõi kết quả xử lý',
        description:
          'Xem trạng thái chờ in, đã in hoặc đã hủy của từng yêu cầu. Kiểm tra sản phẩm, ca và số tem; nếu không thấy yêu cầu, chọn lại ngày gửi.',
        target: 'stamp-requests-date'
      }
    ]
  },
  {
    id: 'stamp-create',
    title: 'Tạo và in tem',
    route: '/stamps/create',
    steps: [
      {
        id: 'details',
        title: 'Nhập thông tin in tem',
        description:
          'Chọn ngày, ca, mục đích, sản phẩm và loại tem cần in. Điền các thông tin còn lại theo loại tem đã chọn.',
        target: 'stamp-create-details'
      },
      {
        id: 'numbers',
        title: 'Kiểm tra dãy số tem',
        description:
          'Kiểm tra số tem bắt đầu và số lượng cần in, tránh in sai số hoặc trùng với tem đã có.',
        target: 'stamp-create-numbers'
      },
      {
        id: 'preview',
        title: 'Tạo tem và xem trước',
        description:
          'Bấm “Tạo Tem” để mở bản xem trước. Kiểm tra sản phẩm, mã tem và số lượng trước khi in.',
        target: 'stamp-create-submit'
      }
    ]
  },
  {
    id: 'stamp-history',
    title: 'Xử lý và lịch sử in tem',
    route: '/stamps/history',
    steps: [
      {
        id: 'filters',
        title: 'Tìm đúng lô tem',
        description:
          'Chọn sản phẩm, loại tem, số Lot, ngày gửi, ca hoặc trạng thái để tìm lô tem cần xem.',
        target: 'stamp-history-filters'
      },
      {
        id: 'actions',
        title: 'Kiểm tra trước khi in',
        description:
          'Kiểm tra trạng thái “Chờ in”, “Đã in” hoặc “Đã hủy” của lô tem. Xem lại nội dung trước khi in, nhất là khi in lại tem đã in.',
        target: 'stamp-history-filters'
      }
    ]
  },
  {
    id: 'stock',
    title: 'Quét mã và quản lý kho',
    route: '/stock',
    steps: [
      {
        id: 'scan',
        title: 'Quét mã nhập/xuất',
        description:
          'Trong mục “Quét mã”, chọn “Nhập kho” hoặc “Xuất kho” trước khi quét. Kiểm tra thông báo sau mỗi lần quét để biết mã đã được ghi nhận hay chưa.',
        target: 'stock-scan-tab'
      },
      {
        id: 'history',
        title: 'Kiểm tra lịch sử và tồn kho',
        description:
          'Chọn “Lịch sử xuất nhập” để xem các lần nhập, xuất hàng. Chọn “Tồn kho hiện tại” để xem hàng còn trong kho. Trên điện thoại, hai mục này có tên “Lịch sử” và “Tồn kho”.',
        target: 'stock-history-tab'
      },
      {
        id: 'summary',
        title: 'Tổng hợp và đối chiếu',
        description:
          'Chọn “Tổng hợp SP” để xem số liệu theo sản phẩm. Chọn “Đối chiếu xuất PO” để kiểm tra hàng đã xuất theo PO. Nhớ chọn đúng bộ lọc cần xem.',
        target: 'stock-summary-tab'
      }
    ]
  },
  {
    id: 'total-schedules',
    title: 'Xem lịch làm việc tổng',
    route: '/work-schedules',
    steps: [
      {
        id: 'select',
        title: 'Chọn lịch tổng',
        description:
          'Chọn lịch làm việc cần xem trong danh sách. Nội dung lịch sẽ hiển thị bên dưới.',
        target: 'total-schedules-select'
      },
      {
        id: 'review',
        title: 'Đối chiếu ca làm',
        description:
          'Xem ca làm của từng nhân viên theo ngày. Nếu lịch chưa đúng, báo người phụ trách để kiểm tra.',
        target: 'total-schedules-select'
      }
    ]
  },
  {
    id: 'team-activity',
    title: 'Theo dõi sản phẩm hoạt động',
    route: '/activity-schedule',
    steps: [
      {
        id: 'date',
        title: 'Chọn ngày theo dõi',
        description:
          'Chọn ngày để xem nhân viên làm sản phẩm nào và làm ca nào.',
        target: 'team-activity-date'
      },
      {
        id: 'records',
        title: 'Kiểm tra tình trạng nhập sản lượng',
        description:
          'Xem trạng thái “Đã nhập” hoặc “Chưa nhập” của từng nhân viên. Kiểm tra phần chi tiết để biết số lượng đã nhập cho sản phẩm và ca đó.',
        target: 'team-activity-date'
      }
    ]
  },
  {
    id: 'products',
    title: 'Tra cứu sản phẩm',
    route: '/admin/products',
    steps: [
      {
        id: 'filters',
        title: 'Tìm sản phẩm',
        description:
          'Nhập tên hoặc mã để tìm sản phẩm. Có thể dùng thêm bộ lọc; nếu không thấy sản phẩm, kiểm tra lại các điều kiện đang chọn.',
        target: 'products-filters'
      },
      {
        id: 'details',
        title: 'Kiểm tra thông tin sản phẩm',
        description:
          'Chọn mục cần xem, rồi kiểm tra mã, tên và thông số của sản phẩm trong danh sách.',
        target: 'products-tabs'
      }
    ]
  },
  {
    id: 'authorized-requests',
    title: 'Duyệt đơn ủy quyền',
    route: '/employee/request-forms/authorized',
    steps: [
      {
        id: 'list',
        title: 'Xem đơn được ủy quyền',
        description:
          'Mục “Duyệt Đơn Ủy Quyền” hiển thị các đơn bạn được giao duyệt. Nếu danh sách trống, kiểm tra lại khi có đơn mới.',
        target: 'authorized-requests-tabs'
      },
      {
        id: 'review',
        title: 'Kiểm tra trước khi duyệt',
        description:
          'Mở chi tiết để đọc nội dung và kiểm tra người gửi trước khi duyệt. Nếu từ chối, ghi rõ lý do để người gửi biết và điều chỉnh.',
        target: 'authorized-requests-tabs'
      }
    ]
  }
];
