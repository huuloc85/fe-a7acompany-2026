import React from 'react';
import { Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { STORAGE_URL } from '@/configs/environment.config';
import {
  RequestForm,
  REQUEST_FORM_TYPES,
  REQUEST_FORM_STATUSES
} from '@/types/requestFormType';
import { useAuthorizedEmployee } from '@/hooks/useAuthorizedEmployee';

const { Title, Text } = Typography;

// Danh sách nhân viên nộp đơn thẳng cho quản lý, bỏ qua tổ trưởng
const DIRECT_TO_MANAGER_IDS = ['20122900', '23030100', '17031400'] as const;

// Helper function to create cache-busting signature URL
const getSignatureUrl = (signaturePath: string, updatedAt?: string): string => {
  const timestamp = updatedAt ? new Date(updatedAt).getTime() : Date.now();
  return `${STORAGE_URL}/${signaturePath}?t=${timestamp}`;
};

interface RequestFormDetailProps {
  data: RequestForm;
}

const AuthorizationDetailView: React.FC<{ data: RequestForm }> = ({ data }) => {
  const parsedFormData = React.useMemo(() => {
    if (data.form_data) {
      if (typeof data.form_data === 'object') return data.form_data;
      if (typeof data.form_data === 'string') {
        try {
          return JSON.parse(data.form_data);
        } catch {
          return {};
        }
      }
    }
    return {};
  }, [data.form_data]);

  // Fetch thông tin đầy đủ của người được ủy quyền, với placeholder data từ backend response
  const { data: authorizedEmployee, isLoading: isLoadingAuthorized } =
    useAuthorizedEmployee(
      parsedFormData?.authorized_employee_id as string,
      // Placeholder data để hiển thị ngay (nếu backend đã trả về)
      parsedFormData?.authorized_employee_id
        ? {
            id: parsedFormData.authorized_employee_id as string,
            name: '', // Sẽ được fetch từ API
            employee_code: parsedFormData.authorized_employee_id as string
          }
        : undefined
    );

  // Fetch thông tin đầy đủ của người tạo đơn
  // Backend data.employee KHÔNG có role_name, phải fetch từ API
  const { data: delegatorEmployee, isLoading: isLoadingDelegator } =
    useAuthorizedEmployee(
      data.employee?.id?.toString() || data.employee_id?.toString(),
      // Placeholder data để hiển thị name ngay (optimistic UI)
      {
        id: data.employee?.id?.toString() || data.employee_id?.toString(),
        name: data.employee?.name || '',
        employee_code:
          data.employee?.id?.toString() || data.employee_id?.toString(),
        gender: (data.employee as Record<string, unknown> | null)?.gender as
          | string
          | undefined
        // KHÔNG set role_name ở đây - cần fetch từ API
      },
      false // Không skip fetch - cần lấy role_name từ API
    );

  const getGenderText = (gender: string | undefined) => {
    if (!gender) return '';
    switch (gender.toLowerCase()) {
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
        return gender;
    }
  };

  // Thông tin người ủy quyền - ưu tiên dữ liệu có sẵn từ data.employee, sau đó mới fetch thêm
  const delegatorName =
    data.employee?.name || delegatorEmployee?.name || 'Chưa xác định';
  const delegatorMSNV =
    data.employee?.id || delegatorEmployee?.id || data.employee_id || '';
  const delegatorGender =
    getGenderText(
      (data.employee as Record<string, unknown> | null)?.gender as
        | string
        | undefined
    ) || getGenderText(delegatorEmployee?.gender);
  // role_name phải lấy từ API fetch, hiển thị loading nếu đang fetch
  const delegatorPosition =
    delegatorEmployee?.role_name || (isLoadingDelegator ? '...' : '');

  // Thông tin người được ủy quyền - hiển thị ngay nếu có, sau đó update khi fetch xong
  const authorizedName =
    authorizedEmployee?.name || (isLoadingAuthorized ? '...' : '');
  const authorizedMSNV =
    authorizedEmployee?.id || parsedFormData?.authorized_employee_id || '';
  const authorizedGender = getGenderText(authorizedEmployee?.gender);
  const authorizedPosition =
    authorizedEmployee?.role_name || (isLoadingAuthorized ? '...' : '');

  const authorizationScope = parsedFormData?.authorization_scope || '';

  return (
    <div className="bg-white p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between gap-4 lg:mb-8">
        <div className="flex-1 text-left">
          <div className="mb-1">
            <Text strong style={{ fontSize: '12px', fontWeight: 'bold' }}>
              CÔNG TY TNHH MTV VINH VINH PHÁT
            </Text>
          </div>
          <div className="mb-1">
            <Text style={{ fontSize: '11px' }}>
              Địa chỉ: 359 Đường Ấp Chiến Lược, Khu phố 2,
            </Text>
          </div>
          <div>
            <Text style={{ fontSize: '11px' }}>
              Phường Bình Hưng Hoà, TP.Hồ Chí Minh.
            </Text>
          </div>
        </div>
        <div className="flex-1 text-center">
          <div className="mb-1">
            <Text strong style={{ fontSize: '12px', fontWeight: 'bold' }}>
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
            </Text>
          </div>
          <div>
            <Text
              strong
              style={{
                fontSize: '12px',
                fontWeight: 'bold',
                textDecoration: 'underline'
              }}
            >
              Độc lập - Tự do - Hạnh phúc
            </Text>
          </div>
        </div>
      </div>

      <div className="mb-3 text-center">
        <Title
          level={2}
          className="mb-2"
          style={{ textTransform: 'uppercase', fontWeight: 'bold' }}
        >
          GIẤY ỦY QUYỀN
        </Title>
        <div className="mb-2 text-left">
          <Text strong className="text-xs sm:text-sm">
            Kính gửi: - Ban giám đốc Công Ty TNHH MTV VINH VINH PHÁT
          </Text>
          <br />
          <Text
            strong
            className="text-xs sm:text-sm"
            style={{ marginLeft: '61px' }}
          >
            - Phòng nhân sự
          </Text>
        </div>
      </div>

      <div className="mb-3" style={{ lineHeight: '1.4' }}>
        <div className="mb-2">
          <Text strong>I. BÊN ỦY QUYỀN</Text>
          <div className="mt-1 hidden gap-4 md:flex">
            <div className="min-w-0 flex-[2]">
              <Text className="whitespace-nowrap">
                <strong>Họ và tên:</strong> {delegatorName}
              </Text>
            </div>
            <div className="min-w-0 flex-[0.8]">
              <Text className="whitespace-nowrap">
                <strong>MSNV:</strong> {delegatorMSNV}
              </Text>
            </div>
            <div className="min-w-0 flex-[0.7]">
              <Text className="whitespace-nowrap">
                <strong>Giới tính:</strong> {delegatorGender}
              </Text>
            </div>
            <div className="min-w-0 flex-[1.2]">
              <Text className="whitespace-nowrap">
                <strong>Chức vụ:</strong> {delegatorPosition}
              </Text>
            </div>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-2 md:hidden">
            <div className="col-span-2">
              <Text className="text-xs sm:text-sm">
                <strong>Họ và tên:</strong> {delegatorName}
              </Text>
            </div>
            <div>
              <Text className="text-xs sm:text-sm">
                <strong>MSNV:</strong> {delegatorMSNV}
              </Text>
            </div>
            <div>
              <Text className="text-xs sm:text-sm">
                <strong>Giới tính:</strong> {delegatorGender}
              </Text>
            </div>
            <div className="col-span-2">
              <Text className="text-xs sm:text-sm">
                <strong>Chức vụ:</strong> {delegatorPosition}
              </Text>
            </div>
          </div>
        </div>

        <div className="mb-2">
          <Text strong>II. BÊN ĐƯỢC ỦY QUYỀN</Text>
          <div className="mt-1 hidden gap-4 md:flex">
            <div className="min-w-0 flex-[2]">
              <Text className="whitespace-nowrap">
                <strong>Họ và tên:</strong> {authorizedName}
              </Text>
            </div>
            <div className="min-w-0 flex-[0.8]">
              <Text className="whitespace-nowrap">
                <strong>MSNV:</strong> {authorizedMSNV}
              </Text>
            </div>
            <div className="min-w-0 flex-[0.7]">
              <Text className="whitespace-nowrap">
                <strong>Giới tính:</strong> {authorizedGender}
              </Text>
            </div>
            <div className="min-w-0 flex-[1.2]">
              <Text className="whitespace-nowrap">
                <strong>Chức vụ:</strong> {authorizedPosition}
              </Text>
            </div>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-2 md:hidden">
            <div className="col-span-2">
              <Text className="text-xs sm:text-sm">
                <strong>Họ và tên:</strong> {authorizedName}
              </Text>
            </div>
            <div>
              <Text className="text-xs sm:text-sm">
                <strong>MSNV:</strong> {authorizedMSNV}
              </Text>
            </div>
            <div>
              <Text className="text-xs sm:text-sm">
                <strong>Giới tính:</strong> {authorizedGender}
              </Text>
            </div>
            <div className="col-span-2">
              <Text className="text-xs sm:text-sm">
                <strong>Chức vụ:</strong> {authorizedPosition}
              </Text>
            </div>
          </div>
        </div>

        <div className="mb-2">
          <Text strong>III. NỘI DUNG ỦY QUYỀN</Text>
          <div className="mt-1">
            <Text>{authorizationScope}</Text>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-3 text-right">
          <Text strong>
            TP.Hồ Chí Minh, ngày {dayjs(data.created_at).format('DD')} tháng{' '}
            {dayjs(data.created_at).format('MM')} năm{' '}
            {dayjs(data.created_at).format('YYYY')}
          </Text>
        </div>

        {/* Mobile: 2 columns stacked neatly | Desktop: 2 columns with wider spacing */}
        <div className="grid grid-cols-2 gap-4 sm:gap-16 md:gap-32 lg:gap-48">
          <div className="text-center">
            <div className="mb-2">
              <Text strong className="text-[11px] sm:text-base">
                Bên được ủy quyền
              </Text>
            </div>
            <div className="mb-2 flex h-[70px] items-center justify-center rounded border-2 border-dashed border-gray-300 bg-gray-50 p-1 sm:h-[100px] sm:p-2">
              {data.digital_signature_authorized ? (
                <img
                  src={getSignatureUrl(
                    data.digital_signature_authorized,
                    data.updated_at
                  )}
                  alt="Chữ ký bên được ủy quyền"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    display: 'block'
                  }}
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    if (target.parentElement) {
                      target.parentElement.innerHTML =
                        '<span class="text-gray-400 text-xs sm:text-sm">[Lỗi]</span>';
                    }
                  }}
                />
              ) : (
                <Text className="text-xs text-gray-400 sm:text-sm">
                  [Vùng chữ ký]
                </Text>
              )}
            </div>
            <div className="border-t border-gray-400 pt-1 sm:pt-2">
              <Text className="text-[11px] font-medium sm:text-base">
                {authorizedName}
              </Text>
            </div>
          </div>

          <div className="text-center">
            <div className="mb-2">
              <Text strong className="text-[11px] sm:text-base">
                Bên ủy quyền
              </Text>
            </div>
            <div className="mb-2 flex h-[70px] items-center justify-center rounded border-2 border-dashed border-gray-300 bg-gray-50 p-1 sm:h-[100px] sm:p-2">
              {data.digital_signature_delegator ? (
                <img
                  src={getSignatureUrl(
                    data.digital_signature_delegator,
                    data.updated_at
                  )}
                  alt="Chữ ký bên ủy quyền"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    display: 'block'
                  }}
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    if (target.parentElement) {
                      target.parentElement.innerHTML =
                        '<span class="text-gray-400 text-xs sm:text-sm">[Lỗi]</span>';
                    }
                  }}
                />
              ) : (
                <Text className="text-xs text-gray-400 sm:text-sm">
                  [Vùng chữ ký]
                </Text>
              )}
            </div>
            <div className="border-t border-gray-400 pt-1 sm:pt-2">
              <Text className="text-[11px] font-medium sm:text-base">
                {delegatorName}
              </Text>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StandardDetailView: React.FC<{ data: RequestForm }> = ({ data }) => {
  // Check if employee is the same as supervisor (supervisor creates their own request)
  const isEmployeeSupervisor = React.useMemo(() => {
    if (!data.supervisor_id || !data.employee_id) return false;
    return data.supervisor_id.toString() === data.employee_id.toString();
  }, [data.supervisor_id, data.employee_id]);

  // Check if employee can submit directly to manager (bypass supervisor)
  const canSubmitDirectToManager = React.useMemo(() => {
    if (!data.employee_id) return false;
    return (DIRECT_TO_MANAGER_IDS as readonly string[]).includes(
      data.employee_id.toString()
    );
  }, [data.employee_id]);

  const parsedFormData = React.useMemo(() => {
    if (data.form_data) {
      if (typeof data.form_data === 'object') return data.form_data;
      if (typeof data.form_data === 'string') {
        try {
          return JSON.parse(data.form_data);
        } catch {
          return {};
        }
      }
    }
    return {};
  }, [data.form_data]);

  // Extract supervisor name from content
  const supervisorName = React.useMemo(() => {
    if (!data.content || typeof data.content !== 'string') {
      return null;
    }

    // Tìm pattern: [Vùng chữ ký điện tử]     SUPERVISOR_NAME     [Quản lý nhà máy cần ký tại đây]
    const signatureLineMatch = data.content.match(
      data.type === 'don_xin_tang_ca'
        ? /\[Vùng chữ ký điện tử\][ \t]+([^\r\n]+)/
        : /\[Vùng chữ ký điện tử\]\s+(.+?)\s+(?:\[Quản lý nhà máy|Quản lý)/
    );

    if (signatureLineMatch && signatureLineMatch[1]) {
      const name = signatureLineMatch[1].trim();
      if (name.length > 3 && name.length < 50 && !name.includes('[')) {
        return name;
      }
    }

    return null;
  }, [data.content, data.type]);

  const getGenderText = (gender: string | undefined) => {
    switch (gender) {
      case 'male':
        return 'Nam';
      case 'female':
        return 'Nữ';
      case 'other':
        return 'Khác';
      default:
        return 'Nam';
    }
  };

  const renderFormattedContent = (content: string) => {
    // Validate content trước khi split
    if (!content || typeof content !== 'string') {
      console.warn('⚠️ Content is missing or invalid:', content);
      return (
        <div className="rounded border border-yellow-200 bg-yellow-50 p-4 text-center">
          <p className="font-medium text-yellow-700">
            ⚠️ Nội dung đơn chưa được tạo
          </p>
          <p className="mt-1 text-sm text-yellow-600">
            Vui lòng liên hệ quản trị viên để cập nhật
          </p>
        </div>
      );
    }

    const lines = content.split('\n');
    const processedElements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const cleanLine = line.replace(/\r/g, '').trim();

      // Older overtime templates did not include a date before the signature section.
      if (
        data.type === 'don_xin_tang_ca' &&
        /^Người làm đơn\s+Tổ trưởng(?:\s+Quản lý nhà máy)?$/.test(cleanLine)
      ) {
        break;
      }

      // Skip signature section (từ "TP.Hồ Chí Minh, ngày..." đến cuối)
      if (
        cleanLine.includes('TP.') &&
        cleanLine.includes('Hồ Chí Minh') &&
        cleanLine.includes('ngày')
      ) {
        // Skip tất cả dòng còn lại (phần ngày tháng + chữ ký)
        break;
      }

      const isPersonalInfoLine =
        (cleanLine.includes('Họ và tên:') || cleanLine.includes('Tôi tên:')) &&
        (cleanLine.includes('Giới tính:') || data.type === 'don_xin_tang_ca') &&
        cleanLine.includes('Chức vụ:');

      if (isPersonalInfoLine) {
        const nameMatch = cleanLine.match(
          /(?:Họ và tên|Tôi tên):\s*(.*?)(?=\s{2,}(?:Giới tính|Chức vụ):|$)/
        );
        const genderMatch = cleanLine.match(
          /Giới tính:\s*([^C]*?)(?=\s{2,}Chức vụ:|$)/
        );
        const positionMatch = cleanLine.match(/Chức vụ:\s*(.*)$/);

        const name = nameMatch?.[1]?.trim() || data?.employee?.name || '';
        const gender =
          genderMatch?.[1]?.trim() ||
          getGenderText((data?.employee as { gender?: string })?.gender) ||
          '';
        const position = positionMatch?.[1]?.trim() || '';
        const msnv = data?.employee?.id || '';

        processedElements.push(
          <React.Fragment key={i}>
            <div className="mb-2 hidden gap-4 md:flex">
              <div className="min-w-0 flex-[2]">
                <Text className="whitespace-nowrap">
                  <strong>Họ và Tên:</strong>{' '}
                  <span className="ml-2">{name}</span>
                </Text>
              </div>
              <div className="min-w-0 flex-[0.8]">
                <Text className="whitespace-nowrap">
                  <strong>MSNV:</strong> <span className="ml-2">{msnv}</span>
                </Text>
              </div>
              <div className="min-w-0 flex-[0.7]">
                <Text className="whitespace-nowrap">
                  <strong>Giới tính:</strong>{' '}
                  <span className="ml-2">{gender}</span>
                </Text>
              </div>
              <div className="min-w-0 flex-[1.2]">
                <Text className="whitespace-nowrap">
                  <strong>Chức vụ:</strong>{' '}
                  <span className="ml-2">{position}</span>
                </Text>
              </div>
            </div>
            <div className="mb-2 grid grid-cols-2 gap-2 md:hidden">
              <div className="col-span-2">
                <Text className="text-xs sm:text-sm">
                  <strong>Họ và Tên:</strong>{' '}
                  <span className="ml-2">{name}</span>
                </Text>
              </div>
              <div>
                <Text className="text-xs sm:text-sm">
                  <strong>MSNV:</strong> <span className="ml-2">{msnv}</span>
                </Text>
              </div>
              <div>
                <Text className="text-xs sm:text-sm">
                  <strong>Giới tính:</strong>{' '}
                  <span className="ml-2">{gender}</span>
                </Text>
              </div>
              <div className="col-span-2">
                <Text className="text-xs sm:text-sm">
                  <strong>Chức vụ:</strong>{' '}
                  <span className="ml-2">{position}</span>
                </Text>
              </div>
            </div>
          </React.Fragment>
        );
      } else {
        if (cleanLine !== '') {
          const reasonPatternMatch = cleanLine.match(
            /(.*?)Lý do:\s*\.{10,}(.*)/i
          );

          if (reasonPatternMatch) {
            const beforeReason = reasonPatternMatch[1];
            const afterReason = reasonPatternMatch[2];

            let reason = '';
            if (parsedFormData?.ly_do_tu_chuc)
              reason = parsedFormData.ly_do_tu_chuc;
            else if (parsedFormData?.ly_do_nghi_viec)
              reason = parsedFormData.ly_do_nghi_viec;
            else if (parsedFormData?.ly_do_nghi_phep)
              reason = parsedFormData.ly_do_nghi_phep;
            else if (parsedFormData?.ly_do_di_tre_ve_som)
              reason = parsedFormData.ly_do_di_tre_ve_som;
            else if (parsedFormData?.ly_do) reason = parsedFormData.ly_do;

            processedElements.push(
              <div key={i} className="mb-0.5">
                <Text>
                  {beforeReason}Lý do:{' '}
                  {reason ||
                    '........................................................................................................................................'}
                  {afterReason}
                </Text>
              </div>
            );
          } else {
            const datePhepPatternMatch = cleanLine.match(
              /(.*?)Ngày nghỉ:\s*([^]*)/i
            );

            if (datePhepPatternMatch) {
              const beforeDate = datePhepPatternMatch[1];
              let dateText = '................';
              let dateValue = null;

              if (parsedFormData?.ngay_nghi_phep)
                dateValue = new Date(parsedFormData.ngay_nghi_phep);
              else if (parsedFormData?.ngay_nghi)
                dateValue = new Date(parsedFormData.ngay_nghi);

              if (dateValue && !isNaN(dateValue.getTime())) {
                dateText = `${dateValue.getDate()}/${dateValue.getMonth() + 1}/${dateValue.getFullYear()}`;
              }

              processedElements.push(
                <div key={i} className="mb-0.5">
                  <Text>
                    {beforeDate}Ngày nghỉ: <strong>{dateText}</strong>
                  </Text>
                </div>
              );
            } else {
              const diTreVeSomPatternMatch =
                cleanLine.match(/Ngày đi trễ-về sớm:/i);

              if (diTreVeSomPatternMatch) {
                let dateText = '................';
                let timeInText = '.....................';
                let timeOutText = '..................';

                // Check ngay_ap_dung (new field name)
                if (parsedFormData?.ngay_ap_dung) {
                  const dateValue = new Date(parsedFormData.ngay_ap_dung);
                  if (!isNaN(dateValue.getTime())) {
                    dateText = `${dateValue.getDate()} tháng ${dateValue.getMonth() + 1} năm ${dateValue.getFullYear()}`;
                  }
                }

                // Check gio_vao_tre (new field name)
                if (parsedFormData?.gio_vao_tre) {
                  const timeInValue = new Date(parsedFormData.gio_vao_tre);
                  if (!isNaN(timeInValue.getTime())) {
                    timeInText = `${timeInValue.getHours().toString().padStart(2, '0')}:${timeInValue.getMinutes().toString().padStart(2, '0')}`;
                  }
                }

                // Check gio_ve_som (new field name)
                if (parsedFormData?.gio_ve_som) {
                  const timeOutValue = new Date(parsedFormData.gio_ve_som);
                  if (!isNaN(timeOutValue.getTime())) {
                    timeOutText = `${timeOutValue.getHours().toString().padStart(2, '0')}:${timeOutValue.getMinutes().toString().padStart(2, '0')}`;
                  }
                }

                processedElements.push(
                  <div key={i} className="mb-1">
                    <div className="grid grid-cols-3 gap-6">
                      <div className="text-left">
                        <Text>
                          Ngày đi trễ-về sớm: <strong>{dateText}</strong>
                        </Text>
                      </div>
                      <div className="text-center">
                        <Text>
                          Giờ vào: <strong>{timeInText}</strong>
                        </Text>
                      </div>
                      <div className="text-right">
                        <Text>
                          Giờ ra: <strong>{timeOutText}</strong>
                        </Text>
                      </div>
                    </div>
                  </div>
                );
              } else {
                const datePatternMatch = cleanLine.match(
                  /(.*?)(kể từ ngày\s+(?:\.{3,}|\d+)\s*tháng\s+(?:\.{3,}|\d+)\s*năm\s+(?:\.{3,}|\d+))(.*)/i
                );

                if (datePatternMatch) {
                  const beforeDate = datePatternMatch[1];
                  const afterDate = datePatternMatch[3];

                  let dateText =
                    'kể từ ngày ....... tháng ....... năm ........';
                  let dateValue = null;

                  if (parsedFormData?.ngay_tu_chuc)
                    dateValue = new Date(parsedFormData.ngay_tu_chuc);
                  else if (parsedFormData?.ngay_nghi_viec)
                    dateValue = new Date(parsedFormData.ngay_nghi_viec);
                  else if (parsedFormData?.ngay_nghi_phep)
                    dateValue = new Date(parsedFormData.ngay_nghi_phep);
                  else if (parsedFormData?.ngay_di_tre_ve_som)
                    dateValue = new Date(parsedFormData.ngay_di_tre_ve_som);
                  else if (parsedFormData?.ngay_thoi_viec)
                    dateValue = new Date(parsedFormData.ngay_thoi_viec);
                  else if (parsedFormData?.ngay_nghi)
                    dateValue = new Date(parsedFormData.ngay_nghi);

                  if (dateValue && !isNaN(dateValue.getTime())) {
                    dateText = `kể từ ngày ${dateValue.getDate()} tháng ${dateValue.getMonth() + 1} năm ${dateValue.getFullYear()}`;
                  }

                  processedElements.push(
                    <div key={i} className="mb-0.5">
                      <Text>
                        {beforeDate}
                        <strong>{dateText}</strong>
                        {afterDate}
                      </Text>
                    </div>
                  );
                } else {
                  // Parse HTML tags like <b> for bold text and <small> for small text
                  const parseHTMLContent = (text: string) => {
                    const parts: React.ReactNode[] = [];
                    // Parse cả <b> và <small> tags
                    const regex =
                      /<b><small>(.*?)<\/small><\/b>|<b>(.*?)<\/b>|<small>(.*?)<\/small>/g;
                    let lastIndex = 0;
                    let match;

                    while ((match = regex.exec(text)) !== null) {
                      // Add text before the tag
                      if (match.index > lastIndex) {
                        parts.push(text.substring(lastIndex, match.index));
                      }

                      // Check which pattern matched
                      if (match[1]) {
                        // <b><small>content</small></b>
                        parts.push(
                          <strong key={match.index}>
                            <small>{match[1]}</small>
                          </strong>
                        );
                      } else if (match[2]) {
                        // <b>content</b>
                        parts.push(
                          <strong key={match.index}>{match[2]}</strong>
                        );
                      } else if (match[3]) {
                        // <small>content</small>
                        parts.push(<small key={match.index}>{match[3]}</small>);
                      }

                      lastIndex = regex.lastIndex;
                    }

                    // Add remaining text
                    if (lastIndex < text.length) {
                      parts.push(text.substring(lastIndex));
                    }

                    return parts.length > 0 ? parts : text;
                  };

                  processedElements.push(
                    <div key={i} className="mb-0.5">
                      <Text>{parseHTMLContent(cleanLine)}</Text>
                    </div>
                  );
                }
              }
            }
          }
        }
      }
      i++;
    }
    return processedElements;
  };

  return (
    <div className="bg-white p-4 sm:p-6 md:p-8">
      <div className="mb-8 flex items-start justify-between">
        <div className="text-left">
          <div className="mb-1">
            <Text strong style={{ fontSize: '14px', fontWeight: 'bold' }}>
              CÔNG TY TNHH MTV VINH VINH PHÁT
            </Text>
          </div>
          <div className="mb-1">
            <Text style={{ fontSize: '12px' }}>
              Địa chỉ: 359 Đường Ấp Chiến Lược, Khu phố 2,
            </Text>
          </div>
          <div>
            <Text style={{ fontSize: '12px' }}>
              Phường Bình Hưng Hoà, TP.Hồ Chí Minh.
            </Text>
          </div>
        </div>
        <div className="text-center">
          <div className="mb-1">
            <Text strong style={{ fontSize: '14px', fontWeight: 'bold' }}>
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
            </Text>
          </div>
          <div>
            <Text
              strong
              style={{
                fontSize: '14px',
                fontWeight: 'bold',
                textDecoration: 'underline'
              }}
            >
              Độc lập - Tự do - Hạnh phúc
            </Text>
          </div>
        </div>
      </div>

      <div className="mb-6 text-center">
        <Title
          level={2}
          className="mb-2"
          style={{ textTransform: 'uppercase', fontWeight: 'bold' }}
        >
          {REQUEST_FORM_TYPES[data.type]}
        </Title>
        <div className="mb-4 text-left">
          <div>
            <Text strong>
              {data.type === 'don_xin_tang_ca'
                ? 'Kính gửi: Tổ trưởng phụ trách'
                : 'Kính gửi: - Ban giám đốc Công Ty TNHH MTV VINH VINH PHÁT'}
            </Text>
          </div>
          {data.type !== 'don_xin_tang_ca' && (
            <div style={{ paddingLeft: '61px' }}>
              <Text strong>- Phòng nhân sự</Text>
            </div>
          )}
        </div>
      </div>

      <div className="mb-4" style={{ lineHeight: '1.4' }}>
        {renderFormattedContent(data.content)}
      </div>

      <div className="mt-8">
        <div className="mb-6 text-right">
          <Text strong>
            TP.Hồ Chí Minh, ngày {dayjs(data.created_at).format('DD')} tháng{' '}
            {dayjs(data.created_at).format('MM')} năm{' '}
            {dayjs(data.created_at).format('YYYY')}
          </Text>
        </div>

        {/* Mobile: stack 2 cols on top + 1 below | Desktop: proper 2/3 columns side by side */}
        {(() => {
          const showSupervisor =
            data.type === 'don_xin_tang_ca' ||
            (!isEmployeeSupervisor && !canSubmitDirectToManager);
          const colCount =
            data.type === 'don_xin_tang_ca' ? 2 : showSupervisor ? 3 : 2;

          // Reusable signature block
          const SignatureBlock = ({
            label,
            signaturePath,
            name,
            placeholder
          }: {
            label: string;
            signaturePath?: string | null;
            name: string;
            placeholder: string;
          }) => (
            <div className="min-w-0 text-center">
              <div className="mb-1.5 sm:mb-3">
                <Text
                  strong
                  style={{
                    fontSize: 'clamp(7px, 2.5vw, 16px)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {label}
                </Text>
              </div>
              <div className="mb-1.5 flex h-[65px] items-center justify-center rounded border-2 border-dashed border-gray-300 bg-gray-50 p-1 sm:mb-4 sm:h-[100px] sm:p-2">
                {signaturePath ? (
                  <img
                    src={getSignatureUrl(signaturePath, data.updated_at)}
                    alt={label}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      display: 'block'
                    }}
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      if (target.parentElement) {
                        target.parentElement.innerHTML =
                          '<span class="text-gray-400 text-xs">[Lỗi]</span>';
                      }
                    }}
                  />
                ) : (
                  <Text className="text-[10px] text-gray-400 sm:text-sm">
                    {placeholder}
                  </Text>
                )}
              </div>
              <div className="border-t border-gray-400 pt-1 sm:pt-2">
                <Text
                  className="font-medium"
                  style={{
                    fontSize: 'clamp(7px, 2.5vw, 16px)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {name}
                </Text>
              </div>
            </div>
          );

          return (
            <div
              className={`grid gap-3 sm:gap-8 ${
                colCount === 3 ? 'grid-cols-3' : 'grid-cols-2'
              }`}
            >
              <SignatureBlock
                label={
                  isEmployeeSupervisor ? 'Tổ trưởng làm đơn' : 'Người làm đơn'
                }
                signaturePath={data.digital_signature_applicant}
                name={data.employee?.name || 'Người làm đơn'}
                placeholder="[Vùng chữ ký]"
              />

              {showSupervisor && (
                <SignatureBlock
                  label="Tổ trưởng"
                  signaturePath={data.digital_signature_supervisor}
                  name={data.supervisor?.name || supervisorName || '__________'}
                  placeholder="[Tổ trưởng ký]"
                />
              )}

              {data.type !== 'don_xin_tang_ca' && (
                <SignatureBlock
                  label="Quản lý nhà máy"
                  signaturePath={data.digital_signature_manager}
                  name="Nguyễn Được Thưởng"
                  placeholder="[Quản lý ký]"
                />
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

// ── Approval Stamp Component ─────────────────────────────────
const ApprovalStamp: React.FC<{
  status: 'approved' | 'rejected' | 'authorized_approved';
  approvedAt?: string | null;
  approverName?: string | null;
}> = ({ status, approvedAt, approverName }) => {
  const isApproved = status === 'approved' || status === 'authorized_approved';
  const stampColor = isApproved ? '#dc2626' : '#6b7280';
  const stampText = isApproved ? 'ĐÃ DUYỆT' : 'TỪ CHỐI';

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        top: '50%',
        right: '8%',
        transform: 'translate(0, -50%) rotate(-15deg)',
        zIndex: 10,
        opacity: 0.8
      }}
    >
      <div
        style={{
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          border: `6px double ${stampColor}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          background: 'transparent'
        }}
      >
        {/* Inner circle */}
        <div
          style={{
            position: 'absolute',
            inset: '8px',
            borderRadius: '50%',
            border: `2px solid ${stampColor}`
          }}
        />

        {/* Top arc text - Company name */}
        <svg
          viewBox="0 0 200 200"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%'
          }}
        >
          <defs>
            <path id="stamp-arc-top" d="M 30,100 A 70,70 0 0,1 170,100" />
            <path id="stamp-arc-bottom" d="M 170,108 A 70,70 0 0,1 30,108" />
          </defs>
          <text
            fill={stampColor}
            fontSize="11"
            fontWeight="bold"
            fontFamily="serif"
            letterSpacing="2"
          >
            <textPath
              href="#stamp-arc-top"
              textAnchor="middle"
              startOffset="50%"
            >
              VINH VINH PHÁT
            </textPath>
          </text>
          <text
            fill={stampColor}
            fontSize="9"
            fontWeight="bold"
            fontFamily="serif"
            letterSpacing="1"
          >
            <textPath
              href="#stamp-arc-bottom"
              textAnchor="middle"
              startOffset="50%"
            >
              CÔNG TY TNHH MTV
            </textPath>
          </text>
        </svg>

        {/* Star */}
        <div
          style={{
            color: stampColor,
            fontSize: '18px',
            lineHeight: 1,
            marginBottom: '2px',
            marginTop: '-10px'
          }}
        >
          ★
        </div>

        {/* Main status text */}
        <div
          style={{
            color: stampColor,
            fontSize: '22px',
            fontWeight: 900,
            letterSpacing: '3px',
            lineHeight: 1,
            fontFamily: 'serif'
          }}
        >
          {stampText}
        </div>

        {/* Date */}
        {approvedAt && (
          <div
            style={{
              color: stampColor,
              fontSize: '10px',
              fontWeight: 600,
              marginTop: '4px',
              fontFamily: 'monospace'
            }}
          >
            {dayjs(approvedAt).format('DD/MM/YYYY')}
          </div>
        )}

        {/* Approver */}
        {approverName && (
          <div
            style={{
              color: stampColor,
              fontSize: '8px',
              fontWeight: 600,
              marginTop: '2px',
              maxWidth: '120px',
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {approverName}
          </div>
        )}
      </div>
    </div>
  );
};

export const DetailView: React.FC<RequestFormDetailProps> = ({ data }) => {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-700',
          dot: 'bg-amber-400',
          tagColor: 'warning' as const
        };
      case 'approved':
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          text: 'text-emerald-700',
          dot: 'bg-emerald-400',
          tagColor: 'success' as const
        };
      case 'rejected':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          dot: 'bg-red-400',
          tagColor: 'error' as const
        };
      case 'authorized_approved':
        return {
          bg: 'bg-cyan-50',
          border: 'border-cyan-200',
          text: 'text-cyan-700',
          dot: 'bg-cyan-400',
          tagColor: 'cyan' as const
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-700',
          dot: 'bg-gray-400',
          tagColor: 'default' as const
        };
    }
  };

  // Get approver name for stamp
  const approverName = React.useMemo(() => {
    if (data.managerApprovedBy?.name) return data.managerApprovedBy.name;
    if (data.manager_approved_by_employee?.name)
      return data.manager_approved_by_employee.name;
    if (data.approvedBy?.name) return data.approvedBy.name;
    if (data.approved_by_employee?.name) return data.approved_by_employee.name;
    return null;
  }, [data]);

  const showStamp =
    data.status === 'approved' ||
    data.status === 'rejected' ||
    data.status === 'authorized_approved';
  const statusStyle = getStatusStyle(data.status);

  const renderFormContent = () => {
    if (data.type === 'giay_uy_quyen') {
      return <AuthorizationDetailView data={data} />;
    }
    return <StandardDetailView data={data} />;
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* ── Metadata Header ─────────────────────────────────────── */}
      <div
        className={`no-print mb-4 rounded-xl border ${statusStyle.border} ${statusStyle.bg} p-3 sm:p-4`}
      >
        {/* Top row: status + form type */}
        <div className="mb-2 flex flex-wrap items-center gap-2 sm:mb-3">
          <div
            className={`flex items-center gap-1.5 rounded-full border ${statusStyle.border} bg-white px-2.5 py-1 sm:px-3`}
          >
            <span
              className={`inline-block h-2 w-2 rounded-full ${statusStyle.dot}`}
              style={{
                animation:
                  data.status === 'pending' ? 'pulse 2s infinite' : 'none'
              }}
            />
            <span
              className={`text-xs font-semibold sm:text-sm ${statusStyle.text}`}
            >
              {REQUEST_FORM_STATUSES[data.status]}
            </span>
          </div>
          <Tag color="blue" className="!m-0 !rounded-full !text-xs sm:!text-sm">
            {REQUEST_FORM_TYPES[data.type]}
          </Tag>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4 sm:text-sm">
          <div>
            <span className="text-gray-500">Nhân viên</span>
            <p className="truncate font-medium text-gray-800">
              {data.employee?.name}
            </p>
          </div>
          <div>
            <span className="text-gray-500">MSNV</span>
            <p className="font-medium text-gray-800">{data.employee_id}</p>
          </div>
          <div>
            <span className="text-gray-500">Ngày nộp</span>
            <p className="font-medium text-gray-800">
              {dayjs(data.submitted_at).format('DD/MM/YYYY HH:mm')}
            </p>
          </div>
          {data.approved_at ? (
            <div>
              <span className="text-gray-500">Ngày duyệt</span>
              <p className="font-medium text-gray-800">
                {dayjs(data.approved_at).format('DD/MM/YYYY HH:mm')}
              </p>
            </div>
          ) : (
            <div>
              <span className="text-gray-500">Cập nhật</span>
              <p className="font-medium text-gray-800">
                {dayjs(data.updated_at).format('DD/MM/YYYY HH:mm')}
              </p>
            </div>
          )}
        </div>

        {/* Rejection reason */}
        {data.status === 'rejected' && data.rejection_reason && (
          <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-red-200 bg-white/80 p-2 sm:mt-3 sm:p-2.5">
            <span className="mt-0.5 text-red-500">✕</span>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold text-red-600 sm:text-sm">
                Lý do từ chối:
              </span>
              <p className="mt-0.5 text-xs text-gray-700 sm:text-sm">
                {data.rejection_reason}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Document Content ────────────────────────────────────── */}
      <div className="print-content relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {renderFormContent()}
        {showStamp && (
          <ApprovalStamp
            status={
              data.status as 'approved' | 'rejected' | 'authorized_approved'
            }
            approvedAt={
              data.approved_at ||
              data.manager_approved_at ||
              data.authorized_approved_at
            }
            approverName={approverName}
          />
        )}
      </div>

      {/* Pulse animation for pending status */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

export default DetailView;
