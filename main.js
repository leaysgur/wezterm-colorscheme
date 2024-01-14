import htm from "htm";
import { h, render } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
const html = htm.bind(h);

/**
 * @typedef {{
 *   colors: {
 *     ansi: string[];
 *     background: string;
 *     brights: string[];
 *     cursor_bg: string;
 *     cursor_border: string;
 *     cursor_fg: string;
 *     foreground: string;
 *     selection_bg: string;
 *     selection_fg: string;
 *   };
 *   metadata: {
 *     author: string;
 *     name: string;
 *     origin_url: string;
 *     prefix: string;
 *     wezterm_version: string;
 *   };
 * }} ColorSchemeItem
 *
 * @type {ColorSchemeItem[]}
 */
let DATA = [];

const $app = document.querySelector("main[data-js-app]");
try {
  const data = await (
    await fetch(
      "https://raw.githubusercontent.com/wez/wezterm/main/docs/colorschemes/data.json",
    )
  ).json();
  // const data = (await import("/_data.js")).default;

  // Sort by HSV, Value > Saturation > Hue
  DATA = data.sort((a, b) => {
    const [ahsv, bhsv] = [
      rgbToHsv(hexToRgb(a.colors.background)),
      rgbToHsv(hexToRgb(b.colors.background)),
    ];

    if (ahsv[2] !== bhsv[2]) return ahsv[2] - bhsv[2];
    if (ahsv[1] !== bhsv[1]) return ahsv[1] - bhsv[1];
    return ahsv[0] - bhsv[0];
  });

  $app.textContent = "";
  render(html`<${App} />`, $app);
} catch (err) {
  $app.textContent = err.toString();
}

// Components(read global DATA) ---
function App() {
  return html`
    <${Swatches} />

    <div class="AppTop">
      <a href="#">🔝</a>
    </div>

    <ul class="AppGrid">
      ${DATA.map(
        (item) =>
          html`<li>
            <${Item} ...${item} />
          </li>`,
      )}
    </ul>
  `;
}

function Swatches() {
  return html`<details class="Swatches" open>
    <summary>
      Total <b>${DATA.length}</b> color schemes are supported. Click a swatch to
      jump!
    </summary>

    <nav>
      ${DATA.map(
        ({ metadata, colors }) =>
          html` <a
            href=${"#" + nameToHash(metadata.name)}
            onClick=${(ev) => {
              // XXX: JS is not needed in theory. 
              // But Firefox jumps to incorrect position w/o JS!
              ev.preventDefault();
              const target = document.querySelector(ev.currentTarget.hash);
              target.scrollIntoView();
              target.classList.add("-highlight");
            }}
            title=${metadata.name}
            style="
              --background: ${colors.background || "inherit"};
              --foreground: ${colors.foreground || "inherit"};
            "
          />`,
      )}
    </nav>
  </details>`;
}

/** @param {ColorSchemeItem} props */
function Item({ colors, metadata }) {
  const rowColors = colors.ansi.reduce(
    (acc, cur, idx) => {
      acc.push(cur, colors.brights[idx]);
      return acc;
    },
    [colors.foreground, colors.foreground],
  );
  const colColors = [colors.background, ...colors.ansi];
  const hash = nameToHash(metadata.name);

  const ref = useRef();
  const isVisible = useVisible(ref, { rootMargin: "20%" });

  return html`<article
    ref=${ref}
    id=${hash}
    class="Item"
    style="
      --background: ${colors.background || "inherit"};
      --foreground: ${colors.foreground || "inherit"};
      --cursor-bg: ${colors.cursor_bg || "inherit"};
      --cursor-fg: ${colors.cursor_fg || "inherit"};
      --cursor-border: ${colors.cursor_border || "inherit"};
      --selection-bg: ${colors.selection_bg || "inherit"};
      --selection-fg: ${colors.selection_fg || "inherit"};
    "
  >
    <h2 class="ItemHead" title=${metadata.name}>${metadata.name}</h2>

    ${isVisible.value
      ? html`
          <div>
            ${rowColors.map(
              (rowColor) => html`
                <div class="ItemBodyRow">
                  ${colColors.map(
                    (colColor) =>
                      html`<div
                        class="ItemBodyCell"
                        style="
                          --foreground: ${rowColor || "inherit"};
                          --background: ${colColor || "inherit"};
                        "
                      >
                        gYw
                      </div>`,
                  )}
                </div>
              `,
            )}
          </div>
        `
      : html`<div class="ItemPlaceholder" />`}

    <code class="ItemUsage">config.color_scheme = '${metadata.name}'</code>

    <footer class="ItemFooter">
      <dl>
        <div>
          <dt>Since:</dt>
          <dd>${metadata.wezterm_version}</dd>
        </div>
        <div>
          <dt>Author:</dt>
          <dd>${metadata.author || "???"}</dd>
        </div>
        <div>
          <dt>Links:</dt>
          <dd>
            <a
              href=${`https://wezfurlong.org/wezterm/colorschemes/${metadata.prefix}/index.html#${hash}`}
              target="_blank"
              >Docs</a
            >
            ${", "}
            <a href=${metadata.origin_url} target="_blank">Source</a>
          </dd>
        </div>
      </dl>
    </footer>
  </article>`;
}

// Utils ---
function nameToHash(name) {
  return name
    .toLowerCase()
    .replaceAll(/\s+/g, "-")
    .replaceAll(/\(|\)|\.|,/g, "");
}

function hexToRgb(hex) {
  const [, r1, r2, g1, g2, b1, b2] = [...hex];
  return [parseInt(r1 + r2, 16), parseInt(g1 + g2, 16), parseInt(b1 + b2, 16)];
}

function rgbToHsv(rgb) {
  let [r, g, b] = rgb.map((v) => v / 255);

  const [min, max] = [Math.min(r, g, b), Math.max(r, g, b)];
  const delta = max - min;

  let h = 0;
  if (delta === 0) {
    h = 0;
  } else if (max === r) {
    h = ((g - b) / delta) % 6;
  } else if (max === g) {
    h = (b - r) / delta + 2;
  } else {
    h = (r - g) / delta + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;

  return [h, max === 0 ? 0 : delta / max, max];
}

function useVisible(ref, options = {}) {
  const isVisible = useSignal(false);

  useEffect(() => {
    if (typeof IntersectionObserver !== "function") return;
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => (isVisible.value = entry.isIntersecting),
      options,
    );
    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [ref.current, options.threshold, options.root, options.rootMargin]);

  return isVisible;
}
