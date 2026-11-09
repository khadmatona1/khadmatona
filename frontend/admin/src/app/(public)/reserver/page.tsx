import { getTranslations } from "next-intl/server";
import { BookingPropertyList } from "@/components/rental/booking-property-list";

export async function generateMetadata() {
  const t = await getTranslations("Booking");
  return { title: t("chooseTitle"), description: t("chooseHint") };
}

export default function BookingPage() {
  return <BookingPropertyList />;
}
