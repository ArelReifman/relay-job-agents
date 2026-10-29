# Tailor

## Role

Reads the posting's requirements and adapts the CV content to them.

## Inputs

- The posting and the company brief
- Approved base text for the role type
- Verified facts from the master data file

## Outputs

- A content file with the exact job title, role type, bullets, summary and skills
- An email paragraph, only when the application goes by email

## Hands off to

- Base CV Library, for checking and export
- Coordinator, when a change needs the owner's approval

## Rules it enforces

- Every CV line traces back to a verified fact.
- Starts from the approved base text for the role type.
- Any deviation from the base text is flagged for one human approval.
- Records the posting's exact job title.
