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
// DANIŞMANLIK, YER GÖSTERME, TEKLİF ŞABLONLARI (EK-UZMAN-1..3) VE UYGULAMA DİLEKÇELERİ (EK-3A..3L) KAYDI
Object.assign(YON_EK_DB, {
  'Ek-Uzman-1': {
    title: 'EK-UZMAN-1: Malik Temsil, Koordinasyon ve Kentsel Dönüşüm Danışmanlık Yetki Belgesi',
    ref: '1. Malik Toplantısı Yetki Belgesi • Tapu Devir Yetkisi İçermez (6098 s. TBK m.502 vd.)',
    formText: `KENTSEL DÖNÜŞÜM SÜREÇ KOORDİNASYONU, TEMSİL VE DANIŞMANLIK YETKİ BELGESİ (EK-UZMAN-1)

1. TARAFLAR VE KONU TAŞINMAZ:
• Danışman / Uzman Kuruluş : [OZKAR GAYRİMENKUL / YILMAZ KARACABAY - MYK Seviye 5 Belge No: ...]
• Taşınmaz Bilgileri       : [ANTALYA] İli, [İLÇE] İlçesi, [MAHALLE] Mah., [ADA] Ada, [PARSEL] Parsel ([APARTMAN/SİTE ADI])
• Yetki Veren Malikler     : Ekli imza listesinde adı, soyadı, bağımsız bölüm/hisse oranı ve imzası bulunan taşınmaz malikleri.

2. VERİLEN YETKİLERİN KAPSAMI (TAPU DEVİR YETKİSİ İÇERMEZ):
İşbu belge ile yukarıda bilgileri yazılı taşınmazımızın 6306 sayılı Kanun kapsamında kentsel dönüşüm/yeniden yapım sürecinin yürütülmesi amacıyla Danışman Kuruluş;
a) Belediye, Tapu, Kadastro ve Kentsel Dönüşüm Müdürlüğünden imar durumu, arşiv projesi ve emsal/fizibilite verilerini incelemeye,
b) Taşınmazımızın imar haklarına en uygun mimari ön fizibilite ve teknik şartname taslağını hazırlamaya,
c) Malikler adına YAMBİS yetki belgesine sahip müteahhit firmalarla görüşerek Kat Karşılığı İnşaat Tekliflerini / Niyet Mektuplarını (Ek-Uzman-3) toplamaya ve malikler kuruluna sunmaya yetkilendirilmiştir.

3. DANIŞMANLIK HİZMET BEDELİ, MÜNHASIRLIK VE HAKKIN KORUNMASI HÜKMÜ:
a) Danışman Kuruluşun kentsel dönüşüm koordinasyon ve aracılık hizmet bedeli, maliklerce seçilip Kat Karşılığı İnşaat Sözleşmesi imzalanacak olan YÜKLENİCİ (MÜTEAHHİT) FİRMA tarafından ödenecektir; maliklerden ayrıca bir hizmet bedeli talep edilmeyecektir.
b) Ancak; Danışman Kuruluş tarafından taşınmaz gösterilen, fizibilite sunulan veya teklif alınan müteahhit firmalardan biriyle (veya bu firmaların ortakları/grup şirketleriyle), Danışman Kuruluşun yazılı bilgisi dışında doğrudan sözleşme akdedilmesi halinde, 6098 sayılı TBK m.520 vd. uyarınca doğacak [%4 + KDV] hizmet bedelinden ilgili müteahhit firma ile birlikte sözleşme imzalayan taraflar müteselsilen sorumludur.
c) İşbu yetki belgesi imza tarihinden itibaren [6 / 12] ay süreyle geçerlidir. Uyuşmazlıklarda Antalya Mahkemeleri ve İcra Daireleri yetkilidir. [TARİH]

DANIŞMAN / KENTSEL DÖNÜŞÜM UZMANI                 YETKİ VEREN MALİKLER / TEMSİLCİ HEYETİ
(Kaşe - İmza)                                      (Ad Soyad - Bağımsız Bölüm - İmza Listesi)`
  },
  'Ek-Uzman-2': {
    title: 'EK-UZMAN-2: Kat Karşılığı Proje Sunum, Yer Gösterme, Gizlilik ve Münhasırlık Sözleşmesi (%4 + KDV)',
    ref: 'Taşınmaz Ticareti Yön. m.20 & 6098 s. TBK m.520 vd. • Ada/Parsel Bilgisi Verilmeden Önce İmzalatılır',
    formText: `KAT KARŞILIĞI PROJE SUNUM, YER GÖSTERME, GİZLİLİK VE MÜNHASIRLIK SÖZLEŞMESİ (EK-UZMAN-2)

1. TARAFLAR:
• Aracı / Kentsel Dönüşüm Uzmanı : [OZKAR GAYRİMENKUL - YILMAZ KARACABAY / Vergi No - Yetki Belge No]
• Müteahhit / Yatırımcı Firma    : [FİRMA TAM UNVANI - Vergi No - MERSİS No - YAMBİS Yetki Grup No]
• Firma Yetkilisi                : [AD SOYAD - T.C. Kimlik No - Telefon]

2. SUNULAN PROJE / PARSEL BİLGİLERİ:
• İli / İlçesi / Mahallesi : [ANTALYA] İli, [İLÇE] İlçesi, [MAHALLE] Mahallesi
• Ada / Parsel / Yüzölçümü : [ADA] Ada, [PARSEL] Parsel — [ ...... m² ]
• Mevcut Yapı / Malik Sayısı: [ ... Bağımsız Bölüm / ... Hissedar ]

3. GİZLİLİK, MÜNHASIRLIK, DOĞRUDAN SÖZLEŞME YASAĞI VE HİZMET BEDELİ TAAHHÜDÜ:
a) Müteahhit Firma; yukarıda bilgileri yazılı taşınmazın kentsel dönüşüm / kat karşılığı inşaat projesi fırsatının kendisine İLK DEFA Aracı/Uzman tarafından sunulduğunu, parsel imar analizi ve malik organizasyonu bilgilerinin ticari sır niteliğinde olduğunu kabul ve beyan eder.
b) Müteahhit Firma; Aracı/Uzman'ın yazılı bilgisi ve onayı olmaksızın taşınmaz malikleri veya bina yönetimi ile doğrudan veya dolaylı olarak temasa geçemez, münferit teklif sunamaz.
c) İşbu taşınmazla ilgili olarak Müteahhit Firma tarafından (veya Müteahhit Firma yetkililerinin eşi, kan/sıhri hısımları, ortakları, çalışanları, yeni kuracakları şirketler, adi ortaklıklar veya 3. kişiler üzerinden) taşınmaz malikleriyle Kat Karşılığı İnşaat Sözleşmesi, Hasılat Paylaşımı veya Satış Sözleşmesi akdedilmesi halinde; 6098 sayılı TBK m.520 vd. uyarınca toplam proje/inşaat rayiç bedelinin (veya arsa rayiç bedelinin) [%4 + KDV]'si tutarındaki Danışmanlık ve Aracılık Hizmet Bedelini ve ayrıca bu bedelin [%50]'si oranındaki cezai şartı hiçbir ihtara gerek kalmaksızın nakden ve defaten Aracı/Uzman'a ödemeyi gayrikabili rücu kabul ve taahhüt eder.
d) İşbu sözleşme 6098 sayılı TBK m.520 vd. ile Taşınmaz Ticareti Hakkında Yönetmelik hükümleri uyarınca 2 nüsha düzenlenmiş olup, uyuşmazlıklarda ANTALYA Mahkeme ve İcra Daireleri yetkilidir. [TARİH - SAAT]

ARACI / KENTSEL DÖNÜŞÜM UZMANI                    MÜTEAHHİT FİRMA YETKİLİSİ (KABUL EDEN)
(Ad Soyad - Kaşe - İmza)                           (Firma Kaşesi - Yetkili Ad Soyad - İmza)`
  },
  'Ek-Uzman-3': {
    title: 'EK-UZMAN-3: Müteahhit Kat Karşılığı İnşaat Teklif, Plan Tadilatı/DAP Üstlenme ve Resmi Niyet Mektubu (LOI)',
    ref: '2. Malik Toplantısında Sunulacak Bağlayıcı Müteahhit Teklif Formu',
    formText: `6306 SAYILI KANUN KAPSAMINDA KAT KARŞILIĞI İNŞAAT TEKNİK VE MALİ TEKLİF / NİYET MEKTUBU (EK-UZMAN-3)

KENTSEL DÖNÜŞÜM DANIŞMANLIĞI ([OZKAR GAYRİMENKUL]) ARACILIĞIYLA
[ADA] ADA [PARSEL] PARSEL MALİKLERİ KURULUNA

1. TEKLİF VEREN MÜTEAHHİT FİRMA BİLGİLERİ:
• Firma Unvanı ve Vergi No         : [ .................................................. ]
• YAMBİS Müteahhitlik Yetki Sınıfı : [ Örn: E Grubu / F Grubu - Belge No: ............... ]
• Teklifin Geçerlilik Süresi       : [ ../../2026 ] tarihine kadar ([30] Gün) geçerlidir.

2. MALİ VE PAYLAŞIM TEKLİFİMİZ:
• Arsa Sahipleri Paylaşım Oranı (%) : % [ .... ] Arsa Sahipleri / % [ .... ] Müteahhit Firma
• Arsa Sahiplerine Düşen Daire Adedi: Toplam [ .. ] adet bağımsız bölüm ([M² ve Cephe Özeti])
• Üstüne/Altına Nakit Denkleştirme  : [Varsa daire başı ödenecek/alınacak nakit farkı: ........ TL]
• Maliklere İlave Kira Desteği      : Devlet kira yardımına ek olarak aylık [ ........ TL/Daire ]
• Taşınma Yardımı Desteği           : Daire başına tek seferlik [ ........ TL ]

3. PLAN TADİLATI, DEĞER ARTIŞ PAYI (DAP) VE YASAL GÜVENCE TAAHHÜTLERİMİZ:
a) Plan Tadilatı ve DAP Taahhüdü: Parselde imar haklarının iyileştirilmesi (TAKS artırımı, çekme mesafesi veya İBT/TİCK ticari fonksiyon kazanımı) amacıyla uygulama imar planı değişikliği yapılması halinde; Şehir Plancısı hizmet bedeli, kurum harçları, SPK değerleme ücretleri ve 3194 sayılı Kanun Ek Madde 8 uyarınca doğabilecek Değer Artış Payının (DAP - %90) tamamı, arsa sahiplerinin daire paylarından hiçbir kesinti yapılmaksızın Yüklenici (Müteahhit) Firma tarafından karşılanacaktır.
b) Yapı ruhsatı alınmadan önce 6306 Uygulama Yönetmeliği m.13/9 uyarınca yapı yaklaşık maliyetinin %6'sı oranındaki teminatı İdareye sunacağımızı ve m.13/10 (%10 altı kademeli satış) kuralına tam uyacağımızı,
c) İnşaat süresi: Yapı ruhsatı tarihinden itibaren [18 / 24] ay (+ [3] ay hoşgörü süresi) içinde Yapı Kullanma İzin Belgesi (İskân) alınarak anahtar teslimi yapılacağını,
d) Süreç koordinasyonunu yürüten [OZKAR GAYRİMENKUL] danışmanlık hizmet bedelinin tarafımızca karşılanacağını beyan ve taahhüt ederiz. [TARİH]

TEKLİF VEREN MÜTEAHHİT FİRMA YETKİLİSİ             TEKLİFİ TESLİM ALAN DANIŞMAN / UZMAN
(Kaşe - İmza - Ek: İmza Sirküleri ve YAMBİS Belgesi)  (Ad Soyad - Tarih - İmza)`
  },
  'Ek-3A': {
    title: 'EK-3A: Tapu Müdürlüğü ve Belediye İmar/Arşiv İnceleme & Paydaş Listesi Başvuru Dilekçesi',
    ref: 'Cilt 3 Uygulama Dilekçesi (Aşama 1 - Ön Hazırlık)',
    formText: `TAPU MÜDÜRLÜĞÜNE / BELEDİYE İMAR VE ŞEHİRCİLİK MÜDÜRLÜĞÜNE\n\nKonu: 6306 Sayılı Kanun Hazırlık Süreci Kapsamında Tapu Kaydı, Paydaş Listesi ve Arşiv Proje Örneği Talebi.\n\nİlgi taşınmazımız olan [ANTALYA] İli, [İLÇE] İlçesi, [MAHALLE] Mahallesi, [ADA] Ada, [PARSEL] Parselde kayıtlı taşınmazımızın 6306 sayılı Kanun kapsamında riskli yapı tespiti ve yeniden yapım fizibilitesinin hazırlanabilmesi amacıyla; güncel tapu kayıt örneğinin (paydaş/hisse listesi ve takyidatlı olarak) ve belediye arşiv dosyasındaki onaylı mimari/statik proje örnekleri ile resmi imar durum belgesinin tarafıma verilmesini arz ve talep ederim. [TARİH]\n\nBaşvuran Malik / Yetkili Vekil: [AD SOYAD - T.C. KİMLİK NO - İMZA]\nEk: Tapu Senedi / Kimlik Fotokopisi / Yetki Belgesi`
  },
  'Ek-3B': {
    title: 'EK-3B: Bakanlıkça Lisanslandırılmış Kuruluşa Riskli Yapı Tespiti (Karot) Başvuru Dilekçesi',
    ref: '6306 Uygulama Yönetmeliği Madde 7 • ARAAD Başvuru Dilekçesi (Aşama 3)',
    formText: `[LİSANSLI KURULUŞ UNVANI] YETKİLİ MÜDÜRLÜĞÜNE\n\nKonu: 6306 Sayılı Kanun Kapsamında Riskli Yapı Tespiti Talebi (ARAAD).\n\n[ANTALYA] İli, [İLÇE] İlçesi, [MAHALLE] Mahallesi, [ADA] Ada, [PARSEL] Parsel adresinde bulunan yapımızın 6306 sayılı Afet Riski Altındaki Alanların Dönüştürülmesi Hakkında Kanun uyarınca riskli yapı tespitinin yapılması için ARAAD sistemi üzerinden başvurumuz oluşturulmuş olup, gerekli teknik inceleme ve karot numunesi alım işlemlerinin yapılarak Riskli Yapı Tespit Raporunun hazırlanmasını talep ederim. [TARİH]\n\nBaşvuran Malik: [AD SOYAD - T.C. No - İMZA]\nEkler: 1) Tapu Belgesi, 2) Kimlik Fotokopisi, 3) Emlak Vergisi Beyannamesi / Numarataj Yazısı`
  },
  'Ek-3C': {
    title: 'EK-3C: Riskli Yapı Tespitini Engelleyen / Kapalı Tutulan Bağımsız Bölümler İçin Mülki Amir İzin Dilekçesi',
    ref: '6306 Uygulama Yönetmeliği Madde 7/2-c • İstisnai Kriz Dilekçesi',
    formText: `[İLÇE] KAYMAKAMLIĞINA (Mülki İdare Amirliği)\n(Kentsel Dönüşüm Müdürlüğü / Belediye Başkanlığı Kanalıyla)\n\nKonu: 6306 Sayılı Kanun Kapsamında Riskli Yapı Tespiti Engellemesinin Kolluk Kuvvetiyle Giderilmesi (Yön. m.7/2-c).\n\n[ADA] Ada [PARSEL] Parselde bulunan binamızda Bakanlıkça lisanslı kuruluş tarafından yürütülen riskli yapı tespiti (karot/donatı tespiti) çalışmaları sırasında [ ... ] numaralı bağımsız bölüm maliki/kullanıcısı kapıyı açmamakta ve tespiti engellemektedir. 6306 sayılı Kanun Uygulama Yönetmeliği m.7/2-c uyarınca mülki idare amirliği yazılı izni ve kolluk kuvveti marifetiyle kapalı kapıların açtırılarak tespitin tamamlanmasını arz ederim. [TARİH]`
  },
  'Ek-3D': {
    title: 'EK-3D: Riskli Yapı Tespit Raporuna Karşı 15 Gün İçinde Teknik Heyet İtiraz Dilekçesi',
    ref: '6306 Uygulama Yönetmeliği Madde 9 & 10 • Tebliğden İtibaren 15 Gün İçinde Verilir',
    formText: `ANTALYA KENTSEL DÖNÜŞÜM MÜDÜRLÜĞÜNE\n\nKonu: [ADA] Ada [PARSEL] Parsel Riskli Yapı Tespit Raporuna İtirazımızın Sunulmasıdır (Yön. m.9).\n\nMaliki bulunduğum yukarıda bilgileri yazılı taşınmaza ilişkin düzenlenen Riskli Yapı Tespit Raporu, 6306 sayılı Kanun Uygulama Yönetmeliği Ek-2 (Riskli Yapıların Tespit Edilmesine İlişkin Esaslar) teknik kriterlerine uygun hazırlanmamıştır [İtiraz gerekçeleri: karot adedi, donatı röntgeni, zemin sınıfı vb.]. Raporun Yönetmelik m.10 uyarınca 7 üyeli Teknik Heyet tarafından incelenerek iptaline karar verilmesini arz ederim. [TARİH]\n\nİtiraz Eden Malik: [AD SOYAD - T.C. No - İMZA]`
  },
  'Ek-3E': {
    title: 'EK-3E: Elektrik, Su, Doğalgaz Abonelik Kesme (İlişik Kesme) ve 6 İş Gününde Yıkım Ruhsatı Başvuru Dilekçesi',
    ref: '6306 Uygulama Yönetmeliği Madde 8/3-b • Malik Muvafakati Aranmadan 6 İş Gününde Yıkım Ruhsatı',
    formText: `[İLÇE] BELEDİYE BAŞKANLIĞI İMAR VE ŞEHİRCİLİK MÜDÜRLÜĞÜNE\n\nKonu: Kesinleşen Riskli Yapının Abonelik İlişik Kesme Yazısı ve 6 İş Gününde Yıkım Ruhsatı Düzenlenmesi (Yön. m.8/3-b).\n\n[ADA] Ada [PARSEL] Parseldeki yapımızın riskli yapı tespiti kesinleşmiş olup bina tamamen tahliye edilmiştir. Elektrik, su ve doğalgaz idarelerine aboneliklerin kapatılması için müzekkere yazılmasını ve 6306 Uygulama Yönetmeliği m.8/3-b uyarınca diğer maliklerin muvafakati aranmaksızın 6 iş günü içinde Yıkım Ruhsatının düzenlenmesini arz ederim. [TARİH]\n\nEkler: 1) Kesinleşme Yazısı, 2) Y1/Y2/Y3 Yıkım Müteahhidi Sözleşmesi ve Yıkım Planı (Bina >21,50m ise Statik Fenni Mesul Taahhütnamesi)`
  },
  'Ek-3F': {
    title: 'EK-3F: 6306 Sayılı Kanun Kapsamında Salt Çoğunluk (>%50) Malikler Kurulu Karar Tutanağı',
    ref: '6306 Uygulama Yönetmeliği Madde 15/2 • Ek-12 Çağrısı Sonrası İmzalanan Resmi Karar Tutanağı',
    formText: `6306 SAYILI KANUN KAPSAMINDA MALİKLER KURULU SALT ÇOĞUNLUK (>%50) KARAR TUTANAĞI (EK-3F)\n\nToplantı Tarihi ve Yeri: [ ../../2026 - Saat: .... ]\nTaşınmaz: [ANTALYA] İli, [İLÇE] İlçesi, [MAHALLE] Mah., [ADA] Ada, [PARSEL] Parsel\n\n1. Toplantı çağrısı 6306 Uygulama Yönetmeliği m.15/2 uyarınca Ek-12 formu ile muhtarlıkta/bina kapısında 15 gün süreyle ilan edilerek usulüne uygun tamamlanmıştır.\n2. Taşınmazımızın 6306 sayılı Kanun kapsamında yıkılarak yeniden yapılmasına, Yüklenici olarak [MÜTEAHHİT FİRMA UNVANI] seçilmesine, ekli Avan Proje ve Bağımsız Bölüm Paylaşım Cetvelinin kabulüne, hisseleri oranında paydaşların SALT ÇOĞUNLUĞU (>%50) ile karar verilmiştir.\n\nKABUL EDEN MALİKLER İMZA CETVELİ (Ad Soyad - T.C. No - Bağımsız Bölüm - Arsa Payı Oranı % - İmza)`
  },
  'Ek-3G': {
    title: 'EK-3G: Karara Katılmayan Maliklere Noter Vasıtasıyla Gönderilecek 15 Günlük Teklif İhtarnamesi',
    ref: '6306 Uygulama Yönetmeliği Madde 15/2 • Ek-8 Formu İle Birlikte Gönderilir',
    formText: `İHTARNAME (6306 SAYILI KANUN MADDE 6/1 VE YÖNETMELİK MADDE 15/2 UYARINCA)\n\nKEŞİDECİLER : [ >%50 Salt Çoğunluk Sağlayan Malikler / Vekili ]\nMUHATAP     : [ Karara Katılmayan Malik Ad Soyad ve Adresi ]\nKONU        : [ADA] Ada [PARSEL] Parselde >%50 Salt Çoğunlukla Alınan Yeniden Yapım Kararının ve Kat Karşılığı İnşaat Sözleşmesi Teklifinin Bildirilmesidir.\n\nAÇIKLAMALAR:\nHissedarı bulunduğunuz taşınmazda 6306 sayılı Kanun kapsamında hisseleri oranında paydaşların salt çoğunluğu (>%50) ile yeniden yapım kararı alınmış ve Noterde Kat Karşılığı İnşaat Sözleşmesi imzalanmıştır. Ekli Ek-8 Bildirim Formu ve sözleşme şartlarını işbu ihtarnamenin tarafınıza tebliğinden itibaren 15 (on beş) gün içinde kabul ederek sözleşmeyi imzalamanızı, aksi takdirde arsa payınızın 6306 Uygulama Yönetmeliği m.15/A uyarınca Müdürlük/İdare tarafından açık artırma usulüyle satılacağını ihtaren bildiririz.`
  },
  'Ek-3H': {
    title: 'EK-3H: Anlaşmaya Katılmayan Maliklerin Arsa Paylarının Açık Artırma İle Satışı Başvuru Dilekçesi (m.15/A)',
    ref: '6306 Uygulama Yönetmeliği Madde 15/4 & 15/A • Yapı Ruhsatı Öncesi Başvuru Zorunludur!',
    formText: `ANTALYA KENTSEL DÖNÜŞÜM MÜDÜRLÜĞÜNE\n\nKonu: 6306 Sayılı Kanun Kapsamında >%50 Karara Katılmayan Maliklerin Arsa Paylarının Satışı Başvurusu (m.15/A).\n\n[ADA] Ada [PARSEL] Parselde bulunan riskli yapımızın yeniden yapımı için Ek-12 çağrısı yapılmış, >%50 salt çoğunlukla Noter Kat Karşılığı İnşaat Sözleşmesi imzalanmış ve karara katılmayan maliklere Ek-8 teklifi tebliğ edilerek 15 günlük yasal süre beklenmiştir. Süresi içinde anlaşmaya katılmayan [ ... ] adlı maliklerin arsa paylarının Yönetmelik m.15/A uyarınca açık artırma usulüyle satış işlemlerinin başlatılmasını arz ederiz. [TARİH]\n\nEkler: 1) Ek-12 Çağrı Tutanağı, 2) >%50 Karar ve Noter Sözleşmesi, 3) Ek-8 Tebliğ Belgeleri, 4) SPK Değerleme Raporu`
  },
  'Ek-3I': {
    title: 'EK-3I: 6306 Sayılı Kanun Kapsamında Kira Yardımı (18 Ay) veya Taşınma Yardımı Başvuru Dilekçesi',
    ref: '6306 Uygulama Yönetmeliği Madde 16 • Tahliye/Yıkımdan İtibaren En Geç 1 Yıl İçinde Başvurulur',
    formText: `ANTALYA KENTSEL DÖNÜŞÜM MÜDÜRLÜĞÜNE / BELEDİYE BAŞKANLIĞINA\n\nKonu: 6306 Sayılı Kanun Kapsamında Kira Yardımı / Defaten Taşınma Yardımı Başvurusu (Yön. m.16).\n\n[ADA] Ada [PARSEL] Parselde bulunan ve riskli yapı tespiti kesinleşerek tahliye edilen/yıkılan binadaki [ ... ] numaralı bağımsız bölümün [Malikiyim / Kiracısıyım / İntifa Hakkı Sahibiyim]. 6306 sayılı Kanun Uygulama Yönetmeliği m.16 uyarınca tarafıma [18 Aylık Kira Yardımı / 2 Aylık Kiracı Defaten Yardımı / 5 Aylık Sınırlı Ayni Hak Yardımı] bağlanmasını arz ederim. [TARİH]\n\nIBAN No: TR [ .......................................... ]\nBaşvuran: [AD SOYAD - T.C. No - İMZA]`
  },
  'Ek-3J': {
    title: 'EK-3J: 6306 Kapsamında Haksız Tahsil Edilen Tapu / Noter / Belediye Harçlarının İadesi Dilekçesi',
    ref: '6306 Sayılı Kanun m.7/9 & Yön. m.16/9-10 • 5 Yıllık Zamanaşımı İçinde Vergi Dairesine Verilir',
    formText: `[ ................ ] VERGİ DAİRESİ MÜDÜRLÜĞÜNE / BELEDİYE GELİRLER MÜDÜRLÜĞÜNE\n\nKonu: 6306 Sayılı Kanun Kapsamında Muaf Olunan Harç ve Vergilerin İadesi Talebi (VUK m.116-126).\n\n6306 sayılı Kanun kapsamında yeniden inşa edilen [ADA] Ada [PARSEL] Parseldeki taşınmazımıza ilişkin yapılan işlemde, Kanunun 7/9 ve Yönetmeliğin 16/9-10 maddelerindeki tam muafiyet (ve 1,5 kat belediye harç muafiyeti) hükmüne rağmen ihtirazi kayıtla tahsil edilen [ .......... TL ] harç/vergi tutarının aşağıdaki IBAN hesabıma iade edilmesini arz ederim. [TARİH]`
  },
  'Ek-3K': {
    title: 'EK-3K: Taşınmaz Ticareti Yönetmeliği Uyarınca Standart Kat Karşılığı Yer Gösterme Belgesi (%4 + KDV)',
    ref: 'Taşınmaz Ticareti Hakkında Yönetmelik m.19-20 • Cilt 3 Standart Formu',
    formText: `KAT KARŞILIĞI / ARSA YER GÖSTERME BELGESİ (EK-3K)\n\nİşletme Unvanı ve Yetki Belge No: [OZKAR GAYRİMENKUL - Belge No: ...]\nGösterilen Taşınmaz: [ANTALYA] İli, [İLÇE] İlçesi, [MAHALLE] Mah., [ADA] Ada, [PARSEL] Parsel\nTaşınmazı Gören Müteahhit / Yatırımcı: [FİRMA UNVANI / AD SOYAD / T.C. - VERGİ NO]\n\nYukarıda bilgileri yazılı taşınmaz tarafıma emlak işletmesi tarafından gösterilmiştir. İşbu taşınmazın şahsım, ortağım veya temsil ettiğim şirket tarafından satın alınması veya Kat Karşılığı İnşaat Sözleşmesi imzalanması halinde toplam bedelin [%4 + KDV]'si oranında hizmet bedelini ödeyeceğimi kabul ve beyan ederim. [TARİH - İMZA]`
  },
  'Ek-3L': {
    title: 'EK-3L: Noter Düzenleme Şeklinde Sınırlı İnşaat ve Ruhsat Takip Vekaletnamesi (Güvenli Şablon)',
    ref: '6098 s. TBK m.504 • Ahzu Kabz, Dilediği Bedelle Satış ve Feragat Yetkileri Çıkarılmış Güvenli Şablon',
    formText: `DÜZENLEME ŞEKLİNDE SINIRLI İNŞAAT VE RUHSAT TAKİP VEKALETNAMESİ (EK-3L)\n\nMaliki bulunduğum [ANTALYA] İli, [İLÇE] İlçesi, [MAHALLE] Mah., [ADA] Ada, [PARSEL] Parseldeki taşınmazın, [../../2026] tarih ve [....] yevmiye numaralı Noter Düzenleme Şeklinde Kat Karşılığı İnşaat Sözleşmesi hükümlerine ve eki Bağımsız Bölüm Paylaşım Cetveline BİREBİR UYGUN OLMAK KAYDIYLA; belediye, tapu, kadastro ve kentsel dönüşüm müdürlüklerinde proje onayı, yıkım ruhsatı, yapı ruhsatı, kat irtifakı tesisi ve yapı kullanma izin belgesi (iskân) başvurularını yapmaya ve takip etmeye, (6306 Uygulama Yönetmeliği m.13/10 uyarınca İdarenin yazılı satış izni bulunmadıkça ve sözleşmedeki müteahhit payı haricinde FERAĞ/SATIŞ, AHZU KABZ, SULH, İBRA VE İTİRAZDAN FERAGAT YETKİSİ KAPSAM DIŞI OLMAK ÜZERE) [MÜTEAHHİT FİRMA YETKİLİSİ] vekil tayin edilmiştir.`
  }
});

LAW_DB['imark-ek8-dap'] = {
  title: '3194 Sayılı İmar Kanunu Ek Madde 8 & 22.11.2025 Değer Artış Payı (DAP) Yönetmeliği (0,80 ➔ 1,20 Emsal Artışı, %20 Muafiyet ve Antalya Uygulaması)',
  ref: '3194 s.K. Ek Madde 8 (7534 s.K. m.7) • 22.11.2025 RG: 33085 DAP Yönetmeliği m.5, 6, 7 & Geçici m.3',
  body: `
    <p><strong>1) Plan Tadilatında %100 Oybirliği ve Zamanlama Kuralı (3194 Ek Madde 8 &amp; DAP Yön. m.10):</strong> Malik talebiyle yapılacak uygulama imar planı değişikliği başvurularında parseldeki <strong>bütün maliklerin (%100 oybirliği ile) muvafakati veya noter vekaletnamesi</strong> zorunludur. Riskli yapı tespiti (ARAAD) kesinleşince 90 gün içinde yıkım zorunlu olduğundan, 6–12 ay süren plan tadilatı süreci <strong>ARAAD başvurusundan ÖNCE</strong> tamamlanmalıdır.</p>
    <table class="data-table" style="font-size:0.8rem; margin:10px 0;">
      <thead>
        <tr>
          <th>Plan Tadilatı Türü / Senaryo</th>
          <th>Yasal Şartı ve Emsal (0,80 ➔ 1,20) Durumu</th>
          <th>Değer Artış Payı (%90 DAP) ve Muafiyet Kuralı</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>A) Tek Parselde TAKS / Çekme / Fonksiyon Tadilatı</strong></td>
          <td>Tek parselde nüfus ve emsal (KAKS) artışı <strong>yapılamaz</strong>. Ancak emsal sabit kalmak kaydıyla <strong>TAKS (örn. 0,30 ➔ 0,50)</strong>, çekme mesafesi veya konut dışı <strong>Ticaret/İBT</strong> fonksiyon değişikliği yapılabilir.</td>
          <td>• <strong>6306 kapsamında emsal artmadan</strong> yapılan TAKS/kütle düzeltmesinde <strong>DAP = 0 TL (Tam Muaf)</strong>.<br>• Ticaret/İBT fonksiyon değişimi değer artışı yaratırsa <strong>%90 DAP</strong> doğar.</td>
        </tr>
        <tr>
          <td><strong>B) Riskli Yapıda &amp; Ada Bazında (≥1.000 m²) Emsal Artışı (Örn: 0,80 ➔ 1,20)</strong></td>
          <td><strong>12.12.2024 öncesi</strong> başvurularda 1,5 kat (<code>0,80 × 1,5 = 1,20</code>) muafiyeti vardı (Geçici m.3).<br><strong>Yeni Başvurularda:</strong> En az <strong>1.000 m² ada bazında</strong> veya 6306 riskli yapı kapsamında emsal artışı talep edilebilir.</td>
          <td>⚡ <strong>22.11.2025 Yön. m.6 &amp; m.7 (%20 Muafiyet):</strong> Riskli yapı parsellerinde;<br>• <strong>İlk %20 emsal artışı (0,80 ➔ 0,96 arası): DAP'tan MUAFTIR (0 TL)!</strong><br>• <strong>%20'yi aşan kısım (0,96 ➔ 1,20 arasındaki 0,24 emsal farkı):</strong> Değer artışının <strong>%90'ı DAP olarak ödenir!</strong></td>
        </tr>
        <tr>
          <td><strong>C) Antalya (Kepez / Muratpaşa) Plan Notu Tevhit Teşvikleri</strong></td>
          <td><strong>Kepez Plan Notu (m.1.4.5.2 &amp; 1.4.5.3.5):</strong> Ada bazında tek parselde <strong>+%10 emsal</strong>; tevhit ile <code>5.000–10.000 m²</code>'de <strong>+%5</strong>, <code>&gt;10.000 m²</code>'de <strong>+%10 emsal</strong>; ada bazında veya <strong>≥2.000 m² tevhitte Max 7 Kat</strong> hakkı verilir.</td>
          <td>🟢 <strong>DAP = 0 TL (Muaf):</strong> Mevcut yürürlükteki imar planı notunun tanıdığı tevhit teşvikinden yararlanıldığında veya belediyenin resen yaptığı revizyonlarda <strong>DAP ALINMAZ!</strong></td>
        </tr>
      </tbody>
    </table>
    <p><strong>2) DAP Ödeme Zamanı, %10 Peşin İndirimi ve İşlem Yasağı (Yön. m.13 &amp; m.15):</strong> Değer artışı en az 2 SPK lisanslı kuruluş raporuyla (mevcut bina değeri hariç, sadece arsa değeri üzerinden) Kıymet Takdir Komisyonunca belirlenir. Tebliğden itibaren <strong>7 gün</strong> içinde ödeme tercihi bildirilir: <strong>Peşin ödemede %10 indirim</strong> uygulanır veya <strong>4 eşit taksitle</strong> (TÜFE artışlı) ödenir. <strong>DAP tamamen ödenmeden tapuda satış/devir yapılamaz ve Yapı Ruhsatı düzenlenemez!</strong> (Sözleşme ve Ek-Uzman-3 ile DAP bedeli müteahhide üstlendirilir).</p>
  `
};

const EK_TOKEN_REGEX = /\b(Ek-(?:Uzman-1|Uzman-2|Uzman-3|13|12|11|10|9|8|7\/A|7\/B|7|6|5|4|3[A-L]|3|2|1))(?![A-Za-z0-9])/g;
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
  injectVisualDiagrams(activeCilt);
  renderUserNotes();
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
        <button class="action-pill" style="background:#fae8ff; color:#86198f; border-color:#e879f9;" onclick="openMasterGuideModal()">🧭 A'dan Z'ye Rehber</button>
        <button class="action-pill" style="background:#fef3c7; color:#b45309; border-color:#fcd34d;" onclick="openSemaGalleryModal()">📐 Şemalar (14)</button>
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
              <option value="plan_tadilati_dap">10. İmar Planı Tadilatı &amp; Değer Artış Payı - DAP (3194 Ek Madde 8)</option>
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
window._lastMainContentClickEl = null;
document.addEventListener('click', (e) => {
  if (e.target && e.target.closest && e.target.closest('.main-content') && !e.target.closest('.top-nav')) {
    window._lastMainContentClickEl = e.target;
  }
}, true);

