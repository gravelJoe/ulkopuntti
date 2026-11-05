// Create an account, or set a new password for an existing one.
//
//   npm run user -- <username>      (asks for the password, hidden)
//   npm run user -- --list          (show all usernames)
//   npm run user -- --delete <username>

import readline from 'node:readline';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, USERNAME_PATTERN } from '../src/models/User.js';

const MIN_PASSWORD = 8;

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => {
      if (s.includes(question)) process.stdout.write(s);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function main() {
  const [first, second] = process.argv.slice(2);
  await mongoose.connect(process.env.MONGODB_URI);

  if (first === '--list') {
    const users = await User.find().sort({ username: 1 });
    console.log(users.length ? users.map((u) => `  ${u.username}`).join('\n') : '  (no accounts)');
    return;
  }

  if (first === '--delete') {
    const username = String(second ?? '').toLowerCase();
    const { deletedCount } = await User.deleteOne({ username });
    console.log(deletedCount ? `Deleted ${username} (their workouts are kept in the database).` : `No account "${username}".`);
    return;
  }

  const username = String(first ?? '').trim().toLowerCase();
  if (!USERNAME_PATTERN.test(username)) {
    console.error('Usage: npm run user -- <username>   (3–20 characters: letters, numbers, . _ -)');
    process.exitCode = 1;
    return;
  }

  const existing = await User.findOne({ username });
  const password = await askHidden(existing ? `New password for ${username}: ` : `Password for new account ${username}: `);
  if (password.length < MIN_PASSWORD) {
    console.error(`Password must be at least ${MIN_PASSWORD} characters.`);
    process.exitCode = 1;
    return;
  }
  if ((await askHidden('Repeat password: ')) !== password) {
    console.error("Passwords don't match.");
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  if (existing) {
    existing.passwordHash = passwordHash;
    await existing.save();
    console.log(`Updated password for ${username}.`);
  } else {
    await User.create({ username, passwordHash });
    console.log(`Created account ${username}.`);
  }
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
