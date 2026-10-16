import { useEffect, useRef, useState } from 'react';
import { Input, Modal, message } from 'antd';
import Button from '@/components/common/AppButton';
import RFB from '@novnc/novnc/lib/rfb';
import axiosPrivate from '@/api/axiosInstance';
import { getApiErrorMessage } from '@/utils/apiError';

const VNC_PASSWORD_KEY = 'cap7a.vnc-password';

export default function ScreenViewer() {
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
  const generation = useRef(0);
  const submittedPassword = useRef('');
  const [status, setStatus] = useState('Chưa kết nối màn hình');
  const [active, setActive] = useState(false);
  const [passwordNeeded, setPasswordNeeded] = useState(false);
  const [password, setPassword] = useState('');
  useEffect(() => {
    // Remove the previous persistent cache; passwords now live only in this tab.
    try {
      localStorage.removeItem(VNC_PASSWORD_KEY);
    } catch {
      /* Storage unavailable. */
    }
  }, []);
  const forgetPassword = () => {
    submittedPassword.current = '';
    try {
      sessionStorage.removeItem(VNC_PASSWORD_KEY);
      setPassword('');
    } catch {
      message.warning('Trình duyệt không cho phép xóa mật khẩu đã lưu.');
    }
  };
  const disconnect = () => {
    submittedPassword.current = '';
    generation.current += 1;
    connection.current?.disconnect();
    connection.current = null;
    setActive(false);
    setPasswordNeeded(false);
    setPassword('');
    setStatus('Đã ngắt màn hình');
  };
  useEffect(
    () => () => {
      generation.current += 1;
      connection.current?.disconnect();
    },
    []
  );

  const connect = async () => {
    const current = ++generation.current;
    submittedPassword.current = '';
    const authSession = localStorage.getItem('auth_session_id');
    let triedSavedPassword = false;
    setActive(true);
    setStatus('Đang kết nối…');
    try {
      const session = await axiosPrivate.post<
        unknown,
        { ticket: string; websocket_url: string; view_only: boolean }
      >('/api/cap7a/screen-sessions', { confirmed: true }, { timeout: 12000 });
      if (generation.current !== current || !target.current) return;
      const url = new URL(session.websocket_url);
      if (url.protocol !== 'wss:' || session.view_only !== true)
        throw new Error('Invalid screen configuration');
      url.searchParams.set('ticket', session.ticket);
      const rfb = new RFB(target.current, url.toString());
      connection.current = rfb;
      rfb.viewOnly = true;
      rfb.scaleViewport = true;
      rfb.resizeSession = false;
      rfb.addEventListener('connect', () => {
        if (generation.current !== current) return;
        if (
          submittedPassword.current &&
          authSession &&
          authSession === localStorage.getItem('auth_session_id')
        ) {
          try {
            sessionStorage.setItem(
              VNC_PASSWORD_KEY,
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
            sessionStorage.getItem(VNC_PASSWORD_KEY) ?? 'null'
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
          sessionStorage.removeItem(VNC_PASSWORD_KEY);
        } catch {
          /* Ask manually if session storage is unavailable or invalid. */
        }
        setPassword('');
        setPasswordNeeded(true);
      });
      rfb.addEventListener('securityfailure', () => {
        if (generation.current !== current) return;
        forgetPassword();
        message.error(
          'Xác thực VNC thất bại. Bấm Xem màn hình để nhập lại mật khẩu.'
        );
      });
      rfb.addEventListener('disconnect', () => {
        if (generation.current !== current) return;
        connection.current = null;
        submittedPassword.current = '';
        setActive(false);
        setPasswordNeeded(false);
        setPassword('');
        setStatus('Đã ngắt / hết phiên. Bấm Xem màn hình để kết nối lại.');
      });
    } catch (error) {
      if (generation.current !== current) return;
      disconnect();
      message.error(
        getApiErrorMessage(error, 'Chưa kết nối được gateway màn hình.')
      );
    }
  };

  return (
    <div className="cap7a-viewer">
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={active} onClick={connect}>
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
