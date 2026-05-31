#!/usr/bin/env node
const { run } = require('../shared-lib/mobile-30');
run({ name: 'WizeHealth', url: 'https://health.wizelife.ai/', hamSelector: '.wh-app-ham, .mobile-menu-toggle, #wize-ham-btn, [id*=ham]' });