function captureAndAlignSplitTrigger(explicitId, ev) {
  // Eğer tam ekran şema galerisi açıksa ve içinden bir maddeye tıklandıysa galeriyi kapat
  if (typeof closeSemaGalleryModal === 'function') closeSemaGalleryModal();

  let targetEl = null;
  if (explicitId) {
    targetEl = document.getElementById(explicitId);
  }
  const eventObj = ev || (typeof window.event !== 'undefined' ? window.event : null);
  const rawClicked = (eventObj && eventObj.target) ? eventObj.target : window._lastMainContentClickEl;

  if (!targetEl && rawClicked && rawClicked.closest) {
    if (!rawClicked.closest('.top-nav') && !rawClicked.closest('.split-panel') && !rawClicked.closest('.sidebar')) {
      targetEl = rawClicked.closest('.visual-diagram-box, tr, p, li, .mini-card, .alert-box, .quiz-card, h3, h2');
    }
  }
  if (targetEl) {
    document.querySelectorAll('.active-split-source').forEach(el => el.classList.remove('active-split-source'));
    lastSplitTriggerEl = targetEl;
    lastSplitTriggerEl.classList.add('active-split-source');
    [60, 270, 420].forEach(delay => {
      setTimeout(() => {
        if (lastSplitTriggerEl) {
          lastSplitTriggerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, delay);
    });
  }
}

function scrollToSplitSource() {
  if (!lastSplitTriggerEl) return;
  document.querySelectorAll('.active-split-source').forEach(el => el.classList.remove('active-split-source'));
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
  },
  'plan_tadilati_dap': {
    lawKey: 'imark-ek8-dap',
    inputsHtml: `
      <div><label>Plan Tadilatı Malik Muvafakati (%)</label><input type="number" id="v_p1" value="100" step="5" oninput="hesaplaSecmeliOylama()"></div>
      <div><label>Plan Tadilatı Kapsamı ve DAP Durumu</label>
        <select id="v_flag" onchange="hesaplaSecmeliOylama()">
          <option value="emsal_sabit_6306">6306 Kapsamında Emsal Artışsız TAKS/Çekme Tadilatı (DAP Muaf)</option>
          <option value="dap_dogar">Fonksiyon (Ticaret/İBT) veya Değer Artışı Var (%90 DAP - Müteahhit Öder)</option>
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
  } else if (code === 'plan_tadilati_dap') {
    const p1 = parseFloat(document.getElementById('v_p1').value) || 0;
    const flag = document.getElementById('v_flag').value;
    if (p1 === 100 && flag === 'emsal_sabit_6306') {
      setOk(`✅ PLAN TADİLATI YAPILABİLİR & DAP MUAFİYETİ VAR (3194 Ek m.8/3): %100 malik oybirliği sağlandı. 6306 kapsamında toplam inşaat alanı (emsal) artırılmadan yapılan TAKS/çekme tadilatlarından Değer Artış Payı (DAP) ALINMAZ!`);
    } else if (p1 === 100 && flag === 'dap_dogar') {
      setOk(`✅ PLAN TADİLATI YAPILABİLİR (%90 DAP DOĞAR - 3194 Ek m.8): %100 oybirliği sağlandı. Hak kaybı olmaması için ARAAD (Riskli Yapı) başvurusundan ÖNCE meclisten geçirilmeli; %90 DAP ve Şehir Plancısı bedeli Ek-Uzman-3 ile müteahhide üstlendirilmelidir!`);
    } else {
      setErr(`❌ PLAN TADİLATI BAŞVURUSU YAPILAMAZ (3194 Ek m.8): Malik talebiyle yapılacak uygulama imar planı değişikliği başvurularında bütün maliklerin %100 OYBİRLİĞİ şarttır!`);
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
// 15. İNTERAKTİF VEKTÖREL (SVG) MİMARİ ÇİZİM, VAKA VE AKIŞ ŞEMA MOTORU (14 TEKNİK ŞEMA)
const VISUAL_DIAGRAMS_DB = [
  // 1. CİLT 1 - BÖLÜM 1: PARSEL, ÇEKME MESAFELERİ VE DAİRE SEMBOLÜ
  {
    id: 'sema-cilt1-parsel',
    cilt: '1',
    targetSelector: '#bolum-1-nizam, #bolum-1',
    badge: '📐 İNTERAKTİF TEKNİK ŞEMA 1 • CİLT 1 (ÜZERİNE TIKLAYABİLİRSİNİZ)',
    title: 'Kuşbakışı İmar Parseli, Bahçe Çekme Mesafeleri, Yapı Zarfı (TAKS) ve İmar Dairesi (5 / A-4 / 3)',
    desc: 'Şema üzerindeki yapı oturum alanına, çekme mesafelerine veya sağdaki imar çapı dairesine tıklayarak ilgili yönetmelik maddesini yan ekranda açabilirsiniz:',
    svgHtml: `
      <svg viewBox="0 0 820 335" style="width:100%; height:auto; background:#f8fafc; border:1px solid #cbd5e1; border-radius:10px; font-family:'Segoe UI',sans-serif;">
        <rect x="25" y="20" width="470" height="240" fill="#e2e8f0" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="8,5"/>
        <text x="35" y="40" fill="#dc2626" font-size="11" font-weight="bold">PARSEL SINIRI (Net İmar Parseli: 1.000 m²)</text>

        <rect x="25" y="270" width="470" height="48" fill="#334155" rx="4"/>
        <line x1="40" y1="294" x2="480" y2="294" stroke="#fbbf24" stroke-width="2" stroke-dasharray="12,10"/>
        <text x="260" y="289" fill="#ffffff" font-size="12" font-weight="bold" text-anchor="middle">15,00 m İMAR YOLU (Ön Cephe)</text>
        <text x="260" y="310" fill="#cbd5e1" font-size="10" text-anchor="middle">Yol Genişliği 12,00–15,00 m Arası ➔ Max 5 Kat (Antalya İmar Yön. m.9)</text>

        <g onclick="openSplitLaw('paiy-m4')" style="cursor:pointer;">
          <rect x="95" y="80" width="330" height="125" fill="#bfdbfe" stroke="#1d4ed8" stroke-width="2.5" rx="4"/>
          <text x="260" y="130" fill="#1e3a8a" font-size="14" font-weight="bold" text-anchor="middle">BİNA TABAN OTURUMU (YAPI ZARFI)</text>
          <text x="260" y="150" fill="#1d4ed8" font-size="12" font-weight="bold" text-anchor="middle">TAKS = 0,30 (Max 300 m² Taban Alanı)</text>
          <text x="260" y="170" fill="#334155" font-size="10" text-anchor="middle">🔍 (PAİY m.5/6 ve m.20/3 detayını açmak için tıklayın)</text>
        </g>

        <g onclick="openSplitLaw('ant-m23')" style="cursor:pointer;">
          <line x1="260" y1="205" x2="260" y2="260" stroke="#059669" stroke-width="2.5"/>
          <rect x="185" y="221" width="150" height="22" fill="#059669" rx="4"/>
          <text x="260" y="236" fill="#ffffff" font-size="11" font-weight="bold" text-anchor="middle">↕ Ön Bahçe: Min. 5,00 m</text>
          <line x1="260" y1="20" x2="260" y2="80" stroke="#059669" stroke-width="2"/>
          <rect x="175" y="42" width="170" height="22" fill="#0f766e" rx="4"/>
          <text x="260" y="57" fill="#ffffff" font-size="11" font-weight="bold" text-anchor="middle">↕ Arka Bahçe: h/2 (Min 3m+)</text>
          <rect x="30" y="130" width="60" height="26" fill="#047857" rx="4"/>
          <text x="60" y="147" fill="#ffffff" font-size="10" font-weight="bold" text-anchor="middle">↔ Yan: 3m</text>
          <rect x="430" y="130" width="60" height="26" fill="#047857" rx="4"/>
          <text x="460" y="147" fill="#ffffff" font-size="10" font-weight="bold" text-anchor="middle">↔ Yan: 3m</text>
        </g>

        <g onclick="openSplitLaw('ant-m9')" style="cursor:pointer;">
          <rect x="520" y="20" width="275" height="298" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" rx="8"/>
          <text x="657" y="44" fill="#0f172a" font-size="13" font-weight="bold" text-anchor="middle">🎯 E-İMAR DAİRE SEMBOLÜ</text>
          <circle cx="657" cy="124" r="56" fill="#fef3c7" stroke="#0f172a" stroke-width="2.5"/>
          <line x1="602" y1="112" x2="712" y2="112" stroke="#0f172a" stroke-width="2"/>
          <line x1="657" y1="112" x2="657" y2="180" stroke="#0f172a" stroke-width="2"/>
          <text x="657" y="98" fill="#b45309" font-size="18" font-weight="bold" text-anchor="middle">A - 4</text>
          <text x="630" y="150" fill="#1d4ed8" font-size="17" font-weight="bold" text-anchor="middle">5</text>
          <text x="684" y="150" fill="#047857" font-size="17" font-weight="bold" text-anchor="middle">3</text>
          <text x="535" y="206" fill="#b45309" font-size="11" font-weight="bold">• Üst (A - 4): Ayrık Nizam, Max 4 Kat</text>
          <text x="535" y="228" fill="#1d4ed8" font-size="11" font-weight="bold">• Sol Alt (5): Ön Bahçe Mesafesi (5,00 m)</text>
          <text x="535" y="250" fill="#047857" font-size="11" font-weight="bold">• Sağ Alt (3): Yan Bahçe Mesafesi (3,00 m)</text>
          <text x="535" y="272" fill="#dc2626" font-size="10" font-weight="bold">⚠️ 4 kat üstü her katta yan/arka +0,50 m artar!</text>
          <rect x="545" y="286" width="225" height="22" fill="#ede9fe" rx="4"/>
          <text x="657" y="301" fill="#6d28d9" font-size="10" font-weight="bold" text-anchor="middle">⚖️ Antalya İmar Yön. m.9 &amp; m.23 Aç</text>
        </g>
      </svg>
    `
  },

  // 2. CİLT 1 - BÖLÜM 2: EK-1d UYGULAMA İMAR PLANI RENK VE TARAMA KARTELASI
  {
    id: 'sema-cilt1-ek1d',
    cilt: '1',
    targetSelector: '#bolum-2',
    badge: '📐 İNTERAKTİF LEJANT ŞEMASI 2 • CİLT 1 (EK-1d RENK VE TARAMA REHBERİ)',
    title: 'Mekânsal Planlar Yapım Yönetmeliği EK-1d: Uygulama İmar Planı Renk, Tarama ve Sınır Çizgileri Kartelası',
    desc: 'İmar planı paftalarında yer alan arazi kullanım renkleri, TİCK/İBT taramaları ve teknik çizgi sembollerinin görsel anahtarı:',
    svgHtml: `
      <svg viewBox="0 0 820 220" style="width:100%; height:auto; background:#ffffff; border:1px solid #cbd5e1; border-radius:10px; font-family:'Segoe UI',sans-serif;" onclick="openSplitLaw('paiy-m4')">
        <!-- Kutu 1: Konut -->
        <rect x="18" y="18" width="145" height="85" fill="#92400e" stroke="#451a03" stroke-width="2" rx="6"/>
        <text x="90" y="48" fill="#ffffff" font-size="12" font-weight="bold" text-anchor="middle">KONUT ALANI</text>
        <text x="90" y="68" fill="#fef3c7" font-size="10" text-anchor="middle">Kahverengi Tonu</text>
        <text x="90" y="86" fill="#fde68a" font-size="9.5" text-anchor="middle">RGB (153, 76, 0)</text>

        <!-- Kutu 2: Ticaret -->
        <rect x="175" y="18" width="145" height="85" fill="#ef4444" stroke="#991b1b" stroke-width="2" rx="6"/>
        <text x="247" y="48" fill="#ffffff" font-size="12" font-weight="bold" text-anchor="middle">TİCARET (T1/T2)</text>
        <text x="247" y="68" fill="#fee2e2" font-size="10" text-anchor="middle">Canlı Kırmızı</text>
        <text x="247" y="86" fill="#fecaca" font-size="9.5" text-anchor="middle">RGB (255, 0, 0)</text>

        <!-- Kutu 3: TİCK / İBT Karma -->
        <rect x="332" y="18" width="155" height="85" fill="#f59e0b" stroke="#dc2626" stroke-width="2.5" rx="6"/>
        <line x1="340" y1="100" x2="400" y2="20" stroke="#dc2626" stroke-width="4" opacity="0.45"/>
        <line x1="400" y1="100" x2="460" y2="20" stroke="#dc2626" stroke-width="4" opacity="0.45"/>
        <text x="410" y="48" fill="#0f172a" font-size="12" font-weight="bold" text-anchor="middle">TİCK / T+K / İBT</text>
        <text x="410" y="68" fill="#0f172a" font-size="10" font-weight="bold" text-anchor="middle">Sarı/Turuncu + Kırmızı</text>
        <text x="410" y="86" fill="#78350f" font-size="9.5" font-weight="bold" text-anchor="middle">Ticaret + Konut Karma</text>

        <!-- Kutu 4: Kamu / BHA / Eğitim -->
        <rect x="500" y="18" width="145" height="85" fill="#2563eb" stroke="#1e3a8a" stroke-width="2" rx="6"/>
        <text x="572" y="48" fill="#ffffff" font-size="12" font-weight="bold" text-anchor="middle">KAMU / BHA / EĞİTİM</text>
        <text x="572" y="68" fill="#dbeafe" font-size="10" text-anchor="middle">Mavi Tonları</text>
        <text x="572" y="86" fill="#bfdbfe" font-size="9.5" text-anchor="middle">(Özel Konut Yapılamaz)</text>

        <!-- Kutu 5: Park ve Yeşil Alan -->
        <rect x="657" y="18" width="145" height="85" fill="#16a34a" stroke="#14532d" stroke-width="2" rx="6"/>
        <text x="730" y="48" fill="#ffffff" font-size="12" font-weight="bold" text-anchor="middle">PARK / YEŞİL ALAN</text>
        <text x="730" y="68" fill="#dcfce7" font-size="10" text-anchor="middle">Açık Yeşil (0,255,0)</text>
        <text x="730" y="86" fill="#bbf7d0" font-size="9.5" text-anchor="middle">DOP Terki Alanı</text>

        <!-- Alt Bölüm: Plan Çizgi Sembolleri -->
        <rect x="18" y="118" width="784" height="86" fill="#f8fafc" stroke="#cbd5e1" rx="6"/>
        <text x="35" y="140" fill="#0f172a" font-size="11.5" font-weight="bold">📏 PAFTA ÜZERİNDEKİ KRİTİK ÇİZGİ VE SINIR SEMBOLLERİ:</text>

        <line x1="35" y1="165" x2="135" y2="165" stroke="#0f172a" stroke-width="3"/>
        <text x="145" y="169" fill="#1e293b" font-size="10.5" font-weight="bold">İmar Hattı / Ada Sınırı (Yol ile parsel sınırını ayırır)</text>

        <line x1="430" y1="165" x2="530" y2="165" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="8,5"/>
        <polygon points="465,165 473,157 481,165" fill="#dc2626"/>
        <text x="540" y="169" fill="#dc2626" font-size="10.5" font-weight="bold">Yapı Yaklaşma Sınırı (Bina cephesinin aşamayacağı çekme sınırı)</text>

        <line x1="35" y1="190" x2="135" y2="190" stroke="#2563eb" stroke-width="2" stroke-dasharray="4,4"/>
        <text x="145" y="194" fill="#1d4ed8" font-size="10.5" font-weight="bold">İfraz Hattı (Parselin bölünebileceği sınır; ifraz hattıyla ayrılanlar tevhit edilemez - Ant. m.7/10)</text>
      </svg>
    `
  },

  // 3. CİLT 1 - BÖLÜM 3: BİNA YAN KESİTİ VE 1,70 ÇIKMA KATSAYISI
  {
    id: 'sema-cilt1-kesit',
    cilt: '1',
    targetSelector: '#bolum-3',
    badge: '📐 İNTERAKTİF TEKNİK ŞEMA 3 • CİLT 1 (MİMARİ YAN KESİT)',
    title: 'Bina Yan Kesiti: ±0.00 Kırmızı Kot, +2,50 m Subasman, 1,50 m Konsol Çıkma (1,70 Katsayısı) ve 157 m Mânia',
    desc: 'Subasman kotu, 1,50 m konsol çıkmalar (1,70 katsayısı) ve 157 m Havaalanı Mânia sınırının bina kesiti üzerindeki teknik gösterimi:',
    svgHtml: `
      <svg viewBox="0 0 820 320" style="width:100%; height:auto; background:#ffffff; border:1px solid #cbd5e1; border-radius:10px; font-family:'Segoe UI',sans-serif;">
        <line x1="30" y1="26" x2="790" y2="26" stroke="#dc2626" stroke-width="2" stroke-dasharray="10,6"/>
        <rect x="460" y="10" width="315" height="24" fill="#fef2f2" stroke="#dc2626" rx="4" onclick="openSplitLaw('kepez-27594')" style="cursor:pointer;"/>
        <text x="617" y="26" fill="#dc2626" font-size="11" font-weight="bold" text-anchor="middle">✈️ HAVAALANI MÂNİA SINIRI: MAX 157,00 m (Tıkla)</text>

        <line x1="30" y1="250" x2="790" y2="250" stroke="#15803d" stroke-width="3"/>
        <rect x="35" y="226" width="175" height="20" fill="#dcfce7" rx="4"/>
        <text x="122" y="240" fill="#166534" font-size="11" font-weight="bold" text-anchor="middle">±0.00 KIRMIZI KOT (Yol/Zemin)</text>

        <rect x="240" y="210" width="260" height="80" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>
        <line x1="210" y1="210" x2="540" y2="210" stroke="#d97706" stroke-width="2.5" stroke-dasharray="6,4"/>
        <text x="370" y="233" fill="#0f172a" font-size="11" font-weight="bold" text-anchor="middle">BODRUM KAT / OTOPARK &amp; SIĞINAK</text>
        <text x="370" y="272" fill="#334155" font-size="10" text-anchor="middle">Toprak Altı Gömülü Kısım (Emsal Harici)</text>
        <rect x="545" y="200" width="240" height="24" fill="#fef3c7" stroke="#d97706" rx="4"/>
        <text x="665" y="216" fill="#b45309" font-size="11" font-weight="bold" text-anchor="middle">↕ +2,50 m SUBASMAN KOTU (Zemin Tabanı)</text>

        <rect x="240" y="165" width="260" height="45" fill="#93c5fd" stroke="#1d4ed8" stroke-width="2"/>
        <text x="370" y="192" fill="#1e3a8a" font-size="12" font-weight="bold" text-anchor="middle">ZEMİN KAT (TAKS Taban Oturumu - Çıkma Yapılmaz)</text>

        <g onclick="openSplitLaw('ant-m41')" style="cursor:pointer;">
          <rect x="200" y="120" width="340" height="45" fill="#fde68a" stroke="#d97706" stroke-width="2"/>
          <rect x="200" y="75" width="340" height="45" fill="#fde68a" stroke="#d97706" stroke-width="2"/>
          <text x="370" y="102" fill="#78350f" font-size="12" font-weight="bold" text-anchor="middle">ÜST KATLAR: (KAKS − TAKS) × 1,70 ÇIKMA HAKKI</text>
          <text x="370" y="147" fill="#92400e" font-size="11" font-weight="bold" text-anchor="middle">Her İki Yana 1,50 m Kapalı/Açık Konsol Çıkma (m.41 - Tıkla)</text>
          <rect x="65" y="105" width="128" height="38" fill="#fffbeb" stroke="#f59e0b" rx="4"/>
          <text x="129" y="121" fill="#b45309" font-size="10" font-weight="bold" text-anchor="middle">⬅ 1,50 m Konsol Çıkma</text>
          <text x="129" y="135" fill="#78350f" font-size="9" text-anchor="middle">(Yan sınıra min 3m kalmalı)</text>
        </g>

        <polygon points="195,75 370,38 545,75" fill="#e2e8f0" stroke="#475569" stroke-width="2"/>
        <text x="370" y="68" fill="#334155" font-size="10" font-weight="bold" text-anchor="middle">ÇATI ARASI &amp; ASANSÖR KULESİ (m.34)</text>
      </svg>
    `
  },

  // 4. CİLT 1 - VAKA 4.1: MURATPAŞA 1291 ADA 8 PARSEL (435 m²) GÖRSEL ŞEMASI
  {
    id: 'sema-cilt1-vaka41',
    cilt: '1',
    headingMatch: '4.1.',
    targetSelector: '#bolum-4',
    badge: '📐 SAHA VAKA ŞEMASI 4.1 • CİLT 1 (MURATPAŞA 1291 ADA 8 PARSEL - 435 m²)',
    title: 'Vaka 4.1 Görsel Analizi: 435 m² Parselde TAKS (0,50), KAKS (1,50 × 1,70) ve 15 Daire (8 Malik + 7 Müteahhit) Paylaşımı',
    desc: 'Muratpaşa 1291 Ada 8 Parselin 435 m² arsa alanından 1.109 m² inşaat alanı üretilmesi ve 15 bağımsız bölümün katlara göre paylaşım şeması:',
    svgHtml: `
      <svg viewBox="0 0 820 230" style="width:100%; height:auto; background:#f8fafc; border:1px solid #cbd5e1; border-radius:10px; font-family:'Segoe UI',sans-serif;" onclick="openSplitEk('ek-1e')">
        <!-- Sol: Parsel ve Katsayı Dönüşümü -->
        <rect x="18" y="18" width="250" height="194" fill="#ffffff" stroke="#0284c7" stroke-width="2" rx="8" style="cursor:pointer;"/>
        <text x="143" y="42" fill="#0369a1" font-size="12.5" font-weight="bold" text-anchor="middle">📍 1291 ADA 8 PARSEL ÖZETİ</text>
        <rect x="34" y="55" width="218" height="32" fill="#e0f2fe" rx="5"/>
        <text x="143" y="75" fill="#0c4a6e" font-size="11.5" font-weight="bold" text-anchor="middle">Net Arsa Alanı: 435,00 m²</text>
        <text x="34" y="108" fill="#334155" font-size="10.5" font-weight="bold">• TAKS (0,50): 217,50 m² (Kullanılan: 218 m²)</text>
        <text x="34" y="128" fill="#334155" font-size="10.5" font-weight="bold">• Baz KAKS (1,50): 435 × 1,50 = 652,50 m²</text>
        <text x="34" y="148" fill="#b45309" font-size="10.5" font-weight="bold">• 1,70 Çıkmalı Kapasite: 1.109,25 m²</text>
        <text x="34" y="168" fill="#047857" font-size="10.5" font-weight="bold">• Projelendirilen: 1.109 m² (15 Daire × ~79 m²)</text>
        <rect x="34" y="178" width="218" height="24" fill="#0284c7" rx="4"/>
        <text x="143" y="194" fill="#ffffff" font-size="10" font-weight="bold" text-anchor="middle">📎 Ek-1E Kat Paylaşım Cetvelini Aç ➔</text>

        <!-- Orta & Sağ: 15 Dairelik Bina Kat Dağılımı -->
        <rect x="285" y="18" width="515" height="194" fill="#0f172a" rx="8" style="cursor:pointer;"/>
        <text x="542" y="42" fill="#fbbf24" font-size="12.5" font-weight="bold" text-anchor="middle">🏢 15 BAĞIMSIZ BÖLÜM KAT PAYLAŞIM ŞEMASI (%53,3 ARSA SAHİPLERİ / %46,7 MÜTEAHHİT)</text>

        <!-- Kat Satırları -->
        <rect x="305" y="56" width="310" height="24" fill="#065f46" rx="4"/><text x="460" y="72" fill="#fff" font-size="10.5" font-weight="bold" text-anchor="middle">4. Normal Kat (3 Daire): 2 Malik + 1 Müteahhit</text>
        <rect x="305" y="84" width="310" height="24" fill="#047857" rx="4"/><text x="460" y="100" fill="#fff" font-size="10.5" font-weight="bold" text-anchor="middle">3. Normal Kat (3 Daire): 2 Malik + 1 Müteahhit</text>
        <rect x="305" y="112" width="310" height="24" fill="#059669" rx="4"/><text x="460" y="128" fill="#fff" font-size="10.5" font-weight="bold" text-anchor="middle">2. Normal Kat (3 Daire): 2 Malik + 1 Müteahhit</text>
        <rect x="305" y="140" width="310" height="24" fill="#1d4ed8" rx="4"/><text x="460" y="156" fill="#fff" font-size="10.5" font-weight="bold" text-anchor="middle">1. Normal Kat (3 Daire): 1 Malik + 2 Müteahhit</text>
        <rect x="305" y="168" width="310" height="24" fill="#4338ca" rx="4"/><text x="460" y="184" fill="#fff" font-size="10.5" font-weight="bold" text-anchor="middle">Zemin Kat (3 Daire): 1 Malik + 2 Müteahhit</text>

        <!-- Sağ Özet Kutuları -->
        <rect x="630" y="58" width="152" height="62" fill="#064e3b" stroke="#34d399" stroke-width="1.5" rx="6"/>
        <text x="706" y="80" fill="#6ee7b7" font-size="11" font-weight="bold" text-anchor="middle">ARSA SAHİPLERİ</text>
        <text x="706" y="102" fill="#ffffff" font-size="16" font-weight="bold" text-anchor="middle">8 DAİRE</text>

        <rect x="630" y="130" width="152" height="62" fill="#1e1b4b" stroke="#818cf8" stroke-width="1.5" rx="6"/>
        <text x="706" y="152" fill="#a5b4fc" font-size="11" font-weight="bold" text-anchor="middle">YÜKLENİCİ (MÜT.)</text>
        <text x="706" y="174" fill="#ffffff" font-size="16" font-weight="bold" text-anchor="middle">7 DAİRE</text>
      </svg>
    `
  },

  // 5. CİLT 1 - VAKA 4.2: KEPEZ GÜNEŞ MAH. 27594 ADA 1 PARSEL (16.250,65 m²) E-İMAR PAFTA ŞEMASI
  {
    id: 'sema-cilt1-vaka42',
    cilt: '1',
    headingMatch: '4.2.',
    targetSelector: '#bolum-4',
    badge: '📐 SAHA VAKA ŞEMASI 4.2 • CİLT 1 (KEPEZ GÜNEŞ MAH. 27594 ADA 1 PARSEL - 16.250,65 m²)',
    title: 'Vaka 4.2 Görsel E-İmar Paftası: 22m/12m Yollar, 10m/5m Çekmeler, İBT, 157m Mânia ve Gri Gecekondu İzleri',
    desc: 'Kepez Belediyesi e-imar belgesindeki tüm sembollerin (Turkuaz parsel dolgusu, 22.00/12.00 yol daireleri, İBT, +2,50 m subasman ve gri mevcut bina izlerinin) görsel pafta çözümü:',
    svgHtml: `
      <svg viewBox="0 0 820 290" style="width:100%; height:auto; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:10px; font-family:'Segoe UI',sans-serif;" onclick="openSplitLaw('kepez-27594')">
        <!-- Kuzey 22.00m Yol -->
        <rect x="75" y="12" width="415" height="32" fill="#334155" rx="4"/>
        <circle cx="282" cy="28" r="13" fill="#fef3c7" stroke="#0f172a" stroke-width="1.5"/>
        <text x="282" y="32" fill="#0f172a" font-size="10" font-weight="bold" text-anchor="middle">22</text>
        <text x="165" y="32" fill="#ffffff" font-size="11" font-weight="bold">KUZEY ANA İMAR YOLU (22.00 m)</text>

        <!-- Batı 22.00m Yol -->
        <rect x="18" y="12" width="50" height="265" fill="#334155" rx="4"/>
        <text x="43" y="145" fill="#fbbf24" font-size="11" font-weight="bold" text-anchor="middle" transform="rotate(-90 43 145)">BATI YOLU (22.00 m)</text>

        <!-- Güney 12.00m Yol -->
        <rect x="75" y="248" width="415" height="29" fill="#475569" rx="4"/>
        <text x="282" y="267" fill="#ffffff" font-size="11" font-weight="bold" text-anchor="middle">GÜNEY İMAR YOLU (Daire İçi: 12.00 m)</text>

        <!-- Turkuaz Parsel (27594/1) -->
        <rect x="75" y="50" width="415" height="192" fill="#67e8f9" fill-opacity="0.45" stroke="#0891b2" stroke-width="3" rx="6" style="cursor:pointer;"/>
        <!-- Yapı Yaklaşma Sınırı (10m ve 5m) -->
        <rect x="115" y="86" width="345" height="130" fill="#ffffff" fill-opacity="0.7" stroke="#dc2626" stroke-width="2" stroke-dasharray="7,4" rx="4"/>

        <!-- Çekme Rakamları (10 ve 5) -->
        <rect x="235" y="56" width="110" height="22" fill="#dc2626" rx="4"/>
        <text x="290" y="71" fill="#ffffff" font-size="10.5" font-weight="bold" text-anchor="middle">↕ 22m Yoldan: 10m</text>
        <text x="95" y="150" fill="#dc2626" font-size="10" font-weight="bold" text-anchor="middle">↔ 10m</text>
        <text x="290" y="234" fill="#047857" font-size="10.5" font-weight="bold" text-anchor="middle">↕ 12m Yoldan Çekme: 5,00 m</text>

        <!-- Gri Mevcut Bina/Gecekondu İzleri -->
        <polygon points="135,105 185,100 190,135 140,140" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
        <polygon points="215,155 270,150 275,190 210,195" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
        <polygon points="365,110 425,115 420,155 360,150" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
        <text x="290" y="116" fill="#0f172a" font-size="13" font-weight="bold" text-anchor="middle">27594 / 1 (İBT - İsteğe Bağlı Ticaret)</text>
        <text x="290" y="136" fill="#1e3a8a" font-size="11" font-weight="bold" text-anchor="middle">Gri Çokgenler = Halihazır Mevcut Gecekondu İzleridir!</text>
        <text x="290" y="152" fill="#b91c1c" font-size="10" font-weight="bold" text-anchor="middle">(Yeni projenin vaziyet planı değildir; yıkılacak yapıları gösterir)</text>

        <!-- Sağ: Teknik Hesap ve Kısıt Kartı -->
        <rect x="505" y="12" width="298" height="265" fill="#0f172a" rx="8" style="cursor:pointer;"/>
        <text x="654" y="36" fill="#fbbf24" font-size="12" font-weight="bold" text-anchor="middle">📊 27594/1 PARSEL KÜTLE HESABI</text>
        <text x="520" y="60" fill="#e2e8f0" font-size="10.5" font-weight="bold">• Gösterilen Alan: <tspan fill="#38bdf8">16.250,65 m²</tspan></text>
        <text x="520" y="80" fill="#e2e8f0" font-size="10.5" font-weight="bold">• Yapı Nizamı: <tspan fill="#34d399">Ayrık Nizam, MAX = 7 Kat</tspan></text>
        <text x="520" y="100" fill="#e2e8f0" font-size="10.5" font-weight="bold">• TAKS (0,30): <tspan fill="#fbbf24">Max 4.875,20 m² Taban</tspan></text>
        <text x="520" y="120" fill="#e2e8f0" font-size="10.5" font-weight="bold">• EMSAL (0,60): <tspan fill="#fbbf24">9.750,39 m² Baz Emsal</tspan></text>
        <text x="520" y="140" fill="#e2e8f0" font-size="10.5" font-weight="bold">• Subasman &amp; Çıkma: <tspan fill="#c4b5fd">+2,50 m | Katsayı: 1,70</tspan></text>
        <text x="520" y="160" fill="#e2e8f0" font-size="10.5" font-weight="bold">• Min. İfraz Şartı: <tspan fill="#34d399">En az 1.200 m²</tspan></text>
        <rect x="520" y="175" width="268" height="44" fill="#7f1d1d" stroke="#f87171" rx="5"/>
        <text x="654" y="193" fill="#fef08a" font-size="10.5" font-weight="bold" text-anchor="middle">✈️ HAVAALANI MÂNİA SINIRI: 157 METRE</text>
        <text x="654" y="210" fill="#fecaca" font-size="9.5" text-anchor="middle">(Arazi Kotu + Bina + Baca/Anten ≤ 157 m)</text>
        <rect x="520" y="232" width="268" height="28" fill="#0284c7" rx="5" onclick="event.stopPropagation(); openSplitEk('ek-1f');"/>
        <text x="654" y="250" fill="#ffffff" font-size="10.5" font-weight="bold" text-anchor="middle">📎 Ek-1F: 27594/1 Malik İsimleri Krokisini Aç ➔</text>
      </svg>
    `
  },

  // 6. CİLT 2 - BÖLÜM 2: 6306 7 ADIMLI ZAMAN ŞEMASI
  {
    id: 'sema-cilt2-akis',
    cilt: '2',
    targetSelector: '#bolum-2',
    badge: '📐 İNTERAKTİF AKIŞ ŞEMASI 6 • CİLT 2 (6306 SÜREÇ HARİTASI)',
    title: '6306 Sayılı Kanun Riskli Yapı Tespiti, İtiraz, Yıkım, >%50 Karar ve Satış (m.15/A) 7 Adımlı Zaman Şeması',
    desc: 'Aşağıdaki 7 aşamadan herhangi birinin kutusuna tıklayarak ilgili yönetmelik maddesini veya resmi tutanak şablonunu (Ek-6, Ek-7/A, Ek-12, Ek-8) sağ ekranda açabilirsiniz:',
    svgHtml: `
      <svg viewBox="0 0 840 220" style="width:100%; height:auto; background:#0f172a; border-radius:10px; font-family:'Segoe UI',sans-serif; padding:6px;">
        <g onclick="openSplitLaw('yon-m7')" style="cursor:pointer;">
          <rect x="12" y="25" width="105" height="165" fill="#1e293b" stroke="#38bdf8" stroke-width="2" rx="8"/>
          <circle cx="64" cy="52" r="15" fill="#0284c7"/><text x="64" y="57" fill="#fff" font-size="12" font-weight="bold" text-anchor="middle">1</text>
          <text x="64" y="84" fill="#38bdf8" font-size="11" font-weight="bold" text-anchor="middle">ARAAD TESPİT</text>
          <text x="64" y="104" fill="#e2e8f0" font-size="9.5" text-anchor="middle">Tek malik başvurabilir</text>
          <text x="64" y="120" fill="#e2e8f0" font-size="9.5" text-anchor="middle">Lisanslı Kuruluş (Ek-1)</text>
          <text x="64" y="136" fill="#fbbf24" font-size="9.5" font-weight="bold" text-anchor="middle">En geç 10 İş Günü</text>
          <text x="64" y="152" fill="#94a3b8" font-size="9" text-anchor="middle">Tapuya Şerh Bildirimi</text>
          <text x="64" y="176" fill="#38bdf8" font-size="9" font-weight="bold" text-anchor="middle">⚖️ Madde 7 Aç</text>
        </g>
        <g onclick="openYonEk('Ek-6', event)" style="cursor:pointer;">
          <rect x="130" y="25" width="105" height="165" fill="#1e293b" stroke="#34d399" stroke-width="2" rx="8"/>
          <circle cx="182" cy="52" r="15" fill="#059669"/><text x="182" y="57" fill="#fff" font-size="12" font-weight="bold" text-anchor="middle">2</text>
          <text x="182" y="84" fill="#34d399" font-size="11" font-weight="bold" text-anchor="middle">ASKI &amp; TEBLİĞ</text>
          <text x="182" y="104" fill="#e2e8f0" font-size="9.5" text-anchor="middle">Bina Kapısına Askı</text>
          <text x="182" y="120" fill="#e2e8f0" font-size="9.5" text-anchor="middle">e-Devlet Bildirimi</text>
          <text x="182" y="136" fill="#fbbf24" font-size="9.5" font-weight="bold" text-anchor="middle">Muhtarlıkta 15 Gün</text>
          <text x="182" y="152" fill="#94a3b8" font-size="9" text-anchor="middle">(15. gün tebliğ sayılır)</text>
          <text x="182" y="176" fill="#34d399" font-size="9" font-weight="bold" text-anchor="middle">📋 Ek-6 Formu Aç</text>
        </g>
        <g onclick="openSplitLaw('yon-m9-10')" style="cursor:pointer;">
          <rect x="248" y="25" width="105" height="165" fill="#1e293b" stroke="#f59e0b" stroke-width="2" rx="8"/>
          <circle cx="300" cy="52" r="15" fill="#d97706"/><text x="300" y="57" fill="#fff" font-size="12" font-weight="bold" text-anchor="middle">3</text>
          <text x="300" y="84" fill="#fbbf24" font-size="11" font-weight="bold" text-anchor="middle">İTİRAZ &amp; HEYET</text>
          <text x="300" y="104" fill="#fbbf24" font-size="9.5" font-weight="bold" text-anchor="middle">+15 Gün İtiraz Süresi</text>
          <text x="300" y="120" fill="#e2e8f0" font-size="9.5" text-anchor="middle">7 Üyeli Teknik Heyet</text>
          <text x="300" y="136" fill="#e2e8f0" font-size="9.5" text-anchor="middle">(4 Üniv. + 3 Bakanlık)</text>
          <text x="300" y="152" fill="#94a3b8" font-size="9" text-anchor="middle">Kesinleşme &amp; İdari Dava</text>
          <text x="300" y="176" fill="#fbbf24" font-size="9" font-weight="bold" text-anchor="middle">⚖️ Madde 9-10 Aç</text>
        </g>
        <g onclick="openYonEk('Ek-7/A', event)" style="cursor:pointer;">
          <rect x="366" y="25" width="105" height="165" fill="#1e293b" stroke="#f87171" stroke-width="2" rx="8"/>
          <circle cx="418" cy="52" r="15" fill="#dc2626"/><text x="418" y="57" fill="#fff" font-size="12" font-weight="bold" text-anchor="middle">4</text>
          <text x="418" y="84" fill="#f87171" font-size="11" font-weight="bold" text-anchor="middle">TAHLİYE &amp; YIKIM</text>
          <text x="418" y="104" fill="#fbbf24" font-size="9.5" font-weight="bold" text-anchor="middle">Max 90 Gün Süre</text>
          <text x="418" y="120" fill="#e2e8f0" font-size="9.5" text-anchor="middle">Aboneliklerin Kesilmesi</text>
          <text x="418" y="136" fill="#34d399" font-size="9.5" font-weight="bold" text-anchor="middle">6 İş Günü Yıkım Ruhsatı</text>
          <text x="418" y="152" fill="#94a3b8" font-size="9" text-anchor="middle">(Muvafakat aranmaz)</text>
          <text x="418" y="176" fill="#f87171" font-size="9" font-weight="bold" text-anchor="middle">📋 Ek-7/A Formu Aç</text>
        </g>
        <g onclick="openYonEk('Ek-12', event)" style="cursor:pointer;">
          <rect x="484" y="25" width="105" height="165" fill="#1e293b" stroke="#c084fc" stroke-width="2" rx="8"/>
          <circle cx="536" cy="52" r="15" fill="#9333ea"/><text x="536" y="57" fill="#fff" font-size="12" font-weight="bold" text-anchor="middle">5</text>
          <text x="536" y="84" fill="#c084fc" font-size="11" font-weight="bold" text-anchor="middle">&gt;%50 KARAR</text>
          <text x="536" y="104" fill="#e2e8f0" font-size="9.5" text-anchor="middle">Ek-12 ile 15 Gün Çağrı</text>
          <text x="536" y="120" fill="#fbbf24" font-size="9.5" font-weight="bold" text-anchor="middle">Salt Çoğunluk (&gt;%50)</text>
          <text x="536" y="136" fill="#e2e8f0" font-size="9.5" text-anchor="middle">(Yıkım şartı aranmaz)</text>
          <text x="536" y="152" fill="#94a3b8" font-size="9" text-anchor="middle">Sözleşme &amp; Müteahhit</text>
          <text x="536" y="176" fill="#c084fc" font-size="9" font-weight="bold" text-anchor="middle">📋 Ek-12 Formu Aç</text>
        </g>
        <g onclick="openYonEk('Ek-8', event)" style="cursor:pointer;">
          <rect x="602" y="25" width="105" height="165" fill="#1e293b" stroke="#34d399" stroke-width="2" rx="8"/>
          <circle cx="654" cy="52" r="15" fill="#059669"/><text x="654" y="57" fill="#fff" font-size="12" font-weight="bold" text-anchor="middle">6</text>
          <text x="654" y="84" fill="#34d399" font-size="11" font-weight="bold" text-anchor="middle">TEKLİF BİLDİRİMİ</text>
          <text x="654" y="104" fill="#e2e8f0" font-size="9.5" text-anchor="middle">Katılmayan Maliklere</text>
          <text x="654" y="120" fill="#e2e8f0" font-size="9.5" text-anchor="middle">Noter / e-Tebligat /</text>
          <text x="654" y="136" fill="#fbbf24" font-size="9.5" font-weight="bold" text-anchor="middle">Ek-8 ile 15 Gün Süre</text>
          <text x="654" y="152" fill="#94a3b8" font-size="9" text-anchor="middle">SPK Değerleme Raporu</text>
          <text x="654" y="176" fill="#34d399" font-size="9" font-weight="bold" text-anchor="middle">📋 Ek-8 Formu Aç</text>
        </g>
        <g onclick="openSplitLaw('yon-m15-3-4-a')" style="cursor:pointer;">
          <rect x="720" y="25" width="108" height="165" fill="#1e293b" stroke="#fbbf24" stroke-width="2" rx="8"/>
          <circle cx="774" cy="52" r="15" fill="#b45309"/><text x="774" y="57" fill="#fff" font-size="12" font-weight="bold" text-anchor="middle">7</text>
          <text x="774" y="84" fill="#fbbf24" font-size="11" font-weight="bold" text-anchor="middle">SATIŞ &amp; RUHSAT</text>
          <text x="774" y="104" fill="#f87171" font-size="9.5" font-weight="bold" text-anchor="middle">Ruhsat Öncesi m.15/A</text>
          <text x="774" y="120" fill="#e2e8f0" font-size="9.5" text-anchor="middle">Satış Başvurusu Şart!</text>
          <text x="774" y="136" fill="#e2e8f0" font-size="9.5" text-anchor="middle">%6 Teminat (m.13/9)</text>
          <text x="774" y="152" fill="#34d399" font-size="9" font-weight="bold" text-anchor="middle">1,5 Kat Harç Muafiyeti</text>
          <text x="774" y="176" fill="#fbbf24" font-size="9" font-weight="bold" text-anchor="middle">⚖️ Madde 15/A Aç</text>
        </g>
      </svg>
    `
  },

  // 7. CİLT 2 - BÖLÜM 3: İKİ RİSKLİ PARSEL VE BOŞ PARSEL TEVHİDİ (MADDE 15/8)
  {
    id: 'sema-cilt2-tevhit',
    cilt: '2',
    targetSelector: '#bolum-3-tevhit, #bolum-3',
    badge: '📐 İNTERAKTİF PARSEL ŞEMASI 7 • CİLT 2 (MADDE 15/8 TEVHİT KURALI)',
    title: '6306 Yönetmeliği Madde 15/8: İki Riskli Yapı Parselinin ve Bitişik Boş Parselin Tevhidi (Birleştirilmesi)',
    desc: 'Parsellerin birleştirilebilmesi için her parselde ayrı ayrı aranan karar çoğunlukları ve tevhit sonrası yeni parseldeki karar kuralı:',
    svgHtml: `
      <svg viewBox="0 0 820 235" style="width:100%; height:auto; background:#f8fafc; border:1px solid #cbd5e1; border-radius:10px; font-family:'Segoe UI',sans-serif;" onclick="openSplitLaw('yon-m15-8')">
        <rect x="20" y="25" width="160" height="145" fill="#dcfce7" stroke="#059669" stroke-width="2.5" rx="6" style="cursor:pointer;"/>
        <text x="100" y="52" fill="#065f46" font-size="13" font-weight="bold" text-anchor="middle">1. RİSKLİ PARSEL</text>
        <text x="100" y="72" fill="#047857" font-size="10.5" text-anchor="middle">(Yapıların Tamamı Riskli)</text>
        <rect x="35" y="88" width="130" height="32" fill="#059669" rx="5"/>
        <text x="100" y="109" fill="#ffffff" font-size="12" font-weight="bold" text-anchor="middle">Ayrı &gt;%50 Şart</text>
        <text x="100" y="145" fill="#065f46" font-size="10" font-weight="bold" text-anchor="middle">✅ Örn: %60 Kabul (Geçerli)</text>

        <text x="195" y="105" fill="#0f172a" font-size="22" font-weight="bold" text-anchor="middle">+</text>

        <rect x="210" y="25" width="160" height="145" fill="#dcfce7" stroke="#059669" stroke-width="2.5" rx="6" style="cursor:pointer;"/>
        <text x="290" y="52" fill="#065f46" font-size="13" font-weight="bold" text-anchor="middle">2. RİSKLİ PARSEL</text>
        <text x="290" y="72" fill="#047857" font-size="10.5" text-anchor="middle">(Yapıların Tamamı Riskli)</text>
        <rect x="225" y="88" width="130" height="32" fill="#059669" rx="5"/>
        <text x="290" y="109" fill="#ffffff" font-size="12" font-weight="bold" text-anchor="middle">Ayrı &gt;%50 Şart</text>
        <text x="290" y="145" fill="#dc2626" font-size="10" font-weight="bold" text-anchor="middle">⚠️ %45 Olursa Tevhit YASAK!</text>

        <text x="385" y="105" fill="#0f172a" font-size="22" font-weight="bold" text-anchor="middle">+</text>

        <rect x="400" y="25" width="165" height="145" fill="#fef3c7" stroke="#d97706" stroke-width="2.5" stroke-dasharray="6,4" rx="6" style="cursor:pointer;"/>
        <text x="482" y="52" fill="#92400e" font-size="12.5" font-weight="bold" text-anchor="middle">YAPILAŞMAMIŞ BOŞ</text>
        <text x="482" y="70" fill="#b45309" font-size="10.5" text-anchor="middle">(Bitişik Boş Parsel Varsa)</text>
        <rect x="415" y="88" width="135" height="32" fill="#dc2626" rx="5"/>
        <text x="482" y="109" fill="#ffffff" font-size="12" font-weight="bold" text-anchor="middle">%100 OYBİRLİĞİ</text>
        <text x="482" y="145" fill="#78350f" font-size="9.5" font-weight="bold" text-anchor="middle">(Harç muafiyeti oranlanır m.16/11)</text>

        <text x="585" y="105" fill="#2563eb" font-size="24" font-weight="bold" text-anchor="middle">➔</text>

        <rect x="605" y="25" width="195" height="145" fill="#dbeafe" stroke="#1d4ed8" stroke-width="3" rx="8" style="cursor:pointer;"/>
        <text x="702" y="52" fill="#1e3a8a" font-size="13" font-weight="bold" text-anchor="middle">TEVHİT SONRASI YENİ</text>
        <text x="702" y="70" fill="#1d4ed8" font-size="11" font-weight="bold" text-anchor="middle">BİRLEŞİK İMAR PARSELİ</text>
        <rect x="620" y="88" width="165" height="32" fill="#1d4ed8" rx="5"/>
        <text x="702" y="109" fill="#ffffff" font-size="11.5" font-weight="bold" text-anchor="middle">Yeni Parselde &gt;%50 Karar</text>
        <text x="702" y="145" fill="#1e3a8a" font-size="9.5" font-weight="bold" text-anchor="middle">Alan artışı olamaz (Ant. Yön m.7/9)</text>

        <rect x="20" y="185" width="780" height="36" fill="#0f172a" rx="6"/>
        <text x="410" y="208" fill="#fbbf24" font-size="11" font-weight="bold" text-anchor="middle">💡 ALTIN KURAL (m.15/8): İki riskli parselin oyları toplanarak ortalama alınamaz! (Örn: 1. Parsel %80 + 2. Parsel %45 ➔ TEVHİT YAPILAMAZ)</text>
      </svg>
    `
  },

  // 8. CİLT 2 - BÖLÜM 5 & 6: FİNANSAL GÜVENCELER (%6 TEMİNAT, %10 SATIŞ, 1,5 KAT MUAFİYET) VE İDARİ FESİH (m.13/11)
  {
    id: 'sema-cilt2-finans-fesih',
    cilt: '2',
    targetSelector: '#bolum-5, #bolum-6',
    badge: '📐 İNTERAKTİF SÜREÇ ŞEMASI 8 • CİLT 2 (TEMİNAT, KADEMELİ SATIŞ, MUAFİYET VE İDARİ FESİH)',
    title: '6306 Yönetmeliği m.13 & m.16: %10 Altı Kademeli Satış Barometresi, 1,5 Kat Muafiyet ve Sözleşmenin İdari Feshi',
    desc: 'Müteahhidin daire satış sınırı (m.13/10), belediye harç muafiyeti (m.16/10) ve işi bırakan müteahhidin sözleşmesinin Bakanlıkça feshi (m.13/11) akışı:',
    svgHtml: `
      <svg viewBox="0 0 820 235" style="width:100%; height:auto; background:#ffffff; border:1px solid #cbd5e1; border-radius:10px; font-family:'Segoe UI',sans-serif;" onclick="openSplitLaw('yon-m13')">
        <!-- Sol Üst: Kademeli Satış Barometresi -->
        <rect x="18" y="16" width="385" height="98" fill="#f8fafc" stroke="#0284c7" stroke-width="2" rx="8" style="cursor:pointer;"/>
        <text x="210" y="36" fill="#0369a1" font-size="11.5" font-weight="bold" text-anchor="middle">📊 MÜTEAHHİT PAYI KADEMELİ SATIŞ SINIRI (Madde 13/10)</text>
        <rect x="35" y="48" width="350" height="22" fill="#e2e8f0" rx="4"/>
        <rect x="35" y="48" width="210" height="22" fill="#0284c7" rx="4"/>
        <text x="140" y="63" fill="#ffffff" font-size="10" font-weight="bold" text-anchor="middle">İnşaat İlerlemesi: %60</text>
        <rect x="35" y="76" width="175" height="22" fill="#059669" rx="4"/>
        <text x="122" y="91" fill="#ffffff" font-size="10" font-weight="bold" text-anchor="middle">Satış İzin Sınırı: Max %50 (%10 Altı!)</text>
        <text x="300" y="91" fill="#dc2626" font-size="9.5" font-weight="bold" text-anchor="middle">İdare Yazısı Şarttır!</text>

        <!-- Sağ Üst: 1,5 Kat Harç Muafiyeti -->
        <rect x="417" y="16" width="385" height="98" fill="#ecfdf5" stroke="#059669" stroke-width="2" rx="8" onclick="event.stopPropagation(); openSplitLaw('yon-m16');" style="cursor:pointer;"/>
        <text x="610" y="36" fill="#065f46" font-size="11.5" font-weight="bold" text-anchor="middle">💰 1,5 KAT BELEDİYE HARÇ MUAFİYETİ (Madde 16/10)</text>
        <rect x="435" y="48" width="230" height="28" fill="#059669" rx="4"/>
        <text x="550" y="66" fill="#ffffff" font-size="10.5" font-weight="bold" text-anchor="middle">Eski Bina × 1,5 Kat = %100 HARÇTAN MUAF</text>
        <rect x="668" y="48" width="118" height="28" fill="#ef4444" rx="4"/>
        <text x="727" y="66" fill="#ffffff" font-size="10" font-weight="bold" text-anchor="middle">Aşan m²: Harca Tabi</text>
        <text x="610" y="98" fill="#047857" font-size="10" font-weight="bold" text-anchor="middle">📌 Haksız alınan tapu/noter harçları 5 yıl içinde Vergi Dairesinden iade alınır.</text>

        <!-- Alt: İdari Fesih Akışı (Madde 13/11) -->
        <rect x="18" y="126" width="784" height="94" fill="#0f172a" rx="8" style="cursor:pointer;"/>
        <text x="410" y="148" fill="#fbbf24" font-size="12" font-weight="bold" text-anchor="middle">⚠️ SÖZLEŞMELERİN BAKANLIK / MÜDÜRLÜK ELİYLE İDARİ FESHİ AKIŞI (MADDE 13/11)</text>
        <rect x="32" y="160" width="175" height="44" fill="#1e293b" stroke="#f87171" rx="6"/>
        <text x="119" y="178" fill="#fca5a5" font-size="10" font-weight="bold" text-anchor="middle">1. ŞART: 1 Yıl Başlamama</text>
        <text x="119" y="194" fill="#e2e8f0" font-size="9.5" text-anchor="middle">veya En Az 6 Ay Durma</text>

        <text x="218" y="186" fill="#fbbf24" font-size="16" font-weight="bold">➔</text>

        <rect x="232" y="160" width="165" height="44" fill="#1e293b" stroke="#38bdf8" rx="6"/>
        <text x="314" y="178" fill="#38bdf8" font-size="10" font-weight="bold" text-anchor="middle">2. BAŞVURU: &gt;%50 Karar</text>
        <text x="314" y="194" fill="#e2e8f0" font-size="9.5" text-anchor="middle">ile Müdürlüğe Müracaat</text>

        <text x="408" y="186" fill="#fbbf24" font-size="16" font-weight="bold">➔</text>

        <rect x="422" y="160" width="175" height="44" fill="#1e293b" stroke="#fbbf24" rx="6"/>
        <text x="509" y="178" fill="#fbbf24" font-size="10" font-weight="bold" text-anchor="middle">3. İHTAR: 15 Gün Savunma</text>
        <text x="509" y="194" fill="#e2e8f0" font-size="9.5" text-anchor="middle">+ 30 Gün İşe Başlama Süresi</text>

        <text x="608" y="186" fill="#fbbf24" font-size="16" font-weight="bold">➔</text>

        <rect x="622" y="160" width="165" height="44" fill="#7f1d1d" stroke="#ef4444" rx="6"/>
        <text x="704" y="178" fill="#ffffff" font-size="10" font-weight="bold" text-anchor="middle">4. SONUÇ: Resen Fesih</text>
        <text x="704" y="194" fill="#fef08a" font-size="9" font-weight="bold" text-anchor="middle">(Ödenen kiralar geri istenemez)</text>
      </svg>
    `
  },

  // 9. CİLT 2 - BÖLÜM 7: ÇOKLU YAPILAR ALT ALTA 4 SENARYOLU TAM ŞEMA (SENARYO A, B, C, D)
  {
    id: 'sema-cilt2-coklu',
    cilt: '2',
    targetSelector: '#bolum-7',
    badge: '📐 İNTERAKTİF 4 KATMANLI VAZİYET ŞEMASI 9 • CİLT 2 (MADDE 15/6, 15/7, 7/2-a VE PAİY m.55/12)',
    title: 'Aynı Parselde Birden Fazla Yapı Bulunması: Alt Alta 4 Senaryolu Karar, Resen İfraz ve Uygulama Rehberi',
    desc: 'Sahada karşılaşılan 4 farklı çoklu yapı senaryosunun (Tamamı Riskli, Kısmi Riskli + Resen İfraz, İfraz Edilemeyen Kaçak Yapı Engeli ve Hisseli Arsada Fiili Gecekondu) alt alta şematik çözümü:',
    svgHtml: `
      <svg viewBox="0 0 820 490" style="width:100%; height:auto; background:#f8fafc; border:1px solid #cbd5e1; border-radius:10px; font-family:'Segoe UI',sans-serif;" onclick="openSplitLaw('yon-m15-6-7')">
        <!-- SENARYO A (Üst 1. Satır) -->
        <rect x="16" y="14" width="788" height="106" fill="#fef2f2" stroke="#dc2626" stroke-width="2" rx="8" style="cursor:pointer;"/>
        <text x="30" y="35" fill="#991b1b" font-size="12.5" font-weight="bold">🔴 SENARYO A — PARSELDEKİ BÜTÜN YAPILARIN RİSKLİ OLMASI (Yönetmelik Madde 15/6 &amp; Örnek A)</text>
        <rect x="30" y="46" width="88" height="44" fill="#ef4444" rx="4"/><text x="74" y="72" fill="#fff" font-size="10.5" font-weight="bold" text-anchor="middle">A Yapısı (Riskli)</text>
        <rect x="126" y="46" width="88" height="44" fill="#ef4444" rx="4"/><text x="170" y="72" fill="#fff" font-size="10.5" font-weight="bold" text-anchor="middle">B Yapısı (Riskli)</text>
        <rect x="222" y="46" width="88" height="44" fill="#ef4444" rx="4"/><text x="266" y="72" fill="#fff" font-size="10.5" font-weight="bold" text-anchor="middle">C Yapısı (Riskli)</text>
        <rect x="325" y="44" width="465" height="64" fill="#ffffff" stroke="#fca5a5" rx="6"/>
        <text x="338" y="63" fill="#0f172a" font-size="11" font-weight="bold">• Karar Kuralı: <tspan fill="#dc2626">Yapının paydaşı olup olmadığına bakılmaksızın BÜTÜN PAYDAŞLARIN &gt;%50'si</tspan></text>
        <text x="338" y="81" fill="#334155" font-size="10.5">• Saha Örneği A: Paylar P1(%35) + P2(%25) + P3(%20) + P4(%20) ➔ <tspan font-weight="bold" fill="#047857">P1+P2 = %60 (&gt;%50) ile karar alınır.</tspan></text>
        <text x="338" y="98" fill="#475569" font-size="10">• Katılmayan P3 ve P4'e Ek-8 ile 15 gün süre verilir; kabul etmezlerse m.15/A açık artırma satışı uygulanır.</text>

        <!-- SENARYO B (2. Satır) -->
        <rect x="16" y="132" width="788" height="106" fill="#ecfdf5" stroke="#059669" stroke-width="2" rx="8" style="cursor:pointer;"/>
        <text x="30" y="153" fill="#065f46" font-size="12.5" font-weight="bold">🟢 SENARYO B — YALNIZ BAZI YAPILARIN RİSKLİ OLMASI VE RESEN İFRAZ (Yönetmelik Madde 15/7 &amp; Örnek B)</text>
        <rect x="30" y="164" width="82" height="44" fill="#ef4444" rx="4"/><text x="71" y="185" fill="#fff" font-size="10" font-weight="bold" text-anchor="middle">A (RİSKLİ)</text><text x="71" y="199" fill="#fef08a" font-size="8.5" text-anchor="middle">Oy Kullanır</text>
        <rect x="118" y="164" width="82" height="44" fill="#ef4444" rx="4"/><text x="159" y="185" fill="#fff" font-size="10" font-weight="bold" text-anchor="middle">B (RİSKLİ)</text><text x="159" y="199" fill="#fef08a" font-size="8.5" text-anchor="middle">Oy Kullanır</text>
        <line x1="212" y1="158" x2="212" y2="228" stroke="#2563eb" stroke-width="3" stroke-dasharray="5,3"/>
        <text x="212" y="232" fill="#1d4ed8" font-size="9" font-weight="bold" text-anchor="middle">✂️ Resen İfraz</text>
        <rect x="224" y="164" width="86" height="44" fill="#10b981" rx="4"/><text x="267" y="185" fill="#fff" font-size="10" font-weight="bold" text-anchor="middle">C (RİSKSİZ)</text><text x="267" y="199" fill="#ecfdf5" font-size="8.5" text-anchor="middle">Kapsam Dışı</text>
        <rect x="325" y="162" width="465" height="64" fill="#ffffff" stroke="#6ee7b7" rx="6"/>
        <text x="338" y="181" fill="#065f46" font-size="11" font-weight="bold">• Karar Kuralı: <tspan fill="#047857">Yalnızca RİSKLİ YAPI (A ve B) PAYDAŞLARININ kendi içinde &gt;%50 çoğunluğu</tspan></text>
        <text x="338" y="199" fill="#334155" font-size="10.5">• Tapu Şerhi &amp; İfraz: Şerh yalnız A ve B adresine işlenir; <tspan font-weight="bold" fill="#1d4ed8">ifraz mümkünse A ve B alanı RESEN İFRAZ edilir.</tspan></text>
        <text x="338" y="216" fill="#475569" font-size="10">• C yapısı yıkılmaz ve C maliklerinin mülkiyet hakları korunur (Örnek B: R1 %40 + R2 %35 = %75 &gt; %50 geçerli).</text>

        <!-- SENARYO C (3. Satır) -->
        <rect x="16" y="250" width="788" height="106" fill="#fffbeb" stroke="#d97706" stroke-width="2" rx="8" style="cursor:pointer;"/>
        <text x="30" y="271" fill="#92400e" font-size="12.5" font-weight="bold">🟡 SENARYO C — İFRAZ MÜMKÜN DEĞİLSE VE PARSELDE RUHSATSIZ (KAÇAK) YAPI VARSA (m.15/7-c &amp; PAİY m.55/12)</text>
        <rect x="30" y="284" width="135" height="54" fill="#ef4444" rx="4"/><text x="97" y="308" fill="#fff" font-size="10.5" font-weight="bold" text-anchor="middle">A Yapısı (Riskli Yıkıldı)</text><text x="97" y="324" fill="#fef08a" font-size="9" text-anchor="middle">Yeni Ruhsat İstiyor</text>
        <rect x="175" y="284" width="135" height="54" fill="#b45309" rx="4"/><text x="242" y="308" fill="#fff" font-size="10.5" font-weight="bold" text-anchor="middle">C Yapısı (Ruhsatsız/Kaçak)</text><text x="242" y="324" fill="#fde68a" font-size="9" text-anchor="middle">İfraz Edilemiyor</text>
        <rect x="325" y="280" width="465" height="64" fill="#ffffff" stroke="#fcd34d" rx="6"/>
        <text x="338" y="299" fill="#92400e" font-size="11" font-weight="bold">• Kritik Engel (PAİY m.55/12): <tspan fill="#dc2626">Parseldeki kaçak yapı ruhsata bağlanmadan / yıkılmadan ruhsat çıkmaz!</tspan></text>
        <text x="338" y="317" fill="#334155" font-size="10.5">• Çözüm Yolu: Min. ifraz şartı (örn. 1.200 m²) sağlanamıyorsa C yapısı için de riskli yapı tespiti yaptırılır</text>
        <text x="338" y="334" fill="#475569" font-size="10">veya imar mevzuatına uygun hale getirilerek/yıktırılarak tüm parsel bütün olarak projelendirilir.</text>

        <!-- SENARYO D (4. Satır) -->
        <rect x="16" y="368" width="788" height="108" fill="#eff6ff" stroke="#2563eb" stroke-width="2" rx="8" onclick="event.stopPropagation(); openSplitLaw('yon-m7');" style="cursor:pointer;"/>
        <text x="30" y="389" fill="#1e3a8a" font-size="12.5" font-weight="bold">🔵 SENARYO D — KAT İRTİFAKI OLMAYAN HİSSELİ ARSADA FİİLİ GECEKONDU / 91 HİSSEDAR MODELİ (Madde 7/2-a)</text>
        <rect x="30" y="402" width="135" height="54" fill="#1d4ed8" rx="4"/><text x="97" y="425" fill="#fff" font-size="10.5" font-weight="bold" text-anchor="middle">1. Tespit Başvurusu</text><text x="97" y="441" fill="#bfdbfe" font-size="9" text-anchor="middle">Fiili Yapı Sahibi (m.7/2-a)</text>
        <rect x="175" y="402" width="135" height="54" fill="#059669" rx="4"/><text x="242" y="425" fill="#fff" font-size="10.5" font-weight="bold" text-anchor="middle">2. Yıkım Sonrası Karar</text><text x="242" y="441" fill="#dcfce7" font-size="9" text-anchor="middle">Tüm Hissedarlar &gt;%50</text>
        <rect x="325" y="398" width="465" height="66" fill="#ffffff" stroke="#93c5fd" rx="6"/>
        <text x="338" y="417" fill="#1e3a8a" font-size="11" font-weight="bold">• Tespit Aşaması (m.7/2-a): <tspan fill="#0f172a">Arsa paylı tapuda risk tespitini binanın FİİLİ SAHİBİ olan hissedar yaptırır.</tspan></text>
        <text x="338" y="435" fill="#334155" font-size="10.5">• Sözleşme Aşaması (m.15/2): Yapı yıkıldıktan/risk kesinleştikten sonra yeni yapılacak binanın sözleşmesine</text>
        <text x="338" y="452" fill="#047857" font-size="10" font-weight="bold">tapudaki tüm arsa hissedarları (Örn: Sinan Mah. 539/90 parsel 91 hissedar) hisseleri oranında &gt;%50 ile karar verir.</text>
      </svg>
    `
  },

  // 10. CİLT 3 - BÖLÜM 5: MÜTEAHHİT VE YIKIM SINIFLARI KULE ŞEMASI
  {
    id: 'sema-cilt3-muteahhit',
    cilt: '3',
    targetSelector: '#bolum-5',
    badge: '📐 İNTERAKTİF KULE ŞEMASI 10 • CİLT 3 (MÜTEAHHİT VE YIKIM SINIFLARI)',
    title: 'Yapı Müteahhitliği Yetki Grupları (Geçici ve H–A) ile Yıkım Müteahhitliği (Y3, Y2, Y1 & 21,50 m Fenni Mesul Sınırı)',
    desc: 'Projenin toplam inşaat alanına (m²) ve bina yüksekliğine göre zorunlu müteahhit yetki belgesi grupları:',
    svgHtml: `
      <svg viewBox="0 0 820 230" style="width:100%; height:auto; background:#0f172a; border-radius:10px; font-family:'Segoe UI',sans-serif;" onclick="openSplitLaw('mut-sinif')">
        <text x="260" y="28" fill="#fbbf24" font-size="13" font-weight="bold" text-anchor="middle">🏗️ YAPI MÜTEAHHİTLİĞİ YETKİ SINIFLARI (m² SINIRI)</text>
        <rect x="20" y="165" width="52" height="35" fill="#ef4444" rx="4"/><text x="46" y="158" fill="#fca5a5" font-size="9.5" font-weight="bold" text-anchor="middle">Geçici</text><text x="46" y="186" fill="#fff" font-size="9" text-anchor="middle">500m²</text>
        <rect x="80" y="148" width="52" height="52" fill="#f59e0b" rx="4"/><text x="106" y="142" fill="#fde68a" font-size="10" font-weight="bold" text-anchor="middle">H Grubu</text><text x="106" y="178" fill="#fff" font-size="9" text-anchor="middle">2.101m²</text>
        <rect x="140" y="130" width="52" height="70" fill="#10b981" rx="4"/><text x="166" y="124" fill="#6ee7b7" font-size="10" font-weight="bold" text-anchor="middle">G1 / G</text><text x="166" y="168" fill="#fff" font-size="9" text-anchor="middle">6.177m²</text>
        <rect x="200" y="110" width="52" height="90" fill="#06b6d4" rx="4"/><text x="226" y="104" fill="#67e8f9" font-size="10" font-weight="bold" text-anchor="middle">F1 / F</text><text x="226" y="158" fill="#fff" font-size="9" text-anchor="middle">11.765m²</text>
        <rect x="260" y="90" width="52" height="110" fill="#3b82f6" rx="4"/><text x="286" y="84" fill="#93c5fd" font-size="10" font-weight="bold" text-anchor="middle">E1 / E</text><text x="286" y="148" fill="#fff" font-size="9" text-anchor="middle">22.549m²</text>
        <rect x="320" y="70" width="52" height="130" fill="#8b5cf6" rx="4"/><text x="346" y="64" fill="#c4b5fd" font-size="10" font-weight="bold" text-anchor="middle">D / C</text><text x="346" y="138" fill="#fff" font-size="9" text-anchor="middle">58.824m²</text>
        <rect x="380" y="48" width="52" height="152" fill="#ec4899" rx="4"/><text x="406" y="42" fill="#fbcfe8" font-size="10" font-weight="bold" text-anchor="middle">B1 / B</text><text x="406" y="128" fill="#fff" font-size="9" text-anchor="middle">82.354m²</text>
        <rect x="440" y="36" width="55" height="164" fill="#fbbf24" rx="4"/><text x="467" y="120" fill="#0f172a" font-size="11" font-weight="bold" text-anchor="middle">A GRUBU</text><text x="467" y="138" fill="#0f172a" font-size="9.5" font-weight="bold" text-anchor="middle">SINIRSIZ</text>
        <text x="255" y="218" fill="#fca5a5" font-size="10" font-weight="bold" text-anchor="middle">⚠️ Geçici Grup (500 m²) yalnızca kendi arsasını yapabilir; Kat Karşılığı Kentsel Dönüşüm YAPAMAZ!</text>

        <rect x="520" y="20" width="285" height="198" fill="#1e293b" stroke="#f87171" stroke-width="2" rx="8"/>
        <text x="662" y="44" fill="#f87171" font-size="12.5" font-weight="bold" text-anchor="middle">🏚️ YIKIM SINIFLARI &amp; 21,50 m KURALI</text>
        <rect x="538" y="58" width="250" height="34" fill="#065f46" rx="5"/>
        <text x="663" y="79" fill="#ffffff" font-size="11" font-weight="bold" text-anchor="middle">Y3 Grubu: Bina Yüksekliği ≤ 17,50 m (5-6 Kat)</text>
        <rect x="538" y="100" width="250" height="34" fill="#1d4ed8" rx="5"/>
        <text x="663" y="121" fill="#ffffff" font-size="11" font-weight="bold" text-anchor="middle">Y2 Grubu: Bina Yüksekliği ≤ 51,50 m (16-17 Kat)</text>
        <rect x="538" y="142" width="250" height="32" fill="#7c3aed" rx="5"/>
        <text x="663" y="162" fill="#ffffff" font-size="11" font-weight="bold" text-anchor="middle">Y1 Grubu: Sınırsız İrtifa &amp; Patlayıcılı Yıkım</text>
        <text x="662" y="198" fill="#fbbf24" font-size="10.5" font-weight="bold" text-anchor="middle">🚨 Bina &gt; 21,50 m ise STATİK FENNİ MESUL Şart! (m.8/3)</text>
      </svg>
    `
  },

  // 11. CİLT 3 - BÖLÜM 6: VEKALETNAME TRAFİK IŞIĞI MATRİSİ (EK-3L GÜVENLİK ANALİZİ)
  {
    id: 'sema-cilt3-vekalet',
    cilt: '3',
    targetSelector: '#bolum-6',
    badge: '📐 İNTERAKTİF GÜVENLİK ŞEMASI 11 • CİLT 3 (TBK m.504 & EK-3L VEKALETNAME ANALİZİ)',
    title: 'Müteahhide Verilecek Noter Vekaletnamesinde Trafik Işığı Güvenlik Matrisi (🟢 Güvenli / 🟡 Şartlı / 🔴 Tehlikeli)',
    desc: 'Noterde düzenleme şeklinde vekaletname (Ek-3L) verilirken arsa sahiplerini koruyan 3 kademeli yetki kontrol şeması:',
    svgHtml: `
      <svg viewBox="0 0 820 220" style="width:100%; height:auto; background:#ffffff; border:1px solid #cbd5e1; border-radius:10px; font-family:'Segoe UI',sans-serif;" onclick="openSplitLaw('vekalet-tbk504')">
        <!-- Yeşil: Güvenli Yetkiler -->
        <rect x="16" y="16" width="252" height="188" fill="#ecfdf5" stroke="#059669" stroke-width="2" rx="8" style="cursor:pointer;"/>
        <text x="142" y="40" fill="#065f46" font-size="12" font-weight="bold" text-anchor="middle">🟢 VERİLEBİLİR (GÜVENLİ) YETKİLER</text>
        <text x="28" y="66" fill="#0f172a" font-size="10.5">✅ Belediye arşivinden proje/belge alma</text>
        <text x="28" y="88" fill="#0f172a" font-size="10.5">✅ Elektrik, su, doğalgaz abonelik kesme</text>
        <text x="28" y="110" fill="#0f172a" font-size="10.5">✅ Yıkım ruhsatı ve yapı ruhsatı başvurusu</text>
        <text x="28" y="132" fill="#0f172a" font-size="10.5">✅ Zemin etüdü, mimari/statik proje onayı</text>
        <text x="28" y="154" fill="#0f172a" font-size="10.5">✅ Sözleşmedeki paylaşım cetveline uygun</text>
        <text x="40" y="170" fill="#047857" font-size="10" font-weight="bold">kat irtifakı ve iskân başvurusu yapma</text>

        <!-- Sarı: Şarta Bağlı Yetkiler -->
        <rect x="284" y="16" width="252" height="188" fill="#fffbeb" stroke="#d97706" stroke-width="2" rx="8" style="cursor:pointer;"/>
        <text x="410" y="40" fill="#92400e" font-size="12" font-weight="bold" text-anchor="middle">🟡 ŞARTA BAĞLANMASI GEREKENLER</text>
        <text x="296" y="66" fill="#0f172a" font-size="10.5">⚠️ <tspan font-weight="bold">Ferağ (Tapu Devir) Yetkisi:</tspan> Yalnızca</text>
        <text x="306" y="82" fill="#78350f" font-size="10">sözleşmede müteahhide düşen daireler için</text>
        <text x="306" y="96" fill="#78350f" font-size="10">ve İdarenin %10 altı kademeli satış iznine</text>
        <text x="306" y="110" fill="#78350f" font-size="10">(m.13/10) bağlı olarak verilmelidir.</text>
        <text x="296" y="134" fill="#0f172a" font-size="10.5">⚠️ <tspan font-weight="bold">Tevhit / İfraz Yetkisi:</tspan> Noter sözleşmesi</text>
        <text x="306" y="150" fill="#78350f" font-size="10">ve onaylı avan projeye uygunluk şartıyla</text>
        <text x="296" y="172" fill="#b45309" font-size="10" font-weight="bold">⚠️ 65+ Yaş Maliklerde Aynı Gün Ehliyet Raporu!</text>

        <!-- Kırmızı: Çıkarılması Gereken Tehlikeli Yetkiler -->
        <rect x="552" y="16" width="252" height="188" fill="#fef2f2" stroke="#dc2626" stroke-width="2.5" rx="8" style="cursor:pointer;"/>
        <text x="678" y="40" fill="#991b1b" font-size="12" font-weight="bold" text-anchor="middle">🔴 ÇIKARILMASI ŞART (ÇOK RİSKLİ!)</text>
        <text x="564" y="66" fill="#dc2626" font-size="10.5" font-weight="bold">❌ "Dilediği bedel ve şartlarla satış/sözleşme"</text>
        <text x="564" y="88" fill="#dc2626" font-size="10.5" font-weight="bold">❌ "Dilediği bağımsız bölümü adıma seçme"</text>
        <text x="564" y="110" fill="#dc2626" font-size="10.5" font-weight="bold">❌ "Ahzu kabz" (Arsa sahibi adına para çekme)</text>
        <text x="564" y="132" fill="#dc2626" font-size="10.5" font-weight="bold">❌ "Sulh olma, ibra etme, davadan feragat"</text>
        <text x="564" y="154" fill="#dc2626" font-size="10.5" font-weight="bold">❌ "Risk ve değerleme raporuna itirazdan</text>
        <text x="578" y="170" fill="#991b1b" font-size="10" font-weight="bold">peşinen feragat etme" (Ek-3L Analizini Aç ➔)</text>
      </svg>
    `
  },

  // 12. CİLT 4 - BÖLÜM 3: BALKON VE TERAS EMSAL PLANI
  {
    id: 'sema-cilt4-balkon',
    cilt: '4',
    targetSelector: '#bolum-3',
    badge: '📐 İNTERAKTİF MİMARİ PLAN ŞEMASI 12 • CİLT 4 (EMSAL HARİCİ BALKON VE TERAS KURALI)',
    title: 'Antalya İmar Yönetmeliği m.22 & Bakanlık Görüşü: Emsal Harici Açık Konsol Balkon (%20) vs. Emsale Dahil Balkonlar',
    desc: 'Hangi balkon ve terasların %20/%30 emsal harici hakkından yararlandığını, hangilerinin doğrudan KAKS (emsal) hesabına dahil edildiğini gösteren kat planı:',
    svgHtml: `
      <svg viewBox="0 0 820 225" style="width:100%; height:auto; background:#f8fafc; border:1px solid #cbd5e1; border-radius:10px; font-family:'Segoe UI',sans-serif;" onclick="openSplitLaw('ant-m22')">
        <rect x="20" y="20" width="380" height="185" fill="#ecfdf5" stroke="#059669" stroke-width="2" rx="8" style="cursor:pointer;"/>
        <text x="210" y="44" fill="#065f46" font-size="12.5" font-weight="bold" text-anchor="middle">✅ EMSAL HARİCİ AÇIK ÇIKMA BALKON (Ant. Yön. m.22)</text>
        <rect x="50" y="65" width="180" height="100" fill="#cbd5e1" stroke="#334155" stroke-width="2"/>
        <text x="140" y="118" fill="#0f172a" font-size="12" font-weight="bold" text-anchor="middle">DAİRE NET ALANI</text>
        <rect x="230" y="75" width="135" height="80" fill="#34d399" stroke="#047857" stroke-width="2.5" stroke-dasharray="6,3"/>
        <text x="297" y="108" fill="#022c22" font-size="11" font-weight="bold" text-anchor="middle">AÇIK KONSOL BALKON</text>
        <text x="297" y="125" fill="#064e3b" font-size="10" font-weight="bold" text-anchor="middle">(En az 1 ucu konsol,</text>
        <text x="297" y="140" fill="#064e3b" font-size="10" font-weight="bold" text-anchor="middle">köşede kolon YOK)</text>
        <text x="210" y="188" fill="#047857" font-size="10.5" font-weight="bold" text-anchor="middle">📌 Daire net alanının %20'sine kadar (%30 genel sınır içinde) EMSAL DIŞI!</text>

        <rect x="420" y="20" width="380" height="185" fill="#fef2f2" stroke="#dc2626" stroke-width="2" rx="8" style="cursor:pointer;"/>
        <text x="610" y="44" fill="#991b1b" font-size="12.5" font-weight="bold" text-anchor="middle">❌ EMSALE (KAKS) DÂHİL EDİLEN BALKON &amp; TERASLAR</text>
        <rect x="445" y="65" width="160" height="100" fill="#cbd5e1" stroke="#334155" stroke-width="2"/>
        <text x="525" y="118" fill="#0f172a" font-size="11.5" font-weight="bold" text-anchor="middle">DAİRE İÇ MEKÂNI</text>
        <rect x="605" y="65" width="165" height="100" fill="#fca5a5" stroke="#dc2626" stroke-width="2.5"/>
        <rect x="758" y="65" width="12" height="12" fill="#1e293b"/><rect x="758" y="153" width="12" height="12" fill="#1e293b"/>
        <text x="685" y="102" fill="#7f1d1d" font-size="11" font-weight="bold" text-anchor="middle">KOLONLU / GÖMME</text>
        <text x="685" y="118" fill="#7f1d1d" font-size="10.5" font-weight="bold" text-anchor="middle">VEYA ZEMİN TERASI</text>
        <text x="685" y="136" fill="#991b1b" font-size="9.5" text-anchor="middle">(Köşelerde Taşıyıcı Kolon Var)</text>
        <text x="610" y="188" fill="#dc2626" font-size="10.5" font-weight="bold" text-anchor="middle">🚨 Bakanlık Görüşü (15847027): Hem TAKS hem KAKS (Emsal) hesabına GİRER!</text>
      </svg>
    `
  },

  // 13. CİLT 4 - BÖLÜM 4: BİNA İRTİFASINA GÖRE ASANSÖR (m.34) VE YANGIN MERDİVENİ (BYKHY m.48) CETVELİ
  {
    id: 'sema-cilt4-asansor-yangin',
    cilt: '4',
    targetSelector: '#bolum-4',
    badge: '📐 İNTERAKTİF İRTİFA CETVELİ 13 • CİLT 4 (ASANSÖR m.34 & YANGIN MERDİVENİ m.48)',
    title: 'Bina Kat Adedi ve Yüksekliğine Göre Asansör (Ant. İmar m.34) ve Yangın Merdiveni (BYKHY m.48) Zorunluluk Cetveli',
    desc: 'Bodrum katlar dahil kat adedine ve bina yüksekliğine (21,50 m / 30,50 m) göre değişen asansör ve yangın merdiveni kuralları:',
    svgHtml: `
      <svg viewBox="0 0 820 215" style="width:100%; height:auto; background:#ffffff; border:1px solid #cbd5e1; border-radius:10px; font-family:'Segoe UI',sans-serif;">
        <!-- Sol: Asansör Cetveli (m.34) -->
        <g onclick="openSplitLaw('ant-m34')" style="cursor:pointer;">
          <rect x="16" y="16" width="388" height="183" fill="#eff6ff" stroke="#2563eb" stroke-width="2" rx="8"/>
          <text x="210" y="38" fill="#1e3a8a" font-size="12" font-weight="bold" text-anchor="middle">🛗 ASANSÖR ZORUNLULUK EŞİKLERİ (Ant. Yön. m.34)</text>
          <rect x="30" y="50" width="360" height="28" fill="#dbeafe" rx="4"/>
          <text x="40" y="68" fill="#1e3a8a" font-size="10.5" font-weight="bold">• 3 Katlı Binalar: <tspan font-weight="normal" fill="#0f172a">Projede asansör yeri bırakılması zorunlu</tspan></text>
          <rect x="30" y="84" width="360" height="32" fill="#bfdbfe" rx="4"/>
          <text x="40" y="100" fill="#1e3a8a" font-size="10.5" font-weight="bold">• 4+ Katlı Binalar: <tspan fill="#dc2626">Asansör tesisi ZORUNLU!</tspan></text>
          <text x="48" y="112" fill="#334155" font-size="9.5">(İskân edilen 2 bodrum + 2 kat = 4 kat sayılır ➔ Asansör zorunlu!)</text>
          <rect x="30" y="122" width="360" height="34" fill="#93c5fd" rx="4"/>
          <text x="40" y="137" fill="#1e3a8a" font-size="10.5" font-weight="bold">• &gt;20 Konut (Min 2 Asansör): <tspan font-weight="normal" fill="#0f172a">20 daire üstünde çift asansör şart</tspan></text>
          <text x="48" y="151" fill="#065f46" font-size="9.5" font-weight="bold">(İstisna: Tamamı ≤45 m² 1+1 olan binalarda 40 daireye kadar 1 asansör)</text>
          <rect x="30" y="162" width="360" height="26" fill="#1d4ed8" rx="4"/>
          <text x="210" y="179" fill="#ffffff" font-size="10.5" font-weight="bold" text-anchor="middle">• 10+ Katlı Binalar: Sedye Asansörü (Min 1,20 × 2,10 m) Şart!</text>
        </g>

        <!-- Sağ: Yangın Merdiveni Cetveli (BYKHY m.48) -->
        <g onclick="openSplitLaw('yangin-m48')" style="cursor:pointer;">
          <rect x="416" y="16" width="388" height="183" fill="#fef2f2" stroke="#dc2626" stroke-width="2" rx="8"/>
          <text x="610" y="38" fill="#991b1b" font-size="12" font-weight="bold" text-anchor="middle">🔥 KONUT YANGIN MERDİVENİ CETVELİ (BYKHY m.48)</text>
          <rect x="430" y="50" width="360" height="30" fill="#dcfce7" rx="4"/>
          <text x="440" y="69" fill="#065f46" font-size="10.5" font-weight="bold">• Yapı Yüksekliği ≤ 21,50 m: <tspan font-weight="normal" fill="#0f172a">1 adet normal merdiven yeterli</tspan></text>
          <rect x="430" y="86" width="360" height="34" fill="#fef3c7" rx="4"/>
          <text x="440" y="102" fill="#92400e" font-size="10.5" font-weight="bold">• 21,50 m &lt; Yükseklik ≤ 30,50 m: <tspan fill="#dc2626">En az 2 Merdiven Şart!</tspan></text>
          <text x="448" y="115" fill="#78350f" font-size="9.5">(1 normal merdiven + 1 korunumlu yangın kaçış merdiveni)</text>
          <rect x="430" y="126" width="360" height="30" fill="#fee2e2" rx="4"/>
          <text x="440" y="145" fill="#991b1b" font-size="10.5" font-weight="bold">• 30,50 m &lt; Yükseklik ≤ 51,50 m: <tspan fill="#dc2626">Her İkisi de Korunumlu 2 Merdiven</tspan></text>
          <rect x="430" y="162" width="360" height="26" fill="#7f1d1d" rx="4"/>
          <text x="610" y="179" fill="#fef08a" font-size="10" font-weight="bold" text-anchor="middle">💡 120 dk yangın ayrımlı ve bağımsız çıkışlı bodrum irtifaya girmez!</text>
        </g>
      </svg>
    `
  },

  // 14. CİLT 4 - BÖLÜM 4: OTOPARK, SIĞINAK VE BAĞ EVİ ÖZETİ
  {
    id: 'sema-cilt4-otopark-bagevi',
    cilt: '4',
    targetSelector: '#bolum-4',
    badge: '📐 İNTERAKTİF KARŞILAŞTIRMA ŞEMASI 14 • CİLT 4 (OTOPARK, SIĞINAK VE BAĞ EVİ ÖZETİ)',
    title: 'Bakanlık Görüşleri Özeti: Otopark (m.8/12), Sığınak Kişi Hesabı (m.8) ve İskân Dışı Bağ Evi (m.63 vs m.64)',
    desc: 'Her bir kutuya tıklayarak ilgili yönetmelik hükmünü ve Bakanlık resmi görüş yazısını sağ ikiz ekranda açabilirsiniz:',
    svgHtml: `
      <svg viewBox="0 0 820 210" style="width:100%; height:auto; background:#0f172a; border-radius:10px; font-family:'Segoe UI',sans-serif;">
        <g onclick="openSplitLaw('otopark-m8-12')" style="cursor:pointer;">
          <rect x="15" y="18" width="255" height="174" fill="#1e293b" stroke="#38bdf8" stroke-width="2" rx="8"/>
          <text x="142" y="42" fill="#38bdf8" font-size="12" font-weight="bold" text-anchor="middle">🚗 OTOPARK YÖNETMELİĞİ (m.8 &amp; 12)</text>
          <text x="28" y="68" fill="#fca5a5" font-size="10.5" font-weight="bold">• Eski Otopark Bedeli: Mahsup EDİLMEZ!</text>
          <text x="28" y="90" fill="#34d399" font-size="10.5" font-weight="bold">• Küçük Parselde %50 İndirim (m.8/2):</text>
          <text x="36" y="106" fill="#e2e8f0" font-size="9.5">Cephe &lt;9 m veya Alan &lt;250 m² (Yarısı parselde)</text>
          <text x="28" y="128" fill="#fbbf24" font-size="10.5" font-weight="bold">• Otopark Bedeli Taksidi (m.12):</text>
          <text x="36" y="144" fill="#e2e8f0" font-size="9.5">%25 Ruhsatta Peşin + %75'i 36 Ay 6 Eşit Taksit</text>
          <text x="142" y="176" fill="#38bdf8" font-size="10" font-weight="bold" text-anchor="middle">⚖️ Otopark Yön. m.8 &amp; m.12 Aç ➔</text>
        </g>

        <g onclick="openSplitLaw('siginak-m8')" style="cursor:pointer;">
          <rect x="282" y="18" width="255" height="174" fill="#1e293b" stroke="#f59e0b" stroke-width="2" rx="8"/>
          <text x="410" y="42" fill="#fbbf24" font-size="12" font-weight="bold" text-anchor="middle">🛡️ SIĞINAK YÖNETMELİĞİ (Madde 8)</text>
          <text x="295" y="68" fill="#e2e8f0" font-size="10.5" font-weight="bold">• Zorunluluk: &gt;12 Bağımsız Bölüm / &gt;1500m²</text>
          <text x="295" y="90" fill="#34d399" font-size="10.5" font-weight="bold">• Kişi Başı Net Alan: En az 1,00 m²/kişi</text>
          <text x="303" y="106" fill="#cbd5e1" font-size="9.5">(1 oda: 2 kişi | 2 oda: 3 kişi | 3+ oda: 4 kişi)</text>
          <text x="295" y="128" fill="#fca5a5" font-size="10.5" font-weight="bold">• Salon Oda Sayılır mı? (Görüş 16561318):</text>
          <text x="303" y="144" fill="#fbbf24" font-size="9.5" font-weight="bold">EVET! Açık/kapalı mutfaklı SALON = 1 ODA</text>
          <text x="410" y="176" fill="#fbbf24" font-size="10" font-weight="bold" text-anchor="middle">⚖️ Sığınak Yön. m.8 Aç ➔</text>
        </g>

        <g onclick="openSplitLaw('plansiz-m63')" style="cursor:pointer;">
          <rect x="550" y="18" width="255" height="174" fill="#1e293b" stroke="#34d399" stroke-width="2" rx="8"/>
          <text x="677" y="42" fill="#34d399" font-size="12" font-weight="bold" text-anchor="middle">🏡 İSKÂN DIŞI BAĞ EVİ (m.63 &amp; m.64)</text>
          <text x="563" y="68" fill="#fbbf24" font-size="10.5" font-weight="bold">• Ruhsatlı Bağ Evi Üst Sınırı (m.63):</text>
          <text x="570" y="84" fill="#e2e8f0" font-size="9.5">Emsal %5, Toplam Max 250 m², 2 Kat (6,50m)</text>
          <text x="563" y="108" fill="#34d399" font-size="10.5" font-weight="bold">• RUHSATSIZ Bağ Evi İstisnası (m.64):</text>
          <text x="570" y="124" fill="#e2e8f0" font-size="9.5">Parselde 1 adet, Taban ≤75 m², Toplam ≤150 m²</text>
          <text x="570" y="140" fill="#cbd5e1" font-size="9">(Tarım İl Md. görüşü ve idare izniyle ruhsatsız)</text>
          <text x="677" y="176" fill="#34d399" font-size="10" font-weight="bold" text-anchor="middle">⚖️ Plansız Alanlar m.63-64 Aç ➔</text>
        </g>
      </svg>
    `
  }
];

function createDiagramCardElement(d) {
  const wrapper = document.createElement('div');
  wrapper.className = 'visual-diagram-box';
  wrapper.id = d.id;
  wrapper.style.cssText = 'background:#ffffff; border:2px solid #cbd5e1; border-left:5px solid #0284c7; border-radius:10px; padding:14px 16px; margin:16px 0; box-shadow:0 3px 10px rgba(15,23,42,0.05);';
  wrapper.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:4px;">
      <span style="font-size:0.72rem; font-weight:800; color:#0369a1; background:#e0f2fe; padding:2px 8px; border-radius:5px;">${d.badge}</span>
      <button onclick="openSemaGalleryModal()" style="background:#fef3c7; color:#b45309; border:1px solid #fcd34d; padding:3px 9px; border-radius:5px; font-size:0.72rem; font-weight:700; cursor:pointer;">📐 Tüm Şemaları Gör (14)</button>
    </div>
    <h3 style="margin:4px 0 6px 0; font-size:0.98rem; color:#0f172a;">${d.title}</h3>
    <p style="margin:0 0 10px 0; font-size:0.82rem; color:#475569;">${d.desc}</p>
    ${d.svgHtml}
  `;
  return wrapper;
}

function injectVisualDiagrams(activeCilt) {
  VISUAL_DIAGRAMS_DB.filter(d => d.cilt === String(activeCilt)).forEach(d => {
    if (document.getElementById(d.id)) return;
    const card = createDiagramCardElement(d);

    // Eğer 4.1 veya 4.2 gibi spesifik bir alt başlık eşleşmesi varsa doğrudan o başlığın altına yerleştir
    if (d.headingMatch) {
      const allHeadings = document.querySelectorAll('.main-content h2, .main-content h3');
      for (const h of allHeadings) {
        if ((h.textContent || '').includes(d.headingMatch)) {
          const nextEl = h.nextElementSibling;
          if (nextEl && nextEl.tagName === 'P') {
            nextEl.parentNode.insertBefore(card, nextEl.nextSibling);
          } else {
            h.parentNode.insertBefore(card, h.nextSibling);
          }
          return;
        }
      }
    }

    const selectors = d.targetSelector.split(',').map(s => s.trim());
    let targetEl = null;
    for (const sel of selectors) {
      targetEl = document.querySelector(sel);
      if (targetEl) break;
    }
    if (targetEl) {
      const firstHeading = targetEl.querySelector('h2, h3');
      if (firstHeading && firstHeading.nextSibling) {
        firstHeading.parentNode.insertBefore(card, firstHeading.nextSibling);
      } else {
        targetEl.appendChild(card);
      }
    }
  });

  if (!document.getElementById('semaGalleryModal')) {
    const modal = document.createElement('div');
    modal.id = 'semaGalleryModal';
    modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.76); z-index:3900; align-items:center; justify-content:center; padding:16px; backdrop-filter:blur(3px);';
    modal.onclick = (e) => { if (e.target === modal) closeSemaGalleryModal(); };
    modal.innerHTML = `
      <div style="background:#f8fafc; max-width:960px; width:100%; max-height:88vh; border-radius:12px; border:1px solid #cbd5e1; box-shadow:0 20px 50px rgba(0,0,0,0.45); display:flex; flex-direction:column; overflow:hidden;">
        <div style="background:#0f172a; color:#ffffff; padding:14px 20px; display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #fbbf24;">
          <strong style="font-size:1.02rem; color:#fbbf24;">📐 Kentsel Dönüşüm ve İmar Mevzuatı — İnteraktif Teknik Şema ve Vaka Galerisi (14 Şema)</strong>
          <button onclick="closeSemaGalleryModal()" style="background:#dc2626; color:#fff; border:none; padding:6px 12px; border-radius:6px; font-weight:700; cursor:pointer; font-size:0.8rem;">✕ Kapat</button>
        </div>
        <div style="padding:16px 20px; overflow-y:auto; flex:1;" id="semaGalleryBody"></div>
      </div>
    `;
    document.body.appendChild(modal);
    const bodyEl = document.getElementById('semaGalleryBody');
    VISUAL_DIAGRAMS_DB.forEach(d => {
      bodyEl.appendChild(createDiagramCardElement(d));
    });
  }
}

function openSemaGalleryModal() {
  const m = document.getElementById('semaGalleryModal');
  if (m) m.style.display = 'flex';
}

function closeSemaGalleryModal() {
  const m = document.getElementById('semaGalleryModal');
  if (m) m.style.display = 'none';
}
// 16. A'DAN Z'YE KENTSEL DÖNÜŞÜM, PLAN TADİLATI/DAP (0,80->1,20), TOPLANTI VE DANIŞMANLIK SÖZLEŞMELERİ KILAVUZ MOTORU
const AZ_STAGES_DATA = [
  {
    no: 'AŞAMA 0',
    color: '#7c3aed',
    bg: '#f5f3ff',
    title: 'İhtiyari Ön Strateji: İmar Planı Tadilatı (%100 Oybirliği), Emsal/TAKS Artışı ve Değer Artış Payı (DAP) Yönetimi',
    timing: '⏳ Riskli Yapı (ARAAD) Başvurusundan ÖNCE (6–12 Ay)',
    prepDocs: '• <strong>Malikler (%100 Oybirliği):</strong> Noter Onaylı Plan Tadilatı Muvafakatnamesi / Vekaletnamesi<br>• <strong>Şehir Plancısı:</strong> 1/1000 Uygulama İmar Planı Değişikliği Teklif Dosyası ve Plan Açıklama Raporu<br>• <strong>Müteahhit:</strong> Ek-Uzman-3 (Plan Tadilatı ve %90 DAP Bedelini Üstlenme Taahhütlü Niyet Mektubu)',
    applyTo: '🏛️ <strong>İlçe Belediyesi İmar ve Şehircilik Md.</strong> (İlçe Meclis Kararı İçin) ➔ <strong>Antalya Büyükşehir Belediyesi</strong> (Büyükşehir Meclis Onayı ve 30 Gün İmar Askı İlanı İçin)',
    receivedDocs: '📥 <strong>1)</strong> İlçe ve Büyükşehir Belediye Meclisi Onay Kararları ve 30 Günlük Askı Kesinleşme Tutanağı,<br>📥 <strong>2)</strong> Yeni İmar Durum Belgesi (Artırılmış TAKS / Yeni Emsal / İBT Fonksiyonlu İmar Çapı),<br>📥 <strong>3)</strong> SPK Değerleme Raporu ve Kıymet Takdir Komisyonu DAP Tahakkuk / Muafiyet Belgesi.',
    what: '<strong>1) Tek Parselde:</strong> Emsal sabit kalarak TAKS artırımı (örn. Vaka 4.1 Muratpaşa 1291/8\'de TAKS 0,50), çekme düzeltmesi veya İBT/Ticaret fonksiyon tadilatı yapılabilir.<br><strong>2) Ada Bazında (≥1.000 m²) veya Riskli Yapıda Emsal Artışı (Örn: 0,80 ➔ 1,20):</strong> 22.11.2025 DAP Yönetmeliği m.6–7 uyarınca riskli yapı parsellerinde <strong>ilk %20 emsal artışı (0,80 ➔ 0,96) DAP\'tan muaftır!</strong> %20\'yi aşan kısım (0,96 ➔ 1,20 farkı) için oluşan değer artışının %90\'ı DAP olarak ödenir.<br><strong>3) Antalya Plan Notu Teşviki:</strong> Kepez\'de ada bazında +%10 emsal ve ≥2.000 m² tevhitte Max 7 Kat teşviki DAP\'sız uygulanır.',
    warn: '🚨 ZAMANLAMA VE DAP KURALI (3194 Ek Madde 8 &amp; 22.11.2025 RG: 33085): Plan tadilatı malik talebiyle yapılacaksa %100 OYBİRLİĞİ şarttır. Plan tadilatı kesinleşmeden önce Riskli Yapı (ARAAD) başvurusu yapılırsa, 90 günde bina yıkılır ancak meclis/askı süreci (6–12 ay) bitmediği için yeni ruhsat alınamaz ve kira yardımı erir! DAP tamamen ödenmeden tapuda satış yapılamaz ve Yapı Ruhsatı düzenlenemez (Peşin ödemede %10 indirim veya 4 taksit vardır; Ek-Uzman-3 ile müteahhide ödetilir).',
    lawKey: 'imark-ek8-dap'
  },
  {
    no: 'AŞAMA 1',
    color: '#0284c7',
    bg: '#f0f9ff',
    title: 'Ön Hazırlık, İmar/Tapu Check-Up ve 1. Malik Tanışma & Yetki Toplantısı',
    timing: '⏱️ Süre: 3 – 7 Gün | Çoğunluk Aranmaz',
    prepDocs: '• <strong>Malik / Bina Yönetimi:</strong> Ek-3A (Tapu Kaydı ve Belediye Arşiv Projesi Başvuru Dilekçesi)<br>• <strong>Kentsel Dönüşüm Uzmanı &amp; Malikler:</strong> Ek-Uzman-1 (Malik Temsil, Koordinasyon ve Teklif Toplama Yetki Belgesi)',
    applyTo: '🏛️ <strong>Tapu Müdürlüğü</strong> (veya WebTapu Sistemi) &amp; <strong>İlçe Belediyesi İmar ve Şehircilik Md. / Arşiv Birimi</strong>',
    receivedDocs: '📥 <strong>1)</strong> Takyidatlı Güncel Tapu Kaydı ve Tüm Hissedarlar/Paydaşlar Listesi,<br>📥 <strong>2)</strong> Resmi İmar Durum Belgesi (İmar Çapı - TAKS/KAKS/Kat/Yol Bilgisi),<br>📥 <strong>3)</strong> Mevcut Binanın Onaylı Mimari ve Statik Arşiv Projesi (1,5 Kat Harç Muafiyeti Hesabı İçin).',
    what: 'Belediye ve tapudan alınan resmi belgelerle Kentsel Dönüşüm Uzmanı binanın yeni imar haklarını (1,70 çıkma katsayısı dahil toplam inşaat alanını ve daire dağılımını) hesaplar. Maliklerle 1. Tanışma Toplantısı yapılarak tapu devri içermeyen Ek-Uzman-1 Koordinasyon Yetki Belgesi imzalanır.',
    warn: '⚠️ DİKKAT: 65 yaş üstü malikler, veraset (intikal) işlemi yapılmamış vefat eden malikler ve parseldeki ruhsatsız/kaçak yapılar (PAİY m.55/12) bu aşamada tapu ve arşiv kayıtlarından tespit edilmelidir.',
    lawKey: 'paiy-m4'
  },
  {
    no: 'AŞAMA 2',
    color: '#059669',
    bg: '#ecfdf5',
    title: 'Müteahhit Adaylarıyla Görüşme, Yer Gösterme Sözleşmesi ve Teklif (Niyet Mektubu) Toplama',
    timing: '⏱️ Süre: 10 – 20 Gün | En Az 3–4 Teklif',
    prepDocs: '• <strong>Kentsel Dönüşüm Uzmanı:</strong> Ek-Uzman-2 (Kat Karşılığı Proje Sunum, Yer Gösterme, Gizlilik ve Münhasırlık Sözleşmesi - %4+KDV) veya Ek-3K<br>• <strong>Teklif Veren Müteahhit Firmalar:</strong> Ek-Uzman-3 (Resmi Kat Karşılığı Teklif ve Niyet Mektubu)',
    applyTo: '🏗️ <strong>YAMBİS Yetki Belgesine Sahip (H–A Grubu) Müteahhit Firmalar</strong> ➔ <strong>2. Malikler Kurulu Kısa Liste Toplantısı</strong>',
    receivedDocs: '📥 <strong>1)</strong> Müteahhit Yetkilisince Kaşeli ve İmzalı Ek-Uzman-2 Yer Gösterme ve Gizlilik Sözleşmesi,<br>📥 <strong>2)</strong> En az 3–4 Müteahhitten İmzalı Ek-Uzman-3 Resmi Niyet Mektubu, YAMBİS Yetki Belgesi ve İmza Sirküleri,<br>📥 <strong>3)</strong> Seçilen Müteahhidin Hazırladığı Avan Proje ve Bağımsız Bölüm Paylaşım Taslağı.',
    what: 'Uzman, ada/parsel bilgisini ve imar fizibilitesini müteahhit adaylarına vermeden ÖNCE Ek-Uzman-2 sözleşmesini imzalatır. Toplanan Ek-Uzman-3 Niyet Mektupları 2. Malik Toplantısında maliklere yan yana kıyaslamalı tablo olarak sunulur ve 1 asil + 1 yedek müteahhit belirlenir.',
    warn: '🛡️ HUKUKİ GÜVENCE (TBK m.520 &amp; Yönetmelik m.20): Ada/parsel numarası ve malik iletişim bilgileri, müteahhide Ek-Uzman-2 imzalatılmadan kesinlikle paylaşılmamalıdır! Ayrıca müteahhidin YAMBİS yetki sınıfı (H–A) toplam inşaat alanına (m²) yetiyor mu kontrol edilmelidir (Geçici grup kat karşılığı yapamaz!).',
    lawKey: 'yergosterme-ek3k'
  },
  {
    no: 'AŞAMA 3',
    color: '#d97706',
    bg: '#fffbeb',
    title: 'Riskli Yapı Tespiti Başvurusu (ARAAD) ve Karot Numunesi Alımı (m.6–7)',
    timing: '⏱️ ARAAD Kaydı: 2 Ay / 6 Ay Silme Sınırı | İnceleme: 10 İş Günü',
    prepDocs: '• <strong>Tek Bir Malik (veya Kanuni Temsilcisi):</strong> e-Devlet / ARAAD Sistem Başvurusu + Ek-3B (Lisanslı Kuruluşa Başvuru Dilekçesi) + Tapu ve Kimlik Fotokopisi',
    applyTo: '🏢 <strong>Bakanlıkça Lisanslandırılmış Kuruluş</strong> (Karot ve Rapor Hazırlığı İçin) ➔ 🏛️ <strong>Kentsel Dönüşüm Müdürlüğü / Yetkili Belediye</strong> (Rapor İnceleme ve Onayı İçin)',
    receivedDocs: '📥 <strong>1)</strong> ARAAD Yapı Kimlik Numarası ve Lisanslı Kuruluş Hizmet Sözleşmesi,<br>📥 <strong>2)</strong> Lisanslı Kuruluşça Hazırlanan <strong>Riskli Yapı Tespit Raporu</strong>,<br>📥 <strong>3)</strong> İdarenin (Müdürlük/Belediye) 10 İş Günü İçinde Verdiği <strong>Rapor Onay ve Tapu Şerh Bildirim Yazısı</strong>.',
    what: 'Riskli yapı tespiti için çoğunluk aranmaz; tek bir malikin başvurusu yeterlidir. Lisanslı kuruluş (Ek-1 belgeli) binadan karot alır, donatı röntgeni çeker ve Ek-2 teknik esaslarına göre hazırladığı raporu ARAAD sistemine yükler. İdare raporu 10 iş günü içinde inceler.',
    warn: '⚠️ İSTİSNAİ DURUMLAR &amp; KRİTİK KURALLAR (m.7): 1) Binada karot alınmasını engelleyen / kapıyı açmayan malik çıkarsa, İdarece Ek-3C dilekçesi ile Mülki Amirlikten yazılı izin alınarak kolluk kuvvetiyle kapalı kapı açtırılır (m.7/2-c). 2) İnşaat halindeki ikamet edilmeyen yapılara ve metruk binalara risk raporu düzenlenemez! 3) Kat irtifakı olmayan arsa paylı tapularda başvuruyu yapının fiili sahibi yapar (m.7/2-a).',
    lawKey: 'yon-m7'
  },
  {
    no: 'AŞAMA 4',
    color: '#dc2626',
    bg: '#fef2f2',
    title: 'Tapu Şerhi, Ek-6 Bina/Muhtarlık Askı İlanı (15 Gün) ve Teknik Heyet İtiraz Süreci (m.7–10)',
    timing: '⏱️ 10 İş Günü Tapu | 15 Gün Muhtarlık Askı | +15 Gün İtiraz | +30 Gün İdari Dava',
    prepDocs: '• <strong>İdare / Belediye &amp; Muhtarlık (Resen):</strong> Ek-6 (Riskli Yapı Tespiti Bina Askı ve Muhtarlık İlan Tutanağı)<br>• <strong>İtiraz Eden Malik Varsa (İhtiyari):</strong> Ek-3D (15 Gün İçinde Riskli Yapı Raporuna İtiraz Dilekçesi)',
    applyTo: '📒 <strong>Tapu Müdürlüğü</strong> (Şerh İçin) &amp; <strong>Mahalle Muhtarlığı</strong> (15 Gün Askı İlanı İçin) | <em>(İtiraz varsa ➔ Kentsel Dönüşüm Müdürlüğü 7 Üyeli Teknik Heyeti)</em>',
    receivedDocs: '📥 <strong>1)</strong> Tapu Kaydına İşlenen <strong>"Riskli Yapı Belirtmesi"</strong> ve e-Devlet Bildirimi,<br>📥 <strong>2)</strong> Muhtarlıkça Onaylı <strong>Ek-6 Askı İndirme / Tebliğ Kesinleşme Tutanağı</strong> (15. Günün Sonu),<br>📥 <strong>3)</strong> (İtiraz edilmişse) 7 Üyeli <strong>Teknik Heyet Nihai Kararı</strong> ve İdarenin <strong>Riskli Yapı Kesinleşme Yazısı</strong>.',
    what: 'Onaylanan rapor en geç 10 iş gününde Tapuya bildirilir. Ek-6 tutanağı bina kapısına asılır ve Muhtarlıkta 15 gün ilan edilir. Muhtarlık ilanının SON GÜNÜ (15. gün) tüm maliklere resmi tebliğ sayılır. Tebliğden itibaren 15 gün içinde itiraz edilmezse (veya itiraz Teknik Heyetçe reddedilirse) riskli yapı kesinleşir.',
    warn: '⚖️ TEK İNCELEME KURALI (m.10/6): 7 üyeli Teknik Heyet (4 üniversite + 3 Bakanlık üyesi) bir malikin Ek-3D itirazı üzerine raporu tüm unsurlarıyla inceler. Teknik heyetçe karara bağlanan rapora karşı başka bir malikçe yapılan sonraki itirazlar üzerine yeniden inceleme yapılmaz!',
    lawKey: 'yon-m9-10'
  },
  {
    no: 'AŞAMA 5',
    color: '#b91c1c',
    bg: '#fef2f2',
    title: 'Tahliye, Yıkım Süresi (En Çok 90 Gün), 6 İş Gününde Yıkım Ruhsatı veya Güçlendirme (m.8)',
    timing: '⏱️ 15 Gün Askı (Ek-7/A) | En Çok 90 Gün Tahliye/Yıkım | 6 İş Günü Yıkım Ruhsatı',
    prepDocs: '• <strong>İdare / Belediye (Resen):</strong> Ek-7/A (Riskli Yapı Tahliye ve Yıktırma Askı Tutanağı) <em>[Riskli Alan ise Ek-7/B]</em><br>• <strong>Malik Temsilcisi / Yıkım Müteahhidi (Y1–Y3):</strong> Ek-3E (Abonelik İlişik Kesme ve Yıkım Ruhsatı Başvuru Dilekçesi)',
    applyTo: '🏛️ <strong>İlgili İlçe Belediyesi İmar Md.</strong> (Yıkım Ruhsatı İçin) &amp; <strong>Elektrik / Su / Doğalgaz İdareleri</strong> (Abonelik Kesimi İçin) &amp; <strong>Tapu Müdürlüğü</strong> (m.8/9 Yıkım Sonrası Belirtme İçin)',
    receivedDocs: '📥 <strong>1)</strong> Elektrik, Su ve Doğalgaz Kurumlarından Alınan <strong>"Abonelik İlişik Kesme / Borcu Yoktur Yazıları"</strong>,<br>📥 <strong>2)</strong> Belediyeden Alınan <strong>Yıkım Ruhsatı</strong> (6 İş Günü İçinde) ve Yıkım Sonrası <strong>Yanan ve Yıkılan Yapılar Formu</strong>,<br>📥 <strong>3)</strong> Tapu Kütüğüne İşlenen <strong>"6306 Sayılı Kanun Kapsamında Olduğuna Dair Belirtme"</strong> (m.8/9).',
    what: 'Risk tespiti kesinleşince Ek-7/A tutanağı muhtarlıkta 15 gün ilan edilir ve tebliğden itibaren tahliye/yıkım için tek seferde EN ÇOK 90 GÜN süre verilir. Bina boşaltılıp abonelikler kesildiğinde diğer maliklerin muvafakati aranmaksızın 6 İŞ GÜNÜ içinde yıkım ruhsatı verilir.',
    warn: '🚨 YAPTIRIM &amp; GÜÇLENDİRME: 1) 90 günde boşaltılmazsa mülki amir ve kolluk kuvvetiyle zorla tahliye/yıkım yapılır, masrafı %10 fazlasıyla (6183 s.K.) maliklerden tahsil edilir. 2) Bina yüksekliği >21,50 m ise yıkımda Statik Fenni Mesul şarttır! 3) Yıkım yerine güçlendirme isteniyorsa 90 gün içinde KMK m.19/2 (4/5 = %80 çoğunluk) kararı, projesi ve ruhsatı alınmalıdır.',
    lawKey: 'yon-m8'
  },
  {
    no: 'AŞAMA 6',
    color: '#9333ea',
    bg: '#faf5ff',
    title: 'Ek-12 İle Resmi Toplantı Çağrısı (15 Gün İlan) ve >%50 Salt Çoğunluk Kararı (m.15/2)',
    timing: '⏱️ Toplantı Öncesi 15 Gün Askı İlanı (Ek-12) | Karar Oranı: >%50 (Salt Çoğunluk)',
    prepDocs: '• <strong>Çağrı Yapan Malik / Uzman:</strong> Ek-12 (Malikler Toplantı Çağrısı İlan Formu - 04.02.2026)<br>• <strong>Toplantıya Katılan Malikler:</strong> Ek-3F (>%50 Salt Çoğunluk Toplantı ve Karar Tutanağı)',
    applyTo: '📌 <strong>Mahalle Muhtarlığı veya Yıkılmamış Bina Kapısı/Panosu</strong> (15 Gün Askı İlanı İçin) veya <strong>Noterlik</strong> ➔ <strong>3. Malikler Kurulu Toplantısı</strong>',
    receivedDocs: '📥 <strong>1)</strong> Muhtarlık Mühürlü ve İmzalı <strong>Ek-12 Toplantı Çağrısı Askı İlan ve İndirme Tutanağı</strong> (15 Günlük Süre Kanıtı),<br>📥 <strong>2)</strong> Hisseleri Oranında En Az <strong>&gt;%50 (%50,01+) Malik İmzalı Ek-3F Karar Tutanağı</strong> ve Onaylı Paylaşım Cetveli.',
    what: 'Binanın yıkılmış olması şartı aranmaksızın; müteahhit seçimi, kat karşılığı sözleşme, paylaşım cetveli ve tevhit kararları için Ek-12 formu muhtarlıkta veya yıkılmamış bina kapısında 15 gün süreyle ilan edilerek (veya noterle) tüm malikler toplantıya çağrılır. Hisseleri oranında paydaşların SALT ÇOĞUNLUĞU (>%50) ile karar alınır.',
    warn: '🚨 USUL ŞARTI (04.02.2026 RG-33158): Ek-12 toplantı çağrısı usulüne uygun (15 gün askı veya noter) yapılıp tutanak altına alınmazsa, ileride karara katılmayanların arsa payı satışı (m.15/A) reddedilir! İki riskli parsel tevhidinde her parselde ayrı ayrı >%50, boş parsel tevhidinde ise boş parselde %100 oybirliği şarttır (m.15/8).',
    lawKey: 'yon-m15-1-2'
  },
  {
    no: 'AŞAMA 7',
    color: '#2563eb',
    bg: '#eff6ff',
    title: 'Noter Kat Karşılığı Sözleşmesi, Sınırlı Vekaletname ve Katılmayanlara 15 Günlük Teklif (Ek-8)',
    timing: '⏱️ e-Tebligat (5. Gün) / Muhtarlık (15. Gün) Tebliğ + 15 Gün Teklif Kabul Süresi',
    prepDocs: '• <strong>&gt;%50 Anlaşan Malikler &amp; Müteahhit:</strong> Noter Kat Karşılığı İnşaat Sözleşmesi + Ek-3L (Sınırlı İnşaat Vekaletnamesi)<br>• <strong>Katılmayan Maliklere Bildirim İçin:</strong> Ek-8 (Karar ve Teklif Bildirim Formu) + Ek-3G (Noter İhtarname Metni) <em>[Riskli Alan ise Ek-10]</em>',
    applyTo: '🏛️ <strong>Noterlik</strong> (Sözleşme, Vekaletname ve İhtarname İçin) &amp; <strong>PTT e-Tebligat / Mahalle Muhtarlığı</strong> (Ek-8 15 Gün Askı İlanı İçin)',
    receivedDocs: '📥 <strong>1)</strong> Noter Düzenleme Şeklinde <strong>Kat Karşılığı İnşaat Sözleşmesi</strong> ve <strong>Ek-3L Sınırlı Vekaletname</strong>,<br>📥 <strong>2)</strong> Katılmayan Maliklere Yapılan <strong>Noter Tebliğ Şerhi / e-Tebligat Kaydı veya Muhtarlık Onaylı Ek-8 15 Günlük Askı Tutanağı</strong>.',
    what: '>%50 çoğunluk malikleri Noterde sözleşmeyi ve Ek-3L sınırlı vekaletnameyi imzalar. Karara katılmayan maliklere sözleşme teklifi noterle, e-tebligatla veya Ek-8 formuyla muhtarlıkta 15 gün ilan edilerek bildirilir ve kabul etmeleri için tebliğden itibaren 15 gün süre verilir.',
    warn: '🛡️ SÖZLEŞME &amp; VEKALET GÜVENLİĞİ: 1) 65 yaş üstü maliklerden imza günü tarihli devlet hastanesi ehliyet (akıl sağlığı) raporu alınmalıdır. 2) Müteahhide verilen vekaletnameden (Ek-3L) "ahzu kabz, dilediği bedelle satış/ferağ, sulh/ibra, itirazdan feragat" ibareleri kesinlikle çıkarılmalıdır (TBK m.504).',
    lawKey: 'vekalet-tbk504'
  },
  {
    no: 'AŞAMA 8',
    color: '#ea580c',
    bg: '#fff7ed',
    title: 'SPK Değerleme ve Katılmayan Hisselerin Açık Artırma İle Satışı (m.15/4 & m.15/A)',
    timing: '⏱️ 15 Gün Satış İlanı (Ek-9 / Ek-13) | İhale Sonrası 7 Gün Bedel Yatırma Süresi',
    prepDocs: '• <strong>&gt;%50 Anlaşan Malikler / Vekili:</strong> Ek-3H (Pay Satışı Başvuru Dilekçesi) + SPK Lisanslı Değerleme Raporu<br>• <strong>Satış Komisyonu / Muhtarlık:</strong> Ek-9 (İlk Satış İlan Tutanağı) ve Ek-13 (3. Şahıslara Satış İlan Formu - %10 Teminatlı) <em>[Alan ise Ek-11]</em>',
    applyTo: '🏛️ <strong>Kentsel Dönüşüm Müdürlüğü</strong> (veya Yetki Devri Yapılan Belediye Satış Komisyonu) ➔ <strong>Tapu Müdürlüğü</strong> (Resen Tescil İçin)',
    receivedDocs: '📥 <strong>1)</strong> Belediyeye Yapı Ruhsatı Başvurusu İçin Zorunlu <strong>"Pay Satışı Başvuru Kayıt Belgesi"</strong> (m.15/4),<br>📥 <strong>2)</strong> Satış Komisyonu <strong>Açık Artırma İhale Kararı</strong> ve Banka Bloke Dekontu,<br>📥 <strong>3)</strong> Satılan Payların Alıcı Adına Tescil Edildiğini Gösteren <strong>Yeni Tapu Senedi</strong>.',
    what: '15 günlük teklif süresinde anlaşmaya katılmayan maliklerin payları için SPK değerleme raporu alınarak Ek-3H ile Müdürlüğe satış başvurusu yapılır. İlk satış (Ek-9) yalnız anlaşan paydaşlar arasında yapılır; alıcı çıkmazsa sonraki satışlar Ek-13 ile 15 gün ilan edilir ve anlaşmaya uymayı kabul edip rayiç değerin %10\'u nakit teminat yatıran 3. şahıslara satılır.',
    warn: '🚨 04.02.2026 YAPI RUHSATI ÖN ŞARTI (m.15/4): Belediyeye Yapı Ruhsatı başvurusu yapılmadan ÖNCE, karara katılmayan maliklere Ek-8 teklifinin tebliğ edilmiş olması VE bu payların satışı için Müdürlüğe/İdareye müracaat edilmiş olması ZORUNLUDUR! (Satış başvurusu yapılmadan yapı ruhsatı düzenlenemez).',
    lawKey: 'yon-m15-3-4-a'
  },
  {
    no: 'AŞAMA 9',
    color: '#0d9488',
    bg: '#f0fdfa',
    title: '%6 Teminat, 1,5 Kat Harç Muafiyeti, Kat İrtifakı, Yapı Ruhsatı ve Kira/Kredi Başvurusu',
    timing: '⏱️ Kira Yardımı Başvurusu: Tahliyeden İtibaren 1 Yıl (18/48 Ay Ödeme) | Kredi: 3 Yıl | Harç İadesi: 5 Yıl',
    prepDocs: '• <strong>Müteahhit Firma:</strong> %6 Kesin Teminat Mektubu (m.13/9) + Mimari/Statik/Mekanik/Elektrik Projeler ve Yapı Ruhsatı Başvurusu<br>• <strong>Malikler / Kiracılar:</strong> <span class="yon-ek-chip" onclick="openYonEk(\'Ek-3I\', event)">📋 Ek-3I (Kira Yardımı Dilekçesi)</span> ve Ek-3J (Vergi Dairesi Fazla Harç İadesi Dilekçesi)',
    applyTo: '🏛️ <strong>Belediye İmar Md.</strong> (Yapı Ruhsatı İçin) &amp; <strong>Tapu Md.</strong> (Kat İrtifakı İçin) &amp; <strong>Kentsel Dönüşüm Md. / e-Devlet</strong> (Kira/Kredi İçin) &amp; <strong>Vergi Dairesi</strong>',
    receivedDocs: '📥 <strong>1)</strong> 1,5 Kat Harç Muafiyetli <strong>Onaylı Yapı Ruhsatı</strong> (İnşaat İzni),<br>📥 <strong>2)</strong> Maliklerin İmzası Aranmadan Sözleşmeye Göre Kurulan <strong>Kat İrtifakı Tapuları</strong> (m.15/12),<br>📥 <strong>3)</strong> <strong>18 Aylık Kira Yardımı Onayı</strong> (veya Faiz Destekli Kredi Onayı).',
    what: 'Müteahhit yapı yaklaşık maliyetinin %6\'sı oranındaki teminatı (m.13/9) İdareye sunar. Mevcut eski bina alanının 1,5 katına kadar belediye harç muafiyeti (m.16/10) uygulanarak Yapı Ruhsatı alınır. Mimari proje ve yönetim planında malik imzası aranmadan (m.15/12) Kat İrtifakı kurulur.',
    warn: '💰 MALİ HAKLAR: 1) Kira yardımı (18 ay; kiracıya 2 aylık, kapıcı/intifa sahibine 5 aylık defaten) için tahliye/yıkımdan itibaren EN GEÇ 1 YIL içinde <span class="yon-ek-chip" onclick="openYonEk(\'Ek-3I\', event)">📋 Ek-3I</span> ile başvurulmalıdır. 2) Boş parselle tevhitte tapu harç muafiyeti riskli parsel alanı oranında uygulanır (m.16/11). 3) Haksız alınan harçlar 5 yıl içinde Ek-3J ile Vergi Dairesinden iade alınır.',
    lawKey: 'yon-m16'
  },
  {
    no: 'AŞAMA 10',
    color: '#1e293b',
    bg: '#f8fafc',
    title: 'İnşaat Denetimi, %10 Altı Kademeli Satış, İdari Fesih Güvencesi ve İskân (Kat Mülkiyeti)',
    timing: '⏱️ Kademeli Satış: İlerleme − %10 | İdari Fesih: 1 Yıl Başlamama / 6 Ay Durma + 30 Gün İhtar',
    prepDocs: '• <strong>Müteahhit &amp; Yapı Denetim:</strong> Seviye Tespit Raporu (%10 Altı Satış İzni İçin) ve İş Bitirme / İskân Başvurusu<br>• <strong>Malikler (Sorun Halinde):</strong> Sözleşmenin İdari Feshi Başvurusu (m.13/11) veya Kısmi İskân Dilekçesi (İmar K. m.28/10)',
    applyTo: '🏢 <strong>Belediye Yapı Kontrol / İskân Birimi</strong> &amp; <strong>Tapu Müdürlüğü</strong> (Kademeli Satış ve Kat Mülkiyeti İçin) | <em>(İdari Fesih ise ➔ Kentsel Dönüşüm Md.)</em>',
    receivedDocs: '📥 <strong>1)</strong> İdarenin Tapu Müdürlüğüne Yazdığı <strong>"%10 Altı Kademeli Satış İzin Yazısı"</strong> (m.13/10),<br>📥 <strong>2)</strong> İnşaat Bitiminde Alınan <strong>Yapı Kullanma İzin Belgesi (İskân)</strong>,<br>📥 <strong>3)</strong> Her Bağımsız Bölüm İçin Düzenlenen <strong>Kat Mülkiyeti Tapu Senetleri</strong> ve Müteahhidin %6 Teminat İadesi.',
    what: 'Müteahhit kendi payına düşen daireleri İdare yazısı olmadan satamaz; İdare yalnız inşaat tamamlanma oranının %10 altındaki oranda satışa izin verir (m.13/10). İnşaat tamamlanınca Yapı Kullanma İzin Belgesi (İskân) alınarak Kat Mülkiyeti tapuları dağıtılır.',
    warn: '🛡️ MALİK SON AŞAMA KALKANLARI: 1) Müteahhit 1 yıl işe başlamaz veya 6 ay işi durdurursa >%50 kararla Müdürlüğe başvurulur; 30 gün ihtar sonunda sözleşme mahkemesiz RESEN FESHEDİLİR ve ödenen kiralar geri istenemez (m.13/11). 2) Bina bitmiş ancak müteahhit imzadan kaçınıyorsa imzası olmadan iskân verilir (PAİY m.64/12). 3) Müteahhidin SGK/vergi borcu varsa arsa sahiplerinin dairelerine KISMİ İSKÂN verilir (İmar K. m.28/10).',
    lawKey: 'yon-m13'
  }
];

function populateAllEkSelectDropdowns() {
  const shortLabels = {
    'Ek-Uzman-1': 'Ek-Uzman-1: Malik Temsil & Danışmanlık Yetki Belgesi',
    'Ek-Uzman-2': 'Ek-Uzman-2: Yer Gösterme & Gizlilik Sözleşmesi (%4+KDV)',
    'Ek-Uzman-3': 'Ek-Uzman-3: Müteahhit Teklif & DAP Niyet Mektubu',
    'Ek-3A': 'Ek-3A: Tapu ve Belediye Arşiv Başvuru Dilekçesi',
    'Ek-3B': 'Ek-3B: Lisanslı Kuruluş (ARAAD Karot) Başvurusu',
    'Ek-3C': 'Ek-3C: Kapalı Kapı Mülki Amir İzin Dilekçesi (m.7/2-c)',
    'Ek-3D': 'Ek-3D: Riskli Yapı Raporuna İtiraz Dilekçesi (15 Gün)',
    'Ek-3E': 'Ek-3E: Abonelik Kesme & Yıkım Ruhsatı Dilekçesi',
    'Ek-3F': 'Ek-3F: >%50 Salt Çoğunluk Karar Tutanağı',
    'Ek-3G': 'Ek-3G: Katılmayanlara Noter Teklif İhtarnamesi',
    'Ek-3H': 'Ek-3H: Açık Artırma Pay Satışı Başvurusu (m.15/A)',
    'Ek-3I': 'Ek-3I: Kira ve Taşınma Yardımı Başvuru Dilekçesi',
    'Ek-3J': 'Ek-3J: Fazla Harç/Vergi İadesi Başvuru Dilekçesi',
    'Ek-3K': 'Ek-3K: Standart Kat Karşılığı Yer Gösterme Belgesi',
    'Ek-3L': 'Ek-3L: Noter Sınırlı İnşaat Vekaletnamesi (Güvenli)'
  };

  document.querySelectorAll('select').forEach(sel => {
    const hasEk1 = Array.from(sel.options).some(o => o.value === 'Ek-1' || (o.textContent || '').includes('Ek-1:'));
    if (hasEk1) {
      // Kutu genişliğini sabitle ve üst bardaki diğer select ile yan yana simetrik hizala
      sel.style.cssText = 'flex:1 1 190px; max-width:260px; min-width:160px; height:32px; padding:4px 8px; border-radius:6px; border:1px solid #059669; background:#ecfdf5; color:#065f46; font-weight:700; font-size:0.78rem; box-sizing:border-box; cursor:pointer;';
      if (sel.parentElement) {
        sel.parentElement.style.display = 'flex';
        sel.parentElement.style.flexWrap = 'wrap';
        sel.parentElement.style.alignItems = 'center';
        sel.parentElement.style.gap = '6px';
        const firstSel = sel.parentElement.querySelector('select');
        if (firstSel && firstSel !== sel) {
          firstSel.style.cssText = 'flex:1 1 190px; max-width:260px; min-width:160px; height:32px; padding:4px 8px; border-radius:6px; border:1px solid #cbd5e1; font-size:0.78rem; box-sizing:border-box; cursor:pointer;';
        }
      }
      if (sel.options[0]) {
        sel.options[0].textContent = '📋 Ek Form / Sözleşme Seç...';
      }
      if (!sel.querySelector('option[value="Ek-Uzman-1"]')) {
        const grpUzman = document.createElement('optgroup');
        grpUzman.label = '🛡️ Danışmanlık & Teklif Sözleşmeleri (Ek-Uzman-1..3)';
        ['Ek-Uzman-1', 'Ek-Uzman-2', 'Ek-Uzman-3'].forEach(k => {
          const opt = document.createElement('option');
          opt.value = k;
          opt.textContent = shortLabels[k];
          grpUzman.appendChild(opt);
        });
        sel.insertBefore(grpUzman, sel.options[1] || null);

        const grpDilekce = document.createElement('optgroup');
        grpDilekce.label = '📝 Uygulama Dilekçeleri & Vekalet (Ek-3A..3L)';
        ['Ek-3A','Ek-3B','Ek-3C','Ek-3D','Ek-3E','Ek-3F','Ek-3G','Ek-3H','Ek-3I','Ek-3J','Ek-3K','Ek-3L'].forEach(k => {
          const opt = document.createElement('option');
          opt.value = k;
          opt.textContent = shortLabels[k];
          grpDilekce.appendChild(opt);
        });
        sel.appendChild(grpDilekce);
      }
    }
  });
}

function enhanceGlobalSearchSensitivity() {
  if (typeof GLOBAL_SEARCH_INDEX !== 'undefined' && Array.isArray(GLOBAL_SEARCH_INDEX)) {
    if (!GLOBAL_SEARCH_INDEX.some(x => x.title && x.title.includes('Ek-Uzman-1'))) {
      GLOBAL_SEARCH_INDEX.push(
        { cilt: '4', title: '🧭 A\'dan Z\'ye Kentsel Dönüşüm Süreci, Plan Tadilatı (0,80->1,20 DAP) ve Toplantı Rehberi', url: 'javascript:openMasterGuideModal(1)', keywords: 'adan zye rehber aşama 0 plan tadilati dap değer artış payı 0.80 1.20 3194 ek madde 8 toplantı' },
        { cilt: '3', title: '🛡️ Ek-Uzman-1: Malik Temsil, Koordinasyon ve Danışmanlık Yetki Belgesi', url: 'javascript:openYonEk("Ek-Uzman-1")', keywords: 'ek-uzman-1 ek uzman 1 danışmanlık yetki belgesi malik temsil toplantı' },
        { cilt: '3', title: '🛡️ Ek-Uzman-2: Kat Karşılığı Proje Sunum, Yer Gösterme, Gizlilik ve Münhasırlık Sözleşmesi (%4+KDV)', url: 'javascript:openYonEk("Ek-Uzman-2")', keywords: 'ek-uzman-2 ek uzman 2 yer gösterme gizlilik münhasırlık %4 komisyon hizmet bedeli' },
        { cilt: '3', title: '🛡️ Ek-Uzman-3: Müteahhit Kat Karşılığı Teklif, Plan Tadilatı/DAP Üstlenme ve Niyet Mektubu (LOI)', url: 'javascript:openYonEk("Ek-Uzman-3")', keywords: 'ek-uzman-3 ek uzman 3 niyet mektubu teklif dap değer artış payı plan tadilatı' },
        { cilt: '1', title: '📐 14 İnteraktif Teknik Şema ve Vaka Galerisi (TAKS/KAKS, Tevhit, Çoklu Yapı, Asansör)', url: 'javascript:openSemaGalleryModal()', keywords: 'şema semalar çizim kroki kesit 1291 27594 senaryo a b c d' }
      );
      ['Ek-3A','Ek-3B','Ek-3C','Ek-3D','Ek-3E','Ek-3F','Ek-3G','Ek-3H','Ek-3I','Ek-3J','Ek-3K','Ek-3L'].forEach(k => {
        if (YON_EK_DB[k]) {
          GLOBAL_SEARCH_INDEX.push({
            cilt: '3',
            title: '📝 ' + YON_EK_DB[k].title,
            url: `javascript:openYonEk("${k}")`,
            keywords: `${k.toLowerCase()} ${k.replace('-',' ').toLowerCase()} dilekçe ${YON_EK_DB[k].title.toLowerCase()}`
          });
        }
      });
    }
  }

  // Türkçe karakter duyarsız (ı/i, ş/s, ğ/g, ü/u, ö/o, ç/c) ve çoklu kelime hassas arama iyileştirmesi
  const searchInput = document.getElementById('globalSearchInput');
  const resultsBox = document.getElementById('globalSearchResults');
  if (searchInput && resultsBox && !searchInput.dataset.enhancedTr) {
    searchInput.dataset.enhancedTr = '1';
    const normTR = (str) => (str || '').toLocaleLowerCase('tr-TR')
      .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
      .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9\s.%]/g, ' ').replace(/\s+/g, ' ').trim();

    searchInput.addEventListener('input', function() {
      const q = normTR(this.value);
      if (q.length < 2) return;
      const tokens = q.split(' ').filter(Boolean);
      const matches = (GLOBAL_SEARCH_INDEX || []).filter(item => {
        const hay = normTR((item.title || '') + ' ' + (item.keywords || ''));
        return tokens.every(t => hay.includes(t));
      }).slice(0, 10);

      if (matches.length > 0) {
        resultsBox.style.display = 'block';
        resultsBox.innerHTML = matches.map(m => `
          <a href="${m.url}" class="search-result-item" style="display:block; padding:8px 10px; border-bottom:1px solid #334155; color:#f8fafc; text-decoration:none; font-size:0.78rem;">
            <span style="background:#0284c7; color:#fff; padding:1px 6px; border-radius:4px; font-size:0.68rem; font-weight:700; margin-right:6px;">CİLT ${m.cilt}</span>
            ${m.title}
          </a>
        `).join('');
      }
    });
  }
}

