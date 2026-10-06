# Batch source for content/lt/vocab/a1-0000-core-4117.yaml (A1–A2 words that were never cards, part 3 of the top-10k
# frequency gap check — see lt-a1-3951.py), incl. very common function words (tai, nei, tiek, pro, pirma) and a few A2 words
# from ranks just below. Names, film-only, vulgar and violence words skipped. Most frequent first.
# Examples are pulled from Tatoeba by id (exact text + translation); an empty id = no good example (allowed for LT).
# Columns: kind(w/p), text, pos, gender, cefr, meaning_ru, tatoeba_id, note_ru, forms (verbs: pres, past) / genitive (nouns)
PLURAL_ONLY = ["kortos", "dujos"]
ROWS = """
w|tai|pron||A1|это; то|12170042|Kas tai? — Что это?; tai yra — то есть|
w|atrodyti|verb||A1|выглядеть; казаться|10190354|Atrodo, kad… — Кажется, что…|atrodo, atrodė
w|padaryti|verb||A1|сделать|11358449||padaro, padarė
w|puikus|adj||A1|отличный, прекрасный|13550310|Puiku! — Отлично!|
w|metas|noun|m|A2|время, пора|3953500|Metas eiti. — Пора идти.|meto
w|tiek|adv||A2|столько|8546178|tiek…, kiek… — столько…, сколько…; tiek daug — так много|
w|Dievas|noun|m|A2|Бог|10258400|Ačiū Dievui! — Слава Богу!; Dieve mano! — Боже мой!|Dievo
w|nei|conj||A2|ни; чем|13696944|nei…, nei… — ни…, ни…; geriau nei… — лучше, чем…|
w|sėsti|verb||A2|садиться, сесть|10460084|sėsti į autobusą — сесть в автобус|sėda, sėdo
w|pirma|adv||A2|сначала; раньше|3146846|pirma…, paskui… — сначала…, потом…; pirma manęs — раньше (впереди) меня (+ род. п.)|
w|mažiau|adv||A1|меньше|2462251|сравн. ст. от mažai|
w|daugiau|adv||A1|больше|1605256|сравн. ст. от daug; daugiau nei… — больше, чем…|
w|šitas|pron||A2|этот (разг.)|3591102|= šis; ж. р. šita|
w|labiau|adv||A2|больше, сильнее; скорее|12503156|labiau už viską — больше всего на свете|
w|tiksliai|adv||A2|точно|10990113||
w|pro|prep||A2|через, сквозь; мимо|2656116|+ вин. п.: pro langą — через окно; eiti pro šalį — проходить мимо|
w|labiausiai|adv||A2|больше всего; особенно|2598268||
w|alio|part||A1|алло|13551499|по телефону|
w|minutėlė|noun|f|A2|минутка|2164818|Minutėlę! — Минутку!|minutėlės
w|perskaityti|verb||A2|прочитать|12560455||perskaito, perskaitė
w|išėjimas|noun|m|A2|выход|3941222||išėjimo
w|aha|part||A2|ага|10371638||
w|televizija|noun|f|A2|телевидение|3988375||televizijos
w|pakalbėti|verb||A2|поговорить|14046820||pakalba, pakalbėjo
w|aklas|adj||A2|слепой|10698558||
w|sesė|noun|f|A2|сестра, сестричка (разг.)|3954050|= sesuo|sesės
w|siūlyti|verb||A2|предлагать|10464642||siūlo, siūlė
w|praeitas|adj||A2|прошлый|13031936|praeitais metais — в прошлом году|
w|dušas|noun|m|A2|душ|3576910||dušo
w|oho|part||A2|ого|13488835||
w|žiedas|noun|m|A2|кольцо; цветок|10686383||žiedo
w|pirmyn|adv||A2|вперёд|12760530||
w|mamytė|noun|f|A2|мамочка, мама|13292616||mamytės
w|princesė|noun|f|A2|принцесса|12173388||princesės
w|angliškai|adv||A1|по-английски|14041826||
w|salė|noun|f|A2|зал|13251899||salės
w|žemyn|adv||A2|вниз|10688313||
w|dėkui|part||A2|спасибо (разг.)|12209628|= ačiū|
w|šampanas|noun|m|A2|шампанское|13380283||šampano
p|šiek tiek|adv||A1|немного, чуть-чуть|11364691|+ род. п.: šiek tiek laiko — немного времени|
w|dovanoti|verb||A2|дарить; прощать|13934938|dovanok — прости (разг.)|dovanoja, dovanojo
w|dažnas|adj||A2|частый|12876392|dažnas (без сущ.) — многие (люди)|
p|iki šiol|adv||A2|до сих пор|13989654||
w|pavalgyti|verb||A2|поесть|12755303||pavalgo, pavalgė
w|stiklas|noun|m|A2|стекло|4636972||stiklo
w|rūkyti|verb||A2|курить|12329568||rūko, rūkė
w|puslapis|noun|m|A2|страница|10753069||puslapio
w|katinas|noun|m|A2|кот|12422966||katino
w|suvalgyti|verb||A2|съесть|3090764||suvalgo, suvalgė
w|meniu|noun|m|A2|меню|13192816|не склоняется|meniu
w|šaukti|verb||A2|кричать; звать|12799075||šaukia, šaukė
w|centas|noun|m|A2|цент|10984746||cento
w|įvairus|adj||A2|разный, разнообразный|13721366||
w|miegas|noun|m|A2|сон (состояние)|13503819|ср. sapnas — сон (сновидение)|miego
w|rėkti|verb||A2|кричать, орать|7802793||rėkia, rėkė
w|nulis|noun|m|A2|ноль|11558497||nulio
w|tikrinti|verb||A2|проверять|13269102||tikrina, tikrino
w|krautuvė|noun|f|A2|магазин, лавка|||krautuvės
w|sugauti|verb||A2|поймать|12488707||sugauna, sugavo
w|uodega|noun|f|A2|хвост|13267593||uodegos
w|užtektinai|adv||A2|достаточно|4171374|+ род. п.: užtektinai laiko — достаточно времени|
w|beždžionė|noun|f|A2|обезьяна|4626410||beždžionės
w|pasižiūrėti|verb||A2|посмотреть, взглянуть|13381613||pasižiūri, pasižiūrėjo
w|kortos|noun|f|A2|(игральные) карты|9398349|Только мн. ч.: kortos, род. п. kortų; žaisti kortomis — играть в карты|kortų
w|pakartoti|verb||A2|повторить|11815259||pakartoja, pakartojo
w|takas|noun|m|A2|тропинка, дорожка|13228034||tako
w|luktelėti|verb||A2|подождать немного (разг.)||Luktelk! — Погоди!|luktelėja, luktelėjo
w|virvė|noun|f|A2|верёвка|12156834||virvės
w|nusileisti|verb||A2|спуститься; приземлиться|10772869||nusileidžia, nusileido
w|kailis|noun|m|A2|мех; шкура|||kailio
w|dujos|noun|f|A2|газ|13820307|Только мн. ч.: dujos, род. п. dujų|dujų
w|metalas|noun|m|A2|металл|13558249||metalo
w|modelis|noun|m|A2|модель|3943465||modelio
w|transportas|noun|m|A2|транспорт||viešasis transportas — общественный транспорт|transporto
"""
