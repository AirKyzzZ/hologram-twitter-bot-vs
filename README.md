# Hologram Twitter/X Bot

An AI-powered Twitter/X social media management bot that runs as a **Hologram Verifiable Service**. Connect via the [Hologram](https://hologram.zone) mobile app, compose tweets with AI assistance, review drafts, and publish directly to Twitter, all through end-to-end encrypted DIDComm messaging.

## What is this?

If you're not familiar with the SSI (Self-Sovereign Identity) ecosystem, here's the short version:

- **Hologram** is a mobile app for secure, encrypted communication. Think of it like Signal, but with cryptographic identity built in. Users can prove who they are using digital credentials stored in their phone's wallet.
- **Verifiable Services (VS)** are bots/agents that live on the other side of those encrypted channels. They have their own cryptographic identity that users can verify before connecting. No shared passwords, no OAuth tokens stored in third-party services.
- **DIDComm** is the encrypted messaging protocol that connects the app to the bot. Every message is end-to-end encrypted between the user's phone and the bot.

This project is a concrete example: a Twitter management bot where team members connect via Hologram, authenticate with a digital credential, and manage a Twitter account through AI-assisted tweet composition.

## How it works

```
User's Phone (Hologram App)
        |
    DIDComm (encrypted)
        |
    VS Agent (io2060/vs-agent)
        |
    Bot Backend (NestJS)
        |
    ┌───┴───┐
    |       |
  LLM    Twitter
  API     API
```

1. **Connect**: Scan a QR code or open an invitation link in Hologram
2. **Compose**: Send a topic or tap "Compose Tweet"
3. **Review**: The AI generates 2 tweet drafts with different angles
4. **Edit**: Refine drafts with natural language instructions ("make it shorter", "more technical")
5. **Publish**: Approve a draft and it's posted to Twitter. You get the tweet URL as confirmation.

## Features

- **AI Draft Generation**: 2 draft options per topic via configurable LLM (Claude, GPT-4o, Llama, Gemini, etc.)
- **Multi-LLM Support**: Switch providers via env var. Works with OpenRouter for access to 100+ models
- **Tweet Validation**: 280-character limit enforcement (URLs count as 23 chars per Twitter rules)
- **Rate Limiting**: Daily post budget tracked in Redis (default: 17/day for free tier)
- **Post History**: All drafts and published tweets stored in PostgreSQL
- **Contextual Menus**: State-aware menus in Hologram (compose, review, edit, publish, cancel)
- **Credential Auth**: Built-in Verifiable Credential authentication (disabled for MVP, needs trust infrastructure)
- **Per-Account Deployment**: One bot instance per Twitter account, API keys in env vars

## Quick Start

### Prerequisites

- Docker and Docker Compose
- [ngrok](https://ngrok.com/) for tunneling (or a public server)
- Twitter API keys from [developer.x.com](https://developer.x.com)
- An LLM API key (OpenRouter, OpenAI, Anthropic, or local Ollama)

### Setup

```bash
# Clone
git clone https://github.com/AirKyzzZ/hologram-twitter-bot-vs.git
cd hologram-twitter-bot-vs

# Configure
cp .env.example .env
# Edit .env with your API keys

# Start ngrok (in a separate terminal)
ngrok http 3001 --domain=your-domain.ngrok-free.dev

# Run
docker compose up --build
```

### Get the invitation URL

```bash
curl http://localhost:3000/v1/invitation | jq .url
```

Open the URL on your phone with the Hologram app installed.

## Environment Variables

See [`.env.example`](.env.example) for all variables. Key ones:

| Variable | Description |
|----------|-------------|
| `AGENT_ENDPOINT` | Your ngrok or public URL (must reach VS Agent port 3001) |
| `LLM_PROVIDER` | `openai`, `anthropic`, or `ollama` |
| `OPENAI_API_KEY` | API key (works with OpenRouter too) |
| `OPENAI_BASE_URL` | Set to `https://openrouter.ai/api/v1` for OpenRouter |
| `OPENAI_MODEL` | Model name (e.g. `openai/gpt-oss-20b:free` for OpenRouter) |
| `TWITTER_APP_KEY` | Twitter API consumer key |
| `TWITTER_APP_SECRET` | Twitter API consumer secret |
| `TWITTER_ACCESS_TOKEN` | Twitter API access token |
| `TWITTER_ACCESS_SECRET` | Twitter API access token secret |
| `TWITTER_HANDLE` | Twitter handle (without @) |
| `DAILY_POST_BUDGET` | Max tweets per day (default: 17) |
| `CREDENTIAL_DEFINITION_ID` | Leave empty to disable auth for MVP |

## Architecture

Forked from [`hologram-generic-ai-agent-vs`](https://github.com/2060-io/hologram-generic-ai-agent-vs), the Hologram Welcome Agent. The existing architecture (NestJS, DIDComm, LangChain, TypeORM) is preserved. Added on top:

| Module | Purpose |
|--------|---------|
| `TwitterService` | Twitter API v2/v1.1 client with automatic fallback |
| `ContentPipelineService` | LLM-powered tweet draft generation (2 drafts per topic) |
| `TweetValidatorService` | 280-char validation with Twitter URL counting rules |
| `RateLimitService` | Daily post budget enforcement via Redis |
| `PostEntity` | TypeORM entity for tracking draft/published tweets |
| Extended `StateStep` enum | COMPOSE, REVIEW_DRAFT, EDIT_DRAFT, CONFIRM_PUBLISH states |
| Extended `CoreService` | Full tweet composition state machine |

## State Machine

```
CHAT --> COMPOSE --> REVIEW_DRAFT --> CONFIRM_PUBLISH --> CHAT
                         |    ^              |
                         |    +--------------+ (Edit)
                         +--> EDIT_DRAFT --> REVIEW_DRAFT
```

## License

UNLICENSED
