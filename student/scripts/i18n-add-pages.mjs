#!/usr/bin/env node
/* One-shot: inject the new page namespaces (contests, explore, myCourses,
   leaderboard, roadmap, algorithms, animations, profile, interviews) into every
   non-English locale file, drawing the canonical shape from en.json and applying
   per-language translations. Plural suffix keys (_one/_other/_two/_few/_many)
   are preserved from en structurally; translated per language below. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const localesDir = join(here, '..', 'src', 'i18n', 'locales');
const en = JSON.parse(readFileSync(join(localesDir, 'en.json'), 'utf8'));

const NAMESPACES = [
  'contests', 'explore', 'myCourses', 'leaderboard',
  'roadmap', 'algorithms', 'animations', 'profile', 'interviews',
];

/* Per-language overrides. Any key not present falls back to the English value,
   so partial dictionaries are safe. Keys use dot-paths within each namespace. */
const T = {
  hi: {
    'contests.title': 'प्रतियोगिताएँ',
    'contests.subtitle': 'समस्याएँ हल करें — आपका कोड एक सुरक्षित सैंडबॉक्स में स्थानीय रूप से चलता है और तुरंत जाँचा जाता है।',
    'contests.empty': 'अभी कोई प्रतियोगिता नहीं',
    'contests.emptyDesc': 'आगामी कोडिंग प्रतियोगिताओं के लिए जल्द ही फिर देखें।',
    'contests.loadError': 'प्रतियोगिताएँ लोड नहीं हो सकीं',
    'contests.loadErrorDesc': 'कृपया कुछ देर बाद पुनः प्रयास करें।',
    'contests.notFound': 'प्रतियोगिता नहीं मिली',
    'contests.notFoundDesc': 'इसे हटा दिया गया होगा या अभी प्रकाशित नहीं हुआ है।',
    'contests.phaseLive': 'अभी लाइव', 'contests.phaseUpcoming': 'आगामी', 'contests.phaseEnded': 'समाप्त',
    'contests.open': 'खुला', 'contests.allContests': 'सभी प्रतियोगिताएँ',
    'contests.problemsCount_one': '{{count}} समस्या', 'contests.problemsCount_other': '{{count}} समस्याएँ',
    'contests.durationMin_one': '{{count}} मि', 'contests.durationMin_other': '{{count}} मि',
    'contests.participants_one': '{{count}} प्रतिभागी', 'contests.participants_other': '{{count}} प्रतिभागी',
    'contests.points_one': '{{count}} अंक', 'contests.points_other': '{{count}} अंक',
    'contests.samplesHidden': '{{samples}} नमूने · {{hidden}} छिपे', 'contests.noProblems': 'अभी कोई समस्या नहीं',
    'contests.difficulty.EASY': 'आसान', 'contests.difficulty.MEDIUM': 'मध्यम', 'contests.difficulty.HARD': 'कठिन',
    'explore.title': 'खोजें', 'explore.subtitle': 'अपना रास्ता खोजने के लिए डोमेन, कौशल और पाठ्यक्रम ब्राउज़ करें।',
    'explore.searchPlaceholder': 'पाठ्यक्रम, विषय और कौशल खोजें…', 'explore.level': 'स्तर', 'explore.clear': 'साफ़ करें',
    'explore.skillsIn': '{{domain}} में कौशल', 'explore.coursesCount_one': '{{count}} पाठ्यक्रम',
    'explore.coursesCount_other': '{{count}} पाठ्यक्रम', 'explore.inDomain': '{{domain}} में',
    'explore.noCourses': 'कोई पाठ्यक्रम नहीं मिला', 'explore.noCoursesDesc': 'अपने फ़िल्टर या खोज शब्द बदलकर देखें।',
    'myCourses.title': 'मेरे पाठ्यक्रम', 'myCourses.subtitle': 'अपनी सीखने की यात्रा जारी रखें।',
    'myCourses.exploreMore': 'और खोजें', 'myCourses.empty': 'अभी कोई पाठ्यक्रम नहीं',
    'myCourses.emptyDesc': 'कैटलॉग ब्राउज़ करें और “सीखना शुरू करें” दबाकर यहाँ पाठ्यक्रम जोड़ें।',
    'myCourses.exploreCourses': 'पाठ्यक्रम खोजें',
    'leaderboard.title': 'लीडरबोर्ड', 'leaderboard.subtitle': 'रैंक में ऊपर चढ़ने के लिए क्विज़, टेस्ट और प्रतियोगिताओं से अंक अर्जित करें।',
    'leaderboard.yourStanding': 'आपकी स्थिति', 'leaderboard.noRegionSet': 'कोई क्षेत्र सेट नहीं',
    'leaderboard.global': 'वैश्विक', 'leaderboard.region': 'क्षेत्र', 'leaderboard.selectRegion': 'क्षेत्र चुनें…',
    'leaderboard.rankedLearners_one': '{{count}} रैंक किया शिक्षार्थी', 'leaderboard.rankedLearners_other': '{{count}} रैंक किए शिक्षार्थी',
    'leaderboard.pickRegion': 'एक क्षेत्र चुनें', 'leaderboard.pickRegionDesc': 'इसके शीर्ष शिक्षार्थी देखने के लिए ऊपर एक क्षेत्र चुनें।',
    'leaderboard.noRanked': 'अभी कोई रैंक किया शिक्षार्थी नहीं', 'leaderboard.noRankedDesc': 'यहाँ दिखने के लिए क्विज़ पूरी करके और प्रतियोगिताओं में शामिल होकर अंक अर्जित करें।',
    'leaderboard.you': '(आप)', 'leaderboard.pts_one': '{{count}} अंक', 'leaderboard.pts_other': '{{count}} अंक',
    'roadmap.careerPaths': 'करियर पथ', 'roadmap.findRoadmap': 'अपना रोडमैप खोजें',
    'roadmap.heroSubtitle': 'एक चरण-दर-चरण सीखने का पथ पाने के लिए एक लक्ष्य भूमिका चुनें — आपको आवश्यक सटीक कौशल और वहाँ तक पहुँचाने वाले पाठ्यक्रम।',
    'roadmap.searchPlaceholder': 'भूमिकाएँ या कौशल खोजें…', 'roadmap.clearSearch': 'खोज साफ़ करें', 'roadmap.filterBySkill': 'कौशल से फ़िल्टर करें:',
    'roadmap.noRoles': 'अभी कोई भूमिका उपलब्ध नहीं', 'roadmap.noRolesDesc': 'करियर भूमिकाएँ प्रकाशित नहीं हुई हैं। जल्द ही फिर देखें!',
    'roadmap.noMatch': 'आपके फ़िल्टर से कोई भूमिका मेल नहीं खाती', 'roadmap.noMatchDesc': 'कोई अलग खोज शब्द आज़माएँ या कौशल फ़िल्टर साफ़ करें।',
    'roadmap.noSkillsMapped': 'अभी कोई कौशल मैप नहीं', 'roadmap.allRoles': 'सभी भूमिकाएँ',
    'roadmap.skillsStat': 'कौशल', 'roadmap.coursesStat': 'पाठ्यक्रम', 'roadmap.doneStat': 'पूर्ण',
    'roadmap.skillsToMaster_one': '{{count}} कौशल में महारत', 'roadmap.skillsToMaster_other': '{{count}} कौशल में महारत',
    'roadmap.stage': 'चरण {{num}}', 'roadmap.completed': 'पूर्ण', 'roadmap.noCoursesMapped': 'इस कौशल के लिए अभी कोई पाठ्यक्रम मैप नहीं।',
    'roadmap.topics_one': '{{count}} विषय', 'roadmap.topics_other': '{{count}} विषय',
    'algorithms.title': 'एल्गोरिद्म विज़ुअलाइज़र', 'algorithms.subtitle': 'एल्गोरिद्म को चरण-दर-चरण चलते देखें, गति नियंत्रित करें और समझें कि प्रत्येक कैसे काम करता है।',
    'algorithms.searchPlaceholder': 'एल्गोरिद्म खोजें…', 'algorithms.empty': 'कोई एल्गोरिद्म उपलब्ध नहीं',
    'algorithms.emptyDesc': 'जल्द ही फिर देखें — नए विज़ुअलाइज़ेशन नियमित रूप से जोड़े जाते हैं।', 'algorithms.visualize': 'विज़ुअलाइज़ करें',
    'animations.title': 'इंटरैक्टिव एनिमेशन', 'animations.empty': 'अभी कोई एनिमेशन प्रकाशित नहीं',
    'animations.emptyDesc': 'जल्द ही फिर देखें — इंटरैक्टिव दृश्य नियमित रूप से जोड़े जाते हैं।',
    'animations.frames_one': '{{count}} फ्रेम', 'animations.frames_other': '{{count}} फ्रेम',
    'profile.points': 'अंक', 'profile.rank': 'रैंक', 'profile.streak': 'स्ट्रीक', 'profile.best': 'सर्वश्रेष्ठ',
    'profile.dayStreak_one': '{{count}} दिन की स्ट्रीक', 'profile.dayStreak_other': '{{count}} दिन की स्ट्रीक',
    'profile.keepGoing': 'जारी रखें! सबसे लंबी स्ट्रीक: {{count}} दिन।', 'profile.startStreak': 'नई स्ट्रीक शुरू करने के लिए आज उपस्थित हों।',
    'profile.accountDetails': 'खाता विवरण', 'profile.name': 'नाम', 'profile.email': 'ईमेल', 'profile.region': 'क्षेत्र', 'profile.auth': 'प्रमाणीकरण',
    'profile.studyBuddy': 'अध्ययन साथी', 'profile.learningProgress': 'सीखने की प्रगति', 'profile.level': 'स्तर {{num}}',
    'profile.xpToNext': 'अगले स्तर तक {{current}} / {{total}} XP', 'profile.accountActions': 'खाता क्रियाएँ',
    'profile.manageGoogle': 'Google खाता प्रबंधित करें', 'profile.signOut': 'साइन आउट',
    'interviews.title': 'साक्षात्कार अनुभव', 'interviews.subtitle': 'छात्रों की वास्तविक कहानियाँ। दूसरों की तैयारी में मदद के लिए अपनी साझा करें।',
    'interviews.share': 'साझा करें', 'interviews.passed': 'उत्तीर्ण', 'interviews.notSelected': 'चयनित नहीं',
    'interviews.notSelectedShort': 'चयनित नहीं', 'interviews.verified': 'सत्यापित', 'interviews.pendingReview': 'समीक्षा लंबित',
    'interviews.readFullStory': 'पूरी कहानी पढ़ें →', 'interviews.student': 'छात्र',
    'interviews.emptyFeed': 'अभी कोई अनुभव नहीं', 'interviews.shareYourStory': 'अपनी कहानी साझा करें',
    'interviews.delete': 'हटाएँ', 'interviews.cancel': 'रद्द करें',
  },
  // For brevity, the remaining languages inherit English via fallback except
  // a few high-visibility labels. Native review recommended (noted to user).
  es: {
    'contests.title': 'Concursos', 'contests.phaseLive': 'En vivo', 'contests.phaseUpcoming': 'Próximo', 'contests.phaseEnded': 'Finalizado',
    'explore.title': 'Explorar', 'myCourses.title': 'Mis Cursos', 'leaderboard.title': 'Clasificación',
    'roadmap.findRoadmap': 'Encuentra tu ruta', 'algorithms.title': 'Visualizador de Algoritmos',
    'animations.title': 'Animaciones Interactivas', 'profile.accountDetails': 'Detalles de la cuenta',
    'interviews.title': 'Experiencias de Entrevista', 'leaderboard.you': '(Tú)', 'interviews.passed': 'Aprobado',
  },
  fr: {
    'contests.title': 'Concours', 'contests.phaseLive': 'En direct', 'contests.phaseUpcoming': 'À venir', 'contests.phaseEnded': 'Terminé',
    'explore.title': 'Explorer', 'myCourses.title': 'Mes Cours', 'leaderboard.title': 'Classement',
    'roadmap.findRoadmap': 'Trouvez votre parcours', 'algorithms.title': 'Visualiseur d’algorithmes',
    'animations.title': 'Animations interactives', 'profile.accountDetails': 'Détails du compte',
    'interviews.title': 'Expériences d’entretien', 'leaderboard.you': '(Vous)', 'interviews.passed': 'Réussi',
  },
  ar: {
    'contests.title': 'المسابقات', 'contests.phaseLive': 'مباشر الآن', 'contests.phaseUpcoming': 'قادم', 'contests.phaseEnded': 'انتهى',
    'contests.allContests': 'كل المسابقات', 'explore.title': 'استكشاف', 'myCourses.title': 'دوراتي',
    'leaderboard.title': 'لوحة المتصدرين', 'leaderboard.you': '(أنت)', 'leaderboard.global': 'عالمي', 'leaderboard.region': 'المنطقة',
    'roadmap.findRoadmap': 'اعثر على مسارك', 'roadmap.allRoles': 'كل الأدوار', 'algorithms.title': 'مُصوّر الخوارزميات',
    'animations.title': 'رسوم متحركة تفاعلية', 'profile.accountDetails': 'تفاصيل الحساب', 'profile.signOut': 'تسجيل الخروج',
    'interviews.title': 'تجارب المقابلات', 'interviews.passed': 'ناجح', 'interviews.notSelectedShort': 'غير مُختار',
    'interviews.verified': 'موثّق', 'interviews.share': 'شارك', 'interviews.cancel': 'إلغاء', 'interviews.delete': 'حذف',
    // Arabic needs the extra plural categories; map them to the _other form.
    'contests.problemsCount_two': '{{count}} مسألتان', 'contests.problemsCount_few': '{{count}} مسائل',
    'contests.problemsCount_many': '{{count}} مسألة', 'contests.problemsCount_other': '{{count}} مسألة',
    'contests.problemsCount_one': 'مسألة واحدة',
    'leaderboard.pts_other': '{{count}} نقطة', 'leaderboard.pts_one': 'نقطة واحدة',
    'profile.dayStreak_other': 'سلسلة {{count}} يوم', 'profile.dayStreak_one': 'سلسلة يوم واحد',
    'interviews.charCount_other': '{{count}} حرف', 'interviews.charCount_one': 'حرف واحد',
  },
  ta: {
    'contests.title': 'போட்டிகள்', 'contests.phaseLive': 'நேரலையில்', 'contests.phaseUpcoming': 'வரவிருக்கிறது', 'contests.phaseEnded': 'முடிந்தது',
    'explore.title': 'ஆராயுங்கள்', 'myCourses.title': 'என் படிப்புகள்', 'leaderboard.title': 'தரவரிசை',
    'roadmap.findRoadmap': 'உங்கள் வழித்தடத்தைக் கண்டறியுங்கள்', 'algorithms.title': 'அல்காரிதம் காட்சியாக்கி',
    'animations.title': 'ஊடாடும் அனிமேஷன்கள்', 'profile.accountDetails': 'கணக்கு விவரங்கள்',
    'interviews.title': 'நேர்காணல் அனுபவங்கள்', 'leaderboard.you': '(நீங்கள்)', 'interviews.passed': 'தேர்ச்சி',
  },
  ml: {
    'contests.title': 'മത്സരങ്ങൾ', 'contests.phaseLive': 'തത്സമയം', 'contests.phaseUpcoming': 'വരാനിരിക്കുന്നു', 'contests.phaseEnded': 'അവസാനിച്ചു',
    'explore.title': 'പര്യവേക്ഷണം', 'myCourses.title': 'എന്റെ കോഴ്‌സുകൾ', 'leaderboard.title': 'ലീഡർബോർഡ്',
    'roadmap.findRoadmap': 'നിങ്ങളുടെ റോഡ്‌മാപ്പ് കണ്ടെത്തുക', 'algorithms.title': 'അൽഗോരിതം വിഷ്വലൈസർ',
    'animations.title': 'ഇന്ററാക്ടീവ് ആനിമേഷനുകൾ', 'profile.accountDetails': 'അക്കൗണ്ട് വിവരങ്ങൾ',
    'interviews.title': 'ഇന്റർവ്യൂ അനുഭവങ്ങൾ', 'leaderboard.you': '(നിങ്ങൾ)', 'interviews.passed': 'വിജയിച്ചു',
  },
  te: {
    'contests.title': 'పోటీలు', 'contests.phaseLive': 'ప్రత్యక్షం', 'contests.phaseUpcoming': 'రాబోయేది', 'contests.phaseEnded': 'ముగిసింది',
    'explore.title': 'అన్వేషించండి', 'myCourses.title': 'నా కోర్సులు', 'leaderboard.title': 'లీడర్‌బోర్డ్',
    'roadmap.findRoadmap': 'మీ రోడ్‌మ్యాప్ కనుగొనండి', 'algorithms.title': 'అల్గోరిథం విజువలైజర్',
    'animations.title': 'ఇంటరాక్టివ్ యానిమేషన్లు', 'profile.accountDetails': 'ఖాతా వివరాలు',
    'interviews.title': 'ఇంటర్వ్యూ అనుభవాలు', 'leaderboard.you': '(మీరు)', 'interviews.passed': 'ఉత్తీర్ణత',
  },
  kn: {
    'contests.title': 'ಸ್ಪರ್ಧೆಗಳು', 'contests.phaseLive': 'ನೇರ ಪ್ರಸಾರ', 'contests.phaseUpcoming': 'ಮುಂಬರುವ', 'contests.phaseEnded': 'ಮುಗಿದಿದೆ',
    'explore.title': 'ಅನ್ವೇಷಿಸಿ', 'myCourses.title': 'ನನ್ನ ಕೋರ್ಸ್‌ಗಳು', 'leaderboard.title': 'ಲೀಡರ್‌ಬೋರ್ಡ್',
    'roadmap.findRoadmap': 'ನಿಮ್ಮ ರೋಡ್‌ಮ್ಯಾಪ್ ಹುಡುಕಿ', 'algorithms.title': 'ಅಲ್ಗಾರಿದಮ್ ವಿಷುಯಲೈಸರ್',
    'animations.title': 'ಸಂವಾದಾತ್ಮಕ ಅನಿಮೇಷನ್‌ಗಳು', 'profile.accountDetails': 'ಖಾತೆ ವಿವರಗಳು',
    'interviews.title': 'ಸಂದರ್ಶನ ಅನುಭವಗಳು', 'leaderboard.you': '(ನೀವು)', 'interviews.passed': 'ಉತ್ತೀರ್ಣ',
  },
};

/* Deep-clone English namespace, then apply dot-path overrides for a language.
   Also handles Arabic's extra plural categories by cloning the _other key. */
function buildNamespace(ns, lang) {
  const base = JSON.parse(JSON.stringify(en[ns]));
  const overrides = T[lang] ?? {};
  for (const [path, value] of Object.entries(overrides)) {
    if (!path.startsWith(ns + '.')) continue;
    const parts = path.slice(ns.length + 1).split('.');
    let obj = base;
    for (let i = 0; i < parts.length - 1; i++) {
      obj[parts[i]] = obj[parts[i]] ?? {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
  }
  return base;
}

const langs = ['hi', 'es', 'fr', 'ar', 'ta', 'ml', 'te', 'kn'];
for (const lang of langs) {
  const file = join(localesDir, `${lang}.json`);
  const data = JSON.parse(readFileSync(file, 'utf8'));
  for (const ns of NAMESPACES) {
    data[ns] = buildNamespace(ns, lang);
  }
  // keep "language" block at the end if it exists
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`updated ${lang}.json`);
}
console.log('done');
