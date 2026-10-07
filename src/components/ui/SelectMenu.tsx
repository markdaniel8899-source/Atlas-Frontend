import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EASE } from "../../lib/motion";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  hint?: string;
  icon?: LucideIcon;
}

interface SelectMenuProps<T extends string> {
  label: string;
  labelIcon?: LucideIcon;
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
}

export function SelectMenu<T extends string>({
  label,
  labelIcon,
  value,
  options,
  onChange,
}: SelectMenuProps<T>) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected =
    options.find((option) => option.value === value) ?? options[0];
  const SelectedIcon = selected?.icon;
  const LabelIcon = labelIcon;

  useEffect(() => {
    if (!open) return;

    const optionButtons = () =>
      Array.from(
        listRef.current?.querySelectorAll<HTMLButtonElement>(
          'button[role="option"]',
        ) ?? [],
      );

    const focusSelected = () => {
      const buttons = optionButtons();
      const target = buttons.find(
        (button) => button.getAttribute("aria-selected") === "true",
      );
      (target ?? buttons[0])?.focus();
    };
    focusSelected();

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const buttons = optionButtons();
      if (buttons.length === 0) return;
      event.preventDefault();
      const index = buttons.indexOf(
        document.activeElement as HTMLButtonElement,
      );
      if (index === -1) {
        const active = buttons.findIndex(
          (button) => button.getAttribute("aria-selected") === "true",
        );
        buttons[active === -1 ? 0 : active]?.focus();
        return;
      }
      const next =
        event.key === "ArrowDown"
          ? (index + 1) % buttons.length
          : (index - 1 + buttons.length) % buttons.length;
      buttons[next]?.focus();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div ref={rootRef} className="relative">
      <label
        htmlFor={id}
        className="mb-1.5 flex cursor-pointer items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-white/40"
      >
        {LabelIcon && <LabelIcon className="size-3" />}
        {label}
      </label>

      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-star ${
          open
            ? "border-[#cf9eff]/50 bg-[#cf9eff]/[0.08]"
            : "border-white/10 bg-white/[0.04] hover:border-[#cf9eff]/45 hover:bg-white/[0.07]"
        }`}
      >
        <span
          className={`grid size-8 shrink-0 place-items-center rounded-lg border transition-colors ${
            open
              ? "border-[#cf9eff]/40 bg-[#cf9eff]/15 text-[#cf9eff]"
              : "border-white/10 bg-white/[0.05] text-star/80"
          }`}
        >
          {SelectedIcon ? <SelectedIcon className="size-4" /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white">
            {selected?.label}
          </span>
          {selected?.hint && (
            <span className="mt-0.5 block truncate text-[11px] text-white/40">
              {selected.hint}
            </span>
          )}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 transition-transform duration-300 ${
            open ? "rotate-180 text-[#cf9eff]" : "text-white/35"
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={listRef}
            role="listbox"
            aria-label={label}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: EASE }}
            className="absolute top-[calc(100%+8px)] right-0 left-0 z-30 rounded-2xl border border-white/10 bg-[#0a0a12]/95 p-1.5 shadow-[0_28px_70px_-24px_rgba(0,0,0,0.95)] backdrop-blur-2xl card-sheen"
          >
            {options.map((option) => {
              const Icon = option.icon;
              const active = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(option.value);
                    close();
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-star ${
                    active
                      ? "bg-[#cf9eff]/12"
                      : "hover:bg-white/[0.07]"
                  }`}
                >
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-lg border ${
                      active
                        ? "border-[#cf9eff]/40 bg-[#cf9eff]/15 text-[#cf9eff]"
                        : "border-white/10 bg-white/[0.05] text-white/45"
                    }`}
                  >
                    {Icon ? <Icon className="size-4" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-sm ${
                        active ? "font-medium text-white" : "text-white/75"
                      }`}
                    >
                      {option.label}
                    </span>
                    {option.hint && (
                      <span className="mt-0.5 block truncate text-[11px] text-white/40">
                        {option.hint}
                      </span>
                    )}
                  </span>
                  {active && <Check className="size-4 shrink-0 text-[#cf9eff]" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
