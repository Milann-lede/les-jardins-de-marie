const normalizePath = (path) => {
  if (!path || path === "/") {
    return "/index.html";
  }
  return path.endsWith("/") ? `${path}index.html` : path;
};

const highlightActiveLink = () => {
  const nav = document.querySelector("#nav");
  if (!nav) {
    return;
  }

  const currentPath = normalizePath(window.location.pathname);
  const navLinks = Array.from(nav.querySelectorAll("a")).filter(
    (link) => !link.classList.contains("cart-trigger")
  );
  const linkByPath = new Map(
    navLinks.map((link) => [normalizePath(link.getAttribute("href")), link])
  );

  let targetPath = currentPath;

  if (!linkByPath.has(targetPath)) {
    const productSection = "/html/produits.html";
    const nonProductPages = new Set([
      productSection,
      "/html/savoir-faire.html",
      "/html/contact.html",
      "/html/mentions-legales.html",
    ]);

    if (targetPath.startsWith("/html/") && !nonProductPages.has(targetPath)) {
      targetPath = productSection;
    }
  }

  navLinks.forEach((link) => {
    const linkPath = normalizePath(link.getAttribute("href"));
    if (linkPath === targetPath) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
};

const initializeNavigation = () => {
  const burger = document.querySelector("#burger");
  const nav = document.querySelector("#nav");
  if (!burger || !nav) {
    return;
  }

  burger.addEventListener("click", () => {
    const expanded = burger.getAttribute("aria-expanded") === "true";
    burger.setAttribute("aria-expanded", String(!expanded));
    nav.classList.toggle("open");
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      burger.setAttribute("aria-expanded", "false");
      nav.classList.remove("open");
    });
  });
};

const isSessionStorageAvailable = (() => {
  try {
    const testKey = "__layout_cache__";
    sessionStorage.setItem(testKey, "1");
    sessionStorage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
})();

const getCachedFragment = (cacheKey) => {
  if (!isSessionStorageAvailable) {
    return null;
  }
  return sessionStorage.getItem(cacheKey);
};

const setCachedFragment = (cacheKey, content) => {
  if (!isSessionStorageAvailable) {
    return;
  }
  try {
    sessionStorage.setItem(cacheKey, content);
  } catch (error) {
    // Ignore quota errors silently to avoid breaking the render path.
  }
};

const fetchFragment = async (url, cacheKey) => {
  const cached = getCachedFragment(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Échec du chargement de ${url} (${response.status})`);
  }

  const content = await response.text();
  setCachedFragment(cacheKey, content);
  return content;
};

const mountFragment = (selector, html, onMount) => {
  const container = document.querySelector(selector);
  if (!container) {
    return;
  }

  container.innerHTML = html;
  if (typeof onMount === "function") {
    onMount(container);
  }
};

const getPathPrefix = () => {
  // Check if we are in a subdirectory (e.g., /html/)
  // This simple check assumes pages are either at root or in /html/
  // and that the URL contains '/html/'.
  return window.location.pathname.includes("/html/") ? "../" : "./";
};

const processFragmentContent = (html, prefix) => {
  // Replace paths to make them relative to the current depth
  // We explicitly target the known directories and files to avoid replacing external links
  // regex looks for attributes starting with: "asset/, "html/, "index.html
  // and prepends the prefix (e.g., "../" or "")

  return html
    // Handle asset/ paths (images, styles, scripts)
    .replace(/(href|src|srcset)="asset\//g, `$1="${prefix}asset/`)
    // Handle secondary paths in srcset (e.g. ", asset/img/...")
    .replace(/,\s*asset\//g, `, ${prefix}asset/`)
    // Handle html/ paths (links to other pages)
    .replace(/(href|src)="html\//g, `$1="${prefix}html/`)
    // Handle index.html (link to home)
    .replace(/(href|src)="index\.html"/g, `$1="${prefix}index.html"`)
    // Handle favicon (link rel="logo icon" href="asset/...)
    .replace(/href="asset\//g, `href="${prefix}asset/`);
};

const loadHeader = () => {
  const prefix = getPathPrefix();
  // Construct path to header.html. 
  // If root: html/header.html
  // If sub: ../html/header.html
  const url = `${prefix}html/header.html`;

  fetchFragment(url, "layout:header:v4")
    .then((html) => {
      const processedHtml = processFragmentContent(html, prefix);
      mountFragment("#header", processedHtml, (container) => {
        initializeNavigation();
        highlightActiveLink();
        document.dispatchEvent(
          new CustomEvent("header:loaded", {
            detail: container,
          })
        );
      });
    })
    .catch((error) =>
      console.error("Erreur lors du chargement du header :", error)
    );
};

const loadFooter = () => {
  const prefix = getPathPrefix();
  const url = `${prefix}html/footer.html`;

  fetchFragment(url, "layout:footer:v4")
    .then((html) => {
      const processedHtml = processFragmentContent(html, prefix);
      mountFragment("#footer", processedHtml);
    })
    .catch((error) =>
      console.error("Erreur lors du chargement du footer :", error)
    );
};

document.addEventListener("DOMContentLoaded", () => {
  loadHeader();
  loadFooter();
});
