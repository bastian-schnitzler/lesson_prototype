# Lesson prototype mockups

Editable PlantUML Salt wireframes, with rendered SVG and PNG previews. Each screen lives with its source and images in one folder. The wireframes show padded web layouts; the app uses the dark slate/indigo design described in [SPEC.md](../../docs/SPEC.md).

| Folder | Screens |
| --- | --- |
| [01 — Lesson overview](01-lesson-overview/README.md) | Index and vocabulary/grammar artifact views |
| [02 — Vocabulary lesson](02-vocabulary-lesson/README.md) | Start page, six numbered stages, and results |
| [03 — Grammar lesson](03-grammar-lesson/README.md) | Start page, explanation, each exercise type, pre-exam placeholder, exam, and results |

The artifact views use a shared Outline component and category-specific Draft and Content components. Their cards show actual structured data; optional raw JSON is collapsed. Exercise previews in the artifact viewer do not create attempts or run countdowns. Wireframes show representative items; implemented viewers must display every item.

Practice has one primary Continue button: lock and show feedback, then confirm and advance. Flashcard reveal, speech, and keyboard movement controls have separate interaction roles. Only exam pages show countdowns; exam results are withheld until completion.

## Regenerate previews

Use PlantUML 1.2026.8 and Java (Salt does not require Graphviz). From the repository root:

```bash
rg --files doc/mockups -g '*.puml' -0 | xargs -0 java -Djava.awt.headless=true -jar /path/to/plantuml.jar -tsvg
rg --files doc/mockups -g '*.puml' -0 | xargs -0 java -Djava.awt.headless=true -jar /path/to/plantuml.jar -tpng
```

When publishing GitHub issues, embed applicable PNGs and link SVGs and Salt sources with verified repository URLs pinned to the agreed specification commit. See [issue asset mapping](../../docs/ISSUES.md#assets-to-include-when-publishing-applicable-issues).
