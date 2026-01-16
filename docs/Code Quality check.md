# Code Quality Check Rubric

A comprehensive framework for reviewing codebases, designed for senior engineers conducting code reviews, technical debt assessments, or preparing for code handoffs. Goes beyond basic principles to cover what distinguishes production-grade, enterprise-quality code.

## How to Use This Document

Score each dimension on a 1-5 scale:
- **5**: Exemplary - Could serve as a reference implementation
- **4**: Good - Minor improvements possible
- **3**: Acceptable - Meets minimum standards, some issues
- **2**: Needs Work - Significant problems requiring attention
- **1**: Critical - Immediate refactoring required

---

## 1. Refactoring Indicators

These checks identify code that requires refactoring before technical debt compounds.

### 1.1 DRY (Don't Repeat Yourself)

| Check | What to Look For | Red Flags |
|-------|------------------|-----------|
| Code duplication | Similar logic in 3+ places | Copy-paste patterns, slight variations of same algorithm |
| Knowledge fragmentation | Same business rule in multiple files | Validation logic scattered across modules |
| Configuration duplication | Magic numbers/strings repeated | Hardcoded values not centralized |
| Test duplication | Identical setup/assertions | Test files with copy-paste fixtures |

**Rule of Three**: If code appears 3 times, extract immediately.

### 1.2 SOLID Principles

#### Single Responsibility Principle (SRP)

| Check | Pass | Fail |
|-------|------|------|
| Class has one reason to change | Class handles one concern | Class mixes DB, API, caching, business logic |
| Method does one thing | Method name describes all it does | Method has "and" in description |
| File length | < 300 lines typically | > 500 lines with multiple concerns |

#### Open-Closed Principle (OCP)

| Check | Pass | Fail |
|-------|------|------|
| Extension without modification | New features via new classes/modules | Core files modified for every feature |
| Plugin/strategy patterns | Behavior injectable at runtime | Giant switch/if-else chains |
| Interface-based design | Abstractions enable extension | Concrete dependencies everywhere |

#### Liskov Substitution Principle (LSP)

| Check | Pass | Fail |
|-------|------|------|
| Subclass contract adherence | Derived types substitute seamlessly | Subclass throws where parent doesn't |
| Method signature preservation | Consistent inputs/outputs | Override that changes expected behavior |
| Behavioral consistency | Child honors parent's contract | "NotImplemented" exceptions in overrides |

#### Interface Segregation Principle (ISP)

| Check | Pass | Fail |
|-------|------|------|
| Focused interfaces | Clients use all methods they implement | Empty method stubs in implementations |
| Role-based segregation | Separate read/write interfaces | God interfaces with 20+ methods |
| Dependency clarity | Clear what each consumer needs | Consumers importing unused capabilities |

#### Dependency Inversion Principle (DIP)

| Check | Pass | Fail |
|-------|------|------|
| Abstraction dependencies | High-level depends on interfaces | Direct instantiation of low-level classes |
| Injection pattern | Dependencies passed in | `new Database()` inside business logic |
| Testability | Easy to mock dependencies | Tests require real DB/network |

### 1.3 Code Smells Checklist

| Smell | Indicator | Action |
|-------|-----------|--------|
| **Long Method** | > 50 lines, multiple indent levels | Extract helper methods |
| **Large Class** | > 500 lines, many private methods | Split by responsibility |
| **Long Parameter List** | > 4 parameters | Create parameter object |
| **Feature Envy** | Method uses another class more than its own | Move method to that class |
| **Data Clumps** | Same parameters always travel together | Extract into value object |
| **Primitive Obsession** | Using strings/ints for domain concepts | Create domain types |
| **Divergent Change** | One class modified for unrelated reasons | Split the class |
| **Shotgun Surgery** | Small change requires edits across many files | Consolidate related logic |
| **Comments explaining what** | Comments describe obvious code | Refactor to self-documenting |

### 1.4 KISS (Keep It Simple)

| Check | Pass | Fail |
|-------|------|------|
| Appropriate abstraction level | Abstraction solves real problem | Abstraction for hypothetical futures |
| Design pattern usage | Pattern addresses concrete need | Patterns applied dogmatically |
| Solution complexity | Complexity justified by requirements | Over-engineered for scope |

