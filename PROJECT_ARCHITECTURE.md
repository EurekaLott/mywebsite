# EurekaLott — Project Architecture

> "Every file has one responsibility."

---

# Project Philosophy

This project follows a modular architecture.

Each file has ONE clear responsibility.

Do not mix unrelated logic into the same file.

When adding new features, extend the proper module instead of rewriting the whole project.

---

## index.html

Purpose

Homepage.

Responsibilities

- Load website layout.
- Load CSS.
- Load JavaScript modules.
- Navigation.
- Language switch.
- Create containers for banner and forecast.

Never put prediction logic here.

---

## powerball.html

Purpose

Powerball Forecast page.

Responsibilities

- Display current forecast.
- Display latest draw.
- Display archive link.
- Load forecast-data.js.

Never calculate prediction here.

---

## bruce-banner.js

Purpose

Animated universe banner.

Timeline

1. Halley Comet
2. Black Hole falls
3. Neptune falls
4. Black Hole absorbs Neptune
5. Jupiter approaches
6. Black Hole absorbs Jupiter
7. Black Hole expands
8. Big Bang
9. Empty universe
10. Purple Planet enters
11. Bruce Lee walks
12. Bruce Lee meets Purple Planet
13. Purple Planet emits AI Signal
14. Prediction appears
15. Reset banner

This file only controls animation.

Never store forecast data here.

---

## forecast-data.js

Purpose

Forecast database.

Responsibilities

Store only

- AI Signals
- Prediction
- Draw Date

No animation.

No verification.

No archive.

---

## forecast-compiler.js

Purpose

Compile prediction data.

Responsibilities

- Read forecast-data.js
- Prepare data for website
- Format prediction

Never draw UI here.

---

## fetch-draws.js

Purpose

Download latest draw.

Responsibilities

- Fetch official results
- Save into draws-data.js

---

## draws-data.js

Purpose

Official draw database.

Contains only draw results.

---

## verify.js

Purpose

Verification engine.

Responsibilities

Compare

Forecast

VS

Official Draw

Output

Verified Result

---

## verified-data.js

Purpose

Store verification history.

Contains only verified results.

---

## archive.js

Purpose

Archive manager.

Move old forecasts into archive.

---

## archive-data.js

Purpose

Archive database.

Contains old forecasts only.

---

## draw-schedule.js

Purpose

Draw schedule.

Contains

- Draw days
- Draw times

---

## community.html

Purpose

Community page.

No prediction logic.

No verification logic.

---

# Development Rules

✓ One file = One responsibility

✓ Never duplicate variables.

✓ Never duplicate functions.

✓ Never move unrelated logic.

✓ Banner must never modify forecast data.

✓ Forecast must never modify banner.

✓ Verification must never modify forecast.

✓ Archive must never modify verification.

---

# EurekaLott Core Principle

Simple.

Independent.

Easy to debug.

Easy to maintain.

Easy to expand.
