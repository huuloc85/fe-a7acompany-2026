import { useEffect, useRef, useState } from 'react';
import { Button, Input, Modal, message } from 'antd';
import RFB from '@novnc/novnc/lib/rfb';
import axiosPrivate from '@/api/axiosInstance';
import { getApiErrorMessage } from '@/utils/apiError';

export default function ScreenViewer() {
  const target = useRef<HTMLDivElement>(null);
  const connection = useRef<RFB | null>(null);
  const generation = useRef(0);
  const [status, setStatus] = useState('Chưa kết nối màn hình');
  const [active, setActive] = useState(false);
  const [passwordNeeded, setPasswordNeeded] = useState(false);
  const [password, setPassword] = useState('');
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
          setStatus('Đang xem · Chỉ đọc · Tối đa 5 phút');
      });
      rfb.addEventListener('credentialsrequired', () => {
        if (generation.current === current) setPasswordNeeded(true);
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={active}
          onClick={() =>
            Modal.confirm({
              title: 'Xem toàn bộ màn hình Jetson?',
              content:
                'Có thể hiển thị thông tin nhạy cảm trên desktop. Chỉ xem, không điều khiển chuột/bàn phím.',
              okText: 'Xem màn hình',
              cancelText: 'Huỷ',
              onOk: connect
            })
          }
        >
          Xem màn hình
        </Button>
        <Button disabled={!active} onClick={disconnect}>
          Ngắt
        </Button>
        <span>{status}</span>
      </div>
      <div
        ref={target}
        className="h-[420px] max-h-[70vh] overflow-hidden rounded-lg bg-gray-950"
      />
      <Modal
        open={passwordNeeded}
        title="Mật khẩu VNC của Jetson"
        okText="Kết nối"
        cancelText="Huỷ"
        onCancel={disconnect}
        onOk={() => {
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
        <p>Mật khẩu chỉ dùng cho phiên này, không lưu vào trình duyệt.</p>
      </Modal>
    </div>
  );
}
