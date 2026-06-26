type LaunchScreenProps = {
  stage: 'boot' | 'ready';
};

export default function LaunchScreen({ stage }: LaunchScreenProps) {
  return (
    <div className="launch-screen fixed inset-0 z-[100] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(217,119,6,0.18),_transparent_36%),radial-gradient(circle_at_bottom_right,_rgba(13,148,136,0.16),_transparent_34%),linear-gradient(135deg,_#0F172A_0%,_#111827_40%,_#1A1A2E_100%)]" />
      <div className="absolute -left-16 top-12 h-40 w-40 rounded-full bg-[#D97706]/10 blur-3xl" />
      <div className="absolute bottom-10 right-0 h-56 w-56 rounded-full bg-[#0D9488]/10 blur-3xl" />

      <div className="relative flex h-full flex-col items-center justify-center px-6 text-white">
        <div className="flex flex-col items-center">
          <div className="launch-logo mb-6 flex h-20 w-20 items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,_#D97706,_#0D9488)] shadow-[0_20px_60px_rgba(217,119,6,0.28)]">
            <span className="text-3xl font-black tracking-[0.12em]">聚</span>
          </div>

          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.5em] text-white/45">JULONG TOOLKIT</p>
            <h1 className="mt-3 text-3xl font-black tracking-[0.18em]">聚隆科技</h1>
            <p className="mt-3 text-sm text-white/70">产品牌号解析 · 报价记录 · 出行与物流</p>
          </div>
        </div>

        <div className="mt-10 w-full max-w-[260px]">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className={`launch-progress h-full rounded-full bg-[linear-gradient(90deg,_#D97706,_#0D9488)] ${stage === 'ready' ? 'launch-progress-ready' : ''}`} />
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] tracking-[0.18em] text-white/45">
            <span>{stage === 'ready' ? 'READY' : 'LOADING'}</span>
            <span>v1.1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
