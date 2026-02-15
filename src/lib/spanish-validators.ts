// ===== Spanish DNI/NIE/CIF validation =====

const DNI_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";

export function validateDNI(value: string): { valid: boolean; type: "DNI" | "NIE" | null; message: string } {
  const cleaned = value.trim().toUpperCase().replace(/[\s.-]/g, "");
  if (!cleaned) return { valid: false, type: null, message: "" };

  // DNI: 8 digits + letter
  const dniMatch = cleaned.match(/^(\d{8})([A-Z])$/);
  if (dniMatch) {
    const num = parseInt(dniMatch[1]);
    const expectedLetter = DNI_LETTERS[num % 23];
    if (dniMatch[2] === expectedLetter) {
      return { valid: true, type: "DNI", message: "✅ DNI válido" };
    }
    return { valid: false, type: "DNI", message: "❌ La letra del DNI no es correcta" };
  }

  // NIE: X/Y/Z + 7 digits + letter
  const nieMatch = cleaned.match(/^([XYZ])(\d{7})([A-Z])$/);
  if (nieMatch) {
    const prefix = { X: "0", Y: "1", Z: "2" }[nieMatch[1]] || "0";
    const num = parseInt(prefix + nieMatch[2]);
    const expectedLetter = DNI_LETTERS[num % 23];
    if (nieMatch[3] === expectedLetter) {
      return { valid: true, type: "NIE", message: "✅ NIE válido" };
    }
    return { valid: false, type: "NIE", message: "❌ La letra del NIE no es correcta" };
  }

  if (/^\d{1,7}[A-Z]?$/.test(cleaned) || /^[XYZ]\d{0,6}[A-Z]?$/.test(cleaned)) {
    return { valid: false, type: null, message: "" }; // Still typing
  }

  return { valid: false, type: null, message: "❌ Formato no reconocido (DNI: 12345678A, NIE: X1234567A)" };
}

export function validateCIF(value: string): { valid: boolean; message: string } {
  const cleaned = value.trim().toUpperCase().replace(/[\s.-]/g, "");
  if (!cleaned) return { valid: false, message: "" };

  const cifMatch = cleaned.match(/^([ABCDEFGHJNPQRSUVW])(\d{7})([0-9A-J])$/);
  if (!cifMatch) {
    if (/^[ABCDEFGHJNPQRSUVW]\d{0,7}$/.test(cleaned)) {
      return { valid: false, message: "" }; // Still typing
    }
    return { valid: false, message: "❌ CIF inválido (formato: B12345678)" };
  }

  const [, letter, digits, control] = cifMatch;
  let sumEven = 0;
  let sumOdd = 0;

  for (let i = 0; i < 7; i++) {
    const d = parseInt(digits[i]);
    if (i % 2 === 0) {
      // Odd positions (1-indexed): double and sum digits
      const doubled = d * 2;
      sumOdd += Math.floor(doubled / 10) + (doubled % 10);
    } else {
      sumEven += d;
    }
  }

  const total = sumOdd + sumEven;
  const controlDigit = (10 - (total % 10)) % 10;
  const controlLetter = "JABCDEFGHI"[controlDigit];

  const validDigit = control === controlDigit.toString();
  const validLetter = control === controlLetter;

  // Some CIF types require letter, others digit, some accept both
  const letterOnly = "NPQRSW".includes(letter);
  const digitOnly = "ABEH".includes(letter);

  let isValid = false;
  if (letterOnly) isValid = validLetter;
  else if (digitOnly) isValid = validDigit;
  else isValid = validDigit || validLetter;

  return {
    valid: isValid,
    message: isValid ? "✅ CIF válido" : "❌ CIF con dígito de control incorrecto",
  };
}

// ===== Spanish postal code → city/province lookup =====

const PROVINCE_MAP: Record<string, { province: string; community: string }> = {
  "01": { province: "Álava", community: "País Vasco" },
  "02": { province: "Albacete", community: "Castilla-La Mancha" },
  "03": { province: "Alicante", community: "Comunidad Valenciana" },
  "04": { province: "Almería", community: "Andalucía" },
  "05": { province: "Ávila", community: "Castilla y León" },
  "06": { province: "Badajoz", community: "Extremadura" },
  "07": { province: "Baleares", community: "Islas Baleares" },
  "08": { province: "Barcelona", community: "Cataluña" },
  "09": { province: "Burgos", community: "Castilla y León" },
  "10": { province: "Cáceres", community: "Extremadura" },
  "11": { province: "Cádiz", community: "Andalucía" },
  "12": { province: "Castellón", community: "Comunidad Valenciana" },
  "13": { province: "Ciudad Real", community: "Castilla-La Mancha" },
  "14": { province: "Córdoba", community: "Andalucía" },
  "15": { province: "A Coruña", community: "Galicia" },
  "16": { province: "Cuenca", community: "Castilla-La Mancha" },
  "17": { province: "Girona", community: "Cataluña" },
  "18": { province: "Granada", community: "Andalucía" },
  "19": { province: "Guadalajara", community: "Castilla-La Mancha" },
  "20": { province: "Guipúzcoa", community: "País Vasco" },
  "21": { province: "Huelva", community: "Andalucía" },
  "22": { province: "Huesca", community: "Aragón" },
  "23": { province: "Jaén", community: "Andalucía" },
  "24": { province: "León", community: "Castilla y León" },
  "25": { province: "Lleida", community: "Cataluña" },
  "26": { province: "La Rioja", community: "La Rioja" },
  "27": { province: "Lugo", community: "Galicia" },
  "28": { province: "Madrid", community: "Comunidad de Madrid" },
  "29": { province: "Málaga", community: "Andalucía" },
  "30": { province: "Murcia", community: "Región de Murcia" },
  "31": { province: "Navarra", community: "Comunidad Foral de Navarra" },
  "32": { province: "Ourense", community: "Galicia" },
  "33": { province: "Asturias", community: "Principado de Asturias" },
  "34": { province: "Palencia", community: "Castilla y León" },
  "35": { province: "Las Palmas", community: "Canarias" },
  "36": { province: "Pontevedra", community: "Galicia" },
  "37": { province: "Salamanca", community: "Castilla y León" },
  "38": { province: "Santa Cruz de Tenerife", community: "Canarias" },
  "39": { province: "Cantabria", community: "Cantabria" },
  "40": { province: "Segovia", community: "Castilla y León" },
  "41": { province: "Sevilla", community: "Andalucía" },
  "42": { province: "Soria", community: "Castilla y León" },
  "43": { province: "Tarragona", community: "Cataluña" },
  "44": { province: "Teruel", community: "Aragón" },
  "45": { province: "Toledo", community: "Castilla-La Mancha" },
  "46": { province: "Valencia", community: "Comunidad Valenciana" },
  "47": { province: "Valladolid", community: "Castilla y León" },
  "48": { province: "Vizcaya", community: "País Vasco" },
  "49": { province: "Zamora", community: "Castilla y León" },
  "50": { province: "Zaragoza", community: "Aragón" },
  "51": { province: "Ceuta", community: "Ceuta" },
  "52": { province: "Melilla", community: "Melilla" },
};

export function lookupPostalCode(cp: string): { province: string; state: string } | null {
  const cleaned = cp.trim().replace(/\s/g, "");
  if (!/^\d{5}$/.test(cleaned)) return null;

  const prefix = cleaned.substring(0, 2);
  const match = PROVINCE_MAP[prefix];
  if (!match) return null;

  return { province: match.province, state: match.community };
}
