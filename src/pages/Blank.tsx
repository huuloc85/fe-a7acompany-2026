export default function Blank() {
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3 py-3 text-left sm:py-4">
        <h2
          className="ui-page-title !m-0 text-xl leading-snug font-semibold text-gray-800 uppercase sm:text-2xl dark:text-white/90"
          x-text="pageName"
        >
          Blank Page
        </h2>
      </div>
      <div className="ui-card liquid-glass-card rounded-2xl px-5 py-7 xl:px-10 xl:py-12">
        {/* start remove */}
        <div className="mx-auto w-full max-w-[630px] text-center">
          <h3 className="text-theme-xl mb-4 font-semibold text-gray-800 sm:text-2xl dark:text-white/90">
            Card Title Here
          </h3>

          <p className="text-sm text-gray-500 sm:text-base dark:text-gray-400">
            div Start putting content on grids or panels, you can also use
            different combinations of grids.Please check out the dashboard and
            other pages
          </p>
        </div>
        {/* end remove */}
      </div>
    </>
  );
}
