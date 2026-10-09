/**
 * True for phone/tablet user agents or narrow viewports.
 * Used ONLY to optimize the real WebGL effects (cap DPR, lower quality /
 * particle counts) — never to hide an effect or swap in a CSS fallback.
 */
export const isMobile = (): boolean => {
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    ) || window.innerWidth <= 768
  );
};
