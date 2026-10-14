import { Alert, Tag } from 'antd';
import { memo } from 'react';
import Marquee from 'react-fast-marquee';
import { FaBell } from 'react-icons/fa6';
interface MarqueeTextProps {
  messages: string[];
  speed?: number;
}

const MarqueeAlert = memo(function MarqueeAlert({
  messages,
  speed = 50
}: MarqueeTextProps) {
  return (
    <>
      <Alert
        type="info"
        showIcon
        icon={<FaBell size={20} />}
        message={
          <Marquee
            speed={speed}
            pauseOnHover
            className="[&_.rfm-marquee]:will-change-transform"
          >
            {messages.map((msg, index) => (
              <Tag key={`marquee-${index}`}>
                <div className="p-1 text-[1rem] font-semibold uppercase">
                  {msg.split(/(Zalo\s+0898406358)/gi).map((part, partIndex) =>
                    /^Zalo\s+0898406358$/i.test(part) ? (
                      <a
                        key={partIndex}
                        href="https://zalo.me/0898406358"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="!text-blue-700 underline underline-offset-2 hover:!text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2"
                      >
                        {part}
                      </a>
                    ) : (
                      part
                    )
                  )}
                </div>
              </Tag>
            ))}
          </Marquee>
        }
      />
    </>
  );
});

export default MarqueeAlert;
