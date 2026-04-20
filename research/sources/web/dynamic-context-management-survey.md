---
source_url: multiple (see sections)
fetched_at: 2026-04-17
fetched_by: researcher agent
project: Spatial Workspace / context management landscape survey
---

# Dynamic Context Management Survey — Raw Extracts (2026-04-17)

## Source 1: Anthropic Agent SDK — Context Management
URL: https://claude.com/blog/building-agents-with-the-claude-agent-sdk

Key extracts:
- Auto-compact feature summarizes prior messages as context limit approaches — no explicit message deletion primitive exposed to users/developers
- File system is the primary context engineering mechanism: agents use bash (grep, tail) to selectively pull from large files
- Subagents use isolated context windows; only relevant results bubble up to orchestrator
- No explicit context_edit or message-delete primitive documented in the SDK
- Agent Skills: progressive disclosure — load instructions only when needed, not upfront

## Source 2: Letta (MemGPT) — Hierarchical Memory
URL: https://www.letta.com/blog/agent-memory

Key extracts:
- Three tiers: core memory (in-context, always visible, size-limited), recall memory (full history, on-disk, searchable), archival memory (external DB via vector/graph)
- Agents move data between tiers via function calls (OS-like RAM/disk metaphor)
- 2025-2026 innovation: sleep-time agents handle memory refinement asynchronously during idle periods
- Context Repositories: git-backed memory for coding agents — versioned, continual learning in token space
- Memory blocks can be managed by agent or by other agents

## Source 3: Mem0 — Universal Memory Layer
URL: https://mem0.ai/blog/state-of-ai-agent-memory-2026

Key extracts:
- 41K GitHub stars, 14M downloads; AWS chose it as exclusive memory provider for their Agent SDK
- Four-operation model: ADD, UPDATE, DELETE, NOOP — compares new facts against existing before storing
- Mem0g: graph-based memory expanded to production-ready in 2025-2026 (Kuzu embedded graph DB added Sept 2025)
- Actor-aware memories: tags memories with their source agent (prevents cross-agent hallucination propagation)
- Procedural memory type added in v1.0.0
- CRITICAL: User-controllable context editing flagged as unsolved — "how users inspect, edit, or delete their stored memories is an application-layer concern"

## Source 4: Zep — Temporal Knowledge Graph Memory
URL: (via search aggregator atlan.com)

Key extracts:
- Stores facts as knowledge graph nodes with temporal validity windows (e.g., "Kendra loves Adidas shoes — valid as of March 2026")
- Advantage over Mem0: models how facts change over time, not just what facts exist
- Production-ready as of 2025-2026

## Source 5: OpenAI Responses API — Stateful Context
URL: https://platform.openai.com/docs/api-reference/responses/delete

Key extracts:
- Stateful by default — conversation state persists as long-running object with durable ID
- `client.responses.delete("{response_id}")` — can delete stored responses programmatically
- Auto-truncation: if input exceeds context window, drops from beginning automatically
- No interactive user-facing pruning UI — purely developer API

## Source 6: Context Engineering — "How to Fix Your Context"
URL: https://www.dbreunig.com/2025/06/26/how-to-fix-your-context.html
Published: June 2025

Key extracts:
- Names four failure modes: context poisoning (errors referenced repeatedly), context distraction (over-relying on context vs training), context confusion (irrelevant info degrades quality), context clash (new info conflicts with prompt)
- Six solutions: RAG, tool loadout, context quarantine (per-agent isolated threads), context pruning (Provence tool: 95% reduction), context summarization, context offloading (scratchpad)
- 44% performance improvement from dynamic tool selection
- 54% improvement from context offloading

## Source 7: Anthropic — Effective Context Engineering
URL: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents

Key extracts:
- Memory tool: stores and retrieves info outside context window via file-based system
- Tool result clearing: remove raw tool outputs from deep message history (lightweight compaction)
- Just-in-time context: lightweight identifiers loaded at runtime rather than pre-processing upfront
- Sub-agent architectures: clean context per specialized agent, condensed summaries returned to orchestrator
- No mention of user-controllable pruning interfaces

## Source 8: LangChain — Context Engineering for Agents
URL: https://www.langchain.com/blog/context-engineering-for-agents

Key extracts:
- Four primitives: Write (scratchpad/memory), Select (retrieval from memory), Compress (summarize/trim), Isolate (multi-agent context splitting)
- LangGraph state object: fine-grained schema control over what reaches the LLM at each step
- Thread-scoped short-term memory via checkpointing
- No user-controllable pruning or interactive context editors

## Source 9: OpenCode Dynamic Context Pruning (DCP)
URL: https://github.com/Opencode-DCP/opencode-dynamic-context-pruning

Key extracts:
- User-facing slash commands: /dcp context, /dcp sweep, /dcp compress
- Session history unchanged — pruned content replaced with placeholders before sending to LLM
- Three strategies: compression (range or message mode), deduplication (same tool call repeated), purge errors
- CLOSEST THING to a user-controlled context management UI found in the survey
- But: operates on coding agent sessions, not a general conversation dashboard

## Source 10: Vercel AI SDK pruneMessages
URL: https://ai-sdk.dev/docs/reference/ai-sdk-ui/prune-messages

Key extracts:
- Developer API, not user-facing
- Configures uniform pruning rules: strip reasoning from old messages, remove tool calls except in recent messages, delete empty messages
- No interactive user selection — policy-based, automated

## Source 11: KV Cache Research (2025)
URL: https://arxiv.org/abs/2510.14973 and related papers

Key papers found:
- "LLMs Know What to Drop: Self-Attention Guided KV Cache Eviction" (ICLR 2025) — model self-selects what to evict
- "KV-Distill: Nearly Lossless Learnable Context Compression for LLMs" (ArXiv 2025)
- "FastKV: Token-Selective Propagation" (ArXiv 2025)
- Direction: efficient KV cache management at inference layer — reducing memory without user interaction
- Not yet user-facing tools; research-layer

## Source 12: LLM Observability — LangSmith, Langfuse, W&B Weave
Via search aggregators

Key extracts:
- LangSmith, Langfuse: trace inspection for agent workflows — show token counts, timing, message flow per step
- W&B Weave: structured execution traces, parent-child agent relationships, chat view for Claude agents
- NONE of these allow users to delete, prune, or rewrite context mid-run
- All are read-only observability tools, not write-capable context editors
- Helicone: simpler, per-call logging; no multi-turn sequencing support