---

## 2. Testability Architecture

Beyond coverage metrics—design that genuinely supports meaningful testing.

### 2.1 Design for Testability

| Attribute | Good | Poor |
|-----------|------|------|
| **Isolation** | Components testable without full system | Tests require complete deployment |
| **Dependency injection** | All dependencies injectable | Hard-coded instantiation |
| **State management** | Minimal shared mutable state | Global state throughout |
| **Side effect isolation** | I/O at system boundaries | I/O scattered through business logic |
| **Seams for mocking** | Clear interfaces for test doubles | Concrete classes everywhere |

### 2.2 Test Quality Beyond Coverage

| Check | Target | Red Flags |
|-------|--------|-----------|
| **Mutation score** | > 80% mutations killed | High coverage but low mutation score |
| **Boundary testing** | Edge cases explicitly tested | Only happy path tested |
| **Behavioral assertions** | Tests validate behavior, not implementation | Tests break on refactors |
| **Test independence** | Tests pass in any order | Tests depend on execution sequence |
| **Determinism** | Tests never flaky | Random failures in CI |

### 2.3 Test Pyramid Health

| Level | Check | Status |
|-------|-------|--------|
| **Unit tests** | Fast, isolated, comprehensive | |
| **Integration tests** | Verify component interaction | |
| **Contract tests** | API contracts validated | |
| **E2E tests** | Critical paths covered, not excessive | |
| **Performance tests** | Load characteristics validated | |

### 2.4 Testability Checklist

- [ ] Unit tests run in < 30 seconds
- [ ] No database/network required for unit tests
- [ ] Integration tests use test containers or similar
- [ ] Flaky tests tracked and prioritized for fix
- [ ] Test data setup is automated and repeatable
- [ ] Coverage reports available and reviewed

---

## 3. Security Posture

Threat-aware code review, not just checklist compliance.

### 3.1 Threat Modeling Integration

| Dimension | Questions | Status |
|-----------|-----------|--------|
| **Entry points identified** | Where does untrusted data enter? | |
| **Trust boundaries** | Where does privilege change? | |
| **Data flow traced** | How does sensitive data move? | |
| **Attack surface** | What's exposed to adversaries? | |
| **Threat actors** | Who might attack and why? | |

### 3.2 Input Validation & Boundary Protection

| Check | Implementation | Status |
|-------|----------------|--------|
| **Validation at boundaries** | All external input validated at entry | |
| **Defense in depth** | Multiple layers of validation | |
| **Allowlist over denylist** | Accept known-good, not reject known-bad | |
| **Contextual encoding** | Output encoded for context (HTML, SQL, etc.) | |
| **Size limits** | Maximum lengths enforced | |

### 3.3 Security Vulnerabilities Checklist

| Category | Check | Status |
|----------|-------|--------|
| **Injection** | Parameterized queries, no string concat | |
| **XSS** | Output encoding, CSP headers | |
| **CSRF** | Tokens for state-changing operations | |
| **Auth bypass** | All endpoints require auth check | |
| **Insecure deserialization** | Untrusted data not deserialized | |
| **Secrets exposure** | No secrets in code, logs, or errors | |
| **Cryptographic failures** | Standard libraries, no custom crypto | |
| **Access control** | Authorization checked, not just authentication | |

### 3.4 Secrets & Cryptography

| Check | Pass | Fail |
|-------|------|------|
| **Key management** | Keys from secure infrastructure | Keys in code or config |
| **Encryption at rest** | Sensitive data encrypted | Plaintext in database |
| **Encryption in transit** | TLS for all connections | HTTP anywhere |
| **Password handling** | Bcrypt/Argon2 hashing | MD5/SHA1 or plaintext |
| **Token security** | Short-lived, properly scoped | Long-lived, overly permissive |

---

## 4. Performance Characteristics

Profiling-driven optimization, not speculation.

### 4.1 Algorithmic Efficiency

| Check | Good | Problematic |
|-------|------|-------------|
| **Scaling behavior** | O(n) or O(n log n) | O(n²) or O(n³) |
| **Data structure choice** | Appropriate for access pattern | HashMap for iteration, Array for lookups |
| **Unnecessary work** | Computed once, cached appropriately | Repeated computation |
| **Early termination** | Stops when answer found | Processes all even when unnecessary |

