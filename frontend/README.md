# Jira Dashboard Frontend

A Next.js 14+ application for visualizing Jira tickets and analytics.

## Tech Stack

- **Next.js 16.1.1** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS 4** - Utility-first CSS framework
- **ESLint** - Code linting and quality

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

Install dependencies:

```bash
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

Create a production build:

```bash
npm run build
```

### Production

Run the production server:

```bash
npm start
```

### Linting

Run ESLint:

```bash
npm run lint
```

## Project Structure

```
frontend/
├── app/                    # Next.js App Router directory
│   ├── layout.tsx         # Root layout component
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── public/                # Static assets
├── next.config.ts         # Next.js configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies and scripts
```

## Development Notes

- Uses App Router (not Pages Router)
- TypeScript strict mode enabled
- Path aliases configured (@/*)