function enhanceSearchAndFormsWithUzmanTemplates() {
  populateAllEkSelectDropdowns();
  enhanceGlobalSearchSensitivity();

  const activeCilt = document.body.getAttribute('data-cilt') || '1';
  if (activeCilt === '3') {
    const bolum8 = document.getElementById('bolum-8');
    if (bolum8 && !document.getElementById('cilt3UzmanTemplatesBlock')) {
      const box = document.createElement('div');
      box.id = 'cilt3UzmanTemplatesBlock';
      box.style.cssText = 'background:#ecfdf5; border:2px solid #059669; border-radius:10px; padding:16px; margin:16px 0;';
      box.innerHTML = `
        <span class="section-badge" style="background:#059669; color:#fff;">🛡️ DANIŞMANLIK YETKİ, YER GÖSTERME VE NİYET MEKTUBU SÖZLEŞMELERİ (EK-UZMAN-1 .. EK-UZMAN-3)</span>
        <h3 style="margin:6px 0 8px 0; color:#065f46;">Kentsel Dönüşüm Uzmanı Yetki, Gizlilik/Yer Gösterme (%4+KDV) ve Müteahhit Niyet Mektubu Şablonları</h3>
        <p style="font-size:0.84rem; color:#334155; margin-bottom:12px;">Aşağıdaki şablonları doğrudan kopyalayabilir veya yeşil rozetlerine tıklayarak sağ ikiz ekranda açabilirsiniz:</p>
        ${['Ek-Uzman-1', 'Ek-Uzman-2', 'Ek-Uzman-3'].map((code, i) => `
          <div style="background:#fff; border:1px solid #a7f3d0; border-radius:8px; padding:12px; margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:6px;">
              <strong style="font-size:0.9rem; color:#0f172a;">${YON_EK_DB[code].title}</strong>
              <button class="btn-small" style="background:#059669;" onclick="copyTemplate('cilt3-uzman-box-${i}', this)">📋 Şablonu Kopyala</button>
            </div>
            <div class="template-box" id="cilt3-uzman-box-${i}" style="font-size:0.79rem;">${YON_EK_DB[code].formText}</div>
          </div>
        `).join('')}
      `;
      const firstH2 = bolum8.querySelector('h2');
      if (firstH2 && firstH2.nextSibling) {
        firstH2.parentNode.insertBefore(box, firstH2.nextSibling);
      } else {
        bolum8.appendChild(box);
      }
      linkifyYonEkInElement(box);
    }
  }
}

