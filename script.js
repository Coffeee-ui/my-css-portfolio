/* =============================================
   SPA ROUTER — Smooth Page Transitions
   + Expandable Skill Cards
   + Scroll-to-Navigate
   =============================================
   
   Features:
   1. Hash-based routing (#about, #skills, etc.)
   2. CSS transitions: fade + directional slide
   3. Scroll up/down to navigate between pages
   4. Click skill cards to expand descriptions
   5. Animated nav indicator bar
   ============================================= */

(function () {
  "use strict";

  // ---- DOM References ----
  const pages = document.querySelectorAll(".page");
  const navLinks = document.querySelectorAll(".nav-link");
  const indicator = document.getElementById("nav-indicator");
  const brandLink = document.getElementById("brand-link");
  const pagesContainer = document.getElementById("pages-container");

  // Page order — determines slide direction
  const pageOrder = ["about", "skills", "projects", "contact"];

  let currentPage = "about";
  let isTransitioning = false;

  // ---- Initialize ----
  function init() {
    const hash = window.location.hash.replace("#", "") || "about";
    const validPage = pageOrder.includes(hash) ? hash : "about";

    // Set initial page without animation
    setPageInstant(validPage);

    // Bind nav link clicks
    navLinks.forEach((link) => {
      link.addEventListener("click", handleNavClick);
    });

    // Bind CTA buttons ([data-nav])
    document.querySelectorAll("[data-nav]").forEach((btn) => {
      btn.addEventListener("click", handleNavClick);
    });

    // Brand link → About
    if (brandLink) {
      brandLink.addEventListener("click", (e) => {
        e.preventDefault();
        navigateTo("about");
      });
    }

    // Browser back/forward
    window.addEventListener("hashchange", () => {
      const hash = window.location.hash.replace("#", "") || "about";
      if (pageOrder.includes(hash) && hash !== currentPage) {
        navigateTo(hash, false);
      }
    });

    // Position indicator after fonts load
    window.addEventListener("load", updateIndicator);
    window.addEventListener("resize", updateIndicator);

    // ---- Scroll-to-navigate ----
    initScrollNavigation();

    // ---- Expandable skill cards ----
    initSkillCards();
  }

  // =============================================
  //  PAGE NAVIGATION
  // =============================================

  function setPageInstant(pageName) {
    pages.forEach((p) => {
      p.classList.remove("active", "slide-up", "slide-down");
      if (p.dataset.page === pageName) {
        p.classList.add("active");
      }
    });

    navLinks.forEach((l) => {
      l.classList.toggle("active", l.dataset.page === pageName);
    });

    currentPage = pageName;
    window.location.hash = pageName;
    updateIndicator();
  }

  function handleNavClick(e) {
    e.preventDefault();
    const target =
      e.currentTarget.dataset.page ||
      e.currentTarget.dataset.nav ||
      e.currentTarget.getAttribute("href").replace("#", "");
    if (target && target !== currentPage) {
      navigateTo(target);
    }
  }

  function navigateTo(pageName, pushState = true) {
    if (isTransitioning || pageName === currentPage) return;
    if (!pageOrder.includes(pageName)) return;

    isTransitioning = true;

    const fromIndex = pageOrder.indexOf(currentPage);
    const toIndex = pageOrder.indexOf(pageName);
    const goingForward = toIndex > fromIndex;

    const oldPage = document.querySelector(`.page[data-page="${currentPage}"]`);
    const newPage = document.querySelector(`.page[data-page="${pageName}"]`);

    if (!oldPage || !newPage) {
      isTransitioning = false;
      return;
    }

    // Set incoming page's starting position
    newPage.classList.remove("slide-up", "slide-down");
    newPage.classList.add(goingForward ? "slide-up" : "slide-down");

    // Deactivate old page
    oldPage.classList.remove("active");
    oldPage.classList.add(goingForward ? "slide-down" : "slide-up");

    // Activate new page
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        newPage.classList.remove("slide-up", "slide-down");
        newPage.classList.add("active");
        newPage.scrollTop = 0;
      });
    });

    // Update nav
    navLinks.forEach((l) => {
      l.classList.toggle("active", l.dataset.page === pageName);
    });

    if (pushState) {
      window.location.hash = pageName;
    }

    currentPage = pageName;
    updateIndicator();

    setTimeout(() => {
      isTransitioning = false;
    }, 550);
  }

  // =============================================
  //  NAV INDICATOR
  // =============================================

  function updateIndicator() {
    const activeLink = document.querySelector(
      `.nav-link[data-page="${currentPage}"]`
    );
    if (!activeLink || !indicator) return;

    const linkRect = activeLink.getBoundingClientRect();
    const headerRect = activeLink.closest("header").getBoundingClientRect();

    indicator.style.left = linkRect.left - headerRect.left + "px";
    indicator.style.width = linkRect.width + "px";
  }

  // =============================================
  //  SCROLL-TO-NAVIGATE
  //  Scroll down → next page, scroll up → prev page
  //  Only triggers when the active page is at its
  //  scroll boundary (top or bottom).
  // =============================================

  function initScrollNavigation() {
    let scrollAccumulator = 0;
    const SCROLL_THRESHOLD = 80; // px of scroll needed to trigger a page change
    let scrollTimeout = null;

    // Listen on the container (captures scroll on all pages)
    pagesContainer.addEventListener("wheel", handleWheel, { passive: false });

    function handleWheel(e) {
      if (isTransitioning) {
        e.preventDefault();
        return;
      }

      const activePage = document.querySelector(".page.active");
      if (!activePage) return;

      const scrollTop = activePage.scrollTop;
      const scrollHeight = activePage.scrollHeight;
      const clientHeight = activePage.clientHeight;
      const atTop = scrollTop <= 1;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;

      const delta = e.deltaY;

      // Scrolling DOWN and at bottom of current page → next page
      if (delta > 0 && atBottom) {
        e.preventDefault();
        scrollAccumulator += Math.abs(delta);
      }
      // Scrolling UP and at top of current page → prev page
      else if (delta < 0 && atTop) {
        e.preventDefault();
        scrollAccumulator -= Math.abs(delta);
      }
      // Normal scroll within page — reset accumulator
      else {
        scrollAccumulator = 0;
        return;
      }

      // Check if accumulated scroll crosses threshold
      if (scrollAccumulator >= SCROLL_THRESHOLD) {
        scrollAccumulator = 0;
        goToNextPage();
      } else if (scrollAccumulator <= -SCROLL_THRESHOLD) {
        scrollAccumulator = 0;
        goToPrevPage();
      }

      // Reset accumulator if user stops scrolling
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        scrollAccumulator = 0;
      }, 300);
    }

    // Touch swipe support for mobile
    let touchStartY = 0;
    let touchStartTime = 0;

    pagesContainer.addEventListener("touchstart", (e) => {
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    }, { passive: true });

    pagesContainer.addEventListener("touchend", (e) => {
      if (isTransitioning) return;

      const touchEndY = e.changedTouches[0].clientY;
      const diff = touchStartY - touchEndY;
      const elapsed = Date.now() - touchStartTime;

      // Must be fast enough and far enough swipe
      if (Math.abs(diff) < 60 || elapsed > 500) return;

      const activePage = document.querySelector(".page.active");
      if (!activePage) return;

      const scrollTop = activePage.scrollTop;
      const scrollHeight = activePage.scrollHeight;
      const clientHeight = activePage.clientHeight;
      const atTop = scrollTop <= 1;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;

      if (diff > 0 && atBottom) {
        goToNextPage();
      } else if (diff < 0 && atTop) {
        goToPrevPage();
      }
    }, { passive: true });
  }

  function goToNextPage() {
    const idx = pageOrder.indexOf(currentPage);
    if (idx < pageOrder.length - 1) {
      navigateTo(pageOrder[idx + 1]);
    }
  }

  function goToPrevPage() {
    const idx = pageOrder.indexOf(currentPage);
    if (idx > 0) {
      navigateTo(pageOrder[idx - 1]);
    }
  }

  // =============================================
  //  EXPANDABLE SKILL CARDS
  //  Click to toggle description visibility
  // =============================================

  function initSkillCards() {
    const skillPills = document.querySelectorAll(".skill-pill[data-skill]");

    skillPills.forEach((pill) => {
      pill.addEventListener("click", () => {
        const wasExpanded = pill.classList.contains("expanded");

        // Close all others first (accordion behavior)
        skillPills.forEach((other) => {
          if (other !== pill) {
            other.classList.remove("expanded");
          }
        });

        // Toggle clicked
        pill.classList.toggle("expanded", !wasExpanded);
      });
    });
  }

  // ---- Kick off ----
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
