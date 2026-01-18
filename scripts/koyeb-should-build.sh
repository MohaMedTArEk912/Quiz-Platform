#!/bin/bash
# Koyeb build skip script
# Exit 0 = build, Exit 1 = skip

# Get the list of changed files
CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || echo "")

# If no changes detected (first build), always build
if [ -z "$CHANGED_FILES" ]; then
  echo "First build or no git history - building..."
  exit 0
fi

# Check if any server files changed
SERVER_CHANGES=$(echo "$CHANGED_FILES" | grep -E "^server/|^package\.json|^package-lock\.json" || true)

if [ -n "$SERVER_CHANGES" ]; then
  echo "Backend changes detected - building..."
  echo "$SERVER_CHANGES"
  exit 0
else
  echo "Only frontend changes - skipping build..."
  exit 1
fi
