#!/usr/bin/env node
import { tsImport } from 'tsx/esm/api';

// Resolve code from this checkout while preserving the caller's working directory.
// The caller's unrelated tsconfig must not change how trusted CLI code executes.
await tsImport('../src/index.ts', { parentURL: import.meta.url, tsconfig: false });
