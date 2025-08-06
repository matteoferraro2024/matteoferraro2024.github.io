// Set default mode to 'education'
let currentMode = 'education';
let selectedExam = 'CE';
let institutionLayer = null;
let cachedData = null;

const map = L.map('map').setView([37.8, -96], 4);

L.tileLayer('', {
  attribution: '',
  minZoom: 4,
  maxZoom: 6
}).addTo(map);

map.setMaxBounds([
  [24.396308, -125.0],
  [49.384358, -66.93457]
]);

map.on('drag', () => {
  map.panInsideBounds(map.getBounds(), { animate: false });
});

fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json')
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, {
      style: {
        fillColor: '#333',
        weight: 1,
        color: 'black',
        fillOpacity: 0
      }
    }).addTo(map);
  });

const examColors = {
  CE: 20,
  PCM: 200,
  PA: 255,
  PDD: 350,
  PJM: 290,
  PPD: 80
};

const examAverages = {
  PCM: 48,
  PJM: 60,
  PA: 61,
  PPD: 47,
  PDD: 55,
  CE: 61
};

function getColor(score, hue, avg) {
  if (isNaN(score)) return 'transparent';
  score = Math.max(0, Math.min(100, score));
  avg = Math.max(0, Math.min(100, avg));

  if (score < avg) {
    const t = score / avg;
    return mixColors('#000000', '#ffffff', t);
  } else {
    const t = (score - avg) / (100 - avg);
    const saturation = 90 * t;
    const lightness = 100 - 40 * t;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }
}

function mixColors(color1, color2, t) {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(h => h + h).join('');
  const bigint = parseInt(hex, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

function createInstitutionLayer(data) {
  return L.geoJSON(data, {
    pointToLayer: (feature, latlng) => {
      const scoreRaw = feature.properties[selectedExam];
      const score = parseInt(scoreRaw?.replace('%', ''));
      const hue = examColors[selectedExam] || 0;
      const avg = examAverages[selectedExam] || 50;
      const isMissing = isNaN(score);
      const fill = getColor(score, hue, avg);

      return L.circleMarker(latlng, {
        radius: 6,
        fillColor: fill,
        color: isMissing ? '#000' : fill,
        weight: 1,
        fillOpacity: isMissing ? 0 : 0.9
      });
    },
    onEachFeature: (feature, layer) => {
      const p = feature.properties;
      const score = p[selectedExam] || 'N/A';
      layer.bindPopup(`<strong>${p.Institution}</strong><br>State: ${p.State}<br>${selectedExam}: ${score}`);
      layer.bindTooltip(p.Institution, {
        permanent: false,
        direction: 'top',
        opacity: 0.9,
        offset: [0, -6],
        className: 'leaflet-tooltip-custom'
      });
    }
  });
}

function createEducationLayer(data) {
  const baseWidth = 0.025;
  const unitHeight = 1;
  const normalize = val => (val - 5) / 3 + 1;
  const features = [];

  data.features.forEach(feature => {
    const p = feature.properties;
    const lat = feature.geometry.coordinates[1];
    const lng = feature.geometry.coordinates[0];
    const ugRaw = p['Undergrad Program Length'];
    const gradRaw = p['Grad Program Length'];
    const undergrad = parseFloat(ugRaw);
    const grad = parseFloat(gradRaw);
    if (isNaN(undergrad) && isNaN(grad)) return;

    const ugHeight = !isNaN(undergrad) ? normalize(undergrad) * unitHeight : 0;
    const gradHeight = !isNaN(grad) ? normalize(grad) * unitHeight : 0;
    const totalHeight = ugHeight + gradHeight;

    const color = isNaN(undergrad) ? 'red' : isNaN(grad) ? 'blue' : 'purple';
    const triangle = makeTriangle(lat, lng, totalHeight, baseWidth, color);

    const ugLine = (!isNaN(undergrad) && !isNaN(grad)) ?
      L.polyline([
        [lat + ugHeight, lng - baseWidth],
        [lat + ugHeight, lng + baseWidth]
      ], {
        color: 'black',
        weight: 1.5,
        opacity: 0.7
      }) : null;

    const group = L.layerGroup([triangle, ...(ugLine ? [ugLine] : [])]);
    group.bindPopup(`<strong>${p.Institution}</strong><br>Undergraduate: ${ugRaw || 'N/A'}<br>Graduate: ${gradRaw || 'N/A'}`);
    features.push(group);
  });

  return L.layerGroup(features);
}

function makeTriangle(baseLat, lng, height, halfWidth, color) {
  return L.polygon([
    [baseLat, lng - halfWidth],
    [baseLat, lng + halfWidth],
    [baseLat + height, lng]
  ], {
    color: color,
    fillColor: color,
    fillOpacity: 0.3,
    weight: 2,
    lineCap: 'round',
    lineJoin: 'round'
  });
}

function reloadLayer() {
  if (institutionLayer) map.removeLayer(institutionLayer);
  institutionLayer = currentMode === 'exam'
    ? createInstitutionLayer(cachedData)
    : createEducationLayer(cachedData);
  institutionLayer.addTo(map);
  setTimeout(() => map.invalidateSize(), 100);
}

fetch('institutions.geojson')
  .then(res => res.json())
  .then(data => {
    cachedData = data;
    reloadLayer();
  });

document.querySelectorAll('input[name="exam"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    selectedExam = e.target.value;
    if (currentMode === 'exam') reloadLayer();
  });
});

document.getElementById('toggleExam').addEventListener('click', () => {
  currentMode = 'exam';
  document.getElementById('examControls').style.display = 'flex';
  document.getElementById('eduControls').style.display = 'none';
  updateActiveToggle('toggleExam');
  reloadLayer();
  setTimeout(() => map.invalidateSize(), 100);
});

document.getElementById('toggleEducation').addEventListener('click', () => {
  currentMode = 'education';
  document.getElementById('examControls').style.display = 'none';
  document.getElementById('eduControls').style.display = 'flex';
  updateActiveToggle('toggleEducation');
  reloadLayer();
  setTimeout(() => map.invalidateSize(), 100);
});

function updateActiveToggle(activeId) {
  document.querySelectorAll('.view-toggle button').forEach(btn =>
    btn.classList.remove('active')
  );
  document.getElementById(activeId).classList.add('active');
}