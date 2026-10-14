import { z } from 'zod';
import { vi } from '@utils/validationMessages';

// Common validation patterns
const phonePattern = /^(0|\+84)[0-9]{9}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^\d{2}:\d{2}$/;

// Base schema for all request forms
export const baseRequestFormSchema = z.object({
  type: z.enum(
    [
      'giay_uy_quyen',
      'don_xin_tu_chuc',
      'don_xin_nghi_viec',
      'don_xin_nghi_phep',
      'don_xin_di_tre_ve_som',
      'don_xin_tang_ca'
    ] as const,
    {
      required_error: vi.REQUIRED_FIELD,
      invalid_type_error: vi.INVALID_OPTION
    }
  ),
  title: z
    .string({
      required_error: vi.REQUIRED_FIELD
    })
    .min(1, vi.REQUIRED_FIELD)
    .max(255, vi.TOO_LONG.replace('{max}', '255')),
  content: z
    .string({
      required_error: vi.REQUIRED_FIELD
    })
    .min(1, vi.REQUIRED_FIELD)
    .max(2000, vi.TOO_LONG.replace('{max}', '2000'))
});

// Giấy ủy quyền schema
export const giayUyQuyenFormDataSchema = z.object({
  authorized_employee_id: z
    .string({
      required_error: vi.REQUIRED_FIELD
    })
    .min(1, vi.REQUIRED_FIELD),
  authorization_scope: z
    .string({
      required_error: vi.REQUIRED_FIELD
    })
    .min(1, vi.REQUIRED_FIELD)
    .max(255, vi.TOO_LONG.replace('{max}', '255')),
  valid_from: z
    .string({
      required_error: vi.REQUIRED_FIELD
    })
    .regex(datePattern, vi.INVALID_DATE),
  valid_to: z
    .string({
      required_error: vi.REQUIRED_FIELD
    })
    .regex(datePattern, vi.INVALID_DATE)
});

export const giayUyQuyenSchema = baseRequestFormSchema.extend({
  form_data: giayUyQuyenFormDataSchema
});

// Đơn xin từ chức schema
export const donXinTuChucFormDataSchema = z
  .object({
    ngay_nop_don: z
      .string({
        required_error: vi.REQUIRED_FIELD
      })
      .regex(datePattern, vi.INVALID_DATE),
    ngay_nghi_viec_mong_muon: z
      .string({
        required_error: vi.REQUIRED_FIELD
      })
      .regex(datePattern, vi.INVALID_DATE),
    ly_do_tu_chuc: z
      .string({
        required_error: vi.REQUIRED_FIELD
      })
      .min(1, vi.REQUIRED_FIELD)
      .max(500, vi.TOO_LONG.replace('{max}', '500')),
    cong_viec_ban_giao: z
      .string({
        required_error: vi.REQUIRED_FIELD
      })
      .min(1, vi.REQUIRED_FIELD)
      .max(1000, vi.TOO_LONG.replace('{max}', '1000')),
    dia_chi_lien_lac: z
      .string({
        required_error: vi.REQUIRED_FIELD
      })
      .min(1, vi.REQUIRED_FIELD)
      .max(200, vi.TOO_LONG.replace('{max}', '200')),
    so_dien_thoai: z
      .string({
        required_error: vi.REQUIRED_FIELD
      })
      .regex(phonePattern, 'Số điện thoại không đúng định dạng')
  })
  .refine(
    (data) => {
      const submitDate = new Date(data.ngay_nop_don);
      const resignDate = new Date(data.ngay_nghi_viec_mong_muon);
      return resignDate > submitDate;
    },
    {
      message: 'Ngày nghỉ việc phải sau ngày nộp đơn',
      path: ['ngay_nghi_viec_mong_muon']
    }
  );

export const donXinTuChucSchema = baseRequestFormSchema.extend({
  form_data: donXinTuChucFormDataSchema
});

