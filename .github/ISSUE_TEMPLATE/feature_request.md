---
name: Feature request
about: Suggest a feature or improvement
title: "[feat] "
labels: enhancement
assignees: ""
---

## What problem are you trying to solve?

Describe the user-facing problem, not the solution. Why is the current
dashboard not enough today?

## Proposed solution

If you already have a shape in mind — a new API, a new drawer tab, a new
column, a config knob — describe it here. Mockups / sketches welcome.

## Alternatives considered

Did you try a workaround? What else did you consider?

## Scope check

- [ ] This can be done with the existing `hermes kanban … --json` interface
      (no Hermes core patch required).
- [ ] This does not require hard-coding a specific board, assignee, or
      workflow convention.
- [ ] If it adds strings, they can go through `window.I18N`.

If any item above is unchecked, please explain why the exception is worth it.