### 4.2 Profiling Discipline

| Question | Answer |
|----------|--------|
| Has the code been profiled under realistic load? | |
| Were optimizations targeted at measured bottlenecks? | |
| Were improvements verified through continued measurement? | |
| Is there baseline performance data for regression detection? | |

### 4.3 Resource Management

| Resource | Check | Status |
|----------|-------|--------|
| **Memory** | Bounded allocation, no unbounded growth | |
| **Connections** | Pooled, released properly | |
| **File handles** | Closed in finally/using blocks | |
| **Threads** | Pool-based, no unbounded creation | |
| **External API calls** | Rate-limited, batched where possible | |

### 4.4 Common Performance Anti-patterns

| Anti-pattern | Description | Present? |
|--------------|-------------|----------|
| **N+1 queries** | Loop with query per iteration | |
| **Unbounded queries** | SELECT * without LIMIT | |
| **Blocking in async** | Sync calls in async code paths | |
| **Premature optimization** | Complexity without profiling data | |
| **Missing indexes** | Queries on unindexed columns | |
| **Over-fetching** | Loading more data than needed | |

---

## 5. Cognitive Complexity

Mental effort required to understand code—distinct from cyclomatic complexity.

### 5.1 Cognitive Load Factors

| Factor | Low Cognitive Load | High Cognitive Load |
|--------|-------------------|---------------------|
| **Nesting depth** | Max 3 levels | 5+ levels deep |
| **Boolean complexity** | Simple conditions | `(a && b) || (c && !d && e)` |
| **Control flow** | Linear, predictable | Jumps, goto-like patterns |
| **Side effects** | Explicit, isolated | Hidden mutations |
| **Naming** | Intent-revealing | Abbreviations, generic names |

### 5.2 Naming Quality

| Check | Good Example | Poor Example |
|-------|--------------|--------------|
| **Variables** | `customerPaymentAmount` | `amt`, `data`, `temp` |
| **Functions** | `calculateMonthlyInterest()` | `calc()`, `process()`, `handle()` |
| **Booleans** | `isValidated`, `hasPermission` | `flag`, `status` |
| **Collections** | `activeUsers`, `pendingOrders` | `list`, `items` |
| **Constants** | `MAX_RETRY_ATTEMPTS` | `MAX`, `LIMIT` |

### 5.3 Code Organization

| Check | Score Criteria |
|-------|----------------|
| **Logical grouping** | Related code is adjacent | 5: Yes, 1: Scattered |
| **Consistent patterns** | Similar problems solved similarly | 5: Consistent, 1: Different each time |
| **Surprise minimization** | Code does what name suggests | 5: No surprises, 1: Hidden behavior |
| **Reading order** | Can read top-to-bottom | 5: Yes, 1: Must jump around |

### 5.4 Cognitive Complexity Metrics

| Metric | Target | Current | Action Threshold |
|--------|--------|---------|------------------|
| **Cognitive Complexity** | < 15 per function | | Refactor at > 20 |
| **Nesting depth** | < 4 levels | | Refactor at > 5 |
| **Parameters** | < 5 per function | | Refactor at > 6 |
| **Lines per function** | < 30 | | Refactor at > 50 |

---

## 6. Code Evolution & Technical Debt Governance

Patterns that predict long-term quality trajectory.

### 6.1 Technical Debt Identification

| Debt Type | Description | Status |
|-----------|-------------|--------|
| **Deliberate** | Known shortcuts with repayment plan | Tracked? |
| **Accidental** | Unknowingly introduced issues | Identified? |
| **Bit rot** | Accumulated small degradations | Measured? |
| **Architectural** | Fundamental design limitations | Documented? |

### 6.2 Code Churn Analysis

| Metric | Healthy | Concerning |
|--------|---------|------------|
| **File stability** | Most files rarely change | Same files change constantly |
| **Hotspot concentration** | Churn spread across codebase | 10% of files have 90% of changes |
| **Churn/defect correlation** | Changes are planned features | Changes are bug fixes |

### 6.3 Refactoring Practices

