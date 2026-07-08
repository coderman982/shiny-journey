# Clean Architecture Example

Express.js REST API with Supabase following clean architecture principles.

## Prerequisites

- Node.js 18+
- A Supabase project

## Setup

```bash
npm install
cp .env.example .env  # add your Supabase credentials
```

Create the database table using `sql/setup.sql`.

## Run

```bash
npm run dev
```

## Deploy

Push to GitHub and import into [Vercel](https://vercel.com). Set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` as environment variables.
