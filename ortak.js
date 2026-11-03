let lastReadingId = null;
let lastSplitTriggerEl = null;
let previousLawKey = null;
let selectedQuoteBuffer = '';
let activeQuizData = [];
let quizAnswers = {};
const NOTES_STORAGE_KEY = 'kentsel_donusum_notlar_v1';

// 1. TÜRKÇE KARAKTER DUYARLI NORMALİZASYON
function trNorm(str) {
  if (!str) return '';
  return str.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase()
    .replace(/i̇/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').trim();
}

// 2. OTOMATİK LATEX ($ ve \text) TEMİZLEYİCİ
function cleanLatexString(str) {
  if (!str) return '';
  return str
    .replace(/\$H_N\s*\\le\s*25\\text\{\s*m\}\$/g, 'Hn ≤ 25 m')
    .replace(/\$Ek-7\/B\^\{\\prime\}\$/g, 'Ek-7/B')
    .replace(/\$\\frac\{2\/7\}\{1964\}\$/g, '2/7/1964')
    .replace(/\$\\frac\{1\}\{7\}\/1964\$/g, '1/7/1964')
    .replace(/\$4\^\{\\prime\}\\dot\{u\}\$/g, "4'ü")
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\le/g, '≤')
    .replace(/\\ge/g, '≥')
    .replace(/\\pm/g, '±')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\$([^$]+)\$/g, '$1');
}

function cleanPageMathArtifacts(rootEl) {
  const target = rootEl || document.body;
  if (!target) return;
  const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, null, false);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    if (node.nodeValue && (node.nodeValue.includes('$') || node.nodeValue.includes('\\'))) {
      node.nodeValue = cleanLatexString(node.nodeValue);
    }
  });
}

// 3. 6306 UYGULAMA YÖNETMELİĞİ RESMİ EKLERİ (EK-1 .. EK-13) TAM ŞABLON VERİTABANI
const YON_EK_DB = {
  'Ek-1': {
    title: 'EK-1: 6306 Sayılı Kanun Kapsamında Riskli Yapı Tespiti Lisans Belgesi',
    ref: '6306 Uygulama Yönetmeliği • Madde 6/4 (B-4 Formatlı Resmi Lisans Belgesi)',
    formText: `T.C.
ÇEVRE, ŞEHİRCİLİK VE İKLİM DEĞİŞİKLİĞİ BAKANLIĞI
Kentsel Dönüşüm Başkanlığı

RİSKLİ YAPI TESPİTİ LİSANS BELGESİ (EK-1)

Belge No          : [LİSANS BELGE NO]
Veriliş Tarihi    : [GÜN / AY / YIL]
Kuruluş Unvanı    : [LİSANSLI KURUM VEYA KURULUŞUN TAM UNVANI]
Vergi Dairesi/No  : [VERGİ DAİRESİ VE NUMARASI]
UETS Adresi       : [ULUSAL ELEKTRONİK TEBLİGAT ADRESİ]

Yukarıda unvanı yazılı kurum/kuruluş, 6306 sayılı Afet Riski Altındaki Alanların Dönüştürülmesi Hakkında Kanun ve Uygulama Yönetmeliğinin 6 ncı maddesi uyarınca herhangi bir alan ile sınırlı olmaksızın Ülke genelinde RİSKLİ YAPI TESPİTİ yapmaya yetkilendirilmiştir.

KENTSEL DÖNÜŞÜM BAŞKANI`
  },
  'Ek-2': {
    title: 'EK-2: Riskli Yapıların Tespit Edilmesine İlişkin Esaslar (Teknik Kurallar Özeti)',
    ref: '6306 Uygulama Yönetmeliği • Madde 7/1 ve Madde 10/7',
    formText: `6306 SAYILI KANUN UYGULAMA YÖNETMELİĞİ EK-2 ESASLARI ÖZETİ

1. KAPSAM SINIRI (Hn ≤ 25 m veya 8 Kat):
Ek-2 Esasları, yalnızca yüksekliği Hn ≤ 25 m veya zemin döşemesi üstü 8 katı geçmeyen betonarme ve yığma binaların riskli yapı tespiti için kullanılır. Daha yüksek binalar ile çelik ve prefabrike binalarda Deprem Yönetmeliği (TBDY) kullanılır.

2. RÖLEVE VE SAHA İNCELEMESİ:
- Mevcut mimari ve statik projeler belediyeden temin edilir; yoksa taşıyıcı sistem rölevesi çıkarılır.
- Kritik katta kolon ve perde boyutları, donatı adetleri (röntgen ve sıyırma ile) ve karot numuneleri (basınç dayanımı) tespit edilir.

3. DEĞERLENDİRME VE KARAR:
- Bina deprem performans değerlendirmesi veya güçlendirme projesi için Ek-2 kullanılamaz.
- Elektronik yazılım sistemi (ARAAD) üzerinden 3 boyutlu modelleme yapılarak binanın "Riskli Yapı" olup olmadığı karara bağlanır.`
  },
  'Ek-3': {
    title: 'EK-3: Riskli Yapı Tespiti Lisans Başvurusu Taahhütnamesi',
    ref: '6306 Uygulama Yönetmeliği • Madde 6/4-e',
    formText: `TAAHHÜTNAME (EK-3)
KENTSEL DÖNÜŞÜM BAŞKANLIĞINA

6306 sayılı Afet Riski Altındaki Alanların Dönüştürülmesi Hakkında Kanun ve Uygulama Yönetmeliği kapsamında yürüteceğimiz riskli yapı tespiti faaliyetlerinde;
1- Ek-2'de yer alan Riskli Yapıların Tespit Edilmesine İlişkin Esaslara, mesleki ve teknik kurallara tam olarak uyacağımızı,
2- Mevcut olmayan, inşaat halinde olup ikamet edilmeyen veya statik bütünlüğü bozulmuş metruk yapılar hakkında rapor düzenlemeyeceğimizi,
3- Görev alacak mühendislerimizin başka bir lisanslı kuruluşta görev almadığını ve ortak olmadığını,
4- Gerçeğe aykırı bilgi ve belge sunulması halinde 6306 sayılı Kanun m.3/8 idari yaptırımlarını ve 5237 sayılı TCK hükümlerini kabul ettiğimizi beyan ve taahhüt ederiz. [TARİH]

Yetkili İmza / Kaşe`
  },
  'Ek-4': {
    title: 'EK-4: Riskli Alan Teklifi Yapı Değerlendirme Formu (%65 Aykırılık Tespiti)',
    ref: '6306 Uygulama Yönetmeliği • Madde 5/2-b',
    formText: `RİSKLİ ALAN TEKLİFİ YAPI DEĞERLENDİRME FORMU (EK-4)
(Üzerindeki toplam yapı sayısının en az %65'i imar mevzuatına aykırı olan alanlar için)

İl / İlçe / Mahalle : [İL / İLÇE / MAHALLE]
Teklif Alan Büyüklüğü: [ ... m² / Hektar ]
Alandaki Toplam Yapı Sayısı: [ ... Adet ]

Sıra | Ada/Parsel | UAVT Bina Kodu | Yapı Ruhsatı (Var/Yok) | İskân (Var/Yok) | İmar Mevzuatına Uygunluk Durumu
1    | [ ... ]    | [ ... ]        | [Yok / Sonradan]       | [Yok]           | [İmar Mevzuatına Aykırı]
2    | [ ... ]    | [ ... ]        | [Yok / Sonradan]       | [Yok]           | [İmar Mevzuatına Aykırı]

İmar Mevzuatına Aykırı Yapı Oranı: % [En Az %65 Olmalıdır]`
  },
  'Ek-5': {
    title: 'EK-5: Uygulama Alanında Anlaşma İle Satın Alma / Trampa Tutanağı',
    ref: '6306 Uygulama Yönetmeliği • Madde 13/7 (Ferağ Beyanı Hükmündedir)',
    formText: `6306 SAYILI KANUN KAPSAMINDA ANLAŞMA İLE SATIN ALMA / TRAMPA TUTANAĞI (EK-5)

Taşınmazın İli / İlçesi / Mahallesi : [İL / İLÇE / MAHALLE]
Ada / Parsel / Bağımsız Bölüm No    : [ADA / PARSEL / BB NO]
Malikin Adı Soyadı ve T.C. Kimlik No: [AD SOYAD - T.C. NO]
Malikin Arsa Payı / Hissesi         : [ ... / ... ]
Tespit Edilen Satın Alma / Rayiç Bedeli: [ .................... TL ]

Yukarıda bilgileri yazılı taşınmazın 6306 sayılı Kanunun 6 ncı maddesinin beşinci fıkrasının (b) bendi ve Uygulama Yönetmeliğinin 13 üncü maddesinin yedinci fıkrası uyarınca yukarıda belirtilen bedel üzerinden Kentsel Dönüşüm Başkanlığınca satın alınmasını / trampasını; işbu tutanağın tapuda ferağ beyanı ve Başkanlık adına yapılacak resen tescilin hukuki sebebi sayılacağını, mevcut takyidatların satış bedeli üzerinde devam edeceğini kabul ve beyan ederim. [TARİH]

MALİK / YETKİLİ TEMSİLCİSİ                         BAŞKANLIK YETKİLİ PERSONELİ
(Ad Soyad - İmza)                                  (Ad Soyad - Unvan - İmza)`
  },
  'Ek-6': {
    title: 'EK-6: Riskli Yapı Tespiti Bina Askı ve Muhtarlık İlan Tutanağı (15 Gün İtiraz)',
    ref: '6306 Uygulama Yönetmeliği • Madde 7/4 (Eski Ek-5 Askı Tutanağı)',
    formText: `T.C.
[İL VALİLİĞİ / KENTSEL DÖNÜŞÜM MÜDÜRLÜĞÜ / BELEDİYE BAŞKANLIĞI]
RİSKLİ YAPI TESPİTİ BİNA ASKI VE MUHTARLIK İLAN TUTANAĞI (EK-6)

YAPI KİMLİK NUMARASI (YKN) : [YKN NUMARASI]
İLİ / İLÇESİ / MAHALLESİ   : [İL / İLÇE / MAHALLE]
ADA / PARSEL NO            : [ADA] Ada, [PARSEL] Parsel
AÇIK ADRESİ (UAVT)         : [CADDE / SOKAK / DIŞ KAPI NO]
BİNA ASKI / İLAN TARİHİ    : [GÜN / AY / YIL] — İLAN BİTİŞ (TEBLİĞ) TARİHİ: [GÜN / AY / YIL]

BİLDİRİM VE İTİRAZ UYARISI:
Yukarıda kimlik bilgileri yazılı yapı, 6306 sayılı Afet Riski Altındaki Alanların Dönüştürülmesi Hakkında Kanun kapsamında "RİSKLİ YAPI" olarak tespit edilmiştir.
1- İşbu tutanak, ayni ve şahsi hak sahiplerine tebliğ yerine kaim olmak üzere riskli yapıya asılmış, maliklere e-Devlet Kapısı üzerinden bildirilmiş ve ilgili muhtarlıkta ON BEŞ (15) GÜN süre ile ilan edilmiştir.
2- Riskli yapı tespit işlemi, muhtarlıkta yapılan 15 günlük ilanın SON GÜNÜ tüm ayni ve şahsi hak sahiplerine tebliğ edilmiş sayılır.
3- Yapı malikleri veya kanuni temsilcilerince, muhtarlık ilanının son gününden itibaren ON BEŞ (15) GÜN içinde yapının bulunduğu yerdeki Kentsel Dönüşüm Müdürlüğüne / yetki devri yapılmış İdareye verilecek bir dilekçe ile riskli yapı tespitine itiraz edilebilir.

DÜZENLEYEN GÖREVLİLER / MUHTARLIK ONAYI (İmza - Mühür)`
  },
  'Ek-7': {
    title: 'EK-7/A: Riskli Yapı Tahliye ve Yıktırma Askı ve İlan Tutanağı (En Çok 90 Gün Süre)',
    ref: '6306 Uygulama Yönetmeliği • Madde 8/2 ve 8/3',
    formText: `T.C.
[BELEDİYE BAŞKANLIĞI / KENTSEL DÖNÜŞÜM MÜDÜRLÜĞÜ]
RİSKLİ YAPI TAHLİYE VE YIKTIRMA BİNA ASKI VE İLAN TUTANAĞI (EK-7/A)

YAPI KİMLİK NUMARASI (YKN) : [YKN NUMARASI]
İLİ / İLÇESİ / MAHALLESİ   : [İL / İLÇE / MAHALLE]
ADA / PARSEL NO            : [ADA] Ada, [PARSEL] Parsel
AÇIK ADRESİ                : [AÇIK ADRES]
MUHTARLIK İLAN SÜRESİ      : [BAŞLANGIÇ TARİHİ] – [BİTİŞ / TEBLİĞ TARİHİ] (15 Gün)
VERİLEN TAHLİYE VE YIKIM SÜRESİ: Tebliğ tarihinden itibaren [EN ÇOK 90] GÜNDÜR.

İHTAR VE BİLDİRİM:
1- Yukarıda bilgileri yazılı binanın "Riskli Yapı" tespiti kesinleşmiştir.
2- İşbu tutanak; yapıya asılmış, maliklere e-Devlet Kapısı üzerinden bildirilmiş ve ilgili muhtarlıkta 15 gün süre ile ilan edilmiştir. Muhtarlık ilanının son günü tüm ayni ve şahsi hak sahiplerine tebliğ edilmiş sayılır.
3- Tebliğ tarihinden itibaren verilen [90] günlük süre içerisinde yapının tahliye edilerek maliklerce yıktırılması (veya aynı süre içinde KMK m.19/2 uyarınca güçlendirme kararı ve ruhsatının alınması) gerekmektedir.
4- Verilen süre içinde yapı tahliye edilmediği ve yıktırılmadığı takdirde; mülki amir izni ve kolluk kuvveti desteği ile idari makamlarca resen tahliye edileceği ve yıktırılacağı (yıkım masraflarının 6183 sayılı Kanun uyarınca maliklerden hisseleri oranında tahsil edileceği) ihtaren tebliğ olunur.

İDARE YETKİLİSİ / MUHTARLIK ASKI ONAYI`
  },
  'Ek-7/A': {
    title: 'EK-7/A: Riskli Yapı Tahliye ve Yıktırma Askı ve İlan Tutanağı (En Çok 90 Gün Süre)',
    ref: '6306 Uygulama Yönetmeliği • Madde 8/2 ve 8/3 (Parsel Bazında Riskli Yapılar İçin)',
    formText: `T.C.
[BELEDİYE BAŞKANLIĞI / KENTSEL DÖNÜŞÜM MÜDÜRLÜĞÜ]
RİSKLİ YAPI TAHLİYE VE YIKTIRMA BİNA ASKI VE İLAN TUTANAĞI (EK-7/A)

YAPI KİMLİK NUMARASI (YKN) : [YKN NUMARASI]
İLİ / İLÇESİ / MAHALLESİ   : [İL / İLÇE / MAHALLE]
ADA / PARSEL NO            : [ADA] Ada, [PARSEL] Parsel
AÇIK ADRESİ                : [AÇIK ADRES]
MUHTARLIK İLAN SÜRESİ      : [BAŞLANGIÇ TARİHİ] – [BİTİŞ / TEBLİĞ TARİHİ] (15 Gün)
VERİLEN TAHLİYE VE YIKIM SÜRESİ: Tebliğ tarihinden itibaren [EN ÇOK 90] GÜNDÜR.

İHTAR VE BİLDİRİM:
1- Yukarıda bilgileri yazılı binanın "Riskli Yapı" tespiti kesinleşmiştir.
2- İşbu tutanak; yapıya asılmış, maliklere e-Devlet Kapısı üzerinden bildirilmiş ve ilgili muhtarlıkta 15 gün süre ile ilan edilmiştir. Muhtarlık ilanının son günü tüm ayni ve şahsi hak sahiplerine tebliğ edilmiş sayılır.
3- Tebliğ tarihinden itibaren verilen [90] günlük süre içerisinde yapının tahliye edilerek maliklerce yıktırılması (veya aynı süre içinde KMK m.19/2 uyarınca güçlendirme kararı ve ruhsatının alınması) gerekmektedir.
4- Verilen süre içinde yapı tahliye edilmediği ve yıktırılmadığı takdirde; mülki amir izni ve kolluk kuvveti desteği ile idari makamlarca resen tahliye edileceği ve yıktırılacağı (yıkım masraflarının 6183 sayılı Kanun uyarınca maliklerden hisseleri oranında tahsil edileceği) ihtaren tebliğ olunur.

İDARE YETKİLİSİ / MUHTARLIK ASKI ONAYI`
  },
  'Ek-7/B': {
    title: 'EK-7/B: Riskli Alan ve Rezerv Yapı Alanlarında Tahliye ve Yıktırma Askı Tutanağı',
    ref: '6306 Uygulama Yönetmeliği • Madde 8/2 ve Madde 17/1 (Alan Uygulamaları İçin)',
    formText: `T.C.
[KENTSEL DÖNÜŞÜM MÜDÜRLÜĞÜ / BELEDİYE BAŞKANLIĞI / TOKİ]
RİSKLİ ALAN VE REZERV YAPI ALANLARINDA TAHLİYE VE YIKTIRMA TUTANAĞI (EK-7/B)

UYGULAMA ALANI / ETAP ADI  : [RİSKLİ ALAN / REZERV YAPI ALANI ADI]
ADA / PARSEL / ADRES       : [ADA / PARSEL / AÇIK ADRES]
MUHTARLIK İLAN SÜRESİ      : [BAŞLANGIÇ TARİHİ] – [BİTİŞ / TEBLİĞ TARİHİ] (15 Gün)
VERİLEN SON TAHLİYE SÜRESİ : Tebliğ tarihinden itibaren [EN AZ 30] GÜNDÜR.

İHTAR:
6306 sayılı Kanun kapsamında yürütülen alan uygulaması çerçevesinde verilen ilk sürede tahliyesi gerçekleştirilmeyen yukarıdaki yapının; işbu tutanağın muhtarlıkta 15 günlük ilanının son gününden itibaren [30] gün içinde su, elektrik, telefon ve doğalgaz borçları ile vergileri ödenerek boş olarak teslim edilmesi; aksi takdirde hizmetlerin durdurularak mülki amir ve kolluk kuvveti desteğiyle idari makamlarca zorla tahliye ve yıkım işleminin gerçekleştirileceği ihtaren bildirilir.`
  },
  'Ek-8': {
    title: 'EK-8: Riskli Yapılarda Salt Çoğunlukla Alınan Karar ve Anlaşma Teklifinin Katılmayan Maliklere Bildirim Formu',
    ref: '6306 Uygulama Yönetmeliği • Madde 15/2 (15 Günlük Teklif İnceleme ve Kabul Bildirimi)',
    formText: `6306 SAYILI KANUN KAPSAMINDA RİSKLİ YAPILARDA ALINAN KARARIN VE ANLAŞMA ŞARTLARINI İHTİVA EDEN TEKLİFİN KARARA KATILMAYAN MALİKLERE BİLDİRİLMESİNE İLİŞKİN FORM (EK-8)

TAŞINMAZIN İLİ / İLÇESİ / MAHALLESİ : [ANTALYA] İli, [İLÇE] İlçesi, [MAHALLE] Mahallesi
ADA / PARSEL NO ve YAPI KİMLİK NO   : [ADA] Ada, [PARSEL] Parsel — YKN: [YKN]
AÇIK ADRESİ                         : [AÇIK ADRES]
SALT ÇOĞUNLUK KARAR TARİHİ VE ORANI : [GÜN/AY/YIL] — Kabul Oranı: % [ > 50,00 ]
TEKLİFİN VE SÖZLEŞMENİN İNCELENECEĞİ YER/ADRES: [MUHTARLIK VEYA İL SINIRLARI İÇİNDEKİ AÇIK ADRES]
MUHTARLIK İLAN TARİHLERİ (15 GÜN)   : Askı Tarihi: [../../20..] — İndirme (Tebliğ) Tarihi: [../../20..]

KARARA KATILMAYAN MALİKLERE YASAL İHTAR VE BİLDİRİM:
1- Yukarıda bilgileri yazılı taşınmazda 6306 sayılı Kanunun 6 ncı maddesinin birinci fıkrası ve Uygulama Yönetmeliğinin 15 inci maddesinin ikinci fıkrası uyarınca hisseleri oranında paydaşların salt çoğunluğu (>%50) ile yeniden bina yaptırılması / kat karşılığı inşaat sözleşmesi / tevhit kararı alınmıştır.
2- Alınan karar tutanağı ve anlaşma şartlarını içeren teklif/sözleşme örnekleri ilgili muhtarlığa teslim edilmiş / yukarıda yazılı adreste incelemenize hazır hale getirilmiştir.
3- İşbu bildirimin elektronik tebligat adresinize ulaştığı tarihi izleyen 5 inci günün sonunda / noter tebliğ tarihinde / muhtarlıkta yapılan 15 günlük ilanın son günü itibarıyla yapılmış sayıldığı tarihten itibaren ON BEŞ (15) GÜN içinde teklifin incelenmemesi veya salt çoğunlukla alınan kararın ve yapılan teklifin kabul edilmemesi halinde;
"Arsa paylarınızın, Başkanlıkça/İdarece tespit edilecek veya ettirilecek rayiç değerden az olmamak üzere anlaşma sağlayan diğer paydaşlara açık artırma usulü ile satılacağı, paydaşlara satış gerçekleştirilemediği takdirde, yapılan anlaşmaya uyularak işlem yapılmasını kabul etmek şartıyla üçüncü şahıslara satılacağı" hususu 6306 sayılı Kanun Uygulama Yönetmeliği m.15/2 uyarınca ihtaren bildirilir.

BİLDİRİMDE BULUNAN SALT ÇOĞUNLUK MALİKLERİ / TEMSİLCİSİ     MUHTARLIK ASKI ONAYI`
  },
  'Ek-9': {
    title: 'EK-9: Riskli Yapılarda Arsa Paylarının Açık Artırma Usulü İle Satış Yeri ve Zamanı Bildirim Tutanağı',
    ref: '6306 Uygulama Yönetmeliği • Madde 15/A-4 (Paydaşlara Yapılacak İlk Satış İlanı)',
    formText: `T.C.
[İL] KENTSEL DÖNÜŞÜM MÜDÜRLÜĞÜ / [BELEDİYE BAŞKANLIĞI]
RİSKLİ YAPILARDA ARSA PAYLARININ AÇIK ARTIRMA USULÜ İLE SATIŞ YERİ VE ZAMANININ BİLDİRİLMESİNE İLİŞKİN TUTANAK (EK-9)

TAŞINMAZIN İLİ / İLÇESİ / MAHALLESİ : [ANTALYA] İli, [İLÇE] İlçesi, [MAHALLE] Mahallesi
ADA / PARSEL NO ve YAPI KİMLİK NO   : [ADA] Ada, [PARSEL] Parsel — YKN: [YKN]
SATIŞA KONU PAYDAŞ(LAR) VE HİSSESİ  : [AD SOYAD - ARSA PAYI ORANI]
TESPİT EDİLEN RAYİÇ DEĞER (TL)      : [ ........................ TL ]
SATIŞIN YAPILACAĞI TARİH VE SAAT    : [GÜN / AY / YIL] — Saat: [SAAT]
SATIŞIN YAPILACAĞI YER / SALON      : [MÜDÜRLÜK / İDARE SATIŞ SALONU AÇIK ADRESİ]

BİLDİRİM:
Yukarıda bilgileri yazılı taşınmazda hisseleri oranında paydaşların salt çoğunluğu ile alınan karara katılmayan maliklerin arsa payları, 6306 sayılı Kanunun 6 ncı maddesinin birinci fıkrası ve Uygulama Yönetmeliğinin 15/A maddesi uyarınca, tespit edilen rayiç değerden az olmamak üzere anlaşma sağlayan diğer paydaşlara açık artırma usulü ile satılacaktır.
İlk satışa yalnızca salt çoğunlukla anlaşan paydaşlar katılabilir; arsa payı satılacak malikler satışa izleyici olarak katılabilir (katılmamaları satışın geçerliliğine etki etmez). İşbu tutanak e-Devlet üzerinden bildirilmiş ve ilgili muhtarlıkta 15 gün süre ile ilan edilmiştir.

SATIŞ KOMİSYONU BAŞKANLIĞI / MUHTARLIK İLAN ONAYI`
  },
  'Ek-10': {
    title: 'EK-10: Riskli Alanlar ve Rezerv Yapı Alanlarında Karar ve Teklifin Katılmayanlara Bildirim Formu',
    ref: '6306 Uygulama Yönetmeliği • Madde 15/2',
    formText: `6306 SAYILI KANUN KAPSAMINDA RİSKLİ ALANLAR VE REZERV YAPI ALANLARINDA ALINAN KARARIN VE TEKLİFİN KATILMAYAN MALİKLERE BİLDİRİM FORMU (EK-10)

UYGULAMA ALANI / ETAP / ADA / PARSEL: [ALAN ADI - ADA/PARSEL]
SALT ÇOĞUNLUK KARAR TARİHİ VE ORANI : [TARİH] — % [ > 50,00 ]
TEKLİFİN İNCELENECEĞİ YER           : [MUHTARLIK / İLGİLİ KURUM ADRESİ]

İHTAR: Bildirimin yapıldığı/sayıldığı tarihten itibaren 15 gün içinde teklifin incelenmemesi veya kabul edilmemesi halinde arsa paylarınızın; rayiç değerden az olmamak üzere anlaşma sağlayan diğer paydaşlara açık artırma usulü ile satılacağı, paydaşlara satış gerçekleştirilemediği takdirde rayiç bedeli dönüşüm projesini gerçekleştirecek olan Başkanlık, İdare veya TOKİ tarafından ödenmek suretiyle satın alınacağı ihtaren bildirilir.`
  },
  'Ek-11': {
    title: 'EK-11: Riskli Alanlar ve Rezerv Yapı Alanlarında Açık Artırma Satış Yeri ve Zamanı Bildirim Tutanağı',
    ref: '6306 Uygulama Yönetmeliği • Madde 15/A-4',
    formText: `RİSKLİ ALANLAR VE REZERV YAPI ALANLARINDA ARSA PAYLARININ AÇIK ARTIRMA İLE SATIŞ YERİ VE ZAMANI BİLDİRİM TUTANAĞI (EK-11)

UYGULAMA ALANI / ADA / PARSEL : [ALAN ADI - ADA/PARSEL]
SATIŞA KONU HİSSE VE RAYİÇ BEDEL: [AD SOYAD - HİSSE - RAYİÇ BEDEL TL]
SATIŞ TARİHİ, SAATİ VE YERİ   : [GÜN/AY/YIL - SAAT - SALON ADRESİ]

Hisseleri oranında salt çoğunlukla alınan karara katılmayan maliklerin payları Yönetmelik m.15/A uyarınca yukarıda belirtilen yer ve saatte açık artırma usulü ile satışa çıkarılacaktır.`
  },
  'Ek-12': {
    title: 'EK-12: 6306 Sayılı Kanun Kapsamında Malikler Toplantı Çağrısı İlan / Bildirim Formu (15 Gün İlan)',
    ref: '6306 Uygulama Yönetmeliği • Madde 15/2 (04.02.2026 RG-33158 Değişikliği)',
    formText: `6306 SAYILI KANUN KAPSAMINDA RİSKLİ YAPILARIN BULUNDUĞU PARSELLERDE YAPILACAK YENİ UYGULAMALAR HAKKINDA KARAR ALINMAK ÜZERE MALİKLERİN TOPLANTIYA ÇAĞRILMASINA İLİŞKİN FORM (EK-12)

TAŞINMAZIN İLİ / İLÇESİ / MAHALLESİ : [ANTALYA] İli, [İLÇE] İlçesi, [MAHALLE] Mahallesi
ADA / PARSEL NUMARASI               : [ADA] Ada, [PARSEL] Parsel
YAPI KİMLİK NUMARASI (YKN)          : [YKN NUMARASI]
TAŞINMAZIN AÇIK ADRESİ              : [MAHALLE / CADDE / SOKAK / BİNA NO]

TOPLANTI YERİ VE ZAMANI BİLGİLERİ:
• TOPLANTI TARİHİ : [GÜN / AY / YIL]
• TOPLANTI SAATİ  : [SAAT]
• TOPLANTI YERİ   : [TOPLANTININ YAPILACAĞI AÇIK ADRES]

TOPLANTI GÜNDEMİ:
6306 sayılı Afet Riski Altındaki Alanların Dönüştürülmesi Hakkında Kanunun 6 ncı maddesinin birinci fıkrası ve Uygulama Yönetmeliğinin 15 inci maddesinin ikinci fıkrası uyarınca;
1- Parsellerin tevhit edilmesi, münferit veya birleştirilerek veya imar adası bazında uygulama yapılması, ifraz, taksim, terk, ihdas ve tapuya tescil işlemleri,
2- Yeniden bina yaptırılması, payların satışı, kat karşılığı veya hasılat paylaşımı ve diğer usuller ile yeniden değerlendirilmesi,
3- Yüklenici (müteahhit) seçimi, avan proje, bağımsız bölüm paylaşım cetveli, teknik şartname ve sözleşme koşullarının görüşülerek hisseleri oranında paydaşların en az SALT ÇOĞUNLUĞU (>%50) ile karara bağlanması.

İLAN VE TEBLİĞ KAYDI (Yönetmelik m.15/2):
İşbu toplantı çağrı formu; ilgili muhtarlıkta / riskli yapının henüz yıktırılmadığı durumda bina kapısında (duyuru panosunda) ON BEŞ (15) GÜN süre ile ilan edilmiş olup, ilanın son günü ([../../20..]) tüm paydaşlara usulüne uygun olarak tebliğ edilmiş sayılır.

ASKIYA ÇIKARMA TARİHİ : [GÜN / AY / YIL]
ASKIDAN İNDİRME TARİHİ: [GÜN / AY / YIL] (15. Günün Sonu)

ÇAĞRIYI YAPAN MALİK(LER)                          MUHTARLIK / BİNA PANOSU İLAN TUTANAĞI ONAYI
Ad Soyad : [AD SOYAD]                             (Muhtar veya İlgililer İmza / Mühür)
İmza     :`
  },
  'Ek-13': {
    title: 'EK-13: İlk Satışta Paydaşlara Satılamayan Hisselerin Üçüncü Şahıslara Yeniden Satış İlan Formu',
    ref: '6306 Uygulama Yönetmeliği • Madde 15/A-12 (04.02.2026 RG-33158 Değişikliği - %10 Nakit Teminatlı)',
    formText: `T.C.
ÇEVRE, ŞEHİRCİLİK VE İKLİM DEĞİŞİKLİĞİ BAKANLIĞI
Kentsel Dönüşüm Başkanlığı ([ANTALYA] Kentsel Dönüşüm Müdürlüğü)

6306 SAYILI KANUN KAPSAMINDA İLK SATIŞTA PAYDAŞLARA SATILAMAYAN HİSSELERİN YENİDEN SATIŞINA YÖNELİK İŞLEMİN YERİ VE ZAMANININ İLAN EDİLMESİNE İLİŞKİN FORM (EK-13)

TAŞINMAZIN İLİ / İLÇESİ / MAHALLESİ : [ANTALYA] İli, [MURATPAŞA] İlçesi, [SİNAN] Mahallesi
ADA / PARSEL NO ve YAPI KİMLİK NO   : [539] Ada, [90] Parsel — YKN: [268560]
TAŞINMAZIN AÇIK ADRESİ              : [AÇIK ADRES]
SATIŞA KONU ARSA PAYI VE RAYİÇ DEĞER: [HİSSE ORANI] — Rayiç Değer: [ .................. TL ]
%10 NAKİT TEMİNAT TUTARI (3. Şahıs) : [ .................. TL ]
SATIŞIN YAPILACAĞI TARİH, SAAT VE YER: [GÜN/AY/YIL] — Saat: [SAAT] — Yer: [MÜDÜRLÜK SATIŞ SALONU]

İLAN METNİ (Yönetmelik m.15/A-12 ve 13):
Yukarıda bilgileri yazılı "Riskli Yapı"da 6306 sayılı Kanun kapsamında yapılacak yeni uygulamalar için hisseleri oranında paydaşların salt çoğunluğu ile anlaşma sağlanmıştır.
Karara katılmayan maliklerin arsa paylarının yapılan ilk satışta anlaşma sağlayan paydaşlarca satın alınmaması sebebiyle; Müdürlük/İdare tarafından tespit edilen rayiç değerden az olmamak üzere, anlaşma sağlayan diğer paydaşlara ve yapılan anlaşmaya uyularak işlem yapılmasını kabul etmek şartıyla ÜÇÜNCÜ ŞAHISLARA açık artırma usulü ile satışı yapılacaktır.
Satışa katılacak üçüncü şahısların; satıştan önce salt çoğunluk ile alınan kararı kabul edeceklerini ve sözleşmeyi imzalayacaklarını yazılı olarak beyan etmeleri ve satışı yapılacak arsa payının rayiç değerinin %10'u oranında nakit teminatı ilgili muhasebe birimine yatırmaları şarttır. İşbu form 15 gün süreyle ilan edilmiş ve tüm maliklere e-Devlet üzerinden bildirilmiştir.

KENTSEL DÖNÜŞÜM MÜDÜRLÜĞÜ / İDARE ONAYI`
  }
};