// 🎯 AÇAN SATIR ENTEGRASYONU: Tam Sayfa Rehberden veya Şemalar Galerisinden bir Ek veya Madde açıldığında
// sağ paneldeki turuncu "🎯 Açan Satır" butonuna basılırsa tam sayfa pencereyi kaldığı sekme ve kartta geri açar!
window._lastModalReturnState = null;

document.addEventListener('click', (e) => {
  const inMaster = e.target && e.target.closest && e.target.closest('#masterGuideModal');
  const inSema = e.target && e.target.closest && e.target.closest('#semaGalleryModal');
  if (inMaster) {
    const stageCard = e.target.closest('.az-stage-card');
    let activeTab = 1;
    if (document.getElementById('azTabContent2') && document.getElementById('azTabContent2').style.display !== 'none') activeTab = 2;
    if (document.getElementById('azTabContent3') && document.getElementById('azTabContent3').style.display !== 'none') activeTab = 3;
    window._lastModalReturnState = {
      modalType: 'master',
      tabNo: activeTab,
      cardId: stageCard ? stageCard.id : null
    };
  } else if (inSema) {
    const diagCard = e.target.closest('.visual-diagram-box');
    window._lastModalReturnState = {
      modalType: 'sema',
      cardId: diagCard ? diagCard.id : null
    };
  } else if (e.target && e.target.closest && e.target.closest('.main-content')) {
    window._lastModalReturnState = null;
  }
}, true);

