# Program Zilnic

Aplicație pentru iPhone (PWA) cu programul zilnic: taskuri de bifat, sală cu grupe musculare, alergare cu minim de km pe săptămână, alte sporturi, calorii și proteine cu grafice, apă, somn, greutate, stare, notițe și un jurnal personal.

Funcționează fără internet după prima deschidere. Datele stau pe telefon (în aplicație); din **Setări → Date & backup** poți exporta și importa un fișier de backup.

## Ce conține

| Fișier | Rol |
|---|---|
| `src/app.js` | toată logica aplicației |
| `src/styles.css` | aspectul (temă luminoasă și întunecată) |
| `src/shell.html` | structura de bază (bara de jos etc.) |
| `build.py` | construiește `docs/` (aplicația de pus pe iPhone) și `artifact.html` (versiunea din Claude) |
| `tools/make_icons.js` | generează iconițele |
| `docs/` | **asta publică GitHub Pages**: `index.html`, `manifest.webmanifest`, `sw.js`, `icons/` |

## Cum o pui pe iPhone

Aplicația trebuie să stea pe o adresă `https://`. Variantele gratuite:

### Varianta A: GitHub Pages (recomandat)
Folderul `docs/` din acest repository e publicat de GitHub Pages la
**https://centoser-ai.github.io/program-zilnic/**
(Settings → Pages → Deploy from a branch → `main` / `docs`).

### Varianta B: Netlify Drop (dacă ai un calculator)
1. Intră pe https://app.netlify.com/drop
2. Trage folderul `docs` în pagină. Primești o adresă `https://...netlify.app`.

### Pe telefon
1. Deschide adresa în **Safari**.
2. Apasă **Partajează** (pătratul cu săgeata în sus) → **Adaugă pe ecranul principal** → **Adaugă**.
3. Deschide aplicația de pe ecranul principal. De acum merge și fără internet.

## Modificări
Editezi fișierele din `src/`, apoi rulezi:

```bash
python3 build.py
```

Când publici o versiune nouă, crește `APP_VERSION` din `src/app.js`, ca telefonul să ia actualizarea.
