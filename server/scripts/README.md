# Gemini API Testing Scripts

This directory contains scripts for testing and managing the Gemini API integration.

## Quick Commands

### Check API Status (Minimal Quota Usage)
```bash
node server/scripts/check-gemini-status.js
```
**Use this first!** Quick check without consuming much quota.

### Discover Available Models
```bash
node server/scripts/discover-gemini-models.js
```
Tests 20+ model names to find which are accessible.

### Test with Retry Logic
```bash
node server/scripts/test-with-retry.js
```
Full test of retry logic and rate limit handling.

### Simple Test
```bash
node server/scripts/test-gemini-simple.js
```
Basic connectivity test with multiple model formats.

### Comprehensive Test
```bash
node server/scripts/test-gemini-comprehensive.js
```
Tests various models and provides detailed results.

## Current Status

**Working Models:**
- `gemini-2.0-flash-exp` (Primary)
- `gemini-exp-1206` (Fallback)

**Current Issue:**
- ⏱️ Rate limit exceeded (free tier quota)
- Wait 5-10 minutes and try again
- Or enable billing for higher limits

## Scripts Overview

| Script | Purpose | Quota Usage |
|--------|---------|-------------|
| `check-gemini-status.js` | Quick status check | Minimal |
| `discover-gemini-models.js` | Find working models | Low |
| `test-with-retry.js` | Test retry logic | Medium |
| `test-gemini-simple.js` | Basic connectivity | Low |
| `test-gemini-comprehensive.js` | Full test suite | Medium |

## Interpreting Results

### ✅ Success
```
✅ WORKING - gemini-2.0-flash-exp
Response: Hello from Gemini!
```
API is operational and ready to use.

### ⏱️ Rate Limited
```
⏱️ RATE LIMITED - gemini-2.0-flash-exp
The model exists but quota is exceeded
```
API works but quota exhausted. Wait and try again.

### ❌ Not Found
```
❌ NOT FOUND - gemini-1.5-flash
```
Model doesn't exist or isn't available to your API key.

### ❌ Auth Error
```
❌ AUTH ERROR
Check your API key validity
```
API key is invalid or missing permissions.

## Troubleshooting

### "Rate limit exceeded"
1. Wait 5-10 minutes
2. Check usage: https://ai.dev/usage?tab=rate-limit
3. Enable billing for higher limits

### "API key missing"
1. Check `.env` file in project root
2. Ensure `GEMINI_API_KEY=your-key-here` is set
3. Restart your application

### "Model not found"
1. Run `discover-gemini-models.js` to find working models
2. Models may have changed - check documentation
3. Your API key may not have access to certain models

## Configuration

The controllers automatically use:
- **Exponential backoff** for rate limits
- **3 retries** per model before switching
- **2 working models** as fallback chain

See [GEMINI_API_TEST_RESULTS.md](../docs/GEMINI_API_TEST_RESULTS.md) for details.

## Resources

- [Gemini API Docs](https://ai.google.dev/docs)
- [Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Usage Dashboard](https://ai.dev/usage?tab=rate-limit)
- [Google AI Studio](https://aistudio.google.com/)
