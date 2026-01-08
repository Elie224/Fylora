// Liste des pays avec leurs codes et formats de téléphone
export const countries = [
  { code: 'FR', name: 'France', phoneCode: '+33', phoneFormat: '+33 X XX XX XX XX', pattern: /^(\+33|0)[1-9](\d{2}){4}$/ },
  { code: 'BE', name: 'Belgique', phoneCode: '+32', phoneFormat: '+32 X XXX XX XX', pattern: /^(\+32|0)[1-9]\d{8}$/ },
  { code: 'CH', name: 'Suisse', phoneCode: '+41', phoneFormat: '+41 XX XXX XX XX', pattern: /^(\+41|0)[1-9]\d{8}$/ },
  { code: 'CA', name: 'Canada', phoneCode: '+1', phoneFormat: '+1 (XXX) XXX-XXXX', pattern: /^(\+1|1)?[2-9]\d{2}[2-9]\d{2}\d{4}$/ },
  { code: 'US', name: 'États-Unis', phoneCode: '+1', phoneFormat: '+1 (XXX) XXX-XXXX', pattern: /^(\+1|1)?[2-9]\d{2}[2-9]\d{2}\d{4}$/ },
  { code: 'GB', name: 'Royaume-Uni', phoneCode: '+44', phoneFormat: '+44 XXXX XXXXXX', pattern: /^(\+44|0)[1-9]\d{8,9}$/ },
  { code: 'DE', name: 'Allemagne', phoneCode: '+49', phoneFormat: '+49 XXX XXXXXXX', pattern: /^(\+49|0)[1-9]\d{10,11}$/ },
  { code: 'ES', name: 'Espagne', phoneCode: '+34', phoneFormat: '+34 XXX XXX XXX', pattern: /^(\+34|0)[6-9]\d{8}$/ },
  { code: 'IT', name: 'Italie', phoneCode: '+39', phoneFormat: '+39 XXX XXX XXXX', pattern: /^(\+39|0)[3-9]\d{8,9}$/ },
  { code: 'PT', name: 'Portugal', phoneCode: '+351', phoneFormat: '+351 XXX XXX XXX', pattern: /^(\+351|0)[1-9]\d{8}$/ },
  { code: 'NL', name: 'Pays-Bas', phoneCode: '+31', phoneFormat: '+31 X XXX XXXX', pattern: /^(\+31|0)[1-9]\d{8}$/ },
  { code: 'PL', name: 'Pologne', phoneCode: '+48', phoneFormat: '+48 XXX XXX XXX', pattern: /^(\+48|0)[1-9]\d{8}$/ },
  { code: 'SE', name: 'Suède', phoneCode: '+46', phoneFormat: '+46 XX XXX XX XX', pattern: /^(\+46|0)[1-9]\d{8,9}$/ },
  { code: 'NO', name: 'Norvège', phoneCode: '+47', phoneFormat: '+47 XXX XX XXX', pattern: /^(\+47|0)[2-9]\d{7}$/ },
  { code: 'DK', name: 'Danemark', phoneCode: '+45', phoneFormat: '+45 XX XX XX XX', pattern: /^(\+45|0)[2-9]\d{7}$/ },
  { code: 'FI', name: 'Finlande', phoneCode: '+358', phoneFormat: '+358 XX XXX XXXX', pattern: /^(\+358|0)[1-9]\d{8,9}$/ },
  { code: 'GR', name: 'Grèce', phoneCode: '+30', phoneFormat: '+30 XXX XXX XXXX', pattern: /^(\+30|0)[2-9]\d{8}$/ },
  { code: 'IE', name: 'Irlande', phoneCode: '+353', phoneFormat: '+353 XX XXX XXXX', pattern: /^(\+353|0)[1-9]\d{8}$/ },
  { code: 'AT', name: 'Autriche', phoneCode: '+43', phoneFormat: '+43 X XXX XXXX', pattern: /^(\+43|0)[1-9]\d{9,10}$/ },
  { code: 'CZ', name: 'République tchèque', phoneCode: '+420', phoneFormat: '+420 XXX XXX XXX', pattern: /^(\+420|0)[1-9]\d{8}$/ },
  { code: 'HU', name: 'Hongrie', phoneCode: '+36', phoneFormat: '+36 XX XXX XXXX', pattern: /^(\+36|0)[1-9]\d{8}$/ },
  { code: 'RO', name: 'Roumanie', phoneCode: '+40', phoneFormat: '+40 XXX XXX XXX', pattern: /^(\+40|0)[2-9]\d{8}$/ },
  { code: 'BG', name: 'Bulgarie', phoneCode: '+359', phoneFormat: '+359 XXX XXX XXX', pattern: /^(\+359|0)[1-9]\d{8}$/ },
  { code: 'HR', name: 'Croatie', phoneCode: '+385', phoneFormat: '+385 XX XXX XXXX', pattern: /^(\+385|0)[1-9]\d{8}$/ },
  { code: 'SK', name: 'Slovaquie', phoneCode: '+421', phoneFormat: '+421 XXX XXX XXX', pattern: /^(\+421|0)[1-9]\d{8}$/ },
  { code: 'SI', name: 'Slovénie', phoneCode: '+386', phoneFormat: '+386 XX XXX XXX', pattern: /^(\+386|0)[1-9]\d{7}$/ },
  { code: 'EE', name: 'Estonie', phoneCode: '+372', phoneFormat: '+372 XXXX XXXX', pattern: /^(\+372|0)[1-9]\d{7}$/ },
  { code: 'LV', name: 'Lettonie', phoneCode: '+371', phoneFormat: '+371 XXXX XXXX', pattern: /^(\+371|0)[1-9]\d{7}$/ },
  { code: 'LT', name: 'Lituanie', phoneCode: '+370', phoneFormat: '+370 XXX XXXXX', pattern: /^(\+370|0)[1-9]\d{7}$/ },
  { code: 'LU', name: 'Luxembourg', phoneCode: '+352', phoneFormat: '+352 XXX XXX', pattern: /^(\+352|0)[1-9]\d{6}$/ },
  { code: 'MT', name: 'Malte', phoneCode: '+356', phoneFormat: '+356 XXXX XXXX', pattern: /^(\+356|0)[1-9]\d{7}$/ },
  { code: 'CY', name: 'Chypre', phoneCode: '+357', phoneFormat: '+357 XX XXX XXX', pattern: /^(\+357|0)[1-9]\d{7}$/ },
  { code: 'DZ', name: 'Algérie', phoneCode: '+213', phoneFormat: '+213 XXX XX XX XX', pattern: /^(\+213|0)[1-9]\d{8}$/ },
  { code: 'MA', name: 'Maroc', phoneCode: '+212', phoneFormat: '+212 XXX-XXXXXX', pattern: /^(\+212|0)[5-9]\d{8}$/ },
  { code: 'TN', name: 'Tunisie', phoneCode: '+216', phoneFormat: '+216 XX XXX XXX', pattern: /^(\+216|0)[1-9]\d{7}$/ },
  { code: 'SN', name: 'Sénégal', phoneCode: '+221', phoneFormat: '+221 XX XXX XX XX', pattern: /^(\+221|0)[1-9]\d{8}$/ },
  { code: 'CI', name: 'Côte d\'Ivoire', phoneCode: '+225', phoneFormat: '+225 XX XX XX XX XX', pattern: /^(\+225|0)[1-9]\d{9}$/ },
  { code: 'CM', name: 'Cameroun', phoneCode: '+237', phoneFormat: '+237 X XX XX XX XX', pattern: /^(\+237|0)[1-9]\d{8}$/ },
  { code: 'CD', name: 'RD Congo', phoneCode: '+243', phoneFormat: '+243 XXX XXX XXX', pattern: /^(\+243|0)[1-9]\d{8}$/ },
  { code: 'CG', name: 'Congo', phoneCode: '+242', phoneFormat: '+242 XX XXX XXXX', pattern: /^(\+242|0)[1-9]\d{8}$/ },
  { code: 'GA', name: 'Gabon', phoneCode: '+241', phoneFormat: '+241 X XX XX XX', pattern: /^(\+241|0)[1-9]\d{7}$/ },
  { code: 'BJ', name: 'Bénin', phoneCode: '+229', phoneFormat: '+229 XX XX XX XX', pattern: /^(\+229|0)[1-9]\d{8}$/ },
  { code: 'BF', name: 'Burkina Faso', phoneCode: '+226', phoneFormat: '+226 XX XX XX XX', pattern: /^(\+226|0)[1-9]\d{7}$/ },
  { code: 'ML', name: 'Mali', phoneCode: '+223', phoneFormat: '+223 XX XX XX XX', pattern: /^(\+223|0)[1-9]\d{7}$/ },
  { code: 'NE', name: 'Niger', phoneCode: '+227', phoneFormat: '+227 XX XX XX XX', pattern: /^(\+227|0)[1-9]\d{7}$/ },
  { code: 'TD', name: 'Tchad', phoneCode: '+235', phoneFormat: '+235 XX XX XX XX', pattern: /^(\+235|0)[1-9]\d{7}$/ },
  { code: 'CF', name: 'Centrafrique', phoneCode: '+236', phoneFormat: '+236 XX XX XX XX', pattern: /^(\+236|0)[1-9]\d{7}$/ },
  { code: 'GN', name: 'Guinée', phoneCode: '+224', phoneFormat: '+224 XXX XXX XXX', pattern: /^(\+224|0)[1-9]\d{8}$/ },
  { code: 'GW', name: 'Guinée-Bissau', phoneCode: '+245', phoneFormat: '+245 X XXX XXX', pattern: /^(\+245|0)[1-9]\d{6}$/ },
  { code: 'MR', name: 'Mauritanie', phoneCode: '+222', phoneFormat: '+222 XX XX XX XX', pattern: /^(\+222|0)[1-9]\d{7}$/ },
  { code: 'TG', name: 'Togo', phoneCode: '+228', phoneFormat: '+228 XX XX XX XX', pattern: /^(\+228|0)[1-9]\d{7}$/ },
  { code: 'GH', name: 'Ghana', phoneCode: '+233', phoneFormat: '+233 XX XXX XXXX', pattern: /^(\+233|0)[1-9]\d{8}$/ },
  { code: 'NG', name: 'Nigeria', phoneCode: '+234', phoneFormat: '+234 XXX XXX XXXX', pattern: /^(\+234|0)[1-9]\d{9}$/ },
  { code: 'KE', name: 'Kenya', phoneCode: '+254', phoneFormat: '+254 XXX XXXXXX', pattern: /^(\+254|0)[1-9]\d{8}$/ },
  { code: 'TZ', name: 'Tanzanie', phoneCode: '+255', phoneFormat: '+255 XXX XXX XXX', pattern: /^(\+255|0)[1-9]\d{8}$/ },
  { code: 'UG', name: 'Ouganda', phoneCode: '+256', phoneFormat: '+256 XXX XXXXXX', pattern: /^(\+256|0)[1-9]\d{8}$/ },
  { code: 'RW', name: 'Rwanda', phoneCode: '+250', phoneFormat: '+250 XXX XXX XXX', pattern: /^(\+250|0)[1-9]\d{8}$/ },
  { code: 'ET', name: 'Éthiopie', phoneCode: '+251', phoneFormat: '+251 XX XXX XXXX', pattern: /^(\+251|0)[1-9]\d{8}$/ },
  { code: 'ZA', name: 'Afrique du Sud', phoneCode: '+27', phoneFormat: '+27 XX XXX XXXX', pattern: /^(\+27|0)[1-9]\d{8}$/ },
  { code: 'EG', name: 'Égypte', phoneCode: '+20', phoneFormat: '+20 XXX XXX XXXX', pattern: /^(\+20|0)[1-9]\d{9}$/ },
  { code: 'CN', name: 'Chine', phoneCode: '+86', phoneFormat: '+86 XXX XXXX XXXX', pattern: /^(\+86|0)[1-9]\d{10}$/ },
  { code: 'JP', name: 'Japon', phoneCode: '+81', phoneFormat: '+81 XX-XXXX-XXXX', pattern: /^(\+81|0)[1-9]\d{9}$/ },
  { code: 'KR', name: 'Corée du Sud', phoneCode: '+82', phoneFormat: '+82 XX-XXXX-XXXX', pattern: /^(\+82|0)[1-9]\d{9}$/ },
  { code: 'IN', name: 'Inde', phoneCode: '+91', phoneFormat: '+91 XXXXX-XXXXX', pattern: /^(\+91|0)[6-9]\d{9}$/ },
  { code: 'PK', name: 'Pakistan', phoneCode: '+92', phoneFormat: '+92 XXX-XXXXXXX', pattern: /^(\+92|0)[1-9]\d{9}$/ },
  { code: 'BD', name: 'Bangladesh', phoneCode: '+880', phoneFormat: '+880 XXXX-XXXXXX', pattern: /^(\+880|0)[1-9]\d{9}$/ },
  { code: 'TH', name: 'Thaïlande', phoneCode: '+66', phoneFormat: '+66 XX-XXX-XXXX', pattern: /^(\+66|0)[1-9]\d{8}$/ },
  { code: 'VN', name: 'Vietnam', phoneCode: '+84', phoneFormat: '+84 XXX-XXXX-XXX', pattern: /^(\+84|0)[1-9]\d{9}$/ },
  { code: 'PH', name: 'Philippines', phoneCode: '+63', phoneFormat: '+63 XXX XXX XXXX', pattern: /^(\+63|0)[1-9]\d{9}$/ },
  { code: 'ID', name: 'Indonésie', phoneCode: '+62', phoneFormat: '+62 XXX-XXX-XXXX', pattern: /^(\+62|0)[1-9]\d{9,10}$/ },
  { code: 'MY', name: 'Malaisie', phoneCode: '+60', phoneFormat: '+60 X-XXX XXXX', pattern: /^(\+60|0)[1-9]\d{8,9}$/ },
  { code: 'SG', name: 'Singapour', phoneCode: '+65', phoneFormat: '+65 XXXX XXXX', pattern: /^(\+65|0)[689]\d{7}$/ },
  { code: 'AU', name: 'Australie', phoneCode: '+61', phoneFormat: '+61 X XXXX XXXX', pattern: /^(\+61|0)[2-9]\d{8}$/ },
  { code: 'NZ', name: 'Nouvelle-Zélande', phoneCode: '+64', phoneFormat: '+64 X-XXX XXXX', pattern: /^(\+64|0)[2-9]\d{7,8}$/ },
  { code: 'BR', name: 'Brésil', phoneCode: '+55', phoneFormat: '+55 (XX) XXXXX-XXXX', pattern: /^(\+55|0)[1-9]\d{10}$/ },
  { code: 'MX', name: 'Mexique', phoneCode: '+52', phoneFormat: '+52 XXX XXX XXXX', pattern: /^(\+52|0)[1-9]\d{9}$/ },
  { code: 'AR', name: 'Argentine', phoneCode: '+54', phoneFormat: '+54 XXX XXXX-XXXX', pattern: /^(\+54|0)[1-9]\d{9}$/ },
  { code: 'CL', name: 'Chili', phoneCode: '+56', phoneFormat: '+56 X XXXX XXXX', pattern: /^(\+56|0)[1-9]\d{8}$/ },
  { code: 'CO', name: 'Colombie', phoneCode: '+57', phoneFormat: '+57 XXX XXX XXXX', pattern: /^(\+57|0)[1-9]\d{9}$/ },
  { code: 'PE', name: 'Pérou', phoneCode: '+51', phoneFormat: '+51 XXX XXX XXX', pattern: /^(\+51|0)[1-9]\d{8}$/ },
  { code: 'VE', name: 'Venezuela', phoneCode: '+58', phoneFormat: '+58 XXX-XXX.XXXX', pattern: /^(\+58|0)[1-9]\d{9}$/ },
  { code: 'RU', name: 'Russie', phoneCode: '+7', phoneFormat: '+7 (XXX) XXX-XX-XX', pattern: /^(\+7|0)[1-9]\d{9}$/ },
  { code: 'TR', name: 'Turquie', phoneCode: '+90', phoneFormat: '+90 XXX XXX XX XX', pattern: /^(\+90|0)[1-9]\d{9}$/ },
  { code: 'SA', name: 'Arabie Saoudite', phoneCode: '+966', phoneFormat: '+966 X XXX XXXX', pattern: /^(\+966|0)[1-9]\d{8}$/ },
  { code: 'AE', name: 'Émirats arabes unis', phoneCode: '+971', phoneFormat: '+971 X XXX XXXX', pattern: /^(\+971|0)[1-9]\d{8}$/ },
  { code: 'IL', name: 'Israël', phoneCode: '+972', phoneFormat: '+972 XX-XXX-XXXX', pattern: /^(\+972|0)[1-9]\d{8}$/ },
  { code: 'JO', name: 'Jordanie', phoneCode: '+962', phoneFormat: '+962 X XXXX XXXX', pattern: /^(\+962|0)[1-9]\d{8}$/ },
  { code: 'LB', name: 'Liban', phoneCode: '+961', phoneFormat: '+961 X XXX XXX', pattern: /^(\+961|0)[1-9]\d{7}$/ },
  { code: 'IQ', name: 'Irak', phoneCode: '+964', phoneFormat: '+964 XXX XXX XXXX', pattern: /^(\+964|0)[1-9]\d{9}$/ },
  { code: 'IR', name: 'Iran', phoneCode: '+98', phoneFormat: '+98 XXX XXX XXXX', pattern: /^(\+98|0)[1-9]\d{9}$/ },
  { code: 'AF', name: 'Afghanistan', phoneCode: '+93', phoneFormat: '+93 XX XXX XXXX', pattern: /^(\+93|0)[1-9]\d{8}$/ },
  { code: 'UA', name: 'Ukraine', phoneCode: '+380', phoneFormat: '+380 XX XXX XX XX', pattern: /^(\+380|0)[1-9]\d{8}$/ },
  { code: 'BY', name: 'Biélorussie', phoneCode: '+375', phoneFormat: '+375 XX XXX-XX-XX', pattern: /^(\+375|0)[1-9]\d{8}$/ },
  { code: 'KZ', name: 'Kazakhstan', phoneCode: '+7', phoneFormat: '+7 (XXX) XXX-XX-XX', pattern: /^(\+7|0)[1-9]\d{9}$/ },
  { code: 'UZ', name: 'Ouzbékistan', phoneCode: '+998', phoneFormat: '+998 XX XXX XX XX', pattern: /^(\+998|0)[1-9]\d{8}$/ },
  { code: 'GE', name: 'Géorgie', phoneCode: '+995', phoneFormat: '+995 XXX XXX XXX', pattern: /^(\+995|0)[1-9]\d{8}$/ },
  { code: 'AM', name: 'Arménie', phoneCode: '+374', phoneFormat: '+374 XX XXX XXX', pattern: /^(\+374|0)[1-9]\d{7}$/ },
  { code: 'AZ', name: 'Azerbaïdjan', phoneCode: '+994', phoneFormat: '+994 XX XXX XX XX', pattern: /^(\+994|0)[1-9]\d{8}$/ },
];

