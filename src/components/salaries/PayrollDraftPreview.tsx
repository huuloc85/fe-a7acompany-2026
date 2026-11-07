import { Alert, Input, Space, message } from 'antd';
import Button from '@components/common/AppButton';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  calculatePayroll,
  recalculatePayrollDraft,
  emptyPayrollAdjustments,
  type PayrollDraft,
  type PayrollAdjustments,
  type PayrollProfile
} from '@/utils/payrollCalculation';
import { getApiErrorMessage } from '@/utils/apiError';
import { fetchPayrollProfiles } from '@/services/PayrollProfileService';
import PayrollExcelSheets from './PayrollExcelSheets';
import PayrollReferenceImport from './PayrollReferenceImport';
import { resolveSnapshotProfile } from '@/utils/payrollSnapshotProfile';

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
  const { data: savedProfiles, isFetching: loadingProfiles } = useQuery({
    queryKey: ['payrollProfilesForDraftPreview'],
    queryFn: fetchPayrollProfiles,
    staleTime: 5 * 60 * 1000
  });
  const profiles = useMemo(
    () =>
      draft.rows.map((row) => {
        const saved = savedProfiles?.data.find((item) =>
          [item.profile.employeeId, item.profile.attendanceEmployeeId].some(
            (id) =>
              id?.trim() ===
              (
                row.profile.attendanceEmployeeId || row.profile.employeeId
              ).trim()
          )
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
    if (!editingDraft || saving || editingDraft.importMode === 'excel-values')
      return false;
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
    const updated = { ...result.rows[0], adjustments, source: row.source };
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
        <Space wrap>
          {editingDraft ? (
            <>
              <PayrollReferenceImport
                period={editingDraft.endDate.slice(0, 7)}
                currentDraft={editingDraft}
                profiles={
                  savedProfiles?.data
                    .filter((item) => item.employeeLinked !== false)
                    .map((item) => item.profile) ?? []
                }
                disabled={saving || loadingProfiles || !savedProfiles}
                onSave={async (imported) => {
                  setEditingDraft(imported);
                  message.success(
                    'Đã áp dụng dữ liệu Excel. Kiểm tra kết quả rồi bấm Lưu thay đổi.'
                  );
                }}
              />
              <Button
                tone="inherit"
                disabled={
                  saving ||
                  loadingProfiles ||
                  !editingDraft.rows.length ||
                  editingDraft.importMode === 'excel-values'
                }
                onClick={() => {
                  try {
                    setEditingDraft(
                      recalculatePayrollDraft(editingDraft, profiles)
                    );
                    message.success(
                      'Đã tính lại lương. Kiểm tra kết quả rồi bấm Lưu thay đổi.'
                    );
                  } catch (error) {
                    message.error(
                      error instanceof Error
                        ? error.message
                        : 'Không thể tính lại bảng lương nháp.'
                    );
                  }
                }}
              >
                Tính lại lương
              </Button>
              <Button
                tone="inherit"
                type="primary"
                loading={saving}
                onClick={() => void saveChanges()}
              >
                Lưu thay đổi
              </Button>
              <Button
                tone="inherit"
                disabled={saving}
                onClick={() => setEditingDraft(null)}
              >
                Huỷ
              </Button>
              <span>
                {draft.importMode === 'excel-values'
                  ? 'Giữ nguyên số liệu Excel. Nhập lại file để thay đổi.'
                  : 'Sửa các ô có biểu tượng ✎ trong tab Tính lương.'}
              </span>
            </>
          ) : (
            <Button
              tone="inherit"
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
      {draft.importMode === 'excel-values' && (
        <Alert
          type="info"
          message="Bản nháp nhập nguyên kết quả Excel, không tính lại."
          description={`Tăng cường tiền mặt: ${draft.rows.reduce((sum, row) => sum + (row.cashTotal ?? 0), 0).toLocaleString('vi-VN')} đ. ${draft.warnings?.join(' ') ?? ''}`}
        />
      )}
      {draft.rows.some((row) => !row.source) && (
        <Alert
          type="info"
          message="Bản nháp đã tính lương, chưa xác nhận đối chiếu với Excel mới."
          description="Một số dòng chưa lưu thông tin nguồn Excel. Đây không phải thông báo lỗi tính lương hoặc xác nhận số tiền bị lệch."
        />
      )}
      {!draft.attendance && (
        <Alert
          type="info"
          message="Bản nháp chưa lưu chi tiết công từng ngày. Các khoản lương dùng số công tổng hợp đã lưu."
        />
      )}
      <div className="w-full max-w-full min-w-0">
        <PayrollExcelSheets
          draftPreview
          profiles={profiles}
          attendance={draft.attendance ?? null}
          draft={draft}
          startDate={draft.startDate}
          endDate={draft.endDate}
          search={search}
          busy={saving}
          canEditProfiles={false}
          canEditAdjustments={
            !!editingDraft && draft.importMode !== 'excel-values'
          }
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
      </div>
    </div>
  );
}
