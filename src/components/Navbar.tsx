import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

const links = [
  { to: "/", label: "MISSION CONTROL" },
  { to: "/mission", label: "MISSION" },
  { to: "/live", label: "LIVE" },
  { to: "/rewatch", label: "REWATCH" },
  { to: "/community", label: "COMMUNITY" },
];

export function Navbar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="font-display text-lg font-black tracking-wider text-primary">
          TWW
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors",
                location.pathname === link.to
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="sm:hidden rounded-md p-2 text-muted-foreground hover:text-foreground"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="sm:hidden border-t border-border bg-background/95 backdrop-blur-xl px-4 pb-4 pt-2 space-y-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className={cn(
                "block rounded-md px-3 py-2.5 font-mono text-sm uppercase tracking-wider transition-colors",
                location.pathname === link.to
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