// 4. 4 CİLDİN ORTAK ARAMA VERİTABANI (GLOBAL_INDEX)
const GLOBAL_INDEX = [
  { cilt: 'Cilt 1', title: 'Belediye E-İmar Yazı, Sembol ve Daire İçi Değerler (5 / A-4 / 3)', url: 'cilt1.html#bolum-1', keys: 'e-imar parsel sorgu ada mahalle yüzölçümü lejant pafta daire içi değerler taks kaks' },
  { cilt: 'Cilt 1', title: 'EK-1d Uygulama İmar Planı Gösterimleri ve RGB Renk Kodları', url: 'cilt1.html#bolum-2', keys: 'ek-1d sembol tarama çizgi rgb tick bha ksa' },
  { cilt: 'Cilt 1', title: 'Toplam İnşaat Alanı, 1,70 Çıkma Katsayısı ve +2,50 m Subasman Hesabı', url: 'cilt1.html#bolum-3', keys: '1.70 çıkma katsayısı subasman bodrum kat 1700 m2 fizibilite hesaplayıcı muratpaşa' },
  { cilt: 'Cilt 1', title: 'Muratpaşa 1291 Ada 8 Parsel (435 m²) & Kepez Güneş Mah. 27594 Ada 1 Parsel (16.250 m² İBT & 157 m Mânia)', url: 'cilt1.html#bolum-4', keys: '1291 ada 8 parsel 27594 ada 1 parsel kepez güneş mahallesi 16250 m2 ibt isteğe bağlı ticaret 157 m mania sınırı 1200 m2 ifraz ek-1f malik isimleri krokisi' },
  { cilt: 'Cilt 2', title: '6306 Temel Tanımlar, 16 Ana Konu, 10 Aşamada Parsel Dönüşümü ve 7269 Hasar Farkı', url: 'cilt2.html#bolum-1', keys: 'riskli yapı riskli alan rezerv yapı alanı 7269 az orta ağır hasar 16 ana konu 10 aşama' },
  { cilt: 'Cilt 2', title: 'Riskli Yapı Süreci: ARAAD Başvuru, Muhtarlık İlanı (15 Gün), İtiraz ve Yıkım (m.8 ve m.17)', url: 'cilt2.html#bolum-2', keys: 'araad başvuru 10 iş günü tapu şerhi e-devlet muhtarlık askı 15 gün itiraz 90 gün tahliye yıkım 6 iş günü yıkım ruhsatı' },
  { cilt: 'Cilt 2', title: '6306 Uygulama Yönetmeliği Hükümleri: Riskli Yapılarda Dönüşüm ve Parsel Tevhidi Rehberi (4 Şubat 2026)', url: 'cilt2.html#bolum-3', keys: '6306 uygulama yönetmeliği sunumu riskli yapılarda dönüşüm ve parsel tevhidi 4 şubat 2026 madde 6 7 8 9 10 12 13 15 15/a 15/b 16 17 18 19' },
  { cilt: 'Cilt 2', title: 'İki Riskli Yapı Parselinin Tevhidi (%60-%55, %80-%45, %50-%70 Tablosu - Madde 15/8) & İmar Hakkı Aktarımı (m.15/10)', url: 'cilt2.html#bolum-3-tevhit', keys: 'iki riskli parselin tevhidi madde 15/8 her parselde ayrı ayrı salt çoğunluk boş parsel oybirliği imar hakkı aktarımı 15/10' },
  { cilt: 'Cilt 2', title: '2023-2026 Mevzuat Değişiklikleri (%6 Teminat, %10 Kademeli Satış) ve KMK m.19/2 Güçlendirme', url: 'cilt2.html#bolum-4', keys: '4 şubat 2026 yönetmelik %6 teminat %10 kademeli satış güçlendirme 4/5 kmk 19/2 danışmanlık kuruluşları' },
  { cilt: 'Cilt 2', title: 'Harç/Vergi Muafiyetleri (1,5 Kat Sınırı), 5 Yıllık İade Davaları, KDV (%1) ve Kira Yardımı', url: 'cilt2.html#bolum-5', keys: 'tapu harcı noter harcı belediye 1.5 kat muafiyet 5 yıl iade vergi mahkemesi kdv %1 18 ay 48 ay kira yardımı' },
  { cilt: 'Cilt 2', title: 'Sözleşmelerin Bakanlık Eliyle Feshi (m.13/11), 8 Temel Dava Türü ve İmar Kanunu Değişiklikleri', url: 'cilt2.html#bolum-6', keys: 'idari fesih 1 yıl 6 ay 30 gün ihtar arsa payı düzeltme davası nama ifaya izin tescile zorlama ferağa icbar tapu iptal' },
  { cilt: 'Cilt 2', title: 'Bir Parselde Çoklu Ruhsatsız ve Riskli Yapılar (m.15/6-7) & 91 Hissedarlı Parsel Modeli', url: 'cilt2.html#bolum-7', keys: 'çoklu ruhsatsız kaçak yapı gecekondu karar ağacı m.15/6 m.15/7 resen ifraz 91 hissedar 539 ada 90 parsel sinan mahallesi' },
  { cilt: 'Yönetmelik Eki', title: '📋 Ek-6: Riskli Yapı Tespiti Bina Askı ve Muhtarlık İlan Tutanağı (15 Gün İtiraz)', url: 'javascript:openYonEk("Ek-6")', keys: 'ek-6 ek 6 riskli yapı askı tutanağı muhtarlık ilanı' },
  { cilt: 'Yönetmelik Eki', title: '📋 Ek-7/A & Ek-7/B: Tahliye ve Yıktırma Bina Askı Tutanağı (En Çok 90 Gün Süre)', url: 'javascript:openYonEk("Ek-7/A")', keys: 'ek-7 ek-7/a ek-7/b tahliye yıkım askı tutanağı 90 gün' },
  { cilt: 'Yönetmelik Eki', title: '📋 Ek-8: Karara Katılmayan Maliklere 15 Günlük Karar ve Teklif Bildirim Formu (m.15/2)', url: 'javascript:openYonEk("Ek-8")', keys: 'ek-8 ek 8 karara katılmayan maliklere teklif bildirim formu 15 gün' },
  { cilt: 'Yönetmelik Eki', title: '📋 Ek-9: Açık Artırma Satış Yeri ve Zamanı Bildirim Tutanağı (m.15/A-4)', url: 'javascript:openYonEk("Ek-9")', keys: 'ek-9 ek 9 açık artırma satış yeri zamanı tutanağı' },
  { cilt: 'Yönetmelik Eki', title: '📋 Ek-12: Malikler Toplantı Çağrısı İlan / Bildirim Formu (m.15/2 - 15 Gün İlan)', url: 'javascript:openYonEk("Ek-12")', keys: 'ek-12 ek 12 malikler toplantı çağrısı formu 15 gün ilan' },
  { cilt: 'Yönetmelik Eki', title: '📋 Ek-13: İlk Satışta Satılamayan Hisselerin 3. Şahıslara Satış İlan Formu (m.15/A-12)', url: 'javascript:openYonEk("Ek-13")', keys: 'ek-13 ek 13 üçüncü şahıslara satış ilan formu %10 teminat' },
  { cilt: 'Cilt 3', title: 'Kentsel Dönüşüm Dosyası 9 Aşamalı Sistem ve A1–H5 Evrak Kontrol Tablosu', url: 'cilt3.html#bolum-1', keys: 'dosyalama sistemi a1 h5 evrak kontrol listesi lisanslı kuruluş karot röleve' },
  { cilt: 'Cilt 3', title: 'Yapı Müteahhitliği Sınıfları (Geçici ve H–A Grupları) & Yıkım Müteahhitliği (Y1, Y2, Y3)', url: 'cilt3.html#bolum-5', keys: 'müteahhit sınıfları yambis geçici grup h g1 g f1 f e1 e d c b a y1 y2 y3 21.50m statik fenni mesul' },
  { cilt: 'Cilt 3', title: 'Sınırlı Vekaletname Matrisi vs. Noter Düzenleme Şeklinde Geniş Vekaletname (Ek-3L)', url: 'cilt3.html#bolum-6', keys: 'sınırlı vekaletname düzenleme şeklinde vekaletname ek-3l ferağ ahzu kabz tevkil' },
  { cilt: 'Cilt 3', title: 'Kat Karşılığı Yer Gösterme Belgesi (%4 + KDV) ve 12 Dilekçe/Tutanak Şablonu (Ek-3A..3L)', url: 'cilt3.html#bolum-7', keys: 'kat karşılığı yer gösterme belgesi %4 kdv dilekçe tutanak ek-3a ek-3k ek-3l' },
  { cilt: 'Cilt 4', title: 'Canlı Mevzuat Takip Portalı (39787 Antalya İmar, 31301 Müteahhit, 24408 Otopark, 4883 Sığınak)', url: 'cilt4.html#bolum-1', keys: 'mevzuat.gov.tr 3194 imar kanunu 634 kmk tbk tmk otopark sığınak' },
  { cilt: 'Cilt 4', title: '6306 Sayılı Kanun Uygulama Yönetmeliği (Madde 1–22 Tam Rehber & 2026 Danıştay Kararları)', url: 'cilt4.html#bolum-2', keys: '6306 uygulama yönetmeliği danıştay yürütmeyi durdurma %6 teminat %10 kademeli satış' },
  { cilt: 'Cilt 4', title: 'Antalya Büyükşehir Belediyesi İmar Yönetmeliği (RG: 31996 – Madde 1–59 Saha Rehberi)', url: 'cilt4.html#bolum-3', keys: 'antalya imar yönetmeliği yol genişliği kat adedi cephe derinlik emsal harici %20 balkon %30 panoramik asansör 30 m2 1 ağaç' },
  { cilt: 'Cilt 4', title: 'Bakanlık İmar Mevzuatı Açıklamalı Soru-Cevap Rehberi (34 Resmi Görüş Yazısı 2024–2026)', url: 'cilt4.html#bolum-4', keys: 'balkon emsal zemin terası gezilemeyen teras müteahhit imzadan imtina sgk vergi borcu kısmi iskân tiny house karavan pergola sundurma ges elektrikli şarj sığınak kişi hesabı bağ evi 75 m2 150 m2 250 m2' }
];

