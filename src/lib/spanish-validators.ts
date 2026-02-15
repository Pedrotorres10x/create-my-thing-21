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

// Major cities by CP range for smart city detection
const CITY_MAP: Record<string, string> = {
  // Madrid
  "280": "Madrid", "281": "Madrid",
  "282": "Alcalá de Henares", "283": "Aranjuez", "284": "Arganda del Rey",
  "285": "Torrejón de Ardoz", "286": "Pozuelo de Alarcón", "287": "Majadahonda",
  // Barcelona
  "080": "Barcelona", "081": "Barcelona", "082": "Barcelona",
  "083": "Sabadell", "084": "Terrassa", "085": "Badalona",
  "086": "Mataró", "087": "Granollers", "088": "Sant Cugat del Vallès",
  // Valencia
  "460": "Valencia", "461": "Valencia", "462": "Valencia",
  "463": "Burjassot", "467": "Torrent",
  // Sevilla
  "410": "Sevilla", "411": "Sevilla", "412": "Sevilla",
  // Zaragoza
  "500": "Zaragoza", "501": "Zaragoza", "502": "Zaragoza",
  // Málaga
  "290": "Málaga", "291": "Málaga", "292": "Málaga",
  "295": "Marbella", "296": "Marbella",
  // Murcia
  "300": "Murcia", "301": "Murcia", "303": "Cartagena",
  // Palma
  "070": "Palma de Mallorca", "071": "Palma de Mallorca",
  // Las Palmas
  "350": "Las Palmas de Gran Canaria", "351": "Las Palmas de Gran Canaria",
  // Bilbao
  "480": "Bilbao", "481": "Bilbao",
  // Alicante
  "030": "Alicante", "031": "Alicante", "036": "Elche",
  // Córdoba
  "140": "Córdoba", "141": "Córdoba",
  // Valladolid
  "470": "Valladolid", "471": "Valladolid",
  // Vigo
  "362": "Vigo", "363": "Vigo",
  // Gijón
  "332": "Gijón", "333": "Gijón",
  // A Coruña
  "150": "A Coruña", "151": "A Coruña",
  // Granada
  "180": "Granada", "181": "Granada",
  // Vitoria
  "010": "Vitoria-Gasteiz", "011": "Vitoria-Gasteiz",
  // Oviedo
  "330": "Oviedo", "331": "Oviedo",
  // Santander
  "390": "Santander", "391": "Santander",
  // San Sebastián
  "200": "San Sebastián", "201": "San Sebastián",
  // Pamplona
  "310": "Pamplona", "311": "Pamplona",
  // Cádiz
  "110": "Cádiz", "116": "Jerez de la Frontera",
  // Salamanca
  "370": "Salamanca", "371": "Salamanca",
  // Logroño
  "260": "Logroño", "261": "Logroño",
  // Tarragona
  "430": "Tarragona", "431": "Tarragona",
  // Lleida
  "250": "Lleida", "251": "Lleida",
  // Girona
  "170": "Girona", "171": "Girona",
  // Huelva
  "210": "Huelva", "211": "Huelva",
  // Almería
  "040": "Almería", "041": "Almería",
  // Jaén
  "230": "Jaén", "231": "Jaén",
  // Castellón
  "120": "Castellón de la Plana", "121": "Castellón de la Plana",
  // Badajoz
  "060": "Badajoz", "061": "Badajoz",
  // León
  "240": "León", "241": "León",
  // Burgos
  "090": "Burgos", "091": "Burgos",
  // Albacete
  "020": "Albacete", "021": "Albacete",
  // Ciudad Real
  "130": "Ciudad Real",
  // Toledo
  "450": "Toledo", "451": "Toledo",
  // Cáceres
  "100": "Cáceres", "101": "Cáceres",
  // Ceuta / Melilla
  "510": "Ceuta", "520": "Melilla",
};

export function lookupPostalCode(cp: string): { city: string; province: string; state: string } | null {
  const cleaned = cp.trim().replace(/\s/g, "");
  if (!/^\d{5}$/.test(cleaned)) return null;

  const prefix = cleaned.substring(0, 2);
  const match = PROVINCE_MAP[prefix];
  if (!match) return null;

  // Try 3-digit prefix first for city match, fallback to province capital
  const prefix3 = cleaned.substring(0, 3);
  const city = CITY_MAP[prefix3] || match.province;

  return { city, province: match.province, state: match.community };
}

