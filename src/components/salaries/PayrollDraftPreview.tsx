import { Alert, Button, Input, Space, Spin, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  calculatePayroll,
  emptyPayrollAdjustments,
  type PayrollDraft,
  type PayrollAdjustments,
  type PayrollProfile
} from '@/utils/payrollCalculation';
import { getApiErrorMessage } from '@/utils/apiError';
import { fetchPayrollProfiles } from '@/services/PayrollProfileService';
import PayrollExcelSheets from './PayrollExcelSheets';
import { resolveSnapshotProfile } from '@/utils/payrollSnapshotProfile';
import { fetchAttendancesCalculated } from '@/services/AttendanceService';

export default function PayrollDraftPreview({
  draft: savedDraft,
  revision,
  onSave,
  onEditingChange
}: {
  draft: PayrollDraft;
  revision?: number;
  onSave?: (draft: PayrollDraft, revision: number) => Promise<void>;
  onEditingChange?: (editing: boolean) => void;
}) {
  const [editingDraft, setEditingDraft] = useState<PayrollDraft | null>(null);
  const [editRevision, setEditRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const draft = editingDraft ?? savedDraft;
  const isEditing = !!editingDraft;
  useEffect(() => {
    onEditingChange?.(isEditing);
    return () => onEditingChange?.(false);
  }, [isEditing, onEditingChange]);
  const [search, setSearch] = useState('');
  const [employeeId, setEmployeeId] = useState<string>();
  const throughDate = draft.dataThrough ?? draft.endDate;
  const attendanceQuery = useQuery({
    queryKey: ['payrollDraftDailyAttendance', draft.startDate, throughDate],
    queryFn: async () => {
      const params = {
        limit: 0,
        'filter[date_between]': `${draft.startDate},${throughDate}`
      };
      const first = await fetchAttendancesCalculated(params);
      if (!Array.isArray(first.data))
        throw new Error('Dữ liệu công không hợp lệ');
      const records = [...first.data];
      for (let page = 2; page <= (first.last_page || 1); page++) {
        const next = await fetchAttendancesCalculated({ ...params, page });
        if (!Array.isArray(next.data) || !next.data.length)
          throw new Error('Dữ liệu công chưa đầy đủ');
        records.push(...next.data);
      }
      if (first.total > records.length)
        throw new Error('Dữ liệu công chưa đầy đủ');
      return records;
    }
  });
  const { data: savedProfiles } = useQuery({
    queryKey: ['payrollProfilesForDraftPreview'],
    queryFn: fetchPayrollProfiles,
    staleTime: 5 * 60 * 1000
  });
  const profiles = useMemo(
    () =>
      draft.rows.map((row) => {
        const saved = savedProfiles?.data.find(
          (item) =>
            String(item.profile.employeeId).trim() ===
            String(row.profile.employeeId).trim()
        );
        return resolveSnapshotProfile(row.profile, saved?.profile);
      }),
    [draft.rows, savedProfiles]
  );

  async function editAdjustment(
    profile: PayrollProfile,
    key: keyof PayrollAdjustments,
    value: string | number
  ) {
    if (!editingDraft || saving) return false;
    const row = editingDraft.rows.find(
      (item) => item.profile.employeeId === profile.employeeId
    );
    if (!row) return false;
    const adjustments = {
      ...emptyPayrollAdjustments(),
      ...row.adjustments,
      [key]: value
    };
    // Reuse saved aggregate hours, never replace salary totals with live attendance.
    const result = calculatePayroll(
      [profile],
      [],
      { [profile.employeeId]: { ...adjustments, attendanceOverrides: [] } },
      editingDraft.rules,
      editingDraft.startDate,
      editingDraft.endDate,
      { [profile.employeeId]: row.hours }
    );
    if (result.issues.length || !result.rows.length) {
      message.error(
        result.issues.join('; ') || 'Không thể tính lại dòng lương này.'
      );
      return false;
    }
    const updated = { ...result.rows[0], adjustments };
    setEditingDraft(
      (current) =>
        current && {
          ...current,
          rows: current.rows.map((item) =>
            item.profile.employeeId === profile.employeeId ? updated : item
          )
        }
    );
    return true;
  }

  async function saveChanges() {
    if (!editingDraft || !onSave || saving) return;
    setSaving(true);
    try {
      await onSave(editingDraft, editRevision);
      setEditingDraft(null);
      message.success('Đã lưu thay đổi bảng lương nháp.');
    } catch (error) {
      message.error(
        getApiErrorMessage(
          error,
          'Không lưu được bản nháp. Các thay đổi vẫn được giữ trên màn hình.'
        )
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-4">
      {onSave && (
        <Space>
          {editingDraft ? (
            <>
              <Button
                type="primary"
                loading={saving}
                onClick={() => void saveChanges()}
              >
                Lưu thay đổi
              </Button>
              <Button disabled={saving} onClick={() => setEditingDraft(null)}>
                Huỷ
              </Button>
              <span>Sửa các ô có biểu tượng ✎ trong tab Tính lương.</span>
            </>
          ) : (
            <Button
              disabled={!revision}
              onClick={() => {
                setEditRevision(revision!);
                setEditingDraft(savedDraft);
              }}
            >
              Sửa bảng lương nháp
            </Button>
          )}
        </Space>
      )}
      <Input.Search
        placeholder="Tìm mã hoặc tên nhân viên"
        aria-label="Tìm nhân viên trong bảng lương nháp"
        allowClear
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {attendanceQuery.isError && (
        <Alert
          type="error"
          message="Không tải được chi tiết công từng ngày. Vui lòng thử lại."
          action={
            <button
              type="button"
              onClick={() => void attendanceQuery.refetch()}
            >
              Thử lại
            </button>
          }
        />
      )}
      <div className="w-full max-w-full min-w-0">
        <Spin spinning={attendanceQuery.isLoading}>
          <PayrollExcelSheets
            draftPreview
            profiles={profiles}
            attendance={attendanceQuery.data ?? null}
            draft={draft}
            startDate={draft.startDate}
            endDate={draft.endDate}
            search={search}
            busy={saving}
            canEditProfiles={false}
            canEditAdjustments={!!editingDraft}
            canEditHolidays={false}
            holidaySettings={null}
            canExport={false}
            employeeId={employeeId ?? draft.rows[0]?.profile.employeeId}
            editProfile={() => {}}
            createProfile={() => {}}
            deleteProfile={() => {}}
            saveProfileField={async () => {}}
            saveManualAdjustment={editAdjustment}
            editAdjustment={() => {}}
            editHoliday={() => {}}
            selectEmployee={setEmployeeId}
            exportPayslip={() => {}}
          />
        </Spin>
      </div>
    </div>
  );
}
