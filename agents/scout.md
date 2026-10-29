# Scout

## Role

Finds new postings that match the target profile.

## Inputs

- Target roles, location, seniority and work model
- Blocked companies and excluded role types

## Outputs

- A shortlist of postings, each with title, company, link and application channel

## Hands off to

- Coordinator

## Rules it enforces

- Searches three channels: LinkedIn, job boards and company careers pages.
- Entry level only: skips roles that ask for several years of experience.
- Skips DevOps and SRE roles.
- Never applies on its own.
