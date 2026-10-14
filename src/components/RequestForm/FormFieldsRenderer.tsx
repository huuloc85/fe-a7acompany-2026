import React, { useEffect, useState } from 'react';
import { Form, Input, DatePicker, Select, TimePicker, message } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { employeeRequestFormService } from '@/services/RequestFormService';
import { useEmployeeSelection } from './Utilities';

interface Employee {
  id: number;
  name: string;
  employee_code?: string;
  gender?: string;
  role_name?: string;
}

// Hàm để disable các ngày trong quá khứ (cho phép chọn từ 10 ngày trước đến tương lai)
const disabledDate = (current: Dayjs | null): boolean => {
  // Disable các ngày trước 10 ngày so với hôm nay (cho phép chọn từ 10 ngày trước đến tương lai)
  const tenDaysAgo = dayjs().subtract(10, 'day').startOf('day');
  return current ? current.isBefore(tenDaysAgo) : false;
};

export const GiayUyQuyenForm: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const { setSelectedEmployee } = useEmployeeSelection();

  // Fetch employees when component mounts
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const response =
          await employeeRequestFormService.getAuthorizableEmployees();
        if (response.success) {
          setEmployees(response.data);
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
        message.error('Không thể tải danh sách nhân viên');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  // Handle employee selection
  const handleEmployeeSelect = (employeeId: string) => {
    const selectedEmployee = employees.find(
      (emp) => emp.id.toString() === employeeId
    );
    if (selectedEmployee) {
      setSelectedEmployee({
        id: selectedEmployee.id.toString(),
        name: selectedEmployee.name,
        employee_code: selectedEmployee.employee_code || ''
      });
    }
  };

  return (
    <>
      {/* Chọn nhân viên được ủy quyền */}
      <Form.Item
        name={['form_data', 'authorized_employee_id']}
        label={<span className="font-medium">Chọn người được ủy quyền</span>}
        rules={[
          {
            required: true,
            message: 'Vui lòng chọn người được ủy quyền'
          }
        ]}
      >
        <Select
          placeholder="-- Chọn người được ủy quyền --"
          size="large"
          loading={loading}
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          onChange={handleEmployeeSelect}
          options={employees.map((emp) => ({
            label: emp.employee_code
              ? `${emp.name} (${emp.employee_code})`
              : emp.name,
            value: emp.id.toString()
          }))}
        />
      </Form.Item>

      {/* Lưu ý trách nhiệm */}
      <div className="mb-6">
        <p className="text-sm text-gray-800">
          <span className="font-semibold text-red-600">Lưu ý:</span> Người ủy
          quyền và người được ủy quyền tự chịu trách nhiệm dân sự với nhau về
          mọi vấn đề phát sinh từ việc ủy quyền này. Công ty không chịu trách
          nhiệm pháp lý đối với các tranh chấp giữa hai bên.
        </p>
      </div>

      {/* Nội dung ủy quyền */}
      <Form.Item
        name={['form_data', 'authorization_scope']}
        label={<span className="font-medium">Nội dung ủy quyền</span>}
        rules={[
          { required: true, message: 'Vui lòng nhập nội dung ủy quyền' },
          { min: 10, message: 'Nội dung ủy quyền phải có ít nhất 10 ký tự' }
        ]}
      >
        <Input.TextArea
          rows={4}
          placeholder="Nhập nội dung ủy quyền..."
          showCount
          maxLength={255}
          size="large"
        />
      </Form.Item>
    </>
  );
};

export const DonXinTuChucForm: React.FC = () => {
  return (
    <>
      <Form.Item
        name={['form_data', 'ngay_tu_chuc']}
        label={<span className="font-medium">Ngày từ chức</span>}
        rules={[{ required: true, message: 'Vui lòng chọn ngày từ chức' }]}
      >
        <DatePicker
          format="DD/MM/YYYY"
          style={{ width: '100%' }}
          size="large"
          disabledDate={disabledDate}
          placeholder="Chọn ngày từ chức"
        />
      </Form.Item>
      <Form.Item
        name={['form_data', 'ly_do_tu_chuc']}
        label={<span className="font-medium">Lý do từ chức</span>}
        rules={[{ required: true, message: 'Vui lòng nhập lý do từ chức' }]}
      >
        <Input.TextArea
          rows={3}
          placeholder="Nhập lý do từ chức..."
          showCount
          maxLength={200}
          size="large"
        />
      </Form.Item>
    </>
  );
};

