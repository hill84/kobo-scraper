<h1>Kobo scraper</h1>

**Kobo scraper** is a Node.js service that uses puppeteer to scrape books data from <a href="https://kobo.com">kobo.com</a>.

Run `npm install`. When finished, type `npm start` to run the scraping. You should see a new `books_[#].json` file for every page in the `/json` folder. Something like this: 

```json
[
  {
    "ISBN_13": 9788838940361,
    "covers": [
      "https://kbimages1-a.akamaihd.net/615b6598-7a7d-402b-b7b3-5bee4a473406/353/569/90/False/ah-l-amore-l-amore.jpg"
    ],
    "title": "Libri simili a Ah l'amore l'amore",
    "subtitle": "",
    "author": {
      "Antonio Manzini": true
    },
    "pages_num": "258",
    "publisher": "Sellerio Editore",
    "publication": "9 gennaio 2020",
    "price": {
      "euro": 9.99
    },
    "description": "Una nuova indagine per Rocco Schiavone costretto ad indagare da un letto di un ospedale per un caso di malasanità. E intanto il vicequesto ha quasi cinquant’anni, certe durezze si attenuano, forse un amore si affaccia. Sullo sfondo prendono più rilievo le vicende private della squadra. E immancabilmente un’ombra, di quell’oscurità che mai lo lascia, osserva da un angolo della strada lì fuori."
  }
]
```