// 5. İKİZ EKRANDA AÇILAN RESMİ MEVZUAT MADDELERİ VERİTABANI (LAW_DB - 28 KATEGORİK KART)
const LAW_DB = {
  'paiy-m4': {
    title: 'Planlı Alanlar İmar Yönetmeliği m.4, m.5/6, m.20/3 ve m.21/4 (TAKS, KAKS ve Yapı Zarfı)',
    ref: 'Cilt 1 & Cilt 4 • Planlı Alanlar İmar Yönetmeliği & Bakanlık Görüşü (12770358)',
    body: `<p><strong>Madde 5/6 (TAKS %40 ve %60 Kuralı):</strong> Ayrık veya blok nizam olan yerlerde, uygulama imar planında açıkça belirlenmemiş ise <strong>TAKS %40'ı geçemez</strong>. Ancak, çekme mesafeleri ile KAKS verilip TAKS verilmeyen parsellerde, <strong>TAKS %60'ı geçmemek şartıyla</strong>, çekme mesafelerine göre uygulama yapılır.</p>
    <p><strong>Madde 20/3 ve 21/4 (Yapı Zarfı Kuralı):</strong> Uygulama imar planında belirlenmemişse bu Yönetmelikle tanımlanan TAKS'a ve bahçe mesafelerine göre belirlenen taban alanının <strong>küçük olanı (yapı zarfı)</strong> uygulanır (Örn: TAKS 250 m² izin verse bile çekmelerden sonra kalan yapı zarfı 220 m² ise 220 m² esas alınır).</p>`
  },
  'kepez-27594': {
    title: 'Antalya Kepez Güneş Mah. 27594 Ada 1 Parsel İmar Plan Notları (İBT, 157 m Mânia) ve Halihazır Pafta Okuma',
    ref: 'Cilt 1 • Bölüm 1.4 ve Bölüm 4.2 (Antalya Kepez Belediyesi E-İmar Belgesi – Pafta: O25-A-10-C-1-B)',
    body: `<p><strong>1) İBT (İsteğe Bağlı Ticaret) Kullanımı:</strong> Konut alanında kalan ancak uygulama imar planı notlarındaki koşullara göre zemin/ilgili katlarda ticaret yapılabilen karma nitelikli kullanım kararıdır.</p>
    <p><strong>2) Havaalanı Mânia Sınırı (157 Metre):</strong> Sivil Havacılık / Havaalanı Mânia Planı uyarınca; parselin deniz seviyesinden yüksekliği (arazi kotu) + yapılacak binanın yüksekliği + <strong>çatı, baca, asansör kulesi ve anten dâhil en üst noktasının</strong> deniz seviyesine göre aşamayacağı mutlak irtifa sınırı <strong>157 metredir!</strong></p>
    <p><strong>3) E-İmar Haritasındaki Gri Renkli Bina Şekilleri:</strong> E-imar sorgu haritasında parsel içinde görünen gri çokgenler <strong>halihazır harita altlığındaki mevcut yapıları (gecekonduları/binaları)</strong> gösterir; yeni yapılacak kentsel dönüşüm projesinin onaylı vaziyet/yerleşim planı değildir!</p>
    <p><strong>4) 27594 Ada 1 Parsel Ölçüleri:</strong> Gösterilen alan: <strong>16.250,65 m²</strong> | Nizam: <strong>Ayrık, MAX=7 Kat</strong> | TAKS (0,30): <strong>4.875,20 m²</strong> | EMSAL (0,60): <strong>9.750,39 m²</strong> | Subasman: <strong>+2,50 m</strong> | Çıkma Katsayısı: <strong>1,70</strong> | Minimum İfraz: <strong>1.200 m²</strong>.</p>`
  },
  'ant-m6': {
    title: 'Antalya Büyükşehir Belediyesi İmar Yönetmeliği Madde 6 ve Madde 7 (Parsel Büyüklükleri, İfraz ve Tevhit)',
    ref: 'Cilt 4 • RG: 27.10.2022 - Sayı: 31996 (Mevzuat No: 39787)',
    body: `<p><strong>Madde 7/3 (Resen Tevhit/İfraz):</strong> Mevcut haliyle yapılaşmaya elverişli olmayan parsellere ilişkin olarak, ilgili idarenin tebliğ tarihinden itibaren <strong>3 ay içerisinde</strong> maliklerin kendi aralarında anlaşamaması halinde resen tevhit ve ifraz yoluyla işlem yapmaya ilgili idare yetkilidir.</p>
    <p><strong>Madde 7/9 (Tevhitte Alan Artışı Yasağı):</strong> Aynı yapı nizamı ve kullanım kararına sahip parsellerin tevhit edilmeleri halinde; tevhit sonrası elde edilen parselin taban alanı ve katlar alanı, <strong>tevhit öncesi parsellerin ayrı ayrı hesaplanan taban alanları ve katlar alanları toplamını geçemez!</strong></p>
    <p><strong>Madde 7/10:</strong> Yapı nizamı veya kullanım kararı birbirinden farklı olan parseller ve farklı yollardan cephe alan ara parseller ile ifraz hattıyla ayrılan parseller tevhit edilemez.</p>`
  },
  'ant-m9': {
    title: 'Antalya İmar Yönetmeliği Madde 9 (Yol Genişliklerine Göre Kat Adetleri ve Min. Cephe/Derinlik)',
    ref: 'Cilt 4 • RG: 27.10.2022 - Sayı: 31996 (Madde 9)',
    body: `<p><strong>Madde 9/1 (Yol Genişliğine Göre En Çok Kat Adedi - Bodrum Hariç):</strong><br>
    • Yol ≤ 7,00 m: <strong>2 Kat</strong> | 7,00 m &lt; Yol ≤ 10,00 m: <strong>3 Kat</strong> | 10,00 m &lt; Yol ≤ 12,00 m: <strong>4 Kat</strong><br>
    • 12,00 m &lt; Yol ≤ 15,00 m: <strong>5 Kat</strong> | 15,00 m &lt; Yol ≤ 20,00 m: <strong>6 Kat</strong> | 20,00 m &lt; Yol ≤ 25,00 m: <strong>8 Kat</strong><br>
    • 25,00 m &lt; Yol ≤ 35,00 m: <strong>10 Kat</strong> | 35,00 m &lt; Yol ≤ 50,00 m: <strong>14 Kat</strong> | Yol &gt; 50,00 m: <strong>18 Kat</strong>.</p>
    <p><strong>Madde 9/2-3 (Minimum Bina Cephe ve Derinliği):</strong> 4 kata kadar: <strong>6,00 m</strong> | 6 kata kadar: <strong>7,00 m</strong> | 8 kata kadar: <strong>8,00 m</strong> | 9 kata kadar: <strong>9,00 m</strong> | 10 ve daha fazla katlı binalarda: <strong>12,00 m</strong>.</p>`
  },
  'ant-m11-18': {
    title: 'Antalya İmar Yönetmeliği m.11–18 & Planlı Alanlar Yön. m.5/26-29, m.18 (Kotlandırma, Köşe Parsel ve Bahçe Kazısı)',
    ref: 'Cilt 4 • Bakanlık Görüşleri (13517210, 10833579, 15550426, 13771439, 14076354)',
    body: `<p><strong>1) Arka Bahçe Kazısı (m.18/2 - Görüş: 13517210):</strong> Tabii zemini ±0.00 kotunun altında kalan arka bahçelerde bina köşelerinden en düşük kottakinin seviyesine kadar kazı yapılabilir.</p>
    <p><strong>2) 3 Yola Cepheli Parsel (Görüş: 10833579):</strong> Üç yola cepheli köşe parselde tüm yol cepheleri ön bahçe statüsündedir; arka bahçeden söz edilemez, diğer komşu sınır yan bahçedir.</p>
    <p><strong>3) Köşe Parsel Kotu ve >3,50 m Kademe (Görüş: 15550426):</strong> Köşe başı parselde sırf kat kazanmak amacıyla yüksek yol seçilemez; sokak silueti korunur. Köşeler arası kot farkı 3,50 m'den fazla ise en düşük iki köşe kotunun ortalaması esas alınır (m.5/26-29).</p>
    <p><strong>4) Bitişik–Ayrık Komşuluğu (Görüş: 13771439):</strong> Bitişik nizam parseldeki yapı, komşu ayrık nizam parseldeki yapıya bitişemez; o cephe yan bahçe mesafesine tabidir.</p>`
  },
  'ant-m22': {
    title: 'Antalya İmar Yönetmeliği Madde 22 & Bakanlık Balkon Görüşü (Emsal Harici Alanlar ve %20/%30 Kuralı)',
    ref: 'Cilt 4 • Antalya İmar Yön. m.22 & ÇŞİDB Görüşleri (15847027, 13000034, 14893759)',
    body: `<p><strong>Planlı Alanlar İmar Yön. m.5/8 Üst Sınırı:</strong> 22 nci maddeyle getirilebilecek emsal harici tüm alanların toplamı; <strong>parselin toplam emsale esas alanının %30'unu aşamaz!</strong> (Kapı/pencere/merdiven erişimi olmayan, kullanıma konu edilmeyen ortak <strong>gezilemeyen teras çatılar</strong> %30 hesabına da girmeden tamamen emsal haricidir).</p>
    <p><strong>Antalya İmar Yön. Madde 22 (%30 Hesabına Giren Alanlar):</strong> Zorunlu kapıcı dairesinin 70 m²'si; bodrumda emsalin %5'ini ve 1.000 m²'yi geçmeyen ortak sosyal mekânlar; gömülü bodrumda daire net alanının %50'sini geçmeyen depolar; <strong>bağımsız bölüm net alanının %20'sini geçmemek kaydıyla açık çıkma (en az bir ucu konsol) balkonlar</strong> ve merdiven evi.<br>
    <em>⚠️ Bakanlık Görüşü: Tüm köşeleri kolonlara oturan balkonlar ile zemin kat terasları hem TAKS hem KAKS (emsal) hesabına DÂHİL edilir!</em></p>`
  },
  'ant-m23': {
    title: 'Antalya İmar Yönetmeliği Madde 23 (Bahçe Mesafeleri, Ağaç Dikimi ve Panoramik Asansör)',
    ref: 'Cilt 4 • RG: 27.10.2022 - Sayı: 31996 (Madde 23)',
    body: `<p><strong>Ön Bahçe:</strong> En az <strong>5,00 m</strong> (7 kat üzeri binalarda yol aksından itibaren bina yüksekliğinin yarısından az olamaz).</p>
    <p><strong>Yan ve Arka Bahçe Kat Artışı:</strong> Yan bahçe en az <strong>3,00 m</strong>, arka bahçe en az bina yüksekliğinin yarısı (h/2) kadardır. <strong>4 katın üzerindeki her kat için +0,50 m, 7 katın üzerindeki her kat için +1,00 m artırılır!</strong></p>
    <p><strong>Ağaç ve Panoramik Asansör:</strong> Bina oturumu dışında kalan bahçe alanının her <strong>30 m²'si için 1 ağaç</strong> dikilir (m.23/6). Mevcut yapılarda parsel sınırına en az <strong>1,50 m</strong> bırakılarak bahçe mesafesinde panoramik asansör yapılabilir (m.23/7).</p>`
  },
  'ant-m34': {
    title: 'Antalya İmar Yönetmeliği Madde 34 & Bakanlık Görüşleri (Asansör Zorunluluğu, Bodrum Katlar ve Çatı Kulesi)',
    ref: 'Cilt 4 • Antalya İmar Yön. m.34 & ÇŞİDB Görüşleri (14988563, 15505716, 14226281)',
    body: `<p><strong>1) Bodrum Katların Kat Adedine Dahil Edilmesi ve Asansör (Görüş: 14988563):</strong> İskân edilen veya bağımsız bölüm bulunan bodrum katlar kat adedine dahildir. Uygulama imar planına göre 2 katlı olan bir binada, içinde bağımsız bölüm bulunan 2 kat bodrum inşa edilirse toplam kat adedi 4 kat olduğundan <strong>asansör tesisi zorunludur!</strong> (3 katlı binalarda asansör yeri bırakılması, 4 ve daha fazla katlılarda ise asansör tesisi zorunludur).</p>
    <p><strong>2) Çift Asansör, 1+1 İstisnası ve Sedye Asansörü (Antalya İmar Yön. m.34):</strong> Zemin kotu üzerinde <strong>20'den fazla konut</strong> bulunan binalarda en az <strong>2 adet asansör</strong> yapılması zorunludur. <em>İstisna: Bütün bağımsız bölümleri 1+1 (1 oturma odası + 1 yatak odası) olan ve emsale konu alanı 45 m²'yi geçmeyen binalarda 40 bağımsız bölüme kadar 1 asansör yeterlidir.</em> 10 kat ve üzeri binalarda sedye asansörü (kabin min. 1,20 × 2,10 m = 2,52 m²) şarttır.</p>
    <p><strong>3) Asansör Kulesi ve Merdiven Evi Yüksekliği (Görüş: 15505716):</strong> Saçak seviyesini aşan asansör makine dairesi, merdiven evi ve parapet duvarları <strong>yapı yüksekliğine dahildir</strong> (ancak kat adedine sayılmaz). Kullanılamayan boş çatı arası yüksekliğe girmez.</p>`
  },
  'ant-m41': {
    title: 'Antalya İmar Yönetmeliği Madde 41 (Açık ve Kapalı Çıkmalar ile 1,70 Çıkma Katsayısı)',
    ref: 'Cilt 1 & Cilt 4 • RG: 27.10.2022 - Sayı: 31996 (Madde 41)',
    body: `<p><strong>Kapalı Çıkmalar:</strong> Yol cephelerinde yapı yaklaşma sınırından en fazla <strong>1,50 m</strong>; yan ve arka bahçede parsel sınırlarına <strong>3,00 m'den fazla yaklaşmamak</strong> kaydı ile <strong>1,50 m</strong> taşabilir.</p>
    <p><strong>Açık Çıkmalar (Balkon):</strong> Yol cephesinde <strong>1,50 m</strong>; yan ve arka bahçede parsel sınırlarına <strong>2,00 m'den fazla yaklaşmamak</strong> kaydı ile <strong>1,50 m</strong> taşabilir (Bitişik nizamda komşu sınırına 2,00 m'den fazla yaklaşamaz). Çıkma altı şaküli mesafe en az <strong>2,20 m</strong>'dir.</p>
    <p><strong>1,70 Çıkma Katsayısı Formülü:</strong> <code>Yaklaşık Toplam Alan = [ (KAKS − TAKS) × 1,70 + TAKS ] × Net Parsel Alanı</code>.</p>`
  },
  'paiy-m59': {
    title: 'Planlı Alanlar İmar Yön. m.4, m.59 & Bakanlık Görüşleri (Pergola, Sundurma, Tiny House, Karavan, GES ve Elektrikli Şarj)',
    ref: 'Cilt 4 • ÇŞİDB Görüşleri (8590375, 15472226, 14966391, 15592640, 16593755)',
    body: `<p><strong>1) Pergola vs. Sundurma (Görüş: 15472226):</strong> Bahçede veya terasta gölge amaçlı yapılan <strong>Pergola yapı ruhsatına tabi değildir (m.59).</strong> Ancak binaya bitişik olarak yapılan, yağmur/güneşten koruma amaçlı üç tarafı açık <strong>"Sundurma" YAPI RUHSATINA TABİDİR!</strong></p>
    <p><strong>2) Tiny House, Konteyner ve Karavan (Görüş: 8590375):</strong> Sabitlenerek konut veya ticari amaçla kullanılan ya da elektrik/su/altyapı bağlanan <strong>Tiny House ve Konteynerler 3194 s.K. m.5 kapsamında "yapı" niteliğinde olup YAPI RUHSATINA TABİDİR!</strong> Yalnızca Karayolları Trafik Yönetmeliğine uygun plakalı, araç ruhsatlı ve sabitlenmeyen çekme karavanlar ruhsata tabi değildir.</p>
    <p><strong>3) Ortak Otoparka Elektrikli Araç Şarj Ünitesi (PAİY m.59/2 - Görüş: 16593755):</strong> Mevcut elektrik tesisatından/panosundan beslenen priz/şarj üniteleri kat maliklerinin <strong>sayı ve arsa payı çoğunluğuyla (>%50)</strong> yapı ruhsatı aranmadan kurulabilir. Ancak yeni trafo veya ortak ana panoda esaslı tadilat gerekiyorsa <strong>bütün kat maliklerinin oybirliği (%100)</strong> ve tadilat ruhsatı gerekir.</p>
    <p><strong>4) Çatı GES (Görüş: 14966391):</strong> Planlı alanda ruhsatlı veya Yapı Kayıt Belgeli binaya kendi ihtiyacı için saçak sınırını aşmadan ruhsatsız GES kurulabilir; kaçak yapıya GES kurulamaz.</p>`
  },
  'otopark-m8-12': {
    title: 'Otopark Yönetmeliği Madde 8, Madde 12 & Bakanlık Görüşleri (Yıkılıp Yeniden Yapılan Bina, %50 İndirim, Taksit ve Şarj Ünitesi)',
    ref: 'Cilt 4 • Otopark Yönetmeliği (Mevzuat No: 24408) & ÇŞİDB Görüşleri (13379899, 4264528, 16083587, 16593755)',
    body: `<p><strong>1) Yıkılıp Yeniden Yapılan Binada Eski Otopark Bedeli Mahsup Edilmez (Görüş: 13379899):</strong> Yıkılıp yeniden yapılan binalarda yeni projeye göre otopark ihtiyacı karşılanır; <strong>eski bina için geçmişte ödenmiş olan otopark bedeli yeni binanın otopark bedelinden MAHSUP EDİLMEZ (düşülmez), yeniden tahsil edilir!</strong></p>
    <p><strong>2) Küçük Parsellerde %50 Otopark İndirimi (Otopark Yön. m.8/2 - Görüş: 4264528):</strong> Parsel cephesi <strong>9 metreden</strong> veya parsel alanı <strong>250 m²'den</strong> az olan parsellerde, otopark ihtiyacının en az yarısının parselinde karşılanması kaydıyla konut otopark ihtiyacı <strong>%50 oranında azaltılabilir.</strong></p>
    <p><strong>3) Brüt Alan Esası ve 36 Ay 6 Taksit (Otopark Yön. m.12 - Görüş: 16590951 & 16083587):</strong> Meskenlerde otopark sayısı (80 m² altı 3 daireye 1; 80–120 m² arası 2 daireye 1; 120–180 m² arası her daireye 1; 180 m² üstü 2 adet) <strong>bağımsız bölüm BRÜT alanı</strong> (ortak alan payı hariç) üzerinden hesaplanır. Otopark bedelinin <strong>%25'i yapı ruhsatı aşamasında peşin, kalan %75'i ise 36 ay içinde 6 eşit taksitte</strong> ödenir.</p>
    <p><strong>4) Mekanik Otopark ve Elektrikli Araç Şarj Ünitesi (Görüş: 14681185 & 16593755):</strong> Arka bahçede binaya 2 m yaklaşımla zemin üstü mekanik otopark yapılabilir. Ortak otoparkta elektrikli şarj ünitesi kat maliklerinin <strong>sayı ve arsa payı çoğunluğuyla</strong> ruhsatsız kurulur.</p>`
  },
  'siginak-m8': {
    title: 'Sığınak Yönetmeliği Madde 8, Geçici Madde 2 & Bakanlık Görüşü (Sığınak Kişi Hesabı ve Salonun Oda Sayılması)',
    ref: 'Cilt 4 • Sığınak Yönetmeliği (Mevzuat No: 4883) & ÇŞİDB Görüşü (28.08.2026 - 16561318)',
    body: `<p><strong>1) Sığınak Zorunluluğu ve Kişi Başı Net Alan (Sığınak Yön. m.8):</strong> Bağımsız bölüm sayısı 12'den fazla olan konutlarda veya toplam emsal alanı 1.500 m²'yi aşan yapılarda sığınak zorunludur. Kişi başına <strong>en az net 1,00 m²</strong> sığınak alanı ayrılır (1 odalı konutta 2 kişi, 2 odalıda 3 kişi, 3 ve daha fazla odalıda 4 kişi esas alınır).</p>
    <p><strong>2) Salonun "Oda" Sayısına Dahil Edilmesi (Bakanlık Görüşü: 16561318):</strong> Sığınak kişi hesabında dairedeki <strong>"salon" oturma odası niteliğinde olduğundan (açık/Amerikan mutfaklı veya kapalı mutfaklı olmasına bakılmaksızın) toplam oda sayısına DÂHİL edilir!</strong> (Örn: 1 yatak odası + 1 salonu olan 1+1 daire "2 odalı" kabul edilir ve 3 kişi üzerinden 3 m² net sığınak hesaplanır).</p>
    <p><strong>3) Sığınakların Başka Amaçla Kullanım Yasağı (Geçici m.2 - Görüş: 14932019):</strong> Apartman sığınakları kat malikleri oybirliğiyle karar alsa dahi konut veya bağımsız ticari depoya dönüştürülemez; yalnızca barış zamanında ortak otopark veya ortak sosyal/spor alanı olarak kullanılabilir.</p>`
  },
  'plansiz-m63': {
    title: 'Plansız Alanlar İmar Yönetmeliği Madde 45, 50, 63, 64 & Bakanlık Görüşleri (Bağ Evi 75/150/250 m² ve Köy İfrazı)',
    ref: 'Cilt 4 • Plansız Alanlar İmar Yönetmeliği (Mevzuat No: 4882) & ÇŞİDB Görüşleri (12811380, 8197860, 13432148, 16020705)',
    body: `<p><strong>1) İskân Dışı Alanlarda Bağ Evi Sınırı (Madde 63 - Görüş: 12811380):</strong> Üst ölçek planı bulunmayan iskân dışı alanlarda yapılacak bağ veya sayfiye evlerinde; <strong>yapı inşaat alanı katsayısı (emsal) %5'i</strong>, <strong>toplam inşaat alanı (bodrum dahil) 250 m²'yi</strong>, saçak seviyesi tabii zeminden <strong>6,50 m'yi (eğimli arazide 7,50 m'yi) ve 2 katı</strong> geçemez!</p>
    <p><strong>2) Yapı Ruhsatı Aranmayan Bağ Evi İstisnası (Madde 64 - Görüş: 8197860):</strong> İskân dışı alanlarda 63 üncü maddedeki (%5 emsal) şartları sağlamak, <strong>her bir parselde 1 adet olmak, taban alanı 75 m²'yi, toplam inşaat alanı 150 m²'yi ve 2 katı (6,50 m yüksekliği) geçmemek</strong> kaydıyla; İl Tarım ve Orman Müdürlüğü uygun görüşü ve ilgili idare izni alınarak <strong>YAPI RUHSATI ARANMADAN</strong> bağ evi yapılabilir (Köy yerleşik alanı dışında oturanlar da yararlanabilir).</p>
    <p><strong>3) Köy Yerleşik Alanında İfraz ve Çoklu Bina (Madde 45 & 50 - Görüş: 13432148 & 16020705):</strong> Köy yerleşik alanında asgari ifraz cephesi <strong>15,00 m</strong>, derinliği <strong>20,00 m</strong>'dir (m.45). Hisseli olup <strong>1.500 m²'den büyük</strong> köy yerleşik alan parsellerinde, tüm hissedarların muvafakati ve binalar arası en az <strong>6,00 m</strong> mesafe bırakılması şartıyla parselde <strong>en fazla 3 adet bina</strong> (her biri max 250 m², toplamda max 750 m², emsal %40) yapılabilir.</p>`
  },
  'yangin-m48': {
    title: 'Binaların Yangından Korunması Hakkında Yönetmelik Madde 26 ve Madde 48 (Yangın Merdiveni ve Bodrum Ayırımı)',
    ref: 'Cilt 4 • BYKHY & ÇŞİDB Görüşleri (15974739, 15618314)',
    body: `<p><strong>1) Konutlarda Kaçış Merdiveni Sayısı (BYKHY m.48 - Görüş: 15974739):</strong> Yapı yüksekliği <strong>21,50 m'nin altındaki</strong> konutlarda 1 adet normal merdiven yeterlidir; <strong>21,50 m ile 30,50 m arasındaki</strong> konutlarda en az 2 merdiven (biri korunumlu yangın merdiveni); <strong>30,50 m ile 51,50 m arasındaki</strong> konutlarda ise her ikisi de korunumlu en az 2 kaçış merdiveni yapılması zorunludur.</p>
    <p><strong>2) Bodrum Katın Yangın Yüksekliğinden Sayılmaması (Görüş: 15618314):</strong> Bodrum katlar üst katlardan <strong>en az 120 dakika yangına dayanıklı</strong> döşeme ve bölmelerle tam olarak ayrılmış ve kaçışları bağımsız sağlanmışsa, yapı yüksekliği hesabında bodrum kat yüksekliği yangın yüksekliğine dahil edilmez.</p>`
  },
  'vekalet-tbk504': {
    title: 'TBK Madde 504 (Özel Yetki Kuralı) & Sınırlı Vekaletname vs. Noter Geniş Vekaletname (Ek-3L) Güvenlik Analizi',
    ref: 'Cilt 3 • Bölüm 6 & Ek-3L (6098 Sayılı Türk Borçlar Kanunu Madde 504)',
    body: `<p><strong>1) TBK Madde 504/3 Özel Yetki Şartı:</strong> Vekil, özel olarak yetkili kılınmadıkça dava açamaz, <strong>sulh olamaz, ibra edemez, taşınmazı devredemez (ferağ veremez) ve bir hak üzerinde sınırlama (ipotek/şerh) kuramaz.</strong></p>
    <p><strong>2) Noter Geniş Vekaletnamesindeki (Ek-3L) Çok Yüksek Riskli İbareler:</strong><br>
    Piyasada matbu kullanılan geniş vekaletnamelerde yer alan; <em>"dilediği bedel ve koşullarda sözleşme yapmaya"</em>, <em>"dilediği arsa payı üzerinden dilediği bağımsız bölümleri adıma seçmeye"</em>, <em>"riskli yapı raporuna ve değerleme raporuna itiraz hakkından peşinen feragate"</em> ve <em>"ahzu kabza (para tahsiline), sulh ve ibraya"</em> ibareleri arsa sahipleri için <strong>çok yüksek hukuki risk</strong> taşır ve vekaletnameden mutlaka çıkarılmalıdır!</p>
    <p><strong>3) Güvenli / Sınırlı Vekaletname Kuralı:</strong> Müteahhide sadece belediye/arşiv proje temini, abonelik kesme, yıkım/yapı ruhsatı takibi ve <strong>yalnızca noter sözleşmesinde müteahhide düşeceği açıkça yazılı bağımsız bölümlerin İdarenin inşaat ilerleme yazısına (%10 altı kademeli satış kuralına - m.13/10) bağlı olarak devri</strong> için sınırlı yetki verilmelidir.</p>`
  },
  'yergosterme-ek3k': {
    title: 'Taşınmaz Ticareti Hakkında Yönetmelik & Kat Karşılığı Yer Gösterme Belgesi (Ek-3K - %4 + KDV Hizmet Bedeli)',
    ref: 'Cilt 3 • Bölüm 7 & Ek-3K (Mevzuat No: 24645 & TBK Simsarlık Hükümleri m.520–525)',
    body: `<p><strong>1) %4 + KDV Hizmet Bedeli Güvencesi (Ek-3K):</strong> Emlak işletmesi (Aracı) tarafından Müşteri'ye (Alıcı / Müteahhit adayına) ilk defa gösterilen taşınmazın; Aracı'nın bilgisi olmaksızın Müşteri veya Müşteri'nin eşi, annesi, babası, kardeşleri, kan/sıhri hısımları ya da ortağı/çalışanı/idarecisi bulunduğu şirket tarafından satın alınması veya <strong>Kat Karşılığı İnşaat Sözleşmesi imzalanması</strong> halinde Aracı <strong>%4 + KDV</strong> oranında hizmet bedeline hak kazanır.</p>
    <p><strong>2) Yetkili Mahkeme ve İspat:</strong> Sözleşme 2 nüsha olarak imzalanır; doğacak uyuşmazlıklarda <strong>Antalya Mahkeme ve İcra Daireleri</strong> yetkilidir.</p>`
  },
  'ehliyet-tmk': {
    title: '4721 Sayılı TMK m.9–15 & 1512 Sayılı Noterlik Kanunu m.72 (65 Yaş Üstü Maliklerde Hukuki İşlem Ehliyeti Raporu)',
    ref: 'Cilt 3 • Bölüm 1 & Bölüm 5 (Noter Düzenleme Şeklinde Kat Karşılığı Sözleşme Güvenliği)',
    body: `<p><strong>1) Hukuki İşlem Ehliyeti (TMK m.9–15):</strong> Ayırt etme gücüne sahip olmayan kişinin yaptığı hukuki işlemler (Kat Karşılığı İnşaat Sözleşmesi, Vekaletname, Paylaşım Protokolü) kesin hükümsüzdür (batıldır).</p>
    <p><strong>2) Noterlik Kanunu m.72 ve 65 Yaş Üstü Sağlık Raporu Kuralı:</strong> Kat Karşılığı İnşaat Sözleşmesi veya Düzenleme Şeklinde Vekaletname noterde imzalanırken, <strong>65 yaş üstü arsa sahipleri</strong> (veya sağlık durumu şüphe doğuran malikler) bakımından ileride diğer mirasçılar veya malikler tarafından <em>"ehliyetsizlik / ayırt etme gücü kaybı"</em> iddiasıyla sözleşmenin iptali davası açılmasını önlemek için <strong>sözleşme/vekaletname ile aynı gün tarihli (tam teşekküllü devlet hastanesi veya adli tıptan) akıl sağlığı / hukuki işlem ehliyeti raporu</strong> alınarak noter evrakına eklenmelidir.</p>`
  },
  'mut-sinif': {
    title: 'Yapı Müteahhitlerinin Sınıflandırılması Yönetmeliği (Geçici Grup ve H–A Grupları) & Yıkım Sınıfları (Y1–Y3)',
    ref: 'Cilt 3 & Cilt 4 • Mevzuat No: 31301',
    body: `<p><strong>Yapı Müteahhitliği Grupları (2026 Yaklaşık Azami m²):</strong><br>
    • <strong>Geçici Grup:</strong> En çok 2 kat, max 500 m² (Kentsel dönüşüm/kat karşılığı yapamaz!).<br>
    • <strong>H:</strong> ~2.101 m² | <strong>G1:</strong> ~4.412 m² | <strong>G:</strong> ~6.177 m² | <strong>F1:</strong> ~9.303 m² | <strong>F:</strong> ~11.765 m² | <strong>E1:</strong> ~15.686 m² | <strong>E:</strong> ~22.549 m² | <strong>D:</strong> ~41.692 m² | <strong>C:</strong> ~58.824 m² | <strong>B1:</strong> ~70.589 m² | <strong>B:</strong> ~82.354 m² | <strong>A:</strong> Sınırsız.</p>
    <p><strong>Yıkım Müteahhitliği Grupları:</strong> <strong>Y3:</strong> ≤ 17,50 m | <strong>Y2:</strong> ≤ 51,50 m | <strong>Y1:</strong> Sınırsız ve patlayıcılı yıkım (Bina yüksekliği &gt; 21,50 m ise statik fenni mesul zorunludur).</p>`
  },
  'imark-m28': {
    title: '3194 Sayılı İmar Kanunu m.28/10 & Planlı Alanlar Yön. m.54/7, m.64/12 (İskân Uyuşmazlıkları ve SGK Borcu)',
    ref: 'Cilt 4 • Bakanlık Resmi Görüşleri (16028957, 12119520, 10059155, 16129578)',
    body: `<p><strong>1) Süresi Biten Ruhsatta İskân (Planlı Alanlar Yön. m.54/7 - Görüş: 16028957):</strong> 5 yıllık ruhsat süresi içinde ruhsat ve eklerine uygun olarak tamamlandığı belgelenen ancak iskân almamış yapılara, ruhsat süresi dolmuş olsa dahi <strong>yeniden ruhsat düzenlenmeksizin</strong> yapı kullanma izin belgesi (iskân) verilir.</p>
    <p><strong>2) Müteahhidin İmzadan İmtinası (Planlı Alanlar Yön. m.64/12 - Görüş: 12119520):</strong> Yapı ruhsat ve eklerine uygun tamamlanmışsa, müteahhidin alacak iddiasıyla imzadan imtina etmesi halinde <strong>müteahhidin imzası olmadan yapı kullanma izin belgesi (iskân) düzenlenir!</strong></p>
    <p><strong>3) Müteahhidin Vergi veya SGK Prim Borcu (3194 s. İmar K. m.28/10 - Görüş: 10059155):</strong> Yapının müteahhidi olmayan yapı sahibinin (arsa sahibinin) talebi üzerine, <strong>SGK/vergi borcu bulunan müteahhidin maliki olduğu bağımsız bölümler hariç tutularak arsa sahiplerinin bağımsız bölümleri için kısmi iskân düzenlenir!</strong></p>`
  },
  'yon-m6': {
    title: '6306 Uygulama Yönetmeliği MADDE 6 – Riskli Yapıların Tespitinde Görev Alacak Kurum ve Kuruluşlar',
    ref: '6306 Sayılı Kanunun Uygulama Yönetmeliği • Madde 6 (RG: 21/05/2024 - 32552)',
    body: `<p><strong>MADDE 6 – (1) Riskli yapılar;</strong> a) Başkanlıkça, b) İdarece, c) Başkanlıkça lisanslandırılan; 1) Kamu kurum ve kuruluşları, 2) Üniversiteler, 3) Sermayesinin en az %40'ı kamuya ait şirketler, 4) Deprem mühendisliği alanında faaliyet gösteren STK'lar, 5) 4708 sayılı Kanuna göre izin belgesi almış yapı denetimi ve laboratuvar kuruluşları, 6) 6235 sayılı Kanun uyarınca inşaat, jeoloji ve jeofizik mühendisleri odalarına büro tescilini yaptırmış kuruluşlar tarafından tespit edilir. Başvurusu uygun görülenlere Ek-3 taahhütnamesi ile Ek-1 Lisans Belgesi düzenlenir.</p>
    <p><strong>(2)-(3) Mühendis Şartları:</strong> Görev alacak mühendislerin mesleklerinde fiilen <strong>en az 5 yıl</strong> çalışmış olmaları ve yazılı sınavda <strong>100 üzerinden en az 70 puan</strong> alarak başarı belgesi almış olmaları gerekir. En az 1 inşaat mühendisi görevlendirilmesi mecburidir.</p>
    <p><strong>(12) Ceza Hükmü:</strong> Gerçeğe aykırı belge sunanlar, mevcut olmayan bir yapı hakkında riskli yapı tespit raporu hazırlayan mühendis ile mevcut olmayan yapı hakkında talepte bulunan malik hakkında <strong>5237 sayılı Türk Ceza Kanunu uyarınca Cumhuriyet başsavcılığına suç duyurusunda bulunulur.</strong></p>`
  },
  'yon-m7': {
    title: '6306 Uygulama Yönetmeliği MADDE 7 – Riskli Yapıların Tespiti ve İtiraz',
    ref: '6306 Sayılı Kanunun Uygulama Yönetmeliği • Madde 7 (RG: 21/05/2024 - 32552)',
    body: `<p><strong>MADDE 7 – (1) Kapsam ve İstisna:</strong> Riskli yapılar Ek-2'de yer alan Esaslara göre ve elektronik yazılım programı (ARAAD) kullanılarak tespit edilir. <strong>İnşaat halinde olup ikamet edilmeyen yapılar ile metrukluk veya başka bir sebeple statik bakımdan yapı bütünlüğü bozulmuş olan yapılar riskli yapı tespitine konu edilmez.</strong></p>
    <p><strong>(2) Başvuru ve Kolluk Kuvveti Desteği:</strong><br>
    • <strong>a)</strong> Öncelikle yapı malikleri veya kanunî temsilcileri tarafından yaptırılır. Kat irtifakı/mülkiyeti kurulmadığı için arsa paylı tapu var ise, arsa üzerinde fiilen bulunan yapının riskli yapı tespiti, <strong>yapının sahibi olan arsa payı sahibince</strong> yaptırılır.<br>
    • <strong>c) Engelleme Halinde Kapı Açtırma:</strong> Yapıya/bağımsız bölüme girilmesine izin verilmemesi durumunda mülki idare amirinin yazılı iznine istinaden <strong>kolluk kuvveti marifetiyle kapalı kapıları/alanları açmak veya açtırmak suretiyle resen tespit yapılır/yaptırılır.</strong></p>
    <p><strong>(3) Kayıt Silme (2 Ay / 6 Ay):</strong> Sistemde yapı kaydı oluşturulduktan sonra tespitin <strong>2 ay içerisinde</strong> yapılmaması halinde malik talebiyle, <strong>6 ay içerisinde</strong> yapılmaması halinde Başkanlıkça resen kayıt silinir.</p>
    <p><strong>(4)-(5) Tapu Belirtmesi (10 İş Günü), Ek-6 Askı İlanı (15 Gün) ve İtiraz (15 Gün):</strong> Eksiksiz raporlar <strong>en geç 10 iş günü içinde</strong> tapu müdürlüğüne bildirilir. Ek-6 tutanağı yapıya asılır, maliklere <strong>e-Devlet Kapısı</strong> üzerinden bildirilir ve ilgili <strong>muhtarlıkta 15 gün süre ile ilan edilir</strong> (son günü tebliğ edilmiş sayılır). İlanın son gününden itibaren <strong>15 gün içinde</strong> yapı malikleri veya kanuni temsilcilerince itiraz edilebilir.</p>`
  },
  'yon-m6-7': {
    title: '6306 Uygulama Yönetmeliği MADDE 6 ve MADDE 7 – Lisanslı Kuruluşlar, Riskli Yapı Tespiti ve İtiraz',
    ref: '6306 Sayılı Kanunun Uygulama Yönetmeliği • Madde 6 ve Madde 7',
    body: `<p><strong>Madde 6 (Yetkili Kuruluşlar):</strong> Başkanlık, İdare veya Başkanlıkça lisanslandırılan kuruluşlar (Ek-1 belgeli) ülke genelinde sınır olmaksızın Ek-2 esaslarına göre tespit yapabilir.</p>
    <p><strong>Madde 7 (Tespit, Bildirim ve 15 Gün İtiraz):</strong> İnşaat halindeki ikamet edilmeyen yapılar ile metruk yapılar tespite konu edilmez (m.7/1). Engelleme olursa mülki amir izni ve kolluk kuvvetiyle kapalı kapılar açtırılarak tespit yapılır (m.7/2-c). Onaylanan rapor <strong>10 iş gününde</strong> tapuya bildirilir; Ek-6 tutanağı yapıya asılır, e-Devlet'ten bildirilir ve muhtarlıkta <strong>15 gün ilan edilir</strong> (son günü tebliğ sayılır). İlanın son gününden itibaren <strong>15 gün içinde</strong> Teknik Heyete itiraz edilebilir (m.7/4-5).</p>`
  },
  'yon-m8': {
    title: '6306 Uygulama Yönetmeliği MADDE 8 – Riskli Yapıların Yıktırılması, Güçlendirme ve Yıkım Sonrası Tapu Belirtmesi',
    ref: '6306 Sayılı Kanunun Uygulama Yönetmeliği • Madde 8 (RG: 04/02/2026 - 33158 & Danıştay YD İşlenmiş)',
    body: `<p><strong>MADDE 8 – (1)-(2) Kesinleşme ve Ek-7/A Tebligatı:</strong> Riskli yapı tespitinin kesinleşmesi halinde riskli yapılarda Ek-7/A tutanağı, riskli/rezerv alanlarda ise Ek-7/B tutanağı yapıya asılır, e-Devlet Kapısı üzerinden bildirilir ve muhtarlıkta <strong>15 gün süre ile ilan edilir</strong>.</p>
    <p><strong>(3) 90 Gün Süre, 6 İş Gününde Yıkım Ruhsatı ve Danıştay Kararı:</strong><br>
    • <strong>a)</strong> İdarece <strong>90 günden fazla olmamak üzere</strong> tek seferde süre verilerek tahliye ve yıkım istenir.<br>
    • <strong>b) Yıkım Ruhsatı (6 İş Günü):</strong> Yapının tahliye edildiğine ve elektrik, su, doğalgaz hizmetlerinin kapatıldığına dair belgelerin sunulmasına ve <strong>bina yüksekliği 21,50 m'den fazla olan binalarda yıkım sorumlusu olarak statik fenni mesulün belirlenmesine</strong> istinaden, <strong>maliklerin muvafakati aranmaksızın 6 iş günü içerisinde</strong> düzenlenir.<br>
    • <strong>c) Danıştay YD Kararı:</strong> <em>(Danıştay 4. Dairesinin 12/02/2026 tarihli ve E:2025/5279 sayılı kararı ile hizmetlerin durdurulması bendinin yürütmesi durdurulmuştur.)</em></p>
    <p><strong>(7) Güçlendirme Alternatifi:</strong> Verilen süre içerisinde; güçlendirmenin teknik olarak mümkün olduğunun tespiti, <strong>KMK m.19/2 uyarınca (4/5 çoğunlukla) güçlendirme kararı alınması</strong>, güçlendirme projesi ve ruhsatı alınması gerekir.</p>
    <p><strong>(9) (Değişik: RG-04/02/2026-33158) Yıkım Sonrası Tapu Belirtmesi:</strong> Yıkımdan sonra riskli yapı şerhi terkin edilir ve taşınmazın beyanlar hanesinde <strong>"6306 sayılı Kanun kapsamında olduğuna dair belirtme"</strong> yapılır.</p>`
  },
  'yon-m9-10': {
    title: '6306 Uygulama Yönetmeliği MADDE 9 ve 10 – Teknik Heyetlerin Teşkili ve Çalışma Usulü',
    ref: '6306 Sayılı Kanunun Uygulama Yönetmeliği • Madde 9 ve Madde 10',
    body: `<p><strong>MADDE 9 (Teşkili):</strong> Üniversitelerden <strong>4 öğretim üyesi</strong> ile Bakanlık/Başkanlık teşkilatından <strong>3 üyenin</strong> iştiraki ile <strong>7 üyeli</strong> olarak teşkil edilir.</p>
    <p><strong>MADDE 10 (Çalışma Usulü):</strong> En az 5 üye ile toplanır. Teknik heyet, <strong>itiraz dilekçesinde gösterilen itiraz sebebi ile bağlı olmaksızın</strong> raporu bütün unsurları ile Ek-2 esaslarına göre inceler. <strong>Teknik heyetçe karara bağlanan rapora karşı başka bir malikçe yapılan itiraz üzerine yeniden inceleme yapılmaz!</strong></p>`
  },
  'yon-m12': {
    title: '6306 Uygulama Yönetmeliği MADDE 12 – Taşınmazların Değerinin Tespiti',
    ref: '6306 Sayılı Kanunun Uygulama Yönetmeliği • Madde 12',
    body: `<p><strong>MADDE 12 – (2)-(3):</strong> Taşınmazın değeri; kıymet takdir komisyonları marifetiyle veya hizmet satın alınmak suretiyle, Kamulaştırma Kanununun 11 inci maddesindeki esaslara göre veya <strong>Sermaye Piyasası Kurulu (SPK) tarafından kabul edilen değerleme standartlarına uygun olarak</strong> tespit edilir.</p>`
  },
  'yon-m13': {
    title: '6306 Uygulama Yönetmeliği MADDE 13 (m.13/9 %6 Teminat, m.13/10 Kademeli Satış, m.13/11 İdari Fesih) ve GEÇİCİ MADDE 5',
    ref: '6306 Sayılı Kanunun Uygulama Yönetmeliği • Madde 13 & Geçici Madde 5 (RG: 04/02/2026 - 33158)',
    body: `<p><strong>MADDE 13/7 (Anlaşma İle Satın Alma):</strong> Başkanlıkça satın alma/trampa teklifinin kabulü halinde Ek-5 tutanağı düzenlenir (tapuda ferağ beyanı sayılır).</p>
    <p><strong>MADDE 13/9-c ve GEÇİCİ MADDE 5 (%6 Müteahhit Teminatı):</strong> Riskli yapı parsellerinde yapı ruhsatı alınmadan önce müteahhidince <strong>yapı yaklaşık maliyet bedelinin %6'sı kadar teminatın</strong> İdareye verilmesi mecburidir (1 bodrum hariç en çok 2 katlı ve toplam 500 m²'yi geçmeyen, malikin kendi inşa ettiği ve 3. kişilere satış yapılmayacağı tapuya şerh edilen yapılarda %6 teminat aranmaz). 1/1/2024'ten itibaren düzenlenen ruhsatlardaki teminatlar da talep halinde %6'ya göre yeniden düzenlenir (Geçici m.5).</p>
    <p><strong>MADDE 13/10 (Müteahhit Payının %10 Altında Kademeli Satışı):</strong> İdare inşaatın tamamlanma oranını belirler ve <strong>bu oranın %10 altındaki oranda</strong> müteahhit payına düşen bağımsız birimlerin satışının yapılabileceğini tapu müdürlüğüne bildirir. <strong>İdare yazısı olmadan müteahhide ait bağımsız birimlerin satışı yapılamaz! İnşaat tamamlanma oranında veya üstünde satış için bütün maliklerin (%100) muvafakati gerekir.</strong></p>
    <p><strong>MADDE 13/11 (Sözleşmelerin İdari Feshi):</strong> Müteahhitten kaynaklanan sebeplerle <strong>1 yıl içinde</strong> işe başlanılmamış olması VEYA yapım işinin durdurulmuş ve <strong>en az 6 aydır</strong> projenin bitirilmesini gerektirecek seviyede ekip ve ekipmanla devam edilmiyor olması halinde maliklerin <strong>&gt;%50 salt çoğunluk</strong> kararıyla başvurulur. Müteahhide 15 gün savunma, ardından <strong>30 gün işe başlama ihtarı</strong> verilir. Başlamazsa sözleşmeler <strong>resen feshedilmiş sayılır</strong>. Fesih tarihine kadar müteahhidin ödediği kira yardımları geri talep edilemez.</p>`
  },
  'yon-m15-1-2': {
    title: '6306 Uygulama Yönetmeliği MADDE 15/1 ve 15/2 – Malik Kararı, Salt Çoğunluk (>%50), Toplantı Çağrısı (Ek-12) ve 15 Günlük Teklif Bildirimi (Ek-8)',
    ref: '6306 Sayılı Kanunun Uygulama Yönetmeliği • Madde 15/1 ve 15/2 (Değişik: RG-04/02/2026 - 33158)',
    body: `<p><strong>MADDE 15 – (1):</strong> Öncelikle maliklerce uygulama yapılması esastır. Ortaklığın giderilmesi davası açılmış olması, Kanun kapsamında hisseleri oranında paydaşların salt çoğunluğu ile karar alınmasına engel teşkil etmez.</p>
    <p><strong>(2) (Değişik: RG-04/02/2026-33158):</strong><br>
    • Riskli yapı parsellerinde yapıların yıktırılmış olması şartı aranmaksızın parsellerin tevhit edilmesine, ifraz, taksim, terk, ihdas ve tescil işlemlerine, yeniden bina yaptırılmasına, payların satışına, kat karşılığı veya hasılat paylaşımı ile değerlendirilmesine <strong>sahip oldukları hisseleri oranında paydaşların salt çoğunluğu (&gt;%50) ile karar verilir.</strong><br>
    • <strong>Toplantı Çağrısı (Ek-12):</strong> Maliklerden birinin istemi ile bütün malikler toplantıya çağrılır. Toplantı yeri ve zamanı Ek-12 formuyla muhtarlıkta veya bina kapısında <strong>15 gün süre ile ilan edilmek suretiyle veya noter vasıtasıyla</strong> bildirilir.<br>
    • <strong>Teklif Bildirimi (Ek-8 / Ek-10):</strong> Alınan karar ve anlaşma şartlarını ihtiva eden teklif karara katılmayanlara e-tebligat, noter veya riskli yapılarda Ek-8 formuyla (riskli/rezerv alanlarda Ek-10 formuyla) muhtarlıkta 15 gün ilan edilerek bildirilir ve kabul için <strong>15 gün süre</strong> verilir.</p>`
  },
  'yon-m15-3-4-a': {
    title: '6306 Uygulama Yönetmeliği MADDE 15/3, 15/4 ve MADDE 15/A – Ruhsat Öncesi Satış Başvurusu Şartı ve Açık Artırma Usulü İle Satış',
    ref: '6306 Sayılı Kanunun Uygulama Yönetmeliği • Madde 15/3, 15/4 ve Madde 15/A (Değişik: RG-04/02/2026 - 33158)',
    body: `<p><strong>MADDE 15/4 (Değişik: RG-04/02/2026-33158 – Yapı Ruhsatı Öncesi Zorunlu Şart):</strong><br>
    Hisseleri oranında paydaşların salt çoğunluğu ile alınan karara istinaden <strong>ilgili İdareye yapılacak olan yapı ruhsatı başvurusu öncesinde; alınan karar ile anlaşma şartlarını ihtiva eden teklifin karara katılmayan maliklere (Ek-8 ile) tebliğ edilmiş olması VE bu maliklerin hisselerinin 15/A maddesi uyarınca satışı için Müdürlüğe veya İdareye müracaatta bulunulmuş olması gerekir!</strong></p>
    <p><strong>MADDE 15/A (Açık Artırma Usulü İle Satış):</strong><br>
    • Toplantı davet belgeleri (Ek-12), toplantı ve salt çoğunluk karar tutanağı, 15 günlük teklif bildirim belgeleri (Ek-8) ve SPK değerleme raporu ile başvurulur. <strong>Satış için yapıların yıktırılmış olması gerekmez.</strong><br>
    • Satış yeri ve zamanı riskli yapılarda Ek-9 tutanağı (alanlarda Ek-11 tutanağı) ile bildirilir. İlk satışa yalnız anlaşan paydaşlar katılır; alınmazsa sonraki satışlar Ek-13 formuyla (04.02.2026) 15 gün ilan edilir ve anlaşmaya uymayı kabul edip rayiç değerin <strong>%10'u nakit teminat</strong> yatıran <strong>üçüncü şahıslar</strong> da katılabilir (7 gün içinde bedel yatırılıp sözleşme imzalanır).</p>`
  },
  'yon-m15-6-7': {
    title: '6306 Uygulama Yönetmeliği MADDE 15/6 ve 15/7 – Aynı Parselde Birden Fazla Yapı Bulunması',
    ref: '6306 Sayılı Kanunun Uygulama Yönetmeliği • Madde 15/6 ve Madde 15/7',
    body: `<p><strong>MADDE 15/6 (Yapıların Tamamı Riskli İse):</strong> Bir parselde birden fazla yapı bulunması ve <strong>bu yapıların tamamının riskli yapı olarak tespit edilmiş olması halinde</strong>, yürütülecek uygulamalara yapının paydaşı olup olmadıkları gözetilmeksizin <strong>sahip oldukları hisseleri oranında bütün paydaşların salt çoğunluğu (&gt;%50) ile</strong> karar verilir.</p>
    <p><strong>MADDE 15/7 (Yapılardan Yalnızca Bazıları Riskli İse):</strong><br>
    • <strong>a)</strong> Tapu kütüğüne sadece riskli olarak tespit edilen yapıların açık adresi belirtilerek şerh işlenir.<br>
    • <strong>b)</strong> Uygulamalara <strong>sadece riskli olarak tespit edilen yapıların paydaşlarının salt çoğunluğu (&gt;%50) ile</strong> karar verilir.<br>
    • <strong>c)-ç)</strong> Diğer maliklerin hakları korunur; riskli yapı alanının <strong>ifrazı mümkün ise</strong> ifraz, taksim, terk, ihdas ve tescil işlemleri <strong>resen</strong> yapılır.</p>`
  },
  'yon-m15': {
    title: '6306 Uygulama Yönetmeliği MADDE 15/6 ve 15/7 – Aynı Parselde Birden Fazla Yapı Bulunması',
    ref: '6306 Sayılı Kanunun Uygulama Yönetmeliği • Madde 15/6 ve Madde 15/7',
    body: `<p><strong>Madde 15/6 (Tüm Yapılar Riskli İse):</strong> Yapının paydaşı olup olmadıkları gözetilmeksizin parseldeki <strong>bütün paydaşların salt çoğunluğu (&gt;%50)</strong> ile karar verilir.</p>
    <p><strong>Madde 15/7 (Yalnız Bazı Yapılar Riskli İse):</strong> Tapu şerhi yalnız riskli yapıların açık adresiyle işlenir. Kararı yalnız <strong>riskli yapıların paydaşları kendi aralarında &gt;%50 çoğunlukla</strong> alır. Diğer (risksiz) maliklerin hakları korunur; mümkünse resen ifraz yapılır.</p>`
  },
  'yon-m15-8': {
    title: '6306 Uygulama Yönetmeliği MADDE 15/8 – İki Riskli Yapı Parselinin Tevhidi (Birleştirilmesi), Boş Parsel Şartı ve Yeni Parselde Karar',
    ref: '6306 Sayılı Kanunun Uygulama Yönetmeliği • Madde 15/8 (Değişik: RG-04/02/2026 - 33158)',
    body: `<p><strong>MADDE 15/8 (Değişik: RG-04/02/2026-33158) Resmi Metni:</strong><br>
    "Üzerindeki yapıların tamamının riskli yapı olarak tespit edilmiş olması şartı ile tevhidi mümkün olan birden fazla parselin tevhit edilmesi ile taksim, terk, ihdas ve tapuya tescil işlemlerine, <strong>her parselde ayrı ayrı sahip oldukları hisseleri oranında paydaşların salt çoğunluğu ile karar verilir.</strong><br><br>
    Bu parsel veya parsellerin arasında veya bitişiğinde bulunan <strong>yapılaşmamış boş parsellerin</strong>, riskli yapıların bulunduğu parsellerle tevhit edilmek suretiyle birlikte değerlendirilebilmesi için Planlı Alanlar İmar Yönetmeliğinin 7 nci maddesinin üçüncü fıkrası hükmü saklı olmak üzere <strong>boş parsellerdeki bütün maliklerin, oybirliği ile karar alması gerekir.</strong><br><br>
    <strong>Tevhitten sonra yapılacak uygulamaya tevhit ile oluşan parselde sahip oldukları hisseleri oranında paydaşların salt çoğunluğu ile karar verilir.</strong>"</p>`
  },
  'yon-m15-9-12': {
    title: '6306 Uygulama Yönetmeliği MADDE 15/9 ve 15/12 – Hak ve Şerhlerin Devamı ile Kat İrtifakı / Kat Mülkiyeti Tesisi',
    ref: '6306 Sayılı Kanunun Uygulama Yönetmeliği • Madde 15/9 ve Madde 15/12',
    body: `<p><strong>MADDE 15/9 (Hak ve Şerhlerin Devamı):</strong> Yapıların yıktırılmasından sonra sicilde bulunan ayni ve şahsi haklar ile şerhler (ipotek, haciz, intifa vb.) hisseler üzerinde devam eder; tevhit, ifraz, kat irtifakı ve kat mülkiyeti tesisine engel teşkil etmez ve muvafakat aranmaz.</p>
    <p><strong>MADDE 15/12 (Kat İrtifakı ve Kat Mülkiyeti):</strong> Kat karşılığı sözleşmede hak sahiplerine isabet eden bağımsız bölümlerin belirlenmiş olması şartıyla kat irtifakı/kat mülkiyeti tesisi Başkanlık, TOKİ veya İdare tarafından yapılır. <strong>Onaylı mimari proje ile yönetim planında malik imzası aranmaz!</strong></p>`
  },
  'yon-m15-10': {
    title: '6306 Uygulama Yönetmeliği MADDE 15/10 – Başka Parselde Uygulama ve İmar Hakkı Aktarımı',
    ref: '6306 Sayılı Kanunun Uygulama Yönetmeliği • Madde 15/10 (Değişik: RG-04/02/2026 - 33158)',
    body: `<p><strong>MADDE 15/10 (Değişik: RG-04/02/2026-33158) Resmi Metni:</strong><br>
    "Uygulama alanında <strong>zeminden kaynaklanan sebeplerle veya herhangi bir afet riskinden dolayı veyahut mevzuata göre yapılaşma hakkının olmamasından dolayı yeni yapı yapılması mümkün değil ise</strong>, uygulama alanındaki yapının yerine yapılacak yeni yapı, uygulama alanı dışında <strong>başka bir parselde</strong> yapılabilir. Riskli yapının bulunduğu parselin yapılaşma hakkının, <strong>imar hakkı aktarımı ile başka bir parsele taşınması durumunda; maliklerin tamamının aynı parselde şuyulandırılması ve bu parseldeki diğer maliklerin muvafakatinin olması şartıyla</strong>, yeni parseldeki uygulamalar Kanun kapsamında yürütülür."</p>`
  },
  'yon-m15b': {
    title: '6306 Uygulama Yönetmeliği MADDE 15/B – Kentsel Dönüşüm Danışmanlık Kuruluşları ve Danıştay İptal Kararı',
    ref: '6306 Sayılı Kanunun Uygulama Yönetmeliği • Madde 15/B (Danıştay 8. Dairesi 02/06/2026 Kararı İşlenmiş)',
    body: `<p><strong>MADDE 15/B:</strong> Başkanlıkça lisanslandırılan (600.000 TL teminatlı) danışmanlık şirketleridir. Kanun kapsamındaki uygulamalar ile karar alınması ve yürütülmesi süreçlerinde yazılı <strong>danışmanlık hizmeti</strong> verirler.<br>
    <em>🚨 Danıştay 8. Dairesinin 02/06/2026 tarihli (E:2024/5003, K:2026/3501) kararı ile "uyuşmazlıkların çözüme kavuşturulması / müzakere" yetkileri İPTAL edilmiştir.</em></p>`
  },
  'yon-m16': {
    title: '6306 Uygulama Yönetmeliği MADDE 16 – Kira Yardımı, Faiz Destekli Kredi ve 1,5 Kat Harç Muafiyeti',
    ref: '6306 Sayılı Kanunun Uygulama Yönetmeliği • Madde 16 (Değişik: RG-04/02/2026 - 33158)',
    body: `<p><strong>MADDE 16/1–7 (Kira Yardımı ve Kredi):</strong> Kira yardımı süresi riskli yapılarda <strong>18 ay</strong>, riskli ve rezerv yapı alanlarında <strong>48 aya</strong> kadardır. Kiracılara <strong>2 katı</strong>, kapıcı ve sınırlı ayni hak sahiplerine <strong>5 katı</strong> defaten ödenir. Kira yardımı başvurusu tahliye/yıkımdan itibaren <strong>1 yıl içinde</strong>, faiz destekli kredi başvurusu <strong>en geç 3 yıl içinde</strong> yapılır.</p>
    <p><strong>MADDE 16/10–11 (1,5 Kat Harç Muafiyeti ve Tevhit Oranlaması):</strong> Özel sektör uygulamalarında <strong>mevcut inşaat alanının 1,5 katına kadar olan yeni inşaat alanı için belediyelerce harç ve ücret alınmaz!</strong> Boş parsellerle tevhit veya imar hakkı aktarımında tapu harç muafiyeti, riskli parsel alanının yeni parsel alanına oranı nispetinde uygulanır (m.16/11 - 04.02.2026).</p>`
  },
  'yon-m8-17': {
    title: '6306 Uygulama Yönetmeliği MADDE 8 ve MADDE 17 Karşılaştırması – Parsel Bazında Riskli Yapı Yıkımı vs. Alan Uygulamalarında Yıkım',
    ref: '6306 Sayılı Kanunun Uygulama Yönetmeliği • Madde 8 ve Madde 17',
    body: `<p><strong>1) Parsel Bazındaki Riskli Yapı (MADDE 8):</strong> Riskli yapı tespiti kesinleştikten sonra Ek-7/A tutanağı ile maliklere <strong>90 günden fazla olmamak üzere</strong> tek seferde tahliye ve yıkım süresi verilir; abonelikler kesilip tahliye sağlandığında <strong>6 iş günü içinde</strong> yıkım ruhsatı düzenlenir.</p>
    <p><strong>2) Riskli Alan veya Rezerv Yapı Alanı (MADDE 17):</strong> Alan uygulamalarında kurum takvimine göre <strong>15 gün</strong> veya salt çoğunluk anlaşmasındaki sürede (belirtilmemişse en az 30 gün) tahliye istenir; tahliye edilmezse Ek-7/B tutanağı ile en az 30 gün süre verilerek zorla tahliye ve yıkım uygulanır.</p>`
  },
  'yon-m18-19': {
    title: '6306 Uygulama Yönetmeliği MADDE 18 ve 19 – Planlama Süreci ve Planların Değerlendirilmesi',
    ref: '6306 Sayılı Kanunun Uygulama Yönetmeliği • Madde 18 ve Madde 19',
    body: `<p><strong>MADDE 18 & 19:</strong> Bakanlık; riskli alan, rezerv yapı alanı ve riskli yapı parsellerine ilişkin her tür ve ölçekteki planı resen yapmaya ve onaylamaya yetkilidir. İlçe belediyesi plan tekliflerinde büyükşehir belediyesi <strong>15 gün içinde</strong>, sit alanlarında Kültür ve Turizm Bakanlığı <strong>30 gün içinde</strong> görüş bildirir.</p>`
  }
};

