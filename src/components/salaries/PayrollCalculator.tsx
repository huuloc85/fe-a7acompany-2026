import AppSearchInput from '@/components/common/AppSearchInput';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  fetchPayrollPublication,
  publishPayroll,
  savePayrollDraft
} from '@/services/PayrollPublicationService';
import type { PayrollPublication } from '@/services/PayrollPublicationService';

import { payrollBanks, payrollBankBin } from '@/utils/payrollBanks';
import PayrollBankLabel from './PayrollBankLabel';
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Select,
  Collapse,
  Table,
  Tabs,
  Typography,
  message
} from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { saveAs } from 'file-saver';
import AppButton from '@components/common/AppButton';
import ComponentCard from '@components/common/ComponentCard';
import PayrollExcelSheets from './PayrollExcelSheets';
import {
  fetchPayrollAdjustments,
  savePayrollAdjustment
} from '@/services/PayrollAdjustmentService';
import type { SavedPayrollAdjustment } from '@/services/PayrollAdjustmentService';
import { payrollEmployeeCode } from '@/utils/payrollIdentity';
import { fetchAttendancesCalculated } from '@services/AttendanceService';
import {
  fetchPayrollProfiles,
  savePayrollProfile,
  createPayrollProfile,
  deletePayrollProfile
} from '@services/PayrollProfileService';
import type { SavedPayrollProfile } from '@services/PayrollProfileService';
import {
  fetchPayrollHolidays,
  savePayrollHolidays
} from '@services/PayrollHolidayService';

const payrollCompanyKey = (company?: string) => {
  const value = String(company ?? 'VVP')
    .trim()
    .toUpperCase();
  return value === 'A7A' ? 'A7A' : 'VVP';
};
import { applyPayrollHolidays } from '@/utils/payrollHolidays';
import type { PayrollHolidays } from '@/utils/payrollHolidays';
import { getApiErrorMessage } from '@/utils/apiError';
import type { AttendanceResult } from '@/utils/attendanceUtil';
import {
  payrollExcelFormulas,
  payrollFormulaNotes
} from '@/utils/payrollFormulas';
import {
  calculatePayroll,
  defaultPayrollRules,
  emptyPayrollAdjustments
} from '@/utils/payrollCalculation';
import type {
  PayrollAdjustments,
  PayrollProfile,
  PayrollRules
} from '@/utils/payrollCalculation';

const money = (value: number) => value.toLocaleString('vi-VN');
const ruleFields: [keyof PayrollRules, string][] = [
  ['standardDays', 'Công chuẩn/kỳ'],
  ['hoursPerDay', 'Giờ/công'],
  ['nightMultiplier', 'Hệ số ca đêm'],
  ['dayOvertimeMultiplier', 'Hệ số TC ngày'],
  ['nightOvertimeMultiplier', 'Hệ số TC đêm'],
  ['reinforcementMultiplier', 'Hệ số tăng cường'],
  ['socialRate', 'Tỷ lệ BHXH'],
  ['healthRate', 'Tỷ lệ BHYT'],
  ['unemploymentRate', 'Tỷ lệ BHTN'],
  ['unionRate', 'Tỷ lệ đoàn phí'],
  ['personalDeduction', 'Giảm trừ bản thân'],
  ['dependentDeduction', 'Giảm trừ/người phụ thuộc']
];
type NumericProfile = Exclude<
  keyof PayrollProfile,
  | 'employeeId'
  | 'attendanceEmployeeId'
  | 'name'
  | 'department'
  | 'bankAccount'
  | 'bankBin'
  | 'company'
>;
const profileFields: [NumericProfile, string][] = [
  ['basicSalary', 'Lương căn bản'],
  ['responsibility', 'Phụ cấp trách nhiệm'],
  ['housingPerDay', 'Nhà ở/công'],
  ['travelPerDay', 'Đi lại/công'],
  ['mealPerDay', 'Cơm/công'],
  ['diligence', 'Chuyên cần mặc định'],
  ['legacySalary26Days', 'Lương CB chính thức/26 ngày (mẫu cũ)'],
  ['insuranceBase', 'Căn cứ đóng BH đã xét trần'],
  ['unionBase', 'Căn cứ đoàn phí'],
  ['dependents', 'Người phụ thuộc đủ điều kiện']
];
type NumericAdjustment = Exclude<
  keyof PayrollAdjustments,
  'note' | 'noAttendanceConfirmed'
>;
const adjustmentFields: [NumericAdjustment, string][] = [
  ['paidLeaveDays', 'Số ngày hiếu/hỷ'],
  ['authorizedLeaveDays', 'Có phép (ngày)'],
  ['unauthorizedLeaveDays', 'Không phép (ngày)'],
  ['downtimeDays', 'Ngày ngừng việc hưởng lương'],
  ['menstrualHours', 'Giờ hành kinh'],
  ['diligence', 'Chuyên cần được duyệt'],
  ['bonus', 'Thưởng chuyên cần quý'],
  ['referral', 'Tiền giới thiệu nhân sự'],
  ['otherIncome', 'Thu nhập bổ sung (phép năm, phụ cấp tăng cường…)'],
  ['taxExemptIncome', 'Phần thu nhập miễn thuế đã xác nhận'],
  ['advance', 'Tạm ứng'],
  ['otherDeduction', 'Khấu trừ khác']
];

