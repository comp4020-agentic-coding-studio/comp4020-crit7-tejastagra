# Process overview

## What I built

I built the results system I wish ANU had. My marks sit in Canvas, my grades sit in ANUHub, and the maths connecting them lives in a spreadsheet, so ANU Grades brings them into one place. Staff set up the assessment, upload and release marks and set final grades, while students see an archive of every course, set targets and try "what if I get x/y on this" marks.

## How I got here

I did not start from scratch. My assignment 2 harness had taught me that a short CLAUDE.md pointing to a few focused topic files keeps the agent on track far better than one long file. So I reused that structure and wrote the new rules into it, starting with ANU's grading rules [`fd6986e`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-tejastagra/commit/fd6986e), [`d3c0fa2`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-tejastagra/commit/d3c0fa2). I did the same with the look. This is also a university website and my A2 site was clean, so I recycled a good chunk of its UI. When Claude drifted into a palette of its own, I had it measure A2's colours, weights and spacing and write the exact values into the harness so it would stop guessing [`92fd78f`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-tejastagra/commit/92fd78f).

It has become really easy to design and review a site with AI agents that each have one specific job. I gave Claude the idea and let it build a first version, then sent a UI/UX agent through the site to write a report on where a student would get lost. Claude took that report and rebuilt the pages around it [`7a9efde...8efcd9a`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-tejastagra/compare/7a9efde...8efcd9a). I then passed the new version to a product design agent, whose report on the visual language went back to Claude for a second round [`1618fde`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-tejastagra/commit/1618fde). In between I still made my own calls, like removing the create-account page and asking for white text on the buttons [`490a003`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-tejastagra/commit/490a003).

Every rule I gave went into the harness as its own commit before the code that followed it. I checked each round with the tests and phone-width screenshots, and at the end brought the harness back in line with the app [`b46822d`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-tejastagra/commit/b46822d).
