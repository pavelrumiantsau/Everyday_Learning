# Batch source for content/lt/vocab/foundation-6139.yaml: second round of gap words of the Lithuanian foundation course,
# u01–u23, after mapping the existing A1–B1 items to units (only words that no existing item covers). track: foundation.
# Examples: only Tatoeba sentences with the word in the same sense (none where the translation drifts).
# Columns: kind(w/p), text, pos, gender, cefr, meaning_ru, tatoeba_id, note_ru, forms (verbs: pres, past) / genitive (nouns)
TRACK = "foundation"
PLURAL_ONLY = ["rytai", "vakarai", "Joninės", "Užgavėnės", "šukos"]
ROWS = """
w|Rusija|noun|f|A1|Россия|1601898|iš Rusijos — из России, Rusijoje — в России|Rusijos
w|Lenkija|noun|f|A1|Польша|11335525|iš Lenkijos — из Польши|Lenkijos
w|Latvija|noun|f|A1|Латвия||Latvijoje — в Латвии|Latvijos
w|Vokietija|noun|f|A1|Германия|13012545|Vokietijoje — в Германии|Vokietijos
w|Anglija|noun|f|A1|Англия|12746258||Anglijos
w|Estija|noun|f|A1|Эстония|12092345||Estijos
w|lenkas|noun|m|A1|поляк||ж. р. lenkė; lenkų kalba — польский язык|lenko
w|latvis|noun|m|A1|латыш||ж. р. latvė; latvių kalba — латышский язык|latvio
w|anglas|noun|m|A1|англичанин|13039897|ж. р. anglė; anglų kalba — английский язык|anglo
w|blynas|noun|m|A2|блин||обычно мн. ч.: blynai — блины|blyno
w|cepelinas|noun|m|A2|цеппелин (картофельная клёцка с начинкой)||обычно мн. ч.: cepelinai — литовское национальное блюдо|cepelino
w|kotletas|noun|m|A2|котлета|||kotleto
w|žadintuvas|noun|m|A2|будильник|11262534||žadintuvo
w|prieškambaris|noun|m|A2|прихожая|||prieškambario
w|sportbatis|noun|m|A2|кроссовка|12720104|обычно мн. ч.: sportbačiai — кроссовки|sportbačio
w|rotušė|noun|f|A2|ратуша|13774642||rotušės
w|anūkė|noun|f|A2|внучка||anūkas — внук; anūkai — внуки|anūkės
w|gitara|noun|f|A2|гитара|4730809|groti gitara — играть на гитаре (твор. п.)|gitaros
w|uogauti|verb||A2|собирать ягоды||как grybauti — собирать грибы|uogauja, uogavo
w|debesuota|adv||A2|облачно|12335583|Rytoj bus debesuota. — Завтра будет облачно.|
w|lietingas|adj||A2|дождливый|13776476|ж. р. lietinga; Bus lietinga. — Будет дождливо.|
w|šalna|noun|f|A2|заморозок||обычно мн. ч.: šalnos — заморозки|šalnos
w|lašas|noun|m|A2|капля||lašai — капли (и лекарство): akių lašai — глазные капли|lašo
w|tepalas|noun|m|A2|мазь||также «смазка»|tepalo
w|vokas|noun|m|A2|конверт|||voko
w|gramatika|noun|f|A2|грамматика|3610685||gramatikos
w|tarimas|noun|m|A2|произношение|8333886||tarimo
w|lenta|noun|f|A2|доска (школьная); доска|12773681||lentos
w|direktorius|noun|m|A2|директор|13916731|ж. р. direktorė|direktoriaus
w|firma|noun|f|A2|фирма|12097420||firmos
w|rytai|noun|m|A2|восток||rytuose — на востоке; не путать: rytais — по утрам|rytų
w|vakarai|noun|m|A2|запад||vakaruose — на западе; Vakarų Lietuva — Западная Литва; не путать: vakarais — по вечерам|vakarų
w|pasivaikščioti|verb||A2|прогуляться|11991734|eiti pasivaikščioti — пойти погулять|pasivaikščioja, pasivaikščiojo
w|Joninės|noun|f|A2|Йонинес, праздник летнего солнцестояния (24 июня)||per Jonines — на Йонинес|Joninių
w|Užgavėnės|noun|f|A2|Масленица (Ужгавенес)||per Užgavėnes — на Масленицу; едят blynai|Užgavėnių
w|vardadienis|noun|m|A2|именины||Su vardadieniu! — С именинами!|vardadienio
w|registratūra|noun|f|A2|регистратура|||registratūros
w|šukos|noun|f|A2|расчёска||только мн. ч.: šukos, род. п. šukų|šukų
w|kremas|noun|m|A2|крем|||kremo
w|dalyvis|noun|m|A2|участник||ж. р. dalyvė|dalyvio
w|supjaustyti|verb||A2|нарезать|2586451|pjaustyti — резать, нарезать (несов.)|supjausto, supjaustė
p|antrame aukšte|||A1|на втором этаже||aukštas — этаж: Kuriame aukšte gyveni? — На каком этаже ты живёшь?|
p|mineralinis vanduo|||A2|минеральная вода||vanduo su dujomis / be dujų — вода с газом / без газа|
p|greitoji pagalba|||A2|скорая помощь||Iškvieskite greitąją! — Вызовите скорую! Телефон 112|
p|el. paštas|||A2|электронная почта, e-mail||полностью: elektroninis paštas; el. pašto adresas — адрес почты|
p|mobilusis telefonas|||A2|мобильный телефон||разг. mobilusis|
p|namų darbai|||A2|домашнее задание||только мн. ч.: daryti namų darbus — делать домашнее задание|
p|Naujieji metai|||A2|Новый год||Su Naujaisiais metais! — С Новым годом!|
p|vienvietis kambarys|||A2|одноместный номер||dvivietis kambarys — двухместный номер|
p|dantų pasta|||A2|зубная паста||dantų šepetėlis — зубная щётка|
"""
