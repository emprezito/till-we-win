import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Check session on mount
  useState(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setIsLoggedIn(true);
    });
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      setIsLoggedIn(true);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="font-display text-center text-xl tracking-wider">
              ADMIN LOGIN
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <AdminDashboard onLogout={handleLogout} />;
}

// --- Admin Dashboard ---

import { useEffect } from "react";
import { useSiteConfig, type SiteConfig } from "@/hooks/useSiteConfig";
import { useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSlides } from "@/hooks/useSlides";
import { Trash2, Plus, GripVertical } from "lucide-react";
import ApiUsageStats from "@/components/ApiUsageStats";
function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const { data: config, isLoading } = useSiteConfig();
  const { data: slides } = useSlides();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (isLoading || !config) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-black tracking-wider text-primary">
          ADMIN DASHBOARD
        </h1>
        <Button variant="outline" size="sm" onClick={onLogout}>
          Logout
        </Button>
      </div>

      <ConfigSection config={config} queryClient={queryClient} toast={toast} />
      <ApiUsageStats />
      <SlidesSection slides={slides || []} queryClient={queryClient} toast={toast} />
    </div>
  );
}

// --- Config Section ---

function ConfigSection({
  config,
  queryClient,
  toast,
}: {
  config: SiteConfig;
  queryClient: ReturnType<typeof useQueryClient>;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [form, setForm] = useState({ ...config });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ ...config });
  }, [config]);

  const update = (key: string, value: any) =>
    setForm((prev: any) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("site_config")
      .update({
        token_name: form.token_name,
        ticker: form.ticker,
        contract_address: form.contract_address,
        pumpfun_link: form.pumpfun_link,
        livestream_url: form.livestream_url,
        is_live: form.is_live,
        next_match_date: form.next_match_date || null,
        opponent: form.opponent,
        streams_completed: form.streams_completed,
        matches_streamed: form.matches_streamed,
        epl_status: form.epl_status,
        market_cap: form.market_cap,
        holder_count: form.holder_count,
        twitter_link: form.twitter_link,
        discord_link: form.discord_link,
        enable_auto_stream: form.enable_auto_stream,
        manual_override_stream_url: form.manual_override_stream_url,
      })
      .eq("id", config.id);

    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Settings saved" });
      queryClient.invalidateQueries({ queryKey: ["site_config"] });
    }
  };

  const fetchFixtures = async () => {
    try {
      const res = await supabase.functions.invoke("fetch-arsenal-fixtures");
      if (res.data?.nextMatch) {
        toast({ title: "Fixtures updated", description: `Next: vs ${res.data.nextMatch.opponent}` });
        queryClient.invalidateQueries({ queryKey: ["site_config"] });
      } else {
        toast({ title: "No fixtures found", description: "Set manually below." });
      }
    } catch {
      toast({ title: "Failed to fetch fixtures", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Token Settings */}
      <Card>
        <CardHeader><CardTitle className="font-mono text-sm uppercase tracking-widest">Token Settings</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Token Name" value={form.token_name} onChange={(v) => update("token_name", v)} />
          <Field label="Ticker" value={form.ticker} onChange={(v) => update("ticker", v)} />
          <Field label="Contract Address" value={form.contract_address} onChange={(v) => update("contract_address", v)} className="sm:col-span-2" />
          <Field label="Pump.fun Link" value={form.pumpfun_link} onChange={(v) => update("pumpfun_link", v)} className="sm:col-span-2" />
          <Field label="Market Cap" value={form.market_cap} onChange={(v) => update("market_cap", v)} />
          <Field label="Holder Count" value={form.holder_count} onChange={(v) => update("holder_count", v)} />
        </CardContent>
      </Card>

      {/* Livestream Settings */}
      <Card>
        <CardHeader><CardTitle className="font-mono text-sm uppercase tracking-widest">Livestream Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={form.enable_auto_stream} onCheckedChange={(v) => update("enable_auto_stream", v)} />
            <span className="font-mono text-sm text-muted-foreground">Auto-detect Arsenal streams (RapidAPI)</span>
          </div>
          <Field label="Manual Override Stream URL (overrides auto-detection)" value={form.manual_override_stream_url} onChange={(v) => update("manual_override_stream_url", v)} />
          <Field label="Legacy YouTube Embed URL" value={form.livestream_url} onChange={(v) => update("livestream_url", v)} />
          <div className="flex items-center gap-3">
            <Switch checked={form.is_live} onCheckedChange={(v) => update("is_live", v)} />
            <span className="font-mono text-sm text-muted-foreground">Stream is LIVE (manual override)</span>
          </div>
        </CardContent>
      </Card>

      {/* Match Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-mono text-sm uppercase tracking-widest">Match Settings</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchFixtures}>
              Auto-Fetch Fixtures
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Next Match Date" value={form.next_match_date || ""} onChange={(v) => update("next_match_date", v)} type="datetime-local" />
          <Field label="Opponent" value={form.opponent} onChange={(v) => update("opponent", v)} />
        </CardContent>
      </Card>

      {/* Mission Progress */}
      <Card>
        <CardHeader><CardTitle className="font-mono text-sm uppercase tracking-widest">Mission Progress</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Streams Completed" value={String(form.streams_completed)} onChange={(v) => update("streams_completed", parseInt(v) || 0)} type="number" />
          <Field label="Matches Streamed" value={String(form.matches_streamed)} onChange={(v) => update("matches_streamed", parseInt(v) || 0)} type="number" />
          <Field label="EPL Status" value={form.epl_status} onChange={(v) => update("epl_status", v)} />
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card>
        <CardHeader><CardTitle className="font-mono text-sm uppercase tracking-widest">Social Links</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Twitter/X Link" value={form.twitter_link} onChange={(v) => update("twitter_link", v)} />
          <Field label="Discord Link" value={form.discord_link} onChange={(v) => update("discord_link", v)} />
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Saving..." : "Save All Settings"}
      </Button>
    </div>
  );
}

// --- Slides Section ---

function SlidesSection({
  slides,
  queryClient,
  toast,
}: {
  slides: any[];
  queryClient: ReturnType<typeof useQueryClient>;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [localSlides, setLocalSlides] = useState(slides);

  useEffect(() => {
    setLocalSlides(slides);
  }, [slides]);

  const addSlide = async () => {
    const order = localSlides.length;
    const { error } = await supabase
      .from("slides")
      .insert({ title: "New Slide", content: "", slide_order: order });
    if (error) {
      toast({ title: "Failed to add slide", variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["slides"] });
    }
  };

  const updateSlide = async (id: string, field: string, value: string) => {
    await supabase.from("slides").update({ [field]: value }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["slides"] });
  };

  const deleteSlide = async (id: string) => {
    await supabase.from("slides").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["slides"] });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-mono text-sm uppercase tracking-widest">Slides Manager</CardTitle>
          <Button variant="outline" size="sm" onClick={addSlide}>
            <Plus className="mr-1 h-4 w-4" /> Add Slide
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {localSlides.length === 0 && (
          <p className="text-center font-mono text-sm text-muted-foreground">No slides yet</p>
        )}
        {localSlides.map((slide) => (
          <div key={slide.id} className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <Input
                defaultValue={slide.title}
                onBlur={(e) => updateSlide(slide.id, "title", e.target.value)}
                className="flex-1"
                placeholder="Slide title"
              />
              <Button variant="ghost" size="icon" onClick={() => deleteSlide(slide.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <Textarea
              defaultValue={slide.content}
              onBlur={(e) => updateSlide(slide.id, "content", e.target.value)}
              placeholder="Slide content"
              rows={3}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// --- Field Component ---

function Field({
  label,
  value,
  onChange,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
