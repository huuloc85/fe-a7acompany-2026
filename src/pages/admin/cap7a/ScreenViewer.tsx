import { useCallback, useEffect, useRef, useState } from 'react';
import { Input, Modal, message } from 'antd';
import Button from '@/components/common/AppButton';
import RFB from '@novnc/novnc/lib/rfb';
import axiosPrivate from '@/api/axiosInstance';
import { getApiErrorMessage } from '@/utils/apiError';
import type { Cap7ASystem } from '@/services/Cap7AService';

export default function ScreenViewer({ system }: { system: Cap7ASystem }) {
  const passwordKey = `cap7a.${system}.vnc-password`;
  const target = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = target.current;
    if (!element) return;
    const fitFrame = () => {
      const canvas = element.querySelector('canvas');
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        element.style.aspectRatio = `${canvas.width} / ${canvas.height}`;
      }
    };
    // Canvas backing dimensions are the remote framebuffer, not its CSS scale.
    const observer = new MutationObserver(fitFrame);
    observer.observe(element, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['width', 'height']
    });
    fitFrame();
    return () => observer.disconnect();
  }, []);
  const connection = useRef<RFB | null>(null);
  useEffect(() => {
    const element = target.current;
    if (!element) return;
    let frame = 0;
    const restoreViewport = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (document.hidden || !element.clientWidth || !element.clientHeight)
          return;
        // Hidden tabs have zero size. Reapply noVNC's public scaling setter
        // when visible again without replacing the framebuffer or WebSocket.
        if (connection.current) connection.current.scaleViewport = true;
      });
    };
    const observer = new ResizeObserver(restoreViewport);
    observer.observe(element);
    document.addEventListener('visibilitychange', restoreViewport);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', restoreViewport);
      cancelAnimationFrame(frame);
    };
  }, []);
  const generation = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRequest = useRef<AbortController | null>(null);
  const resumeHandshake = useRef<(() => void) | null>(null);
  const retries = useRef(0);
  const submittedPassword = useRef('');
  const [status, setStatus] = useState('Chưa kết nối màn hình');
  const [active, setActive] = useState(false);
  const [passwordNeeded, setPasswordNeeded] = useState(false);
  const [password, setPassword] = useState('');
  useEffect(() => {
    // Remove the previous persistent cache; passwords now live only in this tab.
    try {
      localStorage.removeItem('cap7a.vnc-password');
      sessionStorage.removeItem('cap7a.vnc-password');
    } catch {
      /* Storage unavailable. */
    }
  }, []);
  const forgetPassword = () => {
    submittedPassword.current = '';
    try {
      sessionStorage.removeItem(passwordKey);
      setPassword('');
    } catch {
      message.warning('Trình duyệt không cho phép xóa mật khẩu đã lưu.');
    }
  };
  const release = useCallback(() => {
    generation.current += 1;
    if (retryTimer.current) clearTimeout(retryTimer.current);
    if (connectTimer.current) clearTimeout(connectTimer.current);
    retryTimer.current = null;
    connectTimer.current = null;
    resumeHandshake.current = null;
    pendingRequest.current?.abort();
    pendingRequest.current = null;
    const old = connection.current;
    connection.current = null;
    old?.disconnect();
    target.current?.replaceChildren();
    submittedPassword.current = '';
  }, []);
  const disconnect = () => {
    release();
    setActive(false);
    setPasswordNeeded(false);
    setPassword('');
    setStatus('Đã ngắt màn hình');
  };
  useEffect(() => release, [release]);

  const connect = async (retry = false) => {
    release();
    if (!retry) retries.current = 0;
    const current = generation.current;
    submittedPassword.current = '';
    const authSession = localStorage.getItem('auth_session_id');
    let triedSavedPassword = false;
    setActive(true);
    setPasswordNeeded(false);
    setStatus('Đang kết nối…');
    const failed = () => {
      if (generation.current !== current) return;
      release();
      setPasswordNeeded(false);
      setPassword('');
      if (
        retries.current >= 10 ||
        authSession !== localStorage.getItem('auth_session_id')
      ) {
        setActive(false);
        setStatus('Chưa kết nối được. Bấm Xem màn hình để thử lại.');
        return;
      }
      // The gateway may still be coming up just after Jetson boots. Retry
      // quickly here; the old 3/6/12/24/30s backoff made recovery look stuck.
      const delay = [1000, 2000, 3000, 5000, 8000][
        Math.min(retries.current++, 4)
      ];
      setStatus(
        `Mất kết nối · Thử lại sau ${delay / 1000}s (${retries.current}/10)`
      );
      const waiting = generation.current;
      retryTimer.current = setTimeout(() => {
        if (generation.current !== waiting) return;
        if (authSession !== localStorage.getItem('auth_session_id')) {
          disconnect();
          return;
        }
        void connect(true);
      }, delay);
    };
    const armTimeout = () => {
      if (connectTimer.current) clearTimeout(connectTimer.current);
      connectTimer.current = setTimeout(failed, 25000);
    };
    try {
      const controller = new AbortController();
      pendingRequest.current = controller;
      const session = await axiosPrivate.post<
        unknown,
        { ticket: string; websocket_url: string; view_only: boolean }
      >(
        `/api/cap7a/${system}/screen-sessions`,
        { confirmed: true },
        { timeout: 12000, signal: controller.signal }
      );
      if (generation.current !== current || !target.current) return;
      pendingRequest.current = null;
      const url = new URL(session.websocket_url);
      if (url.protocol !== 'wss:' || session.view_only !== true) {
        disconnect();
        message.error('Cấu hình màn hình không hợp lệ.');
        return;
      }
      url.searchParams.set('ticket', session.ticket);
      const rfb = new RFB(target.current, url.toString());
      connection.current = rfb;
      rfb.viewOnly = true;
      rfb.scaleViewport = true;
      rfb.resizeSession = false;
      resumeHandshake.current = armTimeout;
      armTimeout();
      rfb.addEventListener('connect', () => {
        if (generation.current !== current) return;
        if (connectTimer.current) clearTimeout(connectTimer.current);
        connectTimer.current = null;
        retries.current = 0;
        setPasswordNeeded(false);
        if (
          submittedPassword.current &&
          authSession &&
          authSession === localStorage.getItem('auth_session_id')
        ) {
          try {
            sessionStorage.setItem(
              passwordKey,
              JSON.stringify({
                sessionId: authSession,
                password: submittedPassword.current
              })
            );
          } catch {
            message.warning('Không lưu được mật khẩu trong phiên web.');
          }
        }
        submittedPassword.current = '';
        setStatus('Đang xem · Chỉ đọc · Tự gia hạn khi còn quyền');
      });
      rfb.addEventListener('credentialsrequired', () => {
        if (generation.current !== current) return;
        try {
          const saved = JSON.parse(
            sessionStorage.getItem(passwordKey) ?? 'null'
          );
          if (
            !triedSavedPassword &&
            authSession &&
            authSession === localStorage.getItem('auth_session_id') &&
            saved?.sessionId === authSession &&
            typeof saved.password === 'string' &&
            saved.password
          ) {
            triedSavedPassword = true;
            submittedPassword.current = saved.password;
            rfb.sendCredentials({ password: saved.password });
            return;
          }
          sessionStorage.removeItem(passwordKey);
        } catch {
          /* Ask manually if session storage is unavailable or invalid. */
        }
        setPassword('');
        if (connectTimer.current) clearTimeout(connectTimer.current);
        connectTimer.current = null;
        setStatus('Chờ nhập mật khẩu VNC');
        setPasswordNeeded(true);
      });
      rfb.addEventListener('securityfailure', () => {
        if (generation.current !== current) return;
        forgetPassword();
        disconnect();
        message.error(
          'Xác thực VNC thất bại. Bấm Xem màn hình để nhập lại mật khẩu.'
        );
      });
      rfb.addEventListener('disconnect', () => {
        // noVNC can emit this event after it has already transitioned to
        // disconnected; clear the ref before cleanup so we do not call
        // disconnect() on the same RFB object a second time.
        if (connection.current === rfb) connection.current = null;
        failed();
      });
    } catch (error) {
      if (generation.current !== current) return;
      const code = (error as { response?: { status?: number } }).response
        ?.status;
      if (
        code &&
        code >= 400 &&
        code < 500 &&
        ![408, 409, 429].includes(code)
      ) {
        disconnect();
        message.error(
          getApiErrorMessage(error, 'Không được phép xem màn hình.')
        );
      } else {
        failed();
      }
    }
  };

  return (
    <div className="cap7a-viewer">
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={active} onClick={() => void connect()}>
          Xem màn hình
        </Button>
        <Button disabled={!active} onClick={disconnect}>
          Ngắt
        </Button>
        <span className="min-w-0 text-xs">{status}</span>
      </div>
      <div
        ref={target}
        className="cap7a-screen-target rounded-lg bg-gray-950"
      />
      <Modal
        open={passwordNeeded}
        title="Mật khẩu VNC của Jetson"
        okText="Kết nối"
        cancelText="Huỷ"
        onCancel={disconnect}
        onOk={() => {
          resumeHandshake.current?.();
          submittedPassword.current = password;
          connection.current?.sendCredentials({ password });
          setPassword('');
          setPasswordNeeded(false);
        }}
      >
        <Input.Password
          autoComplete="off"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <p className="mt-2 text-xs">
          Tự nhớ mật khẩu trong phiên web của tab này.
        </p>
      </Modal>
    </div>
  );
}
