#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) {
      continue;
    }
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${key}`);
    }
    args[key.slice(2)] = value;
    i += 1;
  }
  return args;
}

function deriveDomain(url) {
  const parsed = new URL(url);
  const hostname = parsed.hostname.replace(/^www\./, '');
  const path = parsed.pathname.replace(/\/+$/, '');
  const firstPathSegment = path.split('/').filter(Boolean)[0];
  return firstPathSegment ? `${hostname}/${firstPathSegment}` : hostname;
}

function runGitCommand(command, args, label) {
  try {
    execFileSync(command, args, { stdio: 'inherit' });
  } catch (error) {
    const prefix = error.message ? `\n${error.message}` : '';
    throw new Error(`Command failed: ${label}${prefix}`);
  }
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const groupId = args.group;
    const name = args.name;
    const url = args.url;
    const description = args.description;

    if (!groupId || !name || !url || !description) {
      throw new Error(
        'Usage: node scripts/add-bookmark.js --group <group-id> --name <name> --url <url> --description <desc>',
      );
    }

    const dataPath = path.resolve(__dirname, '../src/_data/bookmarks.json');
    const bookmarks = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const targetGroup = bookmarks.find((group) => group.id === groupId);

    if (!targetGroup) {
      throw new Error(`Group not found: ${groupId}`);
    }

    const domain = deriveDomain(url);
    targetGroup.items.push({
      name,
      url,
      domain,
      description,
    });

    fs.writeFileSync(dataPath, `${JSON.stringify(bookmarks, null, 2)}\n`);

    runGitCommand('git', ['add', 'src/_data/bookmarks.json'], 'git add src/_data/bookmarks.json');
    runGitCommand('git', ['commit', '-m', `bookmark: add ${name}`], `git commit -m "bookmark: add ${name}"`);
    runGitCommand('git', ['push', 'origin', 'main'], 'git push origin main');

    return 0;
  } catch (error) {
    console.error(error.message);
    return 1;
  }
}

process.exit(main());
