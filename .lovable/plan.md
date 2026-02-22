

# TIL WE WIN — Mission Control Website

## Overview
A dark-themed, futuristic "mission control" dashboard for a crypto project tied to livestreaming every Arsenal match until they win the EPL. Built with React + Vite + TailwindCSS + Supabase backend.

---

## Design System
- **Theme**: Dark mode with black/dark gradient backgrounds
- **Primary**: Arsenal red (#EF0107)
- **Accents**: White, subtle grays
- **Aesthetic**: Futuristic mission control / crypto dashboard
- **Typography**: Clean, bold headings with monospace accents for data
- **Animations**: Smooth fade-ins, pulsing live indicator, countdown ticker

---

## Pages

### 1. Home Page (/)
The mission control dashboard with these sections:

- **Hero**: Large "TIL WE WIN" title, mission subtitle, token ticker display, Pump.fun CTA button, animated LIVE/OFFLINE indicator
- **Countdown Timer**: Real-time countdown to next Arsenal match with opponent name (auto-fetched from football API)
- **Token Info Card**: Token name, ticker, contract address with copy button, Pump.fun link, market cap, holder count
- **Livestream Embed**: YouTube Live iframe with status indicator
- **Mission Progress**: Streams completed, matches streamed, mission start date, EPL status tracker
- **Slides Viewer**: Fullscreen mission briefing slideshow (keyboard nav, auto-loop, smooth transitions)
- **Social Links**: X, Pump.fun, Discord icons
- **Footer**: Mission statement + disclaimer

### 2. Mission Page (/mission)
- Mission overview and creator commitment story
- Creator fee buyback explanation
- Long-term vision section

### 3. Livestream Page (/live)
- Large YouTube embed
- Token info sidebar
- Countdown timer
- Mission progress stats

### 4. Admin Dashboard (/admin)
Password-protected (Supabase auth) with sections to manage:
- **Token Settings**: Name, ticker, contract address, Pump.fun link
- **Match Settings**: Auto-fetched but overridable next match date/opponent
- **Mission Progress**: Streams completed, matches streamed, EPL status
- **Slides Manager**: Add/edit/delete/reorder mission briefing slides
- **Livestream Settings**: YouTube embed URL, live status toggle
- **Social Links**: Update all social links

---

## Fullscreen Slides System
- Mission briefing aesthetic (dark background, red accents, monospace text)
- Keyboard navigation (arrow keys, Escape to exit)
- Auto-loop with configurable interval
- Smooth transitions between slides
- Admin-editable title + content per slide
- Scaled at 1920×1080 resolution

---

## Backend (Supabase)
- **Tables**: `site_config` (single-row settings), `slides` (title, content, order), `user_roles` (admin auth)
- **Edge Function**: Proxy to a free football API to fetch Arsenal's next fixture
- **Auth**: Supabase authentication for admin access with role-based protection
- **RLS**: Admin-only write access, public read access

---

## Key Components
- Countdown Timer (real-time, auto-updating)
- Live Status Indicator (pulsing red dot animation)
- Token Info Card (with copy contract address)
- YouTube Livestream Embed
- Mission Progress Tracker
- Fullscreen Slides Viewer
- Admin Forms (all settings management)

---

## Responsive Design
- Mobile-first layout
- All sections stack cleanly on mobile
- Livestream page adapts sidebar to stacked layout
- Slides scale properly on all screen sizes

