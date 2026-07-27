#!/usr/bin/env node
// Regenerates the nav / header-actions / footer blocks in every top-level
// HTML page from the shared templates in partials/. Run this after editing
// a partials/*.html file, then commit the updated pages alongside it.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const partialsDir = path.join(root, "partials");

const navTemplate = readFileSync(path.join(partialsDir, "nav.html"), "utf8");
const headerActionsTemplate = readFileSync(path.join(partialsDir, "header-actions.html"), "utf8");
const footerTemplate = readFileSync(path.join(partialsDir, "footer.html"), "utf8");

const NAV_KEYS = ["home", "hvacr", "resources", "grades", "achievements", "shop"];

// Local partial links are bare filenames (e.g. href="hvacr.html"); pages that
// live in a subdirectory need those rewritten with a relative prefix.
function withPrefix(html, prefix) {
  if (!prefix) return html;
  return html.replace(/href="([a-z0-9-]+\.html)"/g, `href="${prefix}$1"`);
}

function renderNav(active, prefix) {
  let html = navTemplate;
  for (const key of NAV_KEYS) {
    const token = `__ACTIVE_${key.toUpperCase()}__`;
    html = html.split(token).join(active === key ? ' aria-current="page"' : "");
  }
  return withPrefix(html, prefix).replace(/\n$/, "");
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

const RENDERERS = {
  NAV: renderNav,
  "HEADER-ACTIONS": renderHeaderActions,
  FOOTER: renderFooter,
};

function replaceBlock(html, name, render, prefix) {
  const re = new RegExp(
    `<!--\\s*TB:${name}(?:\\s+active="([a-z-]+)")?\\s*-->[\\s\\S]*?<!--\\s*/TB:${name}\\s*-->`,
  );
  const match = html.match(re);
  if (!match) return { html, touched: false };
  const active = match[1];
  const attr = active ? ` active="${active}"` : "";
  const rendered = render(active, prefix);
  const replacement = `<!-- TB:${name}${attr} -->\n${rendered}\n<!-- /TB:${name} -->`;
  return { html: html.replace(re, replacement), touched: true };
}

function processFile(filePath, prefix) {
  const original = readFileSync(filePath, "utf8");
  let html = original;
  let touchedAny = false;

  for (const [name, render] of Object.entries(RENDERERS)) {
    const result = replaceBlock(html, name, render, prefix);
    html = result.html;
    touchedAny = touchedAny || result.touched;
  }

  if (touchedAny && html !== original) {
    writeFileSync(filePath, html);
    return true;
  }
  return false;
}

// Directories (relative to root) whose HTML files also carry TB: blocks,
// along with the "../" style prefix their partial links need.
const SUBDIRS = [{ dir: "quizzes", prefix: "../" }];

let changed = 0;

for (const file of readdirSync(root).filter((f) => f.endsWith(".html"))) {
  if (processFile(path.join(root, file), "")) {
    changed++;
    console.log(`updated ${file}`);
  }
}

for (const { dir, prefix } of SUBDIRS) {
  const dirPath = path.join(root, dir);
  for (const file of readdirSync(dirPath).filter((f) => f.endsWith(".html"))) {
    if (processFile(path.join(dirPath, file), prefix)) {
      changed++;
      console.log(`updated ${dir}/${file}`);
    }
  }
}

console.log(`Done. ${changed} file(s) changed.`);