// Trier les pays par nom
countries.sort((a, b) => a.name.localeCompare(b.name));

// Fonction pour obtenir un pays par son code
export const getCountryByCode = (code) => {
  return countries.find(c => c.code === code);
};

// Fonction pour formater un numéro de téléphone selon le pays
export const formatPhoneNumber = (phone, countryCode) => {
  if (!phone || !countryCode) return phone;
  
  const country = getCountryByCode(countryCode);
  if (!country) return phone;
  
  // Nettoyer le numéro (enlever espaces, tirets, etc.)
  let cleaned = phone.replace(/\D/g, '');
  
  // Si le numéro commence par le code du pays, le retirer
  const phoneCodeDigits = country.phoneCode.replace(/\D/g, '');
  if (cleaned.startsWith(phoneCodeDigits)) {
    cleaned = cleaned.substring(phoneCodeDigits.length);
  }
  
  // Si le numéro commence par 0, le retirer
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Retourner avec le code pays
  return country.phoneCode + ' ' + cleaned;
};

// Fonction pour valider un numéro de téléphone selon le pays
export const validatePhoneNumber = (phone, countryCode) => {
  if (!phone || !countryCode) return false;
  
  const country = getCountryByCode(countryCode);
  if (!country) return false;
  
  // Nettoyer le numéro (garder seulement les chiffres)
  let cleaned = phone.replace(/\D/g, '');
  
  // Si le numéro est vide après nettoyage, invalide
  if (!cleaned) return false;
  
  // Enlever le code pays si présent au début
  const phoneCodeDigits = country.phoneCode.replace(/\D/g, '');
  if (cleaned.startsWith(phoneCodeDigits)) {
    cleaned = cleaned.substring(phoneCodeDigits.length);
  }
  
  // Ajouter un 0 au début si nécessaire (pour correspondre au pattern)
  // Les patterns attendent généralement +XX ou 0 au début
  // Mais l'utilisateur saisit sans code pays ni 0, donc on teste avec 0
  const testWithZero = '0' + cleaned;
  const testWithCode = country.phoneCode.replace(/\+/g, '') + cleaned;
  
  // Tester avec le pattern original (avec +XX ou 0)
  const matchesPattern = country.pattern.test(testWithZero) || 
                         country.pattern.test(testWithCode) ||
                         country.pattern.test('+' + testWithCode);
  
  // Vérifier aussi la longueur minimale
  // Pour la France par exemple: 9 chiffres après le code pays (sans le 0)
  // Patterns généraux pour la plupart des pays: 7-15 chiffres
  const minLength = 7;
  const maxLength = 15;
  const validLength = cleaned.length >= minLength && cleaned.length <= maxLength;
  
  return matchesPattern || validLength;
};

