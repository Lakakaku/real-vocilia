#!/bin/bash
# Run before commits to ensure code quality
npm run lint
npm run typecheck
npm run test:unit