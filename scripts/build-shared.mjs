#!/usr/bin/env node
// Regenerates the nav / header-actions / footer blocks in every top-level
// HTML page (plus known subdirectories) from the shared templates in
// partials/. Run this after editing a partials/*.html file, then commit the
// updated pages alongside it.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const partialsDir = path.join(root, "partials");

const navTemplate = readFileSync(path.join(partialsDir, "nav.html"), "utf8");
const headerActionsTemplate = readFileSync(path.join(partialsDir, "header-actions.html"), "utf8");
const footerTemplate = readFileSync(path.join(partialsDir, "footer.html"), "utf8");

const NAV_KEYS = ["home", "hvacr", "resources", "grades", "achievements", "shop"];
const RESOURCES_PLACEHOLDER = "__RESOURCES_HREF__";

// Local partial links are bare filenames (e.g. href="hvacr.html"); pages that
// live in a subdirectory need those rewritten with a relative prefix.
function withPrefix(html, prefix) {
  if (!prefix) return html;
  return html.replace(/href="([a-z0-9-]+\.html)"/g, `href="${prefix}$1"`);
}

function renderNav(active, prefix, resourcesHref) {
  let html = navTemplate;
  for (const key of NAV_KEYS) {
    const token = `__ACTIVE_${key.toUpperCase()}__`;
    html = html.split(token).join(active === key ? ' aria-current="page"' : "");
  }
  // The Resources page has moved into its own folder, so its link can't use
  // the same flat prefix as the other nav links (which still live at root).
  // Swap it for a placeholder before the generic prefixing pass, then drop
  // in the real (per-directory) relative path afterward.
  html = html.replace('href="resources.html"', `href="${RESOURCES_PLACEHOLDER}"`);
  html = withPrefix(html, prefix);
  html = html.replace(RESOURCES_PLACEHOLDER, resourcesHref);
  return html.replace(/\n$/, "");
}

function renderHeaderActions(active, prefix) {
  if (active === "none") {
    return '      <div class="header-actions" aria-hidden="true"></div>';
  }
  const html = headerActionsTemplate
    .split("__ACTIVE_ACCOUNT__")
    .join(active === "account" ? ' aria-current="page"' : "");
  return withPrefix(html, prefix).replace(/\n$/, "");
}

function renderFooter() {
  return footerTemplate.replace(/\n$/, "");
}

function replaceBlock(html, name, render, prefix, resourcesHref) {
  const re = new RegExp(
    `<!--\\s*TB:${name}(?:\\s+active="([a-z-]+)")?\\s*-->[\\s\\S]*?<!--\\s*/TB:${name}\\s*-->`,
  );
  const match = html.match(re);
  if (!match) return { html, touched: false };
  const active = match[1];
  const attr = active ? ` active="${active}"` : "";
  const rendered = name === "NAV" ? render(active, prefix, resourcesHref) : render(active, prefix);
  const replacement = `<!-- TB:${name}${attr} -->\n${rendered}\n<!-- /TB:${name} -->`;
  return { html: html.replace(re, replacement), touched: true };
}

const RENDERERS = {
  NAV: renderNav,
  "HEADER-ACTIONS": renderHeaderActions,
  FOOTER: renderFooter,
};

function processFile(filePath, prefix, resourcesHref) {
  const original = readFileSync(filePath, "utf8");
  let html = original;
  let touchedAny = false;

  for (const [name, render] of Object.entries(RENDERERS)) {
    const result = replaceBlock(html, name, render, prefix, resourcesHref);
    html = result.html;
    touchedAny = touchedAny || result.touched;
  }

  if (touchedAny && html !== original) {
    writeFileSync(filePath, html);
    return true;
  }
  return false;
}

// Directories (relative to root) whose HTML files carry TB: blocks, along
// with the "../"-style prefix their bare partial links need, and the
// relative path from that directory back to the (relocated) resources hub.
const DIRS = [
  { dir: ".", prefix: "", resourcesHref: "resources/resources.html" },
  { dir: "quizzes", prefix: "../", resourcesHref: "../resources/resources.html" },
  { dir: "resources", prefix: "../", resourcesHref: "resources.html" },
  { dir: "resources/pt-charts", prefix: "../../", resourcesHref: "../resources.html" },
];

let changed = 0;

for (const { dir, prefix, resourcesHref } of DIRS) {
  const dirPath = path.join(root, dir);
  for (const file of readdirSync(dirPath).filter((f) => f.endsWith(".html"))) {
    if (processFile(path.join(dirPath, file), prefix, resourcesHref)) {
      changed++;
      console.log(`updated ${dir === "." ? file : `${dir}/${file}`}`);
    }
  }
}

console.log(`Done. ${changed} file(s) changed.`);
