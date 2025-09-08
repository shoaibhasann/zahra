import parsePhoneNumber from "libphonenumber-js";

export function normalizeIndianPhoneNumber(input) {
  if (!input) return;

  const phoneNumber = parsePhoneNumber(input, "IN");

  if (phoneNumber && phoneNumber.isValid()) {
    return phoneNumber.format("E.164");
  } 

  return null;
}