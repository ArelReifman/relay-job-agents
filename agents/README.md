# Agents

Relay runs as a team of nine agents. Each one has a single responsibility and reports to the Coordinator.

| Agent | Role | Hands off to |
|---|---|---|
| [Coordinator](coordinator.md) | Routes each posting through the team and is the only agent that talks to the owner. | Research, Tailor, Base CV Library, Match, Submit and Tracker, in pipeline order; The owner, for approvals only |
| [Scout](scout.md) | Finds new postings that match the target profile. | Coordinator |
| [Research](research.md) | Writes a short company brief before an application or an interview. | Coordinator, which passes the brief to Tailor and Interview Coach |
| [Tailor](tailor.md) | Reads the posting's requirements and adapts the CV content to them. | Base CV Library, for checking and export; Coordinator, when a change needs the owner's approval |
| [Base CV Library](base-cv-library.md) | Keeps the approved base CV for each role type, picks the right one for a posting and exports it through the Core Engine. | Match |
| [Match](match.md) | Compares the final PDF with the posting and scores the fit. | Submit, when the score clears the fit threshold; Tailor, through the Coordinator, when it does not |
| [Submit](submit.md) | Sends the application through the channel the posting asks for. | Tracker and Coordinator |
| [Tracker](tracker.md) | Follows every sent application across all boards and channels. | Coordinator, only when something changes or a decision is needed; Interview Coach, when an interview is scheduled |
| [Interview Coach](interview-coach.md) | Prepares the candidate for a specific interview. | Coordinator |
