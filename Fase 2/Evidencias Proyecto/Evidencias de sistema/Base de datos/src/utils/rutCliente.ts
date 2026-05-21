/** Genera un RUT válido determinístico para usuarios portal cliente */
export function rutForClientePortal(idCliente: number): string {
    const body = String(10000000 + idCliente).slice(-8);
    let sum = 0;
    let multiplier = 2;
    for (let i = body.length - 1; i >= 0; i--) {
        sum += parseInt(body[i], 10) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    const remainder = sum % 11;
    const dv = remainder === 0 ? '0' : remainder === 1 ? 'K' : String(11 - remainder);
    return `${body}-${dv}`;
}
