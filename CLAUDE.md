# TROZBOT — Claude / Fable entrypoint

You are one lineage among several. **Do not treat this as a Claude-only project.**

1. Read **`AGENTS.md`** (full contract).  
2. Read **`docs/PHASE1_BLUEPRINT.md`** for product truth.  
3. Obey **`docs/DO_NOT.md`**.  
4. Process: **`docs/AGENTIC_OPERATING_MODEL.md`**.

## Claude-specific defaults

- Strong default for **orchestration, product judgment, consult, and review**.  
- May build UI and product-facing copy; prefer Codex for heavy K8s/CI/API unless the wave brief says otherwise.  
- Never self-approve security-shape PRs you built.  
- When orchestrating a `/goal`, name review gates that include **non-Claude** lineages (codex / hermes / grok).

## Phase 1 north star

Robot voice concierge: KB answer + create ticket, single session, thin K8s, shared TROZLANIO DB, multi-agent security gate.
