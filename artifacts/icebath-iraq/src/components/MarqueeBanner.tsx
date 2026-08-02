export default function MarqueeBanner() {
  const text = '🧊  توصيل مجاني لجميع أنحاء العراق  •  Free Shipping Across All Iraq  🧊  ';

  return (
    <div className="bg-cyan-400 text-[#0d1b36] py-1.5 overflow-hidden select-none">
      {/* Two copies — animation slides from -50% to 0 for a right-moving ticker */}
      <div
        className="flex whitespace-nowrap"
        style={{
          animation: 'marquee-right 22s linear infinite',
          width: 'max-content',
        }}
      >
        <span className="text-sm font-bold px-2">{text}</span>
        <span className="text-sm font-bold px-2">{text}</span>
      </div>
    </div>
  );
}
