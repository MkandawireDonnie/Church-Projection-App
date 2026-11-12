# Church Projector

Desktop app (Electron) for projecting song lyrics, Bible verses, documents and presentations to a second screen, with service planning. Purple / white / green theme.

## Get the installers
Installers could not be built in the authoring environment (no network). Two ways to build them:
1. **GitHub (no local setup):** push this folder to a GitHub repository, open *Actions → Build installers → Run workflow*. Download `installers-ubuntu-latest` (AppImage + .deb) and `installers-windows-latest` (.exe) from the run page.
2. **Locally:** install Node.js 20+, then in this folder: `npm install`, `npm test`, then `npm run dist:linux` (on Linux) or `npm run dist:win` (on Windows). Output is in `dist/`. To try it without installing: `npm start`.

Install: Windows – run the .exe. Debian/Ubuntu – `sudo dpkg -i church-projector_*.deb`. Other Linux – `chmod +x *.AppImage && ./*.AppImage`.

## Using it
1. **Settings:** church name, logo, projector display, font size, colours.
2. **Open projector** (right panel). With two displays it goes fullscreen on the non-primary one; with one display it opens a window you can drag.
3. **Songs:** add/edit lyrics (blank line = new slide), or *Find lyrics online* (needs internet; review before saving).
4. **Bible:** *Import Bible file…* (UTF-8 .txt, one verse per line: `John 3:16 For God so loved…`), or fetch a passage online (KJV/WEB); fetched verses are stored for offline use. Search by reference (`jn 3:16-18`) or keywords.
5. **Documents:** import .txt .md .docx .pdf .rtf .html; text is extracted and split into slides.
6. **Presentations:** slides separated by `---`.
7. **Service:** create a service, use "+ Service" buttons to add items, reorder, project any item or load the whole service.
Keys: → / Space next, ← previous, B blank.
Data: `church-data.json` in the app's user-data folder (offline, local).

## Status (honest checklist)
- [x] Core logic (storage, Bible parsing/search, slide splitting): unit-tested, passing (`npm test`)
- [x] All JS syntax-checked
- [ ] **Not yet run in Electron** – UI, projector window and dual-screen output are untested
- [ ] **Installers not built** – use the workflow above
- [ ] Online lyrics/Bible fetch untested (needs internet)

## Known limitations
- Database is a local JSON file (atomic writes, corrupt-file backup), not SQLite.
- No Bible text is bundled (licensing); import your own or fetch KJV/WEB online.
- Lyrics come from the free lyrics.ovh service; coverage is incomplete and lyrics may be copyrighted – check your CCLI/licence.
- PowerPoint (.pptx) and scanned (image-only) PDFs are not imported.
- Installers are unsigned (Windows SmartScreen will warn).
