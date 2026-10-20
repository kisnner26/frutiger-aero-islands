/** correo de contacto de la beta: se define al publicar con VITE_CONTACT_EMAIL (no se inventa uno). */
export const CONTACT_EMAIL = (import.meta.env.VITE_CONTACT_EMAIL as string | undefined)?.trim() || null;
