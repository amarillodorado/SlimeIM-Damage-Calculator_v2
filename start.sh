#!/usr/bin/env sh
# Starts the calculator and opens it in your browser (macOS / Linux): sh start.sh
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install the LTS version from https://nodejs.org/ and run this again."
  exit 1
fi

# Keeps packages in sync after an update; quick when nothing changed.
echo "Checking packages..."
if ! npm install --no-audit --no-fund --loglevel=error; then
  [ -d node_modules ] || { echo "Installing packages failed. Check your internet connection and try again."; exit 1; }
  echo "Could not update packages, starting with the installed ones."
fi

echo "Starting Slime IM Damage Calc - the browser tab opens in a moment. Press Ctrl+C to stop."
exec npm start
