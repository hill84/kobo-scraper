const puppeteer = require('puppeteer');
const fs = require('fs');
const chalk = require('./chalk.js');

const debreaks = (s) => s.replace(/(\r\n|\n|\r)/gm,'');

const trim = (s) => s.replace(/^\s+|\s+$/g,'');

const norm = (s) => debreaks(trim(s));

const parseISBN_13 = (ISBN_13) => {
  const parsedNum = parseFloat(ISBN_13);
  const isNum = !isNaN(parsedNum);
  return isNum ? parsedNum : 0;
};

const blockRequests = async (page) => {
  // console.log('blockRequests');
  await page.setRequestInterception(true);

  page.on('request', req => {
    if (req.resourceType() == 'stylesheet' || req.resourceType() == 'font' || req.resourceType() == 'image') {
      req.abort();
    } else {
      req.continue();
    }
  });
};

const scrapeBook = async ({ browser, url }) => {
  // console.log('scrapeBook');
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await blockRequests(page);
    await page.goto(url);
  
    const getValue = async ({ xpath, property = 'textContent', json = false }) => {
      try {
        const [el] = await page.$x(xpath);
        const prop = await el.getProperty(property);
        const res = await prop.jsonValue();
        return json ? JSON.parse(res) : norm(res);
      } catch (err) {
        return json ? {} : '';
      }
    };

    /* const incipitHandler = await page.$x('//div[@class="instantpreview-hitbox"]'); 
  
    if (incipitHandler.length > 0) {
      await incipitHandler[0].click();
      // await page.waitForSelector('#modal-content', { visible: true });
      await page.waitForXPath('//*[@id="instantpreview-reading-area"]').then(() => console.log('got it')).catch(err => console.error(err));
    } else {
      throw new Error("Link not found");
    }
    
    const incipit = await getValue({
      xpath: '//*[@id="instantpreview-reading-area"]'
    }); */
  
    // TODO: fix it!
    const pages_num = await getValue({
      xpath: '//*[@class="stat-desc"]/strong'
    });
  
    const description = await getValue({
      xpath: '//*[@id="synopsis"]/div/div'
    });

    const metadata = await getValue({
      xpath: '//*[@class="RatingAndReviewWidget"]/script',
      json: true
    });

    const { author, name, publisher, workExample } = metadata || {};
  
    // TODO: go Typescript, for God's sake!
    const book = {
      // ISBN_13: number;
      // authors: Record<string, boolean>;
      // covers: string[];
      // description: string;
      // incipit: string;
      // pages_num: number;
      // price: Record<string, number>;
      // publication: string; // "2022-01-20T05:00:00Z"
      // publisher: string;
      // title: string;
      covers: [],
      subtitle: '',
      title: '',
    };

    book.pages_num = pages_num ? Number(pages_num) : 0;

    if (description) {
      book.description = description;
    }

    if (name) {
      book.title = name;
    }

    if (workExample) {
      const { alternativeHeadline, datePublished, image, isbn, potentialAction } = workExample;

      if (image) {
        book.covers.push(image);
      }
      
      if (alternativeHeadline) {
        book.subtitle = alternativeHeadline;
      }

      if (isbn) {
        book.ISBN_13 = parseISBN_13(isbn);
      }

      if (datePublished) {
        book.publication = datePublished;
      }

      if (potentialAction?.expectsAcceptanceOf) {
        const { expectsAcceptanceOf } = potentialAction;
        if (expectsAcceptanceOf) {
          if (Array.isArray(expectsAcceptanceOf)) {
            if (!book.price) book.price = {};
            expectsAcceptanceOf.forEach(({ price, priceCurrency }) => {
              book.price[priceCurrency] = price;
            });
          } else {
            const { price, priceCurrency } = expectsAcceptanceOf;
            book.price = { [priceCurrency]: price };
          }
        }
      }
    }

    if (author) {
      if (Array.isArray(author)) {
        if (!book.authors) book.authors = {};
        author.forEach(({ name }) => {
          book.authors[name] = true;
        });
      } else {
        book.authors = { [author.name]: true };
      }
    }

    if (publisher) {
      if (Array.isArray(publisher)) {
        book.publisher = publisher[0].name;
      } else {
        book.publisher = publisher.name;
      }
    }
    
    // console.log({ book });

    await page.close();
    
    if (book.ISBN_13) {
      return book;
    }
  } catch (err) {
    throw new Error(err);
  }
};

const nextPage = async ({ browser, pageIndex, page, xpath }) => {
  // console.log('nextPage');
  const [nextPage] = await page.$x(xpath);
  if (nextPage) {
    const prop = await nextPage.getProperty('href');
    const url = await prop.jsonValue();
    console.log(chalk[nextPage ? 'FgGreen' : 'FgRed'], `Next page${nextPage ? '' : ' not'} found`, chalk.Reset);
  
    await scrapeBooks({
      browser,
      pageIndex,
      url
    });
  }
};

const getLinks = async ({ page, xpath, url }) => {
  // console.log('getLinks');
  await page.goto(url);

  const elements = await page.$x(xpath);
  console.log(chalk[elements.length ? 'FgGreen' : 'FgRed'], `${elements.length} elements found`, chalk.Reset);

  if (elements.length > 0) {
    const links = [];
    for (const el of elements) {
      const prop = await el.getProperty('href');
      const link = await prop.jsonValue();
      links.push(link);
    }
    return links;
  }
};

const scrapeBooks = async ({ browser, pageIndex = 1, url }) => {
  // console.log('scrapeBooks');
  const page = await browser.newPage();
  
  await page.goto(url);

  blockRequests(page);

  console.log(chalk.FgCyan, `Scraping page ${pageIndex} at ${url}`, chalk.Reset);

  const links = await getLinks({
    page,
    xpath: '//a[@class="item-link-underlay"]',
    url
  });

  if (links) {
    const books = [];

    for (const index in links) {
      const link = links[index];
      const segment = link.substring(link.lastIndexOf('/') + 1);
      
      console.log(chalk.FgCyan, `${Number(index) + 1} of ${links.length}: ${segment}`, chalk.Reset);
      
      const book = await scrapeBook({ browser, url: link });

      if (book) books.push(book);
    }
    
    fs.writeFile(
      `./json/books_${pageIndex}.json`,
      JSON.stringify(books, null, 2),
      err => err ? (
        console.error(chalk.BgRed, 'Data not written!', err, chalk.Reset)
      ) : (
        console.log(chalk.FgGreen, 'Data written!', chalk.Reset)
      )
    );

    await nextPage({
      browser,
      pageIndex: pageIndex + 1,
      page,
      xpath: '//a[@class="next"]'
    });
  } else {
    console.log(chalk.BgRed, 'No links', chalk.Reset);
  }
};

(async () => {  
  const browser = await puppeteer.launch({ headless: false }); // TODO: fix headless: true
  
  const url = 'https://www.kobo.com/it/it/list/le-nostre-novita/bffF8FuYXEG3kcdpSnLkjg?fclanguages=it';

  await scrapeBooks({ browser, url });

  await browser.close();
})();