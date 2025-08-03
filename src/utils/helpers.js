export function isEmailOrPhone(input) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\+?[0-9\s\-().]{7,}$/;

  if (emailRegex.test(input)) return "email";
  if (phoneRegex.test(input)) return "phone";
  return null;
}

export function isEmailOrId(input) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const idRegex = /^\d+$/; // only digits

  if (emailRegex.test(input)) return "email";
  if (idRegex.test(input)) return "id";
  return null;
}

