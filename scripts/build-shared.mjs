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

const NAV_KEYS = ["home", "hvacr", "resources", "achievements", "shop"];

function renderNav(active) {
  let html = navTemplate;
  for (const key of NAV_KEYS) {
    const token = `__ACTIVE_${key.toUpperCase()}__`;
    html = html.split(token).join(active === key ? ' aria-current="page"' : "");
  }
  return html.replace(/\n$/, "");
}

function renderHeaderActions(active) {
  if (active === "none") {
    return '      <div class="header-actions" aria-hidden="true"></div>';
  }
  return headerActionsTemplate
    .split("__ACTIVE_ACCOUNT__")
    .join(active === "account" ? ' aria-current="page"' : "")
    .replace(/\n$/, "");
}

function renderFooter() {
  return footerTemplate.replace(/\n$/, "");
}

const RENDERERS = {
  NAV: renderNav,
  "HEADER-ACTIONS": renderHeaderActions,
  FOOTER: renderFooter,
};

function replaceBlock(html, name, render) {
  const re = new RegExp(
    `<!--\\s*TB:${name}(?:\\s+active="([a-z-]+)")?\\s*-->[\\s\\S]*?<!--\\s*/TB:${name}\\s*-->`,
  );
  const match = html.match(re);
  if (!match) return { html, touched: false };
  const active = match[1];
  const attr = active ? ` active="${active}"` : "";
  const rendered = render(active);
  const replacement = `<!-- TB:${name}${attr} -->\n${rendered}\n<!-- /TB:${name} -->`;
  return { html: html.replace(re, replacement), touched: true };
}

const files = readdirSync(root).filter((f) => f.endsWith(".html"));
let changed = 0;

for (const file of files) {
  const filePath = path.join(root, file);
  const original = readFileSync(filePath, "utf8");
  let html = original;
  let touchedAny = false;

  for (const [name, render] of Object.entries(RENDERERS)) {
    const result = replaceBlock(html, name, render);
    html = result.html;
    touchedAny = touchedAny || result.touched;
  }

  if (touchedAny && html !== original) {
    writeFileSync(filePath, html);
    changed++;
    console.log(`updated ${file}`);
  }
}

console.log(`Done. ${changed} file(s) changed.`);
