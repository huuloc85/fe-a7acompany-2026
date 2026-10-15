import { useEffect, useRef, useState } from 'react';
import { Button, Checkbox, Input, Modal, message } from 'antd';
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
  const [status, setStatus] = useState('Chưa kết nối màn hình');
  const [active, setActive] = useState(false);
  const [passwordNeeded, setPasswordNeeded] = useState(false);
  const [password, setPassword] = useState('');
  const [rememberPassword, setRememberPassword] = useState(false);
  const forgetPassword = () => {
    try {
      localStorage.removeItem(VNC_PASSWORD_KEY);
      setRememberPassword(false);
      setPassword('');
    } catch {
      message.warning('Trình duyệt không cho phép xóa mật khẩu đã lưu.');
    }
  };
  const disconnect = () => {
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
        if (generation.current === current)
          setStatus('Đang xem · Chỉ đọc · Tự gia hạn khi còn quyền');
      });
      rfb.addEventListener('credentialsrequired', () => {
        if (generation.current !== current) return;
        try {
          const saved = localStorage.getItem(VNC_PASSWORD_KEY) ?? '';
          setPassword(saved);
          setRememberPassword(!!saved);
        } catch {
          setPassword('');
          setRememberPassword(false);
        }
        setPasswordNeeded(true);
      });
      rfb.addEventListener('disconnect', () => {
        if (generation.current !== current) return;
        connection.current = null;
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
        <Button type="text" onClick={forgetPassword}>
          Quên mật khẩu VNC
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
          try {
            if (rememberPassword)
              localStorage.setItem(VNC_PASSWORD_KEY, password);
            else localStorage.removeItem(VNC_PASSWORD_KEY);
          } catch {
            message.warning(
              'Không lưu được mật khẩu; vẫn kết nối cho phiên này.'
            );
          }
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
        <Checkbox
          checked={rememberPassword}
          onChange={(event) => setRememberPassword(event.target.checked)}
        >
          Nhớ mật khẩu VNC trên máy này
        </Checkbox>
        <p className="mt-2 text-xs">
          Chỉ bật trên máy riêng. Mật khẩu lưu trong trình duyệt, không được mã
          hóa bởi ứng dụng. Không dùng trên máy chung.
        </p>
      </Modal>
    </div>
  );
}
