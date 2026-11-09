const aliases: Record<string, string> = {
  apartment: "apartment", appartement: "apartment", شقة: "apartment",
  house_villa: "house_villa", villa: "house_villa", maison: "house_villa", فيلا: "house_villa", منزل: "house_villa",
  riad: "riad", رياض: "riad",
  land: "land", terrain: "land", أرض: "land", ارض: "land",
  commercial: "commercial", محل_تجاري: "commercial", "local commercial": "commercial",
  office: "office", bureau: "office", مكتب: "office",
  shop: "shop", boutique: "shop", متجر: "shop",
};

export function importPropertyType(value: string | null): string | undefined {
  return value ? aliases[value.trim().toLowerCase()] : undefined;
}
