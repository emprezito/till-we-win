import { motion } from "framer-motion";
import { Target, Shield, Rocket } from "lucide-react";

const sections = [
  {
    icon: Target,
    title: "THE MISSION",
    content:
      "We livestream every single Arsenal match — home, away, league, cup — until Arsenal lifts the English Premier League trophy. No breaks. No excuses. This isn't a sprint. It's a marathon of belief, commitment, and community. Every stream is a step closer to the promised land.",
  },
  {
    icon: Shield,
    title: "THE COMMITMENT",
    content:
      "The creator is fully committed to this mission. Every creator fee generated from the token is used for buybacks, ensuring long-term alignment with the community. When the community wins, we all win. There are no exit strategies — only the mission.",
  },
  {
    icon: Rocket,
    title: "THE VISION",
    content:
      "TIL WE WIN is more than a token — it's a movement. A community of Arsenal supporters and crypto believers united by one goal. We're building something that transcends the typical crypto project: a real mission, with a real end goal, and a real community rallying behind it.",
  },
];

const Mission = () => {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 space-y-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="font-display text-4xl font-black tracking-wider text-foreground sm:text-5xl">
          MISSION <span className="text-primary">DOSSIER</span>
        </h1>
        <p className="mt-3 font-mono text-sm text-muted-foreground">
          Everything you need to know about the mission
        </p>
      </motion.div>

      {sections.map((section, i) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 * (i + 1) }}
          className="rounded-xl border border-border bg-card p-6 sm:p-8"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <section.icon className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-display text-lg font-bold tracking-wider text-foreground">
              {section.title}
            </h2>
          </div>
          <p className="font-mono text-sm leading-relaxed text-muted-foreground">
            {section.content}
          </p>
        </motion.div>
      ))}
    </div>
  );
};

export default Mission;
