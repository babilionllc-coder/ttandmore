#!/bin/bash
API_KEY="AIzaSyB_CszR-J3w34CWsTdjBhz-tFV8d3r06-o"

models=(
  "gemini-3-flash-preview"
  "gemini-3.1-pro-preview"
  "gemini-3-flash"
  "gemini-3.1-pro"
  "gemini-2.5-flash-preview-04-17"
)

for model in "${models[@]}"; do
  echo "Testing $model..."
  curl -s -o /dev/null -w "%{http_code}\n" -H 'Content-Type: application/json' -d '{"contents":[{"parts":[{"text":"hi"}]}]}' "https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}"
done
