import React from 'react';
interface ComponentCardProps {
  title: string | React.ReactNode;
  children: React.ReactNode;
  className?: string;
  desc?: string;
  uppercaseTitle?: boolean;
  headingLevel?: 1 | 2 | 3;
  actions?: React.ReactNode;
}

const ComponentCard: React.FC<ComponentCardProps> = ({
  title,
  children,
  className = '',
  desc = '',
  uppercaseTitle = true,
  headingLevel = 2,
  actions
}) => {
  const Heading = `h${headingLevel}` as 'h1' | 'h2' | 'h3';
  return (
    <section
      className={`ui-card liquid-glass-card mb-6 rounded-xl ${className}`}
    >
      {/* Card Header */}
      <div className="ui-card-header flex flex-col justify-center gap-1 px-4 py-3 text-left sm:px-6 sm:py-4">
        <Heading
          className={`ui-page-title !m-0 leading-snug font-semibold text-gray-800 dark:text-white/90 ${uppercaseTitle ? 'text-[22px] uppercase sm:text-[28px]' : 'text-lg'}`}
        >
          {title}
        </Heading>
        {desc && (
          <p className="!m-0 text-xs text-gray-500 sm:text-sm dark:text-gray-400">
            {desc}
          </p>
        )}
      </div>

      {/* Card Body */}
      <div className="ui-card-body p-4 sm:p-5">
        <div className="space-y-4">
          {actions && <div className="ui-toolbar">{actions}</div>}
          {children}
        </div>
      </div>
    </section>
  );
};

export default ComponentCard;
