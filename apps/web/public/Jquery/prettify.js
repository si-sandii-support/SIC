
/*!
 * SIC Prettify v1.0.0
 * Lightweight, dependency-free code syntax highlighter.
 * Supports JavaScript, JSX, TypeScript, JSON, Python, CSS,
 * HTML/XML, SQL, Bash and generic code snippets.
 */
(function (window, document) {
  "use strict";

  if (!window || !document) return;

  const VERSION = "1.0.0";
  const STYLE_ID = "sic-prettify-styles";
  const SELECTOR =
    "pre.prettyprint, pre code, code.prettyprint, pre[class*='language-'] code";

  const KEYWORDS = {
    javascript: words(
      "const let var function return if else switch case break continue " +
      "for while do try catch finally throw new class extends super this " +
      "import export from as default async await yield typeof instanceof " +
      "in of void delete debugger static get set"
    ),
    python: words(
      "def class return if elif else for while in try except finally " +
      "raise with as lambda yield async await pass break continue global " +
      "nonlocal assert del import from"
    ),
    bash: words(
      "if then else fi for while do done case esac function local export " +
      "readonly return exit in select until"
    ),
    sql: words(
      "select from where join inner left right outer on group by order " +
      "having limit offset insert into values update set delete create " +
      "table alter drop primary key foreign references null is not and or " +
      "as distinct count sum avg max min asc desc union all exists like " +
      "between case when then end"
    ),
    css: words(
      "important inherit initial unset auto none block inline flex grid " +
      "absolute relative fixed sticky hidden transparent"
    ),
    json: new Set()
  };

  const LITERALS = words(
    "true false null undefined NaN Infinity None True False " +
    "False TRUE FALSE NULL"
  );

  function words(value) {
    return new Set(value.split(/\s+/).filter(Boolean));
  }

  function escapeHTML(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .sic-prettify {
        color: #24292f;
        tab-size: 2;
        -moz-tab-size: 2;
      }

      .sic-prettify .sic-token-comment {
        color: #6a737d;
        font-style: italic;
      }

      .sic-prettify .sic-token-string {
        color: #0a7d36;
      }

      .sic-prettify .sic-token-number {
        color: #0550ae;
      }

      .sic-prettify .sic-token-keyword {
        color: #8250df;
        font-weight: 600;
      }

      .sic-prettify .sic-token-literal {
        color: #cf222e;
        font-weight: 500;
      }

      .sic-prettify .sic-token-function {
        color: #953800;
      }

      .sic-prettify .sic-token-tag {
        color: #116329;
      }

      .sic-prettify .sic-token-operator {
        color: #57606a;
      }

      .sic-prettify .sic-token-property {
        color: #0550ae;
      }
    `;

    document.head.appendChild(style);
  }

  function getLanguage(element, source) {
    const elements = [element, element.parentElement].filter(Boolean);

    for (const node of elements) {
      const declared =
        node.getAttribute("data-language") ||
        node.getAttribute("lang") ||
        "";

      const match =
        (declared + " " + node.className).match(
          /(?:language-|lang-)([\w+-]+)/i
        );

      if (match) return normalizeLanguage(match[1]);
    }

    const trimmed = source.trim();

    if (/^<!doctype|^<!--|^<\/?[a-z][^>]*>/i.test(trimmed)) {
      return "html";
    }

    try {
      JSON.parse(trimmed);
      return "json";
    } catch (_) {
      // Not JSON; continue with source detection.
    }

    if (
      /^\s*(import|export|const|let|var|function|async\s+function)\b/m.test(
        source
      )
    ) {
      return "javascript";
    }

    if (/^\s*(def|elif|except|print)\b/m.test(source)) {
      return "python";
    }

    return "javascript";
  }

  function normalizeLanguage(language) {
    const value = language.toLowerCase();

    const aliases = {
      js: "javascript",
      jsx: "javascript",
      mjs: "javascript",
      cjs: "javascript",
      ts: "javascript",
      tsx: "javascript",
      py: "python",
      html: "html",
      xml: "html",
      svg: "html",
      sh: "bash",
      shell: "bash",
      yml: "json",
      jsonc: "json"
    };

    return aliases[value] || value;
  }

  function tokenClass(token, language, source, index) {
    if (
      token.startsWith("/*") ||
      token.startsWith("//") ||
      (token.startsWith("#") &&
        ["python", "bash", "yaml", "ruby"].includes(language)) ||
      (token.startsWith("--") && language === "sql")
    ) {
      return "comment";
    }

    if (/^["'`]/.test(token)) return "string";
    if (/^(?:\d|\.\d)/.test(token)) return "number";

    if (/^(?:===|!==|=>|==|!=|<=|>=|\+\+|--|&&|\|\||\*\*)$/.test(token)) {
      return "operator";
    }

    if (/^[+\-*\/%=<>!&|^~?:]$/.test(token)) {
      return "operator";
    }

    if (/^[A-Za-z_$][\w$]*$/.test(token)) {
      const word = language === "json" ? token : token.toLowerCase();
      const keywordSet = KEYWORDS[language];

      if (LITERALS.has(token) || LITERALS.has(word)) {
        return "literal";
      }

      if (keywordSet && keywordSet.has(word)) {
        return "keyword";
      }

      const after = source.slice(index + token.length);
      const before = source.slice(0, index);

      if (/^\s*\(/.test(after)) return "function";
      if (/\.\s*$/.test(before)) return "property";
    }

    return "";
  }

  function highlightMarkup(source) {
    const pattern =
      /<!--[\s\S]*?-->|<!DOCTYPE\b[^>]*>|<\/?[A-Za-z][^>]*>/gi;

    let result = "";
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(source)) !== null) {
      result += escapeHTML(source.slice(lastIndex, match.index));
      result +=
        '<span class="sic-token-tag">' +
        escapeHTML(match[0]) +
        "</span>";

      lastIndex = pattern.lastIndex;
    }

    result += escapeHTML(source.slice(lastIndex));
    return result;
  }

  function highlightCode(source, language) {
    if (language === "html") {
      return highlightMarkup(source);
    }

    let commentPattern = String.raw`\/\*[\s\S]*?\*\/|\/\/[^\r\n]*`;

    if (["python", "bash", "yaml", "ruby"].includes(language)) {
      commentPattern = String.raw`#[^\r\n]*|\/\*[\s\S]*?\*\/`;
    } else if (language === "sql") {
      commentPattern = String.raw`--[^\r\n]*|\/\*[\s\S]*?\*\/`;
    } else if (language === "json") {
      commentPattern = String.raw`(?!)`;
    }

    const pattern = new RegExp(
      `${commentPattern}` +
      String.raw`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\x60(?:\\.|[^\x60\\])*\x60` +
      String.raw`|\b(?:0[xX][\da-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b` +
      String.raw`|[A-Za-z_$][\w$]*` +
      String.raw`|===|!==|=>|==|!=|<=|>=|\+\+|--|&&|\|\||\*\*` +
      String.raw`|[+\-*\/%=<>!&|^~?:]|\{|\}|\(|\)|\[|\]|\.|,|;`,
      "g"
    );

    let result = "";
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(source)) !== null) {
      const token = match[0];
      const index = match.index;

      result += escapeHTML(source.slice(lastIndex, index));

      const type = tokenClass(token, language, source, index);

      if (type) {
        result +=
          `<span class="sic-token-${type}">` +
          escapeHTML(token) +
          "</span>";
      } else {
        result += escapeHTML(token);
      }

      lastIndex = pattern.lastIndex;
    }

    result += escapeHTML(source.slice(lastIndex));
    return result;
  }

  function highlightElement(element) {
    if (!element || element.classList.contains("sic-prettified")) {
      return;
    }

    if (element.tagName === "PRE" && element.querySelector("code")) {
      return;
    }

    const source = element.textContent || "";
    if (!source.trim()) return;

    const language = getLanguage(element, source);

    addStyles();

    element.classList.add("sic-prettify");
    element.innerHTML = highlightCode(source, language);
    element.classList.add("sic-prettified");
    element.setAttribute("data-sic-prettify-version", VERSION);
  }

  function highlightAll(root) {
    addStyles();

    const container = root || document;
    const elements = [];

    if (
      container.nodeType === 1 &&
      container.matches &&
      container.matches(SELECTOR)
    ) {
      elements.push(container);
    }

    if (container.querySelectorAll) {
      elements.push(...container.querySelectorAll(SELECTOR));
    }

    elements.forEach(highlightElement);
  }

  function initialize() {
    highlightAll();

    if (window.MutationObserver && document.body) {
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              highlightAll(node);
            }
          });
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  // Public API and compatibility with the familiar prettyPrint() name.
  window.SICPrettify = {
    version: VERSION,
    highlight: highlightElement,
    highlightAll: highlightAll
  };

  window.prettyPrint = highlightAll;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, {
      once: true
    });
  } else {
    initialize();
  }
})(window, document);
