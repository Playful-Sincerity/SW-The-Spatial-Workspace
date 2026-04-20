# Academic Papers: Multi-User Collaborative AI Sessions & Human-AI Coordination

Research compilation for CoVibe multi-user collaborative workspace architecture. Papers focused on how multiple humans coordinate through AI agents.

---

## 1. Collaborating with AI Agents: A Field Experiment on Teamwork, Productivity, and Performance

**Citation:** 2025 arxiv (field experiment with 4.9M impressions)  
**URL:** https://arxiv.org/html/2503.18238v2  
**Platform:** Pairit (real-time human-AI collaboration platform)

### Key Findings

- **Communication Patterns:** Humans in human-AI teams sent 63% more messages than human-human teams, indicating higher verbal coordination load
- **Delegation Strategy:** Made 71% fewer direct copy edits, suggesting humans delegated writing tasks to AI rather than manually editing
- **Productivity Gains:** 73% greater productivity per worker; teams with half the human resources produced comparable output volumes
- **Quality Trade-offs:** 
  - Human-AI teams excelled at language-based tasks (superior ad text)
  - Underperformed on visual assessment (inferior image quality)
  - Real-world field data: both text and image quality significantly impact CTR and viewing duration

### Architectural Insights for CoVibe

- **Communication density increases with AI:** Multi-user systems should expect higher message throughput when AI is present
- **Humans naturally role-specialize:** Some focus on AI direction, others on human-human coordination
- **Hybrid quality optimization:** Different task types benefit from different human-AI ratios; system should support specialized sub-teams
- **Comprehensive logging essential:** Understanding collaboration requires instrumenting all messages, edits, and API calls

---

## 2. High Volatility and Action Bias Distinguish LLMs from Humans in Group Coordination

**Citation:** 2026 arxiv  
**URL:** https://arxiv.org/html/2604.02578

### Key Findings

Compares LLM vs. human performance in Group Binary Search game (iterative group coordination to reach target value).

- **Learning Gap:** Humans showed consistent cross-game improvement; LLMs showed "minimal cross-game learning"—performance remained flat or degraded
- **Action Bias:** LLMs exhibited systematic "action bias"—changing outputs nearly every round regardless of strategic utility
- **Switching Rates:** LLM switching rates "dramatically higher than humans"; humans reduced changes as convergence approached
- **Feedback Utilization:** Humans benefited from numerical error feedback; LLMs showed inconsistent/negative response
- **Overreaction:** LLMs systematically overreacted to feedback; humans made "calibrated, progressively refined adjustments"
- **Role Specialization:** Humans spontaneously developed role specialization with fixed/variable members; LLMs never adopted this

### Architectural Insights for CoVibe

- **Don't naively expose LLM state changes to humans:** Action bias will cause thrashing in shared state scenarios
- **Feedback loops need dampening:** LLMs require filtered, rate-limited feedback—pure numerical feedback backfires
- **Encourage human role specialization:** System should support designated coordinators, validators, and executors—not all participants equally active
- **Multi-round convergence:** For complex tasks, expect LLM oscillation around solutions; humans need patience or explicit damping mechanisms
- **Learning loops across sessions:** Record and replay successful strategies; LLMs don't naturally learn from experience

---

## 3. Understanding Human–Multi-Agent Team Formation for Creative Work

**Citation:** 2026 arxiv  
**URL:** https://arxiv.org/html/2601.13865v1

### Key Findings

Multi-user creative teams (humans + multi-agent systems) require direct human orchestration, not autonomous agent operation.

- **Autonomous Failure:** Agents alone generated "unproductive loops"—gave feedback without deciding, showed no clear preferences
- **Expectation Gap:** Users expected autonomous ideation; discovered agents lack subjective judgment for creative progress
- **Solution:** Humans became orchestrators, actively guiding agent activities, setting direction, synthesizing outputs across parallel threads
- **Role Specialization Required:** Generalist agents failed; specialized agents (ideation vs. evaluation) needed clearer task boundaries than human teams
- **Communication Structure:** One-on-one agent interactions inadequate; needed simultaneous multi-agent discussions and broadcast channels
- **Persona Diversity Matters:** Teams improved with distinctly different agent perspectives; identical agents produced duplicate outputs

