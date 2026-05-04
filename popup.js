let globalListings = [];
let chartInstance = null;

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('tabList').addEventListener('click', function() {
    switchTab('list');
  });
  document.getElementById('tabGraph').addEventListener('click', function() {
    switchTab('graph');
  });

  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'getListings' }, function(response) {
      if (response && response.listings && response.listings.length > 0) {
        globalListings = response.listings;
        displayListings(globalListings);
      }
    });
  });
});

function switchTab(tab) {
  var listPanel = document.getElementById('listPanel');
  var graphPanel = document.getElementById('graphPanel');
  var tabList = document.getElementById('tabList');
  var tabGraph = document.getElementById('tabGraph');

  if (tab === 'list') {
    document.body.style.width = '480px';
    listPanel.style.display = 'block';
    graphPanel.style.display = 'none';
    tabList.classList.add('active');
    tabGraph.classList.remove('active');
  } else {
    document.body.style.width = '780px';
    listPanel.style.display = 'none';
    graphPanel.style.display = 'block';
    tabList.classList.remove('active');
    tabGraph.classList.add('active');
    renderChart(globalListings);
  }
}

function renderChart(listings) {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  var validListings = listings.filter(function(l) {
    return l.mileage > 0 && l.price > 0 && l.price < 500000 && l.mileage < 1000000;
  });

  if (validListings.length === 0) return;

  var datasets = [
    {
      label: 'Great Deal',
      data: validListings.filter(function(l) { return l.score >= 70; }).map(function(l) {
        return { x: l.mileage, y: l.price, listing: l };
      }),
      backgroundColor: '#a6e3a1',
      pointRadius: 8,
      pointHoverRadius: 16
    },
    {
      label: 'Fair Deal',
      data: validListings.filter(function(l) { return l.score >= 40 && l.score < 70; }).map(function(l) {
        return { x: l.mileage, y: l.price, listing: l };
      }),
      backgroundColor: '#fab387',
      pointRadius: 8,
      pointHoverRadius: 16
    },
    {
      label: 'Overpriced',
      data: validListings.filter(function(l) { return l.score < 40; }).map(function(l) {
        return { x: l.mileage, y: l.price, listing: l };
      }),
      backgroundColor: '#f38ba8',
      pointRadius: 8,
      pointHoverRadius: 16
    }
  ];

  var canvas = document.getElementById('scatterChart');
  canvas.width = 730;
  canvas.height = 500;

  var tooltip = document.getElementById('graphTooltip');

  var ctx = canvas.getContext('2d');
  chartInstance = new Chart(ctx, {
    type: 'scatter',
    data: { datasets: datasets },
    options: {
      responsive: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      },
      onClick: function(event, elements) {
        if (elements && elements.length > 0) {
          var element = elements[0];
          var listing = datasets[element.datasetIndex].data[element.index].listing;
          if (listing && listing.link) {
            chrome.tabs.create({ url: listing.link });
          }
        }
      },
      onHover: function(event, elements) {
        if (elements && elements.length > 0) {
          var element = elements[0];
          var listing = datasets[element.datasetIndex].data[element.index].listing;

          var ttImage = document.getElementById('ttImage');
          var ttTitle = document.getElementById('ttTitle');
          var ttPrice = document.getElementById('ttPrice');
          var ttYear = document.getElementById('ttYear');
          var ttMileage = document.getElementById('ttMileage');
          var ttScore = document.getElementById('ttScore');

          if (listing.image) {
            ttImage.src = listing.image;
            ttImage.style.display = 'block';
          } else {
            ttImage.style.display = 'none';
          }

          ttTitle.innerText = listing.title.substring(0, 50);
          ttPrice.innerText = 'Price: ' + listing.priceText;
          ttYear.innerText = 'Year: ' + (listing.year || 'N/A');
          ttMileage.innerText = 'Mileage: ' + listing.mileage.toLocaleString() + ' km';

          var scoreLabel = listing.score >= 70 ? 'Great Deal' : listing.score >= 40 ? 'Fair Deal' : 'Overpriced';
          ttScore.innerText = scoreLabel + ' — ' + listing.score + '/100';

          var rect = canvas.getBoundingClientRect();
          var x = event.native.clientX + 15;
          var y = event.native.clientY - 60;

          if (x + 210 > window.innerWidth) x = event.native.clientX - 215;
          if (y + 250 > window.innerHeight) y = window.innerHeight - 260;

          tooltip.style.left = x + 'px';
          tooltip.style.top = y + 'px';
          tooltip.style.display = 'block';
          canvas.style.cursor = 'pointer';
        } else {
          tooltip.style.display = 'none';
          canvas.style.cursor = 'default';
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Mileage (km)', color: '#6c7086', font: { size: 11 } },
          ticks: { color: '#6c7086', callback: function(v) { return v.toLocaleString(); } },
          grid: { color: '#313244' }
        },
        y: {
          title: { display: true, text: 'Price (€)', color: '#6c7086', font: { size: 11 } },
          ticks: { color: '#6c7086', callback: function(v) { return '€' + v.toLocaleString(); } },
          grid: { color: '#313244' }
        }
      }
    }
  });
}

function displayListings(listings) {
  var container = document.getElementById('results');
  container.innerHTML = '';

  listings.sort(function(a, b) { return b.score - a.score; });

  listings.forEach(function(listing) {
    var card = document.createElement('div');
    card.className = 'car-card';

    var scoreLabel = listing.score >= 70 ? 'Great Deal' : listing.score >= 40 ? 'Fair Deal' : 'Overpriced';
    var scoreClass = listing.score >= 70 ? 'great' : listing.score >= 40 ? 'fair' : 'overpriced';
    var year = listing.year > 0 ? listing.year : 'N/A';
    var mileage = listing.mileage > 0 ? listing.mileage.toLocaleString() + ' km' : 'N/A';
    var imageHtml = listing.image ? '<img class="car-image" src="' + listing.image + '">' : '';

    card.innerHTML = imageHtml +
      '<div class="car-body">' +
        '<div class="car-title" data-link="' + listing.link + '">' + listing.title + '</div>' +
        '<div class="car-stats">' +
          '<div class="stat"><div class="stat-label">Price</div><div class="stat-value">' + listing.priceText + '</div></div>' +
          '<div class="stat"><div class="stat-label">Year</div><div class="stat-value">' + year + '</div></div>' +
          '<div class="stat"><div class="stat-label">Mileage</div><div class="stat-value">' + mileage + '</div></div>' +
        '</div>' +
        '<div class="score-row">' +
          '<span class="deal-badge ' + scoreClass + '">' + scoreLabel + '</span>' +
          '<div class="score-number">' + listing.score + '<span>/100</span></div>' +
        '</div>' +
        '<div class="subscores">' +
          '<div class="subscore"><div class="subscore-label">Price</div><div class="subscore-value">' + listing.priceScore + '/100</div></div>' +
          '<div class="subscore"><div class="subscore-label">Mileage</div><div class="subscore-value">' + listing.mileageScore + '/100</div></div>' +
          '<div class="subscore"><div class="subscore-label">Year</div><div class="subscore-value">' + listing.yearScore + '/100</div></div>' +
        '</div>' +
      '</div>';

    card.querySelector('.car-title').addEventListener('click', function() {
      chrome.tabs.create({ url: this.dataset.link });
    });

    container.appendChild(card);
  });
}
