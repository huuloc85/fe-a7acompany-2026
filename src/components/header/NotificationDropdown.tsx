import { isAdmin as isAdminRole } from '@utils/authUtil';
import { useStampNotification } from '@hooks/useStampNotification';
import { useFeedbackNotification } from '@hooks/useFeedbackNotification';
import { useAdminFeedbackNotification } from '@hooks/useAdminFeedbackNotification';
import { useEmployeeNotification } from '@hooks/useEmployeeNotification';
import { useAuth } from '@hooks/useAuth';
import { removeFeedbackNotification } from '@stores/feedbackNotificationStore';
import { removeEmployeeNotification } from '@stores/employeeNotificationStore';
import { Link } from '@tanstack/react-router';
import { Badge } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FaRegBell, FaTrash } from 'react-icons/fa';

// Helper function to convert stamp numbers to range format
function formatStampRanges(stamps: number[]): string {
  if (stamps.length === 0) return '';

  const sorted = [...stamps].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(', ');
}

// Helper function to parse binStart (can be comma-separated or single number)
function parseStampNumbers(
  binStart: string | number,
  binCount: number
): number[] {
  const binStartStr = String(binStart);

  if (binStartStr.includes(',')) {
    return binStartStr
      .split(',')
      .map((n) => parseInt(n.trim()))
      .filter((n) => !isNaN(n));
  } else {
    const start = parseInt(binStartStr);
    return Array.from({ length: binCount }, (_, i) => start + i);
  }
}

type GroupedNotification = {
  employee_id: string;
  employee_name: string;
  product_id: string;
  product_name: string;
  date: string;
  shift: number;
  stampRanges: string;
  recordIds: string[];
  latestTime: string;
};

// Time ago helper
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

