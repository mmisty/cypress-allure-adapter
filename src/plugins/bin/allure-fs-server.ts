#!/usr/bin/env node

/**
 * CLI entry point for the standalone Allure FS server
 *
 * Usage:
 *   npx allure-fs-server [--port <port>]
 *
 * This server runs as a separate process to handle filesystem operations
 * for Allure reporting without blocking the main Cypress process.
 */

import { runStandaloneServer } from '../fs-server-standalone';

runStandaloneServer();