// Đơn xin nghỉ việc schema
export const donXinNghiViecFormDataSchema = z
  .object({
    ngay_bat_dau_nghi: z
      .string({
        required_error: vi.REQUIRED_FIELD
      })
      .regex(datePattern, vi.INVALID_DATE),
    ngay_du_kien_tro_lai: z
      .string({
        required_error: vi.REQUIRED_FIELD
      })
      .regex(datePattern, vi.INVALID_DATE),
    so_ngay_nghi: z
      .number({
        required_error: vi.REQUIRED_FIELD,
        invalid_type_error: vi.INVALID_NUMBER
      })
      .min(1, 'Số ngày nghỉ phải lớn hơn 0')
      .max(365, 'Số ngày nghỉ không được vượt quá 365 ngày'),
    ly_do_nghi_viec: z
      .string({
        required_error: vi.REQUIRED_FIELD
      })
      .min(1, vi.REQUIRED_FIELD)
      .max(500, vi.TOO_LONG.replace('{max}', '500')),
    dia_chi_trong_thoi_gian_nghi: z
      .string({
        required_error: vi.REQUIRED_FIELD
      })
      .min(1, vi.REQUIRED_FIELD)
      .max(200, vi.TOO_LONG.replace('{max}', '200')),
    nguoi_lien_lac_khan_cap: z
      .string({
        required_error: vi.REQUIRED_FIELD
      })
      .min(1, vi.REQUIRED_FIELD)
      .max(200, vi.TOO_LONG.replace('{max}', '200')),
    ghi_chu: z
      .string()
      .max(500, vi.TOO_LONG.replace('{max}', '500'))
      .optional()
      .or(z.literal(''))
  })
  .refine(
    (data) => {
      const startDate = new Date(data.ngay_bat_dau_nghi);
      const endDate = new Date(data.ngay_du_kien_tro_lai);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= data.so_ngay_nghi - 1; // Allow 1 day tolerance
    },
    {
      message: 'Số ngày nghỉ không khớp với khoảng thời gian đã chọn',
      path: ['so_ngay_nghi']
    }
  );

export const donXinNghiViecSchema = baseRequestFormSchema.extend({
  form_data: donXinNghiViecFormDataSchema
});

// Đơn xin nghỉ phép schema
export const donXinNghiPhepFormDataSchema = z
  .object({
    ngay_nghi_tu: z
      .string({
        required_error: vi.REQUIRED_FIELD
      })
      .regex(datePattern, vi.INVALID_DATE),
    ngay_nghi_den: z
      .string({
        required_error: vi.REQUIRED_FIELD
      })
      .regex(datePattern, vi.INVALID_DATE),
    so_ngay_nghi: z
      .number({
        required_error: vi.REQUIRED_FIELD,
        invalid_type_error: vi.INVALID_NUMBER
      })
      .min(1, 'Số ngày nghỉ phải lớn hơn 0')
      .max(30, 'Số ngày nghỉ không được vượt quá 30 ngày'),
    loai_nghi_phep: z.enum(
      ['Nghỉ phép năm', 'Nghỉ ốm', 'Nghỉ việc riêng'] as const,
      {
        required_error: vi.REQUIRED_FIELD,
        invalid_type_error: vi.INVALID_OPTION
      }
    ),
    ly_do: z
      .string({
        required_error: vi.REQUIRED_FIELD
      })
      .min(1, vi.REQUIRED_FIELD)
      .max(500, vi.TOO_LONG.replace('{max}', '500')),
    dia_chi_lien_lac: z
      .string({
        required_error: vi.REQUIRED_FIELD
      })
      .min(1, vi.REQUIRED_FIELD)
      .max(200, vi.TOO_LONG.replace('{max}', '200')),
    so_dien_thoai_lien_lac: z
      .string({
        required_error: vi.REQUIRED_FIELD
      })
      .regex(phonePattern, 'Số điện thoại không đúng định dạng'),
    nguoi_thay_the: z
      .string({
        required_error: vi.REQUIRED_FIELD
      })
      .min(1, vi.REQUIRED_FIELD)
      .max(100, vi.TOO_LONG.replace('{max}', '100')),
    cong_viec_can_ban_giao: z
      .string({
        required_error: vi.REQUIRED_FIELD
      })
      .min(1, vi.REQUIRED_FIELD)
      .max(1000, vi.TOO_LONG.replace('{max}', '1000'))
  })
  .refine(
    (data) => {
      const startDate = new Date(data.ngay_nghi_tu);
      const endDate = new Date(data.ngay_nghi_den);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include both start and end date
      return diffDays >= data.so_ngay_nghi;
    },
    {
      message: 'Số ngày nghỉ không khớp với khoảng thời gian đã chọn',
      path: ['so_ngay_nghi']
    }
  );

export const donXinNghiPhepSchema = baseRequestFormSchema.extend({
  form_data: donXinNghiPhepFormDataSchema
});

