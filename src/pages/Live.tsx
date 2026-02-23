import { useSiteConfig } from "@/hooks/useSiteConfig";
import { PrimaryLivestream } from "@/components/PrimaryLivestream";
import { TokenInfoCard } from "@/components/TokenInfoCard";
import { CountdownTimer } from "@/components/CountdownTimer";
import { MissionProgress } from "@/components/MissionProgress";

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
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <PrimaryLivestream />
          <MissionProgress config={config} />
        </div>
        <div className="space-y-6">
          <CountdownTimer targetDate={config.next_match_date} opponent={config.opponent} />
          <TokenInfoCard config={config} />
        </div>
      </div>
    </div>
  );
};

export default Live;