### Architectural Insights for CoVibe

- **Human orchestration layer is mandatory:** Don't assume multi-agent systems self-organize; build explicit orchestration UI
- **Broadcast communication essential:** One-to-one conversations create silos; system must support multi-agent group discussion
- **Specialize agents operationally:** Different agents should have distinct roles (brainstormer, critic, synthesizer, validator) with clear scopes
- **Diverse personas prevent convergence:** Populate multi-agent workspace with agents having different training, perspectives, styles
- **Iterative team refinement:** Let humans gradually adjust agent configuration based on observed inefficiencies—progressive composition, not upfront design
- **Reduce role ambiguity:** Creative teams need more explicit boundaries than human teams; system should enforce role clarity

---

## 4. LLM-Based Human-Agent Collaboration and Interaction Systems: A Survey

**Citation:** 2025 arxiv (comprehensive survey)  
**URL:** https://arxiv.org/html/2505.00753v4

### Key Findings

Establishes that fully autonomous LLM agents face persistent challenges (hallucinations, complexity, safety). Field shifting toward collaborative human-agent systems.

**Five Core Components of Collaborative Systems:**

1. **Environment & Profiling:** Physical/simulated settings; humans categorized as "lazy" (minimal guidance) vs. "informative" (detailed engagement)
2. **Human Feedback Types:** Evaluative (ratings), Corrective (edits), Guidance (instruction), Implicit (behavior-inferred)—delivered in setup, execution, or post-task phases
3. **Interaction Types:** Collaboration (delegation/supervision/cooperation/coordination), Competition, Coopetition
4. **Orchestration:** Task strategies (sequential vs. simultaneous) + temporal sync (synchronous vs. asynchronous)
5. **Communication:** Structure (centralized/decentralized/hierarchical) + modes (conversation/observation/message pools)

**Critical Challenges:**
- Human feedback variability
- Agent-centric design (insufficient human-centered design)
- Inadequate human workload metrics
- Unexplored safety vulnerabilities in collaborative workflows

### Architectural Insights for CoVibe

- **Environment modeling:** Explicitly categorize human engagement patterns; build UI/UX for both "lazy" and "informative" participants
- **Feedback infrastructure:** Design explicit feedback channels for each type (evaluative, corrective, guidance); don't rely on implicit signals alone
- **Temporal synchronization critical:** Decide upfront whether system is synchronous (real-time) or asynchronous (batch); mixing without design fails
- **Communication topology choice:** Centralized (bottleneck but clear) vs. decentralized (scalable but chaotic) vs. hierarchical (structured escalation)
- **Safety by design:** Collaborative workflows have unique vulnerabilities; build guards for human-agent feedback loops, delegation errors, cascading mistakes
- **Workload monitoring:** Instrument human cognitive load—not just task completion. Collaborative systems can overburden humans with coordination.

---

## 5. Multi-Agent Collaboration Mechanisms: A Survey of LLMs

**Citation:** 2025 arxiv  
**URL:** https://arxiv.org/html/2501.06322v1

### Key Findings

Multi-agent systems enhance individual LLM capabilities through collaboration and coordination mechanisms:

- Distribute tasks among agents
- Share knowledge and execute subtasks
- Align efforts toward shared objectives
- Structured communication protocols enable scale

**Notable Finding:** Under imperfect monitoring (agents receive only aggregate group feedback), LLM groups fail to self-organize complementary roles as group size increases.

### Architectural Insights for CoVibe

- **Explicit communication protocols needed:** LLMs don't discover good coordination patterns; define protocols upfront
- **Scale challenges:** Group effectiveness degrades with size under aggregate-only feedback; move toward explicit task assignment at scale
- **Knowledge sharing mechanisms:** Build scaffolding for agents to reference each other's outputs; don't assume implicit context sharing
- **Role discovery vs. assignment:** Small groups might discover roles; large groups need explicit role assignment

---

## 6. Understanding Successful Human-AI Teaming: Goal Alignment and AI Autonomy

**Citation:** 2025 ScienceDirect  
**URL:** https://www.sciencedirect.com/science/article/pii/S2949882125001306

### Key Findings

