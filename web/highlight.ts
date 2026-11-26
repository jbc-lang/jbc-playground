// Syntax colouring for the editor: one left-to-right pass over each line.
// jBC is irregular (no reserved words, "*" is a comment only where a
// statement starts), so this is a close approximation, not the compiler's
// grammar. The words come from the pinned jbcc (web/jbc-words.json, written
// by tools/jbc-words.py); jbcc's keywords are upper case only, as here.
// The classes are the ones the jBC guide uses for its code blocks.
import words from "./jbc-words.json";

// Clause and operator words jbcc reads outside its statement tables.
const CLAUSES = ["IN", "LENGTH", "NOT", "EQ", "NE", "LT", "GT", "LE", "GE", "MATCH", "MATCHES", "LIKE", "UNLIKE"];
const statements = new Set([...words.statements, ...CLAUSES]);
const functions = new Set(words.functions);
const unavailable = new Set(words.unavailable);

const NAME = /[A-Za-z][A-Za-z0-9_.$]*/y;
const NUMBER = /\d+(?:\.\d+)?|\.\d+/y;
const LABEL = /^(\s*)([A-Za-z0-9_.$]+:)(?!=)/;
const DIRECTIVE = /[$#][A-Za-z]+/y;
const COMMENT_START = /(?:\*|!|\/\/|REM\b)/y;

function escape(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function span(kind: string, text: string) {
  return `<span class="${kind}">${escape(text)}</span>`;
}

function match(pattern: RegExp, line: string, at: number) {
  pattern.lastIndex = at;
  return pattern.exec(line)?.[0];
}

export function highlightLine(line: string): string {
  let out = "";
  let at = 0;
  // Where a statement may start: the line start and after ";".
  let statementStart = true;
  // A label opens the line: "LOOP.START:" or "100:".
  const label = LABEL.exec(line);
  if (label) {
    out += escape(label[1]) + span("c-label", label[2]);
    at = label[0].length;
  }
  while (at < line.length) {
    const char = line[at];
    if (char === " " || char === "\t") {
      out += char;
      at++;
      continue;
    }
    if (statementStart) {
      const comment = match(COMMENT_START, line, at);
      if (comment) {
        out += span("c-5com", line.slice(at));
        break;
      }
      const directive = match(DIRECTIVE, line, at);
      if (directive) {
        out += span("c-3typ", directive);
        at += directive.length;
        statementStart = false;
        continue;
      }
    }
    statementStart = false;
    if (char === ";") {
      out += ";";
      at++;
      statementStart = true;
      continue;
    }
    if (char === "'" || char === '"' || char === "\\") {
      const end = line.indexOf(char, at + 1);
      // A backslash is a string only when it is closed on the same line.
      if (char !== "\\" || end !== -1) {
        const stop = end === -1 ? line.length : end + 1;
        out += span("c-4str", line.slice(at, stop));
        at = stop;
        continue;
      }
    }
    if (char === "@") {
      const name = match(NAME, line, at + 1);
      out += span("c-3typ", "@" + (name ?? ""));
      at += 1 + (name?.length ?? 0);
      continue;
    }
    const number = /[A-Za-z0-9_.$]/.test(line[at - 1] ?? "") ? undefined : match(NUMBER, line, at);
    if (number) {
      out += span("c-2num", number);
      at += number.length;
      continue;
    }
    const name = match(NAME, line, at);
    if (name) {
      const call = /^\s*\(/.test(line.slice(at + name.length));
      // A function only when called: IN is also a clause of LOCATE and FOR.
      const kind = functions.has(name) && call ? "c-0fun" : statements.has(name) ? "c-1com" : "";
      const classes = [kind, unavailable.has(name) ? "c-unavailable" : ""].filter(Boolean).join(" ");
      out += classes ? span(classes, name) : escape(name);
      at += name.length;
      continue;
    }
    out += escape(char);
    at++;
  }
  return out;
}

const cache = new Map<string, string>();

export function highlight(source: string): string {
  if (cache.size > 5000) cache.clear();
  return source.split("\n").map((line) => {
    let html = cache.get(line);
    if (html === undefined) {
      html = highlightLine(line);
      cache.set(line, html);
    }
    return html;
  }).join("\n") + "\n";
}

// The browser-only names in highlighted HTML (not in strings or comments),
// for the hint under the editor.
export function unavailableNames(html: string): string[] {
  return [...new Set(Array.from(html.matchAll(/c-unavailable">([^<]+)</g), (m) => m[1]))];
}
