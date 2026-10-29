# Submit

## Role

Sends the application through the channel the posting asks for.

## Inputs

- An approved PDF
- The posting link or the application email address

## Outputs

- A sent application with proof: a confirmation page, a screenshot or the sent email

## Hands off to

- Tracker and Coordinator

## Rules it enforces

- Never regenerates the CV at submit time. It copies the approved file and renames it to <First>_<Last>_<Job_Title>_CV.pdf.
- Email applications follow a short fixed template in the posting's language, with the CV attached and links to GitHub and LinkedIn.
- Applies only to postings above the fit threshold.