- **Goal alignment more decisive than autonomy:** Goal alignment was more impactful for "warmth and teaming perception" than AI autonomy level
- **High autonomy + goal alignment → superior experience:** When AI is both autonomous AND aligned with user goals, teamwork perception is strongest
- **User perception:** Users care more about "does the AI want what I want?" than "how much does the AI do autonomously?"

### Architectural Insights for CoVibe

- **Make goal alignment explicit:** Users should see what objectives the AI/agents are optimizing toward
- **Transparency over autonomy:** Even high-autonomy agents should be transparent about goals; this builds trust more than reducing autonomy
- **Goal negotiation UI:** Multi-user scenarios need explicit goal-setting and alignment displays; implicit sharing fails

---

## 7. Through the Lens of Human-Human Collaboration: A Configurable Research Platform for Exploring Human-Agent Collaboration

**Citation:** 2025 arxiv  
**URL:** https://arxiv.org/html/2509.18008

### Key Findings

Applying human-human collaboration models as baseline/reference for human-agent systems design:

- Modular, experiment-driven platforms enable systematic testing of information flow, action protocols, and social framing
- Whether classic CSCW findings generalize to agent-mediated settings is an open question
- Real-time synchronous interaction patterns more closely mirror real-world conditions than one-by-one sequential patterns

### Architectural Insights for CoVibe

- **Use human collaboration as reference design:** Don't start from pure multi-agent abstractions; ground in how humans coordinate
- **Configurable information flow:** Make message passing, feedback loops, and decision protocols experimentally adjustable
- **Synchronous by default:** Real-time interaction patterns are more natural and robust than asynchronous; async adds cognitive overhead

---

## 8. Orchestrating Human-AI Teams: The Manager Agent as a Unifying Research Challenge

**Citation:** 2025 ACM/IEEE Conference on Distributed AI  
**URL:** https://dl.acm.org/doi/10.1145/3772429.3772439  
**Full PDF:** https://www.arxiv.org/pdf/2510.02557

### Key Findings

Autonomous manager agents coordinate dynamic human-AI teams through:

- Decomposing complex goals into task graphs
- Allocating tasks to humans and AI workers
- Monitoring progress and adapting to changing conditions
- Maintaining transparent stakeholder communication

**Four foundational challenges:**
1. Compositional reasoning for hierarchical decomposition
2. Multi-objective optimization under shifting preferences
3. Coordination and planning in ad hoc teams
4. Governance and compliance by design

**Emerging protocols:**
- Model Context Protocol (MCP): standardizes agent access to external tools and contextual data
- Agent-to-Agent protocol: governs peer coordination, negotiation, delegation

### Architectural Insights for CoVibe

- **Manager agent pattern:** Multi-user systems benefit from a dedicated orchestrator agent that decomposes goals and allocates work
- **Task decomposition UI:** Make goal hierarchies and task allocation visible to all participants
- **Adaptive allocation:** System should reassign tasks as conditions change (humans busy/unavailable, AI struggling, requirements shifting)
- **Governance layer:** Define escalation rules, decision authorities, compliance constraints upfront—don't assume emergent governance works
- **Protocol standardization:** Use MCP and Agent-to-Agent protocols rather than inventing custom communication; enables reuse and clarity

---

## 9. Multi-Agent Collaboration via Cross-Team Orchestration

**Citation:** 2025 ACL Findings  
**URL:** https://aclanthology.org/2025.findings-acl.541.pdf

### Key Findings

Effective multi-agent orchestration requires cross-team coordination patterns:

- Hierarchical agent architecture for complex workflows
- Event-driven orchestration for real-time responses
- Hybrid human-AI orchestration for regulated/compliance-heavy domains

**Enterprise impact:** Multi-agent orchestration reduces hand-offs by 45% and boosts decision speed by 3x.

### Architectural Insights for CoVibe

- **Hierarchical orchestration:** For complex multi-user workflows, layer agents into decision tiers (executives, managers, workers)
- **Event-driven patterns:** Real-time user changes, new data, or task failures should trigger automated agent reallocation
- **Compliance integration:** If multi-user workspace operates under governance constraints, embed compliance rules into orchestration layer—don't defer to post-hoc validation

---

## 10. SlackAgents: Scalable Collaboration of AI Agents in Slack Workspaces

