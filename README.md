# Savana Jerky – jednostránkový web (verze 2)

Verze 2 „Studio“ (inspirace šablonou Brewns z getlayers.ai, vlastní provedení): světlé produktové studio
s interaktivním 3D sáčkem (`assets/js/pouch3d.js`, three.js), karty naklánějící se k myši, text rozsvěcovaný
scrollováním, 24hodinový ciferník výroby a účtenka s výživovými hodnotami z tiskárny.
Styly: `assets/css/site.css`, interakce: `assets/js/site.js`, etikety pro 3D: `assets/tex/`.

Živě: https://vladsc23.github.io/jerky-2-version/

Statický web (HTML + CSS + JS, bez frameworku). Funguje na jakémkoli hostingu.

## Struktura

| Soubor | Co obsahuje |
|---|---|
| `index.html` | celý obsah stránky, SEO (title, description, keywords, Open Graph), strukturovaná data schema.org |
| `assets/css/style.css` | vzhled; barvy a písma nahoře v sekci `:root` |
| `assets/js/main.js` | animace a přechody, menu, filtr produktů, formulář |
| `assets/img/` | fotky a 3D rendery sáčků (WebP), OG obrázek pro sdílení, ikony |
| `sitemap.xml`, `robots.txt` | pro vyhledávače |
| `favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `site.webmanifest` | ikony |
| `_build/` | zdroje pro obrázky (etikety, 3D render, skripty). **Na hosting nenahrávejte.** |

## Před zveřejněním změňte

1. **Doménu** `https://www.savanajerky.cz/` – najděte a nahraďte ve všech souborech
   (`index.html`, `sitemap.xml`, `robots.txt`).
2. **E-mail** `info@savanajerky.cz` – v `index.html` (kontakt, formulář `data-mailto`, schema.org).
3. **Telefon** – v sekci Kontakt je připravený zakomentovaný řádek.
4. **Ceny, výživové hodnoty a složení** – teď jsou orientační. Před skutečným prodejem musí odpovídat
   etiketě / laboratornímu rozboru. Ceny jsou na dvou místech: karty produktů a JSON-LD (`"price"`).
5. Až poběží prodej: v JSON-LD změňte `"availability": "https://schema.org/PreOrder"` na `InStock`.
6. Při změně obsahu aktualizujte `<lastmod>` v `sitemap.xml`.

## Jak dostat web do Googlu (a Seznamu)

1. Nahrajte web na hosting (zdarma např. Netlify, Cloudflare Pages, GitHub Pages; doména .cz cca 200–300 Kč/rok).
2. [Google Search Console](https://search.google.com/search-console) → přidat doménu → ověřit → *Soubory Sitemap* → `sitemap.xml`.
3. [Seznam Webmaster](https://webmaster.seznam.cz/) → přidat web → odeslat sitemapu (v ČR důležité).
4. Zkontrolujte strukturovaná data: [Rich Results Test](https://search.google.com/test/rich-results).
5. Založte firmu v [Google Business Profile](https://business.google.com/) a [Firmy.cz](https://www.firmy.cz/) – pomůže to lokálnímu hledání „jerky Jihlava“.

Klíčová slova, na která je stránka optimalizovaná: *jerky, sušené maso, hovězí jerky, pštrosí jerky,
sušené hovězí maso, proteinový snack, jerky bez glutamátu, jerky Jihlava / Vysočina*.
(Meta tag `keywords` Google ignoruje – rozhoduje text na stránce, nadpisy a popisky obrázků.)

## Lokální náhled

```
python _build/serve.py
```
a otevřete http://127.0.0.1:8080

## Kontaktní formulář

Formulář nepotřebuje server – otevře e-mailového klienta návštěvníka s předvyplněnou zprávou.
Pro odesílání přímo z webu stačí napojit např. Formspree nebo Netlify Forms (změna atributů `<form>`).

## Obrázky

- Fotky jídla: [Pexels](https://www.pexels.com/) (licence Pexels – volné komerční použití). Pro reálný provoz je vhodné nahradit vlastními fotkami výrobků.
- Sáčky: vlastní 3D vizualizace. Přegenerování:
  1. `python _build/gen_labels.py <složka s fotkami>` – etikety (texty, barvy příchutí jsou ve `VARIANTS`)
  2. `python _build/render_server.py 8767` a otevřít http://127.0.0.1:8767/render.html – 3D render do `_build/renders`
  3. `python _build/build_assets.py <složka s fotkami>` – WebP obrázky, OG obrázek a ikony do `assets/img`
