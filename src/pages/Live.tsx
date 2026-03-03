import { useSiteConfig } from "@/hooks/useSiteConfig";
import { PrimaryLivestream } from "@/components/PrimaryLivestream";
import { TokenInfoCard } from "@/components/TokenInfoCard";
import { CountdownTimer } from "@/components/CountdownTimer";
import { MissionProgress } from "@/components/MissionProgress";
import { LiveChat } from "@/components/LiveChat";

const Live = () => {
  const { data: config, isLoading } = useSiteConfig();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4 py-6 sm:py-8 space-y-6">
      {/* Livestream + Chat side-by-side on desktop, stacked on mobile */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PrimaryLivestream />
        </div>
        <div className="lg:col-span-1">
          <LiveChat heightClass="h-[300px] sm:h-[400px] lg:h-[480px]" />
        </div>
      </div>

      {/* Countdown + Token Info */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <CountdownTimer targetDate={config.next_match_date} opponent={config.opponent} />
        </div>
        <TokenInfoCard config={config} />
      </div>

      <MissionProgress config={config} />
    </div>
  );
};

export default Live;
