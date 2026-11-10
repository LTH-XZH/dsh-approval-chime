# Contributing

Thanks for taking a look. This plugin is intentionally small; the notes below keep it that way.

## Reporting a bug

Open an issue and include:

- what you expected and what happened;
- your Windows version and the DeepSeek Harness version;
- how you installed the plugin (Git address, ZIP folder, ...);
- any `[dsh-approval-chime]` line printed in the Host console.

## Sending a change

1. Fork the repository and branch from `main`.
2. Run `node test/wav.test.mjs`; it must pass. There is no build step and no lockfile to update.
3. Keep one pull request to one concern, with a short description of what changed and how you tested it ("heard the chime on Windows 11" is a valid test report).
4. When behavior or install steps change, update `README.md` and `README.zh.md` together, and add an entry to `CHANGELOG.md` for user-visible changes.

## Design rules

- No runtime dependencies, no network calls, no audio files in the repository.
- Playback must never delay or change an approval: the listener returns `next()` and swallows its own failures.
- On non-Windows platforms the plugin installs and stays silent; real support there needs a contributor with the hardware to verify it.
- Read WAV files that already exist on the system; amplify in memory, never write audio to disk.

## License

Contributions are accepted under the MIT license; see [LICENSE](LICENSE).
