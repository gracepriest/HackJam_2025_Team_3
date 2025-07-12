const container = document.getElementById("badgesContainer");

  if (user.badges.length > 0) {
    user.badges.forEach(badge => {
      const img = document.createElement("img");
      img.src = badge.image;
      img.alt = badge.name;
      img.title = badge.name;
      img.className = "rounded border p-1"; // Optional Bootstrap styles
      img.style.width = "50px";
      img.style.height = "50px";
      container.appendChild(img);
    });
  } else {
    container.innerHTML = "<p class='text-muted'>No badges earned yet.</p>";
  }