const _origOpenYonEkRef = typeof openYonEk === 'function' ? openYonEk : null;
window.openYonEk = function(ekKey, ev) {
  const modal = document.getElementById('masterGuideModal');
  if (modal && modal.style.display === 'flex') closeMasterGuideModal();
  const sModal = document.getElementById('semaGalleryModal');
  if (sModal && sModal.style.display === 'flex') closeSemaGalleryModal();

  if (_origOpenYonEkRef) _origOpenYonEkRef(ekKey, ev);
  populateAllEkSelectDropdowns();
};

const _origOpenSplitLawRef = typeof openSplitLaw === 'function' ? openSplitLaw : null;
window.openSplitLaw = function(lawKey, triggerId, ev) {
  const modal = document.getElementById('masterGuideModal');
  if (modal && modal.style.display === 'flex') closeMasterGuideModal();
  const sModal = document.getElementById('semaGalleryModal');
  if (sModal && sModal.style.display === 'flex') closeSemaGalleryModal();

  if (_origOpenSplitLawRef) _origOpenSplitLawRef(lawKey, triggerId, ev);
  populateAllEkSelectDropdowns();
};

const _origScrollToSplitSource = typeof scrollToSplitSource === 'function' ? scrollToSplitSource : null;
window.scrollToSplitSource = function() {
  if (window._lastModalReturnState) {
    const st = window._lastModalReturnState;
    if (st.modalType === 'master') {
      openMasterGuideModal(st.tabNo || 1);
      if (st.cardId) {
        setTimeout(() => {
          const el = document.getElementById(st.cardId);
          if (el) {
            document.querySelectorAll('.active-split-source').forEach(x => x.classList.remove('active-split-source'));
            el.classList.add('active-split-source');
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 80);
      }
      return;
    } else if (st.modalType === 'sema') {
      openSemaGalleryModal();
      return;
    }
  }
  if (_origScrollToSplitSource) _origScrollToSplitSource();
};

function injectMasterGuideTriggerIntoPage() {
  enhanceSearchAndFormsWithUzmanTemplates();
  const activeCilt = document.body.getAttribute('data-cilt') || '1';
  if (activeCilt === '0') {
    const heroBtnBar = document.querySelector('.section-card button[onclick*="openSplitTools"]');
    if (heroBtnBar && heroBtnBar.parentElement && !document.getElementById('heroMasterGuideBtn')) {
      const btn = document.createElement('button');
      btn.id = 'heroMasterGuideBtn';
      btn.setAttribute('onclick', 'openMasterGuideModal()');
      btn.style.cssText = 'background:#fbbf24; color:#0f172a; border:2px solid #fff; padding:9px 16px; border-radius:8px; font-weight:800; font-size:0.85rem; cursor:pointer; box-shadow:0 4px 12px rgba(251,191,36,0.35);';
      btn.innerHTML = '🧭 A\'dan Z\'ye Kentsel Dönüşüm, Plan Tadilatı & Danışmanlık Rehberi (Tam Sayfa)';
      heroBtnBar.parentElement.insertBefore(btn, heroBtnBar);
    }
  }
  if (activeCilt === '4') {
    const bolum1 = document.getElementById('bolum-1');
    if (bolum1 && !document.getElementById('cilt4MasterBanner')) {
      const banner = document.createElement('div');
      banner.id = 'cilt4MasterBanner';
      banner.style.cssText = 'background:linear-gradient(135deg, #0f172a 0%, #3b0764 100%); color:#fff; border:2px solid #f59e0b; border-radius:12px; padding:18px 22px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; box-shadow:0 8px 25px rgba(15,23,42,0.18);';
      banner.innerHTML = `
        <div style="flex:1; min-width:260px;">
          <span style="background:#fbbf24; color:#0f172a; font-size:0.72rem; font-weight:800; padding:3px 9px; border-radius:5px;">🧭 TAM SAYFA UYGULAMA MODÜLÜ • AŞAMA 0–10 + TOPLANTI REHBERİ + DANIŞMANLIK SÖZLEŞMELERİ</span>
          <h3 style="color:#fff; margin:6px 0 4px 0; font-size:1.15rem;">A'dan Z'ye Kentsel Dönüşüm, Plan Tadilatı (DAP) ve Danışmanlık Sözleşmeleri Kılavuzu</h3>
          <p style="color:#cbd5e1; margin:0; font-size:0.84rem;">Her aşamada kimin hangi belgeyi hazırlayacağını, hangi kuruma başvuracağını ve kurumdan hangi sonuç belgesini alacağını şemalarla anlatan 11 aşamalı yol haritası, 3 malik toplantısı rehberi ve danışmanlık sözleşmeleri (Ek-Uzman-1..3).</p>
        </div>
        <button onclick="openMasterGuideModal()" style="background:#10b981; color:#022c22; border:none; padding:11px 18px; border-radius:8px; font-weight:800; font-size:0.88rem; cursor:pointer; white-space:nowrap;">🧭 Tam Sayfa Rehberi Aç ➔</button>
      `;
      bolum1.parentNode.insertBefore(banner, bolum1);
    }
  }
}

function buildMasterGuideModalIfNeeded() {
  if (document.getElementById('masterGuideModal')) return;
  const modal = document.createElement('div');
  modal.id = 'masterGuideModal';
  modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.82); z-index:3950; align-items:center; justify-content:center; padding:12px; backdrop-filter:blur(4px);';
  modal.onclick = (e) => { if (e.target === modal) closeMasterGuideModal(); };

  const stagesCardsHtml = AZ_STAGES_DATA.map((s, idx) => `
    <div id="az-stage-card-${idx}" class="az-stage-card" style="background:#ffffff; border:1px solid #cbd5e1; border-left:6px solid ${s.color}; border-radius:10px; padding:14px 16px; margin-bottom:14px; box-shadow:0 2px 6px rgba(15,23,42,0.04);">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid #e2e8f0;">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span style="background:${s.color}; color:#fff; font-weight:800; font-size:0.78rem; padding:4px 10px; border-radius:6px;">${s.no}</span>
          <strong style="font-size:1rem; color:#0f172a;">${s.title}</strong>
        </div>
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span style="background:#0f172a; color:#fbbf24; font-size:0.74rem; font-weight:700; padding:4px 9px; border-radius:5px;">${s.timing}</span>
          <button class="law-link" onclick="openSplitLaw('${s.lawKey}');">⚖️ Dayanak Maddeyi Aç</button>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(245px, 1fr)); gap:10px; font-size:0.81rem; color:#334155; line-height:1.55;">
        <div style="background:${s.bg}; padding:10px 12px; border-radius:8px; border:1px solid #cbd5e1;">
          <div style="font-weight:800; color:#0f172a; margin-bottom:4px; border-bottom:1px dashed #cbd5e1; padding-bottom:3px;">1️⃣ Hazırlayan &amp; Başvuru Evrakı (Tıklanabilir)</div>
          <div>${s.prepDocs}</div>
        </div>
        <div style="background:#f8fafc; padding:10px 12px; border-radius:8px; border:1px solid #cbd5e1;">
          <div style="font-weight:800; color:#1e3a8a; margin-bottom:4px; border-bottom:1px dashed #cbd5e1; padding-bottom:3px;">2️⃣ Müracaat Edilen Kurum / Muhatap</div>
          <div style="margin-bottom:8px;">${s.applyTo}</div>
          <div style="font-weight:800; color:#065f46; margin-bottom:3px; border-top:1px dashed #cbd5e1; padding-top:5px;">3️⃣ Kurumdan Alınacak Sonuç Evrakı</div>
          <div>${s.receivedDocs}</div>
        </div>
        <div style="background:#ffffff; padding:10px 12px; border-radius:8px; border:1px solid #cbd5e1;">
          <div style="font-weight:800; color:#0f172a; margin-bottom:4px; border-bottom:1px dashed #cbd5e1; padding-bottom:3px;">4️⃣ Bu Aşamada Ne Yapılır? (Uygulama Özeti)</div>
          <div>${s.what}</div>
        </div>
      </div>

      <div style="margin-top:9px; background:#fffbeb; border:1px solid #fcd34d; border-left:4px solid #d97706; padding:8px 12px; border-radius:6px; font-size:0.8rem; color:#78350f; line-height:1.5;">
        ${s.warn}
      </div>
    </div>
  `).join('');

  modal.innerHTML = `
    <div style="background:#f1f5f9; max-width:1200px; width:100%; height:93vh; border-radius:14px; border:2px solid #fbbf24; box-shadow:0 25px 60px rgba(0,0,0,0.55); display:flex; flex-direction:column; overflow:hidden;">
      <div style="background:#0f172a; color:#ffffff; padding:14px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; border-bottom:2px solid #f59e0b;">
        <div>
          <div style="font-size:0.72rem; font-weight:800; color:#34d399; letter-spacing:0.4px;">TAM SAYFA SAHA, MEVZUAT VE DANIŞMANLIK SÖZLEŞMELERİ KILAVUZU</div>
          <strong style="font-size:1.08rem; color:#fbbf24;">🧭 A'dan Z'ye Kentsel Dönüşüm Süreci, Plan Tadilatı (DAP), Malik Toplantıları ve Danışmanlık Sözleşmeleri</strong>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <button onclick="printMasterGuideSummary()" style="background:#059669; color:#fff; border:none; padding:7px 13px; border-radius:7px; font-weight:700; cursor:pointer; font-size:0.8rem;">🖨️ Malik Sunum Haritası Yazdır</button>
          <button onclick="closeMasterGuideModal()" style="background:#dc2626; color:#fff; border:none; padding:7px 13px; border-radius:7px; font-weight:700; cursor:pointer; font-size:0.8rem;">✕ Kapat</button>
        </div>
      </div>

      <div style="background:#1e293b; padding:8px 20px; display:flex; gap:8px; flex-wrap:wrap; border-bottom:1px solid #334155;">
        <button id="azTabBtn1" onclick="switchMasterGuideTab(1)" style="background:#fbbf24; color:#0f172a; border:none; padding:8px 14px; border-radius:7px; font-weight:800; font-size:0.82rem; cursor:pointer;">🗺️ 1. Aşama 0–10 Görsel Süreç Haritası &amp; Plan Tadilatı/DAP</button>
        <button id="azTabBtn2" onclick="switchMasterGuideTab(2)" style="background:#334155; color:#e2e8f0; border:none; padding:8px 14px; border-radius:7px; font-weight:700; font-size:0.82rem; cursor:pointer;">🗣️ 2. Maliklerle 3 Stratejik Toplantı &amp; Yetki Rehberi</button>
        <button id="azTabBtn3" onclick="switchMasterGuideTab(3)" style="background:#334155; color:#e2e8f0; border:none; padding:8px 14px; border-radius:7px; font-weight:700; font-size:0.82rem; cursor:pointer;">🛡️ 3. Danışmanlık Yetki, Yer Gösterme ve Teklif Sözleşmeleri (Ek-Uzman-1..3)</button>
      </div>

      <div id="masterGuideBody" style="padding:18px 22px; overflow-y:auto; flex:1;">
        <!-- SEKME 1 -->
        <div id="azTabContent1">
          <div style="background:#ffffff; border:2px solid #7c3aed; border-radius:10px; padding:14px; margin-bottom:16px;">
            <div style="font-size:0.75rem; font-weight:800; color:#6d28d9; margin-bottom:4px;">📐 STRATEJİK KARAR ŞEMASI • RİSKLİ YAPI BAŞVURUSUNDAN ÖNCE PLAN TADİLATI (TAKS / EMSAL 0,80➔1,20) VE DAP ANALİZİ</div>
            <svg viewBox="0 0 860 185" style="width:100%; height:auto; background:#0f172a; border-radius:8px; font-family:'Segoe UI',sans-serif;">
              <rect x="14" y="14" width="832" height="72" fill="#450a0a" stroke="#ef4444" stroke-width="1.5" rx="6"/>
              <text x="26" y="33" fill="#fca5a5" font-size="11" font-weight="bold">❌ YANLIŞ SIRALAMA (MALİKLER İÇİN HAK VE KİRA YARDIMI KAYBI RİSKİ):</text>
              <rect x="26" y="42" width="175" height="34" fill="#dc2626" rx="4"/><text x="113" y="63" fill="#fff" font-size="10" font-weight="bold" text-anchor="middle">1. Önce ARAAD Risk Tespiti</text>
              <text x="211" y="63" fill="#fca5a5" font-size="14" font-weight="bold">➔</text>
              <rect x="225" y="42" width="185" height="34" fill="#991b1b" rx="4"/><text x="317" y="63" fill="#fef08a" font-size="10" font-weight="bold" text-anchor="middle">2. Max 90 Günde Zorunlu Yıkım</text>
              <text x="420" y="63" fill="#fca5a5" font-size="14" font-weight="bold">➔</text>
              <rect x="434" y="42" width="195" height="34" fill="#7f1d1d" rx="4"/><text x="531" y="63" fill="#fff" font-size="10" font-weight="bold" text-anchor="middle">3. Plan Tadilatı (6-12 Ay) Yetişmez</text>
              <text x="639" y="63" fill="#fca5a5" font-size="14" font-weight="bold">➔</text>
              <rect x="652" y="42" width="182" height="34" fill="#ef4444" rx="4"/><text x="743" y="57" fill="#fff" font-size="9.5" font-weight="bold" text-anchor="middle">4. Ruhsat Çıkmaz / Kira Erir /</text><text x="743" y="70" fill="#fef08a" font-size="9" font-weight="bold" text-anchor="middle">Eski Düşük İmara Mecbur Kalınır!</text>

              <rect x="14" y="98" width="832" height="74" fill="#022c22" stroke="#10b981" stroke-width="1.5" rx="6"/>
              <text x="26" y="117" fill="#6ee7b7" font-size="11" font-weight="bold">✅ DOĞRU STRATEJİ (3194 EK MADDE 8 &amp; 22.11.2025 RG: 33085 DAP YÖNETMELİĞİ m.6–7):</text>
              <rect x="26" y="126" width="185" height="36" fill="#059669" rx="4"/><text x="118" y="142" fill="#fff" font-size="9.5" font-weight="bold" text-anchor="middle">1. %100 Malik İmza + Şehir Plancısı</text><text x="118" y="155" fill="#d1fae5" font-size="8.5" text-anchor="middle">(İlçe &amp; Büyükşehir Meclisi + 30 Gün Askı)</text>
              <text x="220" y="148" fill="#34d399" font-size="14" font-weight="bold">➔</text>
              <rect x="234" y="126" width="215" height="36" fill="#047857" rx="4"/><text x="341" y="142" fill="#fef08a" font-size="9.5" font-weight="bold" text-anchor="middle">2. İlk %20 Emsal Artışı DAP Muaf!</text><text x="341" y="155" fill="#fff" font-size="8.5" text-anchor="middle">(Aşan Kısmın %90 DAP\'ı Müteahhide)</text>
              <text x="458" y="148" fill="#34d399" font-size="14" font-weight="bold">➔</text>
              <rect x="472" y="126" width="175" height="36" fill="#0d9488" rx="4"/><text x="559" y="142" fill="#fff" font-size="9.5" font-weight="bold" text-anchor="middle">3. Plan Kesinleşince ARAAD</text><text x="559" y="155" fill="#ccfbf1" font-size="8.5" text-anchor="middle">Riskli Yapı Başvurusu (m.7)</text>
              <text x="656" y="148" fill="#34d399" font-size="14" font-weight="bold">➔</text>
              <rect x="670" y="126" width="164" height="36" fill="#2563eb" rx="4"/><text x="752" y="142" fill="#fff" font-size="9.5" font-weight="bold" text-anchor="middle">4. Yıkım + Hemen Yeni Ruhsat</text><text x="752" y="155" fill="#bfdbfe" font-size="8.5" text-anchor="middle">(Sıfır Hak ve Zaman Kaybı!)</text>
            </svg>
          </div>
          ${stagesCardsHtml}
        </div>

        <!-- SEKME 2 -->
        <div id="azTabContent2" style="display:none;">
          <div style="background:#ffffff; border:2px solid #0284c7; border-radius:10px; padding:14px; margin-bottom:16px;">
            <div style="font-size:0.75rem; font-weight:800; color:#0369a1; margin-bottom:6px;">📐 MALİKLERLE 3 ADIMLI TOPLANTI VE YETKİLENDİRME AKIŞ ŞEMASI</div>
            <svg viewBox="0 0 840 135" style="width:100%; height:auto; background:#0f172a; border-radius:8px; font-family:'Segoe UI',sans-serif;">
              <rect x="16" y="16" width="255" height="103" fill="#064e3b" stroke="#34d399" stroke-width="2" rx="8"/>
              <text x="143" y="38" fill="#34d399" font-size="12" font-weight="bold" text-anchor="middle">1. TANIŞMA &amp; ÖN YETKİ TOPLANTISI</text>
              <text x="143" y="58" fill="#ffffff" font-size="10" text-anchor="middle">• Tapu devir vekaleti İSTENMEZ!</text>
              <text x="143" y="76" fill="#fef08a" font-size="10" font-weight="bold" text-anchor="middle">• Belge: Ek-Uzman-1 (Koordinasyon Yetkisi)</text>
              <text x="143" y="94" fill="#a7f3d0" font-size="9.5" text-anchor="middle">• Amaç: İmar analizi ve müteahhit teklifi toplama</text>
              <text x="283" y="72" fill="#fbbf24" font-size="20" font-weight="bold">➔</text>
              <rect x="300" y="16" width="255" height="103" fill="#1e3a8a" stroke="#60a5fa" stroke-width="2" rx="8"/>
              <text x="427" y="38" fill="#93c5fd" font-size="12" font-weight="bold" text-anchor="middle">2. TEKLİF SEÇİMİ &amp; KAROT TOPLANTISI</text>
              <text x="427" y="58" fill="#ffffff" font-size="10" text-anchor="middle">• 3-4 Müteahhidin teklifi yan yana kıyaslanır</text>
              <text x="427" y="76" fill="#fef08a" font-size="10" font-weight="bold" text-anchor="middle">• Belge: Ek-Uzman-3 (Niyet Mektupları) &amp; Ek-3B</text>
              <text x="427" y="94" fill="#bfdbfe" font-size="9.5" text-anchor="middle">• Amaç: Kısa liste seçimi, avan proje ve ARAAD</text>
              <text x="567" y="72" fill="#fbbf24" font-size="20" font-weight="bold">➔</text>
              <rect x="584" y="16" width="240" height="103" fill="#4c1d95" stroke="#c084fc" stroke-width="2" rx="8"/>
              <text x="704" y="38" fill="#e9d5ff" font-size="12" font-weight="bold" text-anchor="middle">3. RESMİ &gt;%50 KARAR TOPLANTISI</text>
              <text x="704" y="58" fill="#ffffff" font-size="10" text-anchor="middle">• 15 gün önceden Ek-12 ile resmi çağrı ilanı</text>
              <text x="704" y="76" fill="#fef08a" font-size="10" font-weight="bold" text-anchor="middle">• Belge: Ek-12, Ek-3F, Ek-3L ve Ek-8</text>
              <text x="704" y="94" fill="#ddd6fe" font-size="9.5" text-anchor="middle">• Amaç: &gt;%50 Noter sözleşmesi ve pay satışı</text>
            </svg>
          </div>

          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap:14px;">
            <div style="background:#fff; border:1px solid #cbd5e1; border-top:5px solid #059669; border-radius:10px; padding:16px;">
              <h3 style="margin:0 0 8px 0; color:#065f46; font-size:1rem;">🟢 1. Toplantı: Tanışma, Bilgilendirme ve Ön Yetki</h3>
              <p style="font-size:0.83rem; color:#334155;"><strong>Ne Zaman:</strong> Sürecin en başında, henüz hiçbir müteahhitle görüşülmeden ve karot alınmadan önce.</p>
              <p style="font-size:0.83rem; color:#334155;"><strong>Konuşulacak Gündem:</strong><br>
              1. Parselin mevcut e-imar hakları (TAKS, KAKS, 1,70 çıkma) ve Plan Tadilatı (Aşama 0) potansiyeli,<br>
              2. 6306 Kanun avantajları (18 ay kira yardımı, 1,5 kat harç muafiyeti, %6 teminat),<br>
              3. Bireysel hareket etmek yerine Uzman koordinasyonunda Teknik Şartname hazırlanarak müteahhitlerden kapalı teklif toplanması.</p>
              <div style="background:#ecfdf5; padding:10px; border-radius:8px; font-size:0.81rem;">
                <strong>📄 İmzalanacak Belge:</strong> Ek-Uzman-1 ve Ek-3A.<br>
                <em>💡 Maliklere Güvence: "Bu belge tapu devir vekaleti değildir; sadece araştırma ve teklif toplama yetkisidir. Danışmanlık ücreti seçilecek müteahhitten alınacaktır."</em>
              </div>
            </div>

            <div style="background:#fff; border:1px solid #cbd5e1; border-top:5px solid #2563eb; border-radius:10px; padding:16px;">
              <h3 style="margin:0 0 8px 0; color:#1e3a8a; font-size:1rem;">🔵 2. Toplantı: Müteahhit Tekliflerini Kıyaslama ve Karot</h3>
              <p style="font-size:0.83rem; color:#334155;"><strong>Ne Zaman:</strong> Uzman en az 3–4 müteahhide Ek-Uzman-2 imzalatıp yazılı Ek-Uzman-3 Niyet Mektuplarını topladıktan sonra.</p>
              <p style="font-size:0.83rem; color:#334155;"><strong>Konuşulacak Gündem:</strong><br>
              1. Müteahhitlerin YAMBİS yetki sınıfları (H–A), paylaşım oranları (%50 vb.), ilave kira/taşınma destekleri ve DAP üstlenme taahhütlerinin karşılaştırılması,<br>
              2. En güçlü 1 asil + 1 yedek firmanın seçilerek Avan Proje ve Paylaşım Cetvelinin hazırlatılması,<br>
              3. Plan tadilatı yoksa ARAAD Riskli Yapı başvurusunun başlatılması.</p>
              <div style="background:#eff6ff; padding:10px; border-radius:8px; font-size:0.81rem;">
                <strong>📄 İncelenecek &amp; İmzalanacak Belgeler:</strong> Ek-Uzman-3 (Niyet Mektupları) ve Ek-3B (Lisanslı Kuruluş Başvurusu).
              </div>
            </div>

            <div style="background:#fff; border:1px solid #cbd5e1; border-top:5px solid #9333ea; border-radius:10px; padding:16px;">
              <h3 style="margin:0 0 8px 0; color:#6b21a8; font-size:1rem;">🟣 3. Toplantı: Ek-12 Çağrılı Resmi &gt;%50 Sözleşme Toplantısı</h3>
              <p style="font-size:0.83rem; color:#334155;"><strong>Ne Zaman:</strong> Avan proje, paylaşım cetveli ve noter sözleşme taslağı son halini aldığında (Binanın yıkılmış olması şart değildir - m.15/2).</p>
              <p style="font-size:0.83rem; color:#334155;"><strong>Zorunlu Çağrı Usulü (04.02.2026):</strong><br>
              Toplantı yeri ve zamanı en az 15 gün önceden Ek-12 formuyla muhtarlıkta veya bina kapısında 15 gün ilan edilir (veya noterle tebliğ edilir).</p>
              <div style="background:#faf5ff; padding:10px; border-radius:8px; font-size:0.81rem;">
                <strong>📄 İmzalanacak Belgeler:</strong><br>
                • Ek-12 (Toplantı Çağrı İlan Tutanağı),<br>
                • Ek-3F (&gt;%50 Salt Çoğunluk Karar Tutanağı),<br>
                • Noter Kat Karşılığı Sözleşmesi &amp; Ek-3L (Sınırlı Vekaletname),<br>
                • Ek-8 ve Ek-3G (Katılmayan Maliklere 15 Günlük Teklif Bildirimi).
              </div>
            </div>
          </div>
        </div>

        <!-- SEKME 3 (TAM BOY SÖZLEŞME GÖRÜNÜMÜ) -->
        <div id="azTabContent3" style="display:none;">
          <div style="background:#ffffff; border:2px solid #059669; border-radius:10px; padding:14px; margin-bottom:16px;">
            <div style="font-size:0.75rem; font-weight:800; color:#047857; margin-bottom:6px;">📐 DANIŞMANLIK HİZMET BEDELİNİ VE MÜNHASIRLIĞI GÜVENCEYE ALAN ÜÇLÜ SÖZLEŞME SİSTEMİ (TBK m.520 vd.)</div>
            <svg viewBox="0 0 840 135" style="width:100%; height:auto; background:#0f172a; border-radius:8px; font-family:'Segoe UI',sans-serif;">
              <rect x="18" y="18" width="250" height="99" fill="#1e293b" stroke="#38bdf8" stroke-width="2" rx="8"/>
              <text x="143" y="40" fill="#38bdf8" font-size="11.5" font-weight="bold" text-anchor="middle">1. SÖZLEŞME: MALİKLER ↔ UZMAN</text>
              <text x="143" y="60" fill="#fbbf24" font-size="10.5" font-weight="bold" text-anchor="middle">Belge: EK-UZMAN-1</text>
              <text x="143" y="78" fill="#e2e8f0" font-size="9.5" text-anchor="middle">Teklif toplama yetkisi uzmana verilir;</text>
              <text x="143" y="94" fill="#94a3b8" font-size="9" text-anchor="middle">hizmet bedelinin müteahhitten alınacağı tescillenir.</text>
              <text x="280" y="72" fill="#34d399" font-size="18" font-weight="bold">⚖️</text>
              <rect x="302" y="18" width="250" height="99" fill="#1e293b" stroke="#34d399" stroke-width="2" rx="8"/>
              <text x="427" y="40" fill="#34d399" font-size="11.5" font-weight="bold" text-anchor="middle">2. SÖZLEŞME: UZMAN ↔ MÜTEAHHİT</text>
              <text x="427" y="60" fill="#fbbf24" font-size="10.5" font-weight="bold" text-anchor="middle">Belge: EK-UZMAN-2 (Ada/Parselden Önce!)</text>
              <text x="427" y="78" fill="#e2e8f0" font-size="9.5" text-anchor="middle">Gizlilik, münhasırlık ve doğrudan temas yasağı</text>
              <text x="427" y="94" fill="#fca5a5" font-size="9.5" font-weight="bold" text-anchor="middle">(%4 + KDV Hizmet Bedeli + %50 Cezai Şart)</text>
              <text x="564" y="72" fill="#34d399" font-size="18" font-weight="bold">⚖️</text>
              <rect x="586" y="18" width="236" height="99" fill="#1e293b" stroke="#fbbf24" stroke-width="2" rx="8"/>
              <text x="704" y="40" fill="#fbbf24" font-size="11.5" font-weight="bold" text-anchor="middle">3. BELGE: MÜTEAHHİT ➔ MALİKLER</text>
              <text x="704" y="60" fill="#34d399" font-size="10.5" font-weight="bold" text-anchor="middle">Belge: EK-UZMAN-3 (Niyet Mektubu)</text>
              <text x="704" y="78" fill="#e2e8f0" font-size="9.5" text-anchor="middle">Paylaşım, %6 teminat, DAP üstlenme ve</text>
              <text x="704" y="94" fill="#fde68a" font-size="9" font-weight="bold" text-anchor="middle">uzman hizmet bedeli taahhüdünü içerir.</text>
            </svg>
          </div>

          <div style="display:flex; flex-direction:column; gap:16px;">
            ${['Ek-Uzman-1', 'Ek-Uzman-2', 'Ek-Uzman-3'].map((code, idx) => `
              <div style="background:#ffffff; border:1px solid #cbd5e1; border-top:4px solid #059669; border-radius:10px; padding:16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
                  <div>
                    <span style="font-size:0.74rem; font-weight:700; color:#059669;">${YON_EK_DB[code].ref}</span>
                    <h3 style="margin:2px 0 0 0; font-size:0.98rem; color:#0f172a;">${YON_EK_DB[code].title}</h3>
                  </div>
                  <button class="btn-small" style="background:#059669;" onclick="copyTemplate('az-uzman-tpl-${idx}', this)">📋 Şablonu Kopyala</button>
                </div>
                <div class="template-box" id="az-uzman-tpl-${idx}" style="font-size:0.81rem; line-height:1.55;">${YON_EK_DB[code].formText}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  linkifyYonEkInElement(modal);
}

function openMasterGuideModal(tabNo) {
  buildMasterGuideModalIfNeeded();
  const m = document.getElementById('masterGuideModal');
  if (m) m.style.display = 'flex';
  if (tabNo) switchMasterGuideTab(tabNo);
}

function closeMasterGuideModal() {
  const m = document.getElementById('masterGuideModal');
  if (m) m.style.display = 'none';
}

function switchMasterGuideTab(tabNo) {
  [1, 2, 3].forEach(n => {
    const content = document.getElementById('azTabContent' + n);
    const btn = document.getElementById('azTabBtn' + n);
    if (content) content.style.display = (n === tabNo) ? 'block' : 'none';
    if (btn) {
      btn.style.background = (n === tabNo) ? '#fbbf24' : '#334155';
      btn.style.color = (n === tabNo) ? '#0f172a' : '#e2e8f0';
    }
  });
}

function printMasterGuideSummary() {
  buildMasterGuideModalIfNeeded();
  const c1 = document.getElementById('azTabContent1').innerHTML;
  const c2 = document.getElementById('azTabContent2').innerHTML;
  const win = window.open('', '_blank');
  win.document.write(`
    <html><head><title>A'dan Z'ye Kentsel Dönüşüm Yol Haritası ve Malik Rehberi</title>
    <style>
      body { font-family: 'Segoe UI', sans-serif; padding: 20px; color: #0f172a; line-height: 1.5; }
      h1 { font-size: 1.3rem; border-bottom: 3px solid #0f172a; padding-bottom: 6px; }
      button { display: none !important; }
    </style></head><body>
    <h1>🧭 A'DAN Z'YE KENTSEL DÖNÜŞÜM SÜRECİ, PLAN TADİLATI (DAP) VE MALİK TOPLANTI REHBERİ</h1>
    ${c1}
    <hr style="margin:24px 0;">
    ${c2}
    </body></html>
  `);
  win.document.close();
  win.print();
}

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(injectMasterGuideTriggerIntoPage, 80);
});
// 17. MALİK SUNUM MODU: CANLI TAKS/KAT ANİMASYONU, PLAN TADİLATI (EMSAL & TAKS) SİMÜLATÖRÜ VE SENARYO KAYIT MOTORU
(function initMalikSunumModulu() {
  const STORAGE_KEY = 'kd_malik_sunum_saved_scenarios_v1';

  // VARSAYILAN SENARYO: ADA BAZLI PLAN TADİLATI ÖRNEĞİ (Her açılışta bu değerlerle başlar)
  const DEFAULT_SCENARIO = {
    id: 'default_ada_bazli',
    name: '⭐ Varsayılan: Ada Bazlı Plan Tadilatı Örneği (Emsal 0,80➔1,20 | TAKS 0,30➔0,40)',
    kunye: 'ÖRNEK SENARYO: ADA BAZLI PLAN TADİLATI (EMSAL 0,80 ➔ 1,20 & TAKS 0,30 ➔ 0,40)',
    arsaNet: 2000,
    cks: 1.70,
    verim: 80,
    satisM2: 120000,
    hissePayda: 10,
    daireBolunum: 2,
    simSource: '2', // Sol animasyonda hangi sütunun baz alındığı ('1': Mevcut İmar, '2': Tadilatlı İmar)
    taks1: 0.30,
    emsal1: 0.80,
    kat1: 5,
    oran1: 50,
    taks2: 0.40,
    emsal2: 1.20,
    kat2: 7,
    oran2: 50
  };

  const sunumState = {
    acik: false,
    gorunumModu: 'ikili',
    hedefKat: 7,
    guncelKat: 7.0,
    otoOynat: false,
    otoTimer: null,
    rafId: null,
    aktifData: { ...DEFAULT_SCENARIO }
  };

  function getSavedScenarios() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveScenariosToStorage(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  function injectMalikSunumStylesAndButtons() {
    if (!document.getElementById('malikSunumStyles')) {
      const st = document.createElement('style');
      st.id = 'malikSunumStyles';
      st.textContent = `
        #kdMalikSunumModal input[type="range"].ms-slider {
          -webkit-appearance: none; appearance: none; width: 100%; height: 9px;
          background: #cbd5e1; border: 1.5px solid #475569; border-radius: 999px;
          outline: none; cursor: pointer;
        }
        #kdMalikSunumModal input[type="range"].ms-slider-blue {
          background: linear-gradient(90deg, #bfdbfe 0%, #60a5fa 100%); border-color: #1e40af;
        }
        #kdMalikSunumModal input[type="range"].ms-slider-green {
          background: linear-gradient(90deg, #bbf7d0 0%, #4ade80 100%); border-color: #15803d;
        }
        #kdMalikSunumModal input[type="range"].ms-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none; width: 18px; height: 18px;
          border-radius: 50%; background: #1d4ed8; border: 2px solid #ffffff;
          box-shadow: 0 2px 5px rgba(15,23,42,0.45); cursor: grab;
        }
        #kdMalikSunumModal input[type="range"].ms-slider-green::-webkit-slider-thumb {
          background: #15803d;
        }
        .ms-num-input {
          width: 64px; height: 24px; padding: 1px 4px; border: 1.5px solid #94a3b8;
          border-radius: 5px; font-weight: 800; font-size: 0.78rem; text-align: center;
          color: #0f172a; background: #ffffff;
        }
        .ms-top-input {
          height: 26px; padding: 2px 6px; border: 1.5px solid #475569; border-radius: 5px;
          font-weight: 800; font-size: 0.78rem; text-align: center; color: #0f172a; background: #fff;
        }
      `;
      document.head.appendChild(st);
    }

    // 1) Üst Navigasyon Barına "🎬 Malik Sunum" Butonu Ekle
    const topActions = document.querySelector('.top-actions');
    if (topActions && !document.getElementById('topMalikSunumBtn')) {
      const btn = document.createElement('button');
      btn.id = 'topMalikSunumBtn';
      btn.className = 'action-pill';
      btn.style.cssText = 'background:linear-gradient(135deg,#fde047 0%,#f59e0b 100%); color:#0f172a; border-color:#b45309; font-weight:800;';
      btn.innerHTML = '🎬 Malik Sunum Modu';
      btn.onclick = () => window.openMalikSunumModal();
      topActions.insertBefore(btn, topActions.firstChild);
    }

    // 2) Ana Sayfa (index.html) Hero Komuta Butonlarına Ekle
    const heroBtnBar = document.querySelector('.section-card button[onclick*="openSplitTools"]');
    if (heroBtnBar && heroBtnBar.parentElement && !document.getElementById('heroMalikSunumBtn')) {
      const hBtn = document.createElement('button');
      hBtn.id = 'heroMalikSunumBtn';
      hBtn.style.cssText = 'background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%); color:#0f172a; border:2px solid #fff; padding:9px 15px; border-radius:8px; font-weight:800; font-size:0.84rem; cursor:pointer; box-shadow:0 4px 12px rgba(245,158,11,0.35);';
      hBtn.innerHTML = '🎬 Canlı Malik Sunum & Plan Tadilatı Animasyonu';
      hBtn.onclick = () => window.openMalikSunumModal();
      heroBtnBar.parentElement.insertBefore(hBtn, heroBtnBar);
    }
  }

  function buildMalikSunumModalDOM() {
    let modal = document.getElementById('kdMalikSunumModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'kdMalikSunumModal';
    modal.style.cssText = 'position:fixed; inset:0; width:100vw; height:100vh; background:#0f172a; z-index:4200; display:none; flex-direction:column; overflow:hidden; font-family:"Segoe UI",system-ui,sans-serif;';

    modal.innerHTML = `
      <!-- 1. ÜST KOMUTA VE SENARYO YÖNETİM BARI -->
      <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 100%); color:#fff; padding:8px 14px; border-bottom:2px solid #f59e0b; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span style="background:#fbbf24; color:#0f172a; font-weight:900; font-size:0.74rem; padding:3px 8px; border-radius:5px;">🎬 MALİK SUNUM MODU</span>
          <input type="text" id="ms_kunye" placeholder="Proje / Senaryo Başlığı Yazın..." oninput="msOnInputChange()" style="background:rgba(255,255,255,0.12); color:#fff; border:1px solid #60a5fa; border-radius:6px; padding:3px 10px; font-size:0.82rem; font-weight:700; min-width:290px;">
        </div>

        <!-- KAYITLI SENARYOLAR, KAYDET, TEMİZLE VE GÖRÜNÜM BUTONLARI -->
        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          <select id="ms_scenarioSelect" onchange="msLoadSelectedScenario(this.value)" style="height:27px; border-radius:6px; border:1.5px solid #fbbf24; background:#1e293b; color:#fde047; font-weight:700; font-size:0.74rem; padding:0 8px; max-width:270px; cursor:pointer;"></select>
          <button type="button" onclick="msSaveCurrentScenario()" style="background:#10b981; color:#022c22; border:none; padding:4px 10px; border-radius:6px; font-weight:800; font-size:0.73rem; cursor:pointer;" title="Mevcut değerleri isim vererek kaydet">💾 Kaydet</button>
          <button type="button" id="ms_btnDeleteScenario" onclick="msDeleteSelectedScenario()" style="display:none; background:#ef4444; color:#fff; border:none; padding:4px 8px; border-radius:6px; font-weight:800; font-size:0.73rem; cursor:pointer;" title="Seçili özel senaryoyu sil">🗑️ Sil</button>
          <button type="button" onclick="msClearForm()" style="background:#f97316; color:#fff; border:none; padding:4px 10px; border-radius:6px; font-weight:800; font-size:0.73rem; cursor:pointer;" title="Tüm değerleri temizleyip sıfırdan gerçek veri gir">🧹 Temizle</button>
          <button type="button" onclick="msResetToDefault()" style="background:#38bdf8; color:#0f172a; border:none; padding:4px 10px; border-radius:6px; font-weight:800; font-size:0.73rem; cursor:pointer;" title="Varsayılan Ada Bazlı Plan Tadilatı örneğine dön">↺ Varsayılan Örnek</button>

          <div style="display:inline-flex; border:1px solid #94a3b8; border-radius:6px; overflow:hidden; margin-left:4px;">
            <button type="button" id="ms_viewIkili" onclick="msSetViewMode('ikili')" style="background:#fbbf24; color:#0f172a; border:none; padding:4px 8px; font-size:0.71rem; font-weight:800; cursor:pointer;">🗔 İkili</button>
            <button type="button" id="ms_viewSol" onclick="msSetViewMode('sol')" style="background:transparent; color:#fff; border:none; padding:4px 8px; font-size:0.71rem; font-weight:700; cursor:pointer;">🏗️ Kütle</button>
            <button type="button" id="ms_viewSag" onclick="msSetViewMode('sag')" style="background:transparent; color:#fff; border:none; padding:4px 8px; font-size:0.71rem; font-weight:700; cursor:pointer;">⚖️ Kıyaslama</button>
          </div>
          <button type="button" onclick="msToggleFullscreen()" style="background:#334155; color:#fff; border:1px solid #64748b; padding:4px 8px; border-radius:6px; font-size:0.71rem; font-weight:700; cursor:pointer;">⛶ F11</button>
          <button type="button" onclick="closeMalikSunumModal()" style="background:#dc2626; color:#fff; border:none; padding:4px 11px; border-radius:6px; font-size:0.74rem; font-weight:800; cursor:pointer;">✕ Kapat</button>
        </div>
      </div>

      <!-- 2. ORTAK PARSEL PARAMETRELERİ GİRİŞ BARI -->
      <div style="background:#e2e8f0; padding:6px 14px; border-bottom:1.5px solid #cbd5e1; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; font-size:0.76rem; color:#0f172a;">
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <label style="font-weight:800;">📐 Net Arsa (m²): <input type="number" id="ms_arsaNet" step="50" placeholder="Örn: 2000" oninput="msOnInputChange()" class="ms-top-input" style="width:82px; border-color:#1d4ed8;"></label>
          <label style="font-weight:800;">🏢 Çıkma / Büyüme Çarpanı: <input type="number" id="ms_cks" step="0.05" placeholder="1.70" oninput="msOnInputChange()" class="ms-top-input" style="width:62px;" title="Antalya 1,70 Çıkma Katsayısı veya 1,30 Emsal Harici Çarpan"></label>
          <label style="font-weight:800;">📏 Mimari Verim (%): <input type="number" id="ms_verim" step="1" placeholder="80" oninput="msOnInputChange()" class="ms-top-input" style="width:55px;"></label>
          <label style="font-weight:800; color:#15803d;">🏷️ Bitmiş Satış (₺/m²): <input type="text" id="ms_satisM2" placeholder="120.000" oninput="msOnMoneyInput(this)" class="ms-top-input" style="width:88px; border-color:#15803d; color:#15803d;"></label>
        </div>
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <label style="font-weight:800; color:#1e3a8a;">👤 Tek Hissedar Payı: 1 / <input type="number" id="ms_hissePayda" min="1" max="500" placeholder="10" oninput="msOnInputChange()" class="ms-top-input" style="width:56px; border-color:#1e3a8a;"></label>
          <label style="font-weight:800;">🏠 Daire Bölünümü:
            <select id="ms_daireBolunum" onchange="msOnInputChange()" class="ms-top-input" style="width:auto; padding:0 8px; cursor:pointer;">
              <option value="1">1 Tam Daireye Böl</option>
              <option value="2" selected>2 Tam Daireye Böl</option>
              <option value="3">3 Tam Daireye Böl</option>
              <option value="4">4 Tam Daireye Böl</option>
            </select>
          </label>
        </div>
      </div>

      <!-- 3. ANA İKİLİ SAHNE GÖVDESİ -->
      <div id="ms_mainGrid" style="flex:1; display:grid; grid-template-columns: 1fr 1fr; gap:10px; padding:10px; background:#f1f5f9; overflow:hidden; min-height:0;">

        <!-- SOL SAHNE: TAKS, KAT VE YANAN HAK KÜTLE ANİMASYONU -->
        <div id="ms_leftCol" style="background:#ffffff; border:1.5px solid #cbd5e1; border-radius:10px; padding:10px; display:flex; flex-direction:column; justify-content:space-between; overflow:hidden; min-height:0;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; border-bottom:1px solid #e2e8f0; padding-bottom:6px; margin-bottom:6px; flex-wrap:wrap;">
            <strong style="font-size:0.8rem; color:#0f172a;">🏗️ 1. "ARSAMIZ BÜYÜK, NEDEN BU ALANA SIKIŞIYORUZ?" (TAKS & KAT SİMÜLASYONU)</strong>
            <div style="display:flex; align-items:center; gap:6px;">
              <select id="ms_simSource" onchange="msChangeSimSource(this.value)" style="height:24px; font-size:0.7rem; font-weight:800; border-radius:5px; border:1px solid #2563eb; background:#eff6ff; color:#1e3a8a; cursor:pointer;">
                <option value="1">🟦 1. Sütunu (Mevcut İmar) Simüle Et</option>
                <option value="2" selected>🟩 2. Sütunu (Plan Tadilatlı) Simüle Et</option>
              </select>
              <button type="button" id="ms_btnAutoPlay" onclick="msToggleAutoPlay()" style="background:#fbbf24; color:#0f172a; border:1px solid #d97706; border-radius:5px; padding:2px 9px; font-size:0.7rem; font-weight:800; cursor:pointer;">▶️ Otomatik Oynat</button>
            </div>
          </div>

          <!-- 3'LÜ CANLI DİJİTAL SAYAÇ -->
          <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:6px; background:#0f172a; padding:6px; border-radius:8px; margin-bottom:6px; text-align:center;">
            <div style="background:rgba(30,58,138,0.65); border:1px solid #38bdf8; border-radius:6px; padding:4px;">
              <div style="font-size:0.6rem; font-weight:800; color:#7dd3fc;">🏛️ 1. TOPLAM İNŞAAT HAKKI</div>
              <div id="ms_cntTopTia" style="font-size:0.95rem; font-weight:900; color:#fff;">0 m² TİA</div>
              <div id="ms_cntTopIc" style="font-size:0.63rem; font-weight:700; color:#fde047;">(0 m² Net İç)</div>
            </div>
            <div id="ms_boxUsed" style="background:rgba(6,95,70,0.75); border:1px solid #4ade80; border-radius:6px; padding:4px;">
              <div style="font-size:0.6rem; font-weight:800; color:#fff;">✅ 2. KULLANILAN İNŞAAT</div>
              <div id="ms_cntUsedTia" style="font-size:0.95rem; font-weight:900; color:#fff;">0 m² (%100)</div>
              <div id="ms_cntUsedIc" style="font-size:0.63rem; font-weight:700; color:#86efac;">(0 m² Net İç)</div>
            </div>
            <div id="ms_boxBurned" style="background:rgba(30,41,59,0.9); border:1px solid #64748b; border-radius:6px; padding:4px;">
              <div id="ms_lblBurnedTitle" style="font-size:0.6rem; font-weight:800; color:#e2e8f0;">🔥 3. TAKS İLE YANAN HAK</div>
              <div id="ms_cntBurnedTia" style="font-size:0.95rem; font-weight:900; color:#4ade80;">0 m² (Kayıp Yok ✓)</div>
              <div id="ms_cntBurnedIc" style="font-size:0.63rem; font-weight:700; color:#cbd5e1;">(%100 Kullanılıyor)</div>
            </div>
          </div>

          <!-- CANLI ANİMASYON KANVASI -->
          <div style="flex:1; background:#0f172a; border-radius:8px; overflow:hidden; display:flex; align-items:center; justify-content:center; min-height:170px; margin-bottom:6px;">
            <canvas id="ms_animCanvas" style="width:100%; height:100%; object-fit:contain; display:block;"></canvas>
          </div>

          <!-- KAT SÜRGÜSÜ -->
          <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:6px 10px; margin-bottom:6px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; flex-wrap:wrap; gap:4px;">
              <span style="font-size:0.74rem; font-weight:800; color:#0f172a;">🏗️ Denenen Kat Sayısı: <span id="ms_lblActiveKat" style="background:#1d4ed8; color:#fff; padding:1px 8px; border-radius:4px;">7 Kat</span></span>
              <div style="display:flex; gap:4px;">
                <button type="button" onclick="msSelectAnimKat(3)" style="background:#fee2e2; color:#991b1b; border:1px solid #f87171; border-radius:4px; padding:2px 7px; font-size:0.66rem; font-weight:800; cursor:pointer;">📉 3 Kat (Hak Yanar)</button>
                <button type="button" onclick="msSelectAnimKat(4)" style="background:#fef3c7; color:#92400e; border:1px solid #fbbf24; border-radius:4px; padding:2px 7px; font-size:0.66rem; font-weight:800; cursor:pointer;">4 Kat</button>
                <button type="button" id="ms_btnIdealKat" onclick="msSelectAnimKat(7)" style="background:#dcfce7; color:#166534; border:1px solid #4ade80; border-radius:4px; padding:2px 7px; font-size:0.66rem; font-weight:800; cursor:pointer;">✅ 7 Kat (İdeal)</button>
                <button type="button" onclick="msSelectAnimKat(10)" style="background:#e2e8f0; color:#0f172a; border:1px solid #64748b; border-radius:4px; padding:2px 7px; font-size:0.66rem; font-weight:800; cursor:pointer;">📈 10 Kat (Aşım)</button>
              </div>
            </div>
            <input type="range" id="ms_rngAnimKat" min="1" max="15" step="1" value="7" oninput="msSelectAnimKat(this.value)" class="ms-slider">
          </div>

          <div id="ms_leftWarnBox" style="padding:7px 10px; border-radius:7px; font-size:0.71rem; line-height:1.38;"></div>
        </div>

        <!-- SAĞ SAHNE: MEVCUT İMAR (TAKS/EMSAL/KAT) VS PLAN TADİLATLI İMAR SİMÜLATÖRÜ -->
        <div id="ms_rightCol" style="background:#ffffff; border:1.5px solid #cbd5e1; border-radius:10px; padding:10px; display:flex; flex-direction:column; justify-content:space-between; overflow-y:auto; min-height:0;">
          <div style="border-bottom:1px solid #e2e8f0; padding-bottom:6px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
            <strong style="font-size:0.8rem; color:#0f172a;">⚖️ 2. MEVCUT İMAR vs. PLAN TADİLATLI İMAR (TAKS, EMSAL, KAT & PAYLAŞIM)</strong>
            <span style="font-size:0.68rem; font-weight:700; color:#475569;">Kutulara yazabilir veya sürgüleri kaydırabilirsiniz</span>
          </div>

          <!-- 2 SÜTUNLU SKORBORD KARTLARI -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
            <!-- 1. SÜTUN: MEVCUT İMAR -->
            <div style="border:2px solid #1e40af; border-radius:8px; background:#f8fafc; overflow:hidden;">
              <div style="background:linear-gradient(135deg,#0f172a 0%,#1e40af 100%); color:#fff; padding:5px 10px; font-size:0.75rem; font-weight:800; display:flex; justify-content:space-between;">
                <span>🟦 1. MEVCUT İMAR DURUMU</span>
                <span id="ms_col1BurnBadge" style="background:#dcfce7; color:#166534; padding:0 6px; border-radius:4px; font-size:0.63rem;">Tam Kullanım</span>
              </div>
              <div style="padding:8px; display:flex; flex-direction:column; gap:6px; font-size:0.72rem;">
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                    <span style="font-weight:800; color:#1e3a8a;">1. Mevcut TAKS:</span>
                    <input type="number" id="ms_taks1" step="0.05" min="0.10" max="0.80" oninput="msSyncFromInputs('1')" class="ms-num-input">
                  </div>
                  <input type="range" id="ms_rngTaks1" min="0.10" max="0.80" step="0.05" oninput="msSyncFromSliders('1')" class="ms-slider ms-slider-blue">
                </div>
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                    <span style="font-weight:800; color:#1e3a8a;">2. Mevcut Emsal (KAKS):</span>
                    <input type="number" id="ms_emsal1" step="0.05" min="0.20" max="3.00" oninput="msSyncFromInputs('1')" class="ms-num-input">
                  </div>
                  <input type="range" id="ms_rngEmsal1" min="0.20" max="3.00" step="0.05" oninput="msSyncFromSliders('1')" class="ms-slider ms-slider-blue">
                </div>
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                    <span style="font-weight:800; color:#1e3a8a;">3. Mevcut Kat (Gabari):</span>
                    <input type="number" id="ms_kat1" step="1" min="1" max="15" oninput="msSyncFromInputs('1')" class="ms-num-input">
                  </div>
                  <input type="range" id="ms_rngKat1" min="1" max="15" step="1" oninput="msSyncFromSliders('1')" class="ms-slider ms-slider-blue">
                </div>
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                    <span style="font-weight:800; color:#0f172a;">4. Malik Oranı (%):</span>
                    <input type="number" id="ms_oran1" step="1" min="20" max="80" oninput="msSyncFromInputs('1')" class="ms-num-input">
                  </div>
                  <input type="range" id="ms_rngOran1" min="20" max="80" step="1" oninput="msSyncFromSliders('1')" class="ms-slider ms-slider-blue">
                </div>
              </div>
            </div>

            <!-- 2. SÜTUN: PLAN TADİLATLI YENİ İMAR -->
            <div style="border:2px solid #15803d; border-radius:8px; background:#f0fdf4; overflow:hidden;">
              <div style="background:linear-gradient(135deg,#065f46 0%,#16a34a 100%); color:#fff; padding:5px 10px; font-size:0.75rem; font-weight:800; display:flex; justify-content:space-between;">
                <span>🟩 2. PLAN TADİLATLI İMAR</span>
                <span id="ms_col2BurnBadge" style="background:#fef08a; color:#0f172a; padding:0 6px; border-radius:4px; font-size:0.63rem;">Yeni İmar</span>
              </div>
              <div style="padding:8px; display:flex; flex-direction:column; gap:6px; font-size:0.72rem;">
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                    <span style="font-weight:800; color:#166534;">1. Tadilatlı TAKS:</span>
                    <input type="number" id="ms_taks2" step="0.05" min="0.10" max="0.80" oninput="msSyncFromInputs('2')" class="ms-num-input">
                  </div>
                  <input type="range" id="ms_rngTaks2" min="0.10" max="0.80" step="0.05" oninput="msSyncFromSliders('2')" class="ms-slider ms-slider-green">
                </div>
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                    <span style="font-weight:800; color:#166534;">2. Tadilatlı Emsal (KAKS):</span>
                    <input type="number" id="ms_emsal2" step="0.05" min="0.20" max="3.00" oninput="msSyncFromInputs('2')" class="ms-num-input">
                  </div>
                  <input type="range" id="ms_rngEmsal2" min="0.20" max="3.00" step="0.05" oninput="msSyncFromSliders('2')" class="ms-slider ms-slider-green">
                </div>
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                    <span style="font-weight:800; color:#166534;">3. Tadilatlı Kat (Gabari):</span>
                    <input type="number" id="ms_kat2" step="1" min="1" max="15" oninput="msSyncFromInputs('2')" class="ms-num-input">
                  </div>
                  <input type="range" id="ms_rngKat2" min="1" max="15" step="1" oninput="msSyncFromSliders('2')" class="ms-slider ms-slider-green">
                </div>
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                    <span style="font-weight:800; color:#0f172a;">4. Malik Oranı (%):</span>
                    <input type="number" id="ms_oran2" step="1" min="20" max="80" oninput="msSyncFromInputs('2')" class="ms-num-input">
                  </div>
                  <input type="range" id="ms_rngOran2" min="20" max="80" step="1" oninput="msSyncFromSliders('2')" class="ms-slider ms-slider-green">
                </div>
              </div>
            </div>
          </div>

          <!-- BÖLÜM 1: TOPLAM İNŞAAT PASTASI KIYASLAMASI -->
          <div id="ms_pastaCompareBox" style="border:1px solid #cbd5e1; border-radius:8px; padding:8px; background:#fff; margin-bottom:8px;"></div>

          <!-- BÖLÜM 2: TEK HİSSEDARIN DAİRE VE SERVET KAZANCI + DAP ANALİZİ -->
          <div id="ms_hissedarCompareBox" style="border:1px solid #cbd5e1; border-radius:8px; padding:8px; background:#fff;"></div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    return modal;
  }

  function populateScenarioDropdown(selectedId) {
    const sel = document.getElementById('ms_scenarioSelect');
    const delBtn = document.getElementById('ms_btnDeleteScenario');
    if (!sel) return;
    const saved = getSavedScenarios();
    sel.innerHTML = `<option value="default_ada_bazli">${DEFAULT_SCENARIO.name}</option>` +
      saved.map(s => `<option value="${s.id}" ${s.id === selectedId ? 'selected' : ''}>📂 ${s.name}</option>`).join('');
    if (!selectedId || selectedId === 'default_ada_bazli') {
      sel.value = 'default_ada_bazli';
      if (delBtn) delBtn.style.display = 'none';
    } else {
      sel.value = selectedId;
      if (delBtn) delBtn.style.display = 'inline-block';
    }
  }

  function applyScenarioToInputs(sc) {
    sunumState.aktifData = { ...sc };
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = (v !== undefined && v !== '') ? v : ''; };
    setVal('ms_kunye', sc.kunye);
    setVal('ms_arsaNet', sc.arsaNet);
    setVal('ms_cks', sc.cks);
    setVal('ms_verim', sc.verim);
    setVal('ms_satisM2', sc.satisM2 ? Number(sc.satisM2).toLocaleString('tr-TR') : '');
    setVal('ms_hissePayda', sc.hissePayda);
    setVal('ms_daireBolunum', sc.daireBolunum || 2);
    setVal('ms_simSource', sc.simSource || '2');

    ['1', '2'].forEach(col => {
      setVal('ms_taks' + col, sc['taks' + col]);
      setVal('ms_rngTaks' + col, sc['taks' + col] || 0.30);
      setVal('ms_emsal' + col, sc['emsal' + col]);
      setVal('ms_rngEmsal' + col, sc['emsal' + col] || 0.80);
      setVal('ms_kat' + col, sc['kat' + col]);
      setVal('ms_rngKat' + col, sc['kat' + col] || 5);
      setVal('ms_oran' + col, sc['oran' + col]);
      setVal('ms_rngOran' + col, sc['oran' + col] || 50);
    });

    const targetKat = (sc.simSource === '1' ? sc.kat1 : sc.kat2) || 7;
    sunumState.hedefKat = targetKat;
    sunumState.guncelKat = targetKat;
    setVal('ms_rngAnimKat', targetKat);
    const lblK = document.getElementById('ms_lblActiveKat');
    if (lblK) lblK.innerText = `${targetKat} Kat`;

    msRecalculateAll();
  }

  // HER AÇILIŞTA VARSAYILAN "ADA BAZLI PLAN TADİLATI" SENARYOSU İLE BAŞLAR
  window.openMalikSunumModal = function() {
    const modal = buildMalikSunumModalDOM();
    sunumState.acik = true;
    modal.style.display = 'flex';
    populateScenarioDropdown('default_ada_bazli');
    applyScenarioToInputs(DEFAULT_SCENARIO);
    msSetViewMode('ikili');
    startAnimLoop();
  };

  window.closeMalikSunumModal = function() {
    sunumState.acik = false;
    stopAutoPlay();
    if (sunumState.rafId) cancelAnimationFrame(sunumState.rafId);
    const modal = document.getElementById('kdMalikSunumModal');
    if (modal) modal.style.display = 'none';
  };

  window.msResetToDefault = function() {
    stopAutoPlay();
    populateScenarioDropdown('default_ada_bazli');
    applyScenarioToInputs(DEFAULT_SCENARIO);
  };

  window.msClearForm = function() {
    stopAutoPlay();
    const emptyScenario = {
      id: 'custom_empty',
      name: 'Yeni Özel Çalışma',
      kunye: '',
      arsaNet: '',
      cks: 1.70,
      verim: 80,
      satisM2: '',
      hissePayda: 10,
      daireBolunum: 2,
      simSource: '2',
      taks1: '', emsal1: '', kat1: '', oran1: '',
      taks2: '', emsal2: '', kat2: '', oran2: ''
    };
    applyScenarioToInputs(emptyScenario);
    const arsaInput = document.getElementById('ms_arsaNet');
    if (arsaInput) arsaInput.focus();
  };

  window.msSaveCurrentScenario = function() {
    msReadInputsIntoState();
    const d = sunumState.aktifData;
    if (!d.arsaNet || d.arsaNet <= 0) {
      alert('Kaydetmeden önce lütfen geçerli bir Net Arsa (m²) değeri giriniz.');
      return;
    }
    const defaultName = d.kunye && !d.kunye.includes('ÖRNEK SENARYO')
      ? d.kunye
      : `Özel Senaryo (${d.arsaNet} m² | Emsal ${d.emsal1 || 0}➔${d.emsal2 || 0})`;
    const name = prompt('Bu senaryoyu hangi isimle kaydetmek istersiniz?', defaultName);
    if (!name || !name.trim()) return;

    const saved = getSavedScenarios();
    const newId = 'sc_' + Date.now();
    const record = {
      ...d,
      id: newId,
      name: name.trim(),
      kunye: name.trim().toLocaleUpperCase('tr-TR')
    };
    saved.push(record);
    saveScenariosToStorage(saved);
    populateScenarioDropdown(newId);
    document.getElementById('ms_kunye').value = record.kunye;
  };

  window.msLoadSelectedScenario = function(scId) {
    stopAutoPlay();
    if (!scId || scId === 'default_ada_bazli') {
      populateScenarioDropdown('default_ada_bazli');
      applyScenarioToInputs(DEFAULT_SCENARIO);
      return;
    }
    const saved = getSavedScenarios();
    const found = saved.find(x => x.id === scId);
    if (found) {
      populateScenarioDropdown(found.id);
      applyScenarioToInputs(found);
    }
  };

  window.msDeleteSelectedScenario = function() {
    const sel = document.getElementById('ms_scenarioSelect');
    if (!sel || !sel.value || sel.value === 'default_ada_bazli') return;
    if (!confirm('Seçili kayıtlı senaryoyu silmek istediğinize emin misiniz?')) return;
    const saved = getSavedScenarios().filter(x => x.id !== sel.value);
    saveScenariosToStorage(saved);
    populateScenarioDropdown('default_ada_bazli');
    applyScenarioToInputs(DEFAULT_SCENARIO);
  };

  window.msOnMoneyInput = function(el) {
    const raw = (el.value || '').replace(/[^\d]/g, '');
    const num = parseInt(raw) || 0;
    el.value = num > 0 ? num.toLocaleString('tr-TR') : '';
    msOnInputChange();
  };

  window.msSyncFromInputs = function(col) {
    ['Taks', 'Emsal', 'Kat', 'Oran'].forEach(k => {
      const inp = document.getElementById('ms_' + k.toLowerCase() + col);
      const rng = document.getElementById('ms_rng' + k + col);
      if (inp && rng && inp.value !== '') rng.value = inp.value;
    });
    msOnInputChange();
  };

  window.msSyncFromSliders = function(col) {
    ['Taks', 'Emsal', 'Kat', 'Oran'].forEach(k => {
      const inp = document.getElementById('ms_' + k.toLowerCase() + col);
      const rng = document.getElementById('ms_rng' + k + col);
      if (inp && rng) inp.value = rng.value;
    });
    msOnInputChange();
  };

  window.msChangeSimSource = function(src) {
    sunumState.aktifData.simSource = src;
    const d = sunumState.aktifData;
    const hedefK = (src === '1' ? d.kat1 : d.kat2) || 5;
    msSelectAnimKat(hedefK);
    msRecalculateAll();
  };

  function msReadInputsIntoState() {
    const gNum = (id) => parseFloat(document.getElementById(id)?.value) || 0;
    const gMoney = (id) => parseInt((document.getElementById(id)?.value || '').replace(/[^\d]/g, '')) || 0;
    const d = sunumState.aktifData;
    d.kunye = document.getElementById('ms_kunye')?.value || '';
    d.arsaNet = gNum('ms_arsaNet');
    d.cks = gNum('ms_cks') || 1.70;
    d.verim = gNum('ms_verim') || 80;
    d.satisM2 = gMoney('ms_satisM2');
    d.hissePayda = Math.max(1, parseInt(document.getElementById('ms_hissePayda')?.value) || 10);
    d.daireBolunum = Math.max(1, parseInt(document.getElementById('ms_daireBolunum')?.value) || 2);
    d.simSource = document.getElementById('ms_simSource')?.value || '2';

    d.taks1 = gNum('ms_taks1'); d.emsal1 = gNum('ms_emsal1'); d.kat1 = Math.max(1, parseInt(document.getElementById('ms_kat1')?.value) || 1); d.oran1 = gNum('ms_oran1');
    d.taks2 = gNum('ms_taks2'); d.emsal2 = gNum('ms_emsal2'); d.kat2 = Math.max(1, parseInt(document.getElementById('ms_kat2')?.value) || 1); d.oran2 = gNum('ms_oran2');
  }

  window.msOnInputChange = function() {
    msReadInputsIntoState();
    const d = sunumState.aktifData;
    const aktifImarKat = (d.simSource === '1' ? d.kat1 : d.kat2) || 5;
    sunumState.hedefKat = aktifImarKat;
    const rngK = document.getElementById('ms_rngAnimKat');
    if (rngK) rngK.value = aktifImarKat;
    const lblK = document.getElementById('ms_lblActiveKat');
    if (lblK) lblK.innerText = `${aktifImarKat} Kat`;
    const btnIdeal = document.getElementById('ms_btnIdealKat');
    if (btnIdeal) {
      btnIdeal.innerText = `✅ ${aktifImarKat} Kat (İmar Sınırı)`;
      btnIdeal.setAttribute('onclick', `msSelectAnimKat(${aktifImarKat})`);
    }
    msRecalculateAll();
  };

  function calcColumnMetrics(arsaNet, taks, emsal, kat, oran, cks, verimYuzde, satisM2) {
    const verim = (verimYuzde || 80) / 100;
    const hamTia = arsaNet * emsal * cks;
    const maxTaksTaban = arsaNet * taks;
    const gerekenTaban = kat > 0 ? (hamTia / kat) : hamTia;
    const fiiliTaban = Math.min(maxTaksTaban, gerekenTaban);
    const kullanilanTia = Math.min(hamTia, fiiliTaban * kat);
    const yananTia = Math.max(0, hamTia - kullanilanTia);
    const kullanilanIc = kullanilanTia * verim;
    const malikTopIc = kullanilanIc * (oran / 100);
    const mutTopIc = kullanilanIc - malikTopIc;
    const malikTopDeger = Math.round(malikTopIc * satisM2);
    return {
      hamTia, maxTaksTaban, gerekenTaban, fiiliTaban,
      kullanilanTia, yananTia, kullanilanIc,
      malikTopIc, mutTopIc, malikTopDeger
    };
  }

  function getDaireSinifEtiketi(m2Val) {
    if (m2Val >= 115) return '3+1 Geniş Daire';
    if (m2Val >= 85) return '2+1 Normal Daire';
    if (m2Val >= 65) return '2+1 Kompakt Daire';
    return '1+1 Daire';
  }

  function msRecalculateAll() {
    const d = sunumState.aktifData;
    const c1 = calcColumnMetrics(d.arsaNet, d.taks1, d.emsal1, d.kat1, d.oran1, d.cks, d.verim, d.satisM2);
    const c2 = calcColumnMetrics(d.arsaNet, d.taks2, d.emsal2, d.kat2, d.oran2, d.cks, d.verim, d.satisM2);

    const b1 = document.getElementById('ms_col1BurnBadge');
    if (b1) {
      b1.style.background = c1.yananTia > 5 ? '#fef08a' : '#dcfce7';
      b1.style.color = c1.yananTia > 5 ? '#991b1b' : '#166534';
      b1.innerText = c1.yananTia > 5 ? `🔥 -${Math.round(c1.yananTia)} m² TAKS Kaybı` : `✓ Tam Kullanım (TA:${Math.round(c1.fiiliTaban)}m²)`;
    }
    const b2 = document.getElementById('ms_col2BurnBadge');
    if (b2) {
      b2.style.background = c2.yananTia > 5 ? '#fef08a' : '#dcfce7';
      b2.style.color = c2.yananTia > 5 ? '#991b1b' : '#166534';
      b2.innerText = c2.yananTia > 5 ? `🔥 -${Math.round(c2.yananTia)} m² TAKS Kaybı` : `✓ Tam Kullanım (TA:${Math.round(c2.fiiliTaban)}m²)`;
    }

    const pastaArtisYuzde = c1.kullanilanIc > 0 ? (((c2.kullanilanIc - c1.kullanilanIc) / c1.kullanilanIc) * 100) : 0;
    const malikTopFarkM2 = c2.malikTopIc - c1.malikTopIc;
    const malikTopFarkTL = c2.malikTopDeger - c1.malikTopDeger;

    const pastaBox = document.getElementById('ms_pastaCompareBox');
    if (pastaBox) {
      pastaBox.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:4px; margin-bottom:6px; font-size:0.75rem;">
          <strong style="color:#0f172a;">📦 1. TOPLAM KULLANILABİLİR İNŞAAT PASTASI VE PAYLAŞIM DEĞİŞİMİ</strong>
          <span style="background:${pastaArtisYuzde >= 0 ? '#16a34a' : '#dc2626'}; color:#fff; padding:2px 8px; border-radius:4px; font-weight:800; font-size:0.7rem;">
            Pasta Büyümesi: ${pastaArtisYuzde >= 0 ? '+' : ''}%${pastaArtisYuzde.toFixed(1)}
          </span>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; text-align:center; font-size:0.73rem;">
          <div style="background:#f8fafc; border:1.5px solid #93c5fd; border-radius:6px; padding:6px;">
            <div style="background:#1d4ed8; color:#fff; font-weight:800; border-radius:4px; padding:2px; margin-bottom:4px; font-size:0.68rem;">
              🟦 1. MEVCUT (TAKS:${d.taks1} • Emsal:${d.emsal1} • ${d.kat1}K)
            </div>
            <div><b>${Math.round(c1.kullanilanTia).toLocaleString('tr-TR')} m² TİA</b> ➔ <b style="color:#1d4ed8;">${Math.round(c1.kullanilanIc).toLocaleString('tr-TR')} m² Net İç</b></div>
            <div style="font-size:0.66rem; color:#475569; margin-top:3px;">👥 Malikler (%${d.oran1}): <b>${Math.round(c1.malikTopIc)} m²</b> | 🏗️ Müt: <b>${Math.round(c1.mutTopIc)} m²</b></div>
          </div>
          <div style="background:#f0fdf4; border:1.5px solid #4ade80; border-radius:6px; padding:6px;">
            <div style="background:#15803d; color:#fff; font-weight:800; border-radius:4px; padding:2px; margin-bottom:4px; font-size:0.68rem;">
              🟩 2. TADİLATLI (TAKS:${d.taks2} • Emsal:${d.emsal2} • ${d.kat2}K)
            </div>
            <div><b>${Math.round(c2.kullanilanTia).toLocaleString('tr-TR')} m² TİA</b> ➔ <b style="color:#15803d;">${Math.round(c2.kullanilanIc).toLocaleString('tr-TR')} m² Net İç</b></div>
            <div style="font-size:0.66rem; color:#475569; margin-top:3px;">👥 Malikler (%${d.oran2}): <b>${Math.round(c2.malikTopIc)} m²</b> | 🏗️ Müt: <b>${Math.round(c2.mutTopIc)} m²</b></div>
          </div>
        </div>
        <div style="margin-top:6px; background:#0f172a; color:#fff; padding:5px 10px; border-radius:6px; display:flex; justify-content:space-between; align-items:center; font-size:0.71rem;">
          <span>📊 <b>Tüm Maliklerin Toplam Kazanç Farkı:</b></span>
          <div>
            <span style="background:#16a34a; padding:2px 7px; border-radius:4px; font-weight:800; margin-right:6px;">${malikTopFarkM2 >= 0 ? '+' : ''}${Math.round(malikTopFarkM2).toLocaleString('tr-TR')} m² Net Daire</span>
            <span style="background:#fbbf24; color:#0f172a; padding:2px 7px; border-radius:4px; font-weight:800;">${malikTopFarkTL >= 0 ? '+' : ''}${malikTopFarkTL.toLocaleString('tr-TR')} ₺ Toplam Değer</span>
          </div>
        </div>
      `;
    }

    const payda = d.hissePayda || 10;
    const bolunum = d.daireBolunum || 2;
    const hisseArsaM2 = d.arsaNet / payda;
    const hIc1 = c1.malikTopIc / payda, hDeger1 = Math.round(hIc1 * d.satisM2);
    const hIc2 = c2.malikTopIc / payda, hDeger2 = Math.round(hIc2 * d.satisM2);
    const hFarkIc = hIc2 - hIc1, hFarkTL = hDeger2 - hDeger1;

    const daireBasi1 = hIc1 / bolunum, daireBasi2 = hIc2 / bolunum;

    // DAP Analiz Notu (3194 Ek Madde 8 & 22.11.2025 RG: 33085)
    let dapHtml = '';
    if (d.emsal2 <= d.emsal1 && d.taks2 > d.taks1) {
      dapHtml = `<div style="margin-top:6px; background:#ecfdf5; border:1px solid #10b981; padding:5px 8px; border-radius:6px; font-size:0.68rem; color:#065f46;">
        🟢 <b>Yasal DAP Durumu (3194 Ek m.8/3):</b> Toplam inşaat alanı (emsal) artırılmadan yalnız <b>TAKS (${d.taks1} ➔ ${d.taks2})</b>/kütle düzeltmesi yapıldığından 6306 kapsamında <b>Değer Artış Payı (DAP) = 0 ₺ (TAM MUAF)!</b>
      </div>`;
    } else if (d.emsal2 > d.emsal1) {
      const muafSinirEmsal = +(d.emsal1 * 1.20).toFixed(2);
      const asanEmsal = Math.max(0, +(d.emsal2 - muafSinirEmsal).toFixed(2));
      dapHtml = `<div style="margin-top:6px; background:#eff6ff; border:1px solid #60a5fa; padding:5px 8px; border-radius:6px; font-size:0.68rem; color:#1e3a8a;">
        ⚖️ <b>22.11.2025 DAP Yönetmeliği (m.6–7):</b> Riskli yapılarda <b>ilk %20 emsal artışı (${d.emsal1} ➔ ${muafSinirEmsal} arası) DAP'tan MUAFTIR (0 ₺)!</b> ${asanEmsal > 0 ? `%20'yi aşan <b>+${asanEmsal} emsal farkı</b> için oluşan değer artışının %90'ı DAP olarak doğar ve <b>Ek-Uzman-3 ile Müteahhide üstlendirilir</b>.` : `Yeni emsal (${d.emsal2}) %20 sınırında kaldığı için DAP doğmaz!`}
      </div>`;
    }

    const hissedarBox = document.getElementById('ms_hissedarCompareBox');
    if (hissedarBox) {
      hissedarBox.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:4px; margin-bottom:6px; font-size:0.75rem;">
          <strong style="color:#0f172a;">👤 2. TEK HİSSEDARIN (1/${payda} PAY = ${hisseArsaM2.toFixed(1)} m² ARSA) DAİRE VE SERVET KAZANCI</strong>
          <span style="background:#0f172a; color:#fbbf24; padding:2px 8px; border-radius:4px; font-weight:700; font-size:0.68rem;">Rayiç: ${d.satisM2.toLocaleString('tr-TR')} ₺/m²</span>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.72rem;">
          <div style="background:#f8fafc; border:1.5px solid #93c5fd; border-radius:6px; padding:7px;">
            <div style="font-weight:800; color:#1e3a8a; margin-bottom:4px;">🟦 1. SÜTUN HİSSEDAR HAKKI:</div>
            <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; border:1px solid #cbd5e1; padding:5px 8px; border-radius:5px; margin-bottom:5px;">
              <strong style="font-size:0.95rem; color:#1d4ed8;">${hIc1.toFixed(1)} m² Net İç</strong>
              <strong style="font-size:0.88rem; color:#0f172a;">${hDeger1.toLocaleString('tr-TR')} ₺</strong>
            </div>
            <div style="background:#fff; border:1px solid #e2e8f0; padding:5px 8px; border-radius:5px;">
              👉 <b>${bolunum} Adet × ${daireBasi1.toFixed(1)} m²</b> (${getDaireSinifEtiketi(daireBasi1)})<br>
              <small style="color:#64748b;">Daire Başı Değer: ${Math.round(hDeger1 / bolunum).toLocaleString('tr-TR')} ₺</small>
            </div>
          </div>

          <div style="background:#f0fdf4; border:1.5px solid #4ade80; border-radius:6px; padding:7px;">
            <div style="font-weight:800; color:#166534; margin-bottom:4px;">🟩 2. SÜTUN (TADİLATLI) HİSSEDAR HAKKI:</div>
            <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; border:1px solid #86efac; padding:5px 8px; border-radius:5px; margin-bottom:5px;">
              <strong style="font-size:0.95rem; color:#15803d;">${hIc2.toFixed(1)} m² Net İç</strong>
              <strong style="font-size:0.88rem; color:#15803d;">${hDeger2.toLocaleString('tr-TR')} ₺</strong>
            </div>
            <div style="background:#fff; border:1px solid #bbf7d0; padding:5px 8px; border-radius:5px;">
              👉 <b>${bolunum} Adet × ${daireBasi2.toFixed(1)} m²</b> (${getDaireSinifEtiketi(daireBasi2)})<br>
              <small style="color:#166534;">Daire Başı Değer: ${Math.round(hDeger2 / bolunum).toLocaleString('tr-TR')} ₺</small>
            </div>
          </div>
        </div>

        <div style="margin-top:7px; background:linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%); border:1.5px solid #f59e0b; padding:7px 10px; border-radius:7px; font-size:0.72rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
            <strong style="color:#0f172a;">🎯 TEK HİSSEDAR (1/${payda} PAY) NET KAZANÇ FARKI:</strong>
            <div>
              <span style="background:#16a34a; color:#fff; padding:3px 9px; border-radius:5px; font-weight:900; font-size:0.82rem; margin-right:6px;">
                📐 ${hFarkIc >= 0 ? '+' : ''}${hFarkIc.toFixed(1)} m² Net Daire
              </span>
              <span style="background:#0f172a; color:#fbbf24; padding:3px 9px; border-radius:5px; font-weight:900; font-size:0.82rem;">
                💰 ${hFarkTL >= 0 ? '+' : ''}${hFarkTL.toLocaleString('tr-TR')} ₺ Parasal Servet Farkı
              </span>
            </div>
          </div>
          <div style="margin-top:4px; color:#334155; font-size:0.69rem;">
            💡 <b>Toplantı Özeti:</b> Plan tadilatıyla hissedarın ${bolunum} tam dairesi <b>${daireBasi1.toFixed(1)}'er m²</b>'den <b>${daireBasi2.toFixed(1)}'er m²</b>'ye büyür; toplam daire değeri <b>${hDeger1.toLocaleString('tr-TR')} ₺</b>'den <b>${hDeger2.toLocaleString('tr-TR')} ₺</b>'ye yükselir!
          </div>
        </div>
        ${dapHtml}
      `;
    }

    updateLeftWarnText(Math.round(sunumState.hedefKat));
  }

  window.msSelectAnimKat = function(yeniKat) {
    const k = Math.max(1, Math.min(15, parseInt(yeniKat) || 7));
    sunumState.hedefKat = k;
    const rng = document.getElementById('ms_rngAnimKat');
    if (rng && parseInt(rng.value) !== k) rng.value = String(k);
    const lbl = document.getElementById('ms_lblActiveKat');
    if (lbl) lbl.innerText = `${k} Kat`;
    updateLeftWarnText(k);
  };

  function getActiveSimParams() {
    const d = sunumState.aktifData;
    const isCol1 = (d.simSource === '1');
    return {
      arsaNet: d.arsaNet || 0,
      cks: d.cks || 1.70,
      verim: (d.verim || 80) / 100,
      taks: (isCol1 ? d.taks1 : d.taks2) || 0.30,
      otherTaks: (isCol1 ? d.taks2 : d.taks1) || 0.40,
      emsal: (isCol1 ? d.emsal1 : d.emsal2) || 0.80,
      imarKat: (isCol1 ? d.kat1 : d.kat2) || 5
    };
  }

  function updateLeftWarnText(seciliKat) {
    const box = document.getElementById('ms_leftWarnBox');
    if (!box) return;
    const p = getActiveSimParams();
    if (p.arsaNet <= 0 || p.emsal <= 0) {
      box.style.cssText = 'background:#fffbeb; border:1.5px solid #f59e0b; color:#92400e; padding:7px 10px; border-radius:7px; font-size:0.71rem;';
      box.innerHTML = 'ℹ️ <b>Veri Girişi Bekleniyor:</b> Üstteki <b>Net Arsa (m²)</b>, <b>TAKS</b> ve <b>Emsal</b> kutularına parsel değerlerini girdiğinizde simülasyon otomatik başlar.';
      return;
    }
    const toplamTia = p.arsaNet * p.emsal * p.cks;
    const maxTaksTaban = p.arsaNet * p.taks;
    const gerekenTaban = toplamTia / seciliKat;
    const fiiliTaban = Math.min(maxTaksTaban, gerekenTaban);
    const kalanBahce = Math.max(0, p.arsaNet - fiiliTaban);
    const kullanilanTia = Math.min(toplamTia, fiiliTaban * seciliKat);
    const yananTia = Math.max(0, toplamTia - kullanilanTia);
    const yananIc = yananTia * p.verim;

    if (gerekenTaban > maxTaksTaban + 2) {
      box.style.cssText = 'background:#fef2f2; border:1.5px solid #dc2626; color:#7f1d1d; padding:7px 10px; border-radius:7px; font-size:0.7rem;';
      box.innerHTML = `🚨 <b>TAKS SINIRI ENGELİ (Max Taban %${Math.round(p.taks * 100)} = ${Math.round(maxTaksTaban)} m²):</b> <b>${Math.round(toplamTia)} m² TİA</b> hakkı <b>${seciliKat} kata</b> bölündüğünde <b>${Math.round(gerekenTaban)} m²</b> taban gerekir; TAKS izin vermediği için <b>-${Math.round(yananTia)} m² TİA (~${Math.round(yananIc)} m² Net Daire) YANAR!</b> (Çözüm: Kat artışı veya TAKS Plan Tadilatı).`;
    } else if (seciliKat > p.imarKat) {
      box.style.cssText = 'background:#fff7ed; border:1.5px solid #ea580c; color:#7c2d12; padding:7px 10px; border-radius:7px; font-size:0.7rem;';
      box.innerHTML = `⛔ <b>İMAR GABARİ SINIRI (${p.imarKat} KAT) AŞILDI:</b> İmar planı en fazla <b>${p.imarKat} kata</b> izin veriyor. Kat arttıkça bina tabanı <b>${Math.round(fiiliTaban)} m²</b>'ye büzülür ve her katta asansör/merdiven şaftı tekrarlandığı için net daire alanı küçülür!`;
    } else {
      box.style.cssText = 'background:#f0fdf4; border:1.5px solid #16a34a; color:#14532d; padding:7px 10px; border-radius:7px; font-size:0.7rem;';
      box.innerHTML = `✅ <b>İDEAL MİMARİ DENGE (${seciliKat} Kat — Taban: ${Math.round(fiiliTaban)} m² | Bahçe: ${Math.round(kalanBahce)} m² | Yanan Hak: 0 m²):</b> <b>${Math.round(toplamTia)} m² TİA</b> hakkımızın tamamı 0 kayıpla kullanılıyor; kalan <b>${Math.round(kalanBahce)} m² (%${Math.round((kalanBahce / p.arsaNet) * 100)})</b> açık otopark ve peyzaj bahçemizdir.`;
    }
  }

  function renderAnimCanvas() {
    const canvas = document.getElementById('ms_animCanvas');
    if (!canvas) return;
    const dpr = Math.min(2.0, window.devicePixelRatio || 1.5);
    const W = 620, H = 285;
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
      canvas.width = W * dpr; canvas.height = H * dpr;
    }
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(dpr, dpr);

    const p = getActiveSimParams();
    const kat = sunumState.guncelKat;
    const toplamTia = p.arsaNet * p.emsal * p.cks;
    const toplamIc = toplamTia * p.verim;
    const maxTaksTaban = p.arsaNet * p.taks;
    const gerekenTaban = toplamTia / Math.max(1, kat);
    const taksAsildi = gerekenTaban > maxTaksTaban + 2;
    const gabariAsildi = Math.round(kat) > p.imarKat;
    const fiiliTaban = Math.min(maxTaksTaban, gerekenTaban);
    const kullanilanTia = Math.min(toplamTia, fiiliTaban * kat);
    const kullanilanIc = kullanilanTia * p.verim;
    const yananTia = Math.max(0, toplamTia - kullanilanTia);
    const yananIc = yananTia * p.verim;
    const kalanBahce = Math.max(0, p.arsaNet - fiiliTaban);

    // Üst 3'lü Sayaç Güncellemesi
    const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = v; };
    setTxt('ms_cntTopTia', `${Math.round(toplamTia).toLocaleString('tr-TR')} m² TİA`);
    setTxt('ms_cntTopIc', `(${Math.round(toplamIc).toLocaleString('tr-TR')} m² Net İç)`);
    const kulYuzde = toplamTia > 0 ? Math.round((kullanilanTia / toplamTia) * 100) : 0;
    setTxt('ms_cntUsedTia', `${Math.round(kullanilanTia).toLocaleString('tr-TR')} m² (%${kulYuzde})`);
    setTxt('ms_cntUsedIc', `(${Math.round(kullanilanIc).toLocaleString('tr-TR')} m² Net İç)`);

    const elYanTia = document.getElementById('ms_cntBurnedTia');
    const elYanIc = document.getElementById('ms_cntBurnedIc');
    const boxBurn = document.getElementById('ms_boxBurned');
    if (yananTia > 5) {
      if (boxBurn) boxBurn.style.background = 'rgba(185,28,28,0.92)';
      if (elYanTia) { elYanTia.style.color = '#fef08a'; elYanTia.innerText = `-${Math.round(yananTia).toLocaleString('tr-TR')} m² YANDI!`; }
      if (elYanIc) { elYanIc.style.color = '#fff'; elYanIc.innerText = `(-${Math.round(yananIc).toLocaleString('tr-TR')} m² Net Kayıp)`; }
    } else {
      if (boxBurn) boxBurn.style.background = 'rgba(20,83,45,0.65)';
      if (elYanTia) { elYanTia.style.color = '#4ade80'; elYanTia.innerText = '0 m² (Kayıp Yok ✓)'; }
      if (elYanIc) { elYanIc.style.color = '#bbf7d0'; elYanIc.innerText = '(%100 Kullanılıyor)'; }
    }

    // Arka Plan
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0f172a'); bg.addColorStop(0.52, '#1e293b'); bg.addColorStop(0.53, '#064e3b'); bg.addColorStop(1, '#022c22');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    const zeminY = 136, birimKatH = 8.2;
    ctx.fillStyle = '#334155'; ctx.fillRect(40, zeminY, W - 80, 16);
    ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('🅿️ -1. BODRUM OTOPARK & SIĞINAK (±0.00 KIRMIZI KOT ALTI)', W / 2, zeminY + 11);

    const maxTaksW = 300;
    const taksSolX = (W - maxTaksW) / 2, taksSagX = taksSolX + maxTaksW;
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = taksAsildi ? '#ef4444' : '#f59e0b';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(taksSolX, 12); ctx.lineTo(taksSolX, zeminY);
    ctx.moveTo(taksSagX, 12); ctx.lineTo(taksSagX, zeminY);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#fde047'; ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'right'; ctx.fillText(`TAKS Sınırı (%${Math.round(p.taks * 100)}) ▶`, taksSolX - 5, 22);
    ctx.textAlign = 'left'; ctx.fillText(`◀ Max ${Math.round(maxTaksTaban)} m² Taban`, taksSagX + 5, 22);

    const gabariY = zeminY - (p.imarKat * birimKatH);
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = gabariAsildi ? '#ef4444' : '#38bdf8';
    ctx.beginPath(); ctx.moveTo(40, gabariY); ctx.lineTo(W - 40, gabariY); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#7dd3fc'; ctx.fillText(`⬆️ İmar Sınırı (${p.imarKat} Kat)`, 44, Math.max(11, gabariY - 3));

    const dolulukOrani = maxTaksTaban > 0 ? Math.min(1.0, fiiliTaban / maxTaksTaban) : 0.5;
    const binaW = Math.max(85, maxTaksW * dolulukOrani);
    const bx = (W - binaW) / 2;
    const katTam = Math.max(1, Math.round(kat));
    const binaH = kat * birimKatH;

    for (let k = 0; k < katTam; k++) {
      const ky = zeminY - ((k + 1) * birimKatH);
      const isOver = (k + 1) > p.imarKat;
      ctx.fillStyle = isOver ? '#ef4444' : (taksAsildi ? '#f59e0b' : (k === 0 ? '#d97706' : (k % 2 === 0 ? '#2563eb' : '#1d4ed8')));
      ctx.fillRect(bx, ky, binaW, birimKatH - 1);
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 0.6; ctx.strokeRect(bx, ky, binaW, birimKatH - 1);
    }

    if (taksAsildi && yananTia > 5) {
      const tasanW = Math.min(75, Math.max(30, ((gerekenTaban - maxTaksTaban) / Math.max(1, maxTaksTaban)) * 120));
      ctx.fillStyle = 'rgba(220,38,38,0.42)';
      ctx.fillRect(taksSolX - tasanW, zeminY - binaH, tasanW, binaH);
      ctx.fillRect(taksSagX, zeminY - binaH, tasanW, binaH);
      ctx.fillStyle = '#fef08a'; ctx.textAlign = 'center';
      ctx.fillText(`🔥 -${Math.round(yananTia / 2)}m²`, taksSolX - tasanW / 2, zeminY - binaH / 2);
      ctx.fillText(`🔥 -${Math.round(yananTia / 2)}m²`, taksSagX + tasanW / 2, zeminY - binaH / 2);
    }

    // Kuşbakışı Parsel
    const pX = 70, pY = 160, pW = W - 140, pH = 114;
    ctx.fillStyle = '#15803d'; ctx.fillRect(pX, pY, pW, pH);
    ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2; ctx.strokeRect(pX, pY, pW, pH);
    ctx.fillStyle = '#bbf7d0'; ctx.textAlign = 'left';
    ctx.fillText(`🌳 KUŞBAKIŞI PARSEL: ${Math.round(p.arsaNet)} m² (Açık Bahçe: ${Math.round(kalanBahce)} m²)`, pX + 8, pY + 13);

    const tBoxW = pW * 0.60, tBoxH = pH * 0.66;
    const tBoxX = pX + (pW - tBoxW) / 2, tBoxY = pY + 20;
    ctx.save(); ctx.setLineDash([4, 3]); ctx.strokeStyle = '#fde047'; ctx.strokeRect(tBoxX, tBoxY, tBoxW, tBoxH); ctx.restore();

    const izOran = Math.sqrt(dolulukOrani);
    const izW = Math.max(60, tBoxW * izOran), izH = Math.max(32, tBoxH * izOran);
    const izX = pX + (pW - izW) / 2, izY = tBoxY + (tBoxH - izH) / 2;
    ctx.fillStyle = taksAsildi ? '#dc2626' : '#0f172a';
    ctx.fillRect(izX, izY, izW, izH);
    ctx.strokeStyle = '#fbbf24'; ctx.strokeRect(izX, izY, izW, izH);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText(`BİNA TABAN İZİ (TA): ${Math.round(fiiliTaban)} m²`, izX + izW / 2, izY + izH / 2 + 3);

    ctx.restore();
  }

  function startAnimLoop() {
    function step() {
      if (!sunumState.acik) return;
      const diff = sunumState.hedefKat - sunumState.guncelKat;
      if (Math.abs(diff) > 0.02) sunumState.guncelKat += diff * 0.14;
      else sunumState.guncelKat = sunumState.hedefKat;
      renderAnimCanvas();
      sunumState.rafId = requestAnimationFrame(step);
    }
    if (sunumState.rafId) cancelAnimationFrame(sunumState.rafId);
    sunumState.rafId = requestAnimationFrame(step);
  }

  function stopAutoPlay() {
    sunumState.otoOynat = false;
    if (sunumState.otoTimer) { clearInterval(sunumState.otoTimer); sunumState.otoTimer = null; }
    const btn = document.getElementById('ms_btnAutoPlay');
    if (btn) { btn.style.background = '#fbbf24'; btn.style.color = '#0f172a'; btn.innerText = '▶️ Otomatik Oynat'; }
  }

  window.msToggleAutoPlay = function() {
    if (sunumState.otoOynat) { stopAutoPlay(); return; }
    sunumState.otoOynat = true;
    const btn = document.getElementById('ms_btnAutoPlay');
    if (btn) { btn.style.background = '#dc2626'; btn.style.color = '#fff'; btn.innerText = '⏹️ Durdur'; }
    const p = getActiveSimParams();
    const seq = [3, 4, p.imarKat, Math.min(14, p.imarKat + 3), p.imarKat];
    let i = 0;
    msSelectAnimKat(seq[0]);
    sunumState.otoTimer = setInterval(() => {
      if (!sunumState.acik || !sunumState.otoOynat) { stopAutoPlay(); return; }
      i = (i + 1) % seq.length;
      msSelectAnimKat(seq[i]);
    }, 3200);
  };

  window.msSetViewMode = function(mode) {
    sunumState.gorunumModu = mode;
    const grid = document.getElementById('ms_mainGrid');
    const left = document.getElementById('ms_leftCol');
    const right = document.getElementById('ms_rightCol');
    if (!grid || !left || !right) return;

    if (mode === 'sol') {
      grid.style.gridTemplateColumns = '1fr';
      left.style.display = 'flex'; right.style.display = 'none';
    } else if (mode === 'sag') {
      grid.style.gridTemplateColumns = '1fr';
      left.style.display = 'none'; right.style.display = 'flex';
    } else {
      grid.style.gridTemplateColumns = '1fr 1fr';
      left.style.display = 'flex'; right.style.display = 'flex';
    }
    ['Ikili', 'Sol', 'Sag'].forEach(k => {
      const b = document.getElementById('ms_view' + k);
      if (b) {
        const active = (k.toLowerCase() === mode);
        b.style.background = active ? '#fbbf24' : 'transparent';
        b.style.color = active ? '#0f172a' : '#fff';
      }
    });
  };

  window.msToggleFullscreen = function() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  };

  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(injectMalikSunumStylesAndButtons, 120);
  });
})();
// 18. NOTEBOOKLM VİDEO REHBER & SUNUM OYNATICI MODÜLÜ (SADE TAM EKRAN OYNATICI - 2 VİDEO TANIMLI)
(function initNotebookLMVideoKutuphanesi() {
  const VIDEO_STORAGE_KEY = 'kd_custom_video_library_v1';

  // VARSAYILAN VİDEO LİSTESİ (videos/ klasöründen okur)
  const DEFAULT_VIDEOS = [
    {
      id: 'vid_kd_rehberi_1',
      title: '🎬 1. Kentsel Dönüşüm Rehberi: Modeller ve Sözleşme Kalkanları (10:18)',
      src: 'videos/kentsel-donusum-rehberi.mp4',
      desc: '5 adımda dönüşüm, %50+1 kuralı, Kat Karşılığı vs Kredi modelleri, Yarısı Bizden, Bina Tamamlama Sigortası ve Aşamalı Tapu Devri.'
    },
    {
      id: 'vid_kd_yol_haritasi_2',
      title: '🧭 2. Kentsel Dönüşüm Yol Haritası: Plan Tadilatı, Toplantılar ve İskan (07:40)',
      src: 'videos/kentsel-donusum-yol-haritasi.mp4',
      desc: 'Plan tadilatı ve %20 DAP muafiyeti, 3 aşamalı malik toplantısı, 126 günlük tespit/yıkım takvimi, güvenli vekaletname, pay satışı ön şartı ve kısmi iskan.'
    }
  ];

  function getSavedVideos() {
    try {
      return JSON.parse(localStorage.getItem(VIDEO_STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveCustomVideos(list) {
    try {
      localStorage.setItem(VIDEO_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  function getAllVideos() {
    return [...DEFAULT_VIDEOS, ...getSavedVideos()];
  }

  function injectVideoButtons() {
    const topActions = document.querySelector('.top-actions');
    if (topActions && !document.getElementById('topVideoRehberBtn')) {
      const btn = document.createElement('button');
      btn.id = 'topVideoRehberBtn';
      btn.className = 'action-pill';
      btn.style.cssText = 'background:linear-gradient(135deg,#ec4899 0%,#be185d 100%); color:#ffffff; border-color:#f472b6; font-weight:800;';
      btn.innerHTML = '🎥 Video Rehber';
      btn.onclick = () => window.openVideoKutuphaneModal();
      topActions.insertBefore(btn, topActions.firstChild);
    }

    const heroBtnBar = document.querySelector('.section-card button[onclick*="openSplitTools"]');
    if (heroBtnBar && heroBtnBar.parentElement && !document.getElementById('heroVideoRehberBtn')) {
      const hBtn = document.createElement('button');
      hBtn.id = 'heroVideoRehberBtn';
      hBtn.style.cssText = 'background:linear-gradient(135deg,#db2777 0%,#9d174d 100%); color:#fff; border:2px solid #fbcfe8; padding:9px 15px; border-radius:8px; font-weight:800; font-size:0.84rem; cursor:pointer; box-shadow:0 4px 12px rgba(219,39,119,0.35);';
      hBtn.innerHTML = '🎥 NotebookLM Video Sunum Kütüphanesi';
      hBtn.onclick = () => window.openVideoKutuphaneModal();
      heroBtnBar.parentElement.insertBefore(hBtn, heroBtnBar);
    }
  }

  function buildVideoModalDOM() {
    let modal = document.getElementById('kdVideoRehberModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'kdVideoRehberModal';
    modal.style.cssText = 'position:fixed; inset:0; width:100vw; height:100vh; background:rgba(15,23,42,0.95); z-index:4300; display:none; flex-direction:column; overflow:hidden; font-family:"Segoe UI",system-ui,sans-serif;';

    modal.innerHTML = `
      <!-- ÜST BAR -->
      <div style="background:linear-gradient(135deg,#0f172a 0%,#831843 100%); color:#fff; padding:10px 16px; border-bottom:2px solid #f472b6; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <span style="background:#f472b6; color:#0f172a; font-weight:900; font-size:0.76rem; padding:4px 9px; border-radius:6px;">🎥 VİDEO SUNUM KÜTÜPHANESİ</span>
          <select id="vk_videoSelect" onchange="vkSelectVideo(this.value)" style="height:32px; border-radius:6px; border:1.5px solid #f472b6; background:#1e293b; color:#fce7f3; font-weight:800; font-size:0.82rem; padding:0 10px; min-width:420px; cursor:pointer;"></select>
        </div>

        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <label style="background:#38bdf8; color:#0f172a; padding:6px 12px; border-radius:6px; font-weight:800; font-size:0.75rem; cursor:pointer;" title="Bilgisayarınızdaki herhangi bir .mp4 videoyu anında açıp oynatır">
            📂 Bilgisayardan MP4 Aç
            <input type="file" id="vk_localFileInput" accept="video/mp4,video/webm,video/quicktime" onchange="vkLoadLocalFile(this)" style="display:none;">
          </label>
          <button type="button" onclick="vkAddNewVideoEntry()" style="background:#10b981; color:#022c22; border:none; padding:6px 12px; border-radius:6px; font-weight:800; font-size:0.75rem; cursor:pointer;" title="videos/ klasörüne eklediğiniz yeni bir videoyu listeye kaydedin">➕ Yeni Video Ekle</button>
          <button type="button" id="vk_btnDeleteVideo" onclick="vkDeleteSelectedVideo()" style="display:none; background:#ef4444; color:#fff; border:none; padding:6px 10px; border-radius:6px; font-weight:800; font-size:0.75rem; cursor:pointer;">🗑️ Sil</button>
          <button type="button" onclick="closeVideoKutuphaneModal()" style="background:#dc2626; color:#fff; border:none; padding:6px 14px; border-radius:6px; font-weight:800; font-size:0.78rem; cursor:pointer;">✕ Kapat</button>
        </div>
      </div>

      <!-- ANA GÖVDE: TAM EKRAN VİDEO SAHNESİ -->
      <div style="flex:1; display:flex; flex-direction:column; padding:12px; overflow:hidden; min-height:0;">
        <div style="flex:1; background:#020617; border:1.5px solid #334155; border-radius:12px; display:flex; flex-direction:column; justify-content:space-between; overflow:hidden; padding:12px;">
          <div style="flex:1; display:flex; align-items:center; justify-content:center; position:relative; min-height:0; background:#000; border-radius:8px; overflow:hidden;">
            <video id="vk_videoPlayer" controls preload="metadata" style="width:100%; height:100%; max-height:78vh; object-fit:contain; outline:none;"></video>
            <div id="vk_videoErrorOverlay" style="display:none; position:absolute; inset:0; background:rgba(15,23,42,0.94); color:#fff; flex-direction:column; align-items:center; justify-content:center; padding:24px; text-align:center;">
              <div style="font-size:2.4rem; margin-bottom:8px;">📁</div>
              <h3 style="margin:0 0 8px 0; color:#fbbf24;">Video Dosyası Klasörde Bulunamadı</h3>
              <p style="font-size:0.85rem; color:#cbd5e1; max-width:560px; line-height:1.55; margin-bottom:16px;">
                Videonun otomatik açılması için MP4 dosyanızı proje klasörünüzün içindeki <code id="vk_missingPathCode" style="background:#1e293b; color:#38bdf8; padding:3px 8px; border-radius:4px;">videos/</code> yoluna kaydedin.<br><br>
                <b>Veya hemen şimdi oynatmak için aşağıdaki butondan bilgisayarınızdaki MP4 dosyasını seçin:</b>
              </p>
              <label style="background:#fbbf24; color:#0f172a; padding:10px 20px; border-radius:8px; font-weight:900; font-size:0.86rem; cursor:pointer;">
                📂 Bilgisayarımdan MP4 Dosyasını Seç ve Oynat
                <input type="file" accept="video/mp4,video/webm,video/quicktime" onchange="vkLoadLocalFile(this)" style="display:none;">
              </label>
            </div>
          </div>

          <!-- ALT HIZ VE KONTROL BARI -->
          <div style="margin-top:10px; padding-top:8px; border-top:1px solid #1e293b; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; color:#cbd5e1; font-size:0.78rem;">
            <div id="vk_videoDesc" style="font-weight:600; color:#e2e8f0;"></div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span>⚡ Oynatma Hızı:</span>
              <button type="button" onclick="vkSetSpeed(1.0)" style="background:#1e293b; color:#fff; border:1px solid #475569; padding:4px 10px; border-radius:5px; font-weight:700; cursor:pointer;">1x</button>
              <button type="button" onclick="vkSetSpeed(1.25)" style="background:#1e293b; color:#fde047; border:1px solid #475569; padding:4px 10px; border-radius:5px; font-weight:700; cursor:pointer;">1.25x</button>
              <button type="button" onclick="vkSetSpeed(1.5)" style="background:#1e293b; color:#4ade80; border:1px solid #475569; padding:4px 10px; border-radius:5px; font-weight:700; cursor:pointer;">1.5x</button>
              <button type="button" onclick="vkToggleVideoFullscreen()" style="background:#2563eb; color:#fff; border:none; padding:5px 12px; border-radius:5px; font-weight:800; cursor:pointer;">⛶ Tam Ekran</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const player = modal.querySelector('#vk_videoPlayer');
    const errBox = modal.querySelector('#vk_videoErrorOverlay');
    if (player && errBox) {
      player.addEventListener('error', () => { errBox.style.display = 'flex'; });
      player.addEventListener('loadeddata', () => { errBox.style.display = 'none'; });
    }

    return modal;
  }

  function populateVideoSelect(selectedId) {
    const sel = document.getElementById('vk_videoSelect');
    const delBtn = document.getElementById('vk_btnDeleteVideo');
    if (!sel) return;
    const all = getAllVideos();
    sel.innerHTML = all.map(v => `<option value="${v.id}" ${v.id === selectedId ? 'selected' : ''}>${v.title}</option>`).join('');
    const isCustom = getSavedVideos().some(v => v.id === selectedId);
    if (delBtn) delBtn.style.display = isCustom ? 'inline-block' : 'none';
  }

  window.openVideoKutuphaneModal = function(videoId) {
    const modal = buildVideoModalDOM();
    modal.style.display = 'flex';
    const targetId = videoId || DEFAULT_VIDEOS[0].id;
    populateVideoSelect(targetId);
    vkSelectVideo(targetId);
  };

  window.closeVideoKutuphaneModal = function() {
    const modal = document.getElementById('kdVideoRehberModal');
    const player = document.getElementById('vk_videoPlayer');
    if (player) player.pause();
    if (modal) modal.style.display = 'none';
  };

  window.vkSelectVideo = function(videoId) {
    const all = getAllVideos();
    const vid = all.find(v => v.id === videoId) || all[0];
    if (!vid) return;

    populateVideoSelect(vid.id);

    const player = document.getElementById('vk_videoPlayer');
    const desc = document.getElementById('vk_videoDesc');
    const errBox = document.getElementById('vk_videoErrorOverlay');
    const missingCode = document.getElementById('vk_missingPathCode');

    if (errBox) errBox.style.display = 'none';
    if (missingCode) missingCode.innerText = vid.src;
    if (desc) desc.innerText = vid.desc || vid.src;
    if (player) {
      player.src = vid.src;
      player.load();
    }
  };

  window.vkSetSpeed = function(rate) {
    const player = document.getElementById('vk_videoPlayer');
    if (player) player.playbackRate = rate;
  };

  window.vkToggleVideoFullscreen = function() {
    const player = document.getElementById('vk_videoPlayer');
    if (player && player.requestFullscreen) player.requestFullscreen().catch(() => {});
  };

  window.vkLoadLocalFile = function(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const player = document.getElementById('vk_videoPlayer');
    const errBox = document.getElementById('vk_videoErrorOverlay');
    const desc = document.getElementById('vk_videoDesc');
    if (errBox) errBox.style.display = 'none';
    if (desc) desc.innerText = `📂 Yerel Dosya Oynatılıyor: ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`;
    if (player) {
      player.src = url;
      player.play().catch(() => {});
    }
  };

  window.vkAddNewVideoEntry = function() {
    const title = prompt('Yeni videonun başlığını girin:', '🎬 3. Uzman İş Akış ve Evrak Rehberi');
    if (!title || !title.trim()) return;
    const src = prompt('Videonun klasör yolunu girin:\n(Örn: videos/uzman-akis-rehberi.mp4)', 'videos/');
    if (!src || !src.trim()) return;

    const list = getSavedVideos();
    const newVid = {
      id: 'vid_' + Date.now(),
      title: title.trim(),
      src: src.trim(),
      desc: `Kaynak: ${src.trim()}`
    };
    list.push(newVid);
    saveCustomVideos(list);
    populateVideoSelect(newVid.id);
    vkSelectVideo(newVid.id);
  };

  window.vkDeleteSelectedVideo = function() {
    const sel = document.getElementById('vk_videoSelect');
    if (!sel || !sel.value) return;
    if (!confirm('Seçili videoyu listeden silmek istediğinize emin misiniz?')) return;
    const list = getSavedVideos().filter(v => x.id !== sel.value);
    saveCustomVideos(list);
    populateVideoSelect(DEFAULT_VIDEOS[0].id);
    vkSelectVideo(DEFAULT_VIDEOS[0].id);
  };

  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(injectVideoButtons, 150);
  });
})();