| Practice | Check | Status |
|----------|-------|--------|
| **Dedicated refactoring time** | % of sprint for debt reduction | ___% |
| **Boy Scout rule** | Leave code better than found | Followed? |
| **Incremental improvement** | Small, continuous refactors | Or big-bang only? |
| **Refactoring tests first** | Changes covered by tests | Refactors verified? |

### 6.4 Technical Debt Ratio

| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| **Technical Debt Ratio** | < 5% | | (Remediation cost / Dev cost) |
| **Debt trend** | Decreasing | | Improving or accumulating? |
| **Sprint debt allocation** | 15-20% | | Time for debt work |

---

## 7. Dependency Management

Internal and external dependency health.

### 7.1 External Dependency Health

| Check | Healthy | Risky |
|-------|---------|-------|
| **Maintenance status** | Active development, recent commits | Abandoned, years since update |
| **Security posture** | No known vulnerabilities | CVEs unaddressed |
| **Update strategy** | Regular, planned updates | Never updated |
| **Transitive depth** | Shallow dependency tree | Deep, complex tree |
| **License compliance** | Compatible licenses | Incompatible or unclear |

### 7.2 Dependency Coupling

| Dimension | Low Coupling | High Coupling |
|-----------|--------------|---------------|
| **Import breadth** | Few imports from each dep | Everything imported |
| **Wrapping** | Dependencies behind adapters | Direct usage everywhere |
| **Version flexibility** | Can update without code changes | Tied to specific versions |
| **Alternative paths** | Could swap dependencies | Completely vendor-locked |

### 7.3 Internal Service Boundaries

| Check | Good | Poor |
|-------|------|------|
| **Domain alignment** | Service = business capability | Technical layer = service |
| **Dependency direction** | Acyclic, clear hierarchy | Circular dependencies |
| **Contract clarity** | Explicit API contracts | Implicit assumptions |
| **Failure isolation** | One service failure doesn't cascade | Everything fails together |

### 7.4 Dependency Checklist

- [ ] Dependency scanning in CI (Snyk, Dependabot, etc.)
- [ ] License audit completed
- [ ] Critical dependencies have alternatives identified
- [ ] Update policy documented and followed
- [ ] Breaking change migration guides available

---

## 8. API Design Quality

Contract stability and consumer experience.

### 8.1 REST API Design

| Principle | Check | Status |
|-----------|-------|--------|
| **Resource-oriented** | URLs represent resources, not actions | |
| **Semantic HTTP methods** | GET reads, POST creates, PUT updates | |
| **Proper status codes** | 4xx for client errors, 5xx for server | |
| **Consistent naming** | `/users/{id}/orders` not `/getOrdersForUser` | |
| **HATEOAS** | Links to related resources | |

### 8.2 Backward Compatibility

| Strategy | Implementation | Status |
|----------|----------------|--------|
| **Additive changes only** | New fields optional, old fields preserved | |
| **Versioning scheme** | URL, header, or query param versioning | |
| **Deprecation process** | Clear timeline, migration guide | |
| **Breaking change policy** | Minimum 6-12 month deprecation | |
| **Consumer communication** | Changelog, migration support | |

### 8.3 API Documentation

| Element | Present? | Quality |
|---------|----------|---------|
| **OpenAPI/Swagger spec** | | |
| **Authentication examples** | | |
| **Error response format** | | |
| **Rate limiting documentation** | | |
| **SDK/client libraries** | | |
| **Changelog** | | |

### 8.4 API Quality Checklist

- [ ] All endpoints have documented contracts
- [ ] Error responses are consistent and actionable
- [ ] Rate limits are documented and enforced
- [ ] Authentication methods are clearly described
- [ ] Breaking changes have migration guides

---

## 9. Error Handling Philosophy

Resilience by design, not afterthought.

### 9.1 Error Strategy

| Aspect | Good | Poor |
|--------|------|------|
| **Error types** | Distinct, meaningful error types | Generic exceptions |
| **Error context** | Includes what, where, why | Just "error occurred" |
| **Recovery strategy** | Clear: retry, fallback, or fail | Catch-and-ignore |
| **Error propagation** | Context preserved through layers | Information lost |

### 9.2 Distributed Systems Resilience

