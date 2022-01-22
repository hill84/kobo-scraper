<h1 align="center">Kobo scraper</h1>

<div align="center">
  
**Kobo scraper** is a Node.js service that uses puppeteer to scrape books data from <a href="https://kobo.com">kobo.com</a>.

![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/hill84/kobo-scraper.svg)

</div>

Run `npm install`. When finished, type `npm start` to run the scraping. You should see a new `books_[#].json` file for every page in the `/json` folder. Something like this: 

```json
[
  {
    "ISBN_13": 9788838940361,
    "covers": [
      "https://kbimages1-a.akamaihd.net/.../ah-l-amore-l-amore.jpg"
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
      "EUR": 9.99
    },
    "description": "Una nuova indagine per Rocco Schiavone costretto ad indagare da..."
  }
]
```
