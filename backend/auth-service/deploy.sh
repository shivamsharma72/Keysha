#!/bin/bash
# Deploy script that loads .env file before running serverless

set -e  # Exit on error

# Load .env file (handles values with spaces and special characters)
if [ -f .env ]; then
  set -a  # Automatically export all variables
  # Use a while loop to read .env file line by line
  while IFS= read -r line || [ -n "$line" ]; do
    # Trim leading/trailing whitespace
    line=$(echo "$line" | xargs)
    # Skip comments and empty lines
    [[ "$line" =~ ^# ]] && continue
    [[ -z "$line" ]] && continue
    # Export the variable
    export "$line"
  done < .env
  set +a
fi

# Run serverless with all arguments passed to this script
serverless "$@"