// ===== City autocomplete =====

export interface SpanishCity {
  city: string;
  province: string;
  community: string;
}

const SPANISH_CITIES: SpanishCity[] = [
  // Andalucía
  { city: "Sevilla", province: "Sevilla", community: "Andalucía" },
  { city: "Málaga", province: "Málaga", community: "Andalucía" },
  { city: "Granada", province: "Granada", community: "Andalucía" },
  { city: "Córdoba", province: "Córdoba", community: "Andalucía" },
  { city: "Cádiz", province: "Cádiz", community: "Andalucía" },
  { city: "Almería", province: "Almería", community: "Andalucía" },
  { city: "Huelva", province: "Huelva", community: "Andalucía" },
  { city: "Jaén", province: "Jaén", community: "Andalucía" },
  { city: "Jerez de la Frontera", province: "Cádiz", community: "Andalucía" },
  { city: "Marbella", province: "Málaga", community: "Andalucía" },
  { city: "Dos Hermanas", province: "Sevilla", community: "Andalucía" },
  { city: "Algeciras", province: "Cádiz", community: "Andalucía" },
  { city: "Torremolinos", province: "Málaga", community: "Andalucía" },
  { city: "Benalmádena", province: "Málaga", community: "Andalucía" },
  { city: "Fuengirola", province: "Málaga", community: "Andalucía" },
  { city: "Estepona", province: "Málaga", community: "Andalucía" },
  { city: "Roquetas de Mar", province: "Almería", community: "Andalucía" },
  { city: "Linares", province: "Jaén", community: "Andalucía" },
  { city: "Motril", province: "Granada", community: "Andalucía" },
  { city: "El Puerto de Santa María", province: "Cádiz", community: "Andalucía" },
  { city: "San Fernando", province: "Cádiz", community: "Andalucía" },
  { city: "Chiclana de la Frontera", province: "Cádiz", community: "Andalucía" },
  { city: "Alcalá de Guadaíra", province: "Sevilla", community: "Andalucía" },
  { city: "Utrera", province: "Sevilla", community: "Andalucía" },
  { city: "Lucena", province: "Córdoba", community: "Andalucía" },
  // Aragón
  { city: "Zaragoza", province: "Zaragoza", community: "Aragón" },
  { city: "Huesca", province: "Huesca", community: "Aragón" },
  { city: "Teruel", province: "Teruel", community: "Aragón" },
  { city: "Calatayud", province: "Zaragoza", community: "Aragón" },
  // Asturias
  { city: "Oviedo", province: "Asturias", community: "Principado de Asturias" },
  { city: "Gijón", province: "Asturias", community: "Principado de Asturias" },
  { city: "Avilés", province: "Asturias", community: "Principado de Asturias" },
  // Baleares
  { city: "Palma de Mallorca", province: "Baleares", community: "Islas Baleares" },
  { city: "Ibiza", province: "Baleares", community: "Islas Baleares" },
  { city: "Manacor", province: "Baleares", community: "Islas Baleares" },
  { city: "Mahón", province: "Baleares", community: "Islas Baleares" },
  // Canarias
  { city: "Las Palmas de Gran Canaria", province: "Las Palmas", community: "Canarias" },
  { city: "Santa Cruz de Tenerife", province: "Santa Cruz de Tenerife", community: "Canarias" },
  { city: "San Cristóbal de La Laguna", province: "Santa Cruz de Tenerife", community: "Canarias" },
  { city: "Arrecife", province: "Las Palmas", community: "Canarias" },
  { city: "Puerto del Rosario", province: "Las Palmas", community: "Canarias" },
  // Cantabria
  { city: "Santander", province: "Cantabria", community: "Cantabria" },
  { city: "Torrelavega", province: "Cantabria", community: "Cantabria" },
  // Castilla-La Mancha
  { city: "Albacete", province: "Albacete", community: "Castilla-La Mancha" },
  { city: "Ciudad Real", province: "Ciudad Real", community: "Castilla-La Mancha" },
  { city: "Toledo", province: "Toledo", community: "Castilla-La Mancha" },
  { city: "Guadalajara", province: "Guadalajara", community: "Castilla-La Mancha" },
  { city: "Cuenca", province: "Cuenca", community: "Castilla-La Mancha" },
  { city: "Talavera de la Reina", province: "Toledo", community: "Castilla-La Mancha" },
  { city: "Puertollano", province: "Ciudad Real", community: "Castilla-La Mancha" },
  // Castilla y León
  { city: "Valladolid", province: "Valladolid", community: "Castilla y León" },
  { city: "Burgos", province: "Burgos", community: "Castilla y León" },
  { city: "Salamanca", province: "Salamanca", community: "Castilla y León" },
  { city: "León", province: "León", community: "Castilla y León" },
  { city: "Palencia", province: "Palencia", community: "Castilla y León" },
  { city: "Zamora", province: "Zamora", community: "Castilla y León" },
  { city: "Ávila", province: "Ávila", community: "Castilla y León" },
  { city: "Segovia", province: "Segovia", community: "Castilla y León" },
  { city: "Soria", province: "Soria", community: "Castilla y León" },
  { city: "Ponferrada", province: "León", community: "Castilla y León" },
  // Cataluña
  { city: "Barcelona", province: "Barcelona", community: "Cataluña" },
  { city: "Hospitalet de Llobregat", province: "Barcelona", community: "Cataluña" },
  { city: "Terrassa", province: "Barcelona", community: "Cataluña" },
  { city: "Badalona", province: "Barcelona", community: "Cataluña" },
  { city: "Sabadell", province: "Barcelona", community: "Cataluña" },
  { city: "Tarragona", province: "Tarragona", community: "Cataluña" },
  { city: "Lleida", province: "Lleida", community: "Cataluña" },
  { city: "Girona", province: "Girona", community: "Cataluña" },
  { city: "Mataró", province: "Barcelona", community: "Cataluña" },
  { city: "Reus", province: "Tarragona", community: "Cataluña" },
  { city: "Sant Cugat del Vallès", province: "Barcelona", community: "Cataluña" },
  { city: "Granollers", province: "Barcelona", community: "Cataluña" },
  { city: "Manresa", province: "Barcelona", community: "Cataluña" },
  { city: "Vic", province: "Barcelona", community: "Cataluña" },
  { city: "Rubí", province: "Barcelona", community: "Cataluña" },
  { city: "Castelldefels", province: "Barcelona", community: "Cataluña" },
  // Comunidad Valenciana
  { city: "Valencia", province: "Valencia", community: "Comunidad Valenciana" },
  { city: "Alicante", province: "Alicante", community: "Comunidad Valenciana" },
  { city: "Elche", province: "Alicante", community: "Comunidad Valenciana" },
  { city: "Castellón de la Plana", province: "Castellón", community: "Comunidad Valenciana" },
  { city: "Torrevieja", province: "Alicante", community: "Comunidad Valenciana" },
  { city: "Orihuela", province: "Alicante", community: "Comunidad Valenciana" },
  { city: "Benidorm", province: "Alicante", community: "Comunidad Valenciana" },
  { city: "Gandia", province: "Valencia", community: "Comunidad Valenciana" },
  { city: "Torrent", province: "Valencia", community: "Comunidad Valenciana" },
  { city: "Paterna", province: "Valencia", community: "Comunidad Valenciana" },
  { city: "Sagunto", province: "Valencia", community: "Comunidad Valenciana" },
  { city: "Alcoy", province: "Alicante", community: "Comunidad Valenciana" },
  // Extremadura
  { city: "Badajoz", province: "Badajoz", community: "Extremadura" },
  { city: "Cáceres", province: "Cáceres", community: "Extremadura" },
  { city: "Mérida", province: "Badajoz", community: "Extremadura" },
  { city: "Plasencia", province: "Cáceres", community: "Extremadura" },
  { city: "Don Benito", province: "Badajoz", community: "Extremadura" },
  // Galicia
  { city: "Vigo", province: "Pontevedra", community: "Galicia" },
  { city: "A Coruña", province: "A Coruña", community: "Galicia" },
  { city: "Ourense", province: "Ourense", community: "Galicia" },
  { city: "Lugo", province: "Lugo", community: "Galicia" },
  { city: "Santiago de Compostela", province: "A Coruña", community: "Galicia" },
  { city: "Pontevedra", province: "Pontevedra", community: "Galicia" },
  { city: "Ferrol", province: "A Coruña", community: "Galicia" },
  // Comunidad de Madrid
  { city: "Madrid", province: "Madrid", community: "Comunidad de Madrid" },
  { city: "Móstoles", province: "Madrid", community: "Comunidad de Madrid" },
  { city: "Alcalá de Henares", province: "Madrid", community: "Comunidad de Madrid" },
  { city: "Fuenlabrada", province: "Madrid", community: "Comunidad de Madrid" },
  { city: "Leganés", province: "Madrid", community: "Comunidad de Madrid" },
  { city: "Getafe", province: "Madrid", community: "Comunidad de Madrid" },
  { city: "Alcorcón", province: "Madrid", community: "Comunidad de Madrid" },
  { city: "Torrejón de Ardoz", province: "Madrid", community: "Comunidad de Madrid" },
  { city: "Parla", province: "Madrid", community: "Comunidad de Madrid" },
  { city: "Alcobendas", province: "Madrid", community: "Comunidad de Madrid" },
  { city: "Pozuelo de Alarcón", province: "Madrid", community: "Comunidad de Madrid" },
  { city: "Las Rozas", province: "Madrid", community: "Comunidad de Madrid" },
  { city: "San Sebastián de los Reyes", province: "Madrid", community: "Comunidad de Madrid" },
  { city: "Coslada", province: "Madrid", community: "Comunidad de Madrid" },
  { city: "Rivas-Vaciamadrid", province: "Madrid", community: "Comunidad de Madrid" },
  { city: "Valdemoro", province: "Madrid", community: "Comunidad de Madrid" },
  { city: "Majadahonda", province: "Madrid", community: "Comunidad de Madrid" },
  { city: "Collado Villalba", province: "Madrid", community: "Comunidad de Madrid" },
  { city: "Tres Cantos", province: "Madrid", community: "Comunidad de Madrid" },
  { city: "Arganda del Rey", province: "Madrid", community: "Comunidad de Madrid" },
  { city: "Boadilla del Monte", province: "Madrid", community: "Comunidad de Madrid" },
  { city: "Aranjuez", province: "Madrid", community: "Comunidad de Madrid" },
  { city: "Pinto", province: "Madrid", community: "Comunidad de Madrid" },
  // Región de Murcia
  { city: "Murcia", province: "Murcia", community: "Región de Murcia" },
  { city: "Cartagena", province: "Murcia", community: "Región de Murcia" },
  { city: "Lorca", province: "Murcia", community: "Región de Murcia" },
  { city: "Molina de Segura", province: "Murcia", community: "Región de Murcia" },
  // Navarra
  { city: "Pamplona", province: "Navarra", community: "Comunidad Foral de Navarra" },
  { city: "Tudela", province: "Navarra", community: "Comunidad Foral de Navarra" },
  { city: "Barañáin", province: "Navarra", community: "Comunidad Foral de Navarra" },
  // País Vasco
  { city: "Bilbao", province: "Vizcaya", community: "País Vasco" },
  { city: "Vitoria-Gasteiz", province: "Álava", community: "País Vasco" },
  { city: "San Sebastián", province: "Guipúzcoa", community: "País Vasco" },
  { city: "Barakaldo", province: "Vizcaya", community: "País Vasco" },
  { city: "Getxo", province: "Vizcaya", community: "País Vasco" },
  { city: "Irún", province: "Guipúzcoa", community: "País Vasco" },
  // La Rioja
  { city: "Logroño", province: "La Rioja", community: "La Rioja" },
  { city: "Calahorra", province: "La Rioja", community: "La Rioja" },
  // Ceuta y Melilla
  { city: "Ceuta", province: "Ceuta", community: "Ceuta" },
  { city: "Melilla", province: "Melilla", community: "Melilla" },
];

function normalizeForSearch(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function searchCities(query: string, limit = 8): SpanishCity[] {
  const q = normalizeForSearch(query.trim());
  if (q.length < 2) return [];
  
  return SPANISH_CITIES
    .filter(c => normalizeForSearch(c.city).includes(q))
    .sort((a, b) => {
      const aN = normalizeForSearch(a.city);
      const bN = normalizeForSearch(b.city);
      // Prioritize starts-with matches
      const aStarts = aN.startsWith(q) ? 0 : 1;
      const bStarts = bN.startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.city.localeCompare(b.city);
    })
    .slice(0, limit);
}
