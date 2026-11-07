import { useCallback, useEffect, useRef, useState } from 'react';
import { Input, Modal, message } from 'antd';
import Button from '@/components/common/AppButton';
import RFB from '@novnc/novnc/lib/rfb';
import axiosPrivate from '@/api/axiosInstance';
import { getApiErrorMessage } from '@/utils/apiError';
import type { Cap7ASystem } from '@/services/Cap7AService';

export default function ScreenViewer({
  system,
  autoConnectRequest = 0,
  tabActive = true,
  appOnline = false
}: {
  system: Cap7ASystem;
  autoConnectRequest?: number;
  tabActive?: boolean;
  appOnline?: boolean;
}) {
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
  const connected = useRef(false);
  useEffect(() => {
    const element = target.current;
    if (!element) return;
    let frame = 0;
    const restoreViewport = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (document.hidden || !element.clientWidth || !element.clientHeight)
          return;
        const rfb = connection.current;
        if (!rfb || !connected.current) return;
        rfb.scaleViewport = true;
        const canvas = element.querySelector('canvas');
        if (!canvas?.width || !canvas.height) return;
        // Repaint the full backing frame, not just subsequent incremental
        // updates, after the browser resumes rendering this viewer.
        canvas.getContext('2d')?.putImageData(rfb.getImageData(), 0, 0);
      });
    };
    const observer = new ResizeObserver(restoreViewport);
    observer.observe(element);
    document.addEventListener('visibilitychange', restoreViewport);
    window.addEventListener('focus', restoreViewport);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', restoreViewport);
      window.removeEventListener('focus', restoreViewport);
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
  const handledAutoRequest = useRef(0);
  const connectionAuthSession = useRef<string | null>(null);
  const connectRef = useRef<() => Promise<void>>(async () => {});
  const [status, setStatus] = useState('Chưa kết nối màn hình');
  const [active, setActive] = useState(false);
  const [waitingForApp, setWaitingForApp] = useState(false);
  const [passwordNeeded, setPasswordNeeded] = useState(false);
  const [password, setPassword] = useState('');
  useEffect(() => {
    // Remove the previous persistent cache; passwords now live only in this tab.
    try {
      localStorage.removeItem('cap7a.vnc-password');
      sessionStorage.removeItem('cap7a.vnc-password');
      // TAIL now authenticates at its gateway; purge any previous browser copy.
      if (system === 'tail') {
        localStorage.removeItem(passwordKey);
        sessionStorage.removeItem(passwordKey);
      }
    } catch {
      /* Storage unavailable. */
    }
  }, [system, passwordKey]);
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
    connected.current = false;
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
    handledAutoRequest.current = autoConnectRequest;
    release();
    setActive(false);
    setWaitingForApp(false);
    setPasswordNeeded(false);
    setPassword('');
    setStatus('Đã ngắt màn hình');
  };
  useEffect(() => release, [release]);

  useEffect(() => {
    if (!active && !waitingForApp) return;
    const checkSession = () => {
      if (
        connectionAuthSession.current ===
        localStorage.getItem('auth_session_id')
      )
        return;
      handledAutoRequest.current = autoConnectRequest;
      release();
      setActive(false);
      setWaitingForApp(false);
      setPasswordNeeded(false);
      setPassword('');
      setStatus('Phiên đăng nhập đã kết thúc.');
    };
    const timer = setInterval(checkSession, 1000);
    window.addEventListener('storage', checkSession);
    return () => {
      clearInterval(timer);
      window.removeEventListener('storage', checkSession);
    };
  }, [active, waitingForApp, autoConnectRequest, release]);

  const connect = async (retry = false) => {
    release();
    if (!retry) retries.current = 0;
    const current = generation.current;
    submittedPassword.current = '';
    const authSession = localStorage.getItem('auth_session_id');
    connectionAuthSession.current = authSession;
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
      if (authSession !== localStorage.getItem('auth_session_id')) {
        disconnect();
        return;
      }
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
        connected.current = true;
        if (connectTimer.current) clearTimeout(connectTimer.current);
        connectTimer.current = null;
        retries.current = 0;
        setPasswordNeeded(false);
        if (
          system !== 'tail' &&
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
        if (system === 'tail') {
          disconnect();
          setStatus(
            'Cần cập nhật gateway Screen 1 để xác thực VNC tại Jetson.'
          );
          return;
        }
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

  useEffect(() => {
    connectRef.current = () => connect();
  });

  useEffect(() => {
    if (
      !tabActive ||
      !autoConnectRequest ||
      handledAutoRequest.current === autoConnectRequest
    )
      return;
    // One viewing attempt per tab visit or accepted launch. Never send an app command.
    if (active) {
      handledAutoRequest.current = autoConnectRequest;
      return;
    }
    const remaining = autoConnectRequest + 120000 - Date.now();
    if (remaining <= 0) {
      handledAutoRequest.current = autoConnectRequest;
      setWaitingForApp(false);
      setStatus('Chưa nhận trạng thái ứng dụng. Bấm Xem màn hình để thử lại.');
      return;
    }
    if (appOnline) {
      handledAutoRequest.current = autoConnectRequest;
      setWaitingForApp(false);
      void connectRef.current();
      return;
    }
    connectionAuthSession.current = localStorage.getItem('auth_session_id');
    setWaitingForApp(true);
    setStatus('Đang chờ ứng dụng kết nối để mở màn hình…');
    const timer = setTimeout(() => {
      handledAutoRequest.current = autoConnectRequest;
      setWaitingForApp(false);
      setStatus('Chưa nhận trạng thái ứng dụng. Bấm Xem màn hình để thử lại.');
    }, remaining);
    return () => clearTimeout(timer);
  }, [system, autoConnectRequest, appOnline, active, waitingForApp, tabActive]);

  return (
    <div className="cap7a-viewer">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={active || waitingForApp}
          onClick={() => void connect()}
        >
          Xem màn hình
        </Button>
        <Button disabled={!active && !waitingForApp} onClick={disconnect}>
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
