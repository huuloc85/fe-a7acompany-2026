import { Button } from 'antd';
import React from 'react';

export type AppButtonTone =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'info'
  | 'warning'
  | 'danger'
  | 'purple';

export type AppButtonProps = React.ComponentProps<typeof Button> & {
  /** Keep an existing Ant Design color/variant without applying a semantic tone. */
  tone?: AppButtonTone | 'inherit';
};

const toneClassMap: Record<AppButtonTone, string> = {
  neutral: 'header-action-btn--neutral',
  primary: 'header-action-btn--primary',
  success: 'header-action-btn--success',
  info: 'header-action-btn--info',
  warning: 'header-action-btn--warning',
  danger: 'header-action-btn--danger',
  purple: 'header-action-btn--purple'
};

const getAppButtonClassName = (
  tone: AppButtonTone | 'inherit' = 'neutral',
  className?: string
) =>
  [
    'app-button',
    tone !== 'inherit' && 'header-action-btn',
    tone !== 'inherit' && toneClassMap[tone],
    className
  ]
    .filter(Boolean)
    .join(' ');

const AppButton: React.FC<AppButtonProps> = ({
  tone = 'neutral',
  className,
  ...props
}) => {
  return (
    <Button {...props} className={getAppButtonClassName(tone, className)} />
  );
};

export default AppButton;
