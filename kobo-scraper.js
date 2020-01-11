const puppeteer = require('puppeteer');
const fs = require('fs');
const chalk = require('./chalk.js');

const debreaks = s => s.replace(/(\r\n|\n|\r)/gm,'');

const trim = s => s.replace(/^\s+|\s+$/g,'');

const norm = s => debreaks(trim(s));

const parsePrice = price => {
  const euro = price.split('€');
  if (euro.length > 1) {
    return { "euro" : parseFloat(euro[1].trim().replace(',', '.')) };
  }
  return null;
};

const parseISBN_13 = ISBN_13 => {
  const parsedNum = parseFloat(ISBN_13);
  const isNum = !isNaN(parsedNum);
  return isNum ? parsedNum : 0;
};

const blockRequests = async page => {
  await page.setRequestInterception(true);

  page.on('request', req => {
    if (req.resourceType() == 'stylesheet' || req.resourceType() == 'font' || req.resourceType() == 'image') {
      req.abort();
    } else {
      req.continue();
    }
  });
};

const scrapeBook = async props => {
  const { browser, url } = props;

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await blockRequests(page);
    await page.goto(url);
  
    const getValue = async props => {
      const { xpath, property = 'textContent' } = props;
      try {
        const [el] = await page.$x(xpath);
        const prop = await el.getProperty(property);
        const res = await prop.jsonValue();
        return norm(res);
      } catch (err) {
        return '';
      }
    };
  
    const ISBN_13 = await getValue({
      xpath: '/html/body/div[2]/div[2]/div[8]/div/div[1]/div/ul/li[4]/span'
    });
  
    const cover = await getValue({
      xpath: '/html/body/div[2]/div[2]/div[4]/div/div/div[1]/div[1]/div[1]/div/div/div/img',
      property: 'src'
    });
  
    const title = await getValue({
      xpath: '//*[@class="title"]'
    });
  
    const subtitle = await getValue({
      xpath: '//*[@class="subtitle"]'
    });
  
    const author = await getValue({
      xpath: '//a[@class="contributor-name"]'
    });
  
    const pages_num = await getValue({
      xpath: '//*[@id="about-this-book-widget"]/div/div[1]/div[2]/strong'
    });
  
    const publisher = await getValue({
      xpath: '/html/body/div[2]/div[2]/div[8]/div/div[1]/div/ul/li[1]'
    });
  
    const imprint = await getValue({
      xpath: '/html/body/div[2]/div[2]/div[8]/div/div[1]/div/ul/li[3]/a/span'
    });
  
    const publication = await getValue({
      xpath: '/html/body/div[2]/div[2]/div[8]/div/div[1]/div/ul/li[2]/span'
    });
  
    const description = await getValue({
      xpath: '//*[@id="synopsis"]/div/div'
    });
  
    const price = await getValue({
      xpath: '//*[@class="price"]'
    });
  
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

    const parsedISBN_13 = parseISBN_13(ISBN_13);
  
    const book = {
      ISBN_13: parsedISBN_13,
      covers: [cover],
      title,
      subtitle,
      author: { [author]: true },
      pages_num,
      publisher: publisher || imprint,
      publication,
      price: parsePrice(price),
      description,
      // incipit
    };

    await page.close();
    
    if (book.ISBN_13 && book.title && book.pages_num && book.author && book.publisher) {
      return book;
    }
  } catch (err) {
    throw new Error(err);
  }
};

const nextPage = async props => {
  const { browser, pageIndex, page, xpath } = props;

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

const getLinks = async props => {
  const { page, xpath, url } = props;

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

const scrapeBooks = async props => {
  const { browser, pageIndex = 1, url } = props;
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
    // console.log(links);
    const books = [];

    for (const index in links) {
      const link = links[index];
      const segment = link.substring(link.lastIndexOf('/') + 1);
      console.log(chalk.FgWhite, `${Number(index) + 1} of ${links.length}: ${segment}`, chalk.Reset);
      const book = await scrapeBook({ browser, url: link });
      // const book = { test: 'test' };
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
  }
};

(async () => {  
  const browser = await puppeteer.launch({ headless: true });
  
  const entryPoint = 'https://www.kobo.com/it/it/list/le-nostre-novita/bffF8FuYXEG3kcdpSnLkjg?fclanguages=it';

  await scrapeBooks({ browser, url: entryPoint });

  await browser.close();
})();