import { Outlet } from '@tanstack/react-router';

interface PageLayoutProps {
  title: string;
}

export const PageLayout = ({ title }: PageLayoutProps) => (
  <div className="ui-page">
    <header className="ui-page-header mb-4 flex flex-wrap items-center gap-3 py-2 text-left">
      <h1 className="ui-page-title !m-0 text-[22px] leading-snug font-semibold text-gray-800 uppercase sm:text-[28px] dark:text-white/90">
        {title}
      </h1>
    </header>
    <Outlet />
  </div>
);