**Citation:** 2025 EMNLP Demos  
**URL:** https://aclanthology.org/2025.emnlp-demos.76.pdf

### Key Findings

Demonstrates scalable multi-agent collaboration within an existing team communication platform (Slack):

- Multiple specialist agents operating in shared channels
- Applications: collaborative specialist teams, proactive support, personal assistants
- Proven architecture for embedding agents into human collaboration spaces

### Architectural Insights for CoVibe

- **Use existing communication infrastructure:** Don't reinvent chat/messaging; integrate agents into where humans already communicate
- **Specialist agents:** Populate shared workspace with agents of distinct specialties; let humans assign tasks based on agent capabilities
- **Proactive agents:** Agents should monitor shared state and offer suggestions rather than waiting for explicit human requests
- **Channel-based organization:** Organizing by task/project (not agent) creates natural human collaboration surfaces

---

## 11. Is Human-AI Interaction CSCW?

**Citation:** 2024 CSCW Companion Publication  
**URL:** https://dl.acm.org/doi/10.1145/3678884.3689134

### Key Findings

CSCW 2024 panel debate: Should human-AI collaboration count as "computer-supported cooperative work"?

- Historically CSCW = computer-mediated collaboration between 2+ humans
- Emerging challenge: Is single human + multiple AI agents "collaboration"? Does it belong in CSCW?
- Key question: Does CSCW paradigm generalize to agent-mediated multi-party interaction?

### Architectural Insights for CoVibe

- **Multi-user requirement isn't strict:** A single human orchestrating multiple AI agents may still benefit from CSCW design principles
- **Borrow CSCW patterns:** Awareness, coordination, communication structures from CSCW are applicable to human-AI-human scenarios
- **Conversational agents as team members:** Treating agents as team participants (not tools) enables CSCW-derived design insights

---

## Research Gaps & Opportunities for CoVibe

1. **Real-time multi-user + multi-agent coordination:** Most papers study either multi-user OR multi-agent; few study both simultaneously
2. **Asynchronous hybrid workflows:** How do human-AI teams coordinate across time zones and schedules?
3. **Continuous agent learning from multi-user feedback:** LLMs don't learn from experience (Paper 2); how do multi-user systems overcome this?
4. **Workload fairness metrics:** Who bears cognitive load in human-AI-human teams? How to balance?
5. **Safety in broadcast communication:** When agents can see all user interactions (broadcast), what are failure modes?
6. **Creative + analytic task splits:** Paper 3 focuses on creative work; how do these patterns apply to analytical/engineering teams?
7. **Cross-domain orchestration:** How do manager agents handle teams with mixed human skills, AI capabilities, and external tools?

---

## Synthesis: Core Design Principles for CoVibe

Based on papers 1-11:

| Principle | Source Papers | Implementation |
|-----------|---------------|-----------------|
| **Humans are orchestrators, not just users** | 3, 8 | Explicit coordination UI; goal-setting and role-assignment interfaces |
| **Communication > Autonomy** | 6, 7 | Make agent goals/plans visible; transparency before autonomy |
| **Feedback damping essential** | 2 | Rate-limit agent reactions; avoid raw numerical feedback oscillation |
| **Role specialization by design** | 2, 3, 4 | Assign agents distinct personas/scopes; humans verify specialization is useful |
| **Synchronous by default** | 7 | Real-time interaction patterns more natural; async requires explicit scaffolding |
| **Broadcast channels for multi-agent visibility** | 3, 10 | Agents should see group state/decisions; prevents duplicate work and reduces cycles |
| **Hierarchical decomposition layer** | 8, 9 | Manager agent decomposes goals; allocates to specialists; monitors progress |
| **Logging everything** | 1 | Instrument all interactions (messages, edits, agent API calls, state changes) for analysis/replay |
| **Safety by design in feedback loops** | 4 | Define cascading-failure guards; prevent human→agent→human error amplification |
| **Workload monitoring** | 4 | Track human cognitive load alongside task completion; collaborative systems can overburden |

---

**Last Updated:** April 7, 2026  
**Next Research Priority:** Real-time orchestration patterns for asynchronous multi-user teams; workload fairness metrics.
