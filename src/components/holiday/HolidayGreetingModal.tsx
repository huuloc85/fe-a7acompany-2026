/**
 * HolidayGreetingModal — One-time festive greeting modal for 30/4 – 1/5.
 *
 * Shows once per user per year.  Uses localStorage to remember dismissal.
 * Design: elegant, warm gold + deep red, minimal, not flashy.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Modal, Typography } from 'antd';
import Button from '@components/common/AppButton';

const { Title, Text } = Typography;

interface HolidayGreetingModalProps {
  open: boolean;
  onClose: () => void;
  autoCloseMs?: number;
  companyName?: string;
  forceRender?: boolean;
  mask?: boolean;
  rootClassName?: string;
}

const QUOTES = [
  'Thống nhất non sông – Vinh quang Tổ quốc! 🇻🇳',
  'Tự hào dân tộc – Vững bước tương lai!',
  'Hòa bình – Độc lập – Tự do – Hạnh phúc!',
  'Đoàn kết – Sáng tạo – Phát triển bền vững!'
];

const HolidayGreetingModal: React.FC<HolidayGreetingModalProps> = ({
  open,
  onClose,
  autoCloseMs = 12000,
  companyName = 'Công Ty TNHH MTV Vinh Vinh Phát',
  forceRender,
  mask,
  rootClassName
}) => {
  const [closing, setClosing] = useState(false);
  const quote = useMemo(
    () => QUOTES[Math.floor(Math.random() * QUOTES.length)],
    []
  );

  useEffect(() => {
    if (!open || !autoCloseMs || autoCloseMs <= 0) return;
    const t = setTimeout(() => {
      setClosing(true);
      setTimeout(() => onClose(), 300);
    }, autoCloseMs);
    return () => clearTimeout(t);
  }, [open, autoCloseMs, onClose]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => onClose(), 300);
  };

  return (
    <>
      <style>{`
        /* ═══════ Holiday Greeting Modal ═══════ */
        .holiday-modal {
          width: min(90vw, 420px) !important;
          max-height: 92vh !important;
          margin: 0 auto !important;
        }
        @media (min-width: 768px) { .holiday-modal { width: min(55vw, 460px) !important; } }
        @media (min-width: 1024px) { .holiday-modal { width: min(38vw, 480px) !important; } }

        .holiday-modal .ant-modal-content {
          position: relative;
          background: linear-gradient(160deg, #7a1a1a 0%, #8b1a1a 30%, #a62626 55%, #7a1a1a 100%);
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid rgba(212, 168, 83, 0.2);
          box-shadow:
            0 24px 60px -12px rgba(122, 26, 26, 0.25),
            0 12px 24px -8px rgba(0, 0, 0, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
          padding: 0 !important;
        }

        /* Gold shimmer overlay */
        .holiday-modal .ant-modal-content::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            110deg,
            transparent 25%,
            rgba(212, 168, 83, 0.08) 45%,
            rgba(212, 168, 83, 0.15) 50%,
            rgba(212, 168, 83, 0.08) 55%,
            transparent 75%
          );
          animation: hm-shimmer 5s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes hm-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        /* Top section with star */
        .hm-header {
          position: relative;
          z-index: 2;
          text-align: center;
          padding: 28px 24px 16px;
        }

        .hm-star-wrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 215, 0, 0.2) 0%, transparent 70%);
          border: 1.5px solid rgba(212, 168, 83, 0.3);
          margin-bottom: 14px;
          animation: hm-star-glow 3s ease-in-out infinite;
        }

        @keyframes hm-star-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.1); }
          50% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.25); }
        }

        .hm-star-icon {
          font-size: 32px;
          filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.4));
        }

        .hm-title {
          color: #ffd700 !important;
          font-size: 22px !important;
          font-weight: 800 !important;
          margin: 0 0 4px !important;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
          letter-spacing: -0.3px;
          line-height: 1.3 !important;
        }

        .hm-year {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
          font-weight: 600;
          letter-spacing: 2px;
        }

        /* Body */
        .hm-body {
          position: relative;
          z-index: 2;
          padding: 0 24px 24px;
          text-align: center;
        }

        /* Gold divider */
        .hm-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0 0 16px;
        }

        .hm-divider-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(212, 168, 83, 0.35), transparent);
        }

        .hm-divider-icon {
          color: #d4a853;
          font-size: 11px;
          opacity: 0.6;
        }

        /* Event labels */
        .hm-events {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }

        .hm-event {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(212, 168, 83, 0.12);
          transition: all 0.25s ease;
        }

        .hm-event:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(212, 168, 83, 0.25);
        }

        .hm-event-date {
          flex-shrink: 0;
          font-size: 11px;
          font-weight: 700;
          color: #ffd700;
          padding: 3px 10px;
          border-radius: 6px;
          background: rgba(255, 215, 0, 0.1);
          border: 1px solid rgba(255, 215, 0, 0.15);
          white-space: nowrap;
        }

        .hm-event-name {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.85);
          font-weight: 500;
          text-align: left;
        }

        /* Quote */
        .hm-quote {
          font-size: 13px !important;
          color: rgba(255, 255, 255, 0.6) !important;
          font-style: italic;
          margin: 0 0 8px !important;
          line-height: 1.5 !important;
        }

        /* Company */
        .hm-company {
          font-size: 11px;
          color: rgba(212, 168, 83, 0.6);
          font-weight: 600;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          margin-bottom: 18px;
        }

        /* CTA */
        .hm-cta {
          position: relative;
          height: 40px !important;
          padding: 0 28px !important;
          border-radius: 100px !important;
          border: 1px solid rgba(212, 168, 83, 0.3) !important;
          font-weight: 600 !important;
          font-size: 13px !important;
          color: #ffd700 !important;
          background: rgba(212, 168, 83, 0.1) !important;
          transition: all 0.3s ease !important;
          overflow: hidden;
        }

        .hm-cta:hover {
          background: rgba(212, 168, 83, 0.2) !important;
          border-color: rgba(212, 168, 83, 0.5) !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 6px 20px rgba(212, 168, 83, 0.15) !important;
        }

        /* Corner ornaments */
        .hm-ornament {
          position: absolute;
          pointer-events: none;
          z-index: 1;
          opacity: 0.08;
        }

        .hm-ornament-tl {
          top: 0; left: 0;
          width: 80px; height: 80px;
          border-top: 2px solid #d4a853;
          border-left: 2px solid #d4a853;
          border-top-left-radius: 20px;
        }

        .hm-ornament-br {
          bottom: 0; right: 0;
          width: 80px; height: 80px;
          border-bottom: 2px solid #d4a853;
          border-right: 2px solid #d4a853;
          border-bottom-right-radius: 20px;
        }

        /* Sparkles */
        @keyframes hm-sparkle {
          0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
          50% { opacity: 0.5; transform: scale(1) rotate(180deg); }
        }

        .hm-sparkle {
          position: absolute;
          pointer-events: none;
          z-index: 1;
          color: #d4a853;
          font-size: 8px;
          animation: hm-sparkle var(--hs-dur, 3s) ease-in-out infinite;
          animation-delay: var(--hs-delay, 0s);
        }

        @media (prefers-reduced-motion: reduce) {
          .holiday-modal .ant-modal-content::before,
          .hm-star-wrap,
          .hm-sparkle { animation: none !important; }
        }

        @media (max-width: 479px) {
          .holiday-modal { width: 94vw !important; }
          .hm-header { padding: 22px 18px 12px; }
          .hm-body { padding: 0 18px 20px; }
          .hm-title { font-size: 19px !important; }
          .hm-star-wrap { width: 54px; height: 54px; }
          .hm-star-icon { font-size: 28px; }
        }
      `}</style>

      <Modal
        className="holiday-modal"
        rootClassName={rootClassName}
        open={open && !closing}
        forceRender={forceRender}
        mask={mask}
        onCancel={handleClose}
        footer={null}
        centered
        closeIcon={false}
        styles={{ body: { padding: 0 } }}
      >
        {/* Ornamental corners */}
        <div className="hm-ornament hm-ornament-tl" />
        <div className="hm-ornament hm-ornament-br" />

        {/* Sparkles */}
        {[
          { top: '10%', right: '15%', dur: 2.5, delay: 0 },
          { top: '30%', left: '10%', dur: 3.2, delay: 0.8 },
          { top: '65%', right: '12%', dur: 2.8, delay: 1.5 },
          { top: '80%', left: '18%', dur: 3.5, delay: 0.3 },
          { top: '20%', right: '30%', dur: 4, delay: 2 },
          { top: '50%', left: '25%', dur: 3, delay: 1 }
        ].map((sp, i) => (
          <span
            key={i}
            className="hm-sparkle"
            style={
              {
                top: sp.top,
                ...(sp.right !== undefined
                  ? { right: sp.right }
                  : { left: sp.left }),
                '--hs-dur': `${sp.dur}s`,
                '--hs-delay': `${sp.delay}s`
              } as unknown as React.CSSProperties
            }
          >
            ✦
          </span>
        ))}

        {/* Header */}
        <div className="hm-header">
          <div className="hm-star-wrap">
            <span className="hm-star-icon">⭐</span>
          </div>
          <Title level={2} className="hm-title">
            Mừng Đại Lễ 30/4 — 1/5
          </Title>
          <div className="hm-year">{new Date().getFullYear()}</div>
        </div>

        {/* Body */}
        <div className="hm-body">
          {/* Divider */}
          <div className="hm-divider">
            <div className="hm-divider-line" />
            <span className="hm-divider-icon">✦</span>
            <div className="hm-divider-line" />
          </div>

          {/* Event cards */}
          <div className="hm-events">
            <div className="hm-event">
              <span className="hm-event-date">30/04</span>
              <span className="hm-event-name">
                Ngày Giải phóng miền Nam, thống nhất đất nước
              </span>
            </div>
            <div className="hm-event">
              <span className="hm-event-date">01/05</span>
              <span className="hm-event-name">Ngày Quốc tế Lao động</span>
            </div>
          </div>

          {/* Quote */}
          <Text className="hm-quote">"{quote}"</Text>

          {/* Company */}
          <div className="hm-company">{companyName}</div>

          {/* CTA */}
          <Button
            tone="inherit"
            size="large"
            onClick={handleClose}
            className="hm-cta"
          >
            🇻🇳 Cảm ơn & Đóng
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default HolidayGreetingModal;
