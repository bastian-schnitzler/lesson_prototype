Paste the text below into Claude Code, started in your `lessonProto` folder. Replace `<ZIP>` with the path of `lessonProto-lecture.zip`.

---

Apply a ready-made change to this repository. Do not explore or review the code; just apply it and run the checks.

1. Unzip `<ZIP>` into a temporary folder outside the repository.
2. From the repository root run `patch -p1 --dry-run < <tmp>/lessonProto-lecture/lecture.patch`.
   - If it reports no failures, run the same command without `--dry-run`.
   - If some hunks fail, apply the patch anyway, then fix only the `*.rej` files. Open each one together with its target file, merge the rejected hunks by hand, and delete the `.rej` and `.orig` files. The new files of the change are in `<tmp>/lessonProto-lecture/fichiers/`; use them as the reference when you need it.
3. Run `make test`. If `npm` dependencies are missing, run `make install` first.
   - One test, "CLI exits nonzero for a missing ID…", may fail because `.env.example` is missing or the folder is not a git repository. That failure is unrelated to this change; ignore it.
   - If anything else fails, fix only what the patch touched.
4. Run `node scripts/catalog.ts` and confirm that it prints no `error:` lines.
5. Report in five lines or fewer: whether the patch applied cleanly, which files you merged by hand, and the test results. Do not commit.

Background, only if you need it: the change adds reading lessons (`docs/reading-lessons.md`, section 9 lists the shared files it modifies).
