import { Link } from '@tanstack/react-router';
import AppButton from '@components/common/AppButton';

export default function NotFound() {
  return (
    <>
      <div className="error-page-shell relative z-1 flex min-h-screen flex-col items-center justify-center overflow-hidden p-6">
        <div className="error-page-card liquid-glass-card mx-auto w-full max-w-md rounded-2xl p-6 text-center sm:p-8">
          <h1 className="text-title-md xl:text-title-2xl mb-8 font-bold text-gray-800 uppercase dark:text-white/90">
            ERROR
          </h1>

          <img src="/images/error/404.svg" alt="404" className="dark:hidden" />
          <img
            src="/images/error/404-dark.svg"
            alt="404"
            className="hidden dark:block"
          />

          <p className="mt-10 mb-6 text-base text-gray-700 sm:text-lg dark:text-gray-400">
            We can’t seem to find the page you are looking for!
          </p>

          <Link to="/">
            <AppButton tone="primary" className="px-5">
              Back to Home Page
            </AppButton>
          </Link>
        </div>
      </div>
    </>
  );
}
