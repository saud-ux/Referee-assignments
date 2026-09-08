/**
 * بيانات موسم 2026/2027 مستخرجة من تعاميم الاتحاد السعودي لكرة الطاولة.
 *
 * البطولات والمواعيد والصالات والأندية والطاولات: منقولة حرفياً من الملفات الرسمية.
 * المواجهات (أي نادٍ ضد أي نادٍ): مولّدة بطريقة الدائرة، لأن القرعة الرسمية
 * غير واردة في تلك الملفات — تُستبدل عند صدورها.
 */

export const TOURNAMENTS = [
  {
    "name": "دوري 19-17-15-13 أولاد — التجمع الأول",
    "city": "الرياض",
    "venue": "الصالة الخضراء — وزارة الرياضة",
    "startDate": "2026-10-05",
    "endDate": "2026-10-09"
  },
  {
    "name": "دوري 13-15-17-19 بنات وسيدات — التجمع الأول",
    "city": "الرياض",
    "venue": "جامعة الأميرة نورة",
    "startDate": "2026-10-14",
    "endDate": "2026-10-17"
  },
  {
    "name": "بطولة الفردي 11-13-15-17-19 أولاد — التجمع الأول",
    "city": "الرياض",
    "venue": "صالة الأمير فيصل بن فهد — الملز",
    "startDate": "2026-10-21",
    "endDate": "2026-10-25"
  },
  {
    "name": "بطولة الفردي 11-13-15-17-19 سيدات وبنات — التجمع الأول",
    "city": "الرياض",
    "venue": "صالة الاتحاد السعودي لكرة الطاولة",
    "startDate": "2026-10-27",
    "endDate": "2026-10-31"
  },
  {
    "name": "دوري 19-17-15-13 أولاد — التجمع الثاني",
    "city": "الأحساء",
    "venue": "مدينة الأمير عبدالله بن جلوي",
    "startDate": "2026-11-03",
    "endDate": "2026-11-07"
  },
  {
    "name": "دوري جاهز وأندية الدرجة الأولى — التجمع الأول",
    "city": "الدمام",
    "venue": "جامعة الإمام عبدالرحمن",
    "startDate": "2026-11-12",
    "endDate": "2026-11-14"
  },
  {
    "name": "بطولة الفردي رجال — التجمع الأول",
    "city": "الرياض",
    "venue": "صالة الأمير فيصل بن فهد — الملز",
    "startDate": "2026-12-09",
    "endDate": "2026-12-12"
  },
  {
    "name": "دوري جاهز وأندية الدرجة الأولى — التجمع الثاني",
    "city": "مكة المكرمة",
    "venue": "مدينة الملك عبدالعزيز الرياضية بالشرائع",
    "startDate": "2026-12-15",
    "endDate": "2026-12-17"
  },
  {
    "name": "دوري 19-17-15-13 أولاد — التجمع الثالث",
    "city": "المدينة المنورة",
    "venue": "مدينة الأمير محمد",
    "startDate": "2026-12-22",
    "endDate": "2026-12-26"
  },
  {
    "name": "دوري 13-15-17-19 بنات وسيدات — التجمع الثاني",
    "city": "الرياض",
    "venue": "صالة الأمير فيصل بن فهد — الملز",
    "startDate": "2027-01-19",
    "endDate": "2027-01-23"
  },
  {
    "name": "دوري جاهز وأندية الدرجة الأولى — التجمع الثالث",
    "city": "",
    "venue": "",
    "startDate": "",
    "endDate": ""
  },
  {
    "name": "بطولة الفردي 11-13-15-17-19 أولاد — التجمع الثاني",
    "city": "",
    "venue": "",
    "startDate": "",
    "endDate": ""
  },
  {
    "name": "بطولة الفردي 11-13-15-17-19 سيدات — التجمع الثاني",
    "city": "",
    "venue": "",
    "startDate": "",
    "endDate": ""
  },
  {
    "name": "دوري 19-17-15-13 أولاد — التجمع الرابع",
    "city": "",
    "venue": "",
    "startDate": "",
    "endDate": ""
  },
  {
    "name": "بطولة الفردي رجال — التجمع الثاني",
    "city": "",
    "venue": "حسب جدول WTT",
    "startDate": "",
    "endDate": ""
  },
  {
    "name": "دوري جاهز وأندية الدرجة الأولى — التجمع الرابع",
    "city": "",
    "venue": "",
    "startDate": "",
    "endDate": ""
  },
  {
    "name": "دوري جاهز — التجمع الخامس",
    "city": "",
    "venue": "",
    "startDate": "",
    "endDate": ""
  },
  {
    "name": "كأس الاتحاد السعودي — دوري جاهز والدرجة الأولى",
    "city": "",
    "venue": "",
    "startDate": "",
    "endDate": ""
  },
  {
    "name": "بطولة الصعود — الدرجة الثانية رجال و19",
    "city": "",
    "venue": "",
    "startDate": "",
    "endDate": ""
  },
  {
    "name": "بطولة الصعود 17-15-13 — الفئات العمرية",
    "city": "",
    "venue": "",
    "startDate": "",
    "endDate": ""
  }
];

