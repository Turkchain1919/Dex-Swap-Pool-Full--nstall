# Translation glossary

The terminology cascade `@uniswap/i18n-cli` loads for app string translations
(`core/`, `locales/`). It **replaces** the seed glossary bundled inside the CLI
package rather than merging with it, so entries here are only ever **added** —
never wholesale replaced. This directory starts as a byte-for-byte copy of that
seed; deleting a file silently drops its terms from every run.

Two consequences of the replace-not-merge precedence:

- **CLI seed updates stop flowing here.** Once this directory exists, a new
  `@uniswap/i18n-cli` version's seed-glossary improvements do NOT reach this
  repo — bumping `I18N_CLI_VERSION` looks like it updates terminology but
  doesn't. Whoever bumps the CLI version should diff the package's
  `seed/glossary` against this directory and port anything wanted.
- **Unused locale files ride along on purpose** (e.g. `locales/fil-PH.yml` —
  no app locale maps to it). They cost nothing at runtime and keeping the
  directory a strict superset of the seed keeps the copy-fidelity story
  checkable.

The `../../style/locales/*.md` paths in the locale files' comments point at
per-locale style guides that ship inside the `@uniswap/i18n-cli` package and are
deliberately not copied here, so they resolve for the CLI but not in this repo.
The comments are left untouched to keep the glossary byte-identical to the seed;
read the guides from the installed package.

Every file here is validated by `scripts/i18n-glossary.test.ts` in PR CI —
the same checks the CLI applies at load time — so a malformed entry fails the
PR instead of the next scheduled translation run.

What lands here, and what does not:

- **Terminology corrections** from translation-PR reviews — a wrong or
  inconsistent rendering of a term — become glossary entries, so the fix
  applies to every future run instead of one string.
- **One-off tone or phrasing fixes** stay as the human's edit in the locale
  file. A hand-edited string reads as untracked and is not re-queued, so the
  pipeline will not overwrite it.
- An automated sweep may **propose** entries, but must never auto-commit them:
  a wrong `forbidden` term fails runs, so every entry needs a human review.
