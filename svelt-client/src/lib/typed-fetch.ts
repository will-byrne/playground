export const typedFetch = async <T>(url: string, fetcher: typeof fetch = globalThis.fetch): Promise<T> => {
  const response = await fetcher(url, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`error fetching (${url}): ${response.status} ${response.statusText} ${body}`);
  }

  return response.json() as Promise<T>;
};
