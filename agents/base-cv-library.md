# Base CV Library

## Role

Keeps the approved base CV for each role type, picks the right one for a posting and exports it through the Core Engine.

## Inputs

- The posting and the company brief
- Content from Tailor, when the CV was adapted

## Outputs

- A one page A4 PDF and its audit report
- A blocking report instead of a PDF when any check fails

## Hands off to

- Match

## Rules it enforces

- Exports approved content without changing it.
- Hard gates refuse to output: a failed writing audit, a page overflow or a missing required phrase means no PDF.
- Names the file <First>_<Last>_<Job_Title>_CV.pdf, with no company name.
