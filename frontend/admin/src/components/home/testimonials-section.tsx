import { getTranslations } from "next-intl/server";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { GoogleGIcon, TestimonialsCarousel } from "@/components/home/testimonials-carousel";
import { getReviews } from "@/lib/reviews";

/**
 * Renders nothing at all when the backend has no reviews to show (Google
 * Places not configured yet, or the upstream call failed) - the backend
 * itself is the only place that ever decides whether to substitute
 * temporary fake data, behind the SHOW_FAKE_REVIEWS env flag (see
 * App\Modules\Reviews\Infrastructure\FakeReviews). This component just
 * renders whatever `getReviews()` returns, real or fake, with no
 * environment-specific logic of its own.
 */
export async function TestimonialsSection() {
  const t = await getTranslations("Testimonials");
  const summary = await getReviews();
  if (!summary || summary.reviews.length === 0) return null;

  return (
    <section className="bg-surface-deep px-4 py-14 sm:px-5 sm:py-20 lg:px-6">
      <div className="mx-auto max-w-7xl">
        <Reveal className="mb-10 sm:mb-20 flex flex-col items-center text-center">
          <p className="mb-3 text-[0.72rem] font-bold tracking-[0.28em] text-gold-primary uppercase">
            {t("eyebrow")}
          </p>
          <h2 className="font-display text-3xl font-semibold text-text sm:text-4xl">{t("title")}</h2>
          <p className="mt-2 text-text-muted">{t("subtitle")}</p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-5 sm:gap-8">
            <div className="flex items-center gap-2">
              <Star className="h-6 w-6 fill-gold-primary text-gold-primary" />
              <span className="font-display text-2xl font-bold text-text">
                {summary.rating.toFixed(1)}
                <span className="text-base font-normal text-text-muted">/5</span>
              </span>
            </div>
            <span className="hidden h-8 w-px bg-border sm:block" aria-hidden="true" />
            <p className="text-[0.9rem] text-text-muted">{t("basedOn", { total: summary.total })}</p>
            <span className="hidden h-8 w-px bg-border sm:block" aria-hidden="true" />
            <div className="flex items-center gap-2.5">
              <GoogleGIcon className="h-7 w-7 shrink-0" />
              <div className="flex flex-col items-start leading-tight">
                <span className="font-display text-lg font-bold text-text">{t("totalCount", { total: summary.total })}</span>
                <span className="text-[0.8rem] text-text-muted">{t("googleReviews")}</span>
              </div>
            </div>
          </div>
        </Reveal>

        <TestimonialsCarousel reviews={summary.reviews} />

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <a href={summary.write_review_url} target="_blank" rel="noopener noreferrer">
            <Button variant="primary">
              <GoogleGIcon className="h-4 w-4 shrink-0" />
              {t("leaveReview")}
            </Button>
          </a>
          <a href={summary.all_reviews_url} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary">{t("seeAllReviews")}</Button>
          </a>
        </div>
      </div>
    </section>
  );
}
