document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menu-toggle");
  const navLinks = document.getElementById("nav-links");

  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      navLinks.classList.toggle("active");
    });

    document.addEventListener("click", (event) => {
      const isClickInsideMenu = navLinks.contains(event.target);
      const isMenuOpen = navLinks.classList.contains("active");

      if (isMenuOpen && !isClickInsideMenu) {
        navLinks.classList.remove("active");
      }
    });
  }
});