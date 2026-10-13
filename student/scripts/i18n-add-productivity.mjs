#!/usr/bin/env node
/* One-shot: inject the `productivity` namespace into every non-English locale.
   Idempotent — re-running overwrites the block with the same translations.
   Keeps key parity with en.json (checked by i18n-check.mjs). */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, '..', 'src', 'i18n', 'locales');

/* Per-language productivity translations. Structure mirrors en.json exactly. */
const BLOCKS = {
  hi: {
    dock: { label: 'अध्ययन उपकरण' },
    storageHint: 'इस डिवाइस पर सहेजा गया',
    storageHintTip: 'आपके नोट्स, कार्य और रिमाइंडर इसी ब्राउज़र में निजी रूप से संग्रहीत हैं। वे अभी अन्य डिवाइसों पर सिंक नहीं होंगे।',
    tools: { pomodoro: 'पोमोडोरो', notes: 'नोट्स', todos: 'टू-डू', reminders: 'रिमाइंडर', focus: 'गहन फोकस' },
    link: { add: 'लिंक', remove: 'लिंक हटाएँ', searchPlaceholder: 'कोर्स और डोमेन खोजें…', noResults: 'कोई मेल नहीं', kind: { COURSE: 'कोर्स', TOPIC: 'विषय', DOMAIN: 'डोमेन' } },
    pomodoro: { focus: 'फोकस', shortBreak: 'छोटा ब्रेक', longBreak: 'लंबा ब्रेक', start: 'शुरू करें', pause: 'रोकें', reset: 'रीसेट', skip: 'छोड़ें', today: 'आज', totalFocus: 'कुल फोकस', settings: 'सेटिंग्स', focusMinutes: 'फोकस अवधि (मिनट)', shortBreakMinutes: 'छोटा ब्रेक (मिनट)', longBreakMinutes: 'लंबा ब्रेक (मिनट)', sessionsBeforeLong: 'लंबे ब्रेक से पहले सत्र', autoStart: 'अगला अपने आप शुरू करें', sound: 'ध्वनि' },
    notes: { add: 'जोड़ें', untitled: 'बिना शीर्षक नोट', titlePlaceholder: 'नोट शीर्षक', bodyPlaceholder: 'कुछ लिखें…', search: 'नोट्स खोजें', pin: 'पिन करें', delete: 'हटाएँ', emptyTitle: 'अभी कोई नोट नहीं', emptyDesc: 'विचार लिखें और उन्हें किसी कोर्स या विषय से जोड़ें।' },
    todos: { add: 'जोड़ें', placeholder: 'एक कार्य जोड़ें…', high: 'उच्च', medium: 'मध्यम', low: 'निम्न', toggle: 'पूर्ण टॉगल करें', delete: 'हटाएँ', clearCompleted: 'पूर्ण साफ़ करें', openCount_one: '{{count}} खुला कार्य', openCount_other: '{{count}} खुले कार्य', emptyTitle: 'कुछ करने को नहीं', emptyDesc: 'कार्य जोड़ें और उन्हें अपनी पढ़ाई से जोड़ें।' },
    reminders: { add: 'जोड़ें', placeholder: 'मुझे याद दिलाएँ…', once: 'एक बार', daily: 'रोज़', weekly: 'साप्ताहिक', delete: 'हटाएँ', emptyTitle: 'कोई रिमाइंडर नहीं', emptyDesc: 'अध्ययन सत्रों और समय-सीमाओं के लिए नज़र शेड्यूल करें।' },
    focus: { heroTitle: 'गहन फोकस मोड', heroDesc: 'एक व्याकुलता-मुक्त सत्र में प्रवेश करें। चुनें कि आप क्या सीख रहे हैं, टाइमर शुरू करें और प्रवाह में रहें।', linkLabel: 'इस पर काम', ambient: 'परिवेश ध्वनि', start: 'फोकस शुरू करें', end: 'सत्र समाप्त करें', staying: 'लगे रहें — आप कर सकते हैं।', sound: 'ध्वनि टॉगल करें', totalDeepWork: 'कुल गहन कार्य', recent: 'हाल के सत्र' },
  },
  es: {
    dock: { label: 'Herramientas de estudio' },
    storageHint: 'Guardado en este dispositivo',
    storageHintTip: 'Tus notas, tareas y recordatorios se guardan de forma privada en este navegador. Aún no se sincronizan con otros dispositivos.',
    tools: { pomodoro: 'Pomodoro', notes: 'Notas', todos: 'Tareas', reminders: 'Recordatorios', focus: 'Enfoque profundo' },
    link: { add: 'Vincular', remove: 'Quitar vínculo', searchPlaceholder: 'Buscar cursos y dominios…', noResults: 'Sin coincidencias', kind: { COURSE: 'Curso', TOPIC: 'Tema', DOMAIN: 'Dominio' } },
    pomodoro: { focus: 'Enfoque', shortBreak: 'Descanso corto', longBreak: 'Descanso largo', start: 'Iniciar', pause: 'Pausar', reset: 'Reiniciar', skip: 'Saltar', today: 'Hoy', totalFocus: 'Enfoque total', settings: 'Ajustes', focusMinutes: 'Duración de enfoque (min)', shortBreakMinutes: 'Descanso corto (min)', longBreakMinutes: 'Descanso largo (min)', sessionsBeforeLong: 'Sesiones antes del descanso largo', autoStart: 'Iniciar la siguiente auto.', sound: 'Sonido' },
    notes: { add: 'Añadir', untitled: 'Nota sin título', titlePlaceholder: 'Título de la nota', bodyPlaceholder: 'Escribe algo…', search: 'Buscar notas', pin: 'Fijar', delete: 'Eliminar', emptyTitle: 'Aún no hay notas', emptyDesc: 'Anota ideas y vincúlalas a un curso o tema.' },
    todos: { add: 'Añadir', placeholder: 'Añadir una tarea…', high: 'Alta', medium: 'Media', low: 'Baja', toggle: 'Alternar hecho', delete: 'Eliminar', clearCompleted: 'Borrar completadas', openCount_one: '{{count}} tarea abierta', openCount_other: '{{count}} tareas abiertas', emptyTitle: 'Nada que hacer', emptyDesc: 'Añade tareas y vincúlalas a lo que estudias.' },
    reminders: { add: 'Añadir', placeholder: 'Recuérdame…', once: 'Una vez', daily: 'Diario', weekly: 'Semanal', delete: 'Eliminar', emptyTitle: 'Sin recordatorios', emptyDesc: 'Programa avisos para sesiones de estudio y plazos.' },
    focus: { heroTitle: 'Modo de enfoque profundo', heroDesc: 'Entra en una sesión sin distracciones. Elige qué estudias, inicia el temporizador y mantén el flujo.', linkLabel: 'Trabajando en', ambient: 'Sonido ambiente', start: 'Empezar a concentrarse', end: 'Terminar sesión', staying: 'Sigue así, tú puedes.', sound: 'Alternar sonido', totalDeepWork: 'Trabajo profundo total', recent: 'Sesiones recientes' },
  },
  fr: {
    dock: { label: "Outils d'étude" },
    storageHint: 'Enregistré sur cet appareil',
    storageHintTip: "Vos notes, tâches et rappels sont stockés de façon privée dans ce navigateur. Ils ne se synchronisent pas encore avec d'autres appareils.",
    tools: { pomodoro: 'Pomodoro', notes: 'Notes', todos: 'Tâches', reminders: 'Rappels', focus: 'Concentration' },
    link: { add: 'Lier', remove: 'Retirer le lien', searchPlaceholder: 'Rechercher cours et domaines…', noResults: 'Aucun résultat', kind: { COURSE: 'Cours', TOPIC: 'Sujet', DOMAIN: 'Domaine' } },
    pomodoro: { focus: 'Concentration', shortBreak: 'Pause courte', longBreak: 'Pause longue', start: 'Démarrer', pause: 'Pause', reset: 'Réinitialiser', skip: 'Passer', today: "Aujourd'hui", totalFocus: 'Concentration totale', settings: 'Paramètres', focusMinutes: 'Durée de concentration (min)', shortBreakMinutes: 'Pause courte (min)', longBreakMinutes: 'Pause longue (min)', sessionsBeforeLong: 'Sessions avant longue pause', autoStart: 'Démarrer la suite auto.', sound: 'Son' },
    notes: { add: 'Ajouter', untitled: 'Note sans titre', titlePlaceholder: 'Titre de la note', bodyPlaceholder: 'Écrivez quelque chose…', search: 'Rechercher des notes', pin: 'Épingler', delete: 'Supprimer', emptyTitle: 'Pas encore de notes', emptyDesc: 'Notez des idées et liez-les à un cours ou un sujet.' },
    todos: { add: 'Ajouter', placeholder: 'Ajouter une tâche…', high: 'Haute', medium: 'Moyenne', low: 'Basse', toggle: 'Basculer terminé', delete: 'Supprimer', clearCompleted: 'Effacer les terminées', openCount_one: '{{count}} tâche ouverte', openCount_other: '{{count}} tâches ouvertes', emptyTitle: 'Rien à faire', emptyDesc: 'Ajoutez des tâches et liez-les à vos études.' },
    reminders: { add: 'Ajouter', placeholder: 'Rappelle-moi de…', once: 'Une fois', daily: 'Quotidien', weekly: 'Hebdomadaire', delete: 'Supprimer', emptyTitle: 'Aucun rappel', emptyDesc: 'Planifiez des rappels pour vos révisions et échéances.' },
    focus: { heroTitle: 'Mode concentration', heroDesc: 'Entrez dans une session sans distraction. Choisissez votre sujet, lancez le minuteur et restez dans le flux.', linkLabel: 'En train de', ambient: 'Son ambiant', start: 'Commencer', end: 'Terminer la session', staying: 'Tenez bon, vous y arriverez.', sound: 'Basculer le son', totalDeepWork: 'Travail profond total', recent: 'Sessions récentes' },
  },
  ar: {
    dock: { label: 'أدوات الدراسة' },
    storageHint: 'محفوظ على هذا الجهاز',
    storageHintTip: 'يتم تخزين ملاحظاتك ومهامك وتذكيراتك بشكل خاص في هذا المتصفح. لن تتم مزامنتها مع أجهزة أخرى بعد.',
    tools: { pomodoro: 'بومودورو', notes: 'ملاحظات', todos: 'المهام', reminders: 'تذكيرات', focus: 'تركيز عميق' },
    link: { add: 'ربط', remove: 'إزالة الرابط', searchPlaceholder: 'ابحث في الدورات والمجالات…', noResults: 'لا نتائج', kind: { COURSE: 'دورة', TOPIC: 'موضوع', DOMAIN: 'مجال' } },
    pomodoro: { focus: 'تركيز', shortBreak: 'استراحة قصيرة', longBreak: 'استراحة طويلة', start: 'ابدأ', pause: 'إيقاف مؤقت', reset: 'إعادة', skip: 'تخطٍ', today: 'اليوم', totalFocus: 'إجمالي التركيز', settings: 'الإعدادات', focusMinutes: 'مدة التركيز (دقيقة)', shortBreakMinutes: 'استراحة قصيرة (دقيقة)', longBreakMinutes: 'استراحة طويلة (دقيقة)', sessionsBeforeLong: 'جلسات قبل الاستراحة الطويلة', autoStart: 'بدء التالي تلقائيًا', sound: 'الصوت' },
    notes: { add: 'إضافة', untitled: 'ملاحظة بدون عنوان', titlePlaceholder: 'عنوان الملاحظة', bodyPlaceholder: 'اكتب شيئًا…', search: 'ابحث في الملاحظات', pin: 'تثبيت', delete: 'حذف', emptyTitle: 'لا ملاحظات بعد', emptyDesc: 'دوّن الأفكار واربطها بدورة أو موضوع.' },
    todos: { add: 'إضافة', placeholder: 'أضف مهمة…', high: 'عالية', medium: 'متوسطة', low: 'منخفضة', toggle: 'تبديل الإنجاز', delete: 'حذف', clearCompleted: 'مسح المكتملة', openCount_one: 'مهمة مفتوحة واحدة', openCount_other: '{{count}} مهام مفتوحة', emptyTitle: 'لا شيء لفعله', emptyDesc: 'أضف مهامًا واربطها بما تتعلمه.' },
    reminders: { add: 'إضافة', placeholder: 'ذكّرني بـ…', once: 'مرة', daily: 'يوميًا', weekly: 'أسبوعيًا', delete: 'حذف', emptyTitle: 'لا تذكيرات', emptyDesc: 'جدول تنبيهات لجلسات الدراسة والمواعيد.' },
    focus: { heroTitle: 'وضع التركيز العميق', heroDesc: 'ادخل جلسة خالية من التشتت. اختر ما تتعلمه، ابدأ المؤقت وابقَ في التدفق.', linkLabel: 'العمل على', ambient: 'صوت محيط', start: 'ابدأ التركيز', end: 'إنهاء الجلسة', staying: 'استمر — أنت قادر على ذلك.', sound: 'تبديل الصوت', totalDeepWork: 'إجمالي العمل العميق', recent: 'الجلسات الأخيرة' },
  },
  ta: {
    dock: { label: 'படிப்பு கருவிகள்' },
    storageHint: 'இந்த சாதனத்தில் சேமிக்கப்பட்டது',
    storageHintTip: 'உங்கள் குறிப்புகள், பணிகள் மற்றும் நினைவூட்டல்கள் இந்த உலாவியில் தனிப்பட்ட முறையில் சேமிக்கப்படுகின்றன. அவை இன்னும் மற்ற சாதனங்களுடன் ஒத்திசைக்கப்படாது.',
    tools: { pomodoro: 'பொமோடோரோ', notes: 'குறிப்புகள்', todos: 'செய்ய வேண்டியவை', reminders: 'நினைவூட்டல்கள்', focus: 'ஆழ்ந்த கவனம்' },
    link: { add: 'இணை', remove: 'இணைப்பை நீக்கு', searchPlaceholder: 'படிப்புகள் & துறைகளைத் தேடு…', noResults: 'பொருத்தம் இல்லை', kind: { COURSE: 'படிப்பு', TOPIC: 'தலைப்பு', DOMAIN: 'துறை' } },
    pomodoro: { focus: 'கவனம்', shortBreak: 'சிறு இடைவேளை', longBreak: 'நீண்ட இடைவேளை', start: 'தொடங்கு', pause: 'இடைநிறுத்து', reset: 'மீட்டமை', skip: 'தவிர்', today: 'இன்று', totalFocus: 'மொத்த கவனம்', settings: 'அமைப்புகள்', focusMinutes: 'கவன நேரம் (நிமிடம்)', shortBreakMinutes: 'சிறு இடைவேளை (நிமிடம்)', longBreakMinutes: 'நீண்ட இடைவேளை (நிமிடம்)', sessionsBeforeLong: 'நீண்ட இடைவேளைக்கு முன் அமர்வுகள்', autoStart: 'அடுத்ததை தானாக தொடங்கு', sound: 'ஒலி' },
    notes: { add: 'சேர்', untitled: 'தலைப்பில்லா குறிப்பு', titlePlaceholder: 'குறிப்பு தலைப்பு', bodyPlaceholder: 'ஏதாவது எழுது…', search: 'குறிப்புகளைத் தேடு', pin: 'பின் செய்', delete: 'நீக்கு', emptyTitle: 'இன்னும் குறிப்புகள் இல்லை', emptyDesc: 'யோசனைகளை எழுதி படிப்பு அல்லது தலைப்புடன் இணை.' },
    todos: { add: 'சேர்', placeholder: 'ஒரு பணியைச் சேர்…', high: 'உயர்', medium: 'நடுத்தர', low: 'குறைவு', toggle: 'முடிந்தது மாற்று', delete: 'நீக்கு', clearCompleted: 'முடிந்தவற்றை அழி', openCount_one: '{{count}} திறந்த பணி', openCount_other: '{{count}} திறந்த பணிகள்', emptyTitle: 'செய்ய ஒன்றுமில்லை', emptyDesc: 'பணிகளைச் சேர்த்து நீங்கள் கற்பதுடன் இணைக்கவும்.' },
    reminders: { add: 'சேர்', placeholder: 'எனக்கு நினைவூட்டு…', once: 'ஒருமுறை', daily: 'தினசரி', weekly: 'வாராந்திர', delete: 'நீக்கு', emptyTitle: 'நினைவூட்டல்கள் இல்லை', emptyDesc: 'படிப்பு அமர்வுகள் மற்றும் காலக்கெடுக்கு நினைவூட்டல்களை திட்டமிடு.' },
    focus: { heroTitle: 'ஆழ்ந்த கவன பயன்முறை', heroDesc: 'கவனச்சிதறல் இல்லாத அமர்வில் நுழையுங்கள். கற்பதைத் தேர்ந்து, டைமரைத் தொடங்கி, ஓட்டத்தில் இருங்கள்.', linkLabel: 'வேலை செய்வது', ambient: 'சுற்றுப்புற ஒலி', start: 'கவனிக்க தொடங்கு', end: 'அமர்வை முடி', staying: 'தொடருங்கள் — உங்களால் முடியும்.', sound: 'ஒலி மாற்று', totalDeepWork: 'மொத்த ஆழ்ந்த வேலை', recent: 'சமீபத்திய அமர்வுகள்' },
  },
  ml: {
    dock: { label: 'പഠന ഉപകരണങ്ങൾ' },
    storageHint: 'ഈ ഉപകരണത്തിൽ സംരക്ഷിച്ചു',
    storageHintTip: 'നിങ്ങളുടെ കുറിപ്പുകൾ, ടാസ്കുകൾ, ഓർമ്മപ്പെടുത്തലുകൾ എന്നിവ ഈ ബ്രൗസറിൽ സ്വകാര്യമായി സൂക്ഷിക്കുന്നു. അവ ഇതുവരെ മറ്റ് ഉപകരണങ്ങളിലേക്ക് സിങ്ക് ചെയ്യില്ല.',
    tools: { pomodoro: 'പൊമോഡോറോ', notes: 'കുറിപ്പുകൾ', todos: 'ചെയ്യാനുള്ളവ', reminders: 'ഓർമ്മപ്പെടുത്തലുകൾ', focus: 'ആഴമായ ശ്രദ്ധ' },
    link: { add: 'ലിങ്ക്', remove: 'ലിങ്ക് നീക്കുക', searchPlaceholder: 'കോഴ്സുകളും ഡൊമെയ്‌നുകളും തിരയുക…', noResults: 'പൊരുത്തമില്ല', kind: { COURSE: 'കോഴ്സ്', TOPIC: 'വിഷയം', DOMAIN: 'ഡൊമെയ്ൻ' } },
    pomodoro: { focus: 'ശ്രദ്ധ', shortBreak: 'ചെറിയ ഇടവേള', longBreak: 'വലിയ ഇടവേള', start: 'തുടങ്ങുക', pause: 'താൽക്കാലികമായി നിർത്തുക', reset: 'റീസെറ്റ്', skip: 'ഒഴിവാക്കുക', today: 'ഇന്ന്', totalFocus: 'ആകെ ശ്രദ്ധ', settings: 'ക്രമീകരണങ്ങൾ', focusMinutes: 'ശ്രദ്ധ ദൈർഘ്യം (മിനിറ്റ്)', shortBreakMinutes: 'ചെറിയ ഇടവേള (മിനിറ്റ്)', longBreakMinutes: 'വലിയ ഇടവേള (മിനിറ്റ്)', sessionsBeforeLong: 'വലിയ ഇടവേളയ്ക്ക് മുമ്പുള്ള സെഷനുകൾ', autoStart: 'അടുത്തത് സ്വയം തുടങ്ങുക', sound: 'ശബ്ദം' },
    notes: { add: 'ചേർക്കുക', untitled: 'ശീർഷകമില്ലാത്ത കുറിപ്പ്', titlePlaceholder: 'കുറിപ്പ് ശീർഷകം', bodyPlaceholder: 'എന്തെങ്കിലും എഴുതുക…', search: 'കുറിപ്പുകൾ തിരയുക', pin: 'പിൻ ചെയ്യുക', delete: 'ഇല്ലാതാക്കുക', emptyTitle: 'ഇതുവരെ കുറിപ്പുകളില്ല', emptyDesc: 'ആശയങ്ങൾ എഴുതി ഒരു കോഴ്സിനോ വിഷയത്തിനോ ലിങ്ക് ചെയ്യുക.' },
    todos: { add: 'ചേർക്കുക', placeholder: 'ഒരു ടാസ്ക് ചേർക്കുക…', high: 'ഉയർന്നത്', medium: 'ഇടത്തരം', low: 'കുറഞ്ഞത്', toggle: 'പൂർത്തിയായി ടോഗിൾ', delete: 'ഇല്ലാതാക്കുക', clearCompleted: 'പൂർത്തിയായവ മായ്ക്കുക', openCount_one: '{{count}} തുറന്ന ടാസ്ക്', openCount_other: '{{count}} തുറന്ന ടാസ്കുകൾ', emptyTitle: 'ചെയ്യാൻ ഒന്നുമില്ല', emptyDesc: 'ടാസ്കുകൾ ചേർത്ത് നിങ്ങൾ പഠിക്കുന്നതുമായി ലിങ്ക് ചെയ്യുക.' },
    reminders: { add: 'ചേർക്കുക', placeholder: 'എന്നെ ഓർമ്മിപ്പിക്കുക…', once: 'ഒരിക്കൽ', daily: 'ദിവസേന', weekly: 'ആഴ്ചതോറും', delete: 'ഇല്ലാതാക്കുക', emptyTitle: 'ഓർമ്മപ്പെടുത്തലുകളില്ല', emptyDesc: 'പഠന സെഷനുകൾക്കും സമയപരിധികൾക്കും ഓർമ്മപ്പെടുത്തലുകൾ ഷെഡ്യൂൾ ചെയ്യുക.' },
    focus: { heroTitle: 'ആഴമായ ശ്രദ്ധ മോഡ്', heroDesc: 'ശ്രദ്ധാശൈഥില്യമില്ലാത്ത സെഷനിലേക്ക് പ്രവേശിക്കുക. പഠിക്കുന്നത് തിരഞ്ഞെടുത്ത് ടൈമർ ആരംഭിച്ച് ഒഴുക്കിൽ തുടരുക.', linkLabel: 'പ്രവർത്തിക്കുന്നത്', ambient: 'പരിസര ശബ്ദം', start: 'ശ്രദ്ധ തുടങ്ങുക', end: 'സെഷൻ അവസാനിപ്പിക്കുക', staying: 'തുടരൂ — നിങ്ങൾക്ക് കഴിയും.', sound: 'ശബ്ദം ടോഗിൾ', totalDeepWork: 'ആകെ ആഴമായ ജോലി', recent: 'സമീപകാല സെഷനുകൾ' },
  },
  te: {
    dock: { label: 'అభ్యాస సాధనాలు' },
    storageHint: 'ఈ పరికరంలో సేవ్ చేయబడింది',
    storageHintTip: 'మీ గమనికలు, పనులు మరియు రిమైండర్లు ఈ బ్రౌజర్‌లో ప్రైవేట్‌గా నిల్వ చేయబడతాయి. అవి ఇంకా ఇతర పరికరాలతో సింక్ కావు.',
    tools: { pomodoro: 'పొమోడోరో', notes: 'గమనికలు', todos: 'చేయవలసినవి', reminders: 'రిమైండర్లు', focus: 'లోతైన దృష్టి' },
    link: { add: 'లింక్', remove: 'లింక్ తీసివేయి', searchPlaceholder: 'కోర్సులు & డొమైన్‌లను వెతకండి…', noResults: 'సరిపోలలేదు', kind: { COURSE: 'కోర్సు', TOPIC: 'అంశం', DOMAIN: 'డొమైన్' } },
    pomodoro: { focus: 'దృష్టి', shortBreak: 'చిన్న విరామం', longBreak: 'పెద్ద విరామం', start: 'ప్రారంభించు', pause: 'పాజ్', reset: 'రీసెట్', skip: 'దాటవేయి', today: 'ఈరోజు', totalFocus: 'మొత్తం దృష్టి', settings: 'సెట్టింగ్‌లు', focusMinutes: 'దృష్టి నిడివి (నిమి)', shortBreakMinutes: 'చిన్న విరామం (నిమి)', longBreakMinutes: 'పెద్ద విరామం (నిమి)', sessionsBeforeLong: 'పెద్ద విరామానికి ముందు సెషన్లు', autoStart: 'తదుపరి ఆటో ప్రారంభం', sound: 'ధ్వని' },
    notes: { add: 'జోడించు', untitled: 'శీర్షిక లేని గమనిక', titlePlaceholder: 'గమనిక శీర్షిక', bodyPlaceholder: 'ఏదైనా రాయండి…', search: 'గమనికలను వెతకండి', pin: 'పిన్ చేయి', delete: 'తొలగించు', emptyTitle: 'ఇంకా గమనికలు లేవు', emptyDesc: 'ఆలోచనలు రాసి ఒక కోర్సు లేదా అంశంతో లింక్ చేయండి.' },
    todos: { add: 'జోడించు', placeholder: 'ఒక పనిని జోడించు…', high: 'అధిక', medium: 'మధ్యమ', low: 'తక్కువ', toggle: 'పూర్తి టోగుల్', delete: 'తొలగించు', clearCompleted: 'పూర్తయినవి తొలగించు', openCount_one: '{{count}} తెరిచిన పని', openCount_other: '{{count}} తెరిచిన పనులు', emptyTitle: 'చేయడానికి ఏమీ లేదు', emptyDesc: 'పనులు జోడించి మీరు నేర్చుకునేదానితో లింక్ చేయండి.' },
    reminders: { add: 'జోడించు', placeholder: 'నాకు గుర్తు చేయి…', once: 'ఒకసారి', daily: 'రోజువారీ', weekly: 'వారానికి', delete: 'తొలగించు', emptyTitle: 'రిమైండర్లు లేవు', emptyDesc: 'అభ్యాస సెషన్లు మరియు గడువుల కోసం రిమైండర్లను షెడ్యూల్ చేయండి.' },
    focus: { heroTitle: 'లోతైన దృష్టి మోడ్', heroDesc: 'పరధ్యానం లేని సెషన్‌లోకి ప్రవేశించండి. మీరు నేర్చుకునేది ఎంచుకుని, టైమర్ ప్రారంభించి, ప్రవాహంలో ఉండండి.', linkLabel: 'పని చేస్తోంది', ambient: 'పరిసర ధ్వని', start: 'దృష్టి ప్రారంభించు', end: 'సెషన్ ముగించు', staying: 'కొనసాగించండి — మీరు చేయగలరు.', sound: 'ధ్వని టోగుల్', totalDeepWork: 'మొత్తం లోతైన పని', recent: 'ఇటీవలి సెషన్లు' },
  },
  kn: {
    dock: { label: 'ಅಧ್ಯಯನ ಸಾಧನಗಳು' },
    storageHint: 'ಈ ಸಾಧನದಲ್ಲಿ ಉಳಿಸಲಾಗಿದೆ',
    storageHintTip: 'ನಿಮ್ಮ ಟಿಪ್ಪಣಿಗಳು, ಕೆಲಸಗಳು ಮತ್ತು ಜ್ಞಾಪನೆಗಳು ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಖಾಸಗಿಯಾಗಿ ಸಂಗ್ರಹವಾಗಿವೆ. ಅವು ಇನ್ನೂ ಇತರ ಸಾಧನಗಳೊಂದಿಗೆ ಸಿಂಕ್ ಆಗುವುದಿಲ್ಲ.',
    tools: { pomodoro: 'ಪೊಮೊಡೊರೊ', notes: 'ಟಿಪ್ಪಣಿಗಳು', todos: 'ಮಾಡಬೇಕಾದವು', reminders: 'ಜ್ಞಾಪನೆಗಳು', focus: 'ಆಳ ಗಮನ' },
    link: { add: 'ಲಿಂಕ್', remove: 'ಲಿಂಕ್ ತೆಗೆ', searchPlaceholder: 'ಕೋರ್ಸ್ & ಡೊಮೇನ್‌ಗಳನ್ನು ಹುಡುಕಿ…', noResults: 'ಹೊಂದಿಕೆ ಇಲ್ಲ', kind: { COURSE: 'ಕೋರ್ಸ್', TOPIC: 'ವಿಷಯ', DOMAIN: 'ಡೊಮೇನ್' } },
    pomodoro: { focus: 'ಗಮನ', shortBreak: 'ಚಿಕ್ಕ ವಿರಾಮ', longBreak: 'ದೀರ್ಘ ವಿರಾಮ', start: 'ಪ್ರಾರಂಭಿಸಿ', pause: 'ವಿರಾಮ', reset: 'ಮರುಹೊಂದಿಸಿ', skip: 'ಬಿಟ್ಟುಬಿಡಿ', today: 'ಇಂದು', totalFocus: 'ಒಟ್ಟು ಗಮನ', settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು', focusMinutes: 'ಗಮನ ಅವಧಿ (ನಿಮಿ)', shortBreakMinutes: 'ಚಿಕ್ಕ ವಿರಾಮ (ನಿಮಿ)', longBreakMinutes: 'ದೀರ್ಘ ವಿರಾಮ (ನಿಮಿ)', sessionsBeforeLong: 'ದೀರ್ಘ ವಿರಾಮದ ಮೊದಲು ಸೆಷನ್‌ಗಳು', autoStart: 'ಮುಂದಿನದನ್ನು ಸ್ವಯಂ ಪ್ರಾರಂಭಿಸಿ', sound: 'ಧ್ವನಿ' },
    notes: { add: 'ಸೇರಿಸಿ', untitled: 'ಶೀರ್ಷಿಕೆ ಇಲ್ಲದ ಟಿಪ್ಪಣಿ', titlePlaceholder: 'ಟಿಪ್ಪಣಿ ಶೀರ್ಷಿಕೆ', bodyPlaceholder: 'ಏನಾದರೂ ಬರೆಯಿರಿ…', search: 'ಟಿಪ್ಪಣಿಗಳನ್ನು ಹುಡುಕಿ', pin: 'ಪಿನ್ ಮಾಡಿ', delete: 'ಅಳಿಸಿ', emptyTitle: 'ಇನ್ನೂ ಟಿಪ್ಪಣಿಗಳಿಲ್ಲ', emptyDesc: 'ವಿಚಾರಗಳನ್ನು ಬರೆದು ಕೋರ್ಸ್ ಅಥವಾ ವಿಷಯಕ್ಕೆ ಲಿಂಕ್ ಮಾಡಿ.' },
    todos: { add: 'ಸೇರಿಸಿ', placeholder: 'ಒಂದು ಕೆಲಸ ಸೇರಿಸಿ…', high: 'ಹೆಚ್ಚು', medium: 'ಮಧ್ಯಮ', low: 'ಕಡಿಮೆ', toggle: 'ಪೂರ್ಣ ಟಾಗಲ್', delete: 'ಅಳಿಸಿ', clearCompleted: 'ಪೂರ್ಣಗೊಂಡವನ್ನು ತೆರವುಗೊಳಿಸಿ', openCount_one: '{{count}} ತೆರೆದ ಕೆಲಸ', openCount_other: '{{count}} ತೆರೆದ ಕೆಲಸಗಳು', emptyTitle: 'ಮಾಡಲು ಏನೂ ಇಲ್ಲ', emptyDesc: 'ಕೆಲಸಗಳನ್ನು ಸೇರಿಸಿ ನೀವು ಕಲಿಯುವುದಕ್ಕೆ ಲಿಂಕ್ ಮಾಡಿ.' },
    reminders: { add: 'ಸೇರಿಸಿ', placeholder: 'ನನಗೆ ನೆನಪಿಸಿ…', once: 'ಒಮ್ಮೆ', daily: 'ದಿನನಿತ್ಯ', weekly: 'ವಾರಕ್ಕೊಮ್ಮೆ', delete: 'ಅಳಿಸಿ', emptyTitle: 'ಜ್ಞಾಪನೆಗಳಿಲ್ಲ', emptyDesc: 'ಅಧ್ಯಯನ ಸೆಷನ್‌ಗಳು ಮತ್ತು ಗಡುವುಗಳಿಗೆ ಜ್ಞಾಪನೆಗಳನ್ನು ನಿಗದಿಪಡಿಸಿ.' },
    focus: { heroTitle: 'ಆಳ ಗಮನ ಮೋಡ್', heroDesc: 'ಗಮನಭಂಗವಿಲ್ಲದ ಸೆಷನ್‌ಗೆ ಪ್ರವೇಶಿಸಿ. ಕಲಿಯುವುದನ್ನು ಆಯ್ಕೆಮಾಡಿ, ಟೈಮರ್ ಪ್ರಾರಂಭಿಸಿ, ಹರಿವಿನಲ್ಲಿರಿ.', linkLabel: 'ಕೆಲಸ ಮಾಡುತ್ತಿದೆ', ambient: 'ಪರಿಸರ ಧ್ವನಿ', start: 'ಗಮನ ಪ್ರಾರಂಭಿಸಿ', end: 'ಸೆಷನ್ ಮುಗಿಸಿ', staying: 'ಮುಂದುವರಿಸಿ — ನೀವು ಮಾಡಬಲ್ಲಿರಿ.', sound: 'ಧ್ವನಿ ಟಾಗಲ್', totalDeepWork: 'ಒಟ್ಟು ಆಳ ಕೆಲಸ', recent: 'ಇತ್ತೀಚಿನ ಸೆಷನ್‌ಗಳು' },
  },
};

for (const [lang, block] of Object.entries(BLOCKS)) {
  const file = join(dir, `${lang}.json`);
  const json = JSON.parse(readFileSync(file, 'utf8'));
  json.productivity = block;
  // Keep `productivity` positioned before courseDetail for readability parity.
  writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log(`✓ ${lang}.json updated`);
}
console.log('Done.');