// Đơn xin đi trễ - về sớm schema
export const donXinDiTreVeSomFormDataSchema = z.object({
  ngay_ap_dung: z
    .string({
      required_error: vi.REQUIRED_FIELD
    })
    .regex(datePattern, vi.INVALID_DATE),
  loai_don: z.enum(['di_tre', 've_som', 'ca_hai'] as const, {
    required_error: vi.REQUIRED_FIELD,
    invalid_type_error: vi.INVALID_OPTION
  }),
  gio_vao_binh_thuong: z
    .string({
      required_error: vi.REQUIRED_FIELD
    })
    .regex(timePattern, 'Giờ không đúng định dạng (HH:MM)'),
  gio_vao_mong_muon: z
    .string({
      required_error: vi.REQUIRED_FIELD
    })
    .regex(timePattern, 'Giờ không đúng định dạng (HH:MM)'),
  gio_ra_binh_thuong: z
    .string({
      required_error: vi.REQUIRED_FIELD
    })
    .regex(timePattern, 'Giờ không đúng định dạng (HH:MM)'),
  gio_ra_mong_muon: z
    .string({
      required_error: vi.REQUIRED_FIELD
    })
    .regex(timePattern, 'Giờ không đúng định dạng (HH:MM)'),
  so_gio_lam_bu: z
    .number({
      required_error: vi.REQUIRED_FIELD,
      invalid_type_error: vi.INVALID_NUMBER
    })
    .min(0, 'Số giờ làm bù phải lớn hơn hoặc bằng 0')
    .max(12, 'Số giờ làm bù không được vượt quá 12 giờ'),
  cach_lam_bu: z
    .string({
      required_error: vi.REQUIRED_FIELD
    })
    .min(1, vi.REQUIRED_FIELD)
    .max(500, vi.TOO_LONG.replace('{max}', '500')),
  ly_do: z
    .string({
      required_error: vi.REQUIRED_FIELD
    })
    .min(1, vi.REQUIRED_FIELD)
    .max(500, vi.TOO_LONG.replace('{max}', '500')),
  ghi_chu: z
    .string()
    .max(500, vi.TOO_LONG.replace('{max}', '500'))
    .optional()
    .or(z.literal(''))
});

export const donXinDiTreVeSomSchema = baseRequestFormSchema.extend({
  form_data: donXinDiTreVeSomFormDataSchema
});

// Update schema (optional fields)
export const donXinTangCaFormDataSchema = z.object({
  ngay_ap_dung: z.string().regex(datePattern, vi.INVALID_DATE),
  ca_lam: z.union([z.literal(1), z.literal(2)]),
  ly_do: z.string().trim().min(1, vi.REQUIRED_FIELD).max(500)
});

export const donXinTangCaSchema = baseRequestFormSchema.extend({
  form_data: donXinTangCaFormDataSchema
});

export const updateRequestFormSchema = z.object({
  title: z
    .string()
    .min(1, vi.REQUIRED_FIELD)
    .max(255, vi.TOO_LONG.replace('{max}', '255'))
    .optional(),
  content: z
    .string()
    .min(1, vi.REQUIRED_FIELD)
    .max(2000, vi.TOO_LONG.replace('{max}', '2000'))
    .optional(),
  form_data: z.record(z.any()).optional()
});

// Filter schema
export const requestFormFiltersSchema = z.object({
  type: z
    .enum([
      'giay_uy_quyen',
      'don_xin_tu_chuc',
      'don_xin_nghi_viec',
      'don_xin_nghi_phep',
      'don_xin_di_tre_ve_som',
      'don_xin_tang_ca'
    ] as const)
    .optional(),
  status: z.enum(['pending', 'approved', 'rejected'] as const).optional(),
  employee_id: z.string().optional(),
  from_date: z.string().regex(datePattern, vi.INVALID_DATE).optional(),
  to_date: z.string().regex(datePattern, vi.INVALID_DATE).optional(),
  per_page: z.number().min(1).max(100).optional(),
  page: z.number().min(1).optional()
});

// Approve/Reject schema
export const approveRequestFormSchema = z
  .object({
    action: z.enum(['approve', 'reject'] as const, {
      required_error: vi.REQUIRED_FIELD
    }),
    rejection_reason: z
      .string()
      .min(1, 'Vui lòng nhập lý do từ chối')
      .optional()
  })
  .refine(
    (data) => {
      if (data.action === 'reject') {
        return data.rejection_reason && data.rejection_reason.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Lý do từ chối là bắt buộc khi từ chối đơn',
      path: ['rejection_reason']
    }
  );

// Export all schemas as a union for type-based validation
export const requestFormSchemas = {
  giay_uy_quyen: giayUyQuyenSchema,
  don_xin_tu_chuc: donXinTuChucSchema,
  don_xin_nghi_viec: donXinNghiViecSchema,
  don_xin_nghi_phep: donXinNghiPhepSchema,
  don_xin_di_tre_ve_som: donXinDiTreVeSomSchema,
  don_xin_tang_ca: donXinTangCaSchema
} as const;

// Type inference
export type GiayUyQuyenFormData = z.infer<typeof giayUyQuyenFormDataSchema>;
export type DonXinTuChucFormData = z.infer<typeof donXinTuChucFormDataSchema>;
export type DonXinNghiViecFormData = z.infer<
  typeof donXinNghiViecFormDataSchema
>;
export type DonXinNghiPhepFormData = z.infer<
  typeof donXinNghiPhepFormDataSchema
>;
export type DonXinDiTreVeSomFormData = z.infer<
  typeof donXinDiTreVeSomFormDataSchema
>;
export type RequestFormFilters = z.infer<typeof requestFormFiltersSchema>;
export type ApproveRequestFormData = z.infer<typeof approveRequestFormSchema>;
