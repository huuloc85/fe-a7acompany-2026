import React, { useState } from 'react';
import { useObjectUrl } from '@/hooks/useObjectUrl';
import {
  Form,
  Select,
  Button,
  message,
  Card,
  Divider,
  Typography,
  Upload,
  Tabs
} from 'antd';
import { InboxOutlined, FileImageOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useStore } from '@tanstack/react-store';
import dayjs from 'dayjs';

import SignaturePad from '@/components/common/SignaturePad';
import { customFormProps } from '@/components/custom/FormProps.custom';
import { FormFieldsRenderer } from './FormFieldsRenderer';
import { EmployeeSelectionProvider, useEmployeeSelection } from './Utilities';
import { employeeRequestFormService } from '@/services/RequestFormService';
import { authStore } from '@/stores/authStore';
import {
  SUPERVISOR_IDS,
  SUPERVISOR_ROLE_IDS,
  SUPERVISOR_ROLE_NAMES
} from '@/constants/supervisors';
import { STORAGE_URL } from '@/configs/environment.config';
import {
  dataURLToStandardFile,
  resizeSignatureImage
} from '@/utils/signatureUtil';
import {
  RequestFormType,
  REQUEST_FORM_TYPES,
  CreateRequestFormDto,
  RequestForm
} from '@/types/requestFormType';
import { User } from '@/types/authType';

// Danh sách nhân viên nộp đơn thẳng cho quản lý, bỏ qua tổ trưởng
const DIRECT_TO_MANAGER_IDS = ['22122900', '23080100', '23011400'] as const;

interface CreateRequestFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  editData?: RequestForm;
}

interface RequestFormData {
  type: RequestFormType;
  form_data: Record<
    string,
    string | number | Date | boolean | null | undefined
  >;
}

interface DigitalSignatureData {
  file?: File;
  canvasSignature?: string;
  signatureType: 'upload' | 'draw';
}

export const CreateEditModal: React.FC<CreateRequestFormProps> = (props) => {
  return (
    <EmployeeSelectionProvider>
      <CreateEditModalContent {...props} />
    </EmployeeSelectionProvider>
  );
};

