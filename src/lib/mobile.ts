/**
 * True for phone/tablet user agents or narrow viewports.
 * Used to skip heavy WebGL effects and show the CSS fallback instead.
 */
export const isMobile = (): boolean => {
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    ) || window.innerWidth <= 768
  );
};
