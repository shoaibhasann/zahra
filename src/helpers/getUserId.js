export function getUserId(request) {
  return request.headers.get("x-user-id") || request.headers.get("X-User-Id") || null;
}

export function getUserRole(request) {
  return request?.headers?.get("x-user-role") || null;
}
