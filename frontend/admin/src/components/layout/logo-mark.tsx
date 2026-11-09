import Image from "next/image";

// Two real exports of the brand mark - one with a black wordmark/swoosh
// (for light backgrounds), one with a white wordmark/swoosh (for dark
// backgrounds) - swapped purely via CSS (see `.logo-light`/`.logo-dark` in
// globals.css) so there's no client-side theme detection or hydration
// flicker. Only the roof/key stay gold in both.
const LOGO_LIGHT =
  "https://res.cloudinary.com/udflrhgq/image/upload/v1785328321/WhatsApp_Image_2026-07-29_at_10.23.44-removebg-preview_uxklfq.png";
const LOGO_DARK =
  "https://res.cloudinary.com/udflrhgq/image/upload/v1785329750/magic_edit_TUFIUXhLbmZqeE0jMSMxMDFmZGQyOGU0ZWMxZGEzYTIwN2JiMDkwYzdmODk4OCM2MTIjI1RSQU5TRk9STUFUSU9OX1JFUVVFU1Q-removebg-preview_jhs8kv.png";

export function LogoMark({ className }: { className?: string }) {
  return (
    <>
      <Image
        src={LOGO_LIGHT}
        alt=""
        width={612}
        height={408}
        unoptimized
        priority
        className={`logo-light ${className ?? ""}`}
      />
      <Image
        src={LOGO_DARK}
        alt=""
        width={612}
        height={408}
        unoptimized
        priority
        className={`logo-dark ${className ?? ""}`}
      />
    </>
  );
}
