# Puntti

Mobile-first workout log for the outdoor gym. React + Vite frontend, Express + MongoDB backend, username/password login (JWT). Guests can use the app without saving.

## Run locally

Requires Node 22+ and MongoDB (`brew install mongodb/brew/mongodb-community && brew services start mongodb/brew/mongodb-community`).

```sh
npm install && npm install --prefix server
cp server/.env.example server/.env      # then set a long random JWT_SECRET

npm run server     # API on 127.0.0.1:4000
npm run dev        # app on https://<your-mac-ip>:5173 (open on your phone, same Wi-Fi)
```

`npm run dev:http` serves without HTTPS (no screen wake lock).

## Accounts

There is no sign-up in the app. Create accounts from the command line:

```sh
npm run user -- <username>            # create, or set a new password
npm run user -- --list
npm run user -- --delete <username>
```

Against the production database: `MONGODB_URI="mongodb+srv://…" npm run user -- <username>`.

## Deploy (Render + MongoDB Atlas)

1. MongoDB Atlas: create a free cluster, a database user, allow network access from anywhere (`0.0.0.0/0`), and copy the connection string (add `/puntti` before the `?`).
2. Render: **New → Blueprint**, pick this repo. `render.yaml` sets everything up; paste the Atlas string as `MONGODB_URI`.
3. Create the accounts against the Atlas database (see above).

In production the Express server also serves the built app from `dist/`.

## Where things are

| | |
|---|---|
| `src/config/workouts.js` | Workouts, sets, rest time, weight step |
| `src/data/repository.js` | The only data access the UI uses |
| `src/data/adapters/` | `api` (logged in) and `guest` (saves nothing) |
| `src/data/auth.js` | Login state |
| `server/src/` | Express app, models, routes |
| `server/scripts/user.js` | Account management |
