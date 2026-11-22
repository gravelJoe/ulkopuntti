# scripts

## Overview

Command-line admin script for managing user accounts directly in MongoDB. There is no sign-up in the app, so accounts are created here.

## Interface

- `user.js`, run through `npm run user -- ...` from the repo root or `server/`:
  - `<username>`: creates the account, or sets a new password if it already exists. Asks for the password twice, with input hidden.
  - `--list`: prints every username, sorted.
  - `--delete <username>`: deletes the account.
  - `--rename <old> <new>`: renames the account. Password, workouts, and program stay the same.

## Invariants

- Usernames are trimmed (except with `--delete`) and lower-cased, then checked against `USERNAME_PATTERN` from `server/src/models/User.js` (3-20 letters, numbers, `.`, `_`, `-`). This applies to creating an account, resetting a password, and the new name in `--rename` (the old name is only trimmed and lower-cased).
- Passwords must be at least `MIN_PASSWORD` (8) characters, and both entries must match. They are stored only as a bcrypt hash (`passwordHash`, cost 10).
- `--rename` fails if the old account doesn't exist or the new name is already taken. Workouts and the program are linked to the account id, not the name, so they still belong to the renamed account.
- `--delete` only removes the `User` document. The user's workouts and program stay in the database. Deleting a name that doesn't exist prints `No account "..."` and exits 0.
- On a usage or validation error, or any thrown error (for example a MongoDB failure), the script prints the message and sets `process.exitCode = 1`.
- The script has no maximum password length, but changing the password in the app allows at most 200 characters. It always disconnects from MongoDB at the end.

## Side Effects

- Connects to MongoDB using `process.env.MONGODB_URI`, loaded from `server/.env` if that file exists.
- Reads from, creates, updates, and deletes documents in the `User` collection.
- Reads hidden input from stdin and writes to stdout and stderr.

## Verification

- No automated tests. Run: `npm run user -- --list` against a local MongoDB to check the script connects.
