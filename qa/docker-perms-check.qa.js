#!/usr/bin/env node
// regression test — added 2026-05-25
// Bug: Cloud Run deploy failed (EACCES) because iCloud sync set file perms to
//      600, and Dockerfiles lacked USER + chmod/chown pairing.
// Fix: Any Dockerfile with a non-root USER directive must also have either
//      COPY --chown=user:group or RUN chmod -R a+rX before files are used.
// Usage: node qa/docker-perms-check.qa.js

'use strict';
const fs   = require('fs');
const path = require('path');

const BASE = '/Users/s/Desktop/Desktop - O’s MacBook Air';

const DOCKERFILE_PATHS = [
  path.join(BASE, 'RAMBAM', 'Dockerfile'),
  path.join(BASE, 'tax master', 'backend', 'Dockerfile'),
  path.join(BASE, 'wizetravel', 'Dockerfile'),
  path.join(BASE, 'wizetravel-app', 'Dockerfile'),
  path.join(BASE, 'Check Deal', 'Dockerfile'),
];

function pass(name, detail) { console.log('PASS  ' + name + (detail ? ' — ' + detail : '')); return true; }
function fail(name, detail) { console.log('FAIL  ' + name + (detail ? ' — ' + detail : '')); return false; }
function skip(name, detail) { console.log('SKIP  ' + name + (detail ? ' — ' + detail : '')); return true; }

function checkDockerfile(filePath) {
  const shortName = filePath.replace(BASE + '/', '');
  if (!fs.existsSync(filePath)) {
    return skip(shortName, 'Dockerfile not found');
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const userLines = lines
    .map((l, i) => ({ line: l.trim(), idx: i }))
    .filter(function(obj) { return /^USER\s+(?!root)/i.test(obj.line); });

  if (!userLines.length) {
    return pass(shortName, 'No non-root USER directive — no permission risk');
  }

  const issues = [];
  for (const obj of userLines) {
    const userName = obj.line.replace(/^USER\s+/i, '').trim();
    const copyLines = lines.slice(0, obj.idx).filter(l => /^COPY\s/i.test(l.trim()));
    const allCopyHaveChown = copyLines.every(l => /--chown=/i.test(l));
    const hasChmod = lines.some(l => /RUN\s+.*chmod\s+-R\s+[ao]\+[rRxX]/i.test(l.trim()));
    if (copyLines.length > 0 && !allCopyHaveChown && !hasChmod) {
      issues.push('USER ' + userName + ' (line ' + (obj.idx + 1) + ') has COPY without --chown and no chmod -R a+rX');
    }
  }

  if (issues.length) {
    return fail(shortName, issues.join(' | '));
  }
  return pass(shortName, 'USER directive(s) properly paired with --chown or chmod');
}

(() => {
  console.log('=== docker-perms-check: USER directives must pair with --chown or chmod ===\n');
  const results = DOCKERFILE_PATHS.map(checkDockerfile);
  const failed = results.filter(r => !r).length;
  console.log('\n' + (results.length - failed) + '/' + results.length + ' checked (SKIP = no Dockerfile)');
  process.exit(failed > 0 ? 1 : 0);
})();