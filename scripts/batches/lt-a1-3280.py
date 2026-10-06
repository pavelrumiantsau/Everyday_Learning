# Batch source for content/lt/vocab/a1-0000-core-3280.yaml (rest of the A1–A2 core: family, people and professions,
# animals, town and transport, school, cognates (restoranas, universitetas, kompiuteris…), basic verbs and adjectives).
# Checked against every `text:` in content/lt.
# Examples are pulled from Tatoeba by id (exact text + translation); an empty id = no good example (allowed for LT).
# Columns: kind(w/p), text, pos, gender, cefr, meaning_ru, tatoeba_id, note_ru, forms (verbs: pres, past) / genitive (nouns)
PLURAL_ONLY = []
ROWS = """
w|mama|noun|f|A1|мама|2732529||mamos
w|reikėti|verb||A1|быть нужным; нужно, надо|3576919|kam ko reikia — дат. п. + род. п.: man reikia laiko — мне нужно время|reikia, reikėjo
w|ramus|adj||A1|спокойный, тихий|12144514||
w|tėtis|noun|m|A1|папа|13423246|род. п. tėčio|tėčio
w|klausytis|verb||A1|слушать (музыку, кого-л.)|13675827|+ род. п.: klausytis muzikos; klausyti tėvų — слушаться родителей|klausosi, klausėsi
w|studentas|noun|m|A1|студент|3149720|studentė — студентка|studento
w|mielas|adj||A1|милый, приятный; дорогой (в обращении)|13526922|Mielas Jonai! — Дорогой Йонас! (в письме)|
w|telefonas|noun|m|A1|телефон|3136223|skambinti telefonu — звонить по телефону|telefono
w|susipažinti|verb||A1|познакомиться|1673209|su kuo (+ твор. п.): susipažinti su kaimynais; Malonu susipažinti! — Приятно познакомиться!|susipažįsta, susipažino
w|kompiuteris|noun|m|A1|компьютер|8238306||kompiuterio
w|panašus|adj||A1|похожий|10871327|į ką (+ вин. п.): panašus į tėvą — похож на отца|
w|restoranas|noun|m|A1|ресторан|12290946||restorano
w|pusryčiauti|verb||A1|завтракать|12196266||pusryčiauja, pusryčiavo
w|autobusas|noun|m|A1|автобус|11501958|važiuoti autobusu — ехать на автобусе (твор. п.)|autobuso
w|minkštas|adj||A1|мягкий|11488115||
w|bilietas|noun|m|A1|билет|10091310||bilieto
w|vakarieniauti|verb||A1|ужинать|12198433||vakarieniauja, vakarieniavo
w|universitetas|noun|m|A1|университет|6006552||universiteto
w|kietas|adj||A1|твёрдый, жёсткий; (разг.) крутой|11553658||
w|pavardė|noun|f|A1|фамилия|8362840|vardas — имя|pavardės
w|užmigti|verb||A1|заснуть, уснуть|12329290||užmiega, užmigo
w|sakinys|noun|m|A1|предложение (фраза)|10749515|«Предложение» в смысле «предложить» — pasiūlymas|sakinio
w|vėlyvas|adj||A2|поздний|11959900|vėlyvas ruduo — поздняя осень|
w|muziejus|noun|m|A1|музей|12134923|род. п. muziejaus|muziejaus
w|groti|verb||A1|играть (на инструменте)|4730809|kuo (+ твор. п.): groti gitara — играть на гитаре; žaisti — играть (в игру)|groja, grojo
w|teatras|noun|m|A1|театр|11502202||teatro
w|pasisveikinti|verb||A1|поздороваться|10364062|su kuo (+ твор. п.)|pasisveikina, pasisveikino
w|televizorius|noun|m|A1|телевизор|3940268|žiūrėti televizorių — смотреть телевизор; per televizorių — по телевизору|televizoriaus
w|liūdėti|verb||A1|грустить|5890178||liūdi, liūdėjo
w|internetas|noun|m|A1|интернет|13039899|internetu — через интернет; internete — в интернете|interneto
w|nekęsti|verb||A1|ненавидеть|1997146|+ род. п.: nekęsti melo|nekenčia, nekentė
w|muzika|noun|f|A1|музыка|10726918||muzikos
w|nuobodžiauti|verb||A1|скучать (от безделья)|11048809|Скучать по кому-л. — ilgėtis ko|nuobodžiauja, nuobodžiavo
w|filmas|noun|m|A1|фильм|3208095||filmo
w|pūsti|verb||A1|дуть|10973893|pučia vėjas — дует ветер|pučia, pūtė
w|sportas|noun|m|A1|спорт|9788699|sportuoti — заниматься спортом|sporto
w|šalti|verb||A1|мёрзнуть; (о погоде) морозить|12120114|Lauke šąla. — На улице мороз.; sušalti — замёрзнуть|šąla, šalo
w|futbolas|noun|m|A1|футбол|12377918|žaisti futbolą — играть в футбол (вин. п. без предлога)|futbolo
w|krepšinis|noun|m|A1|баскетбол|12855259|žaisti krepšinį — играть в баскетбол|krepšinio
w|centras|noun|m|A1|центр|6019960|miesto centre — в центре города|centro
w|parkas|noun|m|A1|парк|11485184||parko
w|bankas|noun|m|A1|банк|1666155||banko
w|kortelė|noun|f|A1|карточка; (банковская) карта|12141075|mokėti kortele — платить картой (твор. п.)|kortelės
w|sostinė|noun|f|A1|столица|13262441||sostinės
w|adresas|noun|m|A1|адрес|3489798||adreso
w|tualetas|noun|m|A1|туалет|13529097||tualeto
w|koridorius|noun|m|A1|коридор|13758823||koridoriaus
w|fotelis|noun|m|A1|кресло|13459420||fotelio
w|troleibusas|noun|m|A1|троллейбус|2747045||troleibuso
w|tramvajus|noun|m|A1|трамвай|13497288||tramvajaus
w|taksi|noun|m|A1|такси|8368648|Не склоняется: važiuoti taksi|taksi
w|laivas|noun|m|A1|корабль, судно|2157268|laivu — на корабле (ехать)|laivo
w|klasė|noun|f|A1|класс|11713024||klasės
w|žodynas|noun|m|A1|словарь|12289105||žodyno
w|žaidimas|noun|m|A1|игра|9630631||žaidimo
w|daina|noun|f|A1|песня|4679873|dainuoti — петь|dainos
w|melas|noun|m|A1|ложь|12688398|meluoti — врать|melo
w|kostiumas|noun|m|A1|костюм|12355082||kostiumo
w|švarkas|noun|m|A1|пиджак; жакет|13257733||švarko
w|jogurtas|noun|m|A1|йогурт|2673699||jogurto
w|šokoladas|noun|m|A1|шоколад|2634289||šokolado
w|tortas|noun|m|A1|торт|8347622||torto
w|apelsinas|noun|m|A1|апельсин|13719502||apelsino
w|arbūzas|noun|m|A1|арбуз|12200924||arbūzo
w|melionas|noun|m|A1|дыня|13031786||meliono
w|avietė|noun|f|A1|малина (ягода)|11319785|Обычно во мн. ч.: avietės — малина|avietės
w|mėlynė|noun|f|A1|черника (ягода); синяк|11936430||mėlynės
w|perkūnija|noun|f|A1|гроза|11600451||perkūnijos
w|griaustinis|noun|m|A1|гром|3937690||griaustinio
w|akmuo|noun|m|A1|камень|2744870|род. п. akmens, мн. ч. akmenys|akmens
w|smėlis|noun|m|A1|песок|7903068||smėlio
w|laukas|noun|m|A1|поле; улица (вне дома)|12788021|lauke — на улице; į lauką — на улицу|lauko
w|tėvynė|noun|f|A1|родина|4699554||tėvynės
w|užsienietis|noun|m|A1|иностранец|12200767|užsienietė — иностранка; užsienyje — за границей|užsieniečio
w|aktorius|noun|m|A1|актёр|10976657|aktorė — актриса|aktoriaus
w|dainininkas|noun|m|A1|певец|12530669|dainininkė — певица|dainininko
w|dailininkas|noun|m|A1|художник|12300082|dailininkė — художница|dailininko
w|rašytojas|noun|m|A1|писатель|12160263|rašytoja — писательница|rašytojo
w|sportininkas|noun|m|A1|спортсмен|13491194|sportininkė — спортсменка|sportininko
w|policininkas|noun|m|A1|полицейский|13565543|policija — полиция|policininko
w|kiaulė|noun|f|A1|свинья|12492118|kiauliena — свинина|kiaulės
w|avis|noun|f|A1|овца|9946608|Женский род; род. п. avies, мн. ч. avys|avies
w|višta|noun|f|A1|курица|11158428|vištiena — курятина (мясо)|vištos
w|antis|noun|f|A1|утка|9946308|Женский род; род. п. anties|anties
w|žąsis|noun|f|A1|гусь|12291184|Женский род; род. п. žąsies|žąsies
w|pelė|noun|f|A1|мышь (и компьютерная)|10801413||pelės
w|meška|noun|f|A1|медведь|10719779|Женский род: meška; книжн. lokys|meškos
w|vilkas|noun|m|A1|волк|14018189||vilko
w|lapė|noun|f|A1|лиса|13072700||lapės
w|kiškis|noun|m|A1|заяц|4560287||kiškio
w|varlė|noun|f|A1|лягушка|9019445||varlės
w|gyvatė|noun|f|A1|змея|10721126||gyvatės
w|bitė|noun|f|A1|пчела|13799677||bitės
w|uodas|noun|m|A1|комар|10857581||uodo
w|drugelis|noun|m|A1|бабочка|4143074||drugelio
"""