const CreateEditModalContent: React.FC<CreateRequestFormProps> = ({
  onSuccess,
  onCancel,
  editData
}) => {
  const [form] = Form.useForm<RequestFormData>();
  const [selectedType, setSelectedType] = useState<RequestFormType | null>(
    null
  );
  const [supervisorId, setSupervisorId] = useState<string | undefined>(
    undefined
  );
  const [signature, setSignature] = useState<DigitalSignatureData>({
    signatureType: 'upload',
    file: undefined,
    canvasSignature: undefined
  });
  const [showSignaturePad, setShowSignaturePad] = useState<boolean>(!editData); // Ẩn khi edit, hiện khi tạo mới
  const signaturePreview = useObjectUrl(signature.file);
  const { selectedEmployee } = useEmployeeSelection();
  const queryClient = useQueryClient();

  // Fetch all employees and filter supervisors by ID
  const { data: employeesData, isLoading: isLoadingSupervisors } = useQuery({
    queryKey: ['authorizable-employees'],
    queryFn: async () => {
      const response =
        await employeeRequestFormService.getAuthorizableEmployees();
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000 // Cache 5 phút
  });

  // Filter supervisors from employees list based on fixed IDs or leader roles
  const supervisors = (employeesData || []).filter((emp) => {
    const roleName = emp.role_name?.toLowerCase() || '';
    const roleId = emp.role_id?.toString() || '';
    return (
      (SUPERVISOR_IDS as readonly string[]).includes(
        emp.id?.toString() || ''
      ) ||
      SUPERVISOR_ROLE_NAMES.includes(
        roleName as (typeof SUPERVISOR_ROLE_NAMES)[number]
      ) ||
      (SUPERVISOR_ROLE_IDS as readonly string[]).includes(roleId)
    );
  });

  // Get current user info from auth
  const authState = useStore(authStore);
  const authUser = authState.user;

  // Use auth user directly (JWT already contains accurate gender info)
  const currentUser: User | null = authUser;

  // Check if current user is supervisor
  const isCurrentUserSupervisor = React.useMemo(() => {
    if (!currentUser?.id) return false;
    return (
      (SUPERVISOR_IDS as readonly string[]).includes(
        currentUser.id.toString()
      ) ||
      SUPERVISOR_ROLE_NAMES.includes(
        currentUser.role.name.toLowerCase() as (typeof SUPERVISOR_ROLE_NAMES)[number]
      ) ||
      (SUPERVISOR_ROLE_IDS as readonly string[]).includes(currentUser.role.id)
    );
  }, [currentUser]);

  // Check if current user can submit directly to manager (bypass supervisor)
  const canSubmitDirectToManager = React.useMemo(() => {
    if (!currentUser?.id) return false;
    return (DIRECT_TO_MANAGER_IDS as readonly string[]).includes(
      currentUser.id.toString()
    );
  }, [currentUser?.id]);

  // Populate form data when editing
  React.useEffect(() => {
    if (editData) {
      // Parse form_data if it's string
      let parsedFormData = editData.form_data;
      if (typeof editData.form_data === 'string') {
        try {
          parsedFormData = JSON.parse(editData.form_data);
        } catch {
          parsedFormData = {};
        }
      }

      // Convert date strings to dayjs objects for form fields
      const convertedFormData = { ...parsedFormData };
      const dateFields = [
        'ngay_tu_chuc',
        'ngay_thoi_viec',
        'ngay_nghi_phep',
        'ngay_nghi_phep_tu',
        'ngay_nghi_phep_den',
        'ngay_nghi',
        'ngay_ap_dung',
        'gio_vao_tre',
        'gio_ve_som'
      ];

      dateFields.forEach((field) => {
        if (convertedFormData[field]) {
          const dateValue = dayjs(
            convertedFormData[field] as string | number | Date
          );
          if (dateValue.isValid()) {
            convertedFormData[field] = dateValue;
          }
        }
      });

      // Set form values
      form.setFieldsValue({
        type: editData.type,
        form_data: convertedFormData as Record<
          string,
          string | number | Date | boolean | null | undefined
        >
      });

      // Set selected type to show form fields
      setSelectedType(editData.type);

      // ✅ Set supervisor_id nếu có (cho đơn thường)
      if (editData.supervisor_id) {
        setSupervisorId(editData.supervisor_id);
      }

      // ✅ Reset signature state khi edit để không giữ chữ ký cũ từ lần trước
      setSignature({
        signatureType: 'upload',
        file: undefined,
        canvasSignature: undefined
      });
    } else {
      // Khi tạo mới, cũng reset signature
      setSignature({
        signatureType: 'upload',
        file: undefined,
        canvasSignature: undefined
      });
      setSelectedType(null);
      setSupervisorId(undefined);
      form.resetFields();
    }
  }, [editData, form]);

  // Map gender từ enum sang Vietnamese
  const getGenderText = (gender: string | undefined) => {
    if (!gender) return 'Nam'; // Default

    // Normalize gender value (case-insensitive)
    const normalizedGender = String(gender).toLowerCase().trim();

    switch (normalizedGender) {
      case 'male':
      case 'nam':
        return 'Nam';
      case 'female':
      case 'nữ':
      case 'nu':
        return 'Nữ';
      case 'other':
      case 'khác':
      case 'khac':
        return 'Khác';
      default:
        return 'Nam';
    }
  };

  // Function to generate content from form data based on templates
  const generateContentFromFormData = (
    type: RequestFormType,
    formData: Record<string, unknown>,
    selectedSupervisorId?: string
  ): string => {
    const userInfo = currentUser;

    // Get supervisor name from selected supervisor ID
    const getSupervisorName = (): string => {
      // Nếu user có thể nộp thẳng cho quản lý, không cần tổ trưởng
      if (canSubmitDirectToManager) {
        return '[Không cần tổ trưởng ký]';
      }

      if (!selectedSupervisorId) {
        return '[Tổ trưởng cần ký tại đây]';
      }

      const supervisor = supervisors.find(
        (sup) => sup.id?.toString() === selectedSupervisorId
      );

      if (!supervisor) {
        return '[Tổ trưởng cần ký tại đây]';
      }

      return supervisor?.name || '[Tổ trưởng cần ký tại đây]';
    };

    // Helper function to clean name (remove MSNV if exists)
    const cleanName = (name: string | undefined): string => {
      if (!name) return '';
      // Remove MSNV pattern like "MSNV: 20102800" or "MSNV:20102800"
      return name.replace(/\s*MSNV:\s*\d+/gi, '').trim();
    };

    // Helper to get role name from User type
    const getRoleName = (): string => {
      if (!userInfo) return '';
      return userInfo.role?.name || '';
    };

    switch (type) {
      case 'giay_uy_quyen': {
        const data = formData as Record<string, unknown>;
        const employeeName =
          selectedEmployee?.name || '[Tên người được ủy quyền]';
        const employeeCode = selectedEmployee?.employee_code || '[MSNV]';
        return `Tôi, ${userInfo?.name || '[Tên người ủy quyền]'} (MSNV: ${userInfo?.id || '[MSNV]'}), làm đơn ủy quyền cho ${employeeName} (MSNV: ${employeeCode}) thực hiện việc ${data.authorization_scope || '[Nội dung ủy quyền]'} từ ngày ${data.valid_from ? dayjs(data.valid_from as string).format('DD/MM/YYYY') : '[Ngày bắt đầu]'} đến ngày ${data.valid_to ? dayjs(data.valid_to as string).format('DD/MM/YYYY') : '[Ngày kết thúc]'}.`;
      }
      case 'don_xin_tu_chuc': {
        const data = formData as Record<string, unknown>;
        const genderText = getGenderText(userInfo?.gender);
        const ngayTuChuc = data.ngay_tu_chuc
          ? dayjs(data.ngay_tu_chuc as string)
          : null;
        const ngayText = ngayTuChuc
          ? `kể từ ngày ${ngayTuChuc.date()} tháng ${ngayTuChuc.month() + 1} năm ${ngayTuChuc.year()}`
          : 'kể từ ngày ....... tháng ....... năm ........';

        return `Họ và tên: ${cleanName(userInfo?.name)}     Giới tính: ${genderText}     Chức vụ: ${getRoleName()}

Nay tôi làm đơn này, kính xin Ban giám đốc cho tôi được từ chức ${ngayText}
Lý do: ${data.ly_do_tu_chuc || '..........................................................................................................................................'}
Kính trình Ban giám đốc Công ty, phòng nhân sự xem xét và giải quyết cho tôi được từ chức theo nguyện vọng trên.
Tôi xin chân thành cảm ơn!

TP.Hồ Chí Minh, ngày ${dayjs().date()} tháng ${dayjs().month() + 1} năm ${dayjs().year()}

                    Người làm đơn                                Tổ trưởng                                Quản lý nhà máy
           
           [Vùng chữ ký điện tử]                     ${getSupervisorName()}                     [Quản lý nhà máy cần ký tại đây]
           
           ${cleanName(userInfo?.name)}`;
      }
      case 'don_xin_nghi_viec': {
        const data = formData as Record<string, unknown>;
        const genderText = getGenderText(userInfo?.gender);
        const ngayNghiViec = data.ngay_nghi_viec
          ? dayjs(data.ngay_nghi_viec as string)
          : null;
        const ngayText = ngayNghiViec
          ? `kể từ ngày ${ngayNghiViec.date()} tháng ${ngayNghiViec.month() + 1} năm ${ngayNghiViec.year()}`
          : 'kể từ ngày ....... tháng ....... năm ........';

        return `Họ và tên: ${cleanName(userInfo?.name)}     Giới tính: ${genderText}     Chức vụ: ${getRoleName()}

Nay tôi làm đơn này, kính xin Ban giám đốc cho tôi được nghỉ việc ${ngayText}
Lý do: ${data.ly_do_nghi_viec || '..........................................................................................................................................'}
Kính trình Ban giám đốc Công ty, phòng nhân sự xem xét và giải quyết cho tôi được nghỉ việc theo nguyện vọng trên.
Tôi xin chân thành cảm ơn!

TP.Hồ Chí Minh, ngày ${dayjs().date()} tháng ${dayjs().month() + 1} năm ${dayjs().year()}

                    Người làm đơn                                Tổ trưởng                                Quản lý nhà máy
           
           [Vùng chữ ký điện tử]                     ${getSupervisorName()}                     [Quản lý nhà máy cần ký tại đây]
           
           ${cleanName(userInfo?.name)}`;
      }
      case 'don_xin_nghi_phep': {
        const data = formData as Record<string, unknown>;
        const genderText = getGenderText(userInfo?.gender);

        // Xử lý cho cả 2 trường hợp: nghỉ 1 ngày hoặc nhiều ngày
        let ngayText = '';
        if (data.ngay_nghi_phep) {
          // Nghỉ 1 ngày
          const ngayNghiPhep = dayjs(data.ngay_nghi_phep as string);
          ngayText = `<b>ngày ${ngayNghiPhep.date()} tháng ${ngayNghiPhep.month() + 1} năm ${ngayNghiPhep.year()}</b>`;
        } else if (data.ngay_nghi_phep_tu && data.ngay_nghi_phep_den) {
          // Nghỉ nhiều ngày
          const ngayTu = dayjs(data.ngay_nghi_phep_tu as string);
          const ngayDen = dayjs(data.ngay_nghi_phep_den as string);
          ngayText = `từ <b>ngày ${ngayTu.date()} tháng ${ngayTu.month() + 1} năm ${ngayTu.year()}</b> đến <b>ngày ${ngayDen.date()} tháng ${ngayDen.month() + 1} năm ${ngayDen.year()}</b>`;
        } else {
          ngayText = 'kể từ ngày ....... tháng ....... năm ........';
        }

        // Thêm ghi chú nếu có (sẽ hiển thị ở cuối đơn, nhỏ và tô đậm)
        const ghiChuText = data.ghi_chu
          ? `<b><small>Ghi chú: ${data.ghi_chu}</small></b>`
          : '';

        return `Họ và tên: ${cleanName(userInfo?.name)}     Giới tính: ${genderText}     Chức vụ: ${getRoleName()}

Nay tôi làm đơn này, kính xin Ban giám đốc cho tôi được nghỉ phép ${ngayText}
Lý do: ${data.ly_do_nghi_phep || '..........................................................................................................................................'}

Kính trình Ban giám đốc Công ty, phòng nhân sự xem xét và giải quyết cho tôi được nghỉ phép theo nguyện vọng trên.
Tôi xin đảm bảo đi làm lại bình thường sau ngày nghỉ phép đã ghi trong đơn.
Tôi xin chân thành cảm ơn!
${ghiChuText}

TP.Hồ Chí Minh, ngày ${dayjs().date()} tháng ${dayjs().month() + 1} năm ${dayjs().year()}

                    Người làm đơn                                Tổ trưởng                                Quản lý nhà máy
           
           [Vùng chữ ký điện tử]                     ${getSupervisorName()}                     [Quản lý nhà máy cần ký tại đây]
           
           ${cleanName(userInfo?.name)}`;
      }
      case 'don_xin_tang_ca': {
        const data = formData as Record<string, unknown>;
        const approver =
          isCurrentUserSupervisor || canSubmitDirectToManager
            ? 'Quản lý nhà máy'
            : 'Tổ trưởng';
        return `Họ và tên: ${cleanName(userInfo?.name)}     Giới tính: ${getGenderText(userInfo?.gender)}     Chức vụ: ${getRoleName()}

Kính xin ${approver} cho tôi được tăng ca ngày ${dayjs(data.ngay_ap_dung as string).format('DD/MM/YYYY')}.
Ca làm: ${Number(data.ca_lam) === 2 ? 'Ca đêm' : 'Ca ngày'}
Số giờ tăng ca: theo chấm công thực tế.
Lý do: ${data.ly_do}

Kính trình ${approver} xem xét và phê duyệt.
Tôi xin chân thành cảm ơn!

TP.Hồ Chí Minh, ngày ${dayjs().date()} tháng ${dayjs().month() + 1} năm ${dayjs().year()}

                    Người làm đơn                                ${approver}

           [Vùng chữ ký điện tử]                     ${approver === 'Tổ trưởng' ? getSupervisorName() : '[Quản lý nhà máy cần ký tại đây]'}

           ${cleanName(userInfo?.name)}`;
      }
      case 'don_xin_di_tre_ve_som': {
        const data = formData as Record<string, unknown>;
        const genderText = getGenderText(userInfo?.gender);

        const ngayApDung = data.ngay_ap_dung
          ? dayjs(data.ngay_ap_dung as string)
          : null;
        const ngayText = ngayApDung
          ? `${ngayApDung.date()} tháng ${ngayApDung.month() + 1} năm ${ngayApDung.year()}`
          : '....... tháng ....... năm ........';

        const gioVaoTre = data.gio_vao_tre
          ? dayjs(data.gio_vao_tre as string)
          : null;
        const gioVaoText = gioVaoTre
          ? gioVaoTre.format('HH:mm')
          : '.....................';

        const gioVeSom = data.gio_ve_som
          ? dayjs(data.gio_ve_som as string)
          : null;
        const gioRaText = gioVeSom
          ? gioVeSom.format('HH:mm')
          : '..................';

        return `Họ và tên: ${cleanName(userInfo?.name)}     Giới tính: ${genderText}     Chức vụ: ${getRoleName()}

Nay tôi làm đơn này, kính xin Ban giám đốc cho tôi được đi trễ/về sớm vào ngày ${ngayText}
Ngày đi trễ-về sớm: ${ngayText}     Giờ vào: ${gioVaoText}     Giờ ra: ${gioRaText}
Lý do: ${data.ly_do_di_tre_ve_som || '..........................................................................................................................................'}
Kính trình Ban giám đốc Công ty, phòng nhân sự xem xét và giải quyết cho tôi được đi trễ/về sớm theo nguyện vọng trên.
Tôi xin chân thành cảm ơn!

TP.Hồ Chí Minh, ngày ${dayjs().date()} tháng ${dayjs().month() + 1} năm ${dayjs().year()}

                    Người làm đơn                                Tổ trưởng                                Quản lý nhà máy
           
           [Vùng chữ ký điện tử]                     ${getSupervisorName()}                     [Quản lý nhà máy cần ký tại đây]
           
           ${cleanName(userInfo?.name)}`;
      }
      default:
        return `Đơn yêu cầu ${REQUEST_FORM_TYPES[type]} được tạo bởi ${userInfo?.name || '[Tên nhân viên]'} (MSNV: ${userInfo?.id || '[MSNV]'}).`;
    }
  };

  // Handle type change and auto-fill data
  const handleTypeChange = (newType: RequestFormType) => {
    setSelectedType(newType);

    if (!currentUser) return;

    // Auto-fill dữ liệu dựa trên thông tin user hiện tại
    const autoFillData: Record<string, unknown> = {};

    // Đặc biệt cho giấy ủy quyền
    if (newType === 'giay_uy_quyen') {
      autoFillData.ten_nguoi_uy_quyen = currentUser.name;
      autoFillData.ma_nhan_vien_uy_quyen = currentUser.id;
      autoFillData.chuc_vu_nguoi_uy_quyen = currentUser.role?.name || '';
    }

    // Chung cho tất cả loại đơn
    autoFillData.ho_ten = currentUser.name;
    autoFillData.ma_nhan_vien = currentUser.id;
    autoFillData.chuc_vu = currentUser.role?.name || '';
    autoFillData.gioi_tinh = currentUser.gender || 'male';

    // Update form với dữ liệu auto-fill
    form.setFieldValue('form_data', autoFillData);
  };

  // Submit mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateRequestFormDto | FormData) =>
      employeeRequestFormService.create(data),
    onSuccess: () => {
      message.success('Tạo đơn yêu cầu thành công!');
      queryClient.invalidateQueries({ queryKey: ['request-forms'] });
      form.resetFields();
      setSelectedType(null);
      onSuccess?.();
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      console.error('Create error:', error);
      const errorMessage =
        error?.response?.data?.message || 'Có lỗi xảy ra khi tạo đơn yêu cầu';
      message.error(errorMessage);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data
    }: {
      id: number;
      data: CreateRequestFormDto | FormData;
    }) => employeeRequestFormService.update(id, data),
    onSuccess: () => {
      message.success('Cập nhật đơn yêu cầu thành công!');
      queryClient.invalidateQueries({ queryKey: ['request-forms'] });
      onSuccess?.();
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      console.error('Update error:', error);
      const errorMessage =
        error?.response?.data?.message ||
        'Có lỗi xảy ra khi cập nhật đơn yêu cầu';
      message.error(errorMessage);
    }
  });

  const { isPending } = editData ? updateMutation : createMutation;

  const onFinish = async (values: RequestFormData) => {
    if (!values.type) {
      message.error('Vui lòng chọn loại đơn yêu cầu');
      return;
    }

    if (!values.form_data || Object.keys(values.form_data).length === 0) {
      message.error('Vui lòng điền đầy đủ thông tin form');
      return;
    }

    // Validate chữ ký - PHẢI có chữ ký khi tạo đơn mới
    if (!editData) {
      const hasSignature =
        signature.signatureType === 'upload'
          ? !!signature.file
          : !!signature.canvasSignature;

      if (!hasSignature) {
        message.error('Vui lòng thêm chữ ký điện tử (tải file hoặc vẽ chữ ký)');
        return;
      }
    }

    // Validate supervisor_id cho đơn thường
    // (không phải ủy quyền, không phải supervisor, và không phải người nộp thẳng cho quản lý)
    if (
      values.type !== 'giay_uy_quyen' &&
      !isCurrentUserSupervisor &&
      !canSubmitDirectToManager &&
      !supervisorId
    ) {
      message.warning('Vui lòng chọn tổ trưởng để duyệt đơn');
      return;
    }

    // Nếu đang edit và không có thay đổi gì, không cần submit
    if (editData) {
      const hasFormDataChanged =
        JSON.stringify(values.form_data) !== JSON.stringify(editData.form_data);
      const hasNewSignature = signature.file || signature.canvasSignature;

      if (!hasFormDataChanged && !hasNewSignature) {
        message.info('Không có thay đổi nào để cập nhật');
        return;
      }
    }

    // Tự động lấy title từ loại đơn
    const autoTitle = REQUEST_FORM_TYPES[values.type];

    // Tự động generate content từ form_data với supervisor name
    const autoContent = generateContentFromFormData(
      values.type,
      values.form_data,
      supervisorId
    );

    // Helper function to convert File to base64 string
    const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });
    };

    // Prepare JSON payload
    const payload: CreateRequestFormDto = {
      type: values.type,
      title: autoTitle,
      content: autoContent,
      form_data:
        values.type === 'don_xin_tang_ca'
          ? {
              ngay_ap_dung: dayjs(
                values.form_data.ngay_ap_dung as string
              ).format('YYYY-MM-DD'),
              ca_lam: values.form_data.ca_lam,
              ly_do: values.form_data.ly_do
            }
          : values.form_data
    };

    // Thêm supervisor_id cho đơn thường (không phải đơn ủy quyền)
    if (values.type !== 'giay_uy_quyen') {
      if (isCurrentUserSupervisor) {
        // Nếu user là supervisor, set supervisor_id = chính user đó
        payload.supervisor_id = currentUser!.id.toString();
      } else if (supervisorId) {
        // Nếu user không phải supervisor, dùng supervisorId đã chọn
        payload.supervisor_id = supervisorId;
      }
    }

    // Xử lý chữ ký: Chỉ cập nhật nếu user thay đổi (có file hoặc canvas mới)
    // Nếu không có chữ ký mới, backend sẽ giữ nguyên chữ ký cũ khi edit
    const hasNewSignature = signature.file || signature.canvasSignature;

    if (hasNewSignature) {
      try {
        let base64Signature: string;

        // Convert signature to base64
        if (signature.signatureType === 'upload' && signature.file) {
          // Upload file: resize first, then convert to base64
          const resizedFile = await resizeSignatureImage(signature.file);
          base64Signature = await fileToBase64(resizedFile);
        } else if (
          signature.signatureType === 'draw' &&
          signature.canvasSignature
        ) {
          // Canvas: already base64, but need to resize
          const file = await dataURLToStandardFile(
            signature.canvasSignature,
            `signature_${Date.now()}.png`
          );
          base64Signature = await fileToBase64(file);
        } else {
          message.error('Có lỗi khi xử lý chữ ký. Vui lòng thử lại.');
          return;
        }

        // Add base64 signature to payload based on form type
        if (values.type === 'giay_uy_quyen') {
          // Đơn ủy quyền: Chữ ký người ủy quyền (delegator)
          payload.digital_signature_delegator = base64Signature;
        } else {
          // Các đơn khác: Chữ ký người làm đơn (applicant)
          payload.digital_signature_applicant = base64Signature;
        }
      } catch (error) {
        console.error('Error processing signature:', error);
        message.error('Có lỗi khi xử lý chữ ký. Vui lòng thử lại.');
        return;
      }
    } else if (editData) {
      // Khi edit và không có chữ ký mới, backend sẽ giữ nguyên chữ ký cũ
    } else {
      // Khi tạo mới nhưng không có chữ ký, yêu cầu user phải có chữ ký
      message.error('Vui lòng tải lên hoặc vẽ chữ ký của bạn');
      return;
    }

    try {
      if (editData) {
        await updateMutation.mutateAsync({
          id: editData.id,
          data: payload
        });
      } else {
        await createMutation.mutateAsync(payload);
      }
    } catch (error) {
      console.error('Submit error:', error);
    }
  };

  if (!currentUser) {
    return (
      <div className="py-8 text-center">
        <Typography.Text>Đang tải thông tin người dùng...</Typography.Text>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-5">
      {/* Modal Title */}
      <div className="mb-4 text-center sm:mb-6">
        <h2 className="mb-2 text-xl font-bold text-gray-800 sm:text-2xl">
          {editData ? 'Chỉnh sửa' : 'Tạo'} Đơn Yêu Cầu
        </h2>
        <p className="text-xs text-gray-500 sm:text-sm">
          Vui lòng điền đầy đủ thông tin bên dưới
        </p>
      </div>

      <Form
        {...customFormProps}
        form={form}
        layout="vertical"
        onFinish={onFinish}
        disabled={isPending}
      >
        {/* Request Form Type Selection */}
        <Divider orientation="center">
          <span className="text-base font-bold text-blue-600 sm:text-lg">
            Loại Đơn Yêu Cầu
          </span>
        </Divider>
        <Form.Item
          name="type"
          label={<span className="font-medium">Chọn loại đơn</span>}
          rules={[{ required: true, message: 'Vui lòng chọn loại đơn' }]}
        >
          <Select
            placeholder="-- Chọn loại đơn --"
            size="large"
            onChange={handleTypeChange}
            placement="bottomLeft"
            popupClassName="request-form-select-dropdown"
            disabled={!!editData} // Không cho phép thay đổi type khi edit
          >
            {Object.entries(REQUEST_FORM_TYPES).map(([key, value]) => (
              <Select.Option key={key} value={key}>
                {value}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* User Info Display */}
        {selectedType && currentUser && (
          <Card
            size="small"
            className="mb-4 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm"
          >
            {/* Mobile Layout - Stack vertically */}
            <div className="flex flex-col gap-2 text-sm sm:hidden">
              <div className="flex items-center gap-2">
                <span className="font-medium whitespace-nowrap text-gray-500">
                  Họ và Tên:
                </span>
                <span className="font-semibold text-gray-800">
                  {currentUser.name}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium whitespace-nowrap text-gray-500">
                    MSNV:
                  </span>
                  <span className="font-semibold text-gray-800">
                    {currentUser.id}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium whitespace-nowrap text-gray-500">
                    Giới tính:
                  </span>
                  <span className="font-semibold text-gray-800">
                    {getGenderText(currentUser.gender)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium whitespace-nowrap text-gray-500">
                  Chức vụ:
                </span>
                <span className="font-semibold text-gray-800">
                  {currentUser.role?.name || 'Chưa có'}
                </span>
              </div>
            </div>

            {/* Desktop Layout - 1 row with 4 columns */}
            <div className="hidden grid-cols-12 items-center gap-3 text-sm sm:grid">
              <div className="col-span-4 flex items-center justify-center gap-2">
                <span className="font-medium whitespace-nowrap text-gray-500">
                  Họ và Tên:
                </span>
                <span className="font-semibold text-gray-800">
                  {currentUser.name}
                </span>
              </div>
              <div className="col-span-2 flex items-center justify-center gap-2">
                <span className="font-medium whitespace-nowrap text-gray-500">
                  MSNV:
                </span>
                <span className="font-semibold text-gray-800">
                  {currentUser.id}
                </span>
              </div>
              <div className="col-span-2 flex items-center justify-center gap-2">
                <span className="font-medium whitespace-nowrap text-gray-500">
                  Giới tính:
                </span>
                <span className="font-semibold text-gray-800">
                  {getGenderText(currentUser.gender)}
                </span>
              </div>
              <div className="col-span-4 flex items-center justify-center gap-2">
                <span className="font-medium whitespace-nowrap text-gray-500">
                  Chức vụ:
                </span>
                <span className="font-semibold text-gray-800">
                  {currentUser.role?.name || 'Chưa có'}
                </span>
              </div>
            </div>

            <p className="mt-3 text-center text-xs text-blue-600 italic">
              Thông tin này sẽ được tự động điền vào đơn yêu cầu
            </p>
          </Card>
        )}

        {/* Supervisor Selection - Chỉ hiển thị cho đơn thường và user không phải supervisor và không phải direct to manager */}
        {selectedType &&
          selectedType !== 'giay_uy_quyen' &&
          !isCurrentUserSupervisor &&
          !canSubmitDirectToManager && (
            <Card>
              <Form.Item
                label="Tổ trưởng"
                required
                tooltip="Chọn tổ trưởng sẽ duyệt và ký đơn của bạn"
                help={
                  !supervisorId && 'Vui lòng chọn tổ trưởng trước khi gửi đơn'
                }
                validateStatus={!supervisorId ? 'warning' : 'success'}
              >
                <Select
                  placeholder="Chọn tổ trưởng..."
                  value={supervisorId}
                  onChange={setSupervisorId}
                  placement="bottomLeft"
                  popupClassName="request-form-select-dropdown"
                  style={{ width: '100%' }}
                  size="large"
                  showSearch
                  optionFilterProp="label"
                  filterOption={(input, option) =>
                    String(option?.label || '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  loading={isLoadingSupervisors}
                  notFoundContent={
                    isLoadingSupervisors
                      ? 'Đang tải danh sách tổ trưởng...'
                      : supervisors.length === 0
                        ? 'Không tìm thấy tổ trưởng'
                        : null
                  }
                  options={supervisors
                    .filter(
                      (sup) =>
                        selectedType !== 'don_xin_tang_ca' ||
                        (String(sup.id) !== String(currentUser.id) &&
                          (SUPERVISOR_IDS as readonly string[]).includes(
                            String(sup.id)
                          ))
                    )
                    .map((sup) => ({
                      value: sup.id?.toString(),
                      label: sup.name
                    }))}
                />
              </Form.Item>
              <div className="mt-2 mb-4 text-xs text-gray-600">
                <p>
                  <span className="font-semibold text-red-500">Lưu ý:</span> Vui
                  lòng chọn đúng tổ trưởng mà bạn đang làm việc cùng.
                </p>
              </div>
            </Card>
          )}

        {/* Thông báo cho supervisor */}
        {selectedType &&
          selectedType !== 'giay_uy_quyen' &&
          isCurrentUserSupervisor && (
            <Card className="border-blue-200 bg-blue-50">
              <div className="text-center text-blue-700">
                <p className="text-sm font-medium">
                  Đơn của bạn sẽ được gửi trực tiếp đến Quản lý nhà máy để duyệt
                </p>
              </div>
            </Card>
          )}

        {/* Thông báo cho người nộp thẳng quản lý */}
        {selectedType &&
          selectedType !== 'giay_uy_quyen' &&
          !isCurrentUserSupervisor &&
          canSubmitDirectToManager && (
            <Card className="border-green-200 bg-green-50">
              <div className="text-center text-green-700">
                <p className="text-sm font-medium">
                  Đơn của bạn sẽ được gửi trực tiếp đến Quản lý nhà máy để duyệt
                </p>
              </div>
            </Card>
          )}

        {selectedType && (
          <>
            <Divider orientation="center" className="mt-6">
              <span className="text-lg font-bold text-indigo-600">
                Chi Tiết Đơn Yêu Cầu
              </span>
            </Divider>
            <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-5">
              <FormFieldsRenderer formType={selectedType} />
            </div>
          </>
        )}

        {/* Digital Signature Section - CHO TẤT CẢ loại đơn */}
        {selectedType && (
          <>
            <Divider orientation="center" className="mt-6">
              <span className="text-lg font-bold text-blue-600">
                Chữ Ký Điện Tử
              </span>
            </Divider>

            <Card
              size="small"
              className="mb-4 border-blue-200"
              title={
                selectedType === 'giay_uy_quyen'
                  ? 'Chữ ký người ủy quyền'
                  : 'Chữ ký người làm đơn'
              }
            >
              {/* Hiển thị chữ ký cũ khi edit - UI đẹp hơn */}
              {editData && (
                <>
                  {/* Đơn ủy quyền: hiển thị digital_signature_delegator */}
                  {selectedType === 'giay_uy_quyen' &&
                    editData.digital_signature_delegator && (
                      <div className="mb-4 rounded-lg border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 text-center">
                        <h4 className="mb-3 text-base font-semibold text-blue-900">
                          Chữ ký người ủy quyền hiện tại
                        </h4>
                        <div className="mb-3 rounded-lg border border-blue-200 bg-white p-3">
                          <img
                            src={`${STORAGE_URL}/${editData.digital_signature_delegator}`}
                            alt="Chữ ký hiện tại"
                            className="mx-auto max-h-28"
                            style={{ maxWidth: '100%', objectFit: 'contain' }}
                          />
                        </div>
                        <div className="flex items-center justify-center gap-2 text-sm text-blue-700">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                          <span>
                            Nếu không thay đổi, chữ ký này sẽ được giữ nguyên
                          </span>
                        </div>
                      </div>
                    )}

                  {/* Đơn thường: hiển thị digital_signature_applicant */}
                  {selectedType !== 'giay_uy_quyen' &&
                    editData.digital_signature_applicant && (
                      <div className="mb-4 rounded-lg border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4 text-center">
                        <h4 className="mb-3 text-base font-semibold text-green-900">
                          Chữ ký người làm đơn hiện tại
                        </h4>
                        <div className="mb-3 rounded-lg border border-green-200 bg-white p-3">
                          <img
                            src={`${STORAGE_URL}/${editData.digital_signature_applicant}`}
                            alt="Chữ ký hiện tại"
                            className="mx-auto max-h-28"
                            style={{ maxWidth: '100%', objectFit: 'contain' }}
                          />
                        </div>
                        <div className="flex items-center justify-center gap-2 text-sm text-green-700">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500"></span>
                          <span>
                            Nếu không thay đổi, chữ ký này sẽ được giữ nguyên
                          </span>
                        </div>
                      </div>
                    )}
                </>
              )}

              {/* Khi edit và chưa chọn thay đổi chữ ký, chỉ hiển thị button */}
              {editData && !showSignaturePad ? (
                <div className="py-8 text-center">
                  <Button
                    type="primary"
                    size="large"
                    icon={<FileImageOutlined />}
                    onClick={() => setShowSignaturePad(true)}
                  >
                    Thay đổi chữ ký
                  </Button>
                  <p className="mt-3 text-xs text-gray-500">
                    Click nút trên để tải lên hoặc vẽ chữ ký mới
                  </p>
                </div>
              ) : (
                // Hiển thị Tabs khi tạo mới hoặc user chọn thay đổi chữ ký
                <Tabs
                  activeKey={signature.signatureType}
                  onChange={(key) => {
                    setSignature((prev) => ({
                      ...prev,
                      signatureType: key as 'upload' | 'draw'
                    }));
                  }}
                  centered
                  items={[
                    {
                      key: 'upload',
                      label: (
                        <span>
                          <FileImageOutlined /> Tải file
                        </span>
                      ),
                      children: (
                        <div className="text-center">
                          <Upload.Dragger
                            accept="image/*"
                            maxCount={1}
                            beforeUpload={(file) => {
                              const isValidType =
                                file.type.startsWith('image/');
                              if (!isValidType) {
                                message.error(
                                  'Chỉ chấp nhận file ảnh (JPG, PNG, GIF, SVG)!'
                                );
                                return false;
                              }

                              const isValidSize = file.size / 1024 / 1024 < 2;
                              if (!isValidSize) {
                                message.error('File phải nhỏ hơn 2MB!');
                                return false;
                              }

                              setSignature((prev) => ({
                                ...prev,
                                file: file,
                                canvasSignature: undefined
                              }));

                              message.success(
                                `${file.name} đã được chọn thành công`
                              );
                              return false;
                            }}
                            onRemove={() => {
                              setSignature((prev) => ({
                                ...prev,
                                file: undefined
                              }));
                            }}
                            fileList={
                              signature.file
                                ? [
                                    {
                                      uid: '1',
                                      name: signature.file.name,
                                      status: 'done' as const,
                                      url: signaturePreview
                                    }
                                  ]
                                : []
                            }
                          >
                            <p className="ant-upload-drag-icon">
                              <InboxOutlined />
                            </p>
                            <p className="ant-upload-text">
                              Kéo thả file chữ ký vào đây hoặc click để chọn
                            </p>
                            <p className="ant-upload-hint">
                              Hỗ trợ: JPG, PNG, GIF, SVG (tối đa 2MB)
                            </p>
                          </Upload.Dragger>
                        </div>
                      )
                    },
                    {
                      key: 'draw',
                      label: (
                        <span>
                          <FileImageOutlined /> Vẽ chữ ký
                        </span>
                      ),
                      children: (
                        <div className="text-center">
                          <Typography.Text className="mb-2 block text-sm">
                            Vẽ chữ ký của bạn:
                          </Typography.Text>
                          <div className="flex justify-center overflow-x-auto">
                            <SignaturePad
                              onSignatureChange={(canvasSignature) => {
                                setSignature((prev) => ({
                                  ...prev,
                                  canvasSignature: canvasSignature || undefined,
                                  file: undefined
                                }));
                              }}
                            />
                          </div>
                          <Typography.Text
                            type="secondary"
                            className="mt-2 block text-xs"
                          >
                            Vẽ chữ ký của bạn trong khung trên
                          </Typography.Text>
                        </div>
                      )
                    }
                  ]}
                />
              )}
            </Card>
          </>
        )}

        <Form.Item className="mt-6 mb-2">
          <div className="flex flex-col justify-end gap-2 sm:flex-row sm:gap-3">
            <Button
              size="large"
              onClick={() => {
                if (editData) {
                  // Nếu đang edit, đóng modal
                  onCancel?.();
                } else {
                  // Nếu đang tạo mới, reset form rồi đóng modal
                  form.resetFields();
                  setSelectedType(null);
                  setSignature({
                    signatureType: 'upload',
                    file: undefined,
                    canvasSignature: undefined
                  });
                  onCancel?.();
                }
              }}
              className="w-full sm:w-auto"
            >
              Hủy
            </Button>
            <Button
              size="large"
              type="primary"
              htmlType="submit"
              loading={isPending}
              disabled={!selectedType}
              className="w-full sm:w-auto"
            >
              {editData ? 'Cập nhật đơn' : 'Tạo đơn'}
            </Button>
          </div>
        </Form.Item>
      </Form>
    </div>
  );
};

export default CreateEditModal;
