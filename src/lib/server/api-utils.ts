export function jsonResponse(data: unknown, status: number = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

export function errorResponse(message: string, status: number): Response {
	return new Response(JSON.stringify({ error: message }), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

export async function parseRequestBody<T>(request: Request): Promise<T> {
	const text = await request.text();
	if (!text) {
		throw new Error('Request body is empty');
	}
	return JSON.parse(text) as T;
}

export function generateId(): string {
	return crypto.randomUUID().replace(/-/g, '');
}
