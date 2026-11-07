import {
  CheckCircleOutlined,
  GiftOutlined,
  HeartOutlined
} from '@ant-design/icons';
import { Image, Modal, Typography } from 'antd';
import Button from '@components/common/AppButton';
import React, { useEffect, useMemo, useState } from 'react';

const { Title, Text } = Typography;

export interface BirthdayModalProps {
  employees?: string[];
  companyName?: string;
  open?: boolean;
  onClose?: () => void;
  autoCloseMs?: number;
  title?: string;
  brandColor?: string;
  isCurrentUserBirthday?: boolean;
  currentUserName?: string;
  forceRender?: boolean;
  mask?: boolean;
  rootClassName?: string;
}

const EXTERNAL_BIRTHDAY_IMAGES = [
  'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=640&h=420&q=85',
  'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=640&h=420&q=85',
  'https://images.unsplash.com/photo-1558301211-0d8c8ddee6ec?auto=format&fit=crop&w=640&h=420&q=85',
  'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?auto=format&fit=crop&w=640&h=420&q=85',
  'https://images.unsplash.com/photo-1535141192574-5d4897c12636?auto=format&fit=crop&w=640&h=420&q=85'
];

const CONFETTI_COLORS = ['#2563eb', '#14b8a6', '#f97316', '#e11d48'];
const RAINBOW_COLORS = [
  '#ef4444',
  '#f97316',
  '#facc15',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#a855f7'
];

const CONFETTI_DOTS = Array.from({ length: 18 }, (_, index) => ({
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
  delay: (index % 6) * 0.32,
  duration: 4.2 + (index % 4) * 0.42,
  left: 6 + ((index * 17) % 88),
  size: 5 + (index % 4),
  top: 4 + ((index * 23) % 76)
}));

const FIREWORKS = [
  { delay: 0.1, left: 17, top: 18 },
  { delay: 0.55, left: 79, top: 16 },
  { delay: 1.05, left: 68, top: 42 },
  { delay: 1.55, left: 27, top: 58 },
  { delay: 2.05, left: 47, top: 24 },
  { delay: 2.55, left: 86, top: 58 },
  { delay: 3.05, left: 14, top: 42 },
  { delay: 3.55, left: 54, top: 70 }
];

const BIRTHDAY_BURSTS = [
  {
    delay: 0,
    left: 42,
    mobileLeft: 'clamp(126px, 42%, 50%)',
    mobileTranslate: '-42%',
    side: 'left',
    top: 48
  },
  {
    delay: 2,
    left: 58,
    mobileLeft: 'clamp(50%, 58%, calc(100% - 126px))',
    mobileTranslate: '-58%',
    side: 'right',
    top: 48
  }
];

const FIREWORK_PARTICLES = Array.from({ length: 28 }, (_, index) => ({
  angle: index * (360 / 28),
  color: RAINBOW_COLORS[index % RAINBOW_COLORS.length],
  distance: 42 + (index % 4) * 11,
  size: 4 + (index % 4)
}));

const HAPPY_BIRTHDAY_LETTERS = Array.from('Happy Birthday').map(
  (letter, index) => ({
    delay: index * 0.035,
    letter,
    size: 28 + ((index * 7) % 15)
  })
);

const BASE_WISHES = [
  'Chúc {name} tuổi mới thật khỏe, làm việc thuận lợi và luôn giữ được năng lượng tốt.',
  'Chúc {name} sinh nhật vui vẻ, tuổi mới thêm tự tin và có nhiều điều tích cực.',
  'Chúc {name} bước sang tuổi mới với tinh thần thoải mái và nhiều cột mốc đáng nhớ.',
  'Chúc {name} một ngày sinh nhật thật gọn vui, tuổi mới nhiều thuận lợi.',
  'Chúc {name} tuổi mới vững nhịp làm việc, nhiều cơ hội hay và nhiều niềm vui mới.',
  'Chúc {name} luôn giữ phong độ tốt và đón tuổi mới với thật nhiều cảm hứng.'
];

const PERSONAL_BIRTHDAY_WISHES = [
  'Chúc bạn tuổi mới thật khỏe, giữ nhịp làm việc tốt và có thêm nhiều điều đáng tự hào.',
  'Chúc bạn sinh nhật vui vẻ, tuổi mới nhiều năng lượng và nhiều cơ hội hay.',
  'Chúc bạn bước sang tuổi mới với tinh thần thoải mái, tự tin và nhiều cảm hứng.',
  'Chúc bạn có một ngày sinh nhật thật gọn vui, tuổi mới thuận lợi và rõ mục tiêu hơn.',
  'Chúc bạn tuổi mới giữ phong độ tốt, làm điều mình muốn và đón nhiều tin vui.'
];

