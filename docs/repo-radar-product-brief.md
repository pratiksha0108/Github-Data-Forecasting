# Repo Radar: from activity to a defensible decision

Status: independent portfolio prototype. No customer adoption, commercial impact, or production forecasting performance is claimed.

## Why this exists

A technical lead can find activity charts easily. The harder task is explaining which changes matter, whether a forecast deserves trust, and how a planning assumption changes the outcome. Repo Radar connects those steps in a free, self-contained browser workflow.

**Target user hypothesis:** a technical lead or product manager maintaining a developer-facing product.

**Job to be done:** when incoming activity changes, explore the evidence and communicate a capacity scenario without confusing activity with individual productivity.

This audience and need are hypotheses, not findings from customer interviews.

## The workflow

1. **Signal overview:** inspect real monthly issue or pull-request counts, quarterly change, and the activity rhythm. Keep measures separate.
2. **Model lab:** compare four interpretable forecasting baselines on identical rolling one-month tests. Inspect actuals, predictions, MAE and WAPE.
3. **Capacity studio:** change incoming volume, fixed handling capacity and starting queue. Export the scenario and its limitations as a decision brief.

The product does not recommend staffing levels, estimate delivery dates, score engineers, or identify the cause of a spike.

## Three disciplines, one artifact

| Discipline           | Evidence in this project                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Data analysis        | Source attribution, complete-month aggregation, distinct issues/PR measures, missing-data rejection, time-respecting validation, zero-denominator handling   |
| Software development | Reproducible ingestion script, separate pure calculation module, local CSV import, automated domain tests, accessible controls, static continuous deployment |
| Product management   | Explicit user/job hypothesis, connected decision workflow, scope trade-offs, failure states, exportable rationale, evaluation plan                           |

## Data contract

- Source: public GitHub REST repository issue listings for pallets/flask and pallets/jinja.
- Window: October 2023 through September 2026 inclusive, UTC calendar months.
- Every pull request is also an issue in this API. The ingestion script uses the pull_request field to classify records and avoid double counting.
- Pages are retrieved in descending creation order until the start boundary is reached. An incomplete retrieval fails without publishing a partial snapshot.
- Counts are aggregated by created_at, irrespective of current open/closed state.
- Published data contains only month and aggregate counts. No issue bodies, usernames, email addresses or other personal fields are retained.
- Included counts, page counts, extraction timestamp and a SHA-256 fingerprint of minimal numeric/timestamp records are retained for provenance.
- Metadata can change after deletion or transfer. Re-running the same extraction can therefore change the fingerprint. The fingerprint is an audit aid, not a guarantee of historical immutability.
- Both repositories belong to one ecosystem. They are not representative of all engineering teams.

Source references: [GitHub issue endpoint](https://docs.github.com/en/rest/issues/issues#list-repository-issues), [Flask](https://github.com/pallets/flask), [Jinja](https://github.com/pallets/jinja). Aggregate factual counts are calculated for this project; upstream source code and issue content are not redistributed or relicensed.

## Analytical design

Four baselines are intentionally transparent:

- Trailing 3-month average.
- Repeat the most recent month.
- Least-squares linear trend on the most recent 12 months, clipped at zero.
- Same calendar month in the previous year.

All forecasts are rounded to whole counts before evaluation and planning. This matches the display but can differ from evaluation on unrounded predictions.

The last six months are evaluated using an expanding training window and one-step predictions. Each test trains only on earlier observations. MAE reports count error; WAPE divides summed absolute error by summed actual counts. WAPE is undefined for an all-zero holdout, and is displayed as unavailable rather than zero.

The lowest observed MAE selects the initial model. Ties use method order. Model selection and scoring use the same six months, creating selection optimism. A separate untouched final test set and longer-horizon validation are necessary before deployment. Six one-step tests do not establish three- or six-month accuracy. No statistical confidence interval is shown.

## Planning assumptions

Monthly queue = max(0, previous queue + rounded adjusted arrivals - capacity).

Capacity starts at the rounded trailing 3-month observed average, with a minimum of one. It is a demo assumption, not observed throughput. Starting queue defaults to zero and is not the repository's actual backlog. Work items are treated as equally sized, capacity is constant and unused capacity does not carry over.

These simplifications make a trade-off explorable, not operationally authoritative.

## Why not add a complex model first?

The original repository contains separate forecasting services. Running those on static hosting would require a backend and additional maintenance. The current product prioritizes inspectable evidence, a working decision loop, and zero credentials or paid services.

A more sophisticated model should be added only if it improves a predeclared out-of-sample metric and the user can still explain its limitations. Visual polish alone is not evidence of model quality.

## Proposed usability study

Recruit 5 technical leads or engineering/product managers. This is a proposed study, not completed research.

Tasks:

1. Identify which repository and measure are being inspected.
2. Describe one change in observed activity without inventing a cause.
3. Find the lower-error baseline and explain why this is not a guarantee.
4. Adjust a demand shock until a queue forms.
5. Export a brief and identify which numbers are assumptions.

Proposed success criteria:

- At least 4 of 5 participants complete the core loop without facilitator help.
- No participant interprets the simulated queue as observed backlog.
- At least 4 of 5 distinguish the forecast from observed history.
- Record time to complete and comprehension errors; establish a baseline before making improvement claims.

Collect feedback with consent. Do not add behavioral tracking or transmit uploaded CSV data without a separate privacy decision.

## Risks and next evidence

| Risk                                           | Current mitigation                                  | Next evidence                                               |
| ---------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------- |
| Counts mistaken for productivity               | Repeated contextual caveats; no individual rankings | Task-based comprehension test                               |
| Model winner overtrusted                       | Absolute errors and limitations adjacent to charts  | Independent holdout and rolling multi-step evaluation       |
| Capacity treated as a staffing prescription    | Hypothetical labels; no salary or effort estimates  | Actual item complexity and handling-time data               |
| Missing import months silently treated as zero | Reject duplicates and gaps                          | Test CSV errors with target users                           |
| Animation distracts or excludes                | Reduced-motion support and manual toggle            | Keyboard and assistive-technology study                     |
| Unrepresentative examples                      | Two related repositories explicitly labeled         | Broader licensed benchmark after defining the decision need |

## Scope for this release

Included: data snapshot, validation, charts, model comparison, scenario planning, local import, downloads, tour, keyboard controls, reduced motion and responsive layouts.

Excluded: live credentials, private repositories, notifications, collaboration, causal explanations, customer outcomes, LSTM/Prophet services and production decision automation.