export const DonXinNghiViecForm: React.FC = () => {
  return (
    <>
      <Form.Item
        name={['form_data', 'ngay_nghi_viec']}
        label={<span className="font-medium">Ngày nghỉ việc</span>}
        rules={[{ required: true, message: 'Vui lòng chọn ngày nghỉ việc' }]}
      >
        <DatePicker
          format="DD/MM/YYYY"
          style={{ width: '100%' }}
          size="large"
          disabledDate={disabledDate}
          placeholder="Chọn ngày nghỉ việc"
        />
      </Form.Item>
      <Form.Item
        name={['form_data', 'ly_do_nghi_viec']}
        label={<span className="font-medium">Lý do nghỉ việc</span>}
        rules={[{ required: true, message: 'Vui lòng nhập lý do nghỉ việc' }]}
      >
        <Input.TextArea
          rows={3}
          placeholder="Nhập lý do nghỉ việc..."
          showCount
          maxLength={200}
          size="large"
        />
      </Form.Item>
    </>
  );
};

export const DonXinNghiPhepForm: React.FC = () => {
  const form = Form.useFormInstance();
  const [isMultipleDays, setIsMultipleDays] = useState(false);

  return (
    <>
      {/* Chọn loại nghỉ: 1 ngày hoặc nhiều ngày */}
      <Form.Item
        label={<span className="font-medium">Số ngày nghỉ</span>}
        required
      >
        <Select
          size="large"
          placeholder="Chọn số ngày nghỉ"
          value={isMultipleDays ? 'multiple' : 'single'}
          onChange={(value) => {
            const isMultiple = value === 'multiple';
            setIsMultipleDays(isMultiple);
            // Reset các trường ngày khi thay đổi
            form.setFieldValue(['form_data', 'ngay_nghi_phep'], undefined);
            form.setFieldValue(['form_data', 'ngay_nghi_phep_tu'], undefined);
            form.setFieldValue(['form_data', 'ngay_nghi_phep_den'], undefined);
          }}
          options={[
            { value: 'single', label: 'Nghỉ 1 ngày' },
            { value: 'multiple', label: 'Nghỉ từ 2 ngày trở lên' }
          ]}
        />
      </Form.Item>

      {/* Nếu nghỉ 1 ngày */}
      {!isMultipleDays && (
        <Form.Item
          name={['form_data', 'ngay_nghi_phep']}
          label={<span className="font-medium">Ngày nghỉ</span>}
          rules={[{ required: true, message: 'Vui lòng chọn ngày nghỉ' }]}
        >
          <DatePicker
            format="DD/MM/YYYY"
            style={{ width: '100%' }}
            size="large"
            disabledDate={disabledDate}
            placeholder="Chọn ngày nghỉ"
          />
        </Form.Item>
      )}

      {/* Nếu nghỉ nhiều ngày */}
      {isMultipleDays && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Form.Item
            name={['form_data', 'ngay_nghi_phep_tu']}
            label={<span className="font-medium">Từ ngày</span>}
            rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu' }]}
          >
            <DatePicker
              format="DD/MM/YYYY"
              style={{ width: '100%' }}
              size="large"
              disabledDate={disabledDate}
              placeholder="Chọn ngày bắt đầu"
              onChange={(date) => {
                // Nếu ngày kết thúc đã được chọn và nhỏ hơn ngày bắt đầu, reset nó
                const endDate = form.getFieldValue([
                  'form_data',
                  'ngay_nghi_phep_den'
                ]);
                if (endDate && date && endDate.isBefore(date)) {
                  form.setFieldValue(
                    ['form_data', 'ngay_nghi_phep_den'],
                    undefined
                  );
                }
              }}
            />
          </Form.Item>
          <Form.Item
            name={['form_data', 'ngay_nghi_phep_den']}
            label={<span className="font-medium">Đến ngày</span>}
            rules={[
              { required: true, message: 'Vui lòng chọn ngày kết thúc' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const startDate = getFieldValue([
                    'form_data',
                    'ngay_nghi_phep_tu'
                  ]);
                  if (!value || !startDate) {
                    return Promise.resolve();
                  }
                  // Cho phép đến ngày >= từ ngày (có thể bằng nhau nếu nghỉ 1 ngày trong option "Nghỉ từ 2 ngày trở lên")
                  if (value.isBefore(startDate, 'day')) {
                    return Promise.reject(
                      new Error('Ngày kết thúc không được trước ngày bắt đầu')
                    );
                  }
                  return Promise.resolve();
                }
              })
            ]}
          >
            <DatePicker
              format="DD/MM/YYYY"
              style={{ width: '100%' }}
              size="large"
              disabledDate={(current) => {
                // Disable ngày trước hôm nay
                if (disabledDate(current)) return true;
                // Disable ngày trước ngày bắt đầu
                const startDate = form.getFieldValue([
                  'form_data',
                  'ngay_nghi_phep_tu'
                ]);
                if (startDate && current) {
                  return current.isBefore(startDate, 'day');
                }
                return false;
              }}
              placeholder="Chọn ngày kết thúc"
            />
          </Form.Item>
        </div>
      )}

      <Form.Item
        name={['form_data', 'ly_do_nghi_phep']}
        label={<span className="font-medium">Lý do nghỉ phép</span>}
        rules={[{ required: true, message: 'Vui lòng nhập lý do nghỉ phép' }]}
      >
        <Input.TextArea
          rows={3}
          placeholder="Nhập lý do nghỉ phép..."
          showCount
          maxLength={200}
          size="large"
        />
      </Form.Item>

      <Form.Item
        name={['form_data', 'ghi_chu']}
        label={<span className="font-medium">Ghi chú</span>}
      >
        <Input.TextArea
          rows={2}
          placeholder="Nhập ghi chú (không bắt buộc)..."
          showCount
          maxLength={300}
          size="large"
        />
      </Form.Item>
    </>
  );
};

