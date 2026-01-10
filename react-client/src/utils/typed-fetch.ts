export const typedFetch = <T>(url: string): Promise<T> =>
	fetch(url, {
		headers: {
			"Content-Type": "application/json",
			"Access-Control": "Allow-Origin",
		},
	}).then((response) => {
		if (!response.ok) {
			throw new Error(`error fetching (${url}): ${response.statusText}`);
		}
		return response.json() as Promise<T>;
	});
