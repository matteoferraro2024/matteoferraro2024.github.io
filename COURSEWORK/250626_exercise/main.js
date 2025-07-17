const xValEl = document.querySelector('#x-coord');
const yValEl = document.querySelector('#y-coord');
const imgEl = document.querySelector('#coord-image');

// Live image preview on coordinate change
const coordEventListener = function () {
  const xVal = xValEl.value;
  const yVal = yValEl.value;

  const newFilename = `images/out256_${xVal}_${yVal}.jpg`;
  console.log(newFilename);
  imgEl.src = newFilename;
};

xValEl.addEventListener('input', coordEventListener);
yValEl.addEventListener('input', coordEventListener);

// Generate row of images for selected Y across all X
const generate = document.querySelector('.my-button');
generate.addEventListener('click', () => {
  const xVal = xValEl.value; // Not used here, but you could
  const yVal = yValEl.value;

  const gallery = document.querySelector('#gallery');
  const row = document.createElement('div');
  row.className = "flex overflow-x-auto space-x-2 p-2 bg-white shadow rounded";

  for (let x = 0; x <= 11; x++) {
    const xStr = x.toString().padStart(2, '0'); // Ensure 2-digit format
    const img = document.createElement('img');
    img.src = `images/out256_${xStr}_${yVal}.jpg`;
    img.className = "w-32 h-32 object-cover flex-shrink-0";
    row.appendChild(img);
  }

  gallery.appendChild(row);
});
