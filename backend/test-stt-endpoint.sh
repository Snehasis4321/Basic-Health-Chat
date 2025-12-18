#!/bin/bash

# Test script for STT transcription endpoint
# Usage: ./test-stt-endpoint.sh [audio-file-path]

BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
AUDIO_FILE="${1:-test-audio.webm}"

echo "Testing STT Transcription Endpoint"
echo "===================================="
echo "Backend URL: $BACKEND_URL"
echo "Audio File: $AUDIO_FILE"
echo ""

# Check if audio file exists
if [ ! -f "$AUDIO_FILE" ]; then
    echo "Error: Audio file '$AUDIO_FILE' not found"
    echo "Please provide a valid audio file path as the first argument"
    exit 1
fi

# Test 1: Transcribe audio without language
echo "Test 1: Transcribe audio (auto-detect language)"
echo "------------------------------------------------"
curl -X POST "$BACKEND_URL/api/stt/transcribe" \
  -F "audio=@$AUDIO_FILE" \
  -w "\nHTTP Status: %{http_code}\n" \
  | jq '.' 2>/dev/null || cat
echo ""
echo ""

# Test 2: Transcribe audio with language specified
echo "Test 2: Transcribe audio (English)"
echo "-----------------------------------"
curl -X POST "$BACKEND_URL/api/stt/transcribe" \
  -F "audio=@$AUDIO_FILE" \
  -F "language=en" \
  -w "\nHTTP Status: %{http_code}\n" \
  | jq '.' 2>/dev/null || cat
echo ""
echo ""

# Test 3: Test without audio file (should fail)
echo "Test 3: Request without audio file (should fail with 400)"
echo "----------------------------------------------------------"
curl -X POST "$BACKEND_URL/api/stt/transcribe" \
  -w "\nHTTP Status: %{http_code}\n" \
  | jq '.' 2>/dev/null || cat
echo ""
echo ""

echo "Tests completed!"