| Pattern | Implementation | Status |
|---------|----------------|--------|
| **Circuit breakers** | Stop calling failing services | |
| **Bulkheads** | Isolate resource pools | |
| **Timeouts** | All external calls have limits | |
| **Retry with backoff** | Exponential backoff, jitter | |
| **Fallbacks** | Degraded mode when deps fail | |
| **Health checks** | Services report their status | |

### 9.3 Idempotency

| Check | Implementation | Status |
|-------|----------------|--------|
| **Idempotent operations** | Repeated calls = single call | |
| **Request IDs** | Unique identifiers for deduplication | |
| **Idempotency keys** | Client-provided keys for safe retries | |
| **Database operations** | Upserts instead of insert-if-not-exists | |

### 9.4 Error Handling Checklist

- [ ] No catch-and-ignore blocks without explicit justification
- [ ] Errors logged with sufficient context
- [ ] User-facing errors are helpful, not technical
- [ ] Sensitive info not leaked in error messages
- [ ] Error rates monitored and alerted

---

## 10. Observability Design

Built-in visibility, not bolted-on monitoring.

### 10.1 Three Pillars

| Pillar | Check | Implementation |
|--------|-------|----------------|
| **Logs** | Structured, contextual, leveled | Format: |
| **Metrics** | Business and technical KPIs | Tools: |
| **Traces** | Request flow across services | Protocol: |

### 10.2 Logging Quality

| Attribute | Good | Poor |
|-----------|------|------|
| **Format** | JSON, machine-parseable | Unstructured text |
| **Context** | Request ID, user ID, operation | Just the message |
| **Levels** | DEBUG, INFO, WARN, ERROR used correctly | Everything at INFO |
| **Sensitivity** | No PII, secrets, or tokens | Sensitive data logged |
| **Volume** | Informative but not overwhelming | Log everything or nothing |

### 10.3 Distributed Tracing

| Check | Status | Notes |
|-------|--------|-------|
| **Trace propagation** | Context passed across services | |
| **Span coverage** | All significant operations traced | |
| **Baggage** | Correlation IDs, user context | |
| **Sampling strategy** | Appropriate for load | |

### 10.4 Alerting Maturity

| Level | Description | Status |
|-------|-------------|--------|
| **Page-worthy** | Customer impact, requires immediate action | |
| **Ticket-worthy** | Should be fixed, not urgent | |
| **Dashboard-only** | Informational, trend tracking | |
| **Runbooks linked** | Alerts have response procedures | |

### 10.5 Observability Checklist

- [ ] Every request has a correlation ID
- [ ] Critical business events have dedicated metrics
- [ ] Alerts have clear severity and runbooks
- [ ] Dashboards show system health at a glance
- [ ] Log retention meets compliance requirements

---

## 11. Concurrency Safety

Thread-safe design for multi-user, multi-core systems.

### 11.1 Race Condition Prevention

| Strategy | Implementation | Status |
|----------|----------------|--------|
| **Immutability** | Prefer immutable data structures | |
| **Statelessness** | Minimize shared mutable state | |
| **Synchronization** | Appropriate locking when needed | |
| **Atomic operations** | Use atomics for simple counters | |
| **Thread-local storage** | Isolate per-thread state | |

### 11.2 Concurrency Patterns

| Pattern | When to Use | Present? |
|---------|-------------|----------|
| **Lock-free data structures** | High contention, simple operations | |
| **Read-write locks** | Many readers, few writers | |
| **Optimistic locking** | Conflicts rare, retries cheap | |
| **Pessimistic locking** | Conflicts common, retries expensive | |
| **Actor model** | Complex state machines | |

### 11.3 Deadlock Prevention

| Check | Implementation | Status |
|-------|----------------|--------|
| **Lock ordering** | Consistent acquisition order | |
| **Timeout on locks** | Don't wait forever | |
| **Deadlock detection** | Monitoring for deadlock symptoms | |
| **Lock scope minimization** | Hold locks briefly | |

### 11.4 Concurrency Checklist

- [ ] Shared mutable state documented
- [ ] Thread safety documented for public APIs
- [ ] Race condition testing in place
- [ ] No blocking in event loops
- [ ] Connection pools sized appropriately

---

## 12. Architectural Coherence

