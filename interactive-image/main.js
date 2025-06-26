document.addEventListener("DOMContentLoaded", function () {
  const typeSelect = document.getElementById("typeSelect");
  const rarityInput = document.getElementById("rarityInput");
  const pokemonImage = document.getElementById("pokemonImage");
  const container = document.getElementById("pokemonContainer");

  function capitalizeFirstWord(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  function updatePokemonDisplay() {
    const type = typeSelect.value;
    const rarityRaw = rarityInput.value.trim();
    const rarity = capitalizeFirstWord(rarityRaw);
    
    let imageSrc = "pokeball.png";
    let bgColor = "#ccc";

    if (type === "Fire") {
      bgColor = "red";
      if (rarity === "Starter") {
        imageSrc = "cyndaquil.png";
      } else if (rarity === "Wild") {
        imageSrc = "houndour.jpg";
      } else if (rarity === "Legendary") {
        imageSrc = "groudon.png";
      } else {
        imageSrc = "unown.png";
      }

    } else if (type === "Grass") {
      bgColor = "green";
      if (rarity === "Starter") {
        imageSrc = "grotle.jpg";
      } else if (rarity === "Wild") {
        imageSrc = "cherubi.png";
      } else if (rarity === "Legendary") {
        imageSrc = "shaymin.png";
      } else {
        imageSrc = "unown.png";
      }
    } else if (type === "Water") {
      bgColor = "blue";
      if (rarity === "Starter") {
        imageSrc = "mudkip.png";
      } else if (rarity === "Wild") {
        imageSrc = "Mantine.png";
      } else if (rarity === "Legendary") {
        imageSrc = "manaphy.png";
      } else {
        imageSrc = "unown.png";
      }
    }

    pokemonImage.src = imageSrc;
    container.style.backgroundColor = bgColor;
  }

  // Event listeners
  typeSelect.addEventListener("change", updatePokemonDisplay);
  rarityInput.addEventListener("input", updatePokemonDisplay);
});
