# Cleaner Schedule App

A Next.js application that displays a fair weekly rotation schedule for cleaners.

## Features

- **Fair Rotation Algorithm**: Rotates through all 7 team members, assigning 5 cleaners per week
- **Continuous Rotation**: Picks up where the previous week left off (starting after Mel)
- **Monthly View**: Shows all weeks in the current month
- **Current Week Highlight**: Clearly indicates which week is current
- **Month Navigation**: Browse through different months

## Team Members

- James
- Ken
- Mel
- Mark
- Jayp
- Gian
- JC

## How the Rotation Works

The algorithm ensures fairness by:
1. Starting from where we left off (after Mel was the last cleaner last week)
2. Assigning 5 consecutive cleaners from the list each week
3. Wrapping around when reaching the end of the list
4. Ensuring everyone gets equal opportunities over time

Since there are 7 people and 5 slots per week, the rotation completes every 7 weeks (35 slots / 5 per week = 7 weeks), ensuring each person gets exactly 5 cleaning duties in that cycle.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Build for Production

```bash
npm run build
npm start
```

## Technology Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- React
