import { CurtainLink } from "../PageCurtain";

const LINKS = [
  { label: "Blog", to: "/blog" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

const LINK_CLASS =
  "rounded-full px-3 py-2 text-sm text-white/75 transition-colors hover:bg-white/[0.10] hover:text-white sm:px-3.5";

export function Navbar() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4 sm:top-6">
      <nav
        aria-label="Primary"
        className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-white/[0.10] bg-white/[0.04] p-1.5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.95)] backdrop-blur-2xl backdrop-saturate-150"
      >
        <CurtainLink
          to="/"
          className="mr-1 flex items-center gap-2 rounded-full px-2.5 py-2 sm:mr-2 sm:px-3"
        >
          <span className="size-2.5 rotate-45 rounded-[2px] border border-star/80 bg-star/30 shadow-[0_0_10px_rgba(157,180,255,0.6)]" />
          <span className="text-sm font-extrabold tracking-[-0.02em] text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)]">
            ATLAS
          </span>
        </CurtainLink>
        {LINKS.map((link) => (
          <CurtainLink key={link.to} to={link.to} className={LINK_CLASS}>
            {link.label}
          </CurtainLink>
        ))}
      </nav>
    </div>
  );
}
