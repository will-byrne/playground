import type { NamedAPIResource } from "pokenode-ts";

export const getEnglishEntry = <T extends { language: NamedAPIResource }>(
	t: T[],
) => t.find(({ language }) => language.name === "en");
