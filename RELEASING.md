# Releasing

The package can be published as `dsh-approval-chime-win` on npm and as a
tagged release on GitHub. Both are driven by the `Release` workflow, but the
npm half only runs once the `NPM_TOKEN` secret exists: a tag without it just
creates the GitHub Release.

## One-time setup

1. Own the npm name: sign in to npm, and confirm `dsh-approval-chime-win` is
   still unpublished (`npm view dsh-approval-chime-win version` should return
   `E404`).
2. Create an npm access token that can publish and bypass 2FA, then add it to
   the repository as the `NPM_TOKEN` secret
   (**Settings → Secrets and variables → Actions**).
3. In the repository, add the topics `dsh`, `dsh-plugin`,
   `deepseek-harness`, `notification`, `windows` so the project is findable.

## Every release

1. Bump `version` in `package.json` following semver.
2. Move the changelog entries under a new heading in `CHANGELOG.md`.
3. Commit the bump:

   ```sh
   git commit -am "chore: release v1.1.0"
   ```

4. Tag and push:

   ```sh
   git tag v1.1.0
   git push origin main --tags
   ```

5. The workflow runs the tests, refuses a tag that disagrees with
   `package.json`, and attaches the packed tarball to a new GitHub Release. It
   publishes to npm only when the version is not on npm yet **and**
   `NPM_TOKEN` is configured; otherwise it says so and skips that step. A
   version you already published by hand is skipped as well.

## Publishing by hand

If the workflow is unavailable (for example, on a fork), the same steps work
locally:

```sh
node test/wav.test.mjs
npm pack                 # inspect the tarball first
npm publish --access public
gh release create v1.1.0 ./*.tgz --generate-notes
```

Without `gh`, create the release in the GitHub UI and upload the `.tgz` from
`npm pack`. The tarball is what offline users install; the repository archive
works too, but it also contains the tests and CI files.

## Checking an install

Before announcing a release, install it the way users will:

```sh
dsh plugin --profile demo add dsh-approval-chime-win
dsh --profile demo
```

Approvals must chime, and the bundle card must show the bell icon and the
localized title on both the Plugins page and **Settings → Built-in plugins**.
