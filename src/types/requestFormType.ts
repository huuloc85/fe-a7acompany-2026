export type RequestFormType =
  | 'giay_uy_quyen'
  | 'don_xin_tu_chuc'
  | 'don_xin_nghi_viec'
  | 'don_xin_nghi_phep'
  | 'don_xin_di_tre_ve_som'
  | 'don_xin_tang_ca';

export type RequestFormStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'authorized_approved';

export type LeaveType = 'Nghỉ phép năm' | 'Nghỉ ốm' | 'Nghỉ việc riêng';

export type LateEarlyType = 'di_tre' | 've_som' | 'ca_hai';

// Base request form
export interface RequestForm {
  id: number;
  employee_id: string;
  supervisor_id?: string | null; // ID của supervisor được chọn cho đơn thường
  authorized_employee_id?: string | null; // ID của người được ủy quyền
  type: RequestFormType;
  title: string;
  content: string;
  form_data: Record<string, unknown>;
  status: RequestFormStatus;
  approved_by?: string | null;
  rejection_reason?: string | null;
  submitted_at: string;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;

  // Digital signatures - Đơn Ủy Quyền (User ký)
  digital_signature_delegator?: string | null; // Chữ ký người ủy quyền
  digital_signature_authorized?: string | null; // Chữ ký người được ủy quyền
  delegator_approved_by?: number | null; // Employee ID người ký delegator
  delegator_approved_at?: string | null;
  authorized_approved_by?: number | null; // Employee ID người ký authorized
  authorized_approved_at?: string | null;
  delegator_approved_by_employee?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
  } | null;
  authorized_approved_by_employee?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
  } | null;

  // Digital signatures - Đơn thường (Admin ký)
  digital_signature_applicant?: string | null; // Chữ ký người làm đơn (employee)
  digital_signature_supervisor?: string | null; // Chữ ký supervisor
  digital_signature_manager?: string | null; // Chữ ký manager
  supervisor_approved_by?:
    | number
    | {
        id: string;
        name: string;
        email?: string;
        phone?: string;
        [key: string]: unknown;
      }
    | null; // Employee ID hoặc object từ backend
  supervisor_approved_at?: string | null;
  manager_approved_by?:
    | number
    | {
        id: string;
        name: string;
        email?: string;
        phone?: string;
        [key: string]: unknown;
      }
    | null; // Employee ID hoặc object từ backend
  manager_approved_at?: string | null;
  supervisor_approved_by_employee?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
  } | null;
  manager_approved_by_employee?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
  } | null;

  // Signature completion status
  has_delegator_signature?: boolean;
  has_authorized_signature?: boolean;
  has_applicant_signature?: boolean;
  has_supervisor_signature?: boolean;
  has_manager_signature?: boolean;
  delegation_signatures_complete?: boolean;
  signatures_complete?: boolean;

  // ✅ NEW: camelCase objects từ BE (với full info)
  delegatorApprovedBy?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  } | null;
  authorizedApprovedBy?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  } | null;
  supervisorApprovedBy?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  } | null;
  managerApprovedBy?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  } | null;
  approvedBy?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  } | null;
  authorizedEmployee?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  } | null;
  supervisor?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  } | null;

  employee: {
    id: number;
    name: string;
  };
  approved_by_employee?: {
    id: number;
    name: string;
  } | null;
}

// Form data interfaces for each type
export interface GiayUyQuyenFormData {
  authorized_employee_id: string; // ID nhân viên được ủy quyền (required by API)
  authorization_scope: string; // Nội dung ủy quyền (required by API)
  valid_from: string; // Có hiệu lực từ ngày (required by API) - YYYY-MM-DD format
  valid_to: string; // Có hiệu lực đến ngày (required by API) - YYYY-MM-DD format
}

export interface DonXinTuChucFormData {
  ngay_nop_don: string; // Ngày nộp đơn
  ngay_nghi_viec_mong_muon: string; // Ngày nghỉ việc mong muốn
  ly_do_tu_chuc: string; // Lý do từ chức
  cong_viec_ban_giao: string; // Công việc bàn giao
  dia_chi_lien_lac: string; // Địa chỉ liên lạc
  so_dien_thoai: string; // Số điện thoại
}

export interface DonXinNghiViecFormData {
  ngay_bat_dau_nghi: string; // Ngày bắt đầu nghỉ
  ngay_du_kien_tro_lai: string; // Ngày dự kiến trở lại
  so_ngay_nghi: number; // Số ngày nghỉ
  ly_do_nghi_viec: string; // Lý do nghỉ việc
  dia_chi_trong_thoi_gian_nghi: string; // Địa chỉ trong thời gian nghỉ
  nguoi_lien_lac_khan_cap: string; // Người liên lạc khẩn cấp
  ghi_chu?: string; // Ghi chú (optional)
}

export interface DonXinNghiPhepFormData {
  ngay_nghi_tu: string; // Ngày nghỉ từ
  ngay_nghi_den: string; // Ngày nghỉ đến
  so_ngay_nghi: number; // Số ngày nghỉ
  loai_nghi_phep: LeaveType; // Loại nghỉ phép
  ly_do: string; // Lý do
  dia_chi_lien_lac: string; // Địa chỉ liên lạc
  so_dien_thoai_lien_lac: string; // Số điện thoại liên lạc
  nguoi_thay_the: string; // Người thay thế
  cong_viec_can_ban_giao: string; // Công việc cần bàn giao
}