// 6. METİN İÇİNDEKİ "Ek-1" .. "Ek-13" İFADELERİNİ GÖRÜNTÜYÜ BOZMAYAN RENKLİ TIKLANABİLİR ROZETE DÖNÜŞTÜRME
const EK_TOKEN_REGEX = /\b(Ek-(?:13|12|11|10|9|8|7\/A|7\/B|7|6|5|4|3|2|1))(?![A-Za-z0-9])/g;

function linkifyYonEkInElement(rootEl) {
  if (!rootEl) return;
  const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const p = node.parentElement;
      if (!p) return NodeFilter.FILTER_REJECT;
      if (p.closest('a, button, h1, h2, h3, script, style, textarea, input, select, .yon-ek-chip, .template-box')) {
      return NodeFilter.FILTER_REJECT;
      }
      EK_TOKEN_REGEX.lastIndex = 0;
      return EK_TOKEN_REGEX.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });

  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  textNodes.forEach(node => {
    const text = node.nodeValue;
    EK_TOKEN_REGEX.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let lastIdx = 0;
    let match;
    while ((match = EK_TOKEN_REGEX.exec(text)) !== null) {
      if (match.index > lastIdx) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
      }
      const ekCode = match[1];
      const chip = document.createElement('span');
      chip.className = 'yon-ek-chip';
      chip.textContent = ekCode;
      chip.title = `${ekCode} Resmi Form / Tutanak Şablonunu Yan Ekranda Aç`;
      chip.setAttribute('onclick', `openYonEk('${ekCode}', event)`);
      frag.appendChild(chip);
      lastIdx = EK_TOKEN_REGEX.lastIndex;
    }
    if (lastIdx < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIdx)));
    }
    node.parentNode.replaceChild(frag, node);
  });
}

