import { App as AntApp, ConfigProvider, Empty, theme } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { MotionConfig, useReducedMotion } from 'framer-motion';
import { useStore } from '@tanstack/react-store';
import { uiStore } from '@stores/uiStore';
import type { ReactNode } from 'react';

export default function AppProviders({ children }: { children: ReactNode }) {
  const mode = useStore(uiStore, (state) => state.theme);
  const appearance = useStore(uiStore, (state) => state.appearance);
  const reduceMotion = useReducedMotion();
  const dark = mode === 'dark';

  return (
    <ConfigProvider
      locale={viVN}
      popupOverflow="viewport"
      renderEmpty={() => (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Không có dữ liệu"
        />
      )}
      theme={{
        algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#2563eb',
          ...(!dark && {
            colorBgContainer: 'rgba(255, 255, 255, 0.72)',
            colorBorderSecondary: 'rgba(148, 163, 184, 0.22)',
            boxShadowSecondary: '0 14px 34px rgba(15, 23, 42, 0.08)'
          }),
          fontFamily: 'Outfit, system-ui, sans-serif',
          fontSize: 14,
          borderRadius: 12,
          borderRadiusLG: 16,
          controlHeight: 36,
          controlHeightSM: 32,
          controlHeightLG: 44,
          motion: !reduceMotion
        },
        components: {
          Table: {
            cellPaddingBlockSM: 10,
            cellPaddingInlineSM: 12,
            ...(!dark &&
              appearance === 'liquid' && {
                headerBg: '#eef7ff',
                headerColor: '#1f2937',
                borderColor: 'rgba(125, 169, 215, 0.26)',
                bodySortBg: '#f6fbff',
                footerBg: '#f6fbff',
                rowHoverBg: '#eef7ff',
                rowSelectedBg: '#e2f0ff',
                rowSelectedHoverBg: '#d9ebff',
                rowExpandedBg: '#f6fbff'
              })
          },
          Form: { itemMarginBottom: 20 },
          Button: { fontWeight: 500 },
          Tabs: { titleFontSize: 14 }
        }
      }}
    >
      <MotionConfig reducedMotion="user">
        <AntApp>{children}</AntApp>
      </MotionConfig>
    </ConfigProvider>
  );
}
