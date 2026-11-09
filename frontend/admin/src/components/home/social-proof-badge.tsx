import Image from "next/image";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { Star } from "lucide-react";

// Stand-in client photos (AI-generated, not real photographed people).
const SOCIAL_PROOF_AVATARS = [
  "https://res.cloudinary.com/udflrhgq/image/upload/v1785513162/Gemini_Generated_Image_wopwo7wopwo7wopw_cy61g0.png",
  "https://res.cloudinary.com/udflrhgq/image/upload/v1785513163/Gemini_Generated_Image_wopwo7wopwo7wopw2_u4yvmc.png",
  "https://res.cloudinary.com/udflrhgq/image/upload/v1785513163/Gemini_Generated_Image_wopwo7wopwo7wopw3_oz1otd.png",
];

/**
 * Shared "avatars + N clients + stars" testimonial badge - used by both the
 * Hero and the sell/rent section, so the two don't each hand-roll their own
 * copy of the same avatars/markup. Positioning/entrance-animation classes
 * are left to the caller (`className`/`style`) since Hero and the sell/rent
 * section each use a different animation system (Hero's own load-time
 * `hero-reveal` keyframe vs the sell/rent section's scroll-triggered
 * `<Reveal>` wrapper).
 */
export function SocialProofBadge({
  clientsCount,
  className,
  style,
}: {
  clientsCount: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const t = useTranslations("Home");

  return (
    <div
      className={clsx(
        "relative z-10 flex w-fit items-center gap-3 rounded-lg bg-ink/70 px-4 py-3 backdrop-blur-sm",
        className,
      )}
      style={style}
    >
      <div className="flex -space-x-3 rtl:space-x-reverse" aria-hidden="true">
        {SOCIAL_PROOF_AVATARS.map((src) => (
          <span
            key={src}
            className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full ring-2 ring-ink"
          >
            <Image src={src} alt="" fill unoptimized sizes="36px" className="object-cover" />
          </span>
        ))}
      </div>
      <div className="flex flex-col items-start gap-1">
        <p className="text-[0.92rem] font-bold text-white">
          {clientsCount} {t("socialProofLabel")}
        </p>
        <div className="flex items-center gap-0.5" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((index) => (
            <Star key={index} className="h-3.5 w-3.5 fill-gold-secondary text-gold-secondary" />
          ))}
        </div>
      </div>
    </div>
  );
}
