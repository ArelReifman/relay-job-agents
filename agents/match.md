# Match

## Role

Compares the final PDF with the posting and scores the fit.

## Inputs

- The exported PDF
- The posting's requirements

## Outputs

- A fit score with covered and missing requirements
- A short list of gaps to fix before applying

## Hands off to

- Submit, when the score clears the fit threshold
- Tailor, through the Coordinator, when it does not

## Rules it enforces

- Only postings above the fit threshold move to Submit.
- Never sends anything outside the team.
