#!/usr/bin/env node

import { bootstrapCli } from './bootstrap.js';

process.exitCode = await bootstrapCli(process.argv.slice(2));
