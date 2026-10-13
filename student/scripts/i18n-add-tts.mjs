/* Injects the `tts` namespace into every locale file (idempotent).
   Run: node scripts/i18n-add-tts.mjs */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const localesDir = join(here, '..', 'src', 'i18n', 'locales');

/** Per-language `tts` block. Keep keys identical across all languages. */
const TTS = {
  en: {
    title: 'Read aloud',
    description:
      'Turn on text-to-speech to have dynamic content — course descriptions, interview stories and problem statements — read out in your selected language.',
    enabled: 'Read aloud is on',
    disabled: 'Read aloud is off',
    listen: 'Listen',
    stop: 'Stop',
    noVoice: 'Listen (default voice)',
    unsupported: 'Your browser does not support speech synthesis.',
    noVoiceHint:
      'No voice is installed for this language on your device — the default system voice will be used.',
  },
  hi: {
    title: 'ज़ोर से पढ़ें',
    description:
      'टेक्स्ट-टू-स्पीच चालू करें ताकि गतिशील सामग्री — कोर्स विवरण, इंटरव्यू कहानियाँ और प्रश्न विवरण — आपकी चुनी हुई भाषा में पढ़ी जाए।',
    enabled: 'ज़ोर से पढ़ना चालू है',
    disabled: 'ज़ोर से पढ़ना बंद है',
    listen: 'सुनें',
    stop: 'रोकें',
    noVoice: 'सुनें (डिफ़ॉल्ट आवाज़)',
    unsupported: 'आपका ब्राउज़र वाक् संश्लेषण का समर्थन नहीं करता।',
    noVoiceHint:
      'इस भाषा के लिए आपके डिवाइस पर कोई आवाज़ स्थापित नहीं है — डिफ़ॉल्ट सिस्टम आवाज़ का उपयोग होगा।',
  },
  es: {
    title: 'Leer en voz alta',
    description:
      'Activa la lectura en voz alta para escuchar el contenido dinámico —descripciones de cursos, historias de entrevistas y enunciados de problemas— en el idioma que elijas.',
    enabled: 'Lectura en voz alta activada',
    disabled: 'Lectura en voz alta desactivada',
    listen: 'Escuchar',
    stop: 'Detener',
    noVoice: 'Escuchar (voz predeterminada)',
    unsupported: 'Tu navegador no admite la síntesis de voz.',
    noVoiceHint:
      'No hay ninguna voz instalada para este idioma en tu dispositivo: se usará la voz predeterminada del sistema.',
  },
  fr: {
    title: 'Lecture à voix haute',
    description:
      'Activez la synthèse vocale pour faire lire le contenu dynamique — descriptions de cours, récits d’entretien et énoncés de problèmes — dans la langue choisie.',
    enabled: 'Lecture à voix haute activée',
    disabled: 'Lecture à voix haute désactivée',
    listen: 'Écouter',
    stop: 'Arrêter',
    noVoice: 'Écouter (voix par défaut)',
    unsupported: 'Votre navigateur ne prend pas en charge la synthèse vocale.',
    noVoiceHint:
      'Aucune voix n’est installée pour cette langue sur votre appareil — la voix système par défaut sera utilisée.',
  },
  ar: {
    title: 'القراءة بصوت عالٍ',
    description:
      'فعّل تحويل النص إلى كلام ليُقرأ المحتوى الديناميكي — أوصاف الدورات وقصص المقابلات ونصوص المسائل — باللغة التي تختارها.',
    enabled: 'القراءة بصوت عالٍ مُفعّلة',
    disabled: 'القراءة بصوت عالٍ مُعطّلة',
    listen: 'استماع',
    stop: 'إيقاف',
    noVoice: 'استماع (الصوت الافتراضي)',
    unsupported: 'متصفحك لا يدعم تحويل النص إلى كلام.',
    noVoiceHint:
      'لا يوجد صوت مُثبّت لهذه اللغة على جهازك — سيُستخدم صوت النظام الافتراضي.',
  },
  ta: {
    title: 'ஒலித்து வாசிக்க',
    description:
      'உரை-க்கு-பேச்சை இயக்கினால், இயங்குநிலை உள்ளடக்கம் — பாட விளக்கங்கள், நேர்காணல் கதைகள், கேள்வி விவரங்கள் — நீங்கள் தேர்ந்தெடுத்த மொழியில் வாசிக்கப்படும்.',
    enabled: 'ஒலித்து வாசித்தல் இயக்கத்தில்',
    disabled: 'ஒலித்து வாசித்தல் முடக்கத்தில்',
    listen: 'கேள்',
    stop: 'நிறுத்து',
    noVoice: 'கேள் (இயல்பு குரல்)',
    unsupported: 'உங்கள் உலாவி பேச்சு உருவாக்கத்தை ஆதரிக்கவில்லை.',
    noVoiceHint:
      'இந்த மொழிக்கான குரல் உங்கள் சாதனத்தில் நிறுவப்படவில்லை — இயல்பான கணினி குரல் பயன்படுத்தப்படும்.',
  },
  ml: {
    title: 'ഉറക്കെ വായിക്കുക',
    description:
      'ടെക്സ്റ്റ്-ടു-സ്പീച്ച് ഓണാക്കിയാൽ ഡൈനാമിക് ഉള്ളടക്കം — കോഴ്സ് വിവരണങ്ങൾ, അഭിമുഖ കഥകൾ, ചോദ്യ വിവരണങ്ങൾ — നിങ്ങൾ തിരഞ്ഞെടുത്ത ഭാഷയിൽ വായിച്ചുകേൾക്കാം.',
    enabled: 'ഉറക്കെ വായന ഓണാണ്',
    disabled: 'ഉറക്കെ വായന ഓഫാണ്',
    listen: 'കേൾക്കുക',
    stop: 'നിർത്തുക',
    noVoice: 'കേൾക്കുക (സ്ഥിരം ശബ്ദം)',
    unsupported: 'നിങ്ങളുടെ ബ്രൗസർ സ്പീച്ച് സിന്തസിസ് പിന്തുണയ്ക്കുന്നില്ല.',
    noVoiceHint:
      'ഈ ഭാഷയ്ക്കുള്ള ശബ്ദം നിങ്ങളുടെ ഉപകരണത്തിൽ ഇൻസ്റ്റാൾ ചെയ്തിട്ടില്ല — സ്ഥിരം സിസ്റ്റം ശബ്ദം ഉപയോഗിക്കും.',
  },
  te: {
    title: 'గట్టిగా చదవండి',
    description:
      'టెక్స్ట్-టు-స్పీచ్‌ను ఆన్ చేస్తే డైనమిక్ కంటెంట్ — కోర్సు వివరణలు, ఇంటర్వ్యూ కథనాలు, ప్రశ్న వివరణలు — మీరు ఎంచుకున్న భాషలో చదివి వినిపిస్తుంది.',
    enabled: 'గట్టిగా చదవడం ఆన్‌లో ఉంది',
    disabled: 'గట్టిగా చదవడం ఆఫ్‌లో ఉంది',
    listen: 'వినండి',
    stop: 'ఆపండి',
    noVoice: 'వినండి (డిఫాల్ట్ వాయిస్)',
    unsupported: 'మీ బ్రౌజర్ స్పీచ్ సింథసిస్‌ను సపోర్ట్ చేయదు.',
    noVoiceHint:
      'ఈ భాషకు మీ పరికరంలో వాయిస్ ఇన్‌స్టాల్ చేయబడలేదు — డిఫాల్ట్ సిస్టమ్ వాయిస్ ఉపయోగించబడుతుంది.',
  },
  kn: {
    title: 'ಗಟ್ಟಿಯಾಗಿ ಓದಿ',
    description:
      'ಪಠ್ಯ-ದಿಂದ-ಧ್ವನಿ ಆನ್ ಮಾಡಿದರೆ ಡೈನಾಮಿಕ್ ವಿಷಯ — ಕೋರ್ಸ್ ವಿವರಣೆಗಳು, ಸಂದರ್ಶನ ಕಥೆಗಳು, ಪ್ರಶ್ನೆ ವಿವರಣೆಗಳು — ನೀವು ಆಯ್ಕೆ ಮಾಡಿದ ಭಾಷೆಯಲ್ಲಿ ಓದಿ ಕೇಳಿಸುತ್ತದೆ.',
    enabled: 'ಗಟ್ಟಿಯಾಗಿ ಓದುವಿಕೆ ಆನ್ ಆಗಿದೆ',
    disabled: 'ಗಟ್ಟಿಯಾಗಿ ಓದುವಿಕೆ ಆಫ್ ಆಗಿದೆ',
    listen: 'ಕೇಳಿ',
    stop: 'ನಿಲ್ಲಿಸಿ',
    noVoice: 'ಕೇಳಿ (ಡೀಫಾಲ್ಟ್ ಧ್ವನಿ)',
    unsupported: 'ನಿಮ್ಮ ಬ್ರೌಸರ್ ಧ್ವನಿ ಸಂಶ್ಲೇಷಣೆಯನ್ನು ಬೆಂಬಲಿಸುವುದಿಲ್ಲ.',
    noVoiceHint:
      'ಈ ಭಾಷೆಗೆ ನಿಮ್ಮ ಸಾಧನದಲ್ಲಿ ಧ್ವನಿ ಸ್ಥಾಪಿಸಲಾಗಿಲ್ಲ — ಡೀಫಾಲ್ಟ್ ಸಿಸ್ಟಮ್ ಧ್ವನಿ ಬಳಸಲಾಗುತ್ತದೆ.',
  },
};

let changed = 0;
for (const [lng, block] of Object.entries(TTS)) {
  const file = join(localesDir, `${lng}.json`);
  const json = JSON.parse(readFileSync(file, 'utf8'));
  json.tts = block; // overwrite/insert — idempotent
  writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8');
  changed++;
  console.log(`✓ ${lng}.json — tts namespace written`);
}
console.log(`\nDone. Updated ${changed} locale files.`);