System-level design quality.

### 12.1 Coupling & Cohesion

| Dimension | Score Criteria |
|-----------|----------------|
| **Module cohesion** | 5: Elements tightly related, 1: Unrelated responsibilities |
| **Inter-module coupling** | 5: Narrow interfaces, 1: Shared state, circular deps |
| **Layer discipline** | 5: Clear layers respected, 1: Bypassing everywhere |
| **Domain alignment** | 5: Code mirrors business, 1: Technical organization |

### 12.2 Separation of Concerns

| Layer | Purpose | Properly Separated? |
|-------|---------|---------------------|
| **Presentation** | UI rendering, API formatting | |
| **Application** | Orchestration, use cases | |
| **Domain** | Business rules, entities | |
| **Infrastructure** | Database, external services | |

### 12.3 Architectural Consistency

| Check | Pass | Fail |
|-------|------|------|
| **Pattern consistency** | Same problems solved the same way | Different patterns for similar problems |
| **Naming conventions** | Consistent across codebase | Every module has different conventions |
| **Error handling** | Uniform strategy | Ad-hoc approaches |
| **Logging** | Consistent format and levels | Every service logs differently |

### 12.4 Architecture Checklist

- [ ] Architecture diagram exists and is current
- [ ] Architectural Decision Records for major decisions
- [ ] Module boundaries match team boundaries
- [ ] No circular dependencies between modules
- [ ] Clear data ownership per module

---

## 13. Production Readiness

Operational maturity for real-world deployment.

### 13.1 Deployment Safety

| Capability | Implementation | Status |
|------------|----------------|--------|
| **Blue/green deployment** | Zero-downtime releases | |
| **Canary releases** | Gradual rollout | |
| **Feature flags** | Toggle features without deploy | |
| **Rollback** | Automated, < 5 minute | |
| **Deployment audit** | Who deployed what when | |

### 13.2 Configuration Management

| Check | Good | Poor |
|-------|------|------|
| **Environment abstraction** | Config externalized | Values in code |
| **Secret separation** | Secrets via vault/KMS | Secrets in env files |
| **Configuration validation** | Fails fast on bad config | Fails later, mysteriously |
| **Configuration versioning** | Config changes tracked | Config drift undetected |

### 13.3 Graceful Degradation

| Scenario | Fallback Strategy | Tested? |
|----------|-------------------|---------|
| Database unavailable | | |
| Cache unavailable | | |
| External API down | | |
| Rate limit exceeded | | |
| Disk full | | |

### 13.4 Operational Checklist

- [ ] Health check endpoint exists
- [ ] Graceful shutdown implemented
- [ ] Resource limits configured
- [ ] Backup and restore tested
- [ ] Incident response runbooks exist
- [ ] On-call rotation documented

---

## 14. Domain Knowledge Integration

Business context in technical decisions.

### 14.1 Domain Modeling

| Check | Good | Poor |
|-------|------|------|
| **Ubiquitous language** | Code terms = business terms | Technical jargon throughout |
| **Entity alignment** | Classes represent domain concepts | Classes represent database tables |
| **Business rule location** | Rules in domain layer | Rules scattered, duplicated |
| **Domain experts** | Accessible, consulted | No business context |

### 14.2 Strategic Alignment

| Question | Answer |
|----------|--------|
| Does the architecture support business scalability goals? | |
| Are technical decisions aligned with product roadmap? | |
| Do module boundaries match organizational structure? | |
| Is build vs. buy aligned with company strategy? | |

### 14.3 Long-term Evolution

| Aspect | Check | Status |
|--------|-------|--------|
| **Flexibility at uncertainty points** | Abstractions where requirements unclear | |
| **Migration paths** | Can evolve without rewrite | |
| **Technical runway** | Architecture supports 2-3 year vision | |
| **Learning captured** | Lessons documented in ADRs | |

---

## 15. Documentation & Knowledge Preservation

Ensuring code survives original authors.

### 15.1 Documentation Layers

| Layer | Purpose | Status |
|-------|---------|--------|
| **Code comments** | Why, not what | |
| **README** | Setup, purpose, quick start | |
| **API docs** | Contract specification | |
| **Architecture docs** | High-level design | |
| **ADRs** | Decision rationale | |
| **Runbooks** | Operational procedures | |

