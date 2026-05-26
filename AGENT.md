# Agent Notes

## GitHub Pages Deployment Source
- Public site deploys from this repository: `the-golden-unicorns/the-golden-unicorns.github.io`.
- Push website changes directly here (current default branch: `main`) to publish.
- Do not treat `the-golden-unicorns/app` as the production Pages publish source.

## GitHub Auth Preference
- For GitHub actions in this repo, source `/Users/stevenjordan/Developer/.ops-secrets` and run `gh` as `GH_TOKEN="$GH_TOKEN" /opt/homebrew/bin/gh ...`.
- Never print or paste the token itself.
