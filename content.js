let analysedListings = [];

function scrapeListings() {
  const listings = [];

  const cards = document.querySelectorAll('[data-testid^="listing-card-index"]');

  cards.forEach(card => {
    try {
      const titleEl = card.querySelector('a[class*="Card"]') || card.querySelector('a');
      const priceEl = card.querySelector('[class*="Price"]') || card.querySelector('[class*="price"]');
      
      // Get all images and find the car photo (biggest one, not a logo)
      const allImages = card.querySelectorAll('img');
      let image = null;
      let largestWidth = 0;
      allImages.forEach(img => {
        if (img.naturalWidth > largestWidth || img.width > largestWidth) {
          largestWidth = img.naturalWidth || img.width;
          image = img.src;
        }
      });

      // Get the link to the listing
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
        listings.push({
          title,
          price,
          year,
          mileage,
          image,
          link,
          priceText: priceEl ? priceEl.innerText.trim() : "N/A",
        });
      }
    } catch (e) {}
  });

  return listings;
}

function scoreListings(listings) {
  if (listings.length === 0) return [];

  const prices = listings.map(l => l.price).filter(p => p > 0);
  const mileages = listings.map(l => l.mileage).filter(m => m > 0);
  const years = listings.map(l => l.year).filter(y => y > 0);

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minMileage = Math.min(...mileages);
  const maxMileage = Math.max(...mileages);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);

  return listings.map(listing => {
    let score = 50;

    if (maxPrice !== minPrice && listing.price > 0) {
      const priceScore = 1 - (listing.price - minPrice) / (maxPrice - minPrice);
      score += priceScore * 40;
    }

    if (maxMileage !== minMileage && listing.mileage > 0) {
      const mileageScore = 1 - (listing.mileage - minMileage) / (maxMileage - minMileage);
      score += mileageScore * 35 - 17.5;
    }

    if (maxYear !== minYear && listing.year > 0) {
      const yearScore = (listing.year - minYear) / (maxYear - minYear);
      score += yearScore * 25 - 12.5;
    }

    return {
      ...listing,
      score: Math.round(Math.min(100, Math.max(0, score)))
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