export const DonXinDiTreVeSomForm: React.FC = () => {
  return (
    <>
      {/* Ngày đi trễ-về sớm, Giờ vào, Giờ ra trên 1 hàng */}
      <div className="flex items-end gap-4">
        <Form.Item
          name={['form_data', 'ngay_ap_dung']}
          label={<span className="font-medium">Ngày đi trễ-về sớm</span>}
          rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
          className="flex-1"
        >
          <DatePicker
            format="DD/MM/YYYY"
            style={{ width: '100%' }}
            size="large"
            disabledDate={disabledDate}
            placeholder="Chọn ngày"
          />
        </Form.Item>
        <Form.Item
          name={['form_data', 'gio_vao_tre']}
          label={<span className="font-medium">Giờ vào</span>}
          className="flex-1"
        >
          <TimePicker
            format="HH:mm"
            style={{ width: '100%' }}
            size="large"
            placeholder="Chọn giờ vào"
          />
        </Form.Item>
        <Form.Item
          name={['form_data', 'gio_ve_som']}
          label={<span className="font-medium">Giờ ra</span>}
          className="flex-1"
        >
          <TimePicker
            format="HH:mm"
            style={{ width: '100%' }}
            size="large"
            placeholder="Chọn giờ ra"
          />
        </Form.Item>
      </div>

      {/* Lý do */}
      <Form.Item
        name={['form_data', 'ly_do_di_tre_ve_som']}
        label={<span className="font-medium">Lý do</span>}
        rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}
      >
        <Input.TextArea
          rows={3}
          placeholder="Nhập lý do..."
          showCount
          maxLength={200}
          size="large"
        />
      </Form.Item>
    </>
  );
};

export const DonXinTangCaForm: React.FC = () => (
  <>
    <Form.Item
      name={['form_data', 'ngay_ap_dung']}
      label="Ngày công tăng ca"
      extra="Với ca đêm, chọn ngày bắt đầu ca."
      rules={[{ required: true, message: 'Vui lòng chọn ngày tăng ca' }]}
    >
      <DatePicker
        format="DD/MM/YYYY"
        disabledDate={disabledDate}
        size="large"
      />
    </Form.Item>
    <Form.Item
      name={['form_data', 'ca_lam']}
      label="Ca làm"
      rules={[{ required: true, message: 'Vui lòng chọn ca làm' }]}
    >
      <Select
        size="large"
        options={[
          { value: 1, label: 'Ca ngày' },
          { value: 2, label: 'Ca đêm' }
        ]}
      />
    </Form.Item>
    <p className="mb-4 text-sm text-gray-500">
      Số giờ tăng ca được lấy từ chấm công thực tế, không cần đăng ký trước.
    </p>
    <Form.Item
      name={['form_data', 'ly_do']}
      label="Lý do tăng ca"
      rules={[
        {
          required: true,
          whitespace: true,
          message: 'Vui lòng nhập lý do tăng ca'
        }
      ]}
    >
      <Input.TextArea rows={3} maxLength={500} showCount />
    </Form.Item>
  </>
);

export const FormFieldsRenderer: React.FC<{ formType: string }> = ({
  formType
}) => {
  switch (formType) {
    case 'giay_uy_quyen':
      return <GiayUyQuyenForm />;
    case 'don_xin_tu_chuc':
      return <DonXinTuChucForm />;
    case 'don_xin_nghi_viec':
      return <DonXinNghiViecForm />;
    case 'don_xin_nghi_phep':
      return <DonXinNghiPhepForm />;
    case 'don_xin_di_tre_ve_som':
      return <DonXinDiTreVeSomForm />;
    case 'don_xin_tang_ca':
      return <DonXinTangCaForm />;
    default:
      return null;
  }
};
