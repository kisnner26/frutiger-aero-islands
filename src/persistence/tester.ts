/**
 * cuentas de prueba de quien hace el juego: brillos al tope, nivel alto y pase aero abierto para poder probar todo.
 * es una comodidad del lado del cliente para esas cuentas, no un permiso real: lo que vale en el servidor
 * (precio del pase, premios de pago) se decidirá allí cuando exista el cobro.
 */
export const TESTERS: readonly string[] = ['kisnnermobile'];
export const TESTER_BRILLOS = 1_000_000_000;
export const TESTER_LEVEL = 20;
export const isTester = (username: string | null | undefined): boolean => Boolean(username) && TESTERS.includes(String(username).toLowerCase());
