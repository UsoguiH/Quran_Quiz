// This file contains verses from Juz' Amma (the 30th part of the Quran)
const juzAmmaVerses = [
  "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
  "عَمَّ يَتَسَاءَلُونَ",
  "عَنِ النَّبَإِ الْعَظِيمِ",
  "الَّذِي هُمْ فِيهِ مُخْتَلِفُونَ",
  "كَلَّا سَيَعْلَمُونَ",
  "ثُمَّ كَلَّا سَيَعْلَمُونَ",
  "أَلَمْ نَجْعَلِ الْأَرْضَ مِهَادًا",
  "وَالْجِبَالَ أَوْتَادًا",
  "وَخَلَقْنَاكُمْ أَزْوَاجًا",
  "وَجَعَلْنَا نَوْمَكُمْ سُبَاتًا",
  "وَجَعَلْنَا اللَّيْلَ لِبَاسًا",
  "وَجَعَلْنَا النَّهَارَ مَعَاشًا",
  "وَبَنَيْنَا فَوْقَكُمْ سَبْعًا شِدَادًا",
  "وَجَعَلْنَا سِرَاجًا وَهَّاجًا",
  "وَأَنزَلْنَا مِنَ الْمُعْصِرَاتِ مَاءً ثَجَّاجًا",
  "لِّنُخْرِجَ بِهِ حَبًّا وَنَبَاتًا",
  "وَجَنَّاتٍ أَلْفَافًا",
  "إِنَّ يَوْمَ الْفَصْلِ كَانَ مِيقَاتًا",
  "يَوْمَ يُنفَخُ فِي الصُّورِ فَتَأْتُونَ أَفْوَاجًا",
  "وَفُتِحَتِ السَّمَاءُ فَكَانَتْ أَبْوَابًا",
  "وَسُيِّرَتِ الْجِبَالُ فَكَانَتْ سَرَابًا",
  "إِنَّ جَهَنَّمَ كَانَتْ مِرْصَادًا",
  "لِّلطَّاغِينَ مَآبًا",
  "لَّابِثِينَ فِيهَا أَحْقَابًا",
  "لَّا يَذُوقُونَ فِيهَا بَرْدًا وَلَا شَرَابًا",
  "إِلَّا حَمِيمًا وَغَسَّاقًا",
  "جَزَاءً وِفَاقًا",
  "إِنَّهُمْ كَانُوا لَا يَرْجُونَ حِسَابًا",
  "وَكَذَّبُوا بِآيَاتِنَا كِذَّابًا",
  "وَكُلَّ شَيْءٍ أَحْصَيْنَاهُ كِتَابًا",
  "فَذُوقُوا فَلَن نَّزِيدَكُمْ إِلَّا عَذَابًا",
  // ... Add more verses from Juz' Amma here
];

export const fetchRandomVerse = async (): Promise<string> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return juzAmmaVerses[Math.floor(Math.random() * juzAmmaVerses.length)];
}

const surahNames: { [key: number]: string } = {
  78: "النبأ",
  79: "النازعات",
  80: "عبس",
  81: "التكوير",
  82: "الانفطار",
  83: "المطففين",
  84: "الانشقاق",
  85: "البروج",
  86: "الطارق",
  87: "الأعلى",
  88: "الغاشية",
  89: "الفجر",
  90: "البلد",
  91: "الشمس",
  92: "الليل",
  93: "الضحى",
  94: "الشرح",
  95: "التين",
  96: "العلق",
  97: "القدر",
  98: "البينة",
  99: "الزلزلة",
  100: "العاديات",
  101: "القارعة",
  102: "التكاثر",
  103: "العصر",
  104: "الهمزة",
  105: "الفيل",
  106: "قريش",
  107: "الماعون",
  108: "الكوثر",
  109: "الكافرون",
  110: "النصر",
  111: "المسد",
  112: "الإخلاص",
  113: "الفلق",
  114: "الناس",
};

export const getVerseContext = (verse: string): { surah: string; ayah: number } => {
  // This is a simplified version. In a real application, you'd have a more comprehensive mapping.
  const index = juzAmmaVerses.indexOf(verse);
  if (index === -1) {
    return { surah: "غير معروف", ayah: 0 };
  }
  
  // This is a very basic mapping and doesn't accurately represent the actual Surah and Ayah numbers.
  // In a real application, you'd need a more detailed mapping of verses to their Surah and Ayah numbers.
  const surahNumber = 78 + Math.floor(index / 10); // This is just an approximation
  const ayahNumber = (index % 10) + 1;

  return {
    surah: surahNames[surahNumber] || "غير معروف",
    ayah: ayahNumber
  };
}