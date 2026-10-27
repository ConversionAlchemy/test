// One number field for every amount: type it or step it with ▲▼ (hold to repeat; Shift ×10, Ctrl ×100), see what it
// will do, then ✓ or Enter. Escape puts it back. Nothing changes until it's confirmed
import { escapeHtml } from "@/utils/stringUtils";
import { play } from "./sfx";

/** The field's markup; `signed` fields start at 0 and move an amount either way */
export const numberField = (name: string, value: number, tip: string, signed = false) =>
  `<span class="flField${signed ? " flSigned" : ""}" data-field="${name}" data-tip="${escapeHtml(tip)}"><input type="text" inputmode="numeric" autocomplete="off" spellcheck="false" value="${fmt(value, signed)}" /><span class="flSteps"><button type="button" tabindex="-1" data-dir="1">▲</button><button type="button" tabindex="-1" data-dir="-1">▼</button></span><button type="button" class="flTick" tabindex="-1" disabled data-tip="Confirm (Enter)">✓</button></span>`;

const fmt = (n: number, signed: boolean) => {
  const text = Math.round(Math.abs(n)).toLocaleString("en-US");
  return n < 0 ? `−${text}` : signed && n > 0 ? `+${text}` : text;
};
const parse = (text: string) => {
  const negative = /^\s*[-−]/.test(text);
  const digits = Number(text.replace(/[^\d]/g, "") || 0);
  return negative ? -digits : digits;
};

export interface FieldWiring {
  /** The figure the field starts from: what is there now (0 for a signed field) */
  current: () => number;
  /** A line saying what confirming `next` would do */
  preview?: (next: number) => string;
  /** Make it so; "" or why not */
  apply: (next: number) => string;
  /** After a confirmed change, or a refusal (with its reason) */
  done: (why: string, field: HTMLElement) => void;
  min?: number;
  max?: () => number;
  /** A figure to start from, already waiting to be confirmed */
  start?: number;
}

/** Wire one field already in the page */
export function wireField(field: HTMLElement, wiring: FieldWiring): void {
  const input = field.querySelector("input")!;
  const tick = field.querySelector<HTMLButtonElement>(".flTick")!;
  const signed = field.classList.contains("flSigned");
  const preview = document.createElement("div");
  preview.className = "flPreview";
  const line = field.closest(".flPurseHead, .flPurseLine, .flFieldLine") ?? field;
  const clamp = (n: number) =>
    Math.min(wiring.max?.() ?? Infinity, Math.max(wiring.min ?? (signed ? -Infinity : 0), n));

  let pending: number | null = null;
  const show = () => {
    const changed = pending !== null && pending !== wiring.current();
    tick.disabled = !changed;
    field.classList.toggle("flPending", changed);
    const text = changed && wiring.preview ? wiring.preview(pending!) : "";
    preview.textContent = text;
    if (text && !preview.isConnected) line.after(preview);
    if (!text) preview.remove();
  };
  const set = (n: number) => {
    pending = clamp(n);
    input.value = fmt(pending, signed);
    show();
  };
  const reset = () => {
    pending = null;
    input.value = fmt(wiring.current(), signed);
    show();
  };
  const confirm = () => {
    if (pending === null || pending === wiring.current()) return reset();
    const why = wiring.apply(pending);
    pending = null;
    preview.remove();
    wiring.done(why, field);
  };

  if (wiring.start !== undefined) set(wiring.start);
  input.addEventListener("focus", () => input.select());
  input.addEventListener("input", () => {
    pending = clamp(parse(input.value));
    show();
  });
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      confirm();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      reset(); // focus stays: an Escape that reached the page would close the panel
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      step(event.key === "ArrowUp" ? 1 : -1, event);
    }
  });
  tick.addEventListener("click", confirm);

  const step = (dir: number, event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => {
    const by = event.ctrlKey || event.metaKey ? 100 : event.shiftKey ? 10 : 1;
    set((pending ?? wiring.current()) + dir * by);
    play("step");
  };
  for (const button of field.querySelectorAll<HTMLButtonElement>("[data-dir]")) {
    let timer = 0;
    const stop = () => clearTimeout(timer);
    button.addEventListener("pointerdown", event => {
      event.preventDefault(); // the input keeps focus; nothing is rebuilt under the pointer
      const dir = Number(button.dataset.dir);
      step(dir, event);
      let delay = 380;
      const again = () => {
        step(dir, event);
        delay = Math.max(40, delay * 0.8);
        timer = window.setTimeout(again, delay);
      };
      timer = window.setTimeout(again, delay);
    });
    for (const type of ["pointerup", "pointerleave", "pointercancel"]) button.addEventListener(type, stop);
  }
}
