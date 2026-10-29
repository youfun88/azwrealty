# Azure Waves Realty — azwrealty.com

Website for **Azure Waves Realty Inc**, a San Diego property management company.
Static HTML/CSS/JS, no build step. Content migrated from the previous WordPress site
(page URLs are kept the same, e.g. `/pricing/`, `/our-promise/`).

## Local preview

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy (CI/CD)

Pushing to `main` triggers `.github/workflows/deploy.yml`, which publishes the
site to **GitHub Pages**. No build step — the repo root is served as-is.

To serve it on the real domain later, add a `CNAME` file containing
`www.azwrealty.com` and point the domain's DNS at GitHub Pages.

## Structure

```
index.html                         home page
<page>/index.html                  one folder per page (keeps the old WordPress URLs)
styles.css                         theme + layout
script.js                          nav, scroll reveals, contact forms (FormSubmit, no backend)
assets/img/                        logo, favicon, social share image
404.html  robots.txt  sitemap.xml  llms.txt
```

## Contact forms

Forms post to [FormSubmit](https://formsubmit.co) → `contactusazw@gmail.com`.
The first submission triggers a one-time activation email to that inbox — confirm
it once and submissions flow through after that.
