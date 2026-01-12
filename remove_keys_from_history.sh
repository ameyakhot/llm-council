#!/bin/bash

# Script to remove keys/ folder from git history

set -e

cd /Users/maverick/llm_council/llm-council

echo "Step 1: Committing .gitignore changes..."
git add .gitignore
git commit -m "Add keys/ to .gitignore" || echo "Already committed or no changes"

echo "Step 2: Removing keys/ from all git history..."
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch --force --index-filter \
  "git rm -r --cached --ignore-unmatch keys/" \
  --prune-empty --tag-name-filter cat -- --all

echo "Step 3: Cleaning up backup refs..."
rm -rf .git/refs/original/

echo "Step 4: Cleaning up reflog and garbage collection..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo "Step 5: Verifying keys/ is removed from history..."
if git log --oneline --all -- keys/ | grep -q .; then
    echo "WARNING: keys/ still found in history!"
    git log --oneline --all -- keys/
else
    echo "SUCCESS: keys/ removed from all history"
fi

echo "Step 6: Current git status..."
git status

echo ""
echo "Step 7: Ready to force push. Run this command manually:"
echo "  git push origin --force --all"
echo ""
echo "WARNING: Force push will rewrite history on GitHub!"
echo "Make sure you want to do this before running the push command."