// 7. CİLT 4'TEKİ 34 BAKANLIK SORU-CEVAP TABLOSUNA OTOMATİK MEVZUAT BUTONU EKLEME
function enhanceCilt4GorusTable() {
  const rowMap = {
    'q-1-1': { key: 'ant-m22', label: '⚖️ m.22 & Balkon' },
    'q-1-2': { key: 'ant-m22', label: '⚖️ m.22 & Teras' },
    'q-1-4': { key: 'paiy-m4', label: '⚖️ PAİY m.5/6 & m.20' },
    'q-2-1': { key: 'ant-m34', label: '⚖️ m.34 Asansör & Kat' },
    'q-3-1': { key: 'ant-m11-18', label: '⚖️ m.11–18 Kot & Kazı' },
    'q-4-1': { key: 'imark-m28', label: '⚖️ İmar K. m.28/10 & m.64/12' },
    'q-4-5': { key: 'paiy-m59', label: '⚖️ PAİY m.59 Tadilat' },
    'q-5-1': { key: 'paiy-m59', label: '⚖️ PAİY m.59 Sundurma/Tiny' },
    'q-6-1': { key: 'otopark-m8-12', label: '⚖️ Otopark Yön. m.8 & m.12' },
    'q-7-1': { key: 'plansiz-m63', label: '⚖️ Sığınak m.8 & Bağ Evi m.63' }
  };
  Object.keys(rowMap).forEach(rowId => {
    const tr = document.getElementById(rowId);
    if (!tr) return;
    const lastTd = tr.querySelector('td:last-child');
    if (lastTd && !lastTd.querySelector('.auto-law-btn')) {
      const btn = document.createElement('button');
      btn.className = 'law-link auto-law-btn';
      btn.innerHTML = rowMap[rowId].label;
      btn.onclick = () => openSplitLaw(rowMap[rowId].key);
      lastTd.appendChild(document.createTextNode(' '));
      lastTd.appendChild(btn);
    }
    if (rowId === 'q-7-1' && lastTd && !lastTd.querySelector('.auto-law-btn-2')) {
      const btn2 = document.createElement('button');
      btn2.className = 'law-link auto-law-btn-2';
      btn2.innerHTML = '⚖️ Sığınak m.8';
      btn2.onclick = () => openSplitLaw('siginak-m8');
      const btn3 = document.createElement('button');
      btn3.className = 'law-link auto-law-btn-2';
      btn3.innerHTML = '⚖️ Yangın m.48';
      btn3.onclick = () => openSplitLaw('yangin-m48');
      lastTd.appendChild(btn2);
      lastTd.appendChild(btn3);
    }
  });
}

// 8. SAYFA YÜKLENDİĞİNDE ORTAK SOL FİHRİST, ÜST BAR, İKİZ EKRAN VE KILAVUZU OLUŞTUR
window.addEventListener('DOMContentLoaded', () => {
  const activeCilt = document.body.getAttribute('data-cilt') || '1';
  injectSharedLayout(activeCilt);
  cleanPageMathArtifacts(document.body);
  linkifyYonEkInElement(document.querySelector('.main-content'));
  enhanceCilt4GorusTable();
  renderUserNotes();
  initSplitToolsDefaults();
  if (activeQuizData.length > 0) renderQuiz();

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      toggleSidebar();
    }
    if (e.key === 'Escape') {
      closeKilavuzModal();
    }
  });
});