export interface DonXinDiTreVeSomFormData {
  ngay_ap_dung: string; // Ngày áp dụng
  loai_don: LateEarlyType; // Loại đơn (di_tre, ve_som, ca_hai)
  gio_vao_binh_thuong: string; // Giờ vào bình thường
  gio_vao_mong_muon: string; // Giờ vào mong muốn
  gio_ra_binh_thuong: string; // Giờ ra bình thường
  gio_ra_mong_muon: string; // Giờ ra mong muốn
  so_gio_lam_bu: number; // Số giờ làm bù
  cach_lam_bu: string; // Cách làm bù
  ly_do: string; // Lý do
  ghi_chu?: string; // Ghi chú (optional)
}

// Union type for all form data
export interface DonXinTangCaFormData {
  ngay_ap_dung: string;
  ca_lam: 1 | 2;
  ly_do: string;
}

export type RequestFormData =
  | GiayUyQuyenFormData
  | DonXinTuChucFormData
  | DonXinNghiViecFormData
  | DonXinNghiPhepFormData
  | DonXinDiTreVeSomFormData
  | DonXinTangCaFormData;

// Create/Update DTOs
export interface CreateRequestFormDto {
  type: RequestFormType;
  title: string;
  content: string;
  form_data: RequestFormData | Record<string, unknown>;
  supervisor_id?: string; // ID supervisor cho đơn thường
  // Base64 encoded signatures (same field names as backend expects)
  digital_signature_applicant?: string;
  digital_signature_supervisor?: string;
  digital_signature_manager?: string;
  digital_signature_delegator?: string;
  digital_signature_authorized?: string;
}

export interface UpdateRequestFormDto {
  title?: string;
  content?: string;
  form_data?: Partial<RequestFormData>;
  supervisor_id?: string; // Có thể đổi supervisor khi cập nhật
}

// Filter/Query params
export interface RequestFormFilters {
  type?: RequestFormType;
  status?: RequestFormStatus;
  employee_id?: string;
  from_date?: string;
  to_date?: string;
  per_page?: number;
  page?: number;
}

// API Response types
export interface RequestFormListResponse {
  success: boolean;
  data: {
    data: RequestForm[];
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
  types: Record<RequestFormType, string>;
  statuses: Record<RequestFormStatus, string>;
}

export interface RequestFormDetailResponse {
  message?: string;
  success: boolean;
  data: RequestForm;
}

export interface RequestFormTypesResponse {
  success: boolean;
  data: {
    types: Record<RequestFormType, string>;
    statuses: Record<RequestFormStatus, string>;
  };
}

export interface AuthorizableEmployeesResponse {
  success: boolean;
  data: AuthorizableEmployee[];
}

// Response for signature fields endpoint
export interface SignatureFieldsResponse {
  success: boolean;
  data: {
    type: string;
    required_signatures: string[];
    signature_order: string[];
    description: string;
  };
}

// Response for authorized-to-me endpoint (different structure)
export interface AuthorizedToMeResponse {
  success: boolean;
  data: RequestForm[];
  total: number;
  page: number;
  limit: number;
  last_page: number;
}

export interface RequestFormStatisticsResponse {
  success: boolean;
  data: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    by_type: Record<
      RequestFormType,
      {
        name: string;
        count: number;
        pending: number;
      }
    >;
  };
}

// Action DTOs
export interface ApproveRequestFormDto {
  action: 'approve' | 'reject';
  rejection_reason?: string;
}

// Delegation signature DTO
export interface SignDelegationDto {
  digital_signature_delegator?: File;
  digital_signature_authorized?: File;
}

// Admin approval with signatures DTO
export interface AdminApprovalDto {
  action: 'approve' | 'reject';
  digital_signature_applicant?: File; // Employee ký khi tạo đơn
  digital_signature_supervisor?: File;
  digital_signature_manager?: File;
  rejection_reason?: string;
}

// Employee response for delegation
export interface AuthorizableEmployee {
  id: number;
  name: string;
  employee_code?: string;
  gender?: string;
  role_id?: number;
  role_name?: string;
}

// Constants
export const REQUEST_FORM_TYPES: Record<RequestFormType, string> = {
  giay_uy_quyen: 'Giấy ủy quyền',
  don_xin_tu_chuc: 'Đơn xin từ chức',
  don_xin_nghi_viec: 'Đơn xin nghỉ việc',
  don_xin_nghi_phep: 'Đơn xin nghỉ phép',
  don_xin_di_tre_ve_som: 'Đơn xin đi trễ - về sớm',
  don_xin_tang_ca: 'Đơn xin tăng ca'
};

export const REQUEST_FORM_STATUSES: Record<RequestFormStatus, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  authorized_approved: 'Người được ủy quyền đã ký'
};

export const LEAVE_TYPES: Record<LeaveType, string> = {
  'Nghỉ phép năm': 'Nghỉ phép năm',
  'Nghỉ ốm': 'Nghỉ ốm đau',
  'Nghỉ việc riêng': 'Nghỉ việc cá nhân'
};

export const LATE_EARLY_TYPES: Record<LateEarlyType, string> = {
  di_tre: 'Đi trễ',
  ve_som: 'Về sớm',
  ca_hai: 'Cả đi trễ và về sớm'
};
