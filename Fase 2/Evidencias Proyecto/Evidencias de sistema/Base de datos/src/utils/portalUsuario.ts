import crypto from 'crypto';

/** Usuario de portal = nombre de la empresa (trim) */
export function portalUsuarioFromNombreEmpresa(nombreCliente: string): string {
    return nombreCliente.trim();
}

/** Contraseña segura de 8 caracteres (mayúscula, minúscula y número) */
export function generarPasswordPortalSegura(length = 8): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const all = upper + lower + digits;

    const pick = (chars: string) => chars[crypto.randomInt(0, chars.length)];

    const chars: string[] = [pick(upper), pick(lower), pick(digits)];
    while (chars.length < length) {
        chars.push(pick(all));
    }

    for (let i = chars.length - 1; i > 0; i--) {
        const j = crypto.randomInt(0, i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join('');
}
