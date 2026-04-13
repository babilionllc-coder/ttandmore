#!/bin/bash
API_KEY="AIzaSyCBzuVIw3j1qHH8WRNxdzJ2FUvxd-VCMw0"

models=(
  "gemini-2.5-flash"
  "gemini-2.0-flash"
  "gemini-2.0-flash-exp"
  "gemini-1.5-pro"
  "gemini-1.5-flash"
)

for model in "${models[@]}"; do
  echo "Testing $model..."
  curl -s -o /dev/null -w "%{http_code}\n" -H 'Content-Type: application/json' -d '{"contents":[{"parts":[{"text":"hi"}]}]}' "https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}"
done