function injectSharedLayout(activeCilt) {
  const dynStyle = document.createElement('style');
  dynStyle.textContent = `
    .active-split-source {
      background-color: #fef9c3 !important;
      color: #0f172a !important;
      outline: 3px solid #f59e0b !important;
      border-radius: 6px;
      transition: all 0.3s ease;
    }
    tr.active-split-source td {
      background-color: #fef9c3 !important;
      color: #0f172a !important;
    }
    .yon-ek-chip {
      display: inline-block;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #6ee7b7;
      padding: 0px 6px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 0.88em;
      cursor: pointer;
      transition: all 0.15s ease;
      text-decoration: underline;
      text-decoration-color: #34d399;
      text-underline-offset: 2px;
    }
    .yon-ek-chip:hover {
      background: #059669;
      color: #ffffff;
      border-color: #047857;
      text-decoration: none;
      transform: translateY(-1px);
      box-shadow: 0 2px 6px rgba(5,150,105,0.25);
    }
    .tool-mini-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 14px;
      box-shadow: 0 1px 4px rgba(15,23,42,0.04);
    }
    .tool-mini-card h4 {
      font-size: 0.91rem;
      color: #0f172a;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
    }
    .tool-grid-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
      gap: 8px;
      margin-bottom: 10px;
    }
    .tool-mini-card label {
      font-size: 0.72rem;
      font-weight: 600;
      color: #475569;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
      margin-bottom: 4px;
      min-height: 18px;
      white-space: nowrap;
    }
    .tool-mini-card input, .tool-mini-card select {
      width: 100%;
      padding: 6px 8px;
      border-radius: 6px;
      border: 1px solid #94a3b8;
      font-size: 0.81rem;
      font-weight: 600;
      color: #0f172a;
      background: #f8fafc;
    }
    .tool-mini-card input::placeholder {
      color: #94a3b8;
      font-weight: 400;
      font-style: italic;
    }
    .info-i-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 17px;
      height: 17px;
      flex-shrink: 0;
      background: #e0f2fe;
      color: #0369a1;
      border: 1px solid #7dd3fc;
      border-radius: 50%;
      font-family: Georgia, serif;
      font-style: italic;
      font-size: 0.72rem;
      font-weight: 700;
      cursor: pointer;
      user-select: none;
      transition: 0.15s;
    }
    .info-i-btn:hover {
      background: #0284c7;
      color: #ffffff;
    }
    .info-popover-box {
      display: none;
      background: #fffbeb;
      border: 1px solid #fcd34d;
      border-left: 4px solid #d97706;
      padding: 8px 10px;
      border-radius: 6px;
      font-size: 0.77rem;
      color: #78350f;
      margin-bottom: 10px;
      line-height: 1.5;
    }
    .timeline-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 8px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.79rem;
    }
    .timeline-row:last-child { border-bottom: none; }
    .timeline-badge {
      background: #0f172a;
      color: #fbbf24;
      padding: 2px 8px;
      border-radius: 5px;
      font-weight: 700;
      font-size: 0.76rem;
      white-space: nowrap;
    }
  `;
  document.head.appendChild(dynStyle);
  const fav = document.createElement('link');
  fav.rel = 'icon'; fav.href = 'logo.png';
  const touchIcon = document.createElement('link');
  touchIcon.rel = 'apple-touch-icon'; touchIcon.href = 'logo.png';
  document.head.appendChild(fav);
  document.head.appendChild(touchIcon);
  const popup = document.createElement('div');
  popup.id = 'selectionPopup';
  popup.innerHTML = '📝 Seçimi Notlarıma Ekle';
  popup.onmousedown = addSelectedTextToNotes;
  document.body.appendChild(popup);

  const retBtn = document.createElement('button');
  retBtn.id = 'returnBtn';
  retBtn.innerHTML = '⬅ Okuduğum Cümleye Geri Dön';
  retBtn.onclick = returnToReading;
  document.body.appendChild(retBtn);

  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.innerHTML = `
    <div class="sidebar-header">
      <div class="sidebar-title-row">
        <div class="sidebar-title">📚 Kentsel Dönüşüm Kütüphanesi</div>
        <button class="sidebar-close-btn" onclick="toggleSidebar()" title="Fihristi Gizle (Cmd+B)">◀ Gizle</button>
      </div>
      <div class="sidebar-subtitle">Ortak Akıllı Fihrist (Cilt 1 • 2 • 3 • 4)</div>
      <input type="text" id="fihristSearch" class="search-box" placeholder="🔍 Konu, parsel, madde veya Ek ara..." oninput="filterFihrist()">
      <div id="liveSearchResults" style="display:none; margin-top:8px; max-height:62vh; overflow-y:auto; background:#0f172a; border:1px solid #fbbf24; border-radius:8px; padding:6px;"></div>
    </div>
    <div class="fihrist-container" id="fihristList">
      <div class="cilt-group">
        <div class="cilt-header ${activeCilt==='1'?'active-cilt':''}" onclick="toggleCilt(this)"><span>📘 CİLT 1: İmar, Plan ve Hesaplar</span><span>▾</span></div>
        <ul class="cilt-links">
          <li><a href="cilt1.html#bolum-1">1. Belediye E-İmar Yazı ve Semboller Rehberi</a></li>
          <li><a href="cilt1.html#bolum-1-nizam">↳ Yapı Nizamları, Daire İçi Değerler & TAKS/KAKS</a></li>
          <li><a href="cilt1.html#bolum-2">2. EK-1d Uygulama İmar Planı Gösterimleri</a></li>
          <li><a href="cilt1.html#bolum-3">3. Toplam İnşaat Alanı ve 1,70 Çıkma Hesabı</a></li>
          <li><a href="cilt1.html#bolum-4">4. Saha Analizleri (1291/8 & Kepez 27594/1)</a></li>
          <li><a href="cilt1.html#bolum-5">📎 Cilt 1 Ekler (Ek-1A .. Ek-1F Malik Krokisi)</a></li>
          <li><a href="cilt1.html#bolum-6">🎓 Cilt 1 Soru ve Vaka Değerlendirme Testi</a></li>
        </ul>
      </div>
      <div class="cilt-group">
        <div class="cilt-header ${activeCilt==='2'?'active-cilt':''}" onclick="toggleCilt(this)"><span>📗 CİLT 2: 6306 Kanun ve Çoklu Yapılar</span><span>▾</span></div>
        <ul class="cilt-links">
          <li><a href="cilt2.html#bolum-1">1. 6306 Tanımlar, 16 Ana Konu & 10 Aşamalı Süreç</a></li>
          <li><a href="cilt2.html#bolum-2">2. Riskli Yapı Süreci: Başvuru, İlan, İtiraz, Yıkım</a></li>
          <li><a href="cilt2.html#bolum-3">3. 6306 Yönetmelik Hükümleri & Parsel Tevhidi (2026)</a></li>
          <li><a href="cilt2.html#bolum-3-tevhit">↳ İki Riskli Parselin Tevhidi (m.15/8) & Aktarım (m.15/10)</a></li>
          <li><a href="cilt2.html#bolum-3-teminat">↳ Teminat (%6), Satış (%10), Fesih ve m.8/m.17 Farkı</a></li>
          <li><a href="cilt2.html#bolum-4">4. 2023-2026 Değişiklikleri & Güçlendirme (KMK m.19/2)</a></li>
          <li><a href="cilt2.html#bolum-5">5. Harç Muafiyetleri (1,5 Kat), İade ve Kira Yardımı</a></li>
          <li><a href="cilt2.html#bolum-6">6. İdari Fesih (m.13/11), Davalar, İmar K. ve SSS</a></li>
          <li><a href="cilt2.html#bolum-7">7. Çoklu Ruhsatsız Riskli Yapılar (m.15/6 ve 15/7)</a></li>
          <li><a href="cilt2.html#bolum-8">8. 15 Dakikalık Malik Toplantısı ve 91 Hissedar Modeli</a></li>
          <li><a href="cilt2.html#bolum-9">📎 Cilt 2 Ekler (Emsal Kararlar, İlan ve Formlar)</a></li>
          <li><a href="cilt2.html#bolum-10">🎓 Cilt 2 Soru ve Vaka Değerlendirme Testi</a></li>
        </ul>
      </div>
      <div class="cilt-group">
        <div class="cilt-header ${activeCilt==='3'?'active-cilt':''}" onclick="toggleCilt(this)"><span>📙 CİLT 3: Dosyalama, Müteahhit ve Sözleşme</span><span>▾</span></div>
        <ul class="cilt-links">
          <li><a href="cilt3.html#bolum-1">1. Kentsel Dönüşüm Dosyası 9 Aşamalı Sistem</a></li>
          <li><a href="cilt3.html#bolum-2">2. Ana Evrak Kontrol Listesi (A1 – H5 Tablosu)</a></li>
          <li><a href="cilt3.html#bolum-3">3. Lisanslı Kuruluş Teknik Dosya İçeriği</a></li>
          <li><a href="cilt3.html#bolum-4">4. Dilekçe ve Tutanak Şablonları Rehberi</a></li>
          <li><a href="cilt3.html#bolum-5">5. Müteahhit Yetki Sınıfları (A–H & Y1–Y3)</a></li>
          <li><a href="cilt3.html#bolum-6">6. Sınırlı Vekaletname vs Geniş Vekaletname (Ek-3L)</a></li>
          <li><a href="cilt3.html#bolum-7">7. Kat Karşılığı Yer Gösterme Belgesi (%4 + KDV)</a></li>
          <li><a href="cilt3.html#bolum-8">📎 Cilt 3 Ekler (Ek-3A .. Ek-3L Vekaletname)</a></li>
          <li><a href="cilt3.html#bolum-9">🎓 Cilt 3 Soru ve Vaka Değerlendirme Testi</a></li>
        </ul>
      </div>
      <div class="cilt-group">
        <div class="cilt-header ${activeCilt==='4'?'active-cilt':''}" onclick="toggleCilt(this)"><span>⚖️ CİLT 4: Mevzuat ve Bakanlık Görüşleri</span><span>▾</span></div>
        <ul class="cilt-links">
          <li><a href="cilt4.html#bolum-1">1. Canlı Mevzuat Takip & 10 Yasal Danışma Kaynağı</a></li>
          <li><a href="cilt4.html#bolum-2">2. 6306 Uygulama Yönetmeliği (Madde 1–22 & 2026)</a></li>
          <li><a href="cilt4.html#bolum-3">3. Antalya Büyükşehir Belediyesi İmar Yönetmeliği</a></li>
          <li><a href="cilt4.html#bolum-4">4. Bakanlık Açıklamalı Soru-Cevap Rehberi (34 Görüş)</a></li>
          <li><a href="cilt4.html#bolum-5">📎 Cilt 4 Ekler: Bakanlık Resmi Görüş Yazıları</a></li>
          <li><a href="cilt4.html#bolum-6">🎓 Cilt 4 Soru ve Vaka Değerlendirme Testi</a></li>
        </ul>
      </div>
    </div>
  `;
  document.body.insertBefore(sidebar, document.body.firstChild);

  const topSlot = document.getElementById('topNavSlot');
  if (topSlot) {
    topSlot.outerHTML = `
      <div class="top-nav">
        <div class="cilt-tabs">
         <button class="fihrist-toggle-btn" onclick="toggleSidebar()" title="Sol Fihristi Aç / Kapat (Cmd+B)">☰ Fihrist</button>
          <a href="index.html" class="cilt-tab ${activeCilt==='0'?'active':''}">🏠 Ana Sayfa</a>
        <a href="cilt1.html" class="cilt-tab ${activeCilt==='1'?'active':''}">📘 CİLT 1: İmar & Hesaplar</a>
          <a href="cilt2.html" class="cilt-tab ${activeCilt==='2'?'active':''}">📗 CİLT 2: 6306 & Parsel Tevhidi</a>
          <a href="cilt3.html" class="cilt-tab ${activeCilt==='3'?'active':''}">📙 CİLT 3: Dosya, Müteahhit & Vekalet</a>
          <a href="cilt4.html" class="cilt-tab ${activeCilt==='4'?'active':''}">⚖️ CİLT 4: Mevzuat & 34 Görüş</a>
        </div>
        <div class="top-actions">
          <button class="action-pill" style="background:#e0f2fe; color:#0369a1; border-color:#7dd3fc;" onclick="openKilavuzModal()">❓ Kılavuz</button>
          <button class="action-pill" style="background:#dcfce7; color:#047857; border-color:#6ee7b7;" onclick="openSplitTools()">⚡ Araçlar & Süreler</button>
          <button class="action-pill" onclick="openSplitLaw('yon-m15-8')">⚖️ İkiz Ekran Mevzuat</button>
          <button class="action-pill notes-pill" onclick="openSplitNotes()">📝 Notlarım (<span id="noteCountBadge">0</span>)</button>
        </div>
      </div>
    `;
  }

  const splitPanel = document.createElement('aside');
  splitPanel.className = 'split-panel';
  splitPanel.id = 'splitPanel';
  splitPanel.innerHTML = `
    <div class="split-header">
      <div class="split-tabs">
        <button class="split-tab-btn active" id="tabBtnLaw" onclick="switchSplitTab('law')">⚖️ Mevzuat & Formlar</button>
        <button class="split-tab-btn" id="tabBtnTools" onclick="switchSplitTab('tools')">⚡ Araçlar & Süreler</button>
        <button class="split-tab-btn" id="tabBtnNotes" onclick="switchSplitTab('notes')">📝 Notlarım (<span id="splitNoteCount">0</span>)</button>
      </div>
      <div class="split-controls">
        <button class="split-ctrl-btn" style="background:#d97706; color:#fff;" onclick="scrollToSplitSource()" title="Sol sayfada bu ekranı açan satırın tam karşısına git">🎯 Açan Satır</button>
        <button class="split-ctrl-btn" onclick="toggleSidebar()" title="Sol Fihristi Aç/Kapat">☰ Fihrist</button>
        <button class="split-ctrl-btn" onclick="toggleSplitWidth()" title="Paneli Genişlet/Daralt">⤢ Genişlik</button>
        <button class="split-ctrl-btn close" onclick="closeSplitPanel()">✕ Kapat</button>
      </div>
    </div>
    <div class="split-body">
      <!-- SEKME 1: MEVZUAT VE RESMİ FORMLAR -->
      <div id="splitLawView">
        <div style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:8px; padding:8px 10px; margin-bottom:12px;">
          <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
            <strong style="font-size:0.75rem; color:#1e293b;">⚡ Hızlı Madde / Form Seç:</strong>
            <select id="quickLawSelect" onchange="if(this.value) openSplitLaw(this.value)" style="flex:1; min-width:170px; padding:5px 8px; border-radius:5px; border:1px solid #94a3b8; font-size:0.76rem; font-weight:600;">
              <option value="">⚖️ Mevzuat Maddesi Seçin...</option>
              <optgroup label="6306 Uygulama Yönetmeliği (2026)">
                <option value="yon-m6">Madde 6 – Lisanslı Kuruluşlar</option>
                <option value="yon-m7">Madde 7 – Riskli Yapı Tespiti & İtiraz (Ek-6)</option>
                <option value="yon-m8">Madde 8 – Yıkım (90 Gün), Ruhsat (6 İş Günü) & Güçlendirme</option>
                <option value="yon-m9-10">Madde 9 ve 10 – 7 Üyeli Teknik Heyet</option>
                <option value="yon-m12">Madde 12 – SPK Değer Tespiti</option>
                <option value="yon-m13">Madde 13 – %6 Teminat, %10 Kademeli Satış & İdari Fesih</option>
                <option value="yon-m15-1-2">Madde 15/1 ve 15/2 – Salt Çoğunluk (>%50), Ek-12 & Ek-8</option>
                <option value="yon-m15-3-4-a">Madde 15/3, 15/4 ve 15/A – Ruhsat Öncesi Şart & Açık Artırma</option>
                <option value="yon-m15-6-7">Madde 15/6 ve 15/7 – Çok Yapılı Parseller Karar Ağacı</option>
                <option value="yon-m15-8">Madde 15/8 – İki Riskli Parselin Tevhidi & Boş Parsel</option>
                <option value="yon-m15-9-12">Madde 15/9 ve 15/12 – Şerhlerin Devamı & Kat İrtifakı</option>
                <option value="yon-m15-10">Madde 15/10 – Başka Parselde Uygulama & İmar Aktarımı</option>
                <option value="yon-m15b">Madde 15/B – Danışmanlık Kuruluşları & Danıştay İptali</option>
                <option value="yon-m16">Madde 16 – Kira Yardımı (18/48 Ay) & 1,5 Kat Harç Muafiyeti</option>
                <option value="yon-m8-17">Madde 8 ve Madde 17 – Yapı vs. Alan Yıkımı Farkı</option>
                <option value="yon-m18-19">Madde 18 ve 19 – Planlama ve Değerlendirme</option>
              </optgroup>
              <optgroup label="Antalya İmar, Otopark, Sığınak, Bağ Evi & Sözleşme">
                <option value="paiy-m4">PAİY m.4, m.5/6, m.20/3 – TAKS, KAKS ve Yapı Zarfı</option>
                <option value="kepez-27594">Kepez 27594/1 – İBT, 157 m Mânia & Halihazır Gri Yapılar</option>
                <option value="ant-m6">Antalya İmar Yön. m.6–7 – İfraz ve Tevhitte Alan Kuralı</option>
                <option value="ant-m9">Antalya İmar Yön. m.9 – Yol Genişliği Kat Adedi & Cephe</option>
                <option value="ant-m11-18">Antalya İmar Yön. m.11–18 – Kotlandırma, Köşe Parsel & Kazı</option>
                <option value="ant-m22">Antalya İmar Yön. m.22 – %20 Konsol Balkon & %30 Emsal Dışı</option>
                <option value="ant-m23">Antalya İmar Yön. m.23 – Bahçe Mesafeleri & 30 m²'ye 1 Ağaç</option>
                <option value="ant-m34">Antalya İmar Yön. m.34 – Bodrum Katlarda Asansör & 1+1 İstisnası</option>
                <option value="ant-m41">Antalya İmar Yön. m.41 – Açık/Kapalı Çıkmalar & 1,70 Katsayı</option>
                <option value="imark-m28">İmar K. m.28/10 & m.64/12 – SGK Borcu ve İmzadan İmtinada İskân</option>
                <option value="paiy-m59">PAİY m.59 – Pergola, Sundurma, Tiny House, Karavan & GES</option>
                <option value="otopark-m8-12">Otopark Yön. m.8 & m.12 – Mahsup Yasağı, %50 İndirim & 36 Ay Taksit</option>
                <option value="siginak-m8">Sığınak Yön. m.8 – Kişi Başı 1 m² ve Salonun Oda Sayılması</option>
                <option value="plansiz-m63">Plansız Alanlar m.45, 50, 63, 64 – Bağ Evi (75/150/250 m²) & Köy</option>
                <option value="yangin-m48">Yangın Yön. m.48 – 21,50 m / 30,50 m Merdiven ve 120 dk Bodrum</option>
                <option value="mut-sinif">Müteahhitlik Yön. (31301) – A–H Yapı ve Y1–Y3 Yıkım Sınıfları</option>
                <option value="vekalet-tbk504">TBK m.504 & Ek-3L – Geniş Vekaletname Riskleri (Ferağ/Ahzu Kabz)</option>
                <option value="yergosterme-ek3k">Taşınmaz Ticareti & Ek-3K – Kat Karşılığı Yer Gösterme (%4+KDV)</option>
                <option value="ehliyet-tmk">TMK m.9–15 & Noterlik K. m.72 – 65 Yaş Üstü Ehliyet Raporu</option>
              </optgroup>
            </select>
            <select id="quickEkSelect" onchange="if(this.value) openYonEk(this.value)" style="padding:5px 8px; border-radius:5px; border:1px solid #059669; background:#ecfdf5; color:#047857; font-size:0.76rem; font-weight:700;">
              <option value="">📋 Ek-1..13 Form Seç...</option>
              <option value="Ek-1">Ek-1: Lisans Belgesi</option>
              <option value="Ek-2">Ek-2: Risk Tespiti Esasları (25m/8 Kat)</option>
              <option value="Ek-3">Ek-3: Lisans Taahhütnamesi</option>
              <option value="Ek-4">Ek-4: Riskli Alan %65 Formu</option>
              <option value="Ek-5">Ek-5: Anlaşma İle Satın Alma Tutanağı</option>
              <option value="Ek-6">Ek-6: Riskli Yapı Bina Askı Tutanağı (15 Gün)</option>
              <option value="Ek-7/A">Ek-7/A: Riskli Yapı Tahliye/Yıkım Tutanağı (90 Gün)</option>
              <option value="Ek-7/B">Ek-7/B: Riskli/Rezerv Alan Tahliye Tutanağı</option>
              <option value="Ek-8">Ek-8: Katılmayanlara 15 Günlük Teklif Formu</option>
              <option value="Ek-9">Ek-9: Açık Artırma Satış Yeri/Zamanı Tutanağı</option>
              <option value="Ek-10">Ek-10: Alan Uygulaması 15 Günlük Teklif Formu</option>
              <option value="Ek-11">Ek-11: Alan Uygulaması Satış Bildirim Tutanağı</option>
              <option value="Ek-12">Ek-12: Malikler Toplantı Çağrısı İlan Formu (15 Gün)</option>
              <option value="Ek-13">Ek-13: 3. Şahıslara Satış İlan Formu (%10 Teminat)</option>
            </select>
          </div>
        </div>
        <div id="splitLawContent"></div>
      </div>

      <!-- SEKME 2: HIZLI SAHA ARAÇLARI, KAT KARŞILIĞI VE 9 SENARYOLU OYLAMA SİMÜLATÖRÜ -->
      <div id="splitToolsView" style="display:none;">
        <!-- ARAÇ 1: 6306 KRİTİK SÜRELER VE SON GÜN TAKVİM MOTORU -->
        <div class="tool-mini-card" style="border-top:4px solid #d97706;">
          <h4>
            <span>⏱️ 1. 6306 Kritik Süreler ve Son Gün Takvim Motoru</span>
            <span style="font-size:0.72rem; color:#b45309;">Hak Kaybı Önleyici</span>
          </h4>
          <div class="tool-grid-2">
            <div>
              <label>İşlem Başlangıç / Askıya Çıkış Tarihi</label>
              <input type="date" id="t_tarih" onchange="hesapla6306Takvim()">
            </div>
            <div>
              <label>Başlangıç İşlemi Türü</label>
              <select id="t_islem" onchange="hesapla6306Takvim()">
                <option value="aski">Muhtarlık Askı İlanı Başlangıcı (Ek-6 / Ek-8 / Ek-12)</option>
                <option value="teblig">Doğrudan Noter / Elden Tebliğ Tarihi</option>
                <option value="tahliye">Bina Tahliye veya Yıkım Tarihi (Yardım/Kredi İçin)</option>
              </select>
            </div>
          </div>
          <div id="takvimSonucList" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:6px;"></div>
        </div>

        <!-- ARAÇ 2: KAT KARŞILIĞI PAYLAŞIM, %6 TEMİNAT VE 1,5 KAT HARÇ MUAFİYETİ SİMÜLATÖRÜ (ⓘ AÇIKLAMALI) -->
        <div class="tool-mini-card" style="border-top:4px solid #059669;">
         <h4>
            <span style="display:inline-flex; align-items:center; gap:6px;">
              🤝 2. Kat Karşılığı Paylaşım, %6 Teminat & 1,5 Kat Muafiyet
              <span class="info-i-btn" onclick="toggleToolInfo('info-kk-standart')" title="Yasal Standart ve Örnek Değer Açıklamasını Aç/Kapat">i</span>
            </span>
            <button onclick="printMalikSunumFoyu()" style="background:#059669; color:#fff; border:none; padding:4px 10px; border-radius:5px; font-size:0.74rem; font-weight:700; cursor:pointer;">🖨️ Malik Özeti Yazdır</button>
          </h4>

          <!-- (i) YASAL STANDART AÇIKLAMA KUTUSU -->
          <div id="info-kk-standart" class="info-popover-box">
            <strong>⚖️ Yasal Standart vs. Örnek Değer Ayrımı:</strong><br>
            • <strong>%6 Müteahhit Teminatı (6306 Yön. m.13/9-c):</strong> Türkiye genelinde <u>kesin yasal standarttır</u>. Müteahhit yapı ruhsatı almadan önce yapı yaklaşık maliyetinin %6'sı kadar teminatı İdareye vermek zorundadır.<br>
            • <strong>1,5 Kat Belediye Harç Muafiyeti (6306 Yön. m.16/10):</strong> <u>Kesin yasal standarttır</u>. Özel sektör dönüşümlerinde mevcut (eski) inşaat alanının 1,5 katına kadar olan yeni inşaat alanı için belediyelerce harç ve ücret alınmaz.<br>
            • <strong>Diğer Kutular (Parsel, Emsal, %50 Paylaşım, 1,70 Çıkma):</strong> Çalıştığınız parsele ve sözleşme pazarlığına göre değişen örnek değerlerdir; kendi parsel verilerinizi girerek hesaplayabilirsiniz.
          </div>

          <!-- (i) MEVCUT ESKİ BİNA ALANI AÇIKLAMA KUTUSU -->
          <div id="info-kk-eskibina" class="info-popover-box">
            <strong>🏚️ "Mevcut Eski Bina Alanı (m²)" Ne Demektir?</strong><br>
            Kentsel dönüşüme giren parsel üzerinde yıkılacak olan mevcut riskli binanın (yapı ruhsatında, iskân belgesinde veya belediye arşiv projesinde kayıtlı) <strong>toplam brüt inşaat alanıdır</strong>.<br>
            • <strong>Neden Girilir?</strong> Yönetmelik m.16/10 uyarınca belediye harç muafiyeti, yıkılan eski binanın <strong>1,5 katına kadar olan</strong> yeni inşaat alanı için geçerlidir (Örn: Eski bina 750 m² ise <code>750 × 1,5 = 1.125 m²</code> yeni inşaat alanı belediye harçlarından tamamen muaftır; sadece bunu aşan m² harca tabidir).
          </div>

          <!-- (i) YAPI YAKLAŞIK BİRİM MALİYETİ AÇIKLAMA KUTUSU -->
          <div id="info-kk-maliyet" class="info-popover-box">
            <strong>🏗️ "Yapı Yaklaşık Birim Maliyeti (₺/m²)" Ne Demektir?</strong><br>
            Çevre, Şehircilik ve İklim Değişikliği Bakanlığınca her yıl Resmî Gazete'de yayımlanan <em>"Mimarlık ve Mühendislik Hizmet Bedellerinin Hesabında Kullanılacak Yapı Yaklaşık Birim Maliyetleri Tebliği"</em>ndeki m² maliyetidir. Belediyeler ruhsat öncesi <strong>%6 müteahhit teminatını (m.13/9)</strong> bu resmi birim maliyet üzerinden hesaplar. Kutuyu boş bırakırsanız sistem <strong>2026 yılı ortalama referans değerini (22.500 ₺/m²)</strong> esas alır; güncel yıla veya yapı sınıfına göre değiştirebilirsiniz.
          </div>

          <div class="tool-grid-2">
            <div><label><span>Net İmar Parseli (m²)</span></label><input type="number" id="kk_parsel" value="1200" step="50" oninput="hesaplaKatKarsiligi()"></div>
            <div><label><span>TAKS / KAKS (Emsal)</span></label>
              <div style="display:flex; gap:4px;">
                <input type="number" id="kk_taks" value="0.30" step="0.05" oninput="hesaplaKatKarsiligi()" title="TAKS">
                <input type="number" id="kk_kaks" value="0.80" step="0.05" oninput="hesaplaKatKarsiligi()" title="KAKS">
              </div>
            </div>
            <div><label><span>Çıkma Katsayısı (1.0 / 1.70)</span></label><input type="number" id="kk_cikma" value="1.70" step="0.1" oninput="hesaplaKatKarsiligi()"></div>
            <div><label><span>Ort. Daire Alanı (Brüt m²)</span></label><input type="number" id="kk_daire_m2" value="95" step="5" oninput="hesaplaKatKarsiligi()"></div>
            <div><label><span>Arsa Sahibi Payı (%)</span></label><input type="number" id="kk_malik_oran" value="50" step="1" oninput="hesaplaKatKarsiligi()"></div>
           <div>
              <label>
                <span>Mevcut Eski Bina (m²)</span>
                <span class="info-i-btn" onclick="toggleToolInfo('info-kk-eskibina')" title="Mevcut Eski Bina Alanı Ne Demektir?">i</span>
              </label>
              <input type="number" id="kk_eski_m2" value="750" step="50" oninput="hesaplaKatKarsiligi()">
            </div>
            <div style="grid-column: 1 / -1;">
              <label>
                <span>Hesaplanan Yıla Ait Ort. Yapı Yaklaşık Birim Maliyeti (₺/m²)</span>
                <span class="info-i-btn" onclick="toggleToolInfo('info-kk-maliyet')" title="Yapı Yaklaşık Birim Maliyeti Açıklaması">i</span>
              </label>
              <input type="number" id="kk_birim_maliyet" placeholder="Örn: 22500 (2026 Yılı Ort. Birim Maliyeti - Değiştirebilirsiniz)" step="500" oninput="hesaplaKatKarsiligi()">
            </div>
          </div>
          <div id="kkSonucBox" style="background:#0f172a; color:#f8fafc; border-radius:8px; padding:10px; font-size:0.8rem;"></div>
        </div>

        <!-- ARAÇ 3: 9 SENARYOLU SEÇMELİ OYLAMA VE KARAR ÇOĞUNLUĞU SİMÜLATÖRÜ -->
        <div class="tool-mini-card" style="border-top:4px solid #2563eb;">
          <h4>
            <span>🗳️ 3. Seçmeli Oylama ve Karar Çoğunluğu Simülatörü (9 Senaryo)</span>
            <button class="law-link" id="voteLawBtn" onclick="openVotingScenarioLaw()">⚖️ Dayanak Maddeyi Aç</button>
          </h4>
          <div style="margin-bottom:8px;">
            <label>Oylama / Karar Senaryosunu Seçin (Cilt 1–4 Tüm Durumlar):</label>
            <select id="vote_scenario" onchange="renderVotingScenarioInputs()" style="background:#eff6ff; border-color:#3b82f6; color:#1e3a8a;">
              <option value="yeniden_yapim">1. Tek Parselde Yeniden Yapım / Kat Karşılığı / Müteahhit Seçimi (6306 Yön. m.15/2)</option>
              <option value="iki_riskli_tevhit" selected>2. İki Riskli Yapı Parselinin Tevhidi / Birleştirilmesi (6306 Yön. m.15/8)</option>
              <option value="bos_parsel_tevhit">3. Riskli Yapı Parseli + Bitişikteki BOŞ Parselin Tevhidi (6306 Yön. m.15/8)</option>
              <option value="coklu_kismi_risk">4. Çok Yapılı Parselde Yalnız Bazı Yapıların Riskli Olması (6306 Yön. m.15/7)</option>
              <option value="guclendirme">5. Yıkım Yerine Binanın Güçlendirilmesi Kararı (6306 Yön. m.8/7 & KMK m.19/2)</option>
              <option value="idari_fesih">6. Müteahhidin İşi Bırakması Halinde Sözleşmenin İdari Feshi (6306 Yön. m.13/11)</option>
              <option value="erken_satis">7. Müteahhit Dairelerinin İlerleme Oranı Üstünde Erken Satışı (6306 Yön. m.13/10)</option>
              <option value="imar_aktarim">8. İmar Hakkı Aktarımı İle Başka Parsele Taşınma (6306 Yön. m.15/10)</option>
              <option value="sarj_unitesi">9. Ortak Otoparka Elektrikli Araç Şarj Ünitesi Kurulumu (PAİY m.59/2)</option>
            </select>
          </div>
          <div id="voteDynamicInputs" class="tool-grid-2"></div>
          <div id="tvSonucBox" style="padding:9px 11px; border-radius:6px; font-size:0.81rem; font-weight:700; background:#ecfdf5; color:#065f46; line-height:1.5;"></div>
        </div>
      </div>

      <!-- SEKME 3: ÇALIŞMA NOTLARIM -->
      <div id="splitNotesView" style="display:none;">
        <div class="alert-box alert-info" style="margin-top:0; padding:9px 12px; font-size:0.81rem;">
          💡 Sol ekrandan herhangi bir metni fareyle seçtiğinizde çıkan <strong>"📝 Seçimi Notlarıma Ekle"</strong> butonuna basabilir veya aşağıdan elle yazabilirsiniz. Notlarınız 4 ciltte de ortak saklanır.
        </div>
        <div class="note-form">
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
            <select id="noteCat">
              <option value="📌 Önemli">📌 Önemli</option>
              <option value="🎓 Sınav / Ders">🎓 Sınav / Ders Notu</option>
              <option value="🏗️ Saha / Parsel">🏗️ Saha / Parsel Notu</option>
              <option value="⚠️ Mevzuat / Risk">⚠️ Mevzuat / Sözleşme Riski</option>
            </select>
            <input type="text" id="noteSource" value="${activeCilt==='0' ? 'Ana Sayfa / Genel Not' : 'Cilt ' + activeCilt + ' Notu'}">
            </div>
          <textarea id="noteQuote" rows="2" placeholder="Seçilen metin alıntısı (İsteğe bağlı)..." style="background:#fefce8;"></textarea>
          <textarea id="noteText" rows="3" placeholder="Kendi notunuzu veya değerlendirmenizi buraya yazın..."></textarea>
          <div style="display:flex; justify-content:space-between; gap:6px;">
            <button onclick="saveUserNote()" style="background:var(--green); color:#fff; border:none; padding:8px 14px; border-radius:6px; font-weight:700; cursor:pointer; flex:1;">➕ Notu Kaydet</button>
            <button onclick="exportNotesTxt()" style="background:var(--primary); color:#fff; border:none; padding:8px 11px; border-radius:6px; font-size:0.78rem; cursor:pointer;">💾 .TXT İndir</button>
            <button onclick="printUserNotes()" style="background:var(--blue); color:#fff; border:none; padding:8px 11px; border-radius:6px; font-size:0.78rem; cursor:pointer;">🖨️ Yazdır</button>
          </div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <strong style="font-size:0.88rem; color:var(--primary);">📂 Kayıtlı Notlarım (Tüm Ciltler)</strong>
          <button onclick="clearAllNotes()" style="background:none; border:none; color:var(--red); font-size:0.75rem; cursor:pointer; font-weight:600;">🗑️ Tümünü Sil</button>
        </div>
        <div id="notesListContainer"></div>
      </div>
    </div>
  `;
  document.body.appendChild(splitPanel);

  // SON DURUMA GÖRE GÜNCELLENMİŞ HIZLI KULLANIM KILAVUZU PENCERESİ
  const kilavuzModal = document.createElement('div');
  kilavuzModal.id = 'kilavuzModal';
  kilavuzModal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.68); z-index:4000; align-items:center; justify-content:center; padding:16px; backdrop-filter:blur(2px);';
  kilavuzModal.onclick = (e) => { if (e.target === kilavuzModal) closeKilavuzModal(); };
  kilavuzModal.innerHTML = `
    <div style="background:#ffffff; max-width:700px; width:100%; border-radius:12px; border:1px solid #cbd5e1; box-shadow:0 20px 45px rgba(0,0,0,0.35); overflow:hidden;">
      <div style="background:#0f172a; color:#ffffff; padding:14px 20px; display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #f59e0b;">
        <strong style="font-size:1.02rem; color:#fbbf24;">💡 Kentsel Dönüşüm Kütüphanesi — Sistem Yetenekleri ve Kullanım Kılavuzu</strong>
        <button onclick="closeKilavuzModal()" style="background:#dc2626; color:#fff; border:none; padding:5px 11px; border-radius:6px; font-weight:700; cursor:pointer; font-size:0.8rem;">✕ Kapat</button>
      </div>
      <div style="padding:18px 22px; font-size:0.86rem; color:#334155; line-height:1.6; max-height:76vh; overflow-y:auto;">
        <ul style="padding-left:18px; margin:0; display:flex; flex-direction:column; gap:9px;">
          <li><strong>📚 4 Ciltlik Modüler Yapı ve ☰ Açılır-Kapanır Fihrist:</strong> Üst bardan 4 cilt arasında geçiş yapabilir; sol üstteki <strong>"☰ Fihrist"</strong> butonuyla (veya <strong>Cmd/Ctrl + B</strong> kısayoluyla) sol menüyü gizleyerek çalışma alanınızı tam ekrana genişletebilirsiniz.</li>
          <li><strong>⚖️ Otomatik Hizalamalı İkiz Ekran ve Hızlı Mevzuat Seçici:</strong> Konu içindeki <strong>[⚖️ Madde Aç]</strong> butonlarına tıkladığınızda ilgili yönetmelik maddesi sağ ekranda açılır ve tıkladığınız satır sol ekranda <strong>sarı vurguyla tam karşısına otomatik hizalanır</strong> (Uzaklaşırsanız <strong>🎯 Açan Satır</strong> butonuyla geri dönebilirsiniz).</li>
          <li><strong>📋 Tıklanabilir <span class="yon-ek-chip">Ek-12</span> / <span class="yon-ek-chip">Ek-8</span> Resmi Form Rozetleri:</strong> Metinlerde geçen yeşil renkli <strong>Ek-1..Ek-13</strong> rozetlerine tıklayarak resmi askı, toplantı çağrısı, 15 günlük teklif ve satış tutanaklarını sağ ekranda açıp tek tıkla kopyalayabilirsiniz.</li>
          <li><strong>⏱️ 6306 Kritik Süreler Takvim Motoru:</strong> Üst bardaki <strong>"⚡ Araçlar & Süreler"</strong> sekmesinden; muhtarlık askı, tebliğ veya tahliye tarihine göre <strong>15/30/90 günlük ve 1/3/5 yıllık resmi son başvuru/itiraz tarihlerini</strong> otomatik hesaplayabilirsiniz.</li>
          <li><strong>🤝 Kat Karşılığı Paylaşım, %6 Teminat & 1,5 Kat Muafiyet Simülatörü (<span class="info-i-btn">i</span> Açıklamalı):</strong> Parsel, emsal, mevcut eski bina alanı ve yılına göre değiştirilebilir <strong>Yapı Yaklaşık Birim Maliyetini (₺/m²)</strong> girerek daire paylaşımını, %6 teminatı (m.13/9) ve 1,5 kat belediye harç muafiyetini (m.16/10) hesaplayabilir; <strong>ⓘ</strong> butonlarıyla yasal standart açıklamalarını okuyup <strong>🖨️ Malik Özeti</strong> yazdırabilirsiniz.</li>
          <li><strong>🗳️ 9 Senaryolu Seçmeli Oylama ve Karar Çoğunluğu Simülatörü:</strong> Tek parselde yeniden yapım (>%50), iki riskli parsel tevhidi (ayrı ayrı >%50), boş parsel tevhidi (%100), güçlendirme (4/5), idari fesih (>%50), erken satış (%100) ve şarj istasyonu dahil <strong>9 farklı oylama senaryosunu</strong> seçerek karar yeterliliğini ve dayanak maddesini anında test edebilirsiniz.</li>
          <li><strong>📝 Seç-Not Al ve 🎓 Yanlışlarımı Notlara Kaydet:</strong> Sayfadaki herhangi bir cümleyi fareyle seçip notlarınıza ekleyebilir; cilt sonlarındaki 8 soruluk değerlendirme testlerinde yanlış yaptığınız soruları <strong>"📌 Yanlışlarımı Notlara Ekle"</strong> butonuyla çalışma defterinize kaydedip <strong>.TXT / Yazıcı</strong> çıktısı alabilirsiniz.</li>
        </ul>
      </div>
      <div style="padding:12px 20px; background:#f8fafc; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; font-size:0.78rem; color:#64748b;">
        <span>Kısayollar: Sol Menü (Cmd/Ctrl + B) • Kapat (ESC)</span>
        <button onclick="closeKilavuzModal()" style="background:#1e293b; color:#fff; border:none; padding:7px 16px; border-radius:6px; font-weight:700; cursor:pointer;">Anlaşıldı, Kapat</button>
      </div>
    </div>
  `;
  document.body.appendChild(kilavuzModal);
}