### 15.2 Comment Quality

| Good Comments | Bad Comments |
|---------------|--------------|
| Explain non-obvious business rules | Restate what code does |
| Document edge cases and gotchas | `i++ // increment i` |
| Link to relevant tickets/specs | Outdated, misleading info |
| Explain why, not what | Commented-out code |

### 15.3 Knowledge Transfer Readiness

| Check | Status |
|-------|--------|
| Could a new team member understand this without original authors? | |
| Are workarounds and hacks documented with context? | |
| Is there a glossary of domain terms? | |
| Are key stakeholders and contacts documented? | |

---

## Summary Scorecard

| Category | Weight | Score (1-5) | Weighted |
|----------|--------|-------------|----------|
| **1. Refactoring Indicators** | 10% | | |
| **2. Testability Architecture** | 10% | | |
| **3. Security Posture** | 10% | | |
| **4. Performance Characteristics** | 8% | | |
| **5. Cognitive Complexity** | 8% | | |
| **6. Code Evolution & Debt** | 7% | | |
| **7. Dependency Management** | 7% | | |
| **8. API Design Quality** | 7% | | |
| **9. Error Handling Philosophy** | 7% | | |
| **10. Observability Design** | 6% | | |
| **11. Concurrency Safety** | 5% | | |
| **12. Architectural Coherence** | 5% | | |
| **13. Production Readiness** | 5% | | |
| **14. Domain Knowledge** | 3% | | |
| **15. Documentation** | 2% | | |
| **TOTAL** | 100% | | |

### Scoring Interpretation

| Total Score | Assessment | Action |
|-------------|------------|--------|
| 4.5 - 5.0 | Exemplary | Minor improvements, maintain standards |
| 3.5 - 4.4 | Good | Address specific weak areas |
| 2.5 - 3.4 | Acceptable | Prioritized improvement plan needed |
| 1.5 - 2.4 | Poor | Major refactoring required |
| 1.0 - 1.4 | Critical | Consider rewrite vs. refactor analysis |

---

## Review Process

### Pre-Review
1. Identify scope (full codebase, specific module, or PR)
2. Gather context (architecture docs, recent changes, known issues)
3. Run automated checks (linting, static analysis, coverage)
4. Review recent code churn and hotspots

### During Review
1. Start with a skim to understand intent and scope
2. Check each dimension systematically
3. **Ask questions rather than dictate solutions**
4. Distinguish style preferences from genuine issues
5. Note patterns, not just individual instances
6. Consider how code behaves under failure, load, and evolution

### Post-Review
1. Prioritize findings by impact and effort
2. Create actionable tickets for significant issues
3. Track metrics over time
4. Share learnings with the team
5. Update this rubric based on learnings

---

## Key Principles

### What Senior Engineers See That Juniors Miss

| Dimension | Junior Focus | Senior Focus |
|-----------|--------------|--------------|
| **Testing** | Coverage percentage | Test architecture, mutation scores |
| **Security** | OWASP checklist | Threat modeling, attack surface |
| **Performance** | Avoiding slow code | Profiling-driven optimization |
| **Design** | Patterns applied | Patterns appropriate for context |
| **Evolution** | Current requirements | 2-3 year architecture runway |
| **Operations** | Code works | Code observable, deployable, recoverable |

### The Integration Perspective

Production-grade quality emerges not from perfection in any single dimension but from the integration of all concerns—understanding that:

- Security testing informs threat modeling
- Observability requires design-time decisions
- Testability enables both QA and production debugging
- Performance optimization must follow profiling
- Domain knowledge shapes architecture
- Documentation enables evolution

---

## References

- Martin, Robert C. "Clean Code: A Handbook of Agile Software Craftsmanship"
- Fowler, Martin. "Refactoring: Improving the Design of Existing Code"
- SOLID Principles - Robert C. Martin
- OWASP Code Review Guide v2.0
- SonarSource Technical Debt Measurement Guidelines
- Cognitive Complexity: A New Way of Measuring Understandability (SonarSource)
- Google SRE Book - Site Reliability Engineering
- Release It! - Michael Nygard
- Domain-Driven Design - Eric Evans