export default function PayrollCalculator() {
  const [configurationOpen, setConfigurationOpen] = useState(false);
  const [savedAdjustments, setSavedAdjustments] = useState<
    SavedPayrollAdjustment[]
  >([]);
  const [adjustmentPeriod, setAdjustmentPeriod] = useState('');
  const [adjustmentError, setAdjustmentError] = useState('');
  const [adjustmentReload, setAdjustmentReload] = useState(0);
  const [cellEditing, setCellEditing] = useState<{
    profile: PayrollProfile;
    key: NumericAdjustment;
    label: string;
  } | null>(null);
  const [cellValue, setCellValue] = useState<number | null>(0);
  const [month, setMonth] = useState<Dayjs>(dayjs().startOf('month'));
  const [profiles, setProfiles] = useState<PayrollProfile[]>([]);
  const [adjustments, setAdjustments] = useState<
    Record<string, PayrollAdjustments>
  >({});
  const [rules, setRules] = useState<PayrollRules>({ ...defaultPayrollRules });
  const [attendance, setAttendance] = useState<AttendanceResult[] | null>(null);
  const [salaryCalculated, setSalaryCalculated] = useState(false);
  const queryClient = useQueryClient();
  const [publication, setPublication] = useState<{
    key: string;
    data: PayrollPublication | null;
  }>();
  const [publicationError, setPublicationError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState('');
  useEffect(() => {
    if (attendance === null) setSalaryCalculated(false);
  }, [attendance]);
  const [savedProfiles, setSavedProfiles] = useState<
    Record<string, SavedPayrollProfile>
  >({});
  const [canEditProfiles, setCanEditProfiles] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [catalogueError, setCatalogueError] = useState('');
  const [reloadProfiles, setReloadProfiles] = useState(0);
  const [savingProfile, setSavingProfile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<PayrollProfile | null>(null);
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [availableEmployees, setAvailableEmployees] = useState<
    { id: string; name: string; company?: string }[]
  >([]);
  const [employeeId, setEmployeeId] = useState<string>();
  const [search, setSearch] = useState('');
  const [warningsExpanded, setWarningsExpanded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);
  const [companyFilter, setCompanyFilter] = useState<'VVP' | 'A7A'>('VVP');
  const [cutoff, setCutoff] = useState<string | null>(null);
  const [holidays, setHolidays] = useState<PayrollHolidays | null>(null);
  const [holidayPeriod, setHolidayPeriod] = useState('');
  const [holidayError, setHolidayError] = useState('');
  const [holidayReload, setHolidayReload] = useState(0);
  const [holidaySaving, setHolidaySaving] = useState(false);
  const [holidayOpen, setHolidayOpen] = useState(false);
  const [holidayEmployee, setHolidayEmployee] = useState<PayrollProfile | null>(
    null
  );
  const [holidayInput, setHolidayInput] = useState<number | null>(null);
  const period = month.format('YYYY-MM');
  const holidaysReady = holidayPeriod === period && holidays !== null;
  const adjustmentsReady = adjustmentPeriod === period && !adjustmentError;
  useEffect(() => {
    let cancelled = false;
    setAdjustmentPeriod('');
    setAdjustmentError('');
    setSavedAdjustments([]);
    setCellEditing(null);
    setEditing(null);
    fetchPayrollAdjustments(period)
      .then(({ data }) => {
        if (cancelled) return;
        setSavedAdjustments(data);
        setAdjustmentPeriod(period);
      })
      .catch((cause) => {
        if (!cancelled)
          setAdjustmentError(
            getApiErrorMessage(cause, 'Không tải được khoản phát sinh đã lưu.')
          );
      });
    return () => {
      cancelled = true;
    };
  }, [period, adjustmentReload]);
  useEffect(() => {
    const next: Record<string, PayrollAdjustments> = {};
    for (const profile of profiles) {
      const saved = savedAdjustments.find(
        (row) => row.employeeId === payrollEmployeeCode(profile)
      );
      if (saved)
        next[profile.employeeId] = {
          ...emptyPayrollAdjustments(),
          diligence: profile.diligence,
          ...saved.adjustment
        };
    }
    setAdjustments(next);
  }, [profiles, savedAdjustments]);
  async function persistAdjustment(
    profile: PayrollProfile,
    adjustment: PayrollAdjustments
  ) {
    const id = payrollEmployeeCode(profile);
    const revision =
      savedAdjustments.find((row) => row.employeeId === id)?.revision ?? 0;
    const { data } = await savePayrollAdjustment(
      period,
      id,
      adjustment,
      revision
    );
    setSavedAdjustments((rows) => [
      ...rows.filter((row) => row.employeeId !== id),
      data
    ]);
  }
  async function saveCellAdjustment() {
    if (
      !cellEditing ||
      cellValue === null ||
      !adjustmentsReady ||
      !canEditProfiles
    )
      return;
    setSavingProfile(true);
    try {
      const { profile, key } = cellEditing;
      await persistAdjustment(profile, {
        ...(adjustments[profile.employeeId] ?? {
          ...emptyPayrollAdjustments(),
          diligence: profile.diligence
        }),
        [key]: cellValue
      });
      setCellEditing(null);
      message.success('Đã lưu khoản phát sinh theo nhân viên và kỳ lương.');
    } catch (cause) {
      message.error(
        getApiErrorMessage(cause, 'Không lưu được khoản phát sinh.')
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveManualAdjustment(
    profile: PayrollProfile,
    key: keyof PayrollAdjustments,
    value: string | number
  ) {
    if (!canEditProfiles || !adjustmentsReady || savingProfile) return false;
    setSavingProfile(true);
    try {
      await persistAdjustment(profile, {
        ...(adjustments[profile.employeeId] ?? {
          ...emptyPayrollAdjustments(),
          diligence: profile.diligence
        }),
        [key]: value
      });
      message.success('Đã lưu và tính lại lương.');
      return true;
    } catch (cause) {
      message.error(
        getApiErrorMessage(cause, 'Không lưu được khoản nhập tay.')
      );
      return false;
    } finally {
      setSavingProfile(false);
    }
  }
  useEffect(() => {
    let cancelled = false;
    setHolidays(null);
    setHolidayError('');
    setHolidayOpen(false);
    fetchPayrollHolidays(period)
      .then(({ data }) => {
        if (cancelled) return;
        setHolidays(data);
        setHolidayPeriod(period);
      })
      .catch((cause) => {
        if (!cancelled)
          setHolidayError(
            getApiErrorMessage(cause, 'Không tải được thiết lập công lễ.')
          );
      });
    return () => {
      cancelled = true;
    };
  }, [period, holidayReload]);
  function editHoliday(employee: PayrollProfile | null) {
    if (!holidaysReady || !holidays) return;
    setHolidayEmployee(employee);
    setHolidayInput(
      employee
        ? (holidays.overrides[employee.employeeId] ?? null)
        : holidays.defaultDays
    );
    setHolidayOpen(true);
  }
  async function saveHoliday() {
    if (!holidaysReady || !holidays) return;
    if (
      (!holidayEmployee && holidayInput === null) ||
      (holidayInput !== null &&
        (!Number.isFinite(holidayInput) ||
          holidayInput < 0 ||
          holidayInput > 31 ||
          Math.abs(holidayInput * 100 - Math.round(holidayInput * 100)) > 1e-8))
    ) {
      message.error('Nhập số công từ 0 đến 31, tối đa 2 chữ số thập phân.');
      return;
    }
    const next = { ...holidays, overrides: { ...holidays.overrides } };
    if (holidayEmployee) {
      if (holidayInput === null)
        delete next.overrides[holidayEmployee.employeeId];
      else next.overrides[holidayEmployee.employeeId] = holidayInput;
    } else next.defaultDays = holidayInput;
    setHolidaySaving(true);
    try {
      const { data } = await savePayrollHolidays(period, next);
      setHolidays(data);
      setHolidayOpen(false);
      message.success('Đã lưu công lễ cho kỳ lương này.');
    } catch (cause) {
      message.error(getApiErrorMessage(cause, 'Không lưu được công lễ.'));
    } finally {
      setHolidaySaving(false);
    }
  }
  const requestId = useRef(0);
  useEffect(() => {
    let cancelled = false;
    setLoadingProfiles(true);
    setCatalogueError('');
    setProfiles([]);
    setSavedProfiles({});
    setAttendance(null);
    fetchPayrollProfiles()
      .then((response) => {
        if (cancelled) return;
        setProfiles(response.data.map((item) => item.profile));
        setAvailableEmployees(response.availableEmployees ?? []);
        setSavedProfiles(
          Object.fromEntries(
            response.data.map((item) => [item.profile.employeeId, item])
          )
        );
        setCanEditProfiles(response.canEdit);
      })
      .catch((cause) => {
        if (!cancelled)
          setCatalogueError(
            getApiErrorMessage(
              cause,
              'Không tải được danh mục lương. Vui lòng kiểm tra API danh mục.'
            )
          );
      })
      .finally(() => {
        if (!cancelled) setLoadingProfiles(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadProfiles]);
  const [form] = Form.useForm<{
    profile: PayrollProfile;
    adjustment: PayrollAdjustments;
  }>();
  const startDate = month.subtract(1, 'month').date(16).format('YYYY-MM-DD');
  const endDate = month.date(15).format('YYYY-MM-DD');
  const throughDate = cutoff ?? endDate;
  const activeProfiles = useMemo(
    () =>
      profiles.filter(
        (p) =>
          payrollCompanyKey(p.company) === companyFilter &&
          (selectedIds === null || selectedIds.includes(p.employeeId))
      ),
    [profiles, selectedIds, companyFilter]
  );
  const calculatedDraft = useMemo(() => {
    if (attendance === null) return null;
    const ids = new Set(
      activeProfiles.map((p) => (p.attendanceEmployeeId || p.employeeId).trim())
    );
    const result = calculatePayroll(
      activeProfiles,
      attendance.filter((a) => ids.has(String(a.employee_id).trim())),
      applyPayrollHolidays(
        activeProfiles,
        adjustments,
        holidaysReady && holidays
          ? holidays
          : { defaultDays: 0, overrides: {}, revision: 0 }
      ),
      rules,
      startDate,
      endDate
    );
    result.dataThrough = throughDate;
    if (!adjustmentsReady)
      result.warnings!.push(
        'Chưa tải được khoản phát sinh đã lưu; số tiền hiện tại chưa bao gồm đầy đủ các khoản này.'
      );
    if (!holidaysReady || holidays?.defaultDays === null)
      result.warnings!.push(
        'Chưa có mức công lễ: tạm tính 0, cần kiểm tra trước khi thanh toán.'
      );
    if (throughDate < endDate)
      result.warnings!.push(
        `Công mới đến ${throughDate}. Chuyên cần tháng vẫn áp dụng quy tắc nghỉ phép; lễ, bảo hiểm và giảm trừ theo mức đang thiết lập.`
      );
    if (
      activeProfiles.some(
        (p) =>
          startDate < (savedProfiles[p.employeeId]?.effectiveFrom ?? startDate)
      )
    )
      result.warnings!.push(
        'Đang dùng danh mục hiện tại cho kỳ trước ngày hiệu lực. Cần xác nhận mức lương lịch sử.'
      );
    for (const profile of activeProfiles) {
      if (savedProfiles[profile.employeeId]?.employeeLinked === false)
        result.warnings!.push(
          `Chưa liên kết được employees: ${payrollEmployeeCode(profile)}. Cần kiểm tra mã và tên trước khi thanh toán.`
        );
    }
    const known = new Set(
      profiles.map((p) => (p.attendanceEmployeeId || p.employeeId).trim())
    );
    const missing = new Set(
      attendance
        .filter(
          (a) =>
            ['vvp', 'vinh vinh phát'].includes(
              a.company.trim().toLowerCase()
            ) && !known.has(String(a.employee_id).trim())
        )
        .map((a) => a.employee_id)
    );
    if (missing.size)
      result.warnings!.push(
        `${missing.size} mã chấm công chưa có hồ sơ lương, chưa được tính trong bảng này.`
      );
    return result;
  }, [
    profiles,
    activeProfiles,
    attendance,
    adjustments,
    rules,
    startDate,
    endDate,
    throughDate,
    holidays,
    holidaysReady,
    savedProfiles,
    adjustmentsReady
  ]);
  const draft = salaryCalculated ? calculatedDraft : null;
  const publicationPeriod = month.format('YYYY-MM');
  const publicationKey = `${companyFilter}:${publicationPeriod}`;
  const currentPublicationKey = useRef(publicationKey);
  currentPublicationKey.current = publicationKey;
  useEffect(() => {
    let cancelled = false;
    setPublicationError('');
    setSavedSnapshot('');
    fetchPayrollPublication(companyFilter, publicationPeriod)
      .then((response) => {
        if (!cancelled)
          setPublication({ key: publicationKey, data: response.data });
      })
      .catch((error) => {
        if (!cancelled)
          setPublicationError(
            getApiErrorMessage(
              error,
              'Chưa tải được trạng thái lưu bảng lương.'
            )
          );
      });
    return () => {
      cancelled = true;
    };
  }, [companyFilter, publicationPeriod, publicationKey]);

  async function calculateAndSave() {
    if (!calculatedDraft || publication?.key !== publicationKey || syncing)
      return;
    setSalaryCalculated(true);
    setSyncing(true);
    const snapshot = JSON.stringify(calculatedDraft);
    try {
      const response = await savePayrollDraft(
        companyFilter,
        publicationPeriod,
        calculatedDraft,
        publication.data?.revision ?? 0
      );
      if (currentPublicationKey.current === publicationKey) {
        setPublication({ key: publicationKey, data: response.data });
        setSavedSnapshot(snapshot);
      }
      void queryClient.invalidateQueries({ queryKey: ['salaries'] });
      void queryClient.invalidateQueries({ queryKey: ['adminSalaryPreview'] });
      message.success(
        'Đã lưu bản nháp. Admin duyệt và công bố để nhân viên xem.'
      );
    } catch (error) {
      message.error(
        getApiErrorMessage(
          error,
          'Chưa lưu được bản nháp. Dữ liệu vẫn ở màn hình này.'
        )
      );
    } finally {
      setSyncing(false);
    }
  }

  async function publishCurrentDraft() {
    const publicationData =
      publication?.key === publicationKey ? publication.data : null;
    if (
      !publicationData?.id ||
      publicationData.status !== 'draft' ||
      publishing
    )
      return;
    Modal.confirm({
      title: 'Duyệt và công bố bảng lương?',
      content:
        'Sau khi công bố, nhân viên sẽ xem được phiếu lương của mình. Bản đã công bố không ghi đè trực tiếp.',
      okText: 'Duyệt / Công bố',
      cancelText: 'Hủy',
      onOk: async () => {
        setPublishing(true);
        try {
          const response = await publishPayroll(
            publicationData.id,
            publicationData.revision
          );
          void queryClient.invalidateQueries({
            queryKey: [QUERY_KEYS.DASHBOARD]
          });
          setPublication({ key: publicationKey, data: response.data });
          void queryClient.invalidateQueries({ queryKey: ['salaries'] });
          void queryClient.invalidateQueries({
            queryKey: ['adminSalaryPreview']
          });
          message.success('Đã duyệt và công bố bảng lương.');
        } catch (error) {
          message.error(
            getApiErrorMessage(
              error,
              'Chưa công bố được. Hãy tải lại bản nháp mới nhất.'
            )
          );
        } finally {
          setPublishing(false);
        }
      }
    });
  }
  useEffect(() => {
    setEmployeeId((current) =>
      draft?.rows.some((row) => row.profile.employeeId === current)
        ? current
        : draft?.rows[0]?.profile.employeeId
    );
  }, [draft]);
  const canExport =
    !!draft?.rows.length &&
    !busy &&
    !loadingProfiles &&
    !savingProfile &&
    !holidaySaving;

  function resetPeriod(next: Dayjs) {
    if (holidaySaving) return;
    setWarningsExpanded(false);
    requestId.current++;
    setMonth(next);
    setCutoff(null);
    setSelectedIds(null);
    setAttendance(null);
    setAdjustments({});
    setEmployeeId(undefined);
    setError('');
  }

  async function loadAttendance() {
    if (loadingProfiles || !profiles.length || savingProfile) return;
    const currentRequest = ++requestId.current;
    setBusy(true);
    setSalaryCalculated(false);
    setError('');
    setAttendance(null);
    try {
      const response = await fetchAttendancesCalculated({
        limit: 0,
        'filter[date_between]': `${startDate},${throughDate}`
      });
      if (currentRequest !== requestId.current) return;
      if (!Array.isArray(response.data))
        throw new Error('API không trả danh sách công hợp lệ.');
      const records = [...response.data];
      for (let page = 2; page <= (response.last_page || 1); page++) {
        const next = await fetchAttendancesCalculated({
          limit: 0,
          page,
          'filter[date_between]': `${startDate},${throughDate}`
        });
        if (currentRequest !== requestId.current) return;
        if (!Array.isArray(next.data) || !next.data.length)
          throw new Error('Trang dữ liệu công không đầy đủ. Hãy tải lại.');
        records.push(...next.data);
      }
      if (response.total > records.length)
        throw new Error(
          'API tải thiếu bản ghi, chưa thể xác nhận dữ liệu. Hãy tải lại.'
        );
      setAttendance(records);
      message.success('Đã lấy công. Bấm Tính lương để lập bảng lương.');
    } catch (cause) {
      if (currentRequest === requestId.current)
        setError(
          cause instanceof Error
            ? cause.message
            : 'Không tải được dữ liệu công.'
        );
    } finally {
      if (currentRequest === requestId.current) setBusy(false);
    }
  }

  function editProfile(profile: PayrollProfile) {
    if (!adjustmentsReady) {
      message.warning('Cần tải khoản phát sinh trước khi chỉnh sửa.');
      return;
    }
    setEditing(profile);
    setCreatingProfile(false);
    form.resetFields();
    form.setFieldsValue({
      profile: { ...profile, bankBin: payrollBankBin(profile) || undefined },
      adjustment: adjustments[profile.employeeId] ?? {
        ...emptyPayrollAdjustments(),
        diligence: profile.diligence
      }
    });
  }

  function createProfile() {
    if (!canEditProfiles) return;
    setCreatingProfile(true);
    const profile: PayrollProfile = {
      employeeId: '',
      name: '',
      department: '',
      bankAccount: '',
      basicSalary: 0,
      responsibility: 0,
      housingPerDay: 0,
      travelPerDay: 0,
      mealPerDay: 0,
      diligence: 0,
      insuranceBase: 0,
      unionBase: 0,
      dependents: 0,
      legacySalary26Days: 0
    };
    setEditing(profile);
    form.resetFields();
    form.setFieldsValue({ profile, adjustment: emptyPayrollAdjustments() });
  }

  async function removeProfile(profile: PayrollProfile) {
    if (!canEditProfiles || savingProfile) return;
    Modal.confirm({
      title: `Xoá danh mục ${payrollEmployeeCode(profile)} — ${profile.name}?`,
      content:
        'Chỉ xoá hồ sơ lương khỏi danh mục. Nhân viên, chấm công và khoản phát sinh đã lưu vẫn được giữ lại.',
      okText: 'Xoá',
      okType: 'danger',
      cancelText: 'Huỷ',
      onOk: async () => {
        setSavingProfile(true);
        try {
          await deletePayrollProfile(
            profile.employeeId,
            savedProfiles[profile.employeeId].revision
          );
          setReloadProfiles((value) => value + 1);
          message.success('Đã xoá danh mục.');
        } catch (cause) {
          message.error(getApiErrorMessage(cause, 'Không xoá được danh mục.'));
        } finally {
          setSavingProfile(false);
        }
      }
    });
  }

  async function saveProfileField(
    profile: PayrollProfile,
    field: keyof PayrollProfile,
    rawValue: string
  ) {
    if (!canEditProfiles) return;
    const numericFields: (keyof PayrollProfile)[] = [
      'basicSalary',
      'responsibility',
      'housingPerDay',
      'travelPerDay',
      'mealPerDay',
      'diligence',
      'legacySalary26Days'
    ];
    const value = numericFields.includes(field)
      ? Number(rawValue.replace(/\./g, '').replace(',', '.'))
      : rawValue.trim();
    if (
      (numericFields.includes(field) &&
        (!Number.isFinite(value) || Number(value) < 0)) ||
      (!numericFields.includes(field) && !value)
    ) {
      message.error('Giá trị không hợp lệ.');
      return;
    }
    try {
      const saved = await savePayrollProfile(
        { ...profile, [field]: value } as PayrollProfile,
        savedProfiles[profile.employeeId].revision
      );
      setProfiles((rows) =>
        rows.map((row) =>
          row.employeeId === profile.employeeId ? saved.data.profile : row
        )
      );
      setSavedProfiles((rows) => ({
        ...rows,
        [profile.employeeId]: saved.data
      }));
      message.success('Đã lưu thay đổi.');
    } catch (cause) {
      message.error(
        getApiErrorMessage(cause, 'Không lưu được thay đổi danh mục.')
      );
    }
  }

  async function applyProfileChanges({
    profile,
    adjustment
  }: {
    profile: PayrollProfile;
    adjustment: PayrollAdjustments;
  }) {
    if (!editing) return;
    if ((!creatingProfile && !adjustmentsReady) || !canEditProfiles) return;
    const nextProfile = { ...editing, ...profile };
    const changed = Object.keys(profile).some(
      (key) =>
        profile[key as keyof PayrollProfile] !==
        editing[key as keyof PayrollProfile]
    );
    if (changed && !canEditProfiles) {
      message.error('Bạn không có quyền sửa danh mục.');
      return;
    }
    setSavingProfile(true);
    try {
      if (changed) {
        const response = creatingProfile
          ? await createPayrollProfile(nextProfile, startDate)
          : await savePayrollProfile(
              nextProfile,
              savedProfiles[editing.employeeId].revision
            );
        const saved = response.data;
        setProfiles((current) =>
          creatingProfile
            ? [...current, saved.profile]
            : current.map((item) =>
                item.employeeId === editing.employeeId ? saved.profile : item
              )
        );
        setSavedProfiles((current) => ({
          ...current,
          [saved.profile.employeeId]: saved
        }));
        if (creatingProfile)
          setAvailableEmployees((rows) =>
            rows.filter((row) => row.id !== saved.profile.employeeId)
          );
      }
      if (!creatingProfile) await persistAdjustment(editing, adjustment);
      setEditing(null);
      setCreatingProfile(false);
      message.success(
        creatingProfile
          ? 'Đã thêm nhân viên vào danh mục.'
          : changed
            ? 'Đã lưu danh mục và khoản phát sinh kỳ này trên hệ thống.'
            : 'Đã lưu khoản phát sinh kỳ này trên hệ thống.'
      );
    } catch (cause) {
      message.error(
        getApiErrorMessage(
          cause,
          'Chưa lưu được đầy đủ thay đổi. Hãy tải lại danh mục và khoản phát sinh để kiểm tra.'
        )
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function exportExcel(payslip = false) {
    if (!draft || !canExport || (payslip && !employeeId)) return;
    setBusy(true);
    try {
      const { buildPayrollWorkbook } = await import('@/utils/payrollWorkbook');
      const buffer = await buildPayrollWorkbook(
        draft,
        payslip ? employeeId : undefined
      );
      const selectedProfile = profiles.find((p) => p.employeeId === employeeId);
      const safeId = selectedProfile
        ? payrollEmployeeCode(selectedProfile).replace(/[^\p{L}\p{N}_-]/gu, '_')
        : undefined;
      saveAs(
        new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }),
        `${payslip ? `Phieu-luong-${safeId}` : 'Bang-luong-VVP'}-${month.format('MM-YYYY')}-NHAP.xlsx`
      );
    } catch (cause) {
      message.error(
        cause instanceof Error ? cause.message : 'Không xuất được Excel.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="vvp-payroll-page min-w-0">
        <div className="vvp-payroll-content">
          <ComponentCard
            className="vvp-period-card"
            title="Kỳ lương & dữ liệu công"
            desc="Tạm tính theo công thực tế, kể cả khi chưa đủ tháng."
          >
            <div className="vvp-period-fields">
              <div>
                <div>Tháng lương (kỳ 16–15)</div>
                <DatePicker
                  format="DD/MM/YYYY"
                  aria-label="Tháng lương"
                  picker="month"
                  value={month}
                  allowClear={false}
                  disabled={busy || savingProfile || holidaySaving}
                  onChange={(value) => {
                    if (!value) return;
                    if (Object.keys(adjustments).length)
                      Modal.confirm({
                        title: 'Đổi kỳ và xóa khoản phát sinh kỳ hiện tại?',
                        onOk: () => resetPeriod(value)
                      });
                    else resetPeriod(value);
                  }}
                />
              </div>
              <div>
                <div>Lấy công đến ngày</div>
                <DatePicker
                  format="DD/MM/YYYY"
                  aria-label="Lấy công đến ngày"
                  value={dayjs(throughDate)}
                  allowClear={false}
                  disabled={busy || savingProfile || holidaySaving}
                  disabledDate={(d) =>
                    d.format('YYYY-MM-DD') < startDate ||
                    d.format('YYYY-MM-DD') > endDate
                  }
                  onChange={(d) => {
                    if (d) {
                      requestId.current++;
                      setCutoff(d.format('YYYY-MM-DD'));
                      setAttendance(null);
                    }
                  }}
                />
              </div>
              <span className="vvp-period-range">
                Kỳ {dayjs(startDate).format('DD/MM')} —{' '}
                {dayjs(endDate).format('DD/MM/YYYY')}
              </span>
              <div className="vvp-period-buttons">
                <Button
                  loading={loadingProfiles}
                  disabled={busy || savingProfile}
                  onClick={() => setReloadProfiles((value) => value + 1)}
                >
                  Tải lại danh mục
                </Button>
                <AppButton
                  tone="primary"
                  loading={busy}
                  disabled={
                    !profiles.length || loadingProfiles || savingProfile
                  }
                  onClick={() => void loadAttendance()}
                >
                  Lấy công
                </AppButton>
                <AppButton
                  tone="primary"
                  loading={syncing}
                  disabled={
                    attendance === null ||
                    busy ||
                    loadingProfiles ||
                    savingProfile ||
                    holidaySaving ||
                    !activeProfiles.length ||
                    !canEditProfiles ||
                    publication?.key !== publicationKey ||
                    publication.data?.status === 'published'
                  }
                  onClick={() => void calculateAndSave()}
                >
                  {publication?.key === publicationKey && publication.data
                    ? 'Cập nhật bản nháp'
                    : 'Tính lương'}
                </AppButton>
                {publication?.key === publicationKey &&
                  publication.data?.status === 'draft' && (
                    <Button
                      type="primary"
                      loading={publishing}
                      disabled={
                        syncing ||
                        !savedSnapshot ||
                        savedSnapshot !== JSON.stringify(draft)
                      }
                      onClick={() => void publishCurrentDraft()}
                    >
                      Duyệt / Công bố
                    </Button>
                  )}
              </div>
            </div>
            <div className="vvp-period-employees">
              <div className="vvp-period-select">
                <label htmlFor="vvp-payroll-company">Công ty tính lương</label>
                <Select
                  id="vvp-payroll-company"
                  value={companyFilter}
                  style={{ width: '100%' }}
                  onChange={(value) => {
                    setCompanyFilter(value);
                    setSalaryCalculated(false);
                    setSelectedIds(null);
                    setEmployeeId(undefined);
                  }}
                  options={[
                    { value: 'VVP', label: 'Vinh Vinh Phát' },
                    { value: 'A7A', label: 'A7A' }
                  ]}
                />
              </div>
              <div className="vvp-period-select">
                <label htmlFor="vvp-payroll-employees">
                  Nhân viên trong bản tính
                </label>
                <Select
                  className="vvp-employee-select"
                  id="vvp-payroll-employees"
                  mode="multiple"
                  aria-label="Nhân viên trong bản tính"
                  style={{ width: '100%' }}
                  maxTagCount={0}
                  maxTagPlaceholder={() =>
                    `Đã chọn ${activeProfiles.length}/${profiles.length} nhân viên`
                  }
                  placeholder="Chọn nhân viên"
                  value={
                    selectedIds ??
                    profiles
                      .filter(
                        (p) => payrollCompanyKey(p.company) === companyFilter
                      )
                      .map((p) => p.employeeId)
                  }
                  optionFilterProp="label"
                  options={profiles
                    .filter(
                      (p) => payrollCompanyKey(p.company) === companyFilter
                    )
                    .map((p) => ({
                      value: p.employeeId,
                      label: `${payrollEmployeeCode(p)} — ${p.name}`
                    }))}
                  onChange={(ids) => {
                    setSelectedIds(ids);
                    setEmployeeId(undefined);
                  }}
                />
              </div>
              <div className="vvp-period-buttons">
                <Button
                  type="link"
                  onClick={() => {
                    setSelectedIds(null);
                  }}
                >
                  Chọn tất cả
                </Button>
                <Button
                  type="link"
                  disabled={attendance === null}
                  onClick={() => {
                    const ids = new Set(
                      attendance
                        ?.filter((a) => a.total_hours > 0)
                        .map((a) => String(a.employee_id))
                    );
                    setSelectedIds(
                      profiles
                        .filter((p) =>
                          ids.has(p.attendanceEmployeeId || p.employeeId)
                        )
                        .map((p) => p.employeeId)
                    );
                  }}
                >
                  Chọn người có công
                </Button>
              </div>
              <span className="vvp-period-catalogue">
                Danh mục hệ thống: {profiles.length} nhân viên
              </span>
            </div>
          </ComponentCard>
          {catalogueError && (
            <Alert type="error" showIcon message={catalogueError} />
          )}
          {adjustmentError ? (
            <Alert
              type="error"
              showIcon
              message={adjustmentError}
              action={
                <Button
                  onClick={() => setAdjustmentReload((value) => value + 1)}
                >
                  Tải lại khoản phát sinh
                </Button>
              }
            />
          ) : !adjustmentsReady ? (
            <Alert
              type="info"
              message="Đang tải khoản phát sinh của kỳ lương…"
            />
          ) : null}
          {!loadingProfiles && !catalogueError && !profiles.length && (
            <Alert
              type="warning"
              showIcon
              message="Danh mục chưa được khởi tạo trên máy chủ. Liên hệ quản trị để kích hoạt bộ dữ liệu đã chuẩn bị; không cần upload Excel."
            />
          )}
          {error && <Alert type="error" showIcon message={error} />}
          {Object.values(savedProfiles).some(
            (p) => p.employeeLinked === false
          ) && (
            <Alert
              type="warning"
              showIcon
              message="Có hồ sơ lương chưa liên kết được với nhân viên trên web. Cần kiểm tra dữ liệu danh mục trên máy chủ."
            />
          )}
          <div className="vvp-payroll-toolbar">
            <AppSearchInput
              aria-label="Tìm mã hoặc tên nhân viên"
              placeholder="Tìm mã hoặc tên nhân viên"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 360 }}
            />
            {publicationError && (
              <Alert type="error" showIcon message={publicationError} />
            )}
            {publication?.key === publicationKey &&
              publication.data?.status === 'published' && (
                <Alert
                  type="success"
                  message="Kỳ lương đã công bố. Không ghi đè dữ liệu nhân viên đang xem."
                />
              )}
            {draft && publication?.data?.status !== 'published' && (
              <Alert
                type={
                  savedSnapshot === JSON.stringify(draft) ? 'success' : 'info'
                }
                message={
                  savedSnapshot === JSON.stringify(draft)
                    ? 'Đã lưu bản nháp — chờ admin duyệt/công bố.'
                    : 'Dữ liệu đã thay đổi — bấm Cập nhật bản nháp để đồng bộ.'
                }
              />
            )}
            {draft && (
              <div className="vvp-payroll-total" role="status">
                {draft.rows.length} nhân viên — tổng thực lãnh:{' '}
                {money(draft.rows.reduce((sum, row) => sum + row.net, 0))} đ
              </div>
            )}
          </div>
          {!!draft?.issues.length && (
            <Alert
              type={draft.issues.length ? 'error' : 'info'}
              showIcon
              message={
                draft.issues.length
                  ? `${draft.issues.length} lỗi dữ liệu — vẫn có thể xuất bản tính hiện tại`
                  : `${draft.rows.length} nhân viên — tổng thực lãnh: ${money(draft.rows.reduce((sum, row) => sum + row.net, 0))} đ`
              }
              description={
                draft.issues.length ? (
                  <Collapse
                    items={[
                      {
                        key: 'issues',
                        label: 'Xem chi tiết lỗi',
                        children: (
                          <ul>
                            {draft.issues.map((issue) => (
                              <li key={issue}>{issue}</li>
                            ))}
                          </ul>
                        )
                      }
                    ]}
                  />
                ) : undefined
              }
            />
          )}
          {!!draft?.warnings?.length && (
            <Alert
              type="warning"
              showIcon
              message={
                draft.warnings.length > 3 ? (
                  <button
                    type="button"
                    className="vvp-warning-toggle"
                    aria-expanded={warningsExpanded}
                    aria-controls="vvp-payroll-warnings"
                    onClick={() => setWarningsExpanded((value) => !value)}
                  >
                    <span>{draft.warnings.length} lưu ý</span>
                    <span>
                      {warningsExpanded ? 'Thu gọn ▴' : 'Xem tất cả ▾'}
                    </span>
                  </button>
                ) : (
                  `${draft.warnings.length} lưu ý`
                )
              }
              description={
                <>
                  <ul id="vvp-payroll-warnings">
                    {(warningsExpanded
                      ? draft.warnings
                      : draft.warnings.slice(0, 3)
                    ).map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                  {warningsExpanded && draft.warnings.length > 3 && (
                    <button
                      type="button"
                      className="vvp-warning-toggle mt-2"
                      aria-expanded={warningsExpanded}
                      aria-controls="vvp-payroll-warnings"
                      onClick={() => setWarningsExpanded(false)}
                    >
                      <span>{draft.warnings.length} lưu ý</span>
                      <span>Thu gọn ▴</span>
                    </button>
                  )}
                </>
              }
            />
          )}
          <div className="vvp-payroll-actions">
            <Button
              disabled={savingProfile}
              onClick={() => setAdjustmentReload((value) => value + 1)}
            >
              Tải lại khoản phát sinh
            </Button>
            <Button onClick={() => setConfigurationOpen(true)}>
              Cấu hình & công thức
            </Button>
            <Space wrap>
              <Button
                disabled={!canEditProfiles || !holidaysReady || holidaySaving}
                onClick={() => editHoliday(null)}
              >
                Thiết lập công lễ/tết
              </Button>
              {holidaysReady && (
                <span className="vvp-holiday-summary">
                  Mức chung: {holidays?.defaultDays ?? 'Chưa thiết lập'} ·{' '}
                  {Object.keys(holidays?.overrides ?? {}).length} ngoại lệ
                </span>
              )}
              <Button
                disabled={holidaySaving}
                onClick={() => setHolidayReload((v) => v + 1)}
              >
                Tải lại công lễ
              </Button>
            </Space>
          </div>
          {holidayError ? (
            <Alert
              type="error"
              message={holidayError}
              action={
                <Button onClick={() => setHolidayReload((v) => v + 1)}>
                  Tải lại công lễ
                </Button>
              }
            />
          ) : !holidaysReady ? (
            <Alert type="info" message="Đang tải thiết lập công lễ…" />
          ) : holidays?.defaultDays === null && !draft ? (
            <Alert
              type="warning"
              message="Chưa thiết lập công lễ: tạm tính 0. Bạn có thể bổ sung sau, không chặn tính lương."
            />
          ) : null}
          <PayrollExcelSheets
            saveManualAdjustment={saveManualAdjustment}
            canEditAdjustments={
              canEditProfiles && adjustmentsReady && !savingProfile
            }
            editAdjustment={(profile, key, label) => {
              setCellEditing({ profile, key, label });
              setCellValue(adjustments[profile.employeeId]?.[key] ?? 0);
            }}
            holidaySettings={holidaysReady ? holidays : null}
            editHoliday={editHoliday}
            canEditHolidays={canEditProfiles && holidaysReady && !holidaySaving}
            profiles={activeProfiles}
            attendance={attendance}
            draft={draft}
            startDate={startDate}
            endDate={endDate}
            search={search}
            busy={busy || savingProfile || holidaySaving}
            editProfile={editProfile}
            createProfile={createProfile}
            deleteProfile={removeProfile}
            saveProfileField={saveProfileField}
            canEditProfiles={canEditProfiles}
            employeeId={employeeId}
            selectEmployee={setEmployeeId}
            canExport={canExport}
            exportPayslip={() => void exportExcel(true)}
          />
          <Modal
            title={
              cellEditing
                ? `${cellEditing.label} — ${payrollEmployeeCode(cellEditing.profile)} · ${cellEditing.profile.name}`
                : ''
            }
            open={!!cellEditing}
            onCancel={() => {
              if (!savingProfile) setCellEditing(null);
            }}
            onOk={() => void saveCellAdjustment()}
            okText="Lưu theo kỳ lương"
            confirmLoading={savingProfile}
            okButtonProps={{
              disabled:
                cellValue === null || !canEditProfiles || !adjustmentsReady
            }}
            cancelButtonProps={{ disabled: savingProfile }}
            closable={!savingProfile}
            maskClosable={!savingProfile}
          >
            <p className="mb-3">Kỳ {period} · Chỉ áp dụng cho nhân viên này.</p>
            <InputNumber
              aria-label="Giá trị khoản phát sinh"
              value={cellValue}
              onChange={setCellValue}
              disabled={savingProfile}
              min={0}
              max={cellEditing?.key.endsWith('Days') ? 31 : 1000000000000}
              step={cellEditing?.key.endsWith('Days') ? 0.5 : 1000}
              precision={cellEditing?.key.endsWith('Days') ? 2 : 0}
              decimalSeparator=","
              formatter={(value, info) =>
                info.userTyping
                  ? info.input
                  : value == null
                    ? ''
                    : Number(value).toLocaleString('vi-VN')
              }
              parser={(value) =>
                Number((value ?? '').replace(/\./g, '').replace(',', '.'))
              }
              addonAfter={cellEditing?.key.endsWith('Days') ? 'ngày' : 'đ'}
              style={{ width: '100%' }}
            />
            {['authorizedLeaveDays', 'unauthorizedLeaveDays'].includes(
              cellEditing?.key ?? ''
            ) && (
              <p className="mt-3 text-sm">
                Có phép hoặc Không phép lớn hơn 0 sẽ đưa chuyên cần tháng về 0.
              </p>
            )}
          </Modal>
          <Modal
            title={
              holidayEmployee
                ? `Công lễ riêng — ${payrollEmployeeCode(holidayEmployee)} · ${holidayEmployee.name}`
                : `Công lễ/tết chung — kỳ ${period}`
            }
            open={holidayOpen}
            onCancel={() => {
              if (!holidaySaving) setHolidayOpen(false);
            }}
            onOk={() => void saveHoliday()}
            okText="Lưu trên hệ thống"
            confirmLoading={holidaySaving}
            cancelButtonProps={{ disabled: holidaySaving }}
            closable={!holidaySaving}
            maskClosable={!holidaySaving}
          >
            <p>
              Kỳ {startDate} — {endDate}.{' '}
              {holidayEmployee
                ? `Để trống để dùng mức chung (${holidays?.defaultDays ?? 'chưa thiết lập'} công). Nhập 0 nếu không được hưởng.`
                : 'Áp dụng cho toàn bộ nhân viên dùng mức chung, không thay đổi ngoại lệ đã lưu.'}
            </p>
            <InputNumber
              aria-label="Số công lễ"
              value={holidayInput}
              min={0}
              max={31}
              step={0.5}
              disabled={holidaySaving}
              onChange={setHolidayInput}
            />
            {holidayEmployee && (
              <Button
                disabled={holidaySaving}
                onClick={() => setHolidayInput(null)}
              >
                Dùng mức chung
              </Button>
            )}
            <p>
              Tiền lễ = ROUND((lương căn bản + trách nhiệm) / công chuẩn × số
              công lễ, 0).
            </p>
          </Modal>
          <Modal
            title="Cấu hình & công thức"
            open={configurationOpen}
            onCancel={() => setConfigurationOpen(false)}
            footer={null}
            width={1200}
          >
            <Tabs
              items={[
                {
                  key: 'rules',
                  label: 'Quy tắc tính',
                  children: (
                    <>
                      <Alert
                        className="mb-4"
                        type="warning"
                        message="Phạm vi áp dụng"
                        description="Hệ số ban đầu tham khảo mẫu VVP, cần kiểm tra trước khi dùng. Tăng cường chỉ tính tiền giờ; phụ cấp riêng nhập vào thu nhập bổ sung. Căn cứ BH cần xét trần và đối tượng tham gia. Thuế lũy tiến chỉ dành cho cá nhân cư trú đủ điều kiện trong năm 2026, không áp dụng cho diện khấu trừ khác."
                      />
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
                        {ruleFields.map(([key, label]) => (
                          <label key={key}>
                            {label}
                            <InputNumber
                              aria-label={label}
                              style={{ width: '100%' }}
                              min={0}
                              max={key.endsWith('Rate') ? 100 : undefined}
                              step={key.endsWith('Rate') ? 0.1 : 1}
                              decimalSeparator=","
                              addonAfter={
                                key.endsWith('Rate') ? '%' : undefined
                              }
                              formatter={(value, info) => {
                                if (info.userTyping) return info.input;
                                return value === null || value === undefined
                                  ? ''
                                  : Number(value).toLocaleString('vi-VN', {
                                      maximumFractionDigits: 10
                                    });
                              }}
                              parser={(value) => {
                                const normalized = (value ?? '')
                                  .replace(/\./g, '')
                                  .replace(',', '.')
                                  .trim();
                                return normalized === ''
                                  ? NaN
                                  : Number(normalized);
                              }}
                              disabled={busy}
                              value={
                                Number.isNaN(rules[key])
                                  ? null
                                  : key.endsWith('Rate')
                                    ? Number((rules[key] * 100).toFixed(10))
                                    : rules[key]
                              }
                              onChange={(value) => {
                                setRules((previous) => ({
                                  ...previous,
                                  [key]:
                                    value === null
                                      ? NaN
                                      : key.endsWith('Rate')
                                        ? value / 100
                                        : value
                                }));
                              }}
                            />
                          </label>
                        ))}
                      </div>
                      <p className="mt-4">
                        Tiền được làm tròn đến đồng theo từng khoản. Công
                        ngày/đêm làm tròn 2 chữ số như mẫu. Thu nhập miễn thuế
                        không bao gồm giảm trừ gia cảnh hoặc bảo hiểm (đã trừ
                        riêng).
                      </p>
                      <a
                        href="https://xaydungchinhsach.chinhphu.vn/huong-dan-quyet-toan-thue-thu-nhap-ca-nhan-doi-voi-thu-nhap-tu-tien-luong-tien-cong-119260306092819051.htm"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Nguồn biểu thuế lũy tiến năm 2026
                      </a>
                    </>
                  )
                },
                {
                  key: 'formulas',
                  label: 'Công thức',
                  children: (
                    <>
                      <Alert
                        type="info"
                        showIcon
                        className="mb-4"
                        message="Công thức thực sự được ghi vào Excel xuất ra"
                        description="Ví dụ dòng 5 của sheet Tính lương. Danh muc chứa mức lương, Tổng hợp công chứa giờ công, Cấu hình chứa hệ số. Excel xuất có cột khác mẫu gốc; phần đối chiếu ghi rõ công thức tương đương và các điểm chưa giống mẫu. Sửa đầu vào trong Excel không cập nhật ngược lên web."
                      />
                      <Table
                        rowKey="cell"
                        size="small"
                        pagination={false}
                        scroll={{ x: 1100 }}
                        dataSource={Object.entries(
                          payrollExcelFormulas(
                            5,
                            draft?.rows.length || profiles.length || 1
                          )
                        ).map(([column, formula]) => ({
                          cell: `${column}5`,
                          formula: `=${formula}`,
                          note:
                            payrollFormulaNotes[column] ??
                            'Tra cứu đúng mã nhân viên hoặc lấy cấu hình chung.'
                        }))}
                        columns={[
                          { title: 'Ô xuất', dataIndex: 'cell', width: 80 },
                          {
                            title: 'Công thức Excel',
                            dataIndex: 'formula',
                            width: 560,
                            render: (value: string) => (
                              <code
                                style={{
                                  whiteSpace: 'pre-wrap',
                                  overflowWrap: 'anywhere'
                                }}
                              >
                                {value}
                              </code>
                            )
                          },
                          {
                            title: 'Đối chiếu mẫu gốc',
                            dataIndex: 'note',
                            width: 460
                          }
                        ]}
                      />
                    </>
                  )
                }
              ]}
            />
          </Modal>
          <div>
            <Button
              type="primary"
              disabled={!canExport}
              loading={busy}
              onClick={() => void exportExcel()}
            >
              Xuất bảng lương Excel nháp
            </Button>
          </div>
        </div>
      </section>
      <Modal
        title={
          editing
            ? `${creatingProfile ? 'Thêm danh mục' : payrollEmployeeCode(editing)}${editing.name ? ` — ${editing.name}` : ''}`
            : ''
        }
        open={!!editing}
        onCancel={() => {
          if (!savingProfile) setEditing(null);
        }}
        width={900}
        okText={
          creatingProfile ? 'Thêm danh mục' : 'Lưu danh mục và khoản phát sinh'
        }
        okButtonProps={{
          disabled: !canEditProfiles || (!creatingProfile && !adjustmentsReady)
        }}
        confirmLoading={savingProfile}
        maskClosable={!savingProfile}
        closable={!savingProfile}
        cancelButtonProps={{ disabled: savingProfile }}
        onOk={() => form.submit()}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          disabled={
            savingProfile ||
            !canEditProfiles ||
            (!creatingProfile && !adjustmentsReady)
          }
          onFinish={applyProfileChanges}
        >
          <Alert
            className="mb-4"
            type="info"
            message="Danh mục và khoản phát sinh được lưu trên máy chủ. Khoản phát sinh chỉ áp dụng nhân viên này trong kỳ đang xem; Có phép hoặc Không phép lớn hơn 0 thì chuyên cần tháng bằng 0."
          />
          <div className="grid grid-cols-1 gap-x-4 md:grid-cols-3">
            {creatingProfile && (
              <Form.Item
                name={['profile', 'employeeId']}
                label="Nhân viên trên web"
                rules={[{ required: true }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="Chọn mã hoặc tên nhân viên"
                  options={availableEmployees.map((employee) => ({
                    value: employee.id,
                    label: `${employee.id} — ${employee.name}`
                  }))}
                  onChange={(id) =>
                    form.setFieldValue(
                      ['profile', 'name'],
                      availableEmployees.find((employee) => employee.id === id)
                        ?.name ?? ''
                    )
                  }
                />
              </Form.Item>
            )}
            {(['name', 'department', 'bankAccount'] as const).map(
              (key, index) => (
                <Form.Item
                  key={key}
                  name={['profile', key]}
                  label={['Tên nhân viên', 'Bộ phận', 'Số tài khoản'][index]}
                  extra={
                    key === 'name'
                      ? 'Lấy từ hồ sơ nhân viên trên web. Sửa tên tại mục Nhân viên rồi tải lại danh mục.'
                      : undefined
                  }
                  rules={[{ required: key === 'name' }]}
                >
                  <Input disabled={key === 'name' || !canEditProfiles} />
                </Form.Item>
              )
            )}
          </div>
          <Form.Item name={['profile', 'bankBin']} label="Ngân hàng nhận lương">
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Chọn ngân hàng"
              options={payrollBanks.map((bank) => ({
                value: bank.bin,
                label: bank.name
              }))}
              optionRender={(option) => (
                <PayrollBankLabel bin={String(option.value)} />
              )}
              labelRender={(option) => (
                <PayrollBankLabel bin={String(option.value)} />
              )}
            />
          </Form.Item>
          <div className="grid grid-cols-1 gap-x-4 md:grid-cols-3">
            {profileFields.map(([key, label]) => (
              <Form.Item
                key={key}
                name={['profile', key]}
                label={label}
                rules={[
                  {
                    required: true,
                    type: key === 'dependents' ? 'integer' : 'number',
                    min: 0
                  }
                ]}
              >
                <InputNumber
                  disabled={!canEditProfiles}
                  min={0}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            ))}
          </div>
          {!creatingProfile && (
            <>
              <Typography.Title level={5}>
                Khoản phát sinh kỳ {startDate} — {endDate}
              </Typography.Title>
              <div className="grid grid-cols-1 gap-x-4 md:grid-cols-3">
                {adjustmentFields.map(([key, label]) => (
                  <Form.Item
                    key={key}
                    name={['adjustment', key]}
                    label={label}
                    rules={[{ required: true, type: 'number', min: 0 }]}
                  >
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                ))}
              </div>
              <Form.Item
                name={['adjustment', 'noAttendanceConfirmed']}
                valuePropName="checked"
              >
                <Checkbox>
                  Xác nhận nhân viên không có giờ công trong kỳ (chỉ dùng sau
                  khi đối chiếu)
                </Checkbox>
              </Form.Item>
              <Form.Item
                name={['adjustment', 'note']}
                label="Ghi chú điều chỉnh"
              >
                <Input.TextArea />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </>
  );
}
