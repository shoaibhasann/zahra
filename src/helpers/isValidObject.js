const objectIdRegex = /^[a-f\d]{24}$/i;

export function isValidObjectId(id) {
  return objectIdRegex.test(String(id));
}