function makeWish(
  name: string,
  isPersonal = false,
  version = 0,
  index = 0
): string {
  const wishes = isPersonal ? PERSONAL_BIRTHDAY_WISHES : BASE_WISHES;
  const offset = Math.floor(Math.random() * wishes.length);
  return wishes[(offset + version + index) % wishes.length].replace(
    '{name}',
    name
  );
}

function getDisplayName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 2) return words.join(' ');
  return words.slice(-2).join(' ');
}

const BirthdayModal: React.FC<BirthdayModalProps> = ({
  employees = [],
  companyName = 'Công Ty Vinh Vinh Phát',
  open = false,
  onClose,
  autoCloseMs = 10000,
  title = 'Chúc mừng sinh nhật',
  brandColor = '#2563eb',
  isCurrentUserBirthday = false,
  currentUserName,
  forceRender,
  mask,
  rootClassName
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [wishVersion, setWishVersion] = useState(0);
  const displayEmployees = useMemo(
    () => employees.map((employee) => getDisplayName(employee)),
    [employees]
  );
  const currentDisplayName = getDisplayName(
    currentUserName || employees[0] || ''
  );
  const wishes = useMemo(
    () =>
      isCurrentUserBirthday
        ? [makeWish(currentDisplayName, true, wishVersion)]
        : displayEmployees.map((e, index) =>
            makeWish(e, false, wishVersion, index)
          ),
    [currentDisplayName, displayEmployees, isCurrentUserBirthday, wishVersion]
  );

  const maxWishes = isCompactViewport
    ? 2
    : employees.length > 3
      ? 3
      : employees.length;
  const displayWishes = wishes.slice(0, maxWishes);
  const birthdaySummary = isCurrentUserBirthday
    ? `${companyName} chúc mừng sinh nhật ${currentDisplayName || 'bạn'}. Chúc bạn một tuổi mới thật tốt.`
    : employees.length === 1
      ? `${companyName} gửi lời chúc sinh nhật đến ${displayEmployees[0]}.`
      : `Hôm nay có ${employees.length} nhân sự sinh nhật. ${companyName} gửi lời chúc đến mọi người.`;
  const activeImage =
    EXTERNAL_BIRTHDAY_IMAGES[
      activeImageIndex % EXTERNAL_BIRTHDAY_IMAGES.length
    ];

  useEffect(() => {
    const query = window.matchMedia('(max-width: 620px), (max-height: 720px)');
    const syncViewport = () => setIsCompactViewport(query.matches);
    syncViewport();
    query.addEventListener('change', syncViewport);
    return () => query.removeEventListener('change', syncViewport);
  }, []);

  useEffect(() => {
    if (!open) return;
    setWishVersion((current) => current + 1);
    setActiveImageIndex(
      Math.floor(Math.random() * EXTERNAL_BIRTHDAY_IMAGES.length)
    );

    const t = window.setInterval(() => {
      setActiveImageIndex((current) => current + 1);
    }, 2800);

    return () => window.clearInterval(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!autoCloseMs || autoCloseMs <= 0) return;
    const t = window.setTimeout(() => onClose?.(), autoCloseMs);
    return () => window.clearTimeout(t);
  }, [open, autoCloseMs, onClose]);

  return (
    <>
      <style>
        {`
        @import url('https://fonts.cdnfonts.com/css/halimun');

        .bd-modal {
          width: min(94vw, 620px) !important;
          margin: 0 auto !important;
          max-width: calc(100vw - 24px);
        }

        .bd-modal .ant-modal-content {
          max-height: calc(100dvh - 32px);
          animation: bd-modal-in 0.42s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
          border-radius: 24px;
          border: 1px solid rgba(148, 163, 184, 0.24);
          background:
            linear-gradient(135deg, rgba(248, 250, 252, 0.98) 0%, #ffffff 46%, rgba(240, 253, 250, 0.86) 100%);
          box-shadow:
            0 28px 72px rgba(15, 23, 42, 0.18),
            0 8px 22px rgba(15, 23, 42, 0.08);
          padding: 0;
        }

        .bd-shell {
          display: flex;
          position: relative;
          max-height: calc(100dvh - 32px);
          flex-direction: column;
          overflow: hidden;
          color: #0f172a;
        }

        .bd-ornaments {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }

        .bd-ornament-dot {
          position: absolute;
          top: var(--bd-top);
          left: var(--bd-left);
          width: var(--bd-size);
          height: var(--bd-size);
          border-radius: 999px;
          background: var(--bd-color);
          opacity: 0.18;
          animation: bd-float var(--bd-duration) ease-in-out infinite;
          animation-delay: var(--bd-delay);
        }

        .bd-ornament-dot:nth-child(3n) {
          border-radius: 2px;
          transform: rotate(18deg);
        }

        .bd-ornament-dot:nth-child(4n) {
          opacity: 0.12;
        }

        .bd-fireworks,
        .bd-birthday-bursts {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 2;
        }

        .bd-firework {
          position: absolute;
          top: var(--bd-firework-top);
          left: var(--bd-firework-left);
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #ffffff;
          opacity: 0;
          box-shadow: 0 0 18px rgba(255, 255, 255, 0.8);
          animation: bd-firework-core 4.2s ease-out infinite;
          animation-delay: var(--bd-firework-delay);
        }

        .bd-firework-particle {
          position: absolute;
          top: 50%;
          left: 50%;
          width: var(--bd-particle-size);
          height: var(--bd-particle-size);
          border-radius: 999px;
          background: var(--bd-particle-color);
          opacity: 0;
          filter: drop-shadow(0 0 8px var(--bd-particle-color));
          transform: translate(-50%, -50%) rotate(var(--bd-particle-angle)) translateX(0);
          animation: bd-firework-particle 4.2s ease-out infinite;
          animation-delay: var(--bd-firework-delay);
        }

        .bd-birthday-burst {
          position: absolute;
          top: var(--bd-birthday-top);
          left: var(--bd-birthday-left);
          display: inline-flex;
          align-items: baseline;
          gap: 1px;
          --bd-birthday-translate: -50%;
          transform: translateX(var(--bd-birthday-translate));
          font-family: 'Halimun', 'Brush Script MT', cursive;
          font-weight: 900;
          letter-spacing: 0;
          text-shadow:
            0 12px 26px rgba(15, 23, 42, 0.22),
            0 0 18px rgba(255, 255, 255, 0.9),
            0 0 24px rgba(6, 182, 212, 0.34);
          opacity: 0;
          white-space: nowrap;
          animation: bd-birthday-popup 4s cubic-bezier(0.16, 1, 0.3, 1) infinite;
          animation-delay: var(--bd-birthday-delay);
        }

        .bd-birthday-letter {
          display: inline-block;
          min-width: 0.28em;
          color: #06b6d4;
          font-size: var(--bd-letter-size);
          line-height: 1;
          opacity: 0;
          animation: bd-letter-bounce 2s cubic-bezier(0.2, 1.35, 0.34, 1) infinite both;
          animation-delay: calc(var(--bd-birthday-delay) + var(--bd-letter-delay));
          transform-origin: 50% 100%;
        }

        .bd-hero {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 184px;
          gap: 20px;
          align-items: stretch;
          padding: 24px 24px 20px;
        }

        .bd-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .bd-kicker {
          animation: bd-slide-up 0.46s 0.08s both;
          display: inline-flex;
          width: fit-content;
          align-items: center;
          gap: 7px;
          margin-bottom: 12px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(37, 99, 235, 0.14);
          background: rgba(37, 99, 235, 0.08);
          color: ${brandColor};
          font-size: 12px;
          font-weight: 750;
        }

        .bd-title {
          animation: bd-slide-up 0.5s 0.14s both;
          margin: 0 !important;
          color: #0f172a !important;
          font-size: 27px !important;
          font-weight: 800 !important;
          line-height: 1.15 !important;
        }

        .bd-company {
          animation: bd-slide-up 0.52s 0.2s both;
          margin-top: 8px;
          max-width: 390px;
          color: #64748b;
          font-size: 13px;
          line-height: 1.55;
        }

        .bd-cover {
          position: relative;
          min-height: 178px;
          overflow: hidden;
          border-radius: 20px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          background: #f8fafc;
          box-shadow:
            0 16px 34px rgba(15, 23, 42, 0.12),
            inset 0 0 0 1px rgba(255, 255, 255, 0.5);
          animation: bd-cover-float 4.8s ease-in-out infinite;
        }

        .bd-cover::after {
          position: absolute;
          inset: 0;
          content: '';
          background:
            linear-gradient(115deg, transparent 0 34%, rgba(255,255,255,0.28) 44%, transparent 54% 100%);
          transform: translateX(-120%);
          animation: bd-cover-shine 3.6s ease-in-out infinite;
        }

        .bd-cover .ant-image {
          display: block;
          width: 100%;
          height: 100%;
        }

        .bd-cover .ant-image-img {
          animation: bd-image-in 0.72s ease both;
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .bd-body {
          position: relative;
          z-index: 1;
          flex: 1;
          padding: 0 24px 24px;
          overflow: hidden;
        }

        .bd-panel {
          position: relative;
          animation: bd-panel-in 0.48s 0.22s both;
          border: 1px solid rgba(226, 232, 240, 0.95);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.84);
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
        }

        .bd-panel + .bd-panel {
          animation-delay: 0.3s;
          margin-top: 12px;
        }

        .bd-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 16px 0;
        }

        .bd-section-title {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #0f172a;
          font-size: 14px;
          font-weight: 760;
        }

        .bd-wishes {
          display: flex;
          flex-direction: column;
          gap: 1px;
          padding: 8px;
        }

        .bd-wish {
          animation: bd-card-in 0.42s both;
          display: grid;
          grid-template-columns: 38px 1fr;
          gap: 12px;
          padding: 12px;
          border-radius: 14px;
          background: transparent;
          transition: background 0.2s ease;
        }

        .bd-wish + .bd-wish {
          border-top: 1px solid #eef2f7;
          border-radius: 0 0 14px 14px;
        }

        .bd-wish:hover {
          background: #f8fafc;
        }

        .bd-wish-icon {
          display: inline-flex;
          width: 38px;
          height: 38px;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          background: #fff7ed;
          color: #c2410c;
          font-size: 16px;
        }

        .bd-wish-text {
          margin: 0 !important;
          color: #475569 !important;
          font-size: 13px !important;
          line-height: 1.65 !important;
        }

        .bd-empty {
          padding: 26px 16px;
          border: 1px dashed #cbd5e1;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.78);
          text-align: center;
        }

        .bd-footer {
          display: flex;
          justify-content: flex-end;
          margin-top: 16px;
        }

        .bd-close {
          height: 42px !important;
          border-radius: 12px !important;
          padding: 0 20px !important;
          font-weight: 700 !important;
          background: #0f172a !important;
          border-color: #0f172a !important;
          box-shadow: 0 12px 22px rgba(15, 23, 42, 0.18) !important;
        }

        @keyframes bd-modal-in {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes bd-slide-up {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes bd-float {
          0%, 100% {
            transform: translate3d(0, 0, 0) rotate(0deg);
          }
          50% {
            transform: translate3d(10px, -16px, 0) rotate(22deg);
          }
        }

        @keyframes bd-firework-core {
          0%, 46%, 100% {
            opacity: 0;
            transform: scale(0.2);
          }
          54% {
            opacity: 1;
            transform: scale(0.8);
          }
          72% {
            opacity: 0;
            transform: scale(1.6);
          }
        }

        @keyframes bd-firework-particle {
          0%, 46% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(var(--bd-particle-angle)) translateX(0) scale(0.45);
          }
          54% {
            opacity: 1;
            transform: translate(-50%, -50%) rotate(var(--bd-particle-angle)) translateX(calc(var(--bd-particle-distance) * 0.35)) scale(1);
          }
          78% {
            opacity: 0.72;
            transform: translate(-50%, -50%) rotate(var(--bd-particle-angle)) translateX(calc(var(--bd-particle-distance) * 0.82)) scale(0.72);
          }
          94%, 100% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(var(--bd-particle-angle)) translateX(var(--bd-particle-distance)) scale(0.15);
          }
        }

        @keyframes bd-birthday-popup {
          0%, 50%, 100% {
            opacity: 0;
            transform: translate(var(--bd-birthday-translate), 16px) scale(0.78);
          }
          12% {
            opacity: 1;
            transform: translate(var(--bd-birthday-translate), -4px) scale(1.02);
          }
          28% {
            opacity: 0.95;
            transform: translate(var(--bd-birthday-translate), -30px) scale(1.08);
          }
          46% {
            opacity: 0;
            transform: translate(var(--bd-birthday-translate), -48px) scale(1.14);
          }
        }

        @keyframes bd-letter-bounce {
          0%, 8%, 100% {
            opacity: 0;
            transform: translateY(10px) rotate(0deg) scale(0.82);
          }
          16% {
            opacity: 1;
            transform: translateY(0) rotate(0deg) scale(1);
          }
          36% {
            opacity: 1;
            transform: translateY(-14px) rotate(-5deg) scale(1.18);
          }
          66% {
            opacity: 1;
            transform: translateY(4px) rotate(4deg) scale(0.94);
          }
          82% {
            opacity: 0;
            transform: translateY(-12px) rotate(3deg) scale(1.04);
          }
        }

        @keyframes bd-cover-float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }

        @keyframes bd-cover-shine {
          0%, 42% {
            transform: translateX(-120%);
          }
          70%, 100% {
            transform: translateX(120%);
          }
        }

        @keyframes bd-image-in {
          from {
            opacity: 0;
            transform: scale(1.06);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes bd-panel-in {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes bd-card-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .bd-modal .ant-modal-content,
          .bd-kicker,
          .bd-title,
          .bd-company,
          .bd-cover,
          .bd-cover::after,
          .bd-cover .ant-image-img,
          .bd-panel,
          .bd-wish,
          .bd-ornament-dot,
          .bd-firework,
          .bd-firework-particle,
          .bd-birthday-burst,
          .bd-birthday-letter {
            animation: none !important;
          }
        }

        @media (max-width: 620px) {
          .bd-modal {
            width: calc(100vw - 24px) !important;
            max-width: 420px;
          }

          .bd-modal .ant-modal-content {
            max-height: calc(100dvh - 24px);
            border-radius: 22px;
          }

          .bd-shell {
            max-height: calc(100dvh - 24px);
          }

          .bd-hero {
            grid-template-columns: minmax(0, 1fr) 118px;
            gap: 12px;
            align-items: center;
            padding: 14px 14px 10px;
          }

          .bd-kicker {
            gap: 5px;
            margin-bottom: 8px;
            padding: 5px 9px;
            font-size: 11px;
          }

          .bd-title {
            font-size: 22px !important;
            line-height: 1.12 !important;
          }

          .bd-company {
            display: -webkit-box;
            margin-top: 6px;
            overflow: hidden;
            color: #64748b;
            font-size: 12px;
            line-height: 1.42;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 1;
          }

          .bd-cover {
            height: 112px;
            min-height: 112px;
            border-radius: 18px;
          }

          .bd-body {
            padding: 0 14px 14px;
            overflow: hidden;
          }

          .bd-panel {
            border-radius: 16px;
          }

          .bd-panel + .bd-panel {
            margin-top: 10px;
          }

          .bd-section-head {
            align-items: center;
            flex-direction: row;
            gap: 8px;
            padding: 11px 12px 0;
          }

          .bd-section-title {
            gap: 7px;
            font-size: 13px;
          }

          .bd-wishes {
            padding: 6px;
          }

          .bd-wish {
            grid-template-columns: 32px 1fr;
            gap: 10px;
            padding: 10px;
          }

          .bd-wish-icon {
            width: 32px;
            height: 32px;
            border-radius: 11px;
            font-size: 14px;
          }

          .bd-wish-text {
            font-size: 12px !important;
            line-height: 1.5 !important;
          }

          .bd-birthday-letter {
            font-size: clamp(16px, calc(var(--bd-letter-size) * 0.62), 26px);
          }

          .bd-birthday-burst {
            left: var(--bd-birthday-mobile-left);
            --bd-birthday-translate: var(--bd-birthday-mobile-translate);
          }

          .bd-footer {
            justify-content: stretch;
            margin-top: 10px;
          }

          .bd-close {
            width: 100%;
            height: 38px !important;
          }
        }

        @media (max-width: 380px) {
          .bd-birthday-letter {
            font-size: clamp(15px, calc(var(--bd-letter-size) * 0.56), 23px);
          }

          .bd-birthday-burst[data-side='left'] {
            left: clamp(112px, 44%, 50%);
            --bd-birthday-translate: -42%;
          }

          .bd-birthday-burst[data-side='right'] {
            left: clamp(50%, 56%, calc(100% - 112px));
            --bd-birthday-translate: -58%;
          }
        }
        `}
      </style>

      <Modal
        className="bd-modal"
        rootClassName={rootClassName}
        open={open}
        forceRender={forceRender}
        mask={mask}
        onCancel={onClose}
        footer={null}
        centered
        closeIcon={false}
        styles={{ body: { maxHeight: 'none', overflow: 'hidden', padding: 0 } }}
      >
        <div className="bd-shell">
          <div className="bd-ornaments">
            {CONFETTI_DOTS.map((dot, index) => (
              <span
                aria-hidden="true"
                className="bd-ornament-dot"
                key={index}
                style={
                  {
                    '--bd-color': dot.color,
                    '--bd-delay': `${dot.delay}s`,
                    '--bd-duration': `${dot.duration}s`,
                    '--bd-left': `${dot.left}%`,
                    '--bd-size': `${dot.size}px`,
                    '--bd-top': `${dot.top}%`
                  } as React.CSSProperties
                }
              />
            ))}
          </div>

          <div className="bd-fireworks">
            {FIREWORKS.map((firework, index) => (
              <span
                aria-hidden="true"
                className="bd-firework"
                key={index}
                style={
                  {
                    '--bd-firework-delay': `${firework.delay}s`,
                    '--bd-firework-left': `${firework.left}%`,
                    '--bd-firework-top': `${firework.top}%`
                  } as React.CSSProperties
                }
              >
                {FIREWORK_PARTICLES.map((particle, particleIndex) => (
                  <i
                    className="bd-firework-particle"
                    key={particleIndex}
                    style={
                      {
                        '--bd-particle-angle': `${particle.angle}deg`,
                        '--bd-particle-color': particle.color,
                        '--bd-particle-distance': `${particle.distance}px`,
                        '--bd-particle-size': `${particle.size}px`
                      } as React.CSSProperties
                    }
                  />
                ))}
              </span>
            ))}
          </div>

          <div className="bd-birthday-bursts">
            {BIRTHDAY_BURSTS.map((burst, index) => (
              <span
                aria-hidden="true"
                className="bd-birthday-burst"
                data-side={burst.side}
                key={index}
                style={
                  {
                    '--bd-birthday-delay': `${burst.delay}s`,
                    '--bd-birthday-left': `${burst.left}%`,
                    '--bd-birthday-mobile-left': burst.mobileLeft,
                    '--bd-birthday-mobile-translate': burst.mobileTranslate,
                    '--bd-birthday-top': `${burst.top}%`
                  } as React.CSSProperties
                }
              >
                {HAPPY_BIRTHDAY_LETTERS.map((item, letterIndex) => (
                  <span
                    className="bd-birthday-letter"
                    key={`${item.letter}-${letterIndex}`}
                    style={
                      {
                        '--bd-letter-delay': `${item.delay}s`,
                        '--bd-letter-size': `${item.size}px`
                      } as React.CSSProperties
                    }
                  >
                    {item.letter === ' ' ? '\u00A0' : item.letter}
                  </span>
                ))}
              </span>
            ))}
          </div>

          <div className="bd-hero">
            <div className="bd-copy">
              <div className="bd-kicker">
                <GiftOutlined />
                Sinh nhật hôm nay
              </div>
              <Title level={3} className="bd-title">
                {title}
              </Title>
              <div className="bd-company">{birthdaySummary}</div>
            </div>

            <div className="bd-cover">
              <Image
                key={activeImage}
                src={activeImage}
                alt="Bánh sinh nhật"
                preview={false}
                placeholder
              />
            </div>
          </div>

          <div className="bd-body">
            {employees.length > 0 ? (
              <div className="bd-panel">
                <div className="bd-section-head">
                  <div className="bd-section-title">
                    <HeartOutlined />
                    Lời chúc
                  </div>
                </div>

                <div className="bd-wishes">
                  {displayWishes.map((wish, index) => (
                    <div
                      className="bd-wish"
                      key={index}
                      style={{ animationDelay: `${0.34 + index * 0.05}s` }}
                    >
                      <span className="bd-wish-icon">
                        <HeartOutlined />
                      </span>
                      <Text className="bd-wish-text">{wish}</Text>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bd-empty">
                <Text type="secondary">
                  Hôm nay chưa có nhân sự nào trong danh sách sinh nhật.
                </Text>
              </div>
            )}

            <div className="bd-footer">
              <Button
                tone="inherit"
                type="primary"
                size="large"
                onClick={onClose}
                className="bd-close"
                icon={<CheckCircleOutlined />}
              >
                Đã xem
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default BirthdayModal;
