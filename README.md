# PDF Compare

Shared static PDF comparison viewer (PDF.js 4.10.38). No server or credentials required for building. Optional GitHub highlight synchronization remains client-side.

## Build for a book

```sh
node scripts/build.mjs /path/to/compare-config.json /path/to/book/docs
```

Example configuration: [tests/pickering.json](tests/pickering.json). All six fields are required. Use a unique stable `storageNamespace` for each book hosted under the same origin. Do not change existing namespaces: Pickering uses `pdf-comparison`, Simeon uses `simeon-pdf-comparison`. Existing localStorage, IndexedDB, JSON sync format and public compare.html addresses are preserved. Never put tokens in configuration.

Build outputs compare.html, highlight-store.mjs and vendor/pdfjs assets (exact npm version, including license). The book repository serves those files at its existing Pages URL. The original and translated PDFs are not copied into this repo.

```sh
npm ci --ignore-scripts
npm test
```

Tests exercise the actual generated application and both legacy namespaces. For a new book add a configuration and run the build during its existing Pages workflow. Use the default branch checkout to obtain the latest shared version. A scheduled build in consuming repositories refreshes published copies without changes to book content.
