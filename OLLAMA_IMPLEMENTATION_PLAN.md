# Plan: Add Local Ollama as User Option

## Overview

Ollama support is partially baked in already, but you need to make some key changes to support browser-direct connections. To let free-tier users run local Ollama directly from their browser, you'll need to:

1. Add a theme-level toggle for "Use local Ollama"
2. Move generation logic to the client when Ollama is selected
3. Handle CORS for localhost:11434
4. Gracefully handle when Ollama is unavailable
5. Eventually tier cloud LLMs as premium-only

This is feasible but requires frontend/architecture changes.

## Implementation Steps

### 1. Add Ollama preference to database

- Create migration to add `preferred_provider` column to `themes` table (values: `'cloud'` | `'ollama'`)
- Stores user's choice per theme

### 2. Create client-side generation hook

- New hook `src/hooks/use-ollama-generation.ts` that calls `localhost:11434/api/generate` directly
- Includes retry logic, error handling, timeout (reuse `src/lib/llm/chunking-orchestrator.ts` retry pattern)
- Returns same card format as server generation

### 3. Update study/generation UI

- Add toggle in theme settings to select `preferred_provider`
- Modify `src/components/study/study-client.tsx` (or generation trigger) to check provider preference
- If Ollama selected: use client hook, catch errors gracefully (show "Ollama unavailable" message)
- If cloud: use existing `src/app/api/generate/cards/route.ts`

### 4. Handle CORS & security

Browser will block `http://localhost:11434` by default (same-origin policy).

**Option A:** Instruct users to disable CORS in their Ollama setup (`OLLAMA_ORIGINS=*`)

**Option B:** Route through backend proxy endpoint (`src/app/api/generate/ollama-proxy/route.ts`) that forwards to their Ollama

**Recommendation:** Start with Option A (document in settings), add Option B later if needed

### 5. Model validation & UI hints

- Verify selected Ollama model supports JSON output (most modern models do)
- Add setup helper text: "Pull a model with `ollama pull llama3` and ensure Ollama is running"
- Validate response format matches `src/lib/llm/schema.ts` schema

### 6. Implement tier deprecation (phase 2)

- When tier system is added: free tier can only use Ollama
- Paid users get access to cloud LLMs + Ollama option
- This incentivizes free tier to self-host

## Verification

- Test with local Ollama running on `localhost:11434`
- Verify generation works end-to-end via browser
- Test error scenarios: Ollama offline, unavailable model, response format errors
- Check that cloud LLM fallback still works
- Load test with concurrent client-side generations (Ollama rate limiting)

## Key Decisions

- **Browser-direct vs backend proxy:** Starting with direct to avoid server load, users manage their own Ollama
- **Two-path generation:** Keep existing server path for cloud LLMs, add client path for Ollama
- **Per-theme toggle:** Gives users flexibility to mix and match

## User Setup Guide: Using Local Ollama

### Prerequisites

1. **Install Ollama**: Download from [ollama.ai](https://ollama.ai)
2. **Start Ollama**: Run `ollama serve` in a terminal (serves on `localhost:11434` by default)
3. **Pull a Model**: In another terminal, run:
   ```bash
   ollama pull llama3          # Recommended for balance of speed/quality
   # Or try other models:
   # ollama pull mistral       # Faster, smaller
   # ollama pull neural-chat   # Optimized for conversation
   ```

### Configuration

#### Option A: Enable CORS (Recommended for Dev)

Set the environment variable before starting Ollama:

```bash
# macOS/Linux
export OLLAMA_ORIGINS="*"
ollama serve

# Windows (PowerShell)
$env:OLLAMA_ORIGINS="*"
ollama serve
```

Or edit the Ollama config file:

- **macOS**: `~/.ollama/modelfile`
- **Linux**: `~/.config/ollama/config.json`
- **Windows**: `%APPDATA%\ollama\config.json`

Add:

```json
{
  "origins": ["*"]
}
```

#### Option B: Backend Proxy (Future Enhancement)

Once implemented, requests will automatically route through the backend if configured.

### Using Local Ollama

1. **In Dashboard**: Go to your theme and select "Local Ollama" from the Card Generation dropdown
2. **Generate Cards**: Click "Generate" or enable auto-generate
3. **Troubleshooting**:
   - **"CORS error"**: Make sure `OLLAMA_ORIGINS=*` is set and Ollama is restarted
   - **"Ollama is not running"**: Start Ollama with `ollama serve`
   - **"Model not found"**: Pull the model first: `ollama pull llama3`

### Performance Notes

- **First run**: Model needs to load into memory (~2-5GB depending on model)
- **Subsequent runs**: Faster as model stays in memory
- **Memory**: Ensure your system has enough RAM for the model + browser
- **Timeout**: Generation times out after 2 minutes; reduce card count for slower systems

### Model Recommendations

| Model             | Size  | Speed   | Quality   | Best For                      |
| ----------------- | ----- | ------- | --------- | ----------------------------- |
| `mistral`         | 4.1GB | ⚡ Fast | Good      | Older hardware, quick tests   |
| `llama3`          | 4.7GB | Normal  | Great     | Balanced choice (recommended) |
| `neural-chat`     | 4.1GB | Normal  | Good      | Conversational style          |
| `dolphin-mixtral` | 26GB  | Slow    | Excellent | High-end systems              |

### Limitations

- **No rate limiting**: Client-side generation uses local resources only
- **Offline only**: Requires local Ollama instance running
- **Model quality**: Varies by model; experiment to find your preference
- **Free tier incentive**: Using local Ollama takes load off servers, good for community

## Architecture Notes

### Current State

- Ollama provider already exists at `src/lib/llm/providers/ollama.ts`
- Provider factory pattern in `src/lib/llm/index.ts` with lazy-loaded, pluggable providers
- Environment variables already support: `OLLAMA_BASE_URL`, `OLLAMA_MODEL`
- Generation endpoints use rate limiting and deduplication

### Relevant Files

| File                                   | Purpose                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------- |
| `src/lib/llm/providers/ollama.ts`      | Existing Ollama provider                                                  |
| `src/lib/env.ts`                       | Environment configuration (OLLAMA_BASE_URL, OLLAMA_MODEL already defined) |
| `src/lib/llm/index.ts`                 | Provider factory (shows how to add/switch providers)                      |
| `src/lib/llm/prompt.ts`                | Prompt templates                                                          |
| `src/lib/llm/schema.ts`                | Card validation                                                           |
| `src/lib/llm/parse.ts`                 | Output parsing                                                            |
| `src/app/api/generate/cards/route.ts`  | Generation endpoint                                                       |
| `src/lib/llm/chunking-orchestrator.ts` | Chunking/retry logic                                                      |
| `src/lib/errors.ts`                    | Error handling                                                            |
