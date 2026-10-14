import { useState, type CSSProperties } from 'react';
import { FiMoon, FiPause, FiPlay } from 'react-icons/fi';
import './mid-autumn.css';

export default function MidAutumnBanner({
  variant = 'dashboard'
}: {
  variant?: 'login' | 'dashboard';
}) {
  const [paused, setPaused] = useState(false);

  return (
    <section
      className={`mid-autumn-banner mid-autumn-banner--${variant}`}
      data-paused={paused}
      aria-label="Chào đón Tết Trung Thu"
    >
      <picture>
        {variant === 'dashboard' && (
          <source
            media="(min-width: 768px)"
            srcSet="/images/holiday/mid-autumn-panorama.png"
          />
        )}
        <img
          className="mid-autumn-art"
          src="/images/holiday/mid-autumn-night.png"
          alt=""
          fetchPriority="high"
        />
      </picture>
      <div className="mid-autumn-shade" aria-hidden="true" />
      <div className="mid-autumn-sparkles" aria-hidden="true">
        {Array.from({ length: 14 }, (_, index) => (
          <span
            key={index}
            style={
              {
                left: `${8 + ((index * 17) % 86)}%`,
                top: `${12 + ((index * 23) % 74)}%`,
                '--sparkle-delay': `${index * -0.7}s`
              } as CSSProperties
            }
          />
        ))}
        <i className="mid-autumn-lantern mid-autumn-lantern--one" />
        <i className="mid-autumn-lantern mid-autumn-lantern--two" />
      </div>
      <div className="mid-autumn-copy">
        <span className="mid-autumn-eyebrow">
          <FiMoon aria-hidden="true" /> MÙA TRĂNG ĐOÀN VIÊN
        </span>
        <h2>
          Trăng tròn vẹn.
          <br />
          <em>Tình thân đong đầy.</em>
        </h2>
        <p>
          Chúc đại gia đình Vinh Vinh Phát một mùa Trung Thu
          <br className="mid-autumn-desktop-break" /> an lành, ấm áp và trọn vẹn
          yêu thương.
        </p>
        <span className="mid-autumn-signoff">
          <span aria-hidden="true" /> Cùng nhau làm việc · Cùng nhau gắn kết
        </span>
      </div>
      <button
        className="mid-autumn-motion-toggle"
        type="button"
        onClick={() => setPaused(!paused)}
        aria-pressed={paused}
        aria-label={
          paused ? 'Bật hiệu ứng Trung Thu' : 'Tạm dừng hiệu ứng Trung Thu'
        }
        title={paused ? 'Bật hiệu ứng' : 'Tạm dừng hiệu ứng'}
      >
        {paused ? <FiPlay /> : <FiPause />}
        <span>{paused ? 'Bật hiệu ứng' : 'Tạm dừng'}</span>
      </button>
    </section>
  );
}