// 9. TIKLANAN SATIRI YAKALAMA VE YAN EKRANIN TAM KARŞISINA HİZALAMA
function captureAndAlignSplitTrigger(explicitId, ev) {
  let targetEl = null;
  if (explicitId) {
    targetEl = document.getElementById(explicitId);
  }
  const eventObj = ev || (typeof window.event !== 'undefined' ? window.event : null);
  if (!targetEl && eventObj && eventObj.target) {
    const clicked = eventObj.target;
    if (clicked.closest && !clicked.closest('.top-nav') && !clicked.closest('.split-panel') && !clicked.closest('.sidebar')) {
      targetEl = clicked.closest('tr, p, li, .mini-card, .alert-box, .quiz-card');
    }
  }
  if (targetEl) {
    document.querySelectorAll('.active-split-source').forEach(el => el.classList.remove('active-split-source'));
    lastSplitTriggerEl = targetEl;
    lastSplitTriggerEl.classList.add('active-split-source');
    setTimeout(() => {
      if (lastSplitTriggerEl) lastSplitTriggerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
    setTimeout(() => {
      if (lastSplitTriggerEl) lastSplitTriggerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 280);
  }
}

function scrollToSplitSource() {
  if (!lastSplitTriggerEl) return;
  lastSplitTriggerEl.classList.add('active-split-source');
  lastSplitTriggerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function openKilavuzModal() {
  const m = document.getElementById('kilavuzModal');
  if (m) m.style.display = 'flex';
}

function closeKilavuzModal() {
  const m = document.getElementById('kilavuzModal');
  if (m) m.style.display = 'none';
}

function toggleSidebar() {
  document.body.classList.toggle('sidebar-collapsed');
  if (lastSplitTriggerEl && document.body.classList.contains('split-open')) {
    setTimeout(() => {
      lastSplitTriggerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 280);
  }
}

function openSplitLaw(lawKey) {
  captureAndAlignSplitTrigger();
  previousLawKey = lawKey;
  const item = LAW_DB[lawKey] || LAW_DB['yon-m15-8'];
  document.body.classList.add('split-open');
  document.body.classList.add('sidebar-collapsed');
  switchSplitTab('law');
  const sel = document.getElementById('quickLawSelect');
  if (sel) sel.value = lawKey;
  const container = document.getElementById('splitLawContent');
  container.innerHTML = `
    <div style="background:#fff; border:1px solid #cbd5e1; border-top:4px solid var(--purple); border-radius:10px; padding:16px;">
      <div style="font-size:0.74rem; font-weight:700; color:var(--purple); margin-bottom:4px;">${item.ref}</div>
      <h3 style="margin:0 0 10px 0; color:var(--primary); font-size:1.02rem;">${item.title}</h3>
      <div id="splitLawBodyInner" style="font-size:0.87rem; color:#334155; line-height:1.65;">${cleanLatexString(item.body)}</div>
      <div style="margin-top:14px; padding-top:10px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <button onclick="quickNoteFromLaw('${lawKey}')" style="background:var(--accent); color:#fff; border:none; padding:6px 12px; border-radius:6px; font-size:0.78rem; font-weight:700; cursor:pointer;">📝 Bu Maddeyi Notlarıma Ekle</button>
        <a href="cilt4.html#bolum-2" style="background:var(--purple-light); color:var(--purple); text-decoration:none; padding:6px 12px; border-radius:6px; font-size:0.78rem; font-weight:700;">⚖️ Cilt 4 Mevzuat Merkezine Git ➔</a>
      </div>
    </div>
  `;
  linkifyYonEkInElement(document.getElementById('splitLawBodyInner'));
}

function openYonEk(ekCode, ev) {
  if (ev && ev.stopPropagation) ev.stopPropagation();
  const fromInsideSplit = ev && ev.target && ev.target.closest && ev.target.closest('#splitPanel');
  if (!fromInsideSplit) {
    captureAndAlignSplitTrigger(null, ev);
  }
  const item = YON_EK_DB[ekCode] || YON_EK_DB['Ek-12'];
  document.body.classList.add('split-open');
  document.body.classList.add('sidebar-collapsed');
  switchSplitTab('law');
  const ekSel = document.getElementById('quickEkSelect');
  if (ekSel) ekSel.value = ekCode;
  const container = document.getElementById('splitLawContent');
  const backBtnHtml = previousLawKey
    ? `<button onclick="openSplitLaw('${previousLawKey}')" style="background:#f3e8ff; color:#7c3aed; border:1px solid #d8b4fe; padding:5px 10px; border-radius:6px; font-size:0.76rem; font-weight:700; cursor:pointer;">⬅ Madde Metnine Geri Dön</button>`
    : '';

  container.innerHTML = `
    <div style="background:#fff; border:1px solid #cbd5e1; border-top:4px solid #059669; border-radius:10px; padding:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:6px;">
        <span style="font-size:0.74rem; font-weight:700; color:#059669;">📋 ${item.ref}</span>
        ${backBtnHtml}
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
        <h3 style="margin:0; color:var(--primary); font-size:1rem;">${item.title}</h3>
        <button class="btn-small" style="background:#059669;" onclick="copyTemplate('yon-ek-tpl-box', this)">📋 Formu Kopyala</button>
      </div>
      <div class="template-box" id="yon-ek-tpl-box" style="border-top-color:#059669; font-size:0.82rem;">${item.formText}</div>
      <div style="margin-top:12px; padding-top:10px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <button onclick="quickNoteFromYonEk('${ekCode}')" style="background:var(--accent); color:#fff; border:none; padding:6px 12px; border-radius:6px; font-size:0.78rem; font-weight:700; cursor:pointer;">📝 Bu Formu Notlarıma Ekle</button>
        <a href="cilt3.html#bolum-8" style="background:#eff6ff; color:#2563eb; text-decoration:none; padding:6px 12px; border-radius:6px; font-size:0.78rem; font-weight:700;">📙 Cilt 3 Tüm Dilekçe & Şablonlara Git ➔</a>
      </div>
    </div>
  `;
}

function quickNoteFromYonEk(ekCode) {
  const item = YON_EK_DB[ekCode] || YON_EK_DB['Ek-12'];
  openSplitNotes();
  document.getElementById('noteSource').value = item.ref;
  document.getElementById('noteQuote').value = item.title;
  document.getElementById('noteText').focus();
}

function openSplitEk(ekId, sourceSentenceId) {
  captureAndAlignSplitTrigger(sourceSentenceId);
  const ekEl = document.getElementById(ekId);
  if (!ekEl) return;
  document.body.classList.add('split-open');
  document.body.classList.add('sidebar-collapsed');
  switchSplitTab('law');
  document.getElementById('splitLawContent').innerHTML = `
    <div style="background:#fff; border:1px solid #cbd5e1; border-top:4px solid var(--blue); border-radius:10px; padding:15px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <span style="font-size:0.75rem; font-weight:700; color:var(--blue);">📎 EK BELGE & KROKİ • İKİZ EKRAN ÖNİZLEME</span>
        <button onclick="goToEk('${ekId}', '${sourceSentenceId || ''}')" style="background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; padding:4px 9px; border-radius:5px; font-size:0.74rem; cursor:pointer; font-weight:600;">⬇ Sayfada Belgeye İn</button>
      </div>
      ${cleanLatexString(ekEl.innerHTML)}
    </div>
  `;
}

function openSplitTools() {
  document.body.classList.add('split-open');
  document.body.classList.add('sidebar-collapsed');
  switchSplitTab('tools');
}

function openSplitNotes() {
  document.body.classList.add('split-open');
  document.body.classList.add('sidebar-collapsed');
  switchSplitTab('notes');
  renderUserNotes();
}

function switchSplitTab(tab) {
  const lawView = document.getElementById('splitLawView');
  const toolsView = document.getElementById('splitToolsView');
  const notesView = document.getElementById('splitNotesView');
  const btnLaw = document.getElementById('tabBtnLaw');
  const btnTools = document.getElementById('tabBtnTools');
  const btnNotes = document.getElementById('tabBtnNotes');

  lawView.style.display = (tab === 'law') ? 'block' : 'none';
  toolsView.style.display = (tab === 'tools') ? 'block' : 'none';
  notesView.style.display = (tab === 'notes') ? 'block' : 'none';

  btnLaw.classList.toggle('active', tab === 'law');
  btnTools.classList.toggle('active', tab === 'tools');
  btnNotes.classList.toggle('active', tab === 'notes');

  if (tab === 'notes') renderUserNotes();
}

function toggleSplitWidth() {
  document.body.classList.toggle('split-wide');
  if (lastSplitTriggerEl) {
    setTimeout(() => {
      lastSplitTriggerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 280);
  }
}

function closeSplitPanel() {
  document.body.classList.remove('split-open');
  document.body.classList.remove('split-wide');
  document.body.classList.remove('sidebar-collapsed');
  if (lastSplitTriggerEl) {
    setTimeout(() => {
      lastSplitTriggerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        if (lastSplitTriggerEl) lastSplitTriggerEl.classList.remove('active-split-source');
      }, 1500);
    }, 280);
  }
}

// 10. YAN EKRAN HIZLI SAHA ARAÇLARI (6306 TAKVİM, KAT KARŞILIĞI & 9 SENARYOLU OYLAMA MOTORU)
function toggleToolInfo(boxId) {
  const el = document.getElementById(boxId);
  if (!el) return;
  el.style.display = (el.style.display === 'block') ? 'none' : 'block';
}

function initSplitToolsDefaults() {
  const dateInput = document.getElementById('t_tarih');
  if (dateInput && !dateInput.value) {
    const today = new Date();
    dateInput.value = today.toISOString().split('T')[0];
  }
  hesapla6306Takvim();
  hesaplaKatKarsiligi();
  renderVotingScenarioInputs();
}

function addDaysToDate(baseDate, days) {
  const d = new Date(baseDate.getTime());
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'short' });
}

function hesapla6306Takvim() {
  const dInput = document.getElementById('t_tarih');
  const turSelect = document.getElementById('t_islem');
  const box = document.getElementById('takvimSonucList');
  if (!dInput || !box) return;
  const base = dInput.value ? new Date(dInput.value + 'T12:00:00') : new Date();
  const tur = turSelect ? turSelect.value : 'aski';

  let rows = [];
  if (tur === 'aski') {
    rows = [
      { label: '📌 15. Gün: Muhtarlık Askı Bitişi (Resmi Tebliğ Tarihi)', date: addDaysToDate(base, 15) },
      { label: '⚠️ +15. Gün (Toplam 30. Gün): Risk İtirazı / Teklif Kabul SON GÜNÜ', date: addDaysToDate(base, 30) },
      { label: '⚖️ +30. Gün (Tebliğden +30): İdare Mahkemesi Dava Açma SON GÜNÜ', date: addDaysToDate(base, 45) },
      { label: '🏚️ +90. Gün (Tebliğden +90): Tahliye ve Yıkım Azami Süre SONU', date: addDaysToDate(base, 105) }
    ];
  } else if (tur === 'teblig') {
    rows = [
      { label: '⚠️ +15. Gün: Teklif Kabul (m.15/2) / Müteahhit Savunma SON GÜNÜ', date: addDaysToDate(base, 15) },
      { label: '⚖️ +30. Gün: İdare Mahkemesi Dava / Müteahhit İhtar (m.13/11) SONU', date: addDaysToDate(base, 30) },
      { label: '🏚️ +90. Gün: Riskli Yapı Tahliye ve Yıkım Azami Süre SONU (m.8)', date: addDaysToDate(base, 90) }
    ];
  } else {
    rows = [
      { label: '💰 +1 Yıl (365 Gün): Kira / Taşınma Yardımı Başvuru SON GÜNÜ (m.16/4)', date: addDaysToDate(base, 365) },
      { label: '🏦 +3 Yıl: Faiz Destekli Kredi Başvuru SON GÜNÜ (m.16/6)', date: addDaysToDate(base, 365 * 3) },
      { label: '⚖️ +5 Yıl: Fazla Ödenen Tapu/Noter Harcı İadesi Zamanaşımı SONU', date: addDaysToDate(base, 365 * 5) }
    ];
  }

  box.innerHTML = rows.map(r => `
    <div class="timeline-row">
      <span style="color:#1e293b; font-weight:600;">${r.label}</span>
      <span class="timeline-badge">${r.date}</span>
    </div>
  `).join('');
}

function hesaplaKatKarsiligi() {
  const box = document.getElementById('kkSonucBox');
  if (!box) return;
  const parsel = parseFloat(document.getElementById('kk_parsel').value) || 0;
  const taks = parseFloat(document.getElementById('kk_taks').value) || 0;
  const kaks = parseFloat(document.getElementById('kk_kaks').value) || 0;
  const cikma = parseFloat(document.getElementById('kk_cikma').value) || 1;
  const daireM2 = Math.max(25, parseFloat(document.getElementById('kk_daire_m2').value) || 95);
  const malikOran = parseFloat(document.getElementById('kk_malik_oran').value) || 50;
  const eskiM2 = parseFloat(document.getElementById('kk_eski_m2').value) || 0;
  const birimMaliyetRaw = document.getElementById('kk_birim_maliyet') ? document.getElementById('kk_birim_maliyet').value : '';
  const birimMaliyet = parseFloat(birimMaliyetRaw) > 0 ? parseFloat(birimMaliyetRaw) : 22500;

  const taban = parsel * taks;
  const bazEmsal = parsel * kaks;
  const ustEmsal = Math.max(0, bazEmsal - taban);
  const yeniToplamAlan = (cikma > 1) ? (taban + ustEmsal * cikma) : bazEmsal;

  const toplamDaire = yeniToplamAlan / daireM2;
  const malikDaire = toplamDaire * (malikOran / 100);
  const mutDaire = toplamDaire - malikDaire;

  const muafSinir = eskiM2 * 1.5;
  const harcaTabiM2 = Math.max(0, yeniToplamAlan - muafSinir);
  const yaklasikMaliyet = yeniToplamAlan * birimMaliyet;
  const teminat6 = yaklasikMaliyet * 0.06;

  const fmtM2 = (n) => n.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' m²';
  const fmtDaire = (n) => n.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' Adet';
  const fmtTL = (n) => n.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' ₺';

  box.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
      <div><span style="color:#94a3b8; font-size:0.72rem;">Yeni İnşaat Alanı:</span><br><strong style="color:#fbbf24;">${fmtM2(yeniToplamAlan)}</strong></div>
      <div><span style="color:#94a3b8; font-size:0.72rem;">Üretilecek Yaklaşık Daire:</span><br><strong style="color:#38bdf8;">${fmtDaire(toplamDaire)}</strong></div>
      <div><span style="color:#94a3b8; font-size:0.72rem;">Arsa Sahiplerine (%${malikOran}):</span><br><strong style="color:#34d399;">${fmtDaire(malikDaire)}</strong></div>
      <div><span style="color:#94a3b8; font-size:0.72rem;">Müteahhide (%${100 - malikOran}):</span><br><strong style="color:#c4b5fd;">${fmtDaire(mutDaire)}</strong></div>
      <div><span style="color:#94a3b8; font-size:0.72rem;">1,5 Kat Harçtan Muaf Alan (m.16/10):</span><br><strong style="color:#34d399;">${fmtM2(muafSinir)}</strong> <small style="color:#fca5a5;">(Aşan: ${fmtM2(harcaTabiM2)})</small></div>
      <div><span style="color:#94a3b8; font-size:0.72rem;">%6 Teminat (m.13/9 • ${birimMaliyet.toLocaleString('tr-TR')} ₺/m²):</span><br><strong style="color:#fbbf24;">~ ${fmtTL(teminat6)}</strong></div>
    </div>
  `;
}

// 9 SENARYOLU SEÇMELİ OYLAMA VE KARAR ÇOĞUNLUĞU SİMÜLATÖRÜ
const VOTING_SCENARIOS = {
  'yeniden_yapim': {
    lawKey: 'yon-m15-1-2',
    inputsHtml: `
      <div><label>Toplam Arsa Payı Paydası</label><input type="number" id="v_payda" value="2400" oninput="hesaplaSecmeliOylama()"></div>
      <div><label>Kabul Eden (Evet) Arsa Payı</label><input type="number" id="v_evet" value="1250" oninput="hesaplaSecmeliOylama()"></div>
    `
  },
  'iki_riskli_tevhit': {
    lawKey: 'yon-m15-8',
    inputsHtml: `
      <div><label>1. Riskli Parsel Kabul Payı (%)</label><input type="number" id="v_p1" value="60" step="1" oninput="hesaplaSecmeliOylama()"></div>
      <div><label>2. Riskli Parsel Kabul Payı (%)</label><input type="number" id="v_p2" value="55" step="1" oninput="hesaplaSecmeliOylama()"></div>
    `
  },
  'bos_parsel_tevhit': {
    lawKey: 'yon-m15-8',
    inputsHtml: `
      <div><label>Riskli Yapı Parseli Kabul Payı (%)</label><input type="number" id="v_p1" value="65" step="1" oninput="hesaplaSecmeliOylama()"></div>
      <div><label>Yapılaşmamış BOŞ Parsel Kabul (%)</label><input type="number" id="v_p2" value="100" step="1" oninput="hesaplaSecmeliOylama()"></div>
    `
  },
  'coklu_kismi_risk': {
    lawKey: 'yon-m15-6-7',
    inputsHtml: `
      <div><label>Riskli Yapı Paydaşları İçinde Kabul (%)</label><input type="number" id="v_p1" value="60" step="1" oninput="hesaplaSecmeliOylama()"></div>
      <div><label>Risksiz Yapı Maliklerinin Hak Durumu</label>
        <select id="v_flag" onchange="hesaplaSecmeliOylama()">
          <option value="korunuyor">Hakları Korunuyor / Resen İfraz Mümkün</option>
          <option value="zarar">Diğer Maliklerin Hakları Menfi Etkileniyor</option>
        </select>
      </div>
    `
  },
  'guclendirme': {
    lawKey: 'yon-m8',
    inputsHtml: `
      <div><label>Kabul Eden Malik Kişi Sayısı Oranı (%)</label><input type="number" id="v_p1" value="80" step="1" oninput="hesaplaSecmeliOylama()"></div>
      <div><label>Kabul Eden Arsa Payı Oranı (%)</label><input type="number" id="v_p2" value="82" step="1" oninput="hesaplaSecmeliOylama()"></div>
    `
  },
  'idari_fesih': {
    lawKey: 'yon-m13',
    inputsHtml: `
      <div><label>Fesih İsteyen Arsa Payı Oranı (%)</label><input type="number" id="v_p1" value="55" step="1" oninput="hesaplaSecmeliOylama()"></div>
      <div><label>Müteahhit Gecikme / Durma Durumu</label>
        <select id="v_flag" onchange="hesaplaSecmeliOylama()">
          <option value="uygun">1 Yıldır Başlamadı VEYA En Az 6 Aydır Durdu</option>
          <option value="yetersiz">Süre Şartı (1 Yıl / 6 Ay) Henüz Dolmadı</option>
        </select>
      </div>
    `
  },
  'erken_satis': {
    lawKey: 'yon-m13',
    inputsHtml: `
      <div><label>İnşaat Tamamlanma Oranı (%)</label><input type="number" id="v_p1" value="50" step="5" oninput="hesaplaSecmeliOylama()"></div>
      <div><label>Arsa Sahipleri Muvafakat Oranı (%)</label><input type="number" id="v_p2" value="100" step="5" oninput="hesaplaSecmeliOylama()"></div>
    `
  },
  'imar_aktarim': {
    lawKey: 'yon-m15-10',
    inputsHtml: `
      <div><label>Riskli Parsel Şuyulanma Oranı (%)</label><input type="number" id="v_p1" value="100" step="5" oninput="hesaplaSecmeliOylama()"></div>
      <div><label>Taşınılacak Parsel Malik Muvafakati (%)</label><input type="number" id="v_p2" value="100" step="5" oninput="hesaplaSecmeliOylama()"></div>
    `
  },
  'sarj_unitesi': {
    lawKey: 'paiy-m59',
    inputsHtml: `
      <div><label>Sayı ve Arsa Payı Kabul Oranı (%)</label><input type="number" id="v_p1" value="55" step="1" oninput="hesaplaSecmeliOylama()"></div>
      <div><label>Tesisat / Trafo Durumu</label>
        <select id="v_flag" onchange="hesaplaSecmeliOylama()">
          <option value="mevcut">Mevcut Panodan Besleniyor (Tadilat Yok)</option>
          <option value="trafo">Yeni Trafo / Ana Panoda Esaslı Tadilat Var</option>
        </select>
      </div>
    `
  }
};

function renderVotingScenarioInputs() {
  const sel = document.getElementById('vote_scenario');
  const container = document.getElementById('voteDynamicInputs');
  if (!sel || !container) return;
  const sc = VOTING_SCENARIOS[sel.value] || VOTING_SCENARIOS['iki_riskli_tevhit'];
  container.innerHTML = sc.inputsHtml;
  hesaplaSecmeliOylama();
}

function openVotingScenarioLaw() {
  const sel = document.getElementById('vote_scenario');
  const sc = sel ? VOTING_SCENARIOS[sel.value] : null;
  openSplitLaw(sc ? sc.lawKey : 'yon-m15-8');
}

function hesaplaSecmeliOylama() {
  const sel = document.getElementById('vote_scenario');
  const res = document.getElementById('tvSonucBox');
  if (!sel || !res) return;
  const code = sel.value;

  const setOk = (msg) => { res.style.background = '#ecfdf5'; res.style.color = '#065f46'; res.innerHTML = msg; };
  const setErr = (msg) => { res.style.background = '#fef2f2'; res.style.color = '#991b1b'; res.innerHTML = msg; };

  if (code === 'yeniden_yapim') {
    const payda = parseFloat(document.getElementById('v_payda').value) || 100;
    const evet = parseFloat(document.getElementById('v_evet').value) || 0;
    const oran = (evet / payda) * 100;
    if (evet > payda / 2) {
      setOk(`✅ SALT ÇOĞUNLUK SAĞLANDI (%${oran.toFixed(2)} > %50): Yeniden yapım/sözleşme kararı geçerlidir. Katılmayanlara Ek-8 ile 15 gün süre verilir ve ruhsat öncesi m.15/A pay satışı başvurusu yapılır.`);
    } else if (evet === payda / 2) {
      setErr(`⚠️ TAM %50 YETERLİ DEĞİLDİR! Salt çoğunluk toplam payın yarısını aşmalıdır (> ${(payda / 2).toFixed(1)} pay gerekir - m.15/2).`);
    } else {
      setErr(`❌ ÇOĞUNLUK SAĞLANMADI (%${oran.toFixed(2)}): Toplam arsa payının yarısından fazlası (>%50) sağlanmadan m.15/A pay satışı işletilemez.`);
    }
  } else if (code === 'iki_riskli_tevhit') {
    const p1 = parseFloat(document.getElementById('v_p1').value) || 0;
    const p2 = parseFloat(document.getElementById('v_p2').value) || 0;
    if (p1 > 50 && p2 > 50) {
      setOk(`✅ TEVHİT YAPILABİLİR (m.15/8): Her iki riskli parselde ayrı ayrı >%50 salt çoğunluk (%${p1} ve %${p2}) sağlandı. Tevhit sonrası yeni parselde de >%50 ile uygulama yürütülür.`);
    } else {
      setErr(`❌ TEVHİT YAPILAMAZ (m.15/8): Her parselde ayrı ayrı >%50 arsa payı çoğunluğu şarttır! (Tam %50 yetmez; iki parselin oyları toplanarak eksik çoğunluk tamamlanamaz).`);
    }
  } else if (code === 'bos_parsel_tevhit') {
    const p1 = parseFloat(document.getElementById('v_p1').value) || 0;
    const p2 = parseFloat(document.getElementById('v_p2').value) || 0;
    if (p1 > 50 && p2 === 100) {
      setOk(`✅ BOŞ PARSELLE TEVHİT YAPILABİLİR (m.15/8): Riskli parselde >%50 (%${p1}) ve yapılaşmamış boş parselde %100 oybirliği sağlandı. (Tapu harç muafiyeti m.16/11 uyarınca riskli parsel alanı oranında uygulanır).`);
    } else {
      setErr(`❌ TEVHİT YAPILAMAZ (m.15/8): Bitişikteki yapılaşmamış BOŞ parselin tevhidi için boş parseldeki bütün maliklerin %100 OYBİRLİĞİ ve riskli parselde >%50 çoğunluk şarttır!`);
    }
  } else if (code === 'coklu_kismi_risk') {
    const p1 = parseFloat(document.getElementById('v_p1').value) || 0;
    const flag = document.getElementById('v_flag').value;
    if (p1 > 50 && flag === 'korunuyor') {
      setOk(`✅ KISMİ RİSK KARARI GEÇERLİ (m.15/7): Yalnız riskli yapı paydaşları arasında >%50 (%${p1}) sağlandı. Tapu şerhi yalnız riskli binaların adresiyle işlenir; mümkünse resen ifraz yapılır.`);
    } else {
      setErr(`❌ UYGULAMA YAPILAMAZ (m.15/7): Riskli yapı paydaşlarının >%50 çoğunluğu ve parseldeki diğer (risksiz) maliklerin haklarının menfi etkilenmemesi şarttır.`);
    }
  } else if (code === 'guclendirme') {
    const p1 = parseFloat(document.getElementById('v_p1').value) || 0;
    const p2 = parseFloat(document.getElementById('v_p2').value) || 0;
    if (p1 >= 80 && p2 >= 80) {
      setOk(`✅ GÜÇLENDİRME KARARI ALINABİLİR (m.8/7 & KMK m.19/2): Kat maliklerinin 4/5 (%80) çoğunluğu sağlandı. 90 günlük yıkım süresi içinde teknik rapor + güçlendirme projesi ve ruhsatı alınmalıdır.`);
    } else {
      setErr(`❌ GÜÇLENDİRME YAPILAMAZ (KMK m.19/2): Yıkım yerine güçlendirme için 4/5 (%80) çoğunluk (veya mahkeme kararı) ve 90 gün içinde güçlendirme ruhsatı alınması zorunludur.`);
    }
  } else if (code === 'idari_fesih') {
    const p1 = parseFloat(document.getElementById('v_p1').value) || 0;
    const flag = document.getElementById('v_flag').value;
    if (p1 > 50 && flag === 'uygun') {
      setOk(`✅ İDARİ FESİH BAŞVURUSU YAPILABİLİR (m.13/11): Arsa payı >%50 (%${p1}) ve süre şartı sağlandı. Müdürlük müteahhide 30 gün ihtar verir; işe başlamazsa sözleşme resen feshedilir (Ödenen kiralar geri istenemez).`);
    } else {
      setErr(`❌ İDARİ FESİH ŞARTLARI OLUŞMADI (m.13/11): Müteahhitten kaynaklı 1 yıl işe başlamama veya en az 6 ay durma şartı ile maliklerin >%50 salt çoğunluk kararı birlikte aranır.`);
    }
  } else if (code === 'erken_satis') {
    const ilerleme = parseFloat(document.getElementById('v_p1').value) || 0;
    const muvafakat = parseFloat(document.getElementById('v_p2').value) || 0;
    const normalSinir = Math.max(0, ilerleme - 10);
    if (muvafakat === 100) {
      setOk(`✅ ERKEN SATIŞ İZNİ VERİLEBİLİR (m.13/10): Bütün maliklerin %100 muvafakati olduğu için inşaat tamamlanma oranı (%${ilerleme}) veya üstünde müteahhit payı satışı yapılabilir.`);
    } else {
      setErr(`⚠️ YALNIZCA %${normalSinir} ORANINDA KADEMELİ SATIŞ YAPILABİLİR (m.13/10): %100 malik muvafakati yoksa İdare yalnızca inşaat tamamlanma oranının (%${ilerleme}) %10 altındaki oranda (%${normalSinir}) satışa izin verir!`);
    }
  } else if (code === 'imar_aktarim') {
    const p1 = parseFloat(document.getElementById('v_p1').value) || 0;
    const p2 = parseFloat(document.getElementById('v_p2').value) || 0;
    if (p1 === 100 && p2 === 100) {
      setOk(`✅ İMAR HAKKI AKTARIMI KANUN KAPSAMINDA YÜRÜTÜLÜR (m.15/10): Riskli parsel maliklerinin tamamı aynı parselde şuyulandırıldı ve karşı parsel maliklerinin %100 muvafakati sağlandı.`);
    } else {
      setErr(`❌ AKTARIM ŞARTI EKSİK (m.15/10): İmar hakkı aktarımında maliklerin tamamının aynı parselde şuyulandırılması (%100) ve taşınılacak parseldeki diğer maliklerin muvafakati (%100) şarttır.`);
    }
  } else if (code === 'sarj_unitesi') {
    const p1 = parseFloat(document.getElementById('v_p1').value) || 0;
    const flag = document.getElementById('v_flag').value;
    if (flag === 'mevcut' && p1 > 50) {
      setOk(`✅ RUHSATSIZ KURULABİLİR (PAİY m.59/2 & Görüş 16593755): Mevcut elektrik tesisatından beslendiği ve sayı/arsa payı çoğunluğu (>%50) sağlandığı için ruhsatsız kurulabilir.`);
    } else if (flag === 'trafo' && p1 === 100) {
      setOk(`✅ TADİLAT RUHSATIYLA KURULABİLİR: Yeni trafo/esaslı pano tadilatı için %100 oybirliği sağlandı; proje ve ruhsatla kurulabilir.`);
    } else {
      setErr(`❌ KURULUM YAPILAMAZ: Mevcut panodan besleniyorsa >%50 çoğunluk; yeni trafo veya ortak ana panoda esaslı tadilat gerekiyorsa %100 OYBİRLİĞİ şarttır!`);
    }
  }
}

function printMalikSunumFoyu() {
  const parsel = document.getElementById('kk_parsel').value;
  const taks = document.getElementById('kk_taks').value;
  const kaks = document.getElementById('kk_kaks').value;
  const cikma = document.getElementById('kk_cikma').value;
  const daireM2 = document.getElementById('kk_daire_m2').value;
  const malikOran = document.getElementById('kk_malik_oran').value;
  const eskiM2 = document.getElementById('kk_eski_m2').value;
  const birimRaw = document.getElementById('kk_birim_maliyet').value;
  const birimMaliyet = parseFloat(birimRaw) > 0 ? parseFloat(birimRaw).toLocaleString('tr-TR') : '22.500 (2026 Ort.)';
  const kkHtml = document.getElementById('kkSonucBox').innerHTML;
  const takvimHtml = document.getElementById('takvimSonucList').innerHTML;

  const win = window.open('', '_blank');
  win.document.write(`
    <html><head><title>Kentsel Dönüşüm Malik Toplantısı Bilgi ve Fizibilite Föyü</title>
    <style>
      body { font-family: 'Segoe UI', sans-serif; padding: 28px; color: #1e293b; line-height: 1.6; }
      h1 { font-size: 1.35rem; color: #0f172a; border-bottom: 3px solid #059669; padding-bottom: 8px; }
      h2 { font-size: 1.05rem; color: #059669; margin-top: 20px; }
      .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; background: #f8fafc; margin-top: 8px; }
      .timeline-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e2e8f0; }
      .timeline-badge { font-weight: bold; color: #b45309; }
    </style></head><body>
    <h1>🏗️ KENTSEL DÖNÜŞÜM MALİK TOPLANTISI ÖN FİZİBİLİTE VE SÜREÇ BİLGİ FÖYÜ</h1>
    <p><strong>Düzenlenme Tarihi:</strong> ${new Date().toLocaleDateString('tr-TR')} | <strong>Yasal Çerçeve:</strong> 6306 Sayılı Kanun ve Uygulama Yönetmeliği (04.02.2026 Değişiklikleri Dahil)</p>
    <h2>1. Parsel İmar ve Kat Karşılığı Paylaşım Simülasyonu</h2>
    <div class="box">
      <p><strong>Girdi Parametreleri:</strong> Net Parsel: <b>${parsel} m²</b> | TAKS: <b>${taks}</b> | KAKS: <b>${kaks}</b> | Çıkma Katsayısı: <b>${cikma}</b> | Ort. Daire: <b>${daireM2} m²</b> | Malik Payı: <b>%${malikOran}</b> | Mevcut Eski Bina Alanı: <b>${eskiM2} m²</b> | Birim Maliyet: <b>${birimMaliyet} ₺/m²</b></p>
      <div style="background:#0f172a; color:#fff; padding:12px; border-radius:8px;">${kkHtml}</div>
    </div>
    <h2>2. 6306 Sayılı Kanun Kritik Süreler Takvimi</h2>
    <div class="box">${takvimHtml}</div>
    <h2>3. Maliklerin Temel Yasal Hak ve Güvenceleri (Yönetmelik m.13, m.15, m.16)</h2>
    <div class="box">
      <ul>
        <li><strong>Salt Çoğunluk (>%50):</strong> Yeniden yapım ve müteahhit seçimi kararları arsa payının %50'sini aşan salt çoğunlukla alınır; katılmayanlara Ek-8 formuyla 15 gün kabul süresi verilir (m.15/2).</li>
        <li><strong>%6 Müteahhit Teminatı ve %10 Kademeli Satış:</strong> Müteahhit ruhsat öncesi yapı yaklaşık maliyetinin %6'sı kadar teminat verir (m.13/9) ve kendi payına düşen daireleri İdare izni olmadan (inşaat ilerleme oranının %10 altını aşacak şekilde) satamaz (m.13/10).</li>
        <li><strong>1,5 Kat Belediye Harç Muafiyeti ve Kira Yardımı:</strong> Mevcut inşaat alanının 1,5 katına kadar olan yeni inşaat alanı belediye harç ve ücretlerinden muaftır (m.16/10). Maliklere 18 ay kira yardımı (kiracılara 2 aylık defaten) ödenir.</li>
      </ul>
    </div>
    </body></html>
  `);
  win.document.close();
  win.print();
}

// 11. NOT DEFTERİ FONKSİYONLARI
document.addEventListener('mouseup', (e) => {
  const popup = document.getElementById('selectionPopup');
  if (!popup) return;
  const sel = window.getSelection();
  const text = sel ? sel.toString().trim() : '';
  if (text.length > 5 && !e.target.closest('.split-panel') && !e.target.closest('.sidebar') && !e.target.closest('#kilavuzModal')) {
    selectedQuoteBuffer = text;
    popup.style.left = Math.min(window.innerWidth - 220, e.pageX - 40) + 'px';
    popup.style.top = Math.max(10, e.pageY - 42) + 'px';
    popup.style.display = 'block';
  } else if (!e.target.closest('#selectionPopup')) {
    popup.style.display = 'none';
  }
});

function addSelectedTextToNotes(e) {
  e.preventDefault();
  document.getElementById('selectionPopup').style.display = 'none';
  const activeCilt = document.body.getAttribute('data-cilt') || '1';
  openSplitNotes();
  document.getElementById('noteQuote').value = selectedQuoteBuffer;
  document.getElementById('noteSource').value = `Cilt ${activeCilt} • Seçili Metin`;
  document.getElementById('noteText').focus();
  window.getSelection().removeAllRanges();
}

function quickNoteFromLaw(lawKey) {
  const item = LAW_DB[lawKey] || LAW_DB['yon-m15-8'];
  openSplitNotes();
  document.getElementById('noteSource').value = item.ref;
  document.getElementById('noteQuote').value = item.title;
  document.getElementById('noteText').focus();
}

function getSavedNotes() {
  try { return JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) || '[]'); }
  catch (e) { return []; }
}

function saveUserNote() {
  const cat = document.getElementById('noteCat').value;
  const src = document.getElementById('noteSource').value.trim() || 'Çalışma Notu';
  const quote = document.getElementById('noteQuote').value.trim();
  const text = document.getElementById('noteText').value.trim();
  if (!quote && !text) { alert('Lütfen bir metin seçin veya not alanına açıklama yazın.'); return; }
  const notes = getSavedNotes();
  notes.unshift({ id: Date.now(), date: new Date().toLocaleString('tr-TR'), cat, src, quote, text });
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  document.getElementById('noteQuote').value = '';
  document.getElementById('noteText').value = '';
  renderUserNotes();
}

function deleteUserNote(id) {
  const notes = getSavedNotes().filter(n => n.id !== id);
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  renderUserNotes();
}

function clearAllNotes() {
  if (!confirm('Kaydedilen tüm çalışma notlarınızı silmek istediğinize emin misiniz?')) return;
  localStorage.removeItem(NOTES_STORAGE_KEY);
  renderUserNotes();
}

function renderUserNotes() {
  const notes = getSavedNotes();
  const b1 = document.getElementById('noteCountBadge');
  const b2 = document.getElementById('splitNoteCount');
  if (b1) b1.textContent = notes.length;
  if (b2) b2.textContent = notes.length;
  const container = document.getElementById('notesListContainer');
  if (!container) return;
  if (notes.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:20px; color:#94a3b8; font-size:0.84rem; background:#fff; border-radius:8px; border:1px dashed #cbd5e1;">Henüz kayıtlı notunuz yok. Sayfadan bir cümleyi fareyle seçip ekleyebilir veya yukarıdan yazabilirsiniz.</div>`;
    return;
  }
  container.innerHTML = notes.map(n => `
    <div class="note-item">
      <div class="note-item-header">
        <span><strong>${n.cat}</strong> • ${n.src}</span>
        <span>${n.date} <button onclick="deleteUserNote(${n.id})" style="background:none; border:none; color:#dc2626; cursor:pointer; font-weight:700; margin-left:6px;">✕</button></span>
      </div>
      ${n.quote ? `<div class="note-quote">"${n.quote}"</div>` : ''}
      ${n.text ? `<div style="color:#1e293b; white-space:pre-wrap;">${n.text}</div>` : ''}
    </div>
  `).join('');
}

function exportNotesTxt() {
  const notes = getSavedNotes();
  if (notes.length === 0) { alert('İndirilecek not bulunamadı.'); return; }
  let content = 'KENTSEL DÖNÜŞÜM KÜTÜPHANESİ - ÇALIŞMA VE SAHA NOTLARIM\n========================================================\n\n';
  notes.forEach((n, i) => {
    content += `${i + 1}. [${n.cat}] ${n.src} (${n.date})\n`;
    if (n.quote) content += `   Alıntı: "${n.quote}"\n`;
    if (n.text) content += `   Not: ${n.text}\n`;
    content += `--------------------------------------------------------\n`;
  });
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'Kentsel_Donusum_Calisma_Notlarim.txt';
  a.click();
}

function printUserNotes() {
  const notes = getSavedNotes();
  if (notes.length === 0) { alert('Yazdırılacak not bulunamadı.'); return; }
  const win = window.open('', '_blank');
  win.document.write(`<html><head><title>Çalışma Notlarım</title><style>body{font-family:sans-serif; padding:24px;} .n{border:1px solid #ccc; border-left:4px solid #d97706; padding:12px; margin-bottom:12px; border-radius:6px;} .q{background:#fef9c3; padding:8px; font-style:italic; margin:6px 0;}</style></head><body><h2>📚 Kentsel Dönüşüm Kütüphanesi - Çalışma Notlarım</h2>`);
  notes.forEach(n => {
    win.document.write(`<div class="n"><div><strong>${n.cat}</strong> • ${n.src} <small>(${n.date})</small></div>${n.quote ? `<div class="q">"${n.quote}"</div>` : ''}<div>${n.text || ''}</div></div>`);
  });
  win.document.write(`</body></html>`);
  win.document.close();
  win.print();
}

// 12. AKILLI SORU–MEVZUAT EŞLEŞTİRİCİ VE DEĞERLENDİRME TESTİ MOTORU
function resolveQuizLawKey(item) {
  const txt = trNorm((item.q || '') + ' ' + (item.exp || ''));
  if (txt.includes('otopark')) return 'otopark-m8-12';
  if (txt.includes('siginak')) return 'siginak-m8';
  if (txt.includes('bag evi') || txt.includes('iskan disi')) return 'plansiz-m63';
  if (txt.includes('sundurma') || txt.includes('tiny house') || txt.includes('pergola')) return 'paiy-m59';
  if (txt.includes('asansor')) return 'ant-m34';
  if (txt.includes('vekaletname') && txt.includes('ek-3l')) return 'vekalet-tbk504';
  if (txt.includes('yer gosterme')) return 'yergosterme-ek3k';
  if (txt.includes('65 yas') || txt.includes('ehliyet')) return 'ehliyet-tmk';
  if (txt.includes('mania') || txt.includes('gri renkli')) return 'kepez-27594';
  return item.lawKey || 'yon-m15-8';
}

function initQuiz(quizArray) {
  activeQuizData = quizArray.map(item => ({
    ...item,
    lawKey: resolveQuizLawKey(item)
  }));
  quizAnswers = {};
  renderQuiz();
}

function renderQuiz() {
  const container = document.getElementById('quizContainer');
  if (!container || activeQuizData.length === 0) return;

  const scoreBox = document.getElementById('quizScoreBox');
  if (scoreBox && scoreBox.parentElement && !document.getElementById('saveWrongBtn')) {
    const wBtn = document.createElement('button');
    wBtn.id = 'saveWrongBtn';
    wBtn.className = 'ek-link';
    wBtn.style.cssText = 'background:#fef2f2; color:#dc2626; border-color:#fecaca;';
    wBtn.innerHTML = '📌 Yanlışlarımı Notlara Ekle';
    wBtn.onclick = saveWrongQuizAnswersToNotes;
    scoreBox.parentElement.appendChild(wBtn);
  }

  container.innerHTML = activeQuizData.map((item, qIdx) => `
    <div class="quiz-card" id="qcard-${qIdx}">
      <div class="quiz-q">${item.q}</div>
      <div class="quiz-opts">
        ${item.opts.map((opt, oIdx) => `
          <button class="quiz-opt" id="qopt-${qIdx}-${oIdx}" onclick="answerQuiz(${qIdx}, ${oIdx})">${opt}</button>
        `).join('')}
      </div>
      <div class="quiz-exp" id="qexp-${qIdx}">
        <div><strong>💡 Çözüm ve Dayanak:</strong> ${item.exp}</div>
        <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
          <button class="law-link" onclick="openSplitLaw('${item.lawKey}')">⚖️ Dayanak Maddeyi Sağ Ekranda Aç</button>
          <button class="ek-link" onclick="saveQuizToNotes(${qIdx})">📝 Soruyu Notlarıma Ekle</button>
        </div>
      </div>
    </div>
  `).join('');
  linkifyYonEkInElement(container);
  updateQuizScore();
}

function answerQuiz(qIdx, oIdx) {
  if (quizAnswers[qIdx] !== undefined) return;
  quizAnswers[qIdx] = oIdx;
  const item = activeQuizData[qIdx];
  item.opts.forEach((_, idx) => {
    const btn = document.getElementById(`qopt-${qIdx}-${idx}`);
    if (idx === item.ans) btn.classList.add('correct');
    else if (idx === oIdx) btn.classList.add('wrong');
  });
  document.getElementById(`qexp-${qIdx}`).style.display = 'block';
  updateQuizScore();
}

function updateQuizScore() {
  let correct = 0;
  Object.keys(quizAnswers).forEach(k => {
    if (quizAnswers[k] === activeQuizData[k].ans) correct++;
  });
  const sb = document.getElementById('quizScoreBox');
  if (sb) sb.textContent = `Skor: ${correct} / ${activeQuizData.length}`;
}

function resetQuiz() {
  quizAnswers = {};
  renderQuiz();
}

function saveQuizToNotes(qIdx) {
  const item = activeQuizData[qIdx];
  const activeCilt = document.body.getAttribute('data-cilt') || '1';
  openSplitNotes();
  document.getElementById('noteCat').value = '🎓 Sınav / Ders';
  document.getElementById('noteSource').value = `Cilt ${activeCilt} • Soru ${qIdx + 1}`;
  document.getElementById('noteQuote').value = item.q;
  document.getElementById('noteText').value = `Doğru Yanıt: ${item.opts[item.ans]}\nÇözüm: ${item.exp}`;
  saveUserNote();
}

function saveWrongQuizAnswersToNotes() {
  const activeCilt = document.body.getAttribute('data-cilt') || '1';
  const notes = getSavedNotes();
  let added = 0;
  Object.keys(quizAnswers).forEach(k => {
    const qIdx = parseInt(k);
    const item = activeQuizData[qIdx];
    if (quizAnswers[qIdx] !== item.ans) {
      notes.unshift({
        id: Date.now() + qIdx,
        date: new Date().toLocaleString('tr-TR'),
        cat: '🎓 Sınav / Ders',
        src: `Cilt ${activeCilt} • Tekrar Edilecek Soru ${qIdx + 1}`,
        quote: item.q,
        text: `Doğru Yanıt: ${item.opts[item.ans]}\nÇözüm: ${item.exp}`
      });
      added++;
    }
  });
  if (added === 0) {
    alert('Şu ana kadar işaretlediğiniz sorular arasında yanlış yanıt bulunmuyor.');
    return;
  }
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  openSplitNotes();
}

// 13. ARAMA VE GEZİNME FONKSİYONLARI
function filterFihrist() {
  const inputEl = document.getElementById('fihristSearch');
  const rawQ = inputEl.value;
  const q = trNorm(rawQ);
  const resultsBox = document.getElementById('liveSearchResults');
  const groups = document.querySelectorAll('.cilt-group');

  if (q.length < 2) {
    if (resultsBox) resultsBox.style.display = 'none';
    groups.forEach(group => {
      group.style.display = 'block';
      const ul = group.querySelector('.cilt-links');
      if (ul) ul.style.display = 'block';
      group.querySelectorAll('.cilt-links li').forEach(li => li.style.display = 'block');
    });
    return;
  }

  groups.forEach(group => {
    const ul = group.querySelector('.cilt-links');
    if (ul) ul.style.display = 'block';
    const links = group.querySelectorAll('.cilt-links li');
    let hasVisible = false;
    links.forEach(li => {
      if (trNorm(li.textContent).includes(q)) { li.style.display = 'block'; hasVisible = true; }
      else { li.style.display = 'none'; }
    });
    group.style.display = hasVisible ? 'block' : 'none';
  });

  const inPageMatches = [];
  const contentEls = document.querySelectorAll('.main-content h2, .main-content h3, .main-content p, .main-content li, .main-content td, .main-content .mini-card strong');
  contentEls.forEach((el, idx) => {
    const txt = el.innerText || '';
    if (trNorm(txt).includes(q)) {
      if (!el.id) el.id = 'search-hit-' + idx;
      const cleanSnippet = txt.replace(/\s+/g, ' ').substring(0, 95) + (txt.length > 95 ? '...' : '');
      inPageMatches.push({ id: el.id, snippet: cleanSnippet });
    }
  });

  const globalMatches = GLOBAL_INDEX.filter(item => trNorm(item.title + ' ' + item.keys + ' ' + item.cilt).includes(q));

  if (resultsBox) {
    resultsBox.style.display = 'block';
    let html = `<div style="display:flex; justify-content:space-between; align-items:center; padding:4px 8px; border-bottom:1px solid #334155; font-size:0.74rem; color:#fbbf24;">
      <span>🔎 <b>"${rawQ}"</b> (${inPageMatches.length + globalMatches.length} sonuç)</span>
      <span style="cursor:pointer; color:#f87171; font-weight:700;" onclick="clearSearch()">✕ Temizle</span>
    </div>`;
    if (inPageMatches.length > 0) {
      html += `<div style="padding:5px 8px 2px 8px; font-size:0.71rem; color:#34d399; font-weight:700;">📍 BU CİLTTEKİ EŞLEŞMELER (${inPageMatches.length})</div>`;
      inPageMatches.slice(0, 8).forEach(m => {
        html += `<div onclick="jumpToInPage('${m.id}')" style="padding:5px 8px; margin:3px 0; background:#1e293b; border-radius:5px; cursor:pointer; font-size:0.75rem; color:#e2e8f0; border-left:3px solid #34d399;">${m.snippet}</div>`;
      });
    }
    if (globalMatches.length > 0) {
      html += `<div style="padding:5px 8px 2px 8px; font-size:0.71rem; color:#60a5fa; font-weight:700;">📚 TÜM CİLTLER & RESMİ FORMLAR (${globalMatches.length})</div>`;
      globalMatches.forEach(g => {
        html += `<a href="${g.url}" style="display:block; text-decoration:none; padding:5px 8px; margin:3px 0; background:#1e293b; border-radius:5px; font-size:0.75rem; color:#f8fafc; border-left:3px solid #60a5fa;"><span style="color:#fbbf24; font-weight:700;">[${g.cilt}]</span> ${g.title}</a>`;
      });
    }
    resultsBox.innerHTML = html;
  }
}

function jumpToInPage(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('highlight-return');
  setTimeout(() => { el.classList.remove('highlight-return'); }, 2800);
}

function clearSearch() {
  const inputEl = document.getElementById('fihristSearch');
  if (inputEl) inputEl.value = '';
  filterFihrist();
}

function goToEk(ekId, sourceSentenceId) {
  if (sourceSentenceId) lastReadingId = sourceSentenceId;
  const target = document.getElementById(ekId);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.style.outline = '3px solid #2563eb';
    setTimeout(() => { target.style.outline = 'none'; }, 2200);
  }
  const btn = document.getElementById('returnBtn');
  if (btn && lastReadingId) btn.style.display = 'inline-flex';
}

function returnToReading() {
  if (!lastReadingId) return;
  const sourceEl = document.getElementById(lastReadingId);
  if (sourceEl) {
    sourceEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    sourceEl.classList.add('highlight-return');
    setTimeout(() => { sourceEl.classList.remove('highlight-return'); }, 2500);
  }
  document.getElementById('returnBtn').style.display = 'none';
}

function toggleCilt(headerEl) {
  const ul = headerEl.nextElementSibling;
  ul.style.display = (ul.style.display === 'none') ? 'block' : 'none';
}

// 14. CANLI HESAPLAYICILAR (CİLT 1, 2, 3 SAYFA İÇİ)
function hesaplaFizibilite() {
  if (!document.getElementById('c_parsel')) return;
  const parsel = parseFloat(document.getElementById('c_parsel').value) || 0;
  const taks = parseFloat(document.getElementById('c_taks').value) || 0;
  const kaks = parseFloat(document.getElementById('c_kaks').value) || 0;
  const kat = Math.max(1, parseInt(document.getElementById('c_kat').value) || 1);
  const cikma = parseFloat(document.getElementById('c_cikma').value) || 1;
  const tabanAlani = parsel * taks;
  const bazEmsal = parsel * kaks;
  const katBasi = bazEmsal / kat;
  const ustKatEmsal = Math.max(0, bazEmsal - tabanAlani);
  const cikmaliToplam = (cikma > 1) ? (tabanAlani + (ustKatEmsal * cikma)) : bazEmsal;
  const fmt = (n) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²';
  document.getElementById('r_taks').textContent = fmt(tabanAlani);
  document.getElementById('r_kaks').textContent = fmt(bazEmsal);
  document.getElementById('r_katbasi').textContent = fmt(katBasi) + '/kat';
  document.getElementById('r_haric').textContent = fmt(cikmaliToplam);
}

function hesaplaCogunluk() {
  if (!document.getElementById('s_payda')) return;
  const payda = parseFloat(document.getElementById('s_payda').value) || 100;
  const evet = parseFloat(document.getElementById('s_evet').value) || 0;
  const oran = (evet / payda) * 100;
  const yarisi = payda / 2;
  document.getElementById('sr_oran').textContent = '%' + oran.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.getElementById('sr_gereken').textContent = '> ' + yarisi.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Pay (%50,01+)';
  const sonucEl = document.getElementById('sr_sonuc');
  if (evet > yarisi) { sonucEl.textContent = '✅ SALT ÇOĞUNLUK SAĞLANDI (m.15/A Pay Satışı İşletilebilir)'; sonucEl.style.color = '#34d399'; }
  else if (evet === yarisi) { sonucEl.textContent = '⚠️ TAM %50 YETERLİ DEĞİLDİR! (Yarısından Fazlası Şart)'; sonucEl.style.color = '#fbbf24'; }
  else { sonucEl.textContent = '❌ ÇOĞUNLUK SAĞLANMADI (Pay Satışı Yapılamaz)'; sonucEl.style.color = '#f87171'; }
}

function copyTemplate(tplId, btnEl) {
  const text = document.getElementById(tplId).innerText;
  navigator.clipboard.writeText(text).then(() => {
    const orig = btnEl.textContent;
    btnEl.textContent = '✅ Kopyalandı!';
    setTimeout(() => { btnEl.textContent = orig; }, 1800);
  });
}

function updateEvrakProgress() {
  const checks = document.querySelectorAll('#evrakTable input[type="checkbox"]');
  const total = checks.length;
  let checkedCount = 0;
  checks.forEach(c => { if (c.checked) checkedCount++; });
  const pct = Math.round((checkedCount / total) * 100);
  document.getElementById('evrakProgressText').textContent = `${checkedCount} / ${total} Evrak Hazır (%${pct})`;
}

function sorgulaMuteahhitSinifi() {
  if (!document.getElementById('m_alan')) return;
  const alan = parseFloat(document.getElementById('m_alan').value) || 0;
  const yukseklik = parseFloat(document.getElementById('m_yukseklik').value) || 0;
  let yapiSinif = '';
  if (alan <= 2101) yapiSinif = 'H Grubu (veya G1, G, F1, F, E1, E, D, C, B, A)';
  else if (alan <= 4412) yapiSinif = 'G1 Grubu (veya G, F1, F, E1, E, D, C, B, A)';
  else if (alan <= 6177) yapiSinif = 'G Grubu (veya F1, F, E1, E, D, C, B, A)';
  else if (alan <= 9303) yapiSinif = 'F1 Grubu (veya F, E1, E, D, C, B, A)';
  else if (alan <= 11765) yapiSinif = 'F Grubu (veya E1, E, D, C, B, A)';
  else if (alan <= 15686) yapiSinif = 'E1 Grubu (veya E, D, C, B, A)';
  else if (alan <= 22549) yapiSinif = 'E Grubu (veya D1, D, C, B, A)';
  else if (alan <= 41692) yapiSinif = 'D Grubu (veya C1, C, B1, B, A)';
  else if (alan <= 58824) yapiSinif = 'C Grubu (veya B1, B, A)';
  else if (alan <= 70589) yapiSinif = 'B1 Grubu (veya B, A)';
  else if (alan <= 82354) yapiSinif = 'B Grubu (veya A Grubu)';
  else yapiSinif = 'A Grubu (Sınırsız Yetki Grubu Zorunludur)';

  let yikimSinif = (yukseklik <= 17.5) ? 'Y3 Grubu (Y1, Y2 ve Y3 Yetkilidir)' : (yukseklik <= 51.5) ? 'Y2 Grubu (Yalnızca Y1 ve Y2 Yetkilidir)' : 'Y1 Grubu (51,50 m Üstü Yalnızca Y1 Yetkilidir)';
  const fenniEl = document.getElementById('mr_fenni');
  if (yukseklik > 21.5) { fenniEl.textContent = '🚨 ZORUNLU: Bina > 21,50 m olduğu için STATİK FENNİ MESUL şarttır!'; fenniEl.style.color = '#f87171'; }
  else { fenniEl.textContent = '✅ Bina ≤ 21,50 m (Standart yıkım fenni mesulü yeterlidir)'; fenniEl.style.color = '#34d399'; }
  document.getElementById('mr_yapi').textContent = yapiSinif;
  document.getElementById('mr_yikim').textContent = yikimSinif;
}

function hesaplaHizmet() {
  if (!document.getElementById('yg_bedel')) return;
  const bedel = parseFloat(document.getElementById('yg_bedel').value) || 0;
  const oran = parseFloat(document.getElementById('yg_oran').value) || 0;
  const kdvOran = parseFloat(document.getElementById('yg_kdv').value) || 0;
  const net = bedel * (oran / 100);
  const kdv = net * (kdvOran / 100);
  const toplam = net + kdv;
  const fmt = (n) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
  document.getElementById('ygr_net').textContent = fmt(net);
  document.getElementById('ygr_kdv').textContent = fmt(kdv);
  document.getElementById('ygr_toplam').textContent = fmt(toplam);
}