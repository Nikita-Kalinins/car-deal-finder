let analysedListings = [];

const CURRENT_YEAR = new Date().getFullYear();
const AVG_KM_PER_YEAR = 15000;

function getExpectedMileage(year) {
  const age = CURRENT_YEAR - year;
  return age * AVG_KM_PER_YEAR;
}

function scoreMileageForYear(mileage, year) {
  if (!mileage || !year) return 50;
  const expected = getExpectedMileage(year);
  const ratio = mileage / expected;
  // ratio < 1 means lower than expected (good), > 1 means higher (bad)
  if (ratio <= 0.5) return 100;
  if (ratio <= 0.75) return 85;
  if (ratio <= 1.0) return 70;
  if (ratio <= 1.25) return 50;
  if (ratio <= 1.5) return 30;
  if (ratio <= 2.0) return 15;
  return 0;
}

function scorePriceInGroup(price, allPrices) {
  if (!price || allPrices.length < 2) return 50;
  const min = Math.min(...allPrices);
  const max = Math.max(...allPrices);
  if (max === min) return 50;
  const ratio = (price - min) / (max - min);
  return Math.round(100 - (ratio * 100));
}

function scoreYear(year) {
  if (!year) return 50;
  const age = CURRENT_YEAR - year;
  if (age <= 1) return 100;
  if (age <= 2) return 95;
  if (age <= 3) return 88;
  if (age <= 4) return 80;
  if (age <= 5) return 72;
  if (age <= 6) return 64;
  if (age <= 7) return 55;
  if (age <= 8) return 46;
  if (age <= 10) return 35;
  if (age <= 12) return 25;
  return 15;
}

function scrapeListings() {
  const listings = [];
  const cards = document.querySelectorAll('[data-testid^="listing-card-index"]');

  cards.forEach(card => {
    try {
      const titleEl = card.querySelector('a[class*="Card"]') || card.querySelector('a');
      const priceEl = card.querySelector('[class*="Price"]') || card.querySelector('[class*="price"]');

      const allImages = card.querySelectorAll('img');
      let image = null;
      let largestWidth = 0;
      allImages.forEach(img => {
        if (img.naturalWidth > largestWidth || img.width > largestWidth) {
          largestWidth = img.naturalWidth || img.width;
          image = img.src;
        }
      });

      const linkEl = card.querySelector('a[href*="/cars/"]') || card.querySelector('a');
      const link = linkEl ? (linkEl.href.startsWith('http') ? linkEl.href : 'https://www.donedeal.ie' + linkEl.getAttribute('href')) : null;

      const allTags = card.querySelectorAll('[class*="Tag"], [class*="tag"], [class*="Detail"], [class*="detail"], span, li');

      if (!titleEl) return;

      const title = titleEl.innerText.trim();
      const priceText = priceEl ? priceEl.innerText.replace(/[^0-9]/g, "") : "0";
      const price = parseInt(priceText) || 0;

      let year = 0;
      let mileage = 0;

      allTags.forEach(el => {
        const text = el.innerText.trim();
        if (!year && text.match(/^20[0-9]{2}$|^19[0-9]{2}$/)) {
          year = parseInt(text);
        }
        if (!mileage && text.match(/[0-9,]+\s*km/i)) {
          mileage = parseInt(text.replace(/[^0-9]/g, "")) || 0;
        }
      });

      if (title && price > 0) {
        listings.push({ title, price, year, mileage, image, link, priceText: priceEl ? priceEl.innerText.trim() : "N/A" });
      }
    } catch (e) {}
  });

  return listings;
}

function scoreListings(listings) {
  if (listings.length === 0) return [];

  const allPrices = listings.map(l => l.price).filter(p => p > 0);

  return listings.map(listing => {
    const mileageScore = scoreMileageForYear(listing.mileage, listing.year);
    const priceScore = scorePriceInGroup(listing.price, allPrices);
    const yearScore = scoreYear(listing.year);

    // Weighting: mileage vs year = 40%, price = 35%, year = 25%
    const final = Math.round(
      (mileageScore * 0.40) +
      (priceScore * 0.35) +
      (yearScore * 0.25)
    );

    return {
      ...listing,
      score: Math.min(100, Math.max(0, final)),
      mileageScore,
      priceScore,
      yearScore
    };
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getListings") {
    const raw = scrapeListings();
    analysedListings = scoreListings(raw);
    sendResponse({ listings: analysedListings });
  }
});
