chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
  chrome.tabs.sendMessage(tabs[0].id, { action: "getListings" }, function(response) {
    if (response && response.listings && response.listings.length > 0) {
      displayListings(response.listings);
    }
  });
});

function displayListings(listings) {
  const container = document.getElementById("results");
  container.innerHTML = "";

  listings.sort((a, b) => b.score - a.score);

  listings.forEach(listing => {
    const card = document.createElement("div");
    card.className = "car-card";

    const scoreLabel = listing.score >= 70 ? "Great Deal" : listing.score >= 40 ? "Fair Deal" : "Overpriced";
    const scoreClass = listing.score >= 70 ? "great" : listing.score >= 40 ? "fair" : "overpriced";

    const year = listing.year > 0 ? listing.year : "N/A";
    const mileage = listing.mileage > 0 ? listing.mileage.toLocaleString() + " km" : "N/A";
    const imageHtml = listing.image ? `<img src="${listing.image}" style="width:100%; border-radius:6px; margin-bottom:8px; max-height:120px; object-fit:cover;">` : "";

    card.innerHTML = `
      ${imageHtml}
      <div class="car-title" style="cursor:pointer; color:#e94560;" data-link="${listing.link}">${listing.title}</div>
      <div class="car-details">Price: ${listing.priceText} | Year: ${year} | Mileage: ${mileage}</div>
      <span class="deal-score ${scoreClass}">${scoreLabel} - ${listing.score}/100</span>
    `;

    const titleEl = card.querySelector('.car-title');
    titleEl.addEventListener('click', function() {
      chrome.tabs.create({ url: this.dataset.link });
    });

    container.appendChild(card);
  });
}