/** يُسنَد إلى البطولة التي يطابق اسمها هذا */
export const MATCHES_TOURNAMENT = "دوري 19-17-15-13 أولاد — التجمع الأول";

export const MATCHES = [
  {
    "clubA": "الخليج",
    "clubB": "الصواري",
    "startTime": "2026-10-05T10:00",
    "table": "T1",
    "round": "الجولة 1",
    "category": "U17"
  },
  {
    "clubA": "الاتحاد",
    "clubB": "الرياض",
    "startTime": "2026-10-05T10:00",
    "table": "T2",
    "round": "الجولة 1",
    "category": "U17"
  },
  {
    "clubA": "القادسية",
    "clubB": "الحزم",
    "startTime": "2026-10-05T10:00",
    "table": "T3",
    "round": "الجولة 1",
    "category": "U17"
  },
  {
    "clubA": "السلام",
    "clubB": "حراء",
    "startTime": "2026-10-05T10:00",
    "table": "T4",
    "round": "الجولة 1",
    "category": "U17"
  },
  {
    "clubA": "الشباب",
    "clubB": "الفيحاء",
    "startTime": "2026-10-05T10:00",
    "table": "T5",
    "round": "الجولة 1",
    "category": "U17"
  },
  {
    "clubA": "الوحدة",
    "clubB": "القارة",
    "startTime": "2026-10-05T10:00",
    "table": "T6",
    "round": "الجولة 1",
    "category": "U17"
  },
  {
    "clubA": "العلا",
    "clubB": "الهداية",
    "startTime": "2026-10-05T10:00",
    "table": "T7",
    "round": "الجولة 1",
    "category": "U17"
  },
  {
    "clubA": "مضر",
    "clubB": "الحمادة",
    "startTime": "2026-10-05T10:00",
    "table": "T8",
    "round": "الجولة 1",
    "category": "U17"
  },
  {
    "clubA": "الخليج",
    "clubB": "الصواري",
    "startTime": "2026-10-05T12:00",
    "table": "T1",
    "round": "الجولة 1",
    "category": "U19"
  },
  {
    "clubA": "الاتحاد",
    "clubB": "الرياض",
    "startTime": "2026-10-05T12:00",
    "table": "T2",
    "round": "الجولة 1",
    "category": "U19"
  },
  {
    "clubA": "القادسية",
    "clubB": "الحزم",
    "startTime": "2026-10-05T12:00",
    "table": "T3",
    "round": "الجولة 1",
    "category": "U19"
  },
  {
    "clubA": "السلام",
    "clubB": "حراء",
    "startTime": "2026-10-05T12:00",
    "table": "T4",
    "round": "الجولة 1",
    "category": "U19"
  },
  {
    "clubA": "الشباب",
    "clubB": "الفيحاء",
    "startTime": "2026-10-05T12:00",
    "table": "T5",
    "round": "الجولة 1",
    "category": "U19"
  },
  {
    "clubA": "الوحدة",
    "clubB": "الهداية",
    "startTime": "2026-10-05T12:00",
    "table": "T6",
    "round": "الجولة 1",
    "category": "U19"
  },
  {
    "clubA": "العلا",
    "clubB": "القارة",
    "startTime": "2026-10-05T12:00",
    "table": "T7",
    "round": "الجولة 1",
    "category": "U19"
  },
  {
    "clubA": "الحمادة",
    "clubB": "مضر",
    "startTime": "2026-10-05T12:00",
    "table": "T8",
    "round": "الجولة 1",
    "category": "U19"
  },
  {
    "clubA": "الفتح",
    "clubB": "الصواري",
    "startTime": "2026-10-05T17:00",
    "table": "T1",
    "round": "الجولة 2",
    "category": "U17"
  },
  {
    "clubA": "الخليج",
    "clubB": "الحزم",
    "startTime": "2026-10-05T17:00",
    "table": "T2",
    "round": "الجولة 2",
    "category": "U17"
  },
  {
    "clubA": "الاتحاد",
    "clubB": "حراء",
    "startTime": "2026-10-05T17:00",
    "table": "T3",
    "round": "الجولة 2",
    "category": "U17"
  },
  {
    "clubA": "القادسية",
    "clubB": "الفيحاء",
    "startTime": "2026-10-05T17:00",
    "table": "T4",
    "round": "الجولة 2",
    "category": "U17"
  },
  {
    "clubA": "السلام",
    "clubB": "القارة",
    "startTime": "2026-10-05T17:00",
    "table": "T5",
    "round": "الجولة 2",
    "category": "U17"
  },
  {
    "clubA": "الشباب",
    "clubB": "الهداية",
    "startTime": "2026-10-05T17:00",
    "table": "T6",
    "round": "الجولة 2",
    "category": "U17"
  },
  {
    "clubA": "الوحدة",
    "clubB": "الحمادة",
    "startTime": "2026-10-05T17:00",
    "table": "T7",
    "round": "الجولة 2",
    "category": "U17"
  },
  {
    "clubA": "العلا",
    "clubB": "مضر",
    "startTime": "2026-10-05T17:00",
    "table": "T8",
    "round": "الجولة 2",
    "category": "U17"
  },
  {
    "clubA": "الفتح",
    "clubB": "الصواري",
    "startTime": "2026-10-05T19:00",
    "table": "T1",
    "round": "الجولة 2",
    "category": "U19"
  },
  {
    "clubA": "الخليج",
    "clubB": "الحزم",
    "startTime": "2026-10-05T19:00",
    "table": "T2",
    "round": "الجولة 2",
    "category": "U19"
  },
  {
    "clubA": "الاتحاد",
    "clubB": "حراء",
    "startTime": "2026-10-05T19:00",
    "table": "T3",
    "round": "الجولة 2",
    "category": "U19"
  },
  {
    "clubA": "القادسية",
    "clubB": "الفيحاء",
    "startTime": "2026-10-05T19:00",
    "table": "T4",
    "round": "الجولة 2",
    "category": "U19"
  },
  {
    "clubA": "السلام",
    "clubB": "الهداية",
    "startTime": "2026-10-05T19:00",
    "table": "T5",
    "round": "الجولة 2",
    "category": "U19"
  },
  {
    "clubA": "الشباب",
    "clubB": "القارة",
    "startTime": "2026-10-05T19:00",
    "table": "T6",
    "round": "الجولة 2",
    "category": "U19"
  },
  {
    "clubA": "الوحدة",
    "clubB": "مضر",
    "startTime": "2026-10-05T19:00",
    "table": "T7",
    "round": "الجولة 2",
    "category": "U19"
  },
  {
    "clubA": "العلا",
    "clubB": "الحمادة",
    "startTime": "2026-10-05T19:00",
    "table": "T8",
    "round": "الجولة 2",
    "category": "U19"
  },
  {
    "clubA": "الفتح",
    "clubB": "الرياض",
    "startTime": "2026-10-06T10:00",
    "table": "T1",
    "round": "الجولة 3",
    "category": "U17"
  },
  {
    "clubA": "الصواري",
    "clubB": "الحزم",
    "startTime": "2026-10-06T10:00",
    "table": "T2",
    "round": "الجولة 3",
    "category": "U17"
  },
  {
    "clubA": "الخليج",
    "clubB": "الفيحاء",
    "startTime": "2026-10-06T10:00",
    "table": "T3",
    "round": "الجولة 3",
    "category": "U17"
  },
  {
    "clubA": "الاتحاد",
    "clubB": "القارة",
    "startTime": "2026-10-06T10:00",
    "table": "T4",
    "round": "الجولة 3",
    "category": "U17"
  },
  {
    "clubA": "القادسية",
    "clubB": "الهداية",
    "startTime": "2026-10-06T10:00",
    "table": "T5",
    "round": "الجولة 3",
    "category": "U17"
  },
  {
    "clubA": "السلام",
    "clubB": "الحمادة",
    "startTime": "2026-10-06T10:00",
    "table": "T6",
    "round": "الجولة 3",
    "category": "U17"
  },
  {
    "clubA": "الشباب",
    "clubB": "مضر",
    "startTime": "2026-10-06T10:00",
    "table": "T7",
    "round": "الجولة 3",
    "category": "U17"
  },
  {
    "clubA": "الوحدة",
    "clubB": "العلا",
    "startTime": "2026-10-06T10:00",
    "table": "T8",
    "round": "الجولة 3",
    "category": "U17"
  },
  {
    "clubA": "الفتح",
    "clubB": "الرياض",
    "startTime": "2026-10-06T12:00",
    "table": "T1",
    "round": "الجولة 3",
    "category": "U19"
  },
  {
    "clubA": "الصواري",
    "clubB": "الحزم",
    "startTime": "2026-10-06T12:00",
    "table": "T2",
    "round": "الجولة 3",
    "category": "U19"
  },
  {
    "clubA": "الخليج",
    "clubB": "الفيحاء",
    "startTime": "2026-10-06T12:00",
    "table": "T3",
    "round": "الجولة 3",
    "category": "U19"
  },
  {
    "clubA": "الاتحاد",
    "clubB": "الهداية",
    "startTime": "2026-10-06T12:00",
    "table": "T4",
    "round": "الجولة 3",
    "category": "U19"
  },
  {
    "clubA": "القادسية",
    "clubB": "القارة",
    "startTime": "2026-10-06T12:00",
    "table": "T5",
    "round": "الجولة 3",
    "category": "U19"
  },
  {
    "clubA": "السلام",
    "clubB": "مضر",
    "startTime": "2026-10-06T12:00",
    "table": "T6",
    "round": "الجولة 3",
    "category": "U19"
  },
  {
    "clubA": "الشباب",
    "clubB": "الحمادة",
    "startTime": "2026-10-06T12:00",
    "table": "T7",
    "round": "الجولة 3",
    "category": "U19"
  },
  {
    "clubA": "الوحدة",
    "clubB": "العلا",
    "startTime": "2026-10-06T12:00",
    "table": "T8",
    "round": "الجولة 3",
    "category": "U19"
  },
  {
    "clubA": "الفتح",
    "clubB": "الحزم",
    "startTime": "2026-10-06T17:00",
    "table": "T1",
    "round": "الجولة 4",
    "category": "U17"
  },
  {
    "clubA": "الرياض",
    "clubB": "حراء",
    "startTime": "2026-10-06T17:00",
    "table": "T2",
    "round": "الجولة 4",
    "category": "U17"
  },
  {
    "clubA": "الصواري",
    "clubB": "الفيحاء",
    "startTime": "2026-10-06T17:00",
    "table": "T3",
    "round": "الجولة 4",
    "category": "U17"
  },
  {
    "clubA": "الخليج",
    "clubB": "الهداية",
    "startTime": "2026-10-06T17:00",
    "table": "T4",
    "round": "الجولة 4",
    "category": "U17"
  },
  {
    "clubA": "الاتحاد",
    "clubB": "الحمادة",
    "startTime": "2026-10-06T17:00",
    "table": "T5",
    "round": "الجولة 4",
    "category": "U17"
  },
  {
    "clubA": "القادسية",
    "clubB": "مضر",
    "startTime": "2026-10-06T17:00",
    "table": "T6",
    "round": "الجولة 4",
    "category": "U17"
  },
  {
    "clubA": "السلام",
    "clubB": "العلا",
    "startTime": "2026-10-06T17:00",
    "table": "T7",
    "round": "الجولة 4",
    "category": "U17"
  },
  {
    "clubA": "الشباب",
    "clubB": "الوحدة",
    "startTime": "2026-10-06T17:00",
    "table": "T8",
    "round": "الجولة 4",
    "category": "U17"
  },
  {
    "clubA": "الفتح",
    "clubB": "الحزم",
    "startTime": "2026-10-06T19:00",
    "table": "T1",
    "round": "الجولة 4",
    "category": "U19"
  },
  {
    "clubA": "الرياض",
    "clubB": "حراء",
    "startTime": "2026-10-06T19:00",
    "table": "T2",
    "round": "الجولة 4",
    "category": "U19"
  },
  {
    "clubA": "الصواري",
    "clubB": "الفيحاء",
    "startTime": "2026-10-06T19:00",
    "table": "T3",
    "round": "الجولة 4",
    "category": "U19"
  },
  {
    "clubA": "الخليج",
    "clubB": "القارة",
    "startTime": "2026-10-06T19:00",
    "table": "T4",
    "round": "الجولة 4",
    "category": "U19"
  },
  {
    "clubA": "الاتحاد",
    "clubB": "مضر",
    "startTime": "2026-10-06T19:00",
    "table": "T5",
    "round": "الجولة 4",
    "category": "U19"
  },
  {
    "clubA": "القادسية",
    "clubB": "الحمادة",
    "startTime": "2026-10-06T19:00",
    "table": "T6",
    "round": "الجولة 4",
    "category": "U19"
  },
  {
    "clubA": "السلام",
    "clubB": "العلا",
    "startTime": "2026-10-06T19:00",
    "table": "T7",
    "round": "الجولة 4",
    "category": "U19"
  },
  {
    "clubA": "الشباب",
    "clubB": "الوحدة",
    "startTime": "2026-10-06T19:00",
    "table": "T8",
    "round": "الجولة 4",
    "category": "U19"
  },
  {
    "clubA": "الفتح",
    "clubB": "حراء",
    "startTime": "2026-10-07T10:00",
    "table": "T1",
    "round": "الجولة 5",
    "category": "U17"
  },
  {
    "clubA": "الحزم",
    "clubB": "الفيحاء",
    "startTime": "2026-10-07T10:00",
    "table": "T2",
    "round": "الجولة 5",
    "category": "U17"
  },
  {
    "clubA": "الرياض",
    "clubB": "القارة",
    "startTime": "2026-10-07T10:00",
    "table": "T3",
    "round": "الجولة 5",
    "category": "U17"
  },
  {
    "clubA": "الصواري",
    "clubB": "الهداية",
    "startTime": "2026-10-07T10:00",
    "table": "T4",
    "round": "الجولة 5",
    "category": "U17"
  },
  {
    "clubA": "الخليج",
    "clubB": "مضر",
    "startTime": "2026-10-07T10:00",
    "table": "T5",
    "round": "الجولة 5",
    "category": "U17"
  },
  {
    "clubA": "الاتحاد",
    "clubB": "العلا",
    "startTime": "2026-10-07T10:00",
    "table": "T6",
    "round": "الجولة 5",
    "category": "U17"
  },
  {
    "clubA": "القادسية",
    "clubB": "الوحدة",
    "startTime": "2026-10-07T10:00",
    "table": "T7",
    "round": "الجولة 5",
    "category": "U17"
  },
  {
    "clubA": "السلام",
    "clubB": "الشباب",
    "startTime": "2026-10-07T10:00",
    "table": "T8",
    "round": "الجولة 5",
    "category": "U17"
  },
  {
    "clubA": "الفتح",
    "clubB": "حراء",
    "startTime": "2026-10-07T12:00",
    "table": "T1",
    "round": "الجولة 5",
    "category": "U19"
  },
  {
    "clubA": "الحزم",
    "clubB": "الفيحاء",
    "startTime": "2026-10-07T12:00",
    "table": "T2",
    "round": "الجولة 5",
    "category": "U19"
  },
  {
    "clubA": "الرياض",
    "clubB": "الهداية",
    "startTime": "2026-10-07T12:00",
    "table": "T3",
    "round": "الجولة 5",
    "category": "U19"
  },
  {
    "clubA": "الصواري",
    "clubB": "القارة",
    "startTime": "2026-10-07T12:00",
    "table": "T4",
    "round": "الجولة 5",
    "category": "U19"
  },
  {
    "clubA": "الخليج",
    "clubB": "الحمادة",
    "startTime": "2026-10-07T12:00",
    "table": "T5",
    "round": "الجولة 5",
    "category": "U19"
  },
  {
    "clubA": "الاتحاد",
    "clubB": "العلا",
    "startTime": "2026-10-07T12:00",
    "table": "T6",
    "round": "الجولة 5",
    "category": "U19"
  },
  {
    "clubA": "القادسية",
    "clubB": "الوحدة",
    "startTime": "2026-10-07T12:00",
    "table": "T7",
    "round": "الجولة 5",
    "category": "U19"
  },
  {
    "clubA": "السلام",
    "clubB": "الشباب",
    "startTime": "2026-10-07T12:00",
    "table": "T8",
    "round": "الجولة 5",
    "category": "U19"
  },
  {
    "clubA": "القادسية",
    "clubB": "الطرف",
    "startTime": "2026-10-07T16:00",
    "table": "T1",
    "round": "الجولة 1",
    "category": "U13"
  },
  {
    "clubA": "الشباب",
    "clubB": "الصواري",
    "startTime": "2026-10-07T16:00",
    "table": "T2",
    "round": "الجولة 1",
    "category": "U13"
  },
  {
    "clubA": "الفتح",
    "clubB": "الرياض",
    "startTime": "2026-10-07T16:00",
    "table": "T3",
    "round": "الجولة 1",
    "category": "U13"
  },
  {
    "clubA": "الوحدة",
    "clubB": "الابتسام",
    "startTime": "2026-10-07T16:00",
    "table": "T4",
    "round": "الجولة 1",
    "category": "U13"
  },
  {
    "clubA": "القارة",
    "clubB": "مضر",
    "startTime": "2026-10-07T16:00",
    "table": "T5",
    "round": "الجولة 1",
    "category": "U13"
  },
  {
    "clubA": "الخليج",
    "clubB": "الهداية",
    "startTime": "2026-10-07T16:00",
    "table": "T6",
    "round": "الجولة 1",
    "category": "U13"
  },
  {
    "clubA": "الحمادة",
    "clubB": "العلا",
    "startTime": "2026-10-07T16:00",
    "table": "T7",
    "round": "الجولة 1",
    "category": "U13"
  },
  {
    "clubA": "السلام",
    "clubB": "الحزم",
    "startTime": "2026-10-07T16:00",
    "table": "T8",
    "round": "الجولة 1",
    "category": "U13"
  },
  {
    "clubA": "الاتحاد",
    "clubB": "حراء",
    "startTime": "2026-10-07T17:30",
    "table": "T1",
    "round": "الجولة 1",
    "category": "U15"
  },
  {
    "clubA": "الخليج",
    "clubB": "الطرف",
    "startTime": "2026-10-07T17:30",
    "table": "T2",
    "round": "الجولة 1",
    "category": "U15"
  },
  {
    "clubA": "القادسية",
    "clubB": "العلا",
    "startTime": "2026-10-07T17:30",
    "table": "T3",
    "round": "الجولة 1",
    "category": "U15"
  },
  {
    "clubA": "الوحدة",
    "clubB": "الهداية",
    "startTime": "2026-10-07T17:30",
    "table": "T4",
    "round": "الجولة 1",
    "category": "U15"
  },
  {
    "clubA": "الحمادة",
    "clubB": "الابتسام",
    "startTime": "2026-10-07T17:30",
    "table": "T5",
    "round": "الجولة 1",
    "category": "U15"
  },
  {
    "clubA": "السلام",
    "clubB": "الرياض",
    "startTime": "2026-10-07T17:30",
    "table": "T6",
    "round": "الجولة 1",
    "category": "U15"
  },
  {
    "clubA": "الشباب",
    "clubB": "مضر",
    "startTime": "2026-10-07T17:30",
    "table": "T7",
    "round": "الجولة 1",
    "category": "U15"
  },
  {
    "clubA": "القارة",
    "clubB": "الحزم",
    "startTime": "2026-10-07T17:30",
    "table": "T8",
    "round": "الجولة 1",
    "category": "U15"
  },
  {
    "clubA": "الاتحاد",
    "clubB": "الطرف",
    "startTime": "2026-10-07T19:00",
    "table": "T1",
    "round": "الجولة 2",
    "category": "U13"
  },
  {
    "clubA": "القادسية",
    "clubB": "الرياض",
    "startTime": "2026-10-07T19:00",
    "table": "T2",
    "round": "الجولة 2",
    "category": "U13"
  },
  {
    "clubA": "الشباب",
    "clubB": "الابتسام",
    "startTime": "2026-10-07T19:00",
    "table": "T3",
    "round": "الجولة 2",
    "category": "U13"
  },
  {
    "clubA": "الفتح",
    "clubB": "مضر",
    "startTime": "2026-10-07T19:00",
    "table": "T4",
    "round": "الجولة 2",
    "category": "U13"
  },
  {
    "clubA": "الوحدة",
    "clubB": "الهداية",
    "startTime": "2026-10-07T19:00",
    "table": "T5",
    "round": "الجولة 2",
    "category": "U13"
  },
  {
    "clubA": "القارة",
    "clubB": "العلا",
    "startTime": "2026-10-07T19:00",
    "table": "T6",
    "round": "الجولة 2",
    "category": "U13"
  },
  {
    "clubA": "الخليج",
    "clubB": "الحزم",
    "startTime": "2026-10-07T19:00",
    "table": "T7",
    "round": "الجولة 2",
    "category": "U13"
  },
  {
    "clubA": "الحمادة",
    "clubB": "السلام",
    "startTime": "2026-10-07T19:00",
    "table": "T8",
    "round": "الجولة 2",
    "category": "U13"
  },
  {
    "clubA": "الفتح",
    "clubB": "حراء",
    "startTime": "2026-10-08T10:00",
    "table": "T1",
    "round": "الجولة 2",
    "category": "U15"
  },
  {
    "clubA": "الاتحاد",
    "clubB": "العلا",
    "startTime": "2026-10-08T10:00",
    "table": "T2",
    "round": "الجولة 2",
    "category": "U15"
  },
  {
    "clubA": "الخليج",
    "clubB": "الهداية",
    "startTime": "2026-10-08T10:00",
    "table": "T3",
    "round": "الجولة 2",
    "category": "U15"
  },
  {
    "clubA": "القادسية",
    "clubB": "الابتسام",
    "startTime": "2026-10-08T10:00",
    "table": "T4",
    "round": "الجولة 2",
    "category": "U15"
  },
  {
    "clubA": "الوحدة",
    "clubB": "الرياض",
    "startTime": "2026-10-08T10:00",
    "table": "T5",
    "round": "الجولة 2",
    "category": "U15"
  },
  {
    "clubA": "الحمادة",
    "clubB": "مضر",
    "startTime": "2026-10-08T10:00",
    "table": "T6",
    "round": "الجولة 2",
    "category": "U15"
  },
  {
    "clubA": "السلام",
    "clubB": "الحزم",
    "startTime": "2026-10-08T10:00",
    "table": "T7",
    "round": "الجولة 2",
    "category": "U15"
  },
  {
    "clubA": "الشباب",
    "clubB": "القارة",
    "startTime": "2026-10-08T10:00",
    "table": "T8",
    "round": "الجولة 2",
    "category": "U15"
  },
  {
    "clubA": "الاتحاد",
    "clubB": "الصواري",
    "startTime": "2026-10-08T12:00",
    "table": "T1",
    "round": "الجولة 3",
    "category": "U13"
  },
  {
    "clubA": "الطرف",
    "clubB": "الرياض",
    "startTime": "2026-10-08T12:00",
    "table": "T2",
    "round": "الجولة 3",
    "category": "U13"
  },
  {
    "clubA": "القادسية",
    "clubB": "مضر",
    "startTime": "2026-10-08T12:00",
    "table": "T3",
    "round": "الجولة 3",
    "category": "U13"
  },
  {
    "clubA": "الشباب",
    "clubB": "الهداية",
    "startTime": "2026-10-08T12:00",
    "table": "T4",
    "round": "الجولة 3",
    "category": "U13"
  },
  {
    "clubA": "الفتح",
    "clubB": "العلا",
    "startTime": "2026-10-08T12:00",
    "table": "T5",
    "round": "الجولة 3",
    "category": "U13"
  },
  {
    "clubA": "الوحدة",
    "clubB": "الحزم",
    "startTime": "2026-10-08T12:00",
    "table": "T6",
    "round": "الجولة 3",
    "category": "U13"
  },
  {
    "clubA": "القارة",
    "clubB": "السلام",
    "startTime": "2026-10-08T12:00",
    "table": "T7",
    "round": "الجولة 3",
    "category": "U13"
  },
  {
    "clubA": "الخليج",
    "clubB": "الحمادة",
    "startTime": "2026-10-08T12:00",
    "table": "T8",
    "round": "الجولة 3",
    "category": "U13"
  },
  {
    "clubA": "الفتح",
    "clubB": "الطرف",
    "startTime": "2026-10-08T16:00",
    "table": "T1",
    "round": "الجولة 3",
    "category": "U15"
  },
  {
    "clubA": "حراء",
    "clubB": "العلا",
    "startTime": "2026-10-08T16:00",
    "table": "T2",
    "round": "الجولة 3",
    "category": "U15"
  },
  {
    "clubA": "الاتحاد",
    "clubB": "الابتسام",
    "startTime": "2026-10-08T16:00",
    "table": "T3",
    "round": "الجولة 3",
    "category": "U15"
  },
  {
    "clubA": "الخليج",
    "clubB": "الرياض",
    "startTime": "2026-10-08T16:00",
    "table": "T4",
    "round": "الجولة 3",
    "category": "U15"
  },
  {
    "clubA": "القادسية",
    "clubB": "مضر",
    "startTime": "2026-10-08T16:00",
    "table": "T5",
    "round": "الجولة 3",
    "category": "U15"
  },
  {
    "clubA": "الوحدة",
    "clubB": "الحزم",
    "startTime": "2026-10-08T16:00",
    "table": "T6",
    "round": "الجولة 3",
    "category": "U15"
  },
  {
    "clubA": "الحمادة",
    "clubB": "القارة",
    "startTime": "2026-10-08T16:00",
    "table": "T7",
    "round": "الجولة 3",
    "category": "U15"
  },
  {
    "clubA": "السلام",
    "clubB": "الشباب",
    "startTime": "2026-10-08T16:00",
    "table": "T8",
    "round": "الجولة 3",
    "category": "U15"
  },
  {
    "clubA": "الاتحاد",
    "clubB": "الرياض",
    "startTime": "2026-10-08T17:30",
    "table": "T1",
    "round": "الجولة 4",
    "category": "U13"
  },
  {
    "clubA": "الصواري",
    "clubB": "الابتسام",
    "startTime": "2026-10-08T17:30",
    "table": "T2",
    "round": "الجولة 4",
    "category": "U13"
  },
  {
    "clubA": "الطرف",
    "clubB": "مضر",
    "startTime": "2026-10-08T17:30",
    "table": "T3",
    "round": "الجولة 4",
    "category": "U13"
  },
  {
    "clubA": "القادسية",
    "clubB": "العلا",
    "startTime": "2026-10-08T17:30",
    "table": "T4",
    "round": "الجولة 4",
    "category": "U13"
  },
  {
    "clubA": "الشباب",
    "clubB": "الحزم",
    "startTime": "2026-10-08T17:30",
    "table": "T5",
    "round": "الجولة 4",
    "category": "U13"
  },
  {
    "clubA": "الفتح",
    "clubB": "السلام",
    "startTime": "2026-10-08T17:30",
    "table": "T6",
    "round": "الجولة 4",
    "category": "U13"
  },
  {
    "clubA": "الوحدة",
    "clubB": "الحمادة",
    "startTime": "2026-10-08T17:30",
    "table": "T7",
    "round": "الجولة 4",
    "category": "U13"
  },
  {
    "clubA": "القارة",
    "clubB": "الخليج",
    "startTime": "2026-10-08T17:30",
    "table": "T8",
    "round": "الجولة 4",
    "category": "U13"
  },
  {
    "clubA": "الفتح",
    "clubB": "العلا",
    "startTime": "2026-10-08T19:00",
    "table": "T1",
    "round": "الجولة 4",
    "category": "U15"
  },
  {
    "clubA": "الطرف",
    "clubB": "الهداية",
    "startTime": "2026-10-08T19:00",
    "table": "T2",
    "round": "الجولة 4",
    "category": "U15"
  },
  {
    "clubA": "حراء",
    "clubB": "الابتسام",
    "startTime": "2026-10-08T19:00",
    "table": "T3",
    "round": "الجولة 4",
    "category": "U15"
  },
  {
    "clubA": "الاتحاد",
    "clubB": "مضر",
    "startTime": "2026-10-08T19:00",
    "table": "T4",
    "round": "الجولة 4",
    "category": "U15"
  },
  {
    "clubA": "الخليج",
    "clubB": "الحزم",
    "startTime": "2026-10-08T19:00",
    "table": "T5",
    "round": "الجولة 4",
    "category": "U15"
  },
  {
    "clubA": "القادسية",
    "clubB": "القارة",
    "startTime": "2026-10-08T19:00",
    "table": "T6",
    "round": "الجولة 4",
    "category": "U15"
  },
  {
    "clubA": "الوحدة",
    "clubB": "الشباب",
    "startTime": "2026-10-08T19:00",
    "table": "T7",
    "round": "الجولة 4",
    "category": "U15"
  },
  {
    "clubA": "الحمادة",
    "clubB": "السلام",
    "startTime": "2026-10-08T19:00",
    "table": "T8",
    "round": "الجولة 4",
    "category": "U15"
  },
  {
    "clubA": "الاتحاد",
    "clubB": "الابتسام",
    "startTime": "2026-10-09T16:00",
    "table": "T1",
    "round": "الجولة 5",
    "category": "U13"
  },
  {
    "clubA": "الرياض",
    "clubB": "مضر",
    "startTime": "2026-10-09T16:00",
    "table": "T2",
    "round": "الجولة 5",
    "category": "U13"
  },
  {
    "clubA": "الصواري",
    "clubB": "الهداية",
    "startTime": "2026-10-09T16:00",
    "table": "T3",
    "round": "الجولة 5",
    "category": "U13"
  },
  {
    "clubA": "الطرف",
    "clubB": "العلا",
    "startTime": "2026-10-09T16:00",
    "table": "T4",
    "round": "الجولة 5",
    "category": "U13"
  },
  {
    "clubA": "القادسية",
    "clubB": "السلام",
    "startTime": "2026-10-09T16:00",
    "table": "T5",
    "round": "الجولة 5",
    "category": "U13"
  },
  {
    "clubA": "الشباب",
    "clubB": "الحمادة",
    "startTime": "2026-10-09T16:00",
    "table": "T6",
    "round": "الجولة 5",
    "category": "U13"
  },
  {
    "clubA": "الفتح",
    "clubB": "الخليج",
    "startTime": "2026-10-09T16:00",
    "table": "T7",
    "round": "الجولة 5",
    "category": "U13"
  },
  {
    "clubA": "الوحدة",
    "clubB": "القارة",
    "startTime": "2026-10-09T16:00",
    "table": "T8",
    "round": "الجولة 5",
    "category": "U13"
  },
  {
    "clubA": "الفتح",
    "clubB": "الهداية",
    "startTime": "2026-10-09T17:30",
    "table": "T1",
    "round": "الجولة 5",
    "category": "U15"
  },
  {
    "clubA": "العلا",
    "clubB": "الابتسام",
    "startTime": "2026-10-09T17:30",
    "table": "T2",
    "round": "الجولة 5",
    "category": "U15"
  },
  {
    "clubA": "الطرف",
    "clubB": "الرياض",
    "startTime": "2026-10-09T17:30",
    "table": "T3",
    "round": "الجولة 5",
    "category": "U15"
  },
  {
    "clubA": "حراء",
    "clubB": "مضر",
    "startTime": "2026-10-09T17:30",
    "table": "T4",
    "round": "الجولة 5",
    "category": "U15"
  },
  {
    "clubA": "الاتحاد",
    "clubB": "القارة",
    "startTime": "2026-10-09T17:30",
    "table": "T5",
    "round": "الجولة 5",
    "category": "U15"
  },
  {
    "clubA": "الخليج",
    "clubB": "الشباب",
    "startTime": "2026-10-09T17:30",
    "table": "T6",
    "round": "الجولة 5",
    "category": "U15"
  },
  {
    "clubA": "القادسية",
    "clubB": "السلام",
    "startTime": "2026-10-09T17:30",
    "table": "T7",
    "round": "الجولة 5",
    "category": "U15"
  },
  {
    "clubA": "الوحدة",
    "clubB": "الحمادة",
    "startTime": "2026-10-09T17:30",
    "table": "T8",
    "round": "الجولة 5",
    "category": "U15"
  }
];