export default function NotificationDropdown() {
  const { items: stampItems, handleClearNotifications } =
    useStampNotification();
  const { user } = useAuth();
  const isEmployee = !isAdminRole(user?.role?.name || '');
  const isAdmin = !isEmployee;
  const {
    notifications: feedbackNotifs,
    unreadCount: feedbackUnread,
    clearAll: clearAllFeedback
  } = useFeedbackNotification(isEmployee, user?.id);
  const {
    notifications: adminFeedbackNotifs,
    unreadCount: adminFeedbackUnread,
    clearAll: clearAllAdminFeedback
  } = useAdminFeedbackNotification(isAdmin);

  // Merge: employee sees reply notifs, admin sees new feedback notifs
  const allFeedbackNotifs = isEmployee ? feedbackNotifs : adminFeedbackNotifs;
  const allFeedbackUnread = isEmployee ? feedbackUnread : adminFeedbackUnread;

  // Broadcast notifications (salary & schedule) — employee only
  const {
    notifications: employeeNotifs,
    unreadCount: employeeUnread,
    clearAll: clearAllEmployee
  } = useEmployeeNotification(isEmployee);

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Group notifications
  const groupedNotifications = useMemo(() => {
    const groups = new Map<string, GroupedNotification>();

    stampItems.forEach((item) => {
      if (!item.meta) return;

      const key = `${item.meta.employee_id}-${item.meta.product_id}-${item.meta.date}-${item.meta.shift}`;
      const stamps = parseStampNumbers(item.meta.binStart, item.meta.binCount);

      if (groups.has(key)) {
        const group = groups.get(key)!;

        const allStamps: number[] = [];
        group.stampRanges.split(',').forEach((range) => {
          const trimmed = range.trim();
          if (trimmed.includes('-')) {
            const [start, end] = trimmed.split('-').map((n) => parseInt(n));
            for (let i = start; i <= end; i++) {
              allStamps.push(i);
            }
          } else {
            allStamps.push(parseInt(trimmed));
          }
        });

        const mergedStamps = [...new Set([...allStamps, ...stamps])];
        group.stampRanges = formatStampRanges(mergedStamps);
        group.recordIds.push(item.recordId);

        if (item.sent_at && item.sent_at > group.latestTime) {
          group.latestTime = item.sent_at;
        }
      } else {
        groups.set(key, {
          employee_id: item.meta.employee_id,
          employee_name: item.meta.employee?.name || 'Unknown',
          product_id: item.meta.product_id,
          product_name: item.meta.product?.name || 'Unknown',
          date: String(item.meta.date),
          shift: item.meta.shift,
          stampRanges: formatStampRanges(stamps),
          recordIds: [item.recordId],
          latestTime: item.sent_at || new Date().toISOString()
        });
      }
    });

    return Array.from(groups.values()).sort(
      (a, b) =>
        new Date(b.latestTime).getTime() - new Date(a.latestTime).getTime()
    );
  }, [stampItems]);

  const count = stampItems.length + allFeedbackUnread + employeeUnread;
  const totalVisibleNotifications =
    groupedNotifications.length +
    allFeedbackNotifs.length +
    employeeNotifs.length;

  // Time ago for feedback
  function fbTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ── Bell Button ── */}
      <Badge count={count} size="small" offset={[-2, 2]}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="notification-trigger-btn relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-all duration-300 hover:bg-gray-50 hover:text-gray-700 hover:shadow-sm active:scale-95 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        >
          <FaRegBell className="text-lg" />
        </button>
      </Badge>

      {/* ── Dropdown Panel ── */}
      {open && (
        <div className="app-notification-dropdown glass-dropdown app-dropdown-enter absolute top-full right-0 mt-1.5 w-72 overflow-hidden rounded-xl sm:w-80">
          {/* ── Header ── */}
          <div className="app-dropdown-header flex items-center justify-between px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <span className="app-dropdown-title text-[13px] font-semibold text-gray-800 dark:text-white">
                Thông báo
              </span>
              {count > 0 && (
                <span className="app-dropdown-count rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                  {count}
                </span>
              )}
            </div>
            {totalVisibleNotifications > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearNotifications();
                  clearAllFeedback();
                  clearAllAdminFeedback();
                  clearAllEmployee();
                }}
                className="app-dropdown-clear-btn flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-red-500 transition-colors duration-200 active:bg-red-50 dark:text-red-400"
              >
                <FaTrash className="text-[9px]" />
                <span>Xóa tất cả</span>
              </button>
            )}
          </div>

          <div className="app-dropdown-divider mx-3 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent dark:via-gray-700" />

          {/* ── Notification List ── */}
          <div className="scrollbar-thin max-h-72 overflow-y-auto">
            {groupedNotifications.length === 0 &&
            allFeedbackNotifs.length === 0 &&
            employeeNotifs.length === 0 ? (
              <div className="app-notification-empty flex flex-col items-center justify-center py-8 text-center">
                <div className="app-notification-empty-icon flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 dark:bg-gray-800">
                  <FaRegBell className="text-base text-gray-300 dark:text-gray-600" />
                </div>
                <p className="mt-2 text-[12px] text-gray-400 dark:text-gray-500">
                  Không có thông báo
                </p>
              </div>
            ) : (
              <div className="py-1">
                {/* ── Feedback Notifications ── */}
                {allFeedbackNotifs.map((fb) => (
                  <Link
                    key={`fb-${fb.id}`}
                    to={isAdmin ? '/admin/feedbacks' : '/'}
                    search={isAdmin ? { highlightId: String(fb.id) } : {}}
                    onClick={() => {
                      removeFeedbackNotification(fb.id);
                      setOpen(false);
                    }}
                    className={`app-notification-item block cursor-pointer px-3.5 py-2 transition-colors duration-200 active:bg-blue-50/60 dark:active:bg-white/5 ${
                      !fb.read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <p className="app-notification-title text-[12px] font-semibold text-gray-800 dark:text-gray-200">
                        {isAdmin
                          ? 'Góp ý mới từ nhân viên'
                          : `Góp ý ${fb.status === 'resolved' ? 'đã xử lý' : 'bị từ chối'}`}
                      </p>
                      {!fb.read && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                      )}
                    </div>
                    {isEmployee && (
                      <p className="app-notification-body mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          "{fb.subject}"
                        </span>
                        {fb.admin_reply && ` — ${fb.admin_reply}`}
                      </p>
                    )}
                    <p className="app-notification-time mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
                      {fbTimeAgo(fb.replied_at)}
                    </p>
                  </Link>
                ))}

                {/* ── Employee Notifications (Salary & Schedule) ── */}
                {employeeNotifs.map((n) => {
                  const itemId = n.id.replace(/^(salary|schedule)-/, '');
                  return (
                    <Link
                      key={n.id}
                      to={
                        n.type === 'salary'
                          ? '/employee/salaries'
                          : '/employee/schedules'
                      }
                      search={{ openId: itemId }}
                      onClick={() => {
                        removeEmployeeNotification(n.id);
                        setOpen(false);
                      }}
                      className={`app-notification-item block cursor-pointer px-3.5 py-2.5 transition-colors duration-200 active:bg-blue-50/60 dark:active:bg-white/5 ${
                        !n.read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2.5 px-0.5">
                        {/* Color indicator */}
                        <div
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                            n.type === 'salary'
                              ? 'bg-emerald-500'
                              : 'bg-blue-500'
                          }`}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="app-notification-title text-[12px] font-semibold text-gray-800 dark:text-gray-200">
                              {n.title}
                            </p>
                            {!n.read && (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                            )}
                          </div>
                          <p className="app-notification-body mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                            {n.message}
                          </p>
                          <p className="app-notification-time mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
                            {fbTimeAgo(n.created_at)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}

                {/* ── Stamp Notifications ── */}
                {groupedNotifications.map((n, index) => (
                  <Link
                    key={`noti-${index}`}
                    to="/stamps/history"
                    search={{ highlightId: n.recordIds[0] }}
                    onClick={() => setOpen(false)}
                    className="app-notification-item block px-3.5 py-2 transition-colors duration-200 active:bg-blue-50/60 dark:active:bg-white/5"
                  >
                    <p className="app-notification-title text-[12px] font-semibold text-gray-800 dark:text-gray-200">
                      Yêu cầu in tem
                    </p>
                    <p className="app-notification-body mt-0.5 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {n.employee_name}
                      </span>
                      {' · '}
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {n.product_name}
                      </span>
                      {' · Ca '}
                      {n.shift}
                      {' · Tem: '}
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {n.stampRanges}
                      </span>
                    </p>
                    <p className="app-notification-time mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
                      {timeAgo(n.latestTime)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
