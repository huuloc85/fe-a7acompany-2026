import React, { useRef, useEffect, useState } from 'react';
import { Space, message } from 'antd';
import Button from '@components/common/AppButton';
import { ClearOutlined, DownloadOutlined } from '@ant-design/icons';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/utils/signatureUtil';

interface SignaturePadProps {
  onSignatureChange?: (signatureDataURL: string | null) => void;
  width?: number;
  height?: number;
  penColor?: string;
  penWidth?: number;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  onSignatureChange,
  width = CANVAS_WIDTH,
  height = CANVAS_HEIGHT,
  penColor = '#000000',
  penWidth = 2
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  // Setup canvas with proper scaling and responsive sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const setupCanvas = () => {
      // Set canvas internal resolution (high quality)
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas background to white
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Set drawing style
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penWidth;
    };

    setupCanvas();

    // Re-setup on window resize
    window.addEventListener('resize', setupCanvas);
    return () => window.removeEventListener('resize', setupCanvas);
  }, [width, height, penColor, penWidth]);

  // Helper function to get coordinates from both mouse and touch events
  // with proper scaling for canvas resolution vs display size
  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX: number;
    let clientY: number;

    if ('touches' in e) {
      // Touch event
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      // Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Calculate scale ratio between canvas resolution and display size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Get coordinates relative to canvas and scale to match canvas resolution
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    return { x, y };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault(); // Prevent scrolling on touch devices

    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault(); // Prevent scrolling on touch devices

    if (!isDrawing) return;

    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    setIsEmpty(false);

    // Update parent component with signature data
    const dataURL = canvas.toDataURL('image/png');
    onSignatureChange?.(dataURL);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas and set white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    setIsEmpty(true);
    onSignatureChange?.(null);
    message.success('Đã xóa chữ ký');
  };

  const downloadSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) {
      message.warning('Chưa có chữ ký để tải xuống');
      return;
    }

    const link = document.createElement('a');
    link.download = `signature_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    message.success('Đã tải xuống chữ ký');
  };

  return (
    <div className="signature-pad flex flex-col items-center">
      <div ref={containerRef} className="mb-3 w-full">
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair rounded border-2 border-dashed border-gray-300 bg-gray-50"
          style={{
            touchAction: 'none',
            display: 'block',
            height: 'auto' // Maintain aspect ratio
          }}
          // Mouse events
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          // Touch events for mobile
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
        />
      </div>
      <div className="flex justify-center">
        <Space>
          <Button
            tone="inherit"
            icon={<ClearOutlined />}
            onClick={clearSignature}
            disabled={isEmpty}
          >
            Xóa chữ ký
          </Button>
          <Button
            tone="inherit"
            icon={<DownloadOutlined />}
            onClick={downloadSignature}
            disabled={isEmpty}
          >
            Tải xuống
          </Button>
        </Space>
      </div>
      {/* <div className="text-xs text-gray-500 mt-2 text-center">
                Vẽ chữ ký của bạn trong khung trên
            </div> */}
    </div>
  );
};

export default SignaturePad;
