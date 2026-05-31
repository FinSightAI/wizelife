#!/usr/bin/env node
const { run } = require('../shared-lib/mobile-30');
run({ name: 'WizeTravel', url: 'https://travel.wizelife.ai/', hamSelector: '.mobile-menu-toggle, .wl-tr-ham, #wize-ham-btn, [id*=ham